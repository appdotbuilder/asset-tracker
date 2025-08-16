import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehicleDriverAssignmentsTable, corporateVehiclesTable, driversTable } from '../db/schema';
import { unassignDriverFromVehicle } from '../handlers/unassign_driver_from_vehicle';
import { eq, and } from 'drizzle-orm';

describe('unassignDriverFromVehicle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully unassign an active driver from a vehicle', async () => {
    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
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

    const vehicle = vehicleResult[0];

    // Create test driver
    const driverResult = await db.insert(driversTable)
      .values({
        name: 'John Driver',
        license_number: 'DL123456',
        phone: '+1234567890',
        email: 'john@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    const driver = driverResult[0];

    // Create active assignment
    const assignmentResult = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        status: 'active'
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    // Call the handler
    const result = await unassignDriverFromVehicle(vehicle.id);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(assignment.id);
    expect(result!.vehicle_id).toEqual(vehicle.id);
    expect(result!.driver_id).toEqual(driver.id);
    expect(result!.status).toEqual('inactive');
    expect(result!.unassigned_at).toBeInstanceOf(Date);
    expect(result!.unassigned_at!.getTime()).toBeLessThanOrEqual(new Date().getTime());
  });

  it('should update the assignment in the database', async () => {
    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'XYZ-789',
        make: 'Honda',
        model: 'Civic',
        year: 2022,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test driver
    const driverResult = await db.insert(driversTable)
      .values({
        name: 'Jane Driver',
        license_number: 'DL789012',
        phone: '+1987654321',
        email: 'jane@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    const driver = driverResult[0];

    // Create active assignment
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        status: 'active'
      })
      .execute();

    // Call the handler
    const result = await unassignDriverFromVehicle(vehicle.id);

    // Query the database to verify the update
    const updatedAssignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(eq(vehicleDriverAssignmentsTable.id, result!.id))
      .execute();

    expect(updatedAssignments).toHaveLength(1);
    const updatedAssignment = updatedAssignments[0];
    
    expect(updatedAssignment.status).toEqual('inactive');
    expect(updatedAssignment.unassigned_at).toBeInstanceOf(Date);
    expect(updatedAssignment.vehicle_id).toEqual(vehicle.id);
    expect(updatedAssignment.driver_id).toEqual(driver.id);
  });

  it('should return null when no active assignment exists for the vehicle', async () => {
    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'DEF-456',
        make: 'Ford',
        model: 'F150',
        year: 2023,
        vehicle_type: 'truck',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Call the handler without any assignments
    const result = await unassignDriverFromVehicle(vehicle.id);

    expect(result).toBeNull();
  });

  it('should return null when only inactive assignments exist for the vehicle', async () => {
    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'GHI-789',
        make: 'Chevrolet',
        model: 'Silverado',
        year: 2022,
        vehicle_type: 'truck',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test driver
    const driverResult = await db.insert(driversTable)
      .values({
        name: 'Bob Driver',
        license_number: 'DL345678',
        phone: '+1555123456',
        email: 'bob@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    const driver = driverResult[0];

    // Create inactive assignment (already unassigned)
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        status: 'inactive',
        unassigned_at: new Date()
      })
      .execute();

    // Call the handler
    const result = await unassignDriverFromVehicle(vehicle.id);

    expect(result).toBeNull();
  });

  it('should only unassign the active assignment when multiple assignments exist', async () => {
    // Create test vehicle
    const vehicleResult = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'JKL-012',
        make: 'Nissan',
        model: 'Altima',
        year: 2023,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test drivers
    const driver1Result = await db.insert(driversTable)
      .values({
        name: 'Driver One',
        license_number: 'DL111111',
        phone: '+1111111111',
        email: 'driver1@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    const driver2Result = await db.insert(driversTable)
      .values({
        name: 'Driver Two',
        license_number: 'DL222222',
        phone: '+2222222222',
        email: 'driver2@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    const driver1 = driver1Result[0];
    const driver2 = driver2Result[0];

    // Create one inactive assignment (historical)
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver1.id,
        status: 'inactive',
        unassigned_at: new Date(Date.now() - 86400000) // 1 day ago
      })
      .execute();

    // Create one active assignment (current)
    const activeAssignmentResult = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver2.id,
        status: 'active'
      })
      .returning()
      .execute();

    const activeAssignment = activeAssignmentResult[0];

    // Call the handler
    const result = await unassignDriverFromVehicle(vehicle.id);

    // Verify only the active assignment was updated
    expect(result).toBeDefined();
    expect(result!.id).toEqual(activeAssignment.id);
    expect(result!.driver_id).toEqual(driver2.id);
    expect(result!.status).toEqual('inactive');

    // Verify the inactive assignment remained unchanged
    const allAssignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(eq(vehicleDriverAssignmentsTable.vehicle_id, vehicle.id))
      .execute();

    expect(allAssignments).toHaveLength(2);
    
    const inactiveAssignment = allAssignments.find(a => a.driver_id === driver1.id);
    expect(inactiveAssignment!.status).toEqual('inactive');
    
    const updatedActiveAssignment = allAssignments.find(a => a.driver_id === driver2.id);
    expect(updatedActiveAssignment!.status).toEqual('inactive');
    expect(updatedActiveAssignment!.unassigned_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent vehicle ID', async () => {
    const nonExistentVehicleId = 99999;

    const result = await unassignDriverFromVehicle(nonExistentVehicleId);

    expect(result).toBeNull();
  });
});