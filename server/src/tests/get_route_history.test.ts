import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  securityOfficersTable, 
  corporateVehiclesTable, 
  routesTable 
} from '../db/schema';
import { getRouteHistory, type GetRouteHistoryInput } from '../handlers/get_route_history';

describe('getRouteHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all routes when no filters are applied', async () => {
    // Create security officer and vehicle
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test routes
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Morning Patrol',
          start_time: new Date('2023-01-01T08:00:00Z'),
          end_time: new Date('2023-01-01T10:00:00Z'),
          total_distance: '5.5',
          total_duration: 120,
          status: 'completed'
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle.id,
          route_name: 'Delivery Route',
          start_time: new Date('2023-01-01T14:00:00Z'),
          total_distance: '12.3',
          status: 'active'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {};
    const result = await getRouteHistory(input);

    expect(result).toHaveLength(2);
    expect(result[0].route_name).toEqual('Delivery Route'); // Most recent first
    expect(result[1].route_name).toEqual('Morning Patrol');
    
    // Check numeric conversion
    expect(typeof result[0].total_distance).toBe('number');
    expect(result[0].total_distance).toEqual(12.3);
    expect(typeof result[1].total_distance).toBe('number');
    expect(result[1].total_distance).toEqual(5.5);
  });

  it('should filter routes by entity type', async () => {
    // Create security officer and vehicle
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    // Create routes for both entities
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Officer Route',
          start_time: new Date('2023-01-01T08:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle.id,
          route_name: 'Vehicle Route',
          start_time: new Date('2023-01-01T14:00:00Z'),
          status: 'active'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {
      entity_type: 'security_officer'
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].route_name).toEqual('Officer Route');
    expect(result[0].entity_type).toEqual('security_officer');
  });

  it('should filter routes by entity ID', async () => {
    // Create multiple officers
    const officers = await db.insert(securityOfficersTable)
      .values([
        {
          name: 'Officer One',
          badge_number: 'SO001',
          status: 'active'
        },
        {
          name: 'Officer Two',
          badge_number: 'SO002',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    // Create routes for both officers
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officers[0].id,
          route_name: 'Officer One Route',
          start_time: new Date('2023-01-01T08:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officers[1].id,
          route_name: 'Officer Two Route',
          start_time: new Date('2023-01-01T14:00:00Z'),
          status: 'active'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {
      entity_type: 'security_officer',
      entity_id: officers[0].id
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].route_name).toEqual('Officer One Route');
    expect(result[0].entity_id).toEqual(officers[0].id);
  });

  it('should filter routes by date range', async () => {
    // Create security officer
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    // Create routes with different dates
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Old Route',
          start_time: new Date('2022-12-15T08:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Target Route',
          start_time: new Date('2023-01-15T08:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Future Route',
          start_time: new Date('2023-02-15T08:00:00Z'),
          status: 'completed'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {
      start_date: new Date('2023-01-01T00:00:00Z'),
      end_date: new Date('2023-01-31T23:59:59Z')
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].route_name).toEqual('Target Route');
  });

  it('should filter routes by status', async () => {
    // Create security officer
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    // Create routes with different statuses
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Active Route',
          start_time: new Date('2023-01-01T08:00:00Z'),
          status: 'active'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Completed Route',
          start_time: new Date('2023-01-01T14:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Interrupted Route',
          start_time: new Date('2023-01-01T16:00:00Z'),
          status: 'interrupted'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {
      status: 'completed'
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].route_name).toEqual('Completed Route');
    expect(result[0].status).toEqual('completed');
  });

  it('should combine multiple filters correctly', async () => {
    // Create security officer and vehicle
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    // Create various routes
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Officer Active Route',
          start_time: new Date('2023-01-15T08:00:00Z'),
          status: 'active'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Officer Completed Route',
          start_time: new Date('2023-01-15T14:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle.id,
          route_name: 'Vehicle Active Route',
          start_time: new Date('2023-01-15T16:00:00Z'),
          status: 'active'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {
      entity_type: 'security_officer',
      entity_id: officer.id,
      start_date: new Date('2023-01-01T00:00:00Z'),
      end_date: new Date('2023-01-31T23:59:59Z'),
      status: 'active'
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].route_name).toEqual('Officer Active Route');
    expect(result[0].entity_type).toEqual('security_officer');
    expect(result[0].entity_id).toEqual(officer.id);
    expect(result[0].status).toEqual('active');
  });

  it('should return routes ordered by start_time descending', async () => {
    // Create security officer
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    // Create routes with different start times
    await db.insert(routesTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'First Route',
          start_time: new Date('2023-01-01T08:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Third Route',
          start_time: new Date('2023-01-01T16:00:00Z'),
          status: 'completed'
        },
        {
          entity_type: 'security_officer',
          entity_id: officer.id,
          route_name: 'Second Route',
          start_time: new Date('2023-01-01T12:00:00Z'),
          status: 'completed'
        }
      ])
      .execute();

    const input: GetRouteHistoryInput = {};
    const result = await getRouteHistory(input);

    expect(result).toHaveLength(3);
    expect(result[0].route_name).toEqual('Third Route'); // Latest first
    expect(result[1].route_name).toEqual('Second Route');
    expect(result[2].route_name).toEqual('First Route'); // Earliest last
  });

  it('should return empty array when no routes match filters', async () => {
    // Create security officer but no routes
    await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .execute();

    const input: GetRouteHistoryInput = {
      entity_type: 'security_officer',
      status: 'completed'
    };

    const result = await getRouteHistory(input);

    expect(result).toHaveLength(0);
  });

  it('should handle null total_distance correctly', async () => {
    // Create security officer
    const [officer] = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'active'
      })
      .returning()
      .execute();

    // Create route without total_distance
    await db.insert(routesTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer.id,
        route_name: 'Route Without Distance',
        start_time: new Date('2023-01-01T08:00:00Z'),
        status: 'active'
      })
      .execute();

    const input: GetRouteHistoryInput = {};
    const result = await getRouteHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_distance).toBeNull();
  });
});