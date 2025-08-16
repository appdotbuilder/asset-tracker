import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { corporateVehiclesTable } from '../db/schema';
import { type CreateCorporateVehicleInput } from '../schema';
import { createCorporateVehicle } from '../handlers/create_corporate_vehicle';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCorporateVehicleInput = {
  license_plate: 'ABC123',
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  vehicle_type: 'sedan',
  status: 'active'
};

describe('createCorporateVehicle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a corporate vehicle with all fields', async () => {
    const result = await createCorporateVehicle(testInput);

    // Verify all fields are correctly set
    expect(result.license_plate).toEqual('ABC123');
    expect(result.make).toEqual('Toyota');
    expect(result.model).toEqual('Camry');
    expect(result.year).toEqual(2023);
    expect(result.vehicle_type).toEqual('sedan');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should apply default status when not provided', async () => {
    const inputWithoutStatus = {
      license_plate: 'DEF456',
      make: 'Honda',
      model: 'Accord',
      year: 2022,
      vehicle_type: 'sedan' as const
    };

    const result = await createCorporateVehicle(inputWithoutStatus);

    expect(result.status).toEqual('active'); // Should default to 'active'
    expect(result.license_plate).toEqual('DEF456');
    expect(result.make).toEqual('Honda');
  });

  it('should save corporate vehicle to database', async () => {
    const result = await createCorporateVehicle(testInput);

    // Query the database to verify the vehicle was saved
    const vehicles = await db.select()
      .from(corporateVehiclesTable)
      .where(eq(corporateVehiclesTable.id, result.id))
      .execute();

    expect(vehicles).toHaveLength(1);
    const savedVehicle = vehicles[0];
    expect(savedVehicle.license_plate).toEqual('ABC123');
    expect(savedVehicle.make).toEqual('Toyota');
    expect(savedVehicle.model).toEqual('Camry');
    expect(savedVehicle.year).toEqual(2023);
    expect(savedVehicle.vehicle_type).toEqual('sedan');
    expect(savedVehicle.status).toEqual('active');
    expect(savedVehicle.created_at).toBeInstanceOf(Date);
    expect(savedVehicle.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different vehicle types', async () => {
    const suvInput: CreateCorporateVehicleInput = {
      license_plate: 'SUV789',
      make: 'Ford',
      model: 'Explorer',
      year: 2024,
      vehicle_type: 'suv',
      status: 'maintenance'
    };

    const result = await createCorporateVehicle(suvInput);

    expect(result.vehicle_type).toEqual('suv');
    expect(result.status).toEqual('maintenance');
    expect(result.make).toEqual('Ford');
    expect(result.model).toEqual('Explorer');
  });

  it('should handle different status values', async () => {
    const inactiveVehicleInput: CreateCorporateVehicleInput = {
      license_plate: 'INACTIVE001',
      make: 'Chevrolet',
      model: 'Malibu',
      year: 2021,
      vehicle_type: 'sedan',
      status: 'inactive'
    };

    const result = await createCorporateVehicle(inactiveVehicleInput);

    expect(result.status).toEqual('inactive');
    expect(result.license_plate).toEqual('INACTIVE001');
  });

  it('should throw error for duplicate license plate', async () => {
    // Create first vehicle
    await createCorporateVehicle(testInput);

    // Try to create another vehicle with same license plate
    const duplicateInput: CreateCorporateVehicleInput = {
      license_plate: 'ABC123', // Same license plate
      make: 'Ford',
      model: 'Focus',
      year: 2023,
      vehicle_type: 'sedan'
    };

    // Should throw error due to unique constraint violation
    await expect(createCorporateVehicle(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should create vehicles with all different vehicle types', async () => {
    const vehicleTypes = ['sedan', 'suv', 'truck', 'van', 'motorcycle'] as const;
    
    for (let i = 0; i < vehicleTypes.length; i++) {
      const vehicleType = vehicleTypes[i];
      const vehicleInput: CreateCorporateVehicleInput = {
        license_plate: `PLATE${i + 1}`,
        make: 'TestMake',
        model: 'TestModel',
        year: 2023,
        vehicle_type: vehicleType
      };

      const result = await createCorporateVehicle(vehicleInput);
      expect(result.vehicle_type).toEqual(vehicleType);
      expect(result.license_plate).toEqual(`PLATE${i + 1}`);
    }

    // Verify all vehicles were created
    const allVehicles = await db.select()
      .from(corporateVehiclesTable)
      .execute();

    expect(allVehicles).toHaveLength(vehicleTypes.length);
  });

  it('should handle edge case years correctly', async () => {
    const oldVehicleInput: CreateCorporateVehicleInput = {
      license_plate: 'OLD1950',
      make: 'Classic',
      model: 'Vintage',
      year: 1950,
      vehicle_type: 'sedan'
    };

    const newVehicleInput: CreateCorporateVehicleInput = {
      license_plate: 'NEW2024',
      make: 'Modern',
      model: 'Electric',
      year: 2024,
      vehicle_type: 'sedan'
    };

    const oldResult = await createCorporateVehicle(oldVehicleInput);
    const newResult = await createCorporateVehicle(newVehicleInput);

    expect(oldResult.year).toEqual(1950);
    expect(newResult.year).toEqual(2024);
  });
});