import { db } from '../db';
import { corporateVehiclesTable, driversTable, vehicleDriverAssignmentsTable } from '../db/schema';
import { type CorporateVehicle } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const getCorporateVehicles = async (): Promise<CorporateVehicle[]> => {
  try {
    // Query corporate vehicles with left join to get current driver assignment
    const results = await db.select({
      id: corporateVehiclesTable.id,
      license_plate: corporateVehiclesTable.license_plate,
      make: corporateVehiclesTable.make,
      model: corporateVehiclesTable.model,
      year: corporateVehiclesTable.year,
      vehicle_type: corporateVehiclesTable.vehicle_type,
      status: corporateVehiclesTable.status,
      created_at: corporateVehiclesTable.created_at,
      updated_at: corporateVehiclesTable.updated_at,
      assigned_driver_id: vehicleDriverAssignmentsTable.driver_id,
      assigned_driver_name: driversTable.name
    })
    .from(corporateVehiclesTable)
    .leftJoin(
      vehicleDriverAssignmentsTable,
      and(
        eq(vehicleDriverAssignmentsTable.vehicle_id, corporateVehiclesTable.id),
        eq(vehicleDriverAssignmentsTable.status, 'active'),
        isNull(vehicleDriverAssignmentsTable.unassigned_at)
      )
    )
    .leftJoin(
      driversTable,
      eq(driversTable.id, vehicleDriverAssignmentsTable.driver_id)
    )
    .execute();

    // Transform results to match CorporateVehicle schema
    return results.map(result => ({
      id: result.id,
      license_plate: result.license_plate,
      make: result.make,
      model: result.model,
      year: result.year,
      vehicle_type: result.vehicle_type,
      status: result.status,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch corporate vehicles:', error);
    throw error;
  }
};