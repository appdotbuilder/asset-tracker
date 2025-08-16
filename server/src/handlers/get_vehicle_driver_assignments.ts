import { db } from '../db';
import { vehicleDriverAssignmentsTable } from '../db/schema';
import { type VehicleDriverAssignment } from '../schema';

export const getVehicleDriverAssignments = async (): Promise<VehicleDriverAssignment[]> => {
  try {
    // Query all vehicle-driver assignments
    const results = await db.select()
      .from(vehicleDriverAssignmentsTable)
      .execute();

    // Return the assignment data - no numeric conversions needed as all fields are integers, dates, or strings
    return results.map(result => ({
      id: result.id,
      vehicle_id: result.vehicle_id,
      driver_id: result.driver_id,
      assigned_at: result.assigned_at,
      unassigned_at: result.unassigned_at,
      status: result.status
    }));
  } catch (error) {
    console.error('Failed to get vehicle-driver assignments:', error);
    throw error;
  }
};