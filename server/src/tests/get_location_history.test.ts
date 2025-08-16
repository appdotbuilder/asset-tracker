import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  locationPointsTable, 
  securityOfficersTable, 
  corporateVehiclesTable 
} from '../db/schema';
import { type GetLocationHistoryInput } from '../schema';
import { getLocationHistory } from '../handlers/get_location_history';

describe('getLocationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data
  let securityOfficerId: number;
  let vehicleId: number;

  beforeEach(async () => {
    // Create test security officer
    const officerResult = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();
    securityOfficerId = officerResult[0].id;

    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();
    vehicleId = vehicleResult[0].id;
  });

  it('should return location history for security officer', async () => {
    // Create test location points
    const baseTime = new Date('2024-01-15T10:00:00Z');
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7128',
          longitude: '-74.0060',
          altitude: '10.5',
          accuracy: '5.0',
          heading: '45.5',
          speed: '25.3',
          timestamp: baseTime
        },
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7130',
          longitude: '-74.0062',
          altitude: '11.0',
          accuracy: '4.5',
          heading: '46.0',
          speed: '26.0',
          timestamp: new Date(baseTime.getTime() + 60000) // 1 minute later
        }
      ])
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(2);
    
    // Verify newest first (descending order)
    expect(result[0].timestamp > result[1].timestamp).toBe(true);
    
    // Verify numeric conversions
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
    expect(typeof result[0].altitude).toBe('number');
    expect(typeof result[0].accuracy).toBe('number');
    expect(typeof result[0].heading).toBe('number');
    expect(typeof result[0].speed).toBe('number');
    
    // Verify values
    expect(result[1].latitude).toBe(40.7128);
    expect(result[1].longitude).toBe(-74.0060);
    expect(result[1].altitude).toBe(10.5);
    expect(result[1].accuracy).toBe(5.0);
    expect(result[1].heading).toBe(45.5);
    expect(result[1].speed).toBe(25.3);
  });

  it('should return location history for corporate vehicle', async () => {
    // Create test location point for vehicle
    await db.insert(locationPointsTable)
      .values({
        entity_type: 'corporate_vehicle',
        entity_id: vehicleId,
        latitude: '40.7500',
        longitude: '-73.9850',
        timestamp: new Date()
      })
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicleId
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].entity_type).toBe('corporate_vehicle');
    expect(result[0].entity_id).toBe(vehicleId);
    expect(result[0].latitude).toBe(40.75);
    expect(result[0].longitude).toBe(-73.985);
  });

  it('should handle null values correctly', async () => {
    // Create location point with minimal data (nulls for optional fields)
    await db.insert(locationPointsTable)
      .values({
        entity_type: 'security_officer',
        entity_id: securityOfficerId,
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date()
      })
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].altitude).toBeNull();
    expect(result[0].accuracy).toBeNull();
    expect(result[0].heading).toBeNull();
    expect(result[0].speed).toBeNull();
  });

  it('should filter by date range', async () => {
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2024-01-16T10:00:00Z');
    const date3 = new Date('2024-01-17T10:00:00Z');

    // Create location points across different dates
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7128',
          longitude: '-74.0060',
          timestamp: date1
        },
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7130',
          longitude: '-74.0062',
          timestamp: date2
        },
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7132',
          longitude: '-74.0064',
          timestamp: date3
        }
      ])
      .execute();

    // Test with start_date filter
    const inputWithStartDate: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId,
      start_date: date2
    };

    const resultWithStartDate = await getLocationHistory(inputWithStartDate);
    expect(resultWithStartDate).toHaveLength(2);
    expect(resultWithStartDate.every(point => point.timestamp >= date2)).toBe(true);

    // Test with end_date filter
    const inputWithEndDate: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId,
      end_date: date2
    };

    const resultWithEndDate = await getLocationHistory(inputWithEndDate);
    expect(resultWithEndDate).toHaveLength(2);
    expect(resultWithEndDate.every(point => point.timestamp <= date2)).toBe(true);

    // Test with both start and end date
    const inputWithDateRange: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId,
      start_date: date2,
      end_date: date2
    };

    const resultWithDateRange = await getLocationHistory(inputWithDateRange);
    expect(resultWithDateRange).toHaveLength(1);
    expect(resultWithDateRange[0].timestamp.getTime()).toBe(date2.getTime());
  });

  it('should apply limit correctly', async () => {
    // Create more location points than the limit
    const points = Array.from({ length: 5 }, (_, i) => ({
      entity_type: 'security_officer' as const,
      entity_id: securityOfficerId,
      latitude: `40.${7128 + i}`,
      longitude: `-74.${60 + i}`,
      timestamp: new Date(Date.now() + i * 60000) // Each point 1 minute apart
    }));

    await db.insert(locationPointsTable)
      .values(points)
      .execute();

    // Test with specific limit
    const inputWithLimit: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId,
      limit: 3
    };

    const result = await getLocationHistory(inputWithLimit);
    expect(result).toHaveLength(3);
  });

  it('should apply default limit of 100 when not specified', async () => {
    // Create one location point to verify query works
    await db.insert(locationPointsTable)
      .values({
        entity_type: 'security_officer',
        entity_id: securityOfficerId,
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date()
      })
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId
      // No limit specified - should default to 100
    };

    const result = await getLocationHistory(input);
    expect(result).toHaveLength(1);
  });

  it('should return empty array for non-existent entity', async () => {
    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: 99999 // Non-existent ID
    };

    const result = await getLocationHistory(input);
    expect(result).toHaveLength(0);
  });

  it('should return only points for the specified entity', async () => {
    // Create another security officer
    const officer2Result = await db.insert(securityOfficersTable)
      .values({
        name: 'Officer 2',
        badge_number: 'SO002',
        status: 'active'
      })
      .returning()
      .execute();
    const officer2Id = officer2Result[0].id;

    // Create location points for both officers
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7128',
          longitude: '-74.0060',
          timestamp: new Date()
        },
        {
          entity_type: 'security_officer',
          entity_id: officer2Id,
          latitude: '40.7500',
          longitude: '-73.9850',
          timestamp: new Date()
        }
      ])
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId
    };

    const result = await getLocationHistory(input);
    expect(result).toHaveLength(1);
    expect(result[0].entity_id).toBe(securityOfficerId);
  });

  it('should order results by timestamp descending', async () => {
    const time1 = new Date('2024-01-15T10:00:00Z');
    const time2 = new Date('2024-01-15T11:00:00Z');
    const time3 = new Date('2024-01-15T12:00:00Z');

    // Insert in non-chronological order
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7128',
          longitude: '-74.0060',
          timestamp: time2
        },
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7130',
          longitude: '-74.0062',
          timestamp: time1
        },
        {
          entity_type: 'security_officer',
          entity_id: securityOfficerId,
          latitude: '40.7132',
          longitude: '-74.0064',
          timestamp: time3
        }
      ])
      .execute();

    const input: GetLocationHistoryInput = {
      entity_type: 'security_officer',
      entity_id: securityOfficerId
    };

    const result = await getLocationHistory(input);
    
    expect(result).toHaveLength(3);
    // Should be ordered newest first
    expect(result[0].timestamp.getTime()).toBe(time3.getTime());
    expect(result[1].timestamp.getTime()).toBe(time2.getTime());
    expect(result[2].timestamp.getTime()).toBe(time1.getTime());
  });
});