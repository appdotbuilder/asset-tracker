import { db } from '../db';
import { vehicleDriverAssignmentsTable } from '../db/schema';
import { type VehicleDriverAssignment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const unassignDriverFromVehicle = async (vehicleId: number): Promise<VehicleDriverAssignment | null> => {
  try {
    // Find the active assignment for the vehicle
    const activeAssignments = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .where(
        and(
          eq(vehicleDriverAssignmentsTable.vehicle_id, vehicleId),
          eq(vehicleDriverAssignmentsTable.status, 'active')
        )
      )
      .execute();

    // If no active assignment exists, return null
    if (activeAssignments.length === 0) {
      return null;
    }

    const activeAssignment = activeAssignments[0];

    // Update the assignment to mark it as inactive and set unassigned_at timestamp
    const result = await db.update(vehicleDriverAssignmentsTable)
      .set({
        unassigned_at: new Date(),
        status: 'inactive'
      })
      .where(eq(vehicleDriverAssignmentsTable.id, activeAssignment.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Driver unassignment failed:', error);
    throw error;
  }
};