import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  securityOfficersTable, 
  corporateVehiclesTable, 
  driversTable,
  routesTable, 
  locationPointsTable,
  vehicleDriverAssignmentsTable
} from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero counts for empty database', async () => {
    const result = await getDashboardData();

    expect(result.active_security_officers).toBe(0);
    expect(result.active_vehicles).toBe(0);
    expect(result.total_active_routes).toBe(0);
    expect(result.officers_on_duty).toBe(0);
    expect(result.vehicles_in_use).toBe(0);
    expect(result.recent_location_updates).toHaveLength(0);
  });

  it('should count active security officers correctly', async () => {
    // Create test officers with different statuses
    await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' },
      { name: 'Officer 2', badge_number: 'BADGE002', status: 'active' },
      { name: 'Officer 3', badge_number: 'BADGE003', status: 'inactive' },
      { name: 'Officer 4', badge_number: 'BADGE004', status: 'on_duty' },
      { name: 'Officer 5', badge_number: 'BADGE005', status: 'off_duty' }
    ]).execute();

    const result = await getDashboardData();

    expect(result.active_security_officers).toBe(2); // Only 'active' status
    expect(result.officers_on_duty).toBe(1); // Only 'on_duty' status
  });

  it('should count active vehicles correctly', async () => {
    // Create test vehicles with different statuses
    await db.insert(corporateVehiclesTable).values([
      { license_plate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2022, vehicle_type: 'sedan', status: 'active' },
      { license_plate: 'DEF456', make: 'Honda', model: 'CR-V', year: 2023, vehicle_type: 'suv', status: 'active' },
      { license_plate: 'GHI789', make: 'Ford', model: 'F-150', year: 2021, vehicle_type: 'truck', status: 'maintenance' },
      { license_plate: 'JKL012', make: 'Chevrolet', model: 'Tahoe', year: 2020, vehicle_type: 'suv', status: 'inactive' }
    ]).execute();

    const result = await getDashboardData();

    expect(result.active_vehicles).toBe(2); // Only 'active' status
  });

  it('should count vehicles in use correctly', async () => {
    // Create test vehicles
    const vehicles = await db.insert(corporateVehiclesTable).values([
      { license_plate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2022, vehicle_type: 'sedan', status: 'active' },
      { license_plate: 'DEF456', make: 'Honda', model: 'CR-V', year: 2023, vehicle_type: 'suv', status: 'active' },
      { license_plate: 'GHI789', make: 'Ford', model: 'F-150', year: 2021, vehicle_type: 'truck', status: 'inactive' }
    ]).returning().execute();

    // Create test drivers
    const drivers = await db.insert(driversTable).values([
      { name: 'Driver 1', license_number: 'DL001', status: 'active' },
      { name: 'Driver 2', license_number: 'DL002', status: 'active' }
    ]).returning().execute();

    // Create active assignments for first two vehicles (only active vehicles should count)
    await db.insert(vehicleDriverAssignmentsTable).values([
      { vehicle_id: vehicles[0].id, driver_id: drivers[0].id, status: 'active' },
      { vehicle_id: vehicles[1].id, driver_id: drivers[1].id, status: 'active' },
      // Inactive vehicle assignment should not count
      { vehicle_id: vehicles[2].id, driver_id: drivers[0].id, status: 'active' }
    ]).execute();

    const result = await getDashboardData();

    expect(result.vehicles_in_use).toBe(2); // Only active vehicles with assignments
  });

  it('should count active routes correctly', async () => {
    // Create test security officer and vehicle
    const officers = await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' }
    ]).returning().execute();

    const vehicles = await db.insert(corporateVehiclesTable).values([
      { license_plate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2022, vehicle_type: 'sedan', status: 'active' }
    ]).returning().execute();

    // Create routes with different statuses
    await db.insert(routesTable).values([
      { 
        entity_type: 'security_officer', 
        entity_id: officers[0].id, 
        route_name: 'Patrol Route 1',
        start_time: new Date(),
        status: 'active'
      },
      { 
        entity_type: 'corporate_vehicle', 
        entity_id: vehicles[0].id, 
        route_name: 'Delivery Route',
        start_time: new Date(),
        status: 'active'
      },
      { 
        entity_type: 'security_officer', 
        entity_id: officers[0].id, 
        route_name: 'Completed Route',
        start_time: new Date(),
        end_time: new Date(),
        status: 'completed'
      }
    ]).execute();

    const result = await getDashboardData();

    expect(result.total_active_routes).toBe(2); // Only 'active' status routes
  });

  it('should return recent location updates within 24 hours', async () => {
    // Create test entities
    const officers = await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' }
    ]).returning().execute();

    const vehicles = await db.insert(corporateVehiclesTable).values([
      { license_plate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2022, vehicle_type: 'sedan', status: 'active' }
    ]).returning().execute();

    // Create location points - some recent, some old
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(locationPointsTable).values([
      {
        entity_type: 'security_officer',
        entity_id: officers[0].id,
        latitude: '40.7128',
        longitude: '-74.0060',
        altitude: '10.5',
        accuracy: '5.0',
        heading: '90.0',
        speed: '15.5',
        timestamp: now
      },
      {
        entity_type: 'corporate_vehicle',
        entity_id: vehicles[0].id,
        latitude: '40.7589',
        longitude: '-73.9851',
        altitude: '20.0',
        accuracy: '3.0',
        heading: '180.0',
        speed: '25.0',
        timestamp: oneHourAgo
      },
      {
        entity_type: 'security_officer',
        entity_id: officers[0].id,
        latitude: '40.6892',
        longitude: '-74.0445',
        timestamp: twoDaysAgo // This should not be included (older than 24 hours)
      }
    ]).execute();

    const result = await getDashboardData();

    expect(result.recent_location_updates!).toHaveLength(2); // Only recent updates
    
    // Verify the most recent update is first (ordered by timestamp desc)
    expect(result.recent_location_updates![0].timestamp.getTime()).toBeGreaterThan(
      result.recent_location_updates![1].timestamp.getTime()
    );

    // Verify numeric conversions
    expect(typeof result.recent_location_updates![0].latitude).toBe('number');
    expect(typeof result.recent_location_updates![0].longitude).toBe('number');
    expect(typeof result.recent_location_updates![0].altitude).toBe('number');
    expect(typeof result.recent_location_updates![0].accuracy).toBe('number');
    expect(typeof result.recent_location_updates![0].heading).toBe('number');
    expect(typeof result.recent_location_updates![0].speed).toBe('number');
    
    // Verify actual values
    expect(result.recent_location_updates![0].latitude).toBe(40.7128);
    expect(result.recent_location_updates![0].longitude).toBe(-74.0060);
    expect(result.recent_location_updates![0].altitude).toBe(10.5);
    expect(result.recent_location_updates![0].accuracy).toBe(5.0);
    expect(result.recent_location_updates![0].heading).toBe(90.0);
    expect(result.recent_location_updates![0].speed).toBe(15.5);
  });

  it('should limit recent location updates to 10 items', async () => {
    // Create test officer
    const officers = await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' }
    ]).returning().execute();

    // Create 15 recent location points
    const locationPoints = [];
    const baseTime = new Date();
    
    for (let i = 0; i < 15; i++) {
      const timestamp = new Date(baseTime.getTime() - i * 60 * 1000); // Each minute apart
      locationPoints.push({
        entity_type: 'security_officer' as const,
        entity_id: officers[0].id,
        latitude: (40.7128 + i * 0.001).toString(),
        longitude: (-74.0060 + i * 0.001).toString(),
        timestamp
      });
    }

    await db.insert(locationPointsTable).values(locationPoints).execute();

    const result = await getDashboardData();

    expect(result.recent_location_updates!).toHaveLength(10); // Limited to 10
    
    // Verify they are ordered by timestamp descending (most recent first)
    for (let i = 0; i < result.recent_location_updates!.length - 1; i++) {
      expect(result.recent_location_updates![i].timestamp.getTime()).toBeGreaterThan(
        result.recent_location_updates![i + 1].timestamp.getTime()
      );
    }
  });

  it('should handle null numeric fields in location updates', async () => {
    // Create test officer
    const officers = await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' }
    ]).returning().execute();

    // Create location point with some null numeric fields
    await db.insert(locationPointsTable).values([
      {
        entity_type: 'security_officer',
        entity_id: officers[0].id,
        latitude: '40.7128',
        longitude: '-74.0060',
        altitude: null,
        accuracy: null,
        heading: null,
        speed: null,
        timestamp: new Date()
      }
    ]).execute();

    const result = await getDashboardData();

    expect(result.recent_location_updates!).toHaveLength(1);
    expect(result.recent_location_updates![0].latitude).toBe(40.7128);
    expect(result.recent_location_updates![0].longitude).toBe(-74.0060);
    expect(result.recent_location_updates![0].altitude).toBeNull();
    expect(result.recent_location_updates![0].accuracy).toBeNull();
    expect(result.recent_location_updates![0].heading).toBeNull();
    expect(result.recent_location_updates![0].speed).toBeNull();
  });

  it('should provide comprehensive dashboard data for complex scenario', async () => {
    // Create comprehensive test data
    const officers = await db.insert(securityOfficersTable).values([
      { name: 'Officer 1', badge_number: 'BADGE001', status: 'active' },
      { name: 'Officer 2', badge_number: 'BADGE002', status: 'on_duty' },
      { name: 'Officer 3', badge_number: 'BADGE003', status: 'inactive' }
    ]).returning().execute();

    const vehicles = await db.insert(corporateVehiclesTable).values([
      { license_plate: 'ABC123', make: 'Toyota', model: 'Camry', year: 2022, vehicle_type: 'sedan', status: 'active' },
      { license_plate: 'DEF456', make: 'Honda', model: 'CR-V', year: 2023, vehicle_type: 'suv', status: 'active' },
      { license_plate: 'GHI789', make: 'Ford', model: 'F-150', year: 2021, vehicle_type: 'truck', status: 'maintenance' }
    ]).returning().execute();

    const drivers = await db.insert(driversTable).values([
      { name: 'Driver 1', license_number: 'DL001', status: 'active' }
    ]).returning().execute();

    // Create active assignment for one vehicle
    await db.insert(vehicleDriverAssignmentsTable).values([
      { vehicle_id: vehicles[0].id, driver_id: drivers[0].id, status: 'active' }
    ]).execute();

    // Create routes
    await db.insert(routesTable).values([
      { entity_type: 'security_officer', entity_id: officers[0].id, start_time: new Date(), status: 'active' },
      { entity_type: 'corporate_vehicle', entity_id: vehicles[0].id, start_time: new Date(), status: 'active' },
      { entity_type: 'security_officer', entity_id: officers[1].id, start_time: new Date(), status: 'completed' }
    ]).execute();

    // Create recent location updates
    await db.insert(locationPointsTable).values([
      {
        entity_type: 'security_officer',
        entity_id: officers[0].id,
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date()
      },
      {
        entity_type: 'corporate_vehicle',
        entity_id: vehicles[0].id,
        latitude: '40.7589',
        longitude: '-73.9851',
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ]).execute();

    const result = await getDashboardData();

    expect(result.active_security_officers).toBe(1); // Only 'active' status
    expect(result.officers_on_duty).toBe(1); // Only 'on_duty' status
    expect(result.active_vehicles).toBe(2); // Only 'active' status vehicles
    expect(result.vehicles_in_use).toBe(1); // Only one has active assignment
    expect(result.total_active_routes).toBe(2); // Two active routes
    expect(result.recent_location_updates!).toHaveLength(2); // Two recent updates
    
    // Verify ordering of location updates (most recent first)
    expect(result.recent_location_updates![0].timestamp.getTime()).toBeGreaterThan(
      result.recent_location_updates![1].timestamp.getTime()
    );
  });
});