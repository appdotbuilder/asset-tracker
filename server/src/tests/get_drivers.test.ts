import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { driversTable } from '../db/schema';
import { type CreateDriverInput } from '../schema';
import { getDrivers } from '../handlers/get_drivers';
import { eq } from 'drizzle-orm';

// Test driver inputs
const testDriver1: CreateDriverInput = {
  name: 'John Doe',
  license_number: 'DL123456789',
  phone: '+1234567890',
  email: 'john.doe@company.com',
  status: 'active'
};

const testDriver2: CreateDriverInput = {
  name: 'Jane Smith',
  license_number: 'DL987654321',
  phone: '+1987654321',
  email: 'jane.smith@company.com',
  status: 'inactive'
};

const testDriver3: CreateDriverInput = {
  name: 'Bob Wilson',
  license_number: 'DL456789123',
  phone: null,
  email: null,
  status: 'active'
};

describe('getDrivers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no drivers exist', async () => {
    const result = await getDrivers();

    expect(result).toEqual([]);
  });

  it('should return all drivers', async () => {
    // Create test drivers
    await db.insert(driversTable).values([
      {
        name: testDriver1.name,
        license_number: testDriver1.license_number,
        phone: testDriver1.phone,
        email: testDriver1.email,
        status: testDriver1.status || 'active'
      },
      {
        name: testDriver2.name,
        license_number: testDriver2.license_number,
        phone: testDriver2.phone,
        email: testDriver2.email,
        status: testDriver2.status || 'active'
      },
      {
        name: testDriver3.name,
        license_number: testDriver3.license_number,
        phone: testDriver3.phone,
        email: testDriver3.email,
        status: testDriver3.status || 'active'
      }
    ]).execute();

    const result = await getDrivers();

    expect(result).toHaveLength(3);
    
    // Verify all drivers are returned
    const driverNames = result.map(driver => driver.name);
    expect(driverNames).toContain('John Doe');
    expect(driverNames).toContain('Jane Smith');
    expect(driverNames).toContain('Bob Wilson');

    // Verify all required fields are present
    result.forEach(driver => {
      expect(driver.id).toBeDefined();
      expect(driver.name).toBeDefined();
      expect(driver.license_number).toBeDefined();
      expect(driver.status).toBeDefined();
      expect(driver.created_at).toBeInstanceOf(Date);
      expect(driver.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return drivers with different statuses', async () => {
    // Create drivers with different statuses
    await db.insert(driversTable).values([
      {
        name: testDriver1.name,
        license_number: testDriver1.license_number,
        phone: testDriver1.phone,
        email: testDriver1.email,
        status: 'active'
      },
      {
        name: testDriver2.name,
        license_number: testDriver2.license_number,
        phone: testDriver2.phone,
        email: testDriver2.email,
        status: 'inactive'
      }
    ]).execute();

    const result = await getDrivers();

    expect(result).toHaveLength(2);
    
    const activeDriver = result.find(driver => driver.status === 'active');
    const inactiveDriver = result.find(driver => driver.status === 'inactive');
    
    expect(activeDriver).toBeDefined();
    expect(inactiveDriver).toBeDefined();
    expect(activeDriver?.name).toBe('John Doe');
    expect(inactiveDriver?.name).toBe('Jane Smith');
  });

  it('should handle drivers with null phone and email', async () => {
    // Create driver with null contact info
    await db.insert(driversTable).values({
      name: testDriver3.name,
      license_number: testDriver3.license_number,
      phone: null,
      email: null,
      status: testDriver3.status || 'active'
    }).execute();

    const result = await getDrivers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob Wilson');
    expect(result[0].phone).toBeNull();
    expect(result[0].email).toBeNull();
    expect(result[0].license_number).toBe('DL456789123');
    expect(result[0].status).toBe('active');
  });

  it('should return drivers ordered by database insertion order', async () => {
    // Insert drivers in specific order
    await db.insert(driversTable).values({
      name: 'First Driver',
      license_number: 'DL111111111',
      status: 'active'
    }).execute();

    await db.insert(driversTable).values({
      name: 'Second Driver',
      license_number: 'DL222222222',
      status: 'active'
    }).execute();

    await db.insert(driversTable).values({
      name: 'Third Driver',
      license_number: 'DL333333333',
      status: 'active'
    }).execute();

    const result = await getDrivers();

    expect(result).toHaveLength(3);
    // Verify they maintain insertion order (by ID)
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
    expect(result[0].name).toBe('First Driver');
    expect(result[1].name).toBe('Second Driver');
    expect(result[2].name).toBe('Third Driver');
  });

  it('should verify driver data integrity', async () => {
    const testDriverData = {
      name: 'Test Driver',
      license_number: 'DL999999999',
      phone: '+1555666777',
      email: 'test.driver@company.com',
      status: 'active' as const
    };

    // Insert driver
    const insertResult = await db.insert(driversTable)
      .values(testDriverData)
      .returning()
      .execute();

    const insertedDriver = insertResult[0];

    // Get all drivers
    const result = await getDrivers();

    expect(result).toHaveLength(1);
    
    const retrievedDriver = result[0];
    
    // Verify all fields match exactly
    expect(retrievedDriver.id).toBe(insertedDriver.id);
    expect(retrievedDriver.name).toBe(testDriverData.name);
    expect(retrievedDriver.license_number).toBe(testDriverData.license_number);
    expect(retrievedDriver.phone).toBe(testDriverData.phone);
    expect(retrievedDriver.email).toBe(testDriverData.email);
    expect(retrievedDriver.status).toBe(testDriverData.status);
    expect(retrievedDriver.created_at).toEqual(insertedDriver.created_at);
    expect(retrievedDriver.updated_at).toEqual(insertedDriver.updated_at);
  });
});