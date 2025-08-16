import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vehicleDriverAssignmentsTable, corporateVehiclesTable, driversTable } from '../db/schema';
import { type CreateCorporateVehicleInput, type CreateDriverInput, type AssignDriverToVehicleInput } from '../schema';
import { getVehicleDriverAssignments } from '../handlers/get_vehicle_driver_assignments';

describe('getVehicleDriverAssignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no assignments exist', async () => {
    const result = await getVehicleDriverAssignments();
    
    expect(result).toEqual([]);
  });

  it('should return vehicle-driver assignments', async () => {
    // Create test vehicle
    const vehicleInput: CreateCorporateVehicleInput = {
      license_plate: 'ABC-123',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      vehicle_type: 'sedan',
      status: 'active'
    };

    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values(vehicleInput)
      .returning()
      .execute();

    // Create test driver
    const driverInput: CreateDriverInput = {
      name: 'John Driver',
      license_number: 'DL123456',
      phone: '555-0123',
      email: 'john.driver@example.com',
      status: 'active'
    };

    const [driver] = await db.insert(driversTable)
      .values(driverInput)
      .returning()
      .execute();

    // Create assignment
    const assignmentInput: AssignDriverToVehicleInput = {
      vehicle_id: vehicle.id,
      driver_id: driver.id
    };

    const [assignment] = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: assignmentInput.vehicle_id,
        driver_id: assignmentInput.driver_id,
        status: 'active'
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getVehicleDriverAssignments();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(assignment.id);
    expect(result[0].vehicle_id).toBe(vehicle.id);
    expect(result[0].driver_id).toBe(driver.id);
    expect(result[0].status).toBe('active');
    expect(result[0].assigned_at).toBeInstanceOf(Date);
    expect(result[0].unassigned_at).toBeNull();
  });

  it('should return multiple assignments including both active and inactive', async () => {
    // Create first vehicle and driver
    const [vehicle1] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'VEH-001',
        make: 'Ford',
        model: 'F-150',
        year: 2021,
        vehicle_type: 'truck',
        status: 'active'
      })
      .returning()
      .execute();

    const [driver1] = await db.insert(driversTable)
      .values({
        name: 'Driver One',
        license_number: 'DL111111',
        phone: '555-0001',
        email: 'driver1@example.com',
        status: 'active'
      })
      .returning()
      .execute();

    // Create second vehicle and driver
    const [vehicle2] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'VEH-002',
        make: 'Honda',
        model: 'CR-V',
        year: 2023,
        vehicle_type: 'suv',
        status: 'active'
      })
      .returning()
      .execute();

    const [driver2] = await db.insert(driversTable)
      .values({
        name: 'Driver Two',
        license_number: 'DL222222',
        phone: '555-0002',
        email: 'driver2@example.com',
        status: 'inactive'
      })
      .returning()
      .execute();

    // Create active assignment
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle1.id,
        driver_id: driver1.id,
        status: 'active'
      })
      .execute();

    // Create inactive assignment with unassigned date
    const pastDate = new Date('2023-12-01');
    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle2.id,
        driver_id: driver2.id,
        assigned_at: pastDate,
        unassigned_at: new Date('2023-12-15'),
        status: 'inactive'
      })
      .execute();

    // Test the handler
    const result = await getVehicleDriverAssignments();

    expect(result).toHaveLength(2);

    // Find assignments by status
    const activeAssignment = result.find(a => a.status === 'active');
    const inactiveAssignment = result.find(a => a.status === 'inactive');

    expect(activeAssignment).toBeDefined();
    expect(inactiveAssignment).toBeDefined();

    // Verify active assignment
    expect(activeAssignment!.vehicle_id).toBe(vehicle1.id);
    expect(activeAssignment!.driver_id).toBe(driver1.id);
    expect(activeAssignment!.unassigned_at).toBeNull();

    // Verify inactive assignment
    expect(inactiveAssignment!.vehicle_id).toBe(vehicle2.id);
    expect(inactiveAssignment!.driver_id).toBe(driver2.id);
    expect(inactiveAssignment!.unassigned_at).toBeInstanceOf(Date);
  });

  it('should handle assignments with different statuses', async () => {
    // Create vehicle
    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'STATUS-TEST',
        make: 'Test',
        model: 'Vehicle',
        year: 2020,
        vehicle_type: 'van',
        status: 'active'
      })
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(driversTable)
      .values({
        name: 'Status Driver',
        license_number: 'DL000000',
        phone: null,
        email: null,
        status: 'active'
      })
      .returning()
      .execute();

    // Create active assignment
    const [activeAssignment] = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        status: 'active'
      })
      .returning()
      .execute();

    // Create inactive assignment
    const [inactiveAssignment] = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        unassigned_at: new Date(),
        status: 'inactive'
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getVehicleDriverAssignments();

    expect(result).toHaveLength(2);
    
    const active = result.find(r => r.id === activeAssignment.id);
    const inactive = result.find(r => r.id === inactiveAssignment.id);
    
    expect(active!.status).toBe('active');
    expect(active!.unassigned_at).toBeNull();
    
    expect(inactive!.status).toBe('inactive');
    expect(inactive!.unassigned_at).toBeInstanceOf(Date);
  });

  it('should handle multiple assignments and return correct count', async () => {
    const numAssignments = 5;
    const vehicleIds: number[] = [];
    const driverIds: number[] = [];

    // Create multiple vehicles and drivers
    for (let i = 0; i < numAssignments; i++) {
      const [vehicle] = await db.insert(corporateVehiclesTable)
        .values({
          license_plate: `TEST-${i}`,
          make: 'Test',
          model: `Vehicle${i}`,
          year: 2020 + i,
          vehicle_type: 'sedan',
          status: 'active'
        })
        .returning()
        .execute();
      vehicleIds.push(vehicle.id);

      const [driver] = await db.insert(driversTable)
        .values({
          name: `Driver ${i}`,
          license_number: `DL${i.toString().padStart(6, '0')}`,
          status: 'active'
        })
        .returning()
        .execute();
      driverIds.push(driver.id);

      await db.insert(vehicleDriverAssignmentsTable)
        .values({
          vehicle_id: vehicle.id,
          driver_id: driver.id,
          status: 'active'
        })
        .execute();
    }

    // Test the handler
    const result = await getVehicleDriverAssignments();

    expect(result).toHaveLength(numAssignments);
    
    // Verify all assignments have correct vehicle and driver IDs
    result.forEach(assignment => {
      expect(vehicleIds).toContain(assignment.vehicle_id);
      expect(driverIds).toContain(assignment.driver_id);
      expect(assignment.status).toBe('active');
      expect(assignment.id).toBeTypeOf('number');
      expect(assignment.assigned_at).toBeInstanceOf(Date);
    });
  });

  it('should preserve assignment timestamps correctly', async () => {
    // Create vehicle and driver
    const [vehicle] = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: 'TIME-TEST',
        make: 'Test',
        model: 'Vehicle',
        year: 2023,
        vehicle_type: 'sedan',
        status: 'active'
      })
      .returning()
      .execute();

    const [driver] = await db.insert(driversTable)
      .values({
        name: 'Time Driver',
        license_number: 'DL999999',
        status: 'active'
      })
      .returning()
      .execute();

    // Create assignment with specific timestamps
    const assignedTime = new Date('2023-10-01T10:00:00Z');
    const unassignedTime = new Date('2023-10-01T18:00:00Z');

    await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: vehicle.id,
        driver_id: driver.id,
        assigned_at: assignedTime,
        unassigned_at: unassignedTime,
        status: 'inactive'
      })
      .execute();

    // Test the handler
    const result = await getVehicleDriverAssignments();

    expect(result).toHaveLength(1);
    expect(result[0].assigned_at).toEqual(assignedTime);
    expect(result[0].unassigned_at).toEqual(unassignedTime);
    expect(result[0].status).toBe('inactive');
  });
});