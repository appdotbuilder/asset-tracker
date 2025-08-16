import { db } from '../db';
import { vehicleDriverAssignmentsTable, corporateVehiclesTable, driversTable } from '../db/schema';
import { type AssignDriverToVehicleInput, type VehicleDriverAssignment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const assignDriverToVehicle = async (input: AssignDriverToVehicleInput): Promise<VehicleDriverAssignment> => {
  try {
    // First verify that both vehicle and driver exist
    const [vehicle] = await db.select()
      .from(corporateVehiclesTable)
      .where(eq(corporateVehiclesTable.id, input.vehicle_id))
      .execute();

    if (!vehicle) {
      throw new Error(`Vehicle with ID ${input.vehicle_id} not found`);
    }

    const [driver] = await db.select()
      .from(driversTable)
      .where(eq(driversTable.id, input.driver_id))
      .execute();

    if (!driver) {
      throw new Error(`Driver with ID ${input.driver_id} not found`);
    }

    // Unassign any existing active assignment for the vehicle
    await db.update(vehicleDriverAssignmentsTable)
      .set({
        status: 'inactive',
        unassigned_at: new Date()
      })
      .where(
        and(
          eq(vehicleDriverAssignmentsTable.vehicle_id, input.vehicle_id),
          eq(vehicleDriverAssignmentsTable.status, 'active')
        )
      )
      .execute();

    // Create new active assignment
    const result = await db.insert(vehicleDriverAssignmentsTable)
      .values({
        vehicle_id: input.vehicle_id,
        driver_id: input.driver_id,
        status: 'active'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Driver-vehicle assignment failed:', error);
    throw error;
  }
};