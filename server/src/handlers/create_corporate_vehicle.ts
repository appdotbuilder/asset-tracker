import { db } from '../db';
import { corporateVehiclesTable } from '../db/schema';
import { type CreateCorporateVehicleInput, type CorporateVehicle } from '../schema';

export const createCorporateVehicle = async (input: CreateCorporateVehicleInput): Promise<CorporateVehicle> => {
  try {
    // Insert corporate vehicle record
    const result = await db.insert(corporateVehiclesTable)
      .values({
        license_plate: input.license_plate,
        make: input.make,
        model: input.model,
        year: input.year,
        vehicle_type: input.vehicle_type,
        status: input.status || 'active' // Apply default if not provided
      })
      .returning()
      .execute();

    // Return the created vehicle
    const vehicle = result[0];
    return vehicle;
  } catch (error) {
    console.error('Corporate vehicle creation failed:', error);
    throw error;
  }
};