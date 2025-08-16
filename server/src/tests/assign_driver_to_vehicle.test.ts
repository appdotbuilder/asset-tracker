import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehicleDriverAssignmentsTable, corporateVehiclesTable, driversTable } from '../db/schema';
import { type AssignDriverToVehicleInput } from '../schema';
import { assignDriverToVehicle } from '../handlers/assign_driver_to_vehicle';
import { eq, and } from 'drizzle-orm';

describe('assignDriverToVehicle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test vehicle
  const createTestVehicle = async () => {
    const result = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'ABC-123',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test driver
  const createTestDriver = async (licenseNumber = 'DL123456') => {
    const result = await db.insert(driversTable)
      .values({
        name: 'John Doe',
        license_number: licenseNumber,
        phone: '+1234567890',
        email: 'john@example.com',
        status: 'active'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test assignment
  const createTestAssignment = async (vehicleId: number, driverId: number) => {
    const result = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicleId,
        driver_id: driverId,
        status: 'active'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should assign driver to vehicle successfully', async () => {
    const vehicle = await createTestVehicle();
    const driver = await createTestDriver();

    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver.id
    };

    const result = await assignDriverToVehicle(input);

    // Verify assignment properties
    expect(result.vehicle_id).toEqual(vehicle.id);
    expect(result.driver_id).toEqual(driver.id);
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.assigned_at).toBeInstanceOf(Date);
    expect(result.unassigned_at).toBeNull();
  });

  it('should save assignment to database', async () => {
    const vehicle = await createTestVehicle();
    const driver = await createTestDriver();

    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver.id
    };

    const result = await assignDriverToVehicle(input);

    // Verify assignment was saved to database
    const assignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(eq(vehicleDriverAssignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].vehicle_id).toEqual(vehicle.id);
    expect(assignments[0].driver_id).toEqual(driver.id);
    expect(assignments[0].status).toEqual('active');
    expect(assignments[0].assigned_at).toBeInstanceOf(Date);
  });

  it('should unassign existing active assignment before creating new one', async () => {
    const vehicle = await createTestVehicle();
    const driver1 = await createTestDriver('DL111111');
    const driver2 = await createTestDriver('DL222222');

    // Create initial assignment
    const existingAssignment = await createTestAssignment(vehicle.id, driver1.id);

    // Assign different driver to same vehicle
    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver2.id
    };

    const result = await assignDriverToVehicle(input);

    // Verify new assignment is active
    expect(result.vehicle_id).toEqual(vehicle.id);
    expect(result.driver_id).toEqual(driver2.id);
    expect(result.status).toEqual('active');

    // Verify old assignment was deactivated
    const [oldAssignment] = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(eq(vehicleDriverAssignmentsTable.id, existingAssignment.id))
      .execute();

    expect(oldAssignment.status).toEqual('inactive');
    expect(oldAssignment.unassigned_at).toBeInstanceOf(Date);

    // Verify only one active assignment exists for the vehicle
    const activeAssignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(
        and(
          eq(vehicleDriverAssignmentsTable.vehicle_id, vehicle.id),
          eq(vehicleDriverAssignmentsTable.status, 'active')
        )
      )
      .execute();

    expect(activeAssignments).toHaveLength(1);
    expect(activeAssignments[0].id).toEqual(result.id);
  });

  it('should handle multiple inactive assignments correctly', async () => {
    const vehicle = await createTestVehicle();
    const driver1 = await createTestDriver('DL111111');
    const driver2 = await createTestDriver('DL222222');
    const driver3 = await createTestDriver('DL333333');

    // Create and deactivate first assignment
    const assignment1 = await createTestAssignment(vehicle.id, driver1.id);
    await db.update(vehicleDriverAssignmentsTable)
      .set({
        status: 'inactive',
        unassigned_at: new Date()
      })
      .where(eq(vehicleDriverAssignmentsTable.id, assignment1.id))
      .execute();

    // Create second active assignment
    await createTestAssignment(vehicle.id, driver2.id);

    // Assign third driver
    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver3.id
    };

    const result = await assignDriverToVehicle(input);

    // Verify new assignment is active
    expect(result.driver_id).toEqual(driver3.id);
    expect(result.status).toEqual('active');

    // Verify only one active assignment exists
    const activeAssignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(
        and(
          eq(vehicleDriverAssignmentsTable.vehicle_id, vehicle.id),
          eq(vehicleDriverAssignmentsTable.status, 'active')
        )
      )
      .execute();

    expect(activeAssignments).toHaveLength(1);
    expect(activeAssignments[0].driver_id).toEqual(driver3.id);
  });

  it('should throw error when vehicle does not exist', async () => {
    const driver = await createTestDriver();

    const input: AssignDriverToVehicleInput = {
      vehicle_id: 99999, // Non-existent vehicle ID
      driver_id: driver.id
    };

    await expect(assignDriverToVehicle(input)).rejects.toThrow(/vehicle.*not found/i);
  });

  it('should throw error when driver does not exist', async () => {
    const vehicle = await createTestVehicle();

    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: 99999 // Non-existent driver ID
    };

    await expect(assignDriverToVehicle(input)).rejects.toThrow(/driver.*not found/i);
  });

  it('should work when no existing assignments exist', async () => {
    const vehicle = await createTestVehicle();
    const driver = await createTestDriver();

    const input: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver.id
    };

    const result = await assignDriverToVehicle(input);

    expect(result.vehicle_id).toEqual(vehicle.id);
    expect(result.driver_id).toEqual(driver.id);
    expect(result.status).toEqual('active');

    // Verify assignment was created in database
    const assignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(eq(vehicleDriverAssignmentsTable.vehicle_id, vehicle.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].status).toEqual('active');
  });
});