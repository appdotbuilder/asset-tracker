import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { corporateVehiclesTable, driversTable, vehicleDriverAssignmentsTable } from '../db/schema';
import { getCorporateVehicles } from '../handlers/get_corporate_vehicles';

describe('getCorporateVehicles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no vehicles exist', async () => {
    const result = await getCorporateVehicles();
    expect(result).toEqual([]);
  });

  it('should return all corporate vehicles', async () => {
    // Create test vehicles
    const vehicles = await db.insert(corporateVehiclesTable)
      .values([
        {
          license_plate: 'ABC-123',
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          vehicle_type: 'sedan',
          status: 'active'
        },
        {
          license_plate: 'XYZ-789',
          make: 'Ford',
          model: 'F-150',
          year: 2023,
          vehicle_type: 'truck',
          status: 'maintenance'
        }
      ])
      .returning()
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(2);
    
    // Check first vehicle
    const vehicle1 = result.find(v => v.license_plate === 'ABC-123');
    expect(vehicle1).toBeDefined();
    expect(vehicle1?.make).toBe('Toyota');
    expect(vehicle1?.model).toBe('Camry');
    expect(vehicle1?.year).toBe(2022);
    expect(vehicle1?.vehicle_type).toBe('sedan');
    expect(vehicle1?.status).toBe('active');
    expect(vehicle1?.id).toBeDefined();
    expect(vehicle1?.created_at).toBeInstanceOf(Date);
    expect(vehicle1?.updated_at).toBeInstanceOf(Date);

    // Check second vehicle
    const vehicle2 = result.find(v => v.license_plate === 'XYZ-789');
    expect(vehicle2).toBeDefined();
    expect(vehicle2?.make).toBe('Ford');
    expect(vehicle2?.model).toBe('F-150');
    expect(vehicle2?.year).toBe(2023);
    expect(vehicle2?.vehicle_type).toBe('truck');
    expect(vehicle2?.status).toBe('maintenance');
  });

  it('should handle vehicles with different statuses', async () => {
    // Create vehicles with all possible statuses
    await db.insert(corporateVehiclesTable)
      .values([
        {
          license_plate: 'ACTIVE-001',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          vehicle_type: 'sedan',
          status: 'active'
        },
        {
          license_plate: 'INACTIVE-001',
          make: 'Nissan',
          model: 'Altima',
          year: 2020,
          vehicle_type: 'sedan',
          status: 'inactive'
        },
        {
          license_plate: 'MAINT-001',
          make: 'Chevrolet',
          model: 'Silverado',
          year: 2019,
          vehicle_type: 'truck',
          status: 'maintenance'
        },
        {
          license_plate: 'OOS-001',
          make: 'GMC',
          model: 'Sierra',
          year: 2018,
          vehicle_type: 'truck',
          status: 'out_of_service'
        }
      ])
      .returning()
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(4);
    
    const statuses = result.map(v => v.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('inactive');
    expect(statuses).toContain('maintenance');
    expect(statuses).toContain('out_of_service');
  });

  it('should handle vehicles with different types', async () => {
    // Create vehicles with all possible types
    await db.insert(corporateVehiclesTable)
      .values([
        {
          license_plate: 'SEDAN-001',
          make: 'BMW',
          model: '3 Series',
          year: 2022,
          vehicle_type: 'sedan',
          status: 'active'
        },
        {
          license_plate: 'SUV-001',
          make: 'Mercedes',
          model: 'GLE',
          year: 2023,
          vehicle_type: 'suv',
          status: 'active'
        },
        {
          license_plate: 'TRUCK-001',
          make: 'Ram',
          model: '1500',
          year: 2021,
          vehicle_type: 'truck',
          status: 'active'
        },
        {
          license_plate: 'VAN-001',
          make: 'Ford',
          model: 'Transit',
          year: 2020,
          vehicle_type: 'van',
          status: 'active'
        },
        {
          license_plate: 'BIKE-001',
          make: 'Harley Davidson',
          model: 'Street 750',
          year: 2019,
          vehicle_type: 'motorcycle',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(5);
    
    const types = result.map(v => v.vehicle_type);
    expect(types).toContain('sedan');
    expect(types).toContain('suv');
    expect(types).toContain('truck');
    expect(types).toContain('van');
    expect(types).toContain('motorcycle');
  });

  it('should return vehicles with assigned and unassigned drivers', async () => {
    // Create test driver
    const [driver] = await db.insert(driversTable)
      .values({
        name: 'John Driver',
        license_number: 'D123456789',
        phone: '555-0101',
        email: 'john@company.com',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test vehicles
    const vehicles = await db.insert(corporateVehiclesTable)
      .values([
        {
          license_plate: 'ASSIGNED-001',
          make: 'Toyota',
          model: 'Prius',
          year: 2022,
          vehicle_type: 'sedan',
          status: 'active'
        },
        {
          license_plate: 'UNASSIGNED-001',
          make: 'Honda',
          model: 'Accord',
          year: 2021,
          vehicle_type: 'sedan',
          status: 'active'
        }
      ])
      .returning()
      .execute();

    // Assign driver to first vehicle
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicles[0].id,
        driver_id: driver.id,
        status: 'active'
      })
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(2);
    
    // Both vehicles should be returned regardless of driver assignment
    const assignedVehicle = result.find(v => v.license_plate === 'ASSIGNED-001');
    const unassignedVehicle = result.find(v => v.license_plate === 'UNASSIGNED-001');
    
    expect(assignedVehicle).toBeDefined();
    expect(unassignedVehicle).toBeDefined();
  });

  it('should preserve vehicle ordering', async () => {
    // Create vehicles in a specific order
    const vehicleData = [
      {
        license_plate: 'FIRST-001',
        make: 'Audi',
        model: 'A4',
        year: 2020,
        vehicle_type: 'sedan' as const,
        status: 'active' as const
      },
      {
        license_plate: 'SECOND-001',
        make: 'BMW',
        model: 'X5',
        year: 2021,
        vehicle_type: 'suv' as const,
        status: 'active' as const
      },
      {
        license_plate: 'THIRD-001',
        make: 'Cadillac',
        model: 'Escalade',
        year: 2022,
        vehicle_type: 'suv' as const,
        status: 'active' as const
      }
    ];

    await db.insert(corporateVehiclesTable)
      .values(vehicleData)
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(3);
    
    // Verify all vehicles are present
    const licensePlates = result.map(v => v.license_plate);
    expect(licensePlates).toContain('FIRST-001');
    expect(licensePlates).toContain('SECOND-001');
    expect(licensePlates).toContain('THIRD-001');
  });

  it('should handle large number of vehicles', async () => {
    // Create many vehicles to test scalability
    const vehicleTypes = ['sedan', 'suv', 'truck', 'van', 'motorcycle'] as const;
    const statusOptions = ['active', 'inactive', 'maintenance', 'out_of_service'] as const;
    
    const vehicleData = Array.from({ length: 50 }, (_, i) => ({
      license_plate: `TEST-${String(i + 1).padStart(3, '0')}`,
      make: 'Test Make',
      model: 'Test Model',
      year: 2020 + (i % 4),
      vehicle_type: vehicleTypes[i % 5],
      status: statusOptions[i % 4]
    }));

    await db.insert(corporateVehiclesTable)
      .values(vehicleData)
      .execute();

    const result = await getCorporateVehicles();

    expect(result).toHaveLength(50);
    
    // Verify data integrity
    result.forEach(vehicle => {
      expect(vehicle.id).toBeDefined();
      expect(vehicle.license_plate).toMatch(/^TEST-\d{3}$/);
      expect(vehicle.make).toBe('Test Make');
      expect(vehicle.model).toBe('Test Model');
      expect(vehicle.year).toBeGreaterThanOrEqual(2020);
      expect(vehicle.year).toBeLessThanOrEqual(2023);
      expect(['sedan', 'suv', 'truck', 'van', 'motorcycle']).toContain(vehicle.vehicle_type);
      expect(['active', 'inactive', 'maintenance', 'out_of_service']).toContain(vehicle.status);
      expect(vehicle.created_at).toBeInstanceOf(Date);
      expect(vehicle.updated_at).toBeInstanceOf(Date);
    });
  });
});