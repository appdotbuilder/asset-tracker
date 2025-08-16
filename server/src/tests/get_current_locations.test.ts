import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  securityOfficersTable, 
  corporateVehiclesTable, 
  driversTable,
  locationPointsTable 
} from '../db/schema';
import { getCurrentLocations } from '../handlers/get_current_locations';

describe('getCurrentLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no location data exists', async () => {
    const result = await getCurrentLocations();
    expect(result).toEqual([]);
  });

  it('should return current locations for on-duty security officers only', async () => {
    // Create test security officers
    const officers = await db.insert(securityOfficersTable)
      .values([
        {
          name: 'Officer On Duty',
          badge_number: 'SO001',
          status: 'on_duty'
        },
        {
          name: 'Officer Off Duty',
          badge_number: 'SO002',
          status: 'off_duty'
        },
        {
          name: 'Inactive Officer',
          badge_number: 'SO003',
          status: 'inactive'
        }
      ])
      .returning();

    // Create location points for officers
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officers[0].id,
          latitude: '40.7128',
          longitude: '-74.0060',
          altitude: '10.5',
          accuracy: '5.0',
          heading: '180.0',
          speed: '25.5',
          timestamp: now
        },
        {
          entity_type: 'security_officer',
          entity_id: officers[1].id, // off_duty officer
          latitude: '40.7589',
          longitude: '-73.9851',
          timestamp: now
        },
        {
          entity_type: 'security_officer',
          entity_id: officers[2].id, // inactive officer
          latitude: '40.7480',
          longitude: '-73.9857',
          timestamp: now
        }
      ]);

    const result = await getCurrentLocations();

    // Should only return location for on-duty officer
    expect(result).toHaveLength(1);
    expect(result[0].entity_type).toBe('security_officer');
    expect(result[0].entity_id).toBe(officers[0].id);
    expect(result[0].latitude).toBe(40.7128);
    expect(result[0].longitude).toBe(-74.0060);
    expect(result[0].altitude).toBe(10.5);
    expect(result[0].accuracy).toBe(5.0);
    expect(result[0].heading).toBe(180.0);
    expect(result[0].speed).toBe(25.5);
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
  });

  it('should return current locations for active corporate vehicles only', async () => {
    // Create test vehicles
    const vehicles = await db.insert(corporateVehiclesTable)
      .values([
        {
          license_plate: 'ABC123',
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          vehicle_type: 'sedan',
          status: 'active'
        },
        {
          license_plate: 'DEF456',
          make: 'Ford',
          model: 'F-150',
          year: 2023,
          vehicle_type: 'truck',
          status: 'maintenance'
        },
        {
          license_plate: 'GHI789',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          vehicle_type: 'sedan',
          status: 'inactive'
        }
      ])
      .returning();

    // Create location points for vehicles
    const now = new Date();
    
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicles[0].id,
          latitude: '40.7128',
          longitude: '-74.0060',
          speed: '35.2',
          heading: '270.5',
          timestamp: now
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicles[1].id, // maintenance vehicle
          latitude: '40.7589',
          longitude: '-73.9851',
          timestamp: now
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicles[2].id, // inactive vehicle
          latitude: '40.7480',
          longitude: '-73.9857',
          timestamp: now
        }
      ]);

    const result = await getCurrentLocations();

    // Should only return location for active vehicle
    expect(result).toHaveLength(1);
    expect(result[0].entity_type).toBe('corporate_vehicle');
    expect(result[0].entity_id).toBe(vehicles[0].id);
    expect(result[0].latitude).toBe(40.7128);
    expect(result[0].longitude).toBe(-74.0060);
    expect(result[0].speed).toBe(35.2);
    expect(result[0].heading).toBe(270.5);
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
  });

  it('should return most recent location for each active entity', async () => {
    // Create test entities
    const officer = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'on_duty'
      })
      .returning();

    const vehicle = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning();

    // Create multiple location points with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(locationPointsTable)
      .values([
        // Officer locations - most recent should be returned
        {
          entity_type: 'security_officer',
          entity_id: officer[0].id,
          latitude: '40.7128', // Older location
          longitude: '-74.0060',
          timestamp: twoHoursAgo
        },
        {
          entity_type: 'security_officer',
          entity_id: officer[0].id,
          latitude: '40.7589', // Most recent location
          longitude: '-73.9851',
          timestamp: now
        },
        {
          entity_type: 'security_officer',
          entity_id: officer[0].id,
          latitude: '40.7480', // Middle location
          longitude: '-73.9857',
          timestamp: oneHourAgo
        },
        // Vehicle locations - most recent should be returned
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle[0].id,
          latitude: '41.8781', // Older location
          longitude: '-87.6298',
          timestamp: oneHourAgo
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle[0].id,
          latitude: '41.8756', // Most recent location
          longitude: '-87.6244',
          timestamp: now
        }
      ]);

    const result = await getCurrentLocations();

    expect(result).toHaveLength(2);

    // Find officer and vehicle locations
    const officerLocation = result.find(loc => loc.entity_type === 'security_officer');
    const vehicleLocation = result.find(loc => loc.entity_type === 'corporate_vehicle');

    // Verify most recent officer location
    expect(officerLocation).toBeDefined();
    expect(officerLocation!.latitude).toBe(40.7589);
    expect(officerLocation!.longitude).toBe(-73.9851);

    // Verify most recent vehicle location
    expect(vehicleLocation).toBeDefined();
    expect(vehicleLocation!.latitude).toBe(41.8756);
    expect(vehicleLocation!.longitude).toBe(-87.6244);
  });

  it('should handle mixed active entities correctly', async () => {
    // Create mixed entities
    const officer = await db.insert(securityOfficersTable)
      .values({
        name: 'Active Officer',
        badge_number: 'SO001',
        status: 'on_duty'
      })
      .returning();

    const vehicle = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC123',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning();

    // Create location points
    const now = new Date();
    
    await db.insert(locationPointsTable)
      .values([
        {
          entity_type: 'security_officer',
          entity_id: officer[0].id,
          latitude: '40.7128',
          longitude: '-74.0060',
          altitude: '15.2',
          accuracy: '3.5',
          timestamp: now
        },
        {
          entity_type: 'corporate_vehicle',
          entity_id: vehicle[0].id,
          latitude: '41.8781',
          longitude: '-87.6298',
          speed: '45.0',
          heading: '90.0',
          timestamp: now
        }
      ]);

    const result = await getCurrentLocations();

    expect(result).toHaveLength(2);

    // Verify both entities are present
    const entityTypes = result.map(loc => loc.entity_type);
    expect(entityTypes).toContain('security_officer');
    expect(entityTypes).toContain('corporate_vehicle');

    // Verify numeric conversions for all fields
    result.forEach(location => {
      expect(typeof location.latitude).toBe('number');
      expect(typeof location.longitude).toBe('number');
      
      if (location.altitude !== null) {
        expect(typeof location.altitude).toBe('number');
      }
      if (location.accuracy !== null) {
        expect(typeof location.accuracy).toBe('number');
      }
      if (location.heading !== null) {
        expect(typeof location.heading).toBe('number');
      }
      if (location.speed !== null) {
        expect(typeof location.speed).toBe('number');
      }
    });
  });

  it('should handle null numeric fields correctly', async () => {
    // Create test officer
    const officer = await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO001',
        status: 'on_duty'
      })
      .returning();

    // Create location with minimal data (null optional fields)
    await db.insert(locationPointsTable)
      .values({
        entity_type: 'security_officer',
        entity_id: officer[0].id,
        latitude: '40.7128',
        longitude: '-74.0060',
        altitude: null,
        accuracy: null,
        heading: null,
        speed: null,
        timestamp: new Date()
      });

    const result = await getCurrentLocations();

    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBe(40.7128);
    expect(result[0].longitude).toBe(-74.0060);
    expect(result[0].altitude).toBeNull();
    expect(result[0].accuracy).toBeNull();
    expect(result[0].heading).toBeNull();
    expect(result[0].speed).toBeNull();
  });
});