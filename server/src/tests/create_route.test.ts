import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { routesTable, securityOfficersTable, corporateVehiclesTable } from '../db/schema';
import { type CreateRouteInput } from '../schema';
import { createRoute } from '../handlers/create_route';
import { eq } from 'drizzle-orm';

describe('createRoute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a security officer for testing
  const createTestSecurityOfficer = async () => {
    const result = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'TEST001',
        phone: '+1234567890',
        email: 'officer@test.com',
        status: 'on_duty'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper to create a corporate vehicle for testing
  const createTestVehicle = async () => {
    const result = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'TEST123',
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

  it('should create a route for security officer', async () => {
    // Create prerequisite security officer
    const officer = await createTestSecurityOfficer();

    const testInput: CreateRouteInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      route_name: 'Morning Patrol Route'
    };

    const result = await createRoute(testInput);

    // Basic field validation
    expect(result.entity_type).toEqual('security_officer');
    expect(result.entity_id).toEqual(officer.id);
    expect(result.route_name).toEqual('Morning Patrol Route');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.end_time).toBeNull();
    expect(result.total_distance).toBeNull();
    expect(result.total_duration).toBeNull();
  });

  it('should create a route for corporate vehicle', async () => {
    // Create prerequisite vehicle
    const vehicle = await createTestVehicle();

    const testInput: CreateRouteInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id,
      route_name: 'Delivery Route A'
    };

    const result = await createRoute(testInput);

    // Basic field validation
    expect(result.entity_type).toEqual('corporate_vehicle');
    expect(result.entity_id).toEqual(vehicle.id);
    expect(result.route_name).toEqual('Delivery Route A');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.end_time).toBeNull();
    expect(result.total_distance).toBeNull();
    expect(result.total_duration).toBeNull();
  });

  it('should create a route with custom start time', async () => {
    const officer = await createTestSecurityOfficer();
    const customStartTime = new Date('2024-01-15T08:00:00Z');

    const testInput: CreateRouteInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      route_name: 'Custom Time Route',
      start_time: customStartTime
    };

    const result = await createRoute(testInput);

    expect(result.start_time).toEqual(customStartTime);
    expect(result.entity_type).toEqual('security_officer');
    expect(result.entity_id).toEqual(officer.id);
    expect(result.route_name).toEqual('Custom Time Route');
  });

  it('should create a route without route name', async () => {
    const vehicle = await createTestVehicle();

    const testInput: CreateRouteInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id
    };

    const result = await createRoute(testInput);

    expect(result.entity_type).toEqual('corporate_vehicle');
    expect(result.entity_id).toEqual(vehicle.id);
    expect(result.route_name).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.start_time).toBeInstanceOf(Date);
  });

  it('should save route to database', async () => {
    const officer = await createTestSecurityOfficer();

    const testInput: CreateRouteInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      route_name: 'Database Test Route'
    };

    const result = await createRoute(testInput);

    // Query the database to verify the route was saved
    const routes = await db.select()
      .from(routesTable)
      .where(eq(routesTable.id, result.id))
      .execute();

    expect(routes).toHaveLength(1);
    expect(routes[0].entity_type).toEqual('security_officer');
    expect(routes[0].entity_id).toEqual(officer.id);
    expect(routes[0].route_name).toEqual('Database Test Route');
    expect(routes[0].status).toEqual('active');
    expect(routes[0].start_time).toBeInstanceOf(Date);
    expect(routes[0].created_at).toBeInstanceOf(Date);
    expect(routes[0].end_time).toBeNull();
    expect(routes[0].total_distance).toBeNull();
    expect(routes[0].total_duration).toBeNull();
  });

  it('should handle multiple routes for same entity', async () => {
    const officer = await createTestSecurityOfficer();

    const route1Input: CreateRouteInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      route_name: 'Route 1'
    };

    const route2Input: CreateRouteInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      route_name: 'Route 2'
    };

    const result1 = await createRoute(route1Input);
    const result2 = await createRoute(route2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.route_name).toEqual('Route 1');
    expect(result2.route_name).toEqual('Route 2');
    expect(result1.entity_id).toEqual(officer.id);
    expect(result2.entity_id).toEqual(officer.id);
  });

  it('should use current time as default start time', async () => {
    const vehicle = await createTestVehicle();
    const beforeCreate = new Date();

    const testInput: CreateRouteInput = {
      entity_type: 'corporate_vehicle',
      entity_id: vehicle.id,
      route_name: 'Default Time Route'
    };

    const result = await createRoute(testInput);
    const afterCreate = new Date();

    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.start_time.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.start_time.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});