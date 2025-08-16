import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { routesTable, securityOfficersTable, corporateVehiclesTable } from '../db/schema';
import { type UpdateRouteInput } from '../schema';
import { updateRoute } from '../handlers/update_route';
import { eq } from 'drizzle-orm';

describe('updateRoute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a route with all fields', async () => {
    // Create prerequisite security officer
    const officerResult = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'BADGE001',
        phone: '+1234567890',
        email: 'officer@test.com',
        status: 'active'
      })
      .returning()
      .execute();

    const officer = officerResult[0];

    // Create initial route
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer.id,
        route_name: 'Original Route',
        start_time: new Date('2024-01-01T08:00:00Z'),
        status: 'active'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update the route
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      route_name: 'Updated Route',
      end_time: new Date('2024-01-01T17:00:00Z'),
      total_distance: 25.5,
      total_duration: 540, // 9 hours in minutes
      status: 'completed'
    };

    const result = await updateRoute(updateInput);

    // Verify the returned result
    expect(result.id).toEqual(originalRoute.id);
    expect(result.route_name).toEqual('Updated Route');
    expect(result.end_time).toEqual(new Date('2024-01-01T17:00:00Z'));
    expect(result.total_distance).toEqual(25.5);
    expect(result.total_duration).toEqual(540);
    expect(result.status).toEqual('completed');
    expect(result.entity_type).toEqual('security_officer');
    expect(result.entity_id).toEqual(officer.id);
    expect(result.start_time).toEqual(originalRoute.start_time);
    expect(result.created_at).toEqual(originalRoute.created_at);
  });

  it('should update a route with partial fields', async () => {
    // Create prerequisite corporate vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create initial route
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'corporate_vehicle',
        entity_id: vehicle.id,
        route_name: 'Delivery Route',
        start_time: new Date('2024-01-02T09:00:00Z'),
        status: 'active'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update only status
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      status: 'interrupted'
    };

    const result = await updateRoute(updateInput);

    // Verify only status was updated
    expect(result.id).toEqual(originalRoute.id);
    expect(result.route_name).toEqual('Delivery Route');
    expect(result.end_time).toBeNull();
    expect(result.total_distance).toBeNull();
    expect(result.total_duration).toBeNull();
    expect(result.status).toEqual('interrupted');
    expect(result.entity_type).toEqual('corporate_vehicle');
    expect(result.entity_id).toEqual(vehicle.id);
  });

  it('should save updates to database', async () => {
    // Create prerequisite security officer
    const officerResult = await db.insert(securityOfficersTable)
      .values({
        name: 'Database Test Officer',
        badge_number: 'BADGE002',
        status: 'active'
      })
      .returning()
      .execute();

    const officer = officerResult[0];

    // Create initial route
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer.id,
        route_name: 'Test Route',
        start_time: new Date('2024-01-03T10:00:00Z'),
        status: 'active'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update the route
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      route_name: 'Database Updated Route',
      end_time: new Date('2024-01-03T15:30:00Z'),
      total_distance: 12.75,
      status: 'completed'
    };

    await updateRoute(updateInput);

    // Query database to verify changes
    const routes = await db.select()
      .from(routesTable)
      .where(eq(routesTable.id, originalRoute.id))
      .execute();

    expect(routes).toHaveLength(1);
    const savedRoute = routes[0];
    expect(savedRoute.route_name).toEqual('Database Updated Route');
    expect(savedRoute.end_time).toEqual(new Date('2024-01-03T15:30:00Z'));
    expect(parseFloat(savedRoute.total_distance!)).toEqual(12.75);
    expect(savedRoute.total_duration).toBeNull();
    expect(savedRoute.status).toEqual('completed');
  });

  it('should handle null values correctly', async () => {
    // Create prerequisite security officer
    const officerResult = await db.insert(securityOfficersTable)
      .values({
        name: 'Null Test Officer',
        badge_number: 'BADGE003',
        status: 'active'
      })
      .returning()
      .execute();

    const officer = officerResult[0];

    // Create initial route with some values
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer.id,
        route_name: 'Original Route',
        start_time: new Date('2024-01-04T11:00:00Z'),
        end_time: new Date('2024-01-04T16:00:00Z'),
        total_distance: '15.5',
        total_duration: 300,
        status: 'completed'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update with null values
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      route_name: null,
      end_time: null,
      total_distance: null,
      total_duration: null
    };

    const result = await updateRoute(updateInput);

    // Verify null values were set
    expect(result.route_name).toBeNull();
    expect(result.end_time).toBeNull();
    expect(result.total_distance).toBeNull();
    expect(result.total_duration).toBeNull();
    expect(result.status).toEqual('completed'); // Should remain unchanged
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create prerequisite corporate vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'NUM123',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        vehicle_type: 'truck',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create initial route
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'corporate_vehicle',
        entity_id: vehicle.id,
        route_name: 'Numeric Test Route',
        start_time: new Date('2024-01-05T07:00:00Z'),
        status: 'active'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update with numeric values
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      total_distance: 123.456,
      total_duration: 720
    };

    const result = await updateRoute(updateInput);

    // Verify numeric conversion
    expect(typeof result.total_distance).toBe('number');
    expect(result.total_distance).toEqual(123.456);
    expect(typeof result.total_duration).toBe('number');
    expect(result.total_duration).toEqual(720);
  });

  it('should throw error for non-existent route', async () => {
    const updateInput: UpdateRouteInput = {
      id: 99999,
      status: 'completed'
    };

    expect(updateRoute(updateInput)).rejects.toThrow(/Route with id 99999 not found/i);
  });

  it('should handle large distance values', async () => {
    // Create prerequisite security officer
    const officerResult = await db.insert(securityOfficersTable)
      .values({
        name: 'Long Distance Officer',
        badge_number: 'BADGE004',
        status: 'active'
      })
      .returning()
      .execute();

    const officer = officerResult[0];

    // Create initial route
    const routeResult = await db.insert(routesTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer.id,
        route_name: 'Long Route',
        start_time: new Date('2024-01-06T06:00:00Z'),
        status: 'active'
      })
      .returning()
      .execute();

    const originalRoute = routeResult[0];

    // Update with large distance value
    const updateInput: UpdateRouteInput = {
      id: originalRoute.id,
      total_distance: 9999.999,
      total_duration: 14400, // 240 hours
      status: 'completed'
    };

    const result = await updateRoute(updateInput);

    expect(result.total_distance).toEqual(9999.999);
    expect(result.total_duration).toEqual(14400);
    expect(result.status).toEqual('completed');
  });
});