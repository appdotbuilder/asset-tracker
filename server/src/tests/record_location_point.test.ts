import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationPointsTable, securityOfficersTable, corporateVehiclesTable } from '../db/schema';
import { type CreateLocationPointInput } from '../schema';
import { recordLocationPoint } from '../handlers/record_location_point';
import { eq } from 'drizzle-orm';

describe('recordLocationPoint', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test security officer
  const createTestOfficer = async () => {
    const result = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'TO001',
        phone: '123-456-7890',
        email: 'officer@test.com',
        status: 'on_duty'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Create test corporate vehicle
  const createTestVehicle = async () => {
    const result = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC-123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should record location point for security officer with all fields', async () => {
    const officer = await createTestOfficer();
    const timestamp = new Date('2024-01-01T12:00:00Z');
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 100.5,
      accuracy: 5.0,
      heading: 90.0,
      speed: 25.5,
      timestamp: timestamp
    };

    const result = await recordLocationPoint(testInput);

    // Basic field validation
    expect(result.entity_type).toEqual('security_officer');
    expect(result.entity_id).toEqual(officer.id);
    expect(result.latitude).toEqual(37.7749);
    expect(result.longitude).toEqual(-122.4194);
    expect(result.altitude).toEqual(100.5);
    expect(result.accuracy).toEqual(5.0);
    expect(result.heading).toEqual(90.0);
    expect(result.speed).toEqual(25.5);
    expect(result.timestamp).toEqual(timestamp);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should record location point for corporate vehicle with minimal fields', async () => {
    const vehicle = await createTestVehicle();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id,
      latitude: 40.7128,
      longitude: -74.0060
    };

    const result = await recordLocationPoint(testInput);

    // Basic field validation
    expect(result.entity_type).toEqual('corporate_vehicle');
    expect(result.entity_id).toEqual(vehicle.id);
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.altitude).toBeNull();
    expect(result.accuracy).toBeNull();
    expect(result.heading).toBeNull();
    expect(result.speed).toBeNull();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save location point to database with correct numeric conversions', async () => {
    const officer = await createTestOfficer();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 100.5,
      accuracy: 5.0,
      heading: 90.0,
      speed: 25.5
    };

    const result = await recordLocationPoint(testInput);

    // Query database directly to verify storage
    const locationPoints = await db.select()
      .from(locationPointsTable)
      .where(eq(locationPointsTable.id, result.id))
      .execute();

    expect(locationPoints).toHaveLength(1);
    const savedPoint = locationPoints[0];
    
    // Verify numeric fields are stored correctly and can be converted back
    expect(parseFloat(savedPoint.latitude)).toEqual(37.7749);
    expect(parseFloat(savedPoint.longitude)).toEqual(-122.4194);
    expect(parseFloat(savedPoint.altitude!)).toEqual(100.5);
    expect(parseFloat(savedPoint.accuracy!)).toEqual(5.0);
    expect(parseFloat(savedPoint.heading!)).toEqual(90.0);
    expect(parseFloat(savedPoint.speed!)).toEqual(25.5);
    expect(savedPoint.timestamp).toBeInstanceOf(Date);
    expect(savedPoint.created_at).toBeInstanceOf(Date);
  });

  it('should use current timestamp when not provided', async () => {
    const officer = await createTestOfficer();
    const beforeTime = new Date();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      latitude: 37.7749,
      longitude: -122.4194
    };

    const result = await recordLocationPoint(testInput);
    const afterTime = new Date();

    // Timestamp should be between before and after times
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should validate numeric field types in result', async () => {
    const vehicle = await createTestVehicle();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id,
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 100.5,
      accuracy: 5.0,
      heading: 90.0,
      speed: 25.5
    };

    const result = await recordLocationPoint(testInput);

    // Ensure all numeric fields are returned as numbers, not strings
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
    expect(typeof result.altitude).toBe('number');
    expect(typeof result.accuracy).toBe('number');
    expect(typeof result.heading).toBe('number');
    expect(typeof result.speed).toBe('number');
  });

  it('should throw error when security officer does not exist', async () => {
    const testInput: CreateLocationPointInput = {
      entity_type: 'security_officer',
      entity_id: 999999, // Non-existent ID
      latitude: 37.7749,
      longitude: -122.4194
    };

    await expect(recordLocationPoint(testInput)).rejects.toThrow(/Security officer with ID 999999 not found/i);
  });

  it('should throw error when corporate vehicle does not exist', async () => {
    const testInput: CreateLocationPointInput = {
      entity_type: 'corporate_vehicle',
      entity_id: 999999, // Non-existent ID
      latitude: 37.7749,
      longitude: -122.4194
    };

    await expect(recordLocationPoint(testInput)).rejects.toThrow(/Corporate vehicle with ID 999999 not found/i);
  });

  it('should handle boundary GPS coordinates correctly', async () => {
    const officer = await createTestOfficer();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      latitude: -90.0, // Minimum latitude
      longitude: 180.0, // Maximum longitude
      heading: 360.0, // Maximum heading
      speed: 0.0 // Minimum speed
    };

    const result = await recordLocationPoint(testInput);

    expect(result.latitude).toEqual(-90.0);
    expect(result.longitude).toEqual(180.0);
    expect(result.heading).toEqual(360.0);
    expect(result.speed).toEqual(0.0);
  });

  it('should handle precision in numeric fields', async () => {
    const vehicle = await createTestVehicle();
    
    const testInput: CreateLocationPointInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id,
      latitude: 37.77491234,
      longitude: -122.41943567,
      altitude: 100.123,
      accuracy: 5.67,
      heading: 90.45,
      speed: 25.789
    };

    const result = await recordLocationPoint(testInput);

    // Verify precision is maintained
    expect(result.latitude).toBeCloseTo(37.77491234);
    expect(result.longitude).toBeCloseTo(-122.41943567);
    expect(result.altitude).toBeCloseTo(100.123);
    expect(result.accuracy).toBeCloseTo(5.67);
    expect(result.heading).toBeCloseTo(90.45);
    expect(result.speed).toBeCloseTo(25.789);
  });
});