import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { driversTable } from '../db/schema';
import { type CreateDriverInput } from '../schema';
import { createDriver } from '../handlers/create_driver';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateDriverInput = {
  name: 'John Smith',
  license_number: 'DL123456789',
  phone: '+1234567890',
  email: 'john.smith@example.com',
  status: 'active'
};

describe('createDriver', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a driver with all fields', async () => {
    const result = await createDriver(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Smith');
    expect(result.license_number).toEqual('DL123456789');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.smith@example.com');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a driver with minimal required fields', async () => {
    const minimalInput: CreateDriverInput = {
      name: 'Jane Doe',
      license_number: 'DL987654321'
    };

    const result = await createDriver(minimalInput);

    expect(result.name).toEqual('Jane Doe');
    expect(result.license_number).toEqual('DL987654321');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.status).toEqual('active'); // Default status
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a driver with inactive status', async () => {
    const inactiveInput: CreateDriverInput = {
      name: 'Bob Johnson',
      license_number: 'DL555666777',
      status: 'inactive'
    };

    const result = await createDriver(inactiveInput);

    expect(result.status).toEqual('inactive');
    expect(result.name).toEqual('Bob Johnson');
    expect(result.license_number).toEqual('DL555666777');
  });

  it('should save driver to database', async () => {
    const result = await createDriver(testInput);

    // Query using proper drizzle syntax
    const drivers = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, result.id))
      .execute();

    expect(drivers).toHaveLength(1);
    expect(drivers[0].name).toEqual('John Smith');
    expect(drivers[0].license_number).toEqual('DL123456789');
    expect(drivers[0].phone).toEqual('+1234567890');
    expect(drivers[0].email).toEqual('john.smith@example.com');
    expect(drivers[0].status).toEqual('active');
    expect(drivers[0].created_at).toBeInstanceOf(Date);
    expect(drivers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNulls: CreateDriverInput = {
      name: 'Test Driver',
      license_number: 'DL111222333',
      phone: null,
      email: null,
      status: 'active'
    };

    const result = await createDriver(inputWithNulls);

    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.name).toEqual('Test Driver');
    expect(result.license_number).toEqual('DL111222333');
  });

  it('should fail when license number already exists', async () => {
    // Create first driver
    await createDriver({
      name: 'First Driver',
      license_number: 'DL_DUPLICATE'
    });

    // Attempt to create second driver with same license number
    const duplicateInput: CreateDriverInput = {
      name: 'Second Driver',
      license_number: 'DL_DUPLICATE'
    };

    await expect(createDriver(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should query drivers by status correctly', async () => {
    // Create drivers with different statuses
    await createDriver({
      name: 'Active Driver',
      license_number: 'DL_ACTIVE',
      status: 'active'
    });

    await createDriver({
      name: 'Inactive Driver', 
      license_number: 'DL_INACTIVE',
      status: 'inactive'
    });

    // Query active drivers
    const activeDrivers = await db.select()
      .from(driversTable)
      .where(eq(driversTable.status, 'active'))
      .execute();

    expect(activeDrivers.length).toBeGreaterThanOrEqual(1);
    activeDrivers.forEach(driver => {
      expect(driver.status).toEqual('active');
    });

    // Query inactive drivers
    const inactiveDrivers = await db.select()
      .from(driversTable)
      .where(eq(driversTable.status, 'inactive'))
      .execute();

    expect(inactiveDrivers.length).toBeGreaterThanOrEqual(1);
    inactiveDrivers.forEach(driver => {
      expect(driver.status).toEqual('inactive');
    });
  });
});