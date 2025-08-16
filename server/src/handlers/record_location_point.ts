import { db } from '../db';
import { locationPointsTable, securityOfficersTable, corporateVehiclesTable } from '../db/schema';
import { type CreateLocationPointInput, type LocationPoint } from '../schema';
import { eq } from 'drizzle-orm';

export const recordLocationPoint = async (input: CreateLocationPointInput): Promise<LocationPoint> => {
  try {
    // Validate that the referenced entity exists
    if (input.entity_type === 'security_officer') {
      const officer = await db.select()
        .from(securityOfficersTable)
        .where(eq(securityOfficersTable.id, input.entity_id))
        .limit(1)
        .execute();
      
      if (officer.length === 0) {
        throw new Error(`Security officer with ID ${input.entity_id} not found`);
      }
    } else if (input.entity_type === 'corporate_vehicle') {
      const vehicle = await db.select()
        .from(corporateVehiclesTable)
        .where(eq(corporateVehiclesTable.id, input.entity_id))
        .limit(1)
        .execute();
      
      if (vehicle.length === 0) {
        throw new Error(`Corporate vehicle with ID ${input.entity_id} not found`);
      }
    }

    // Set timestamp to current time if not provided
    const timestamp = input.timestamp || new Date();

    // Insert location point record
    const result = await db.insert(locationPointsTable)
      .values({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        latitude: input.latitude.toString(), // Convert number to string for numeric column
        longitude: input.longitude.toString(), // Convert number to string for numeric column
        altitude: input.altitude !== undefined && input.altitude !== null ? input.altitude.toString() : null, // Convert number to string for numeric column
        accuracy: input.accuracy !== undefined && input.accuracy !== null ? input.accuracy.toString() : null, // Convert number to string for numeric column
        heading: input.heading !== undefined && input.heading !== null ? input.heading.toString() : null, // Convert number to string for numeric column
        speed: input.speed !== undefined && input.speed !== null ? input.speed.toString() : null, // Convert number to string for numeric column
        timestamp: timestamp
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const locationPoint = result[0];
    return {
      ...locationPoint,
      latitude: parseFloat(locationPoint.latitude), // Convert string back to number
      longitude: parseFloat(locationPoint.longitude), // Convert string back to number
      altitude: locationPoint.altitude ? parseFloat(locationPoint.altitude) : null, // Convert string back to number
      accuracy: locationPoint.accuracy ? parseFloat(locationPoint.accuracy) : null, // Convert string back to number
      heading: locationPoint.heading ? parseFloat(locationPoint.heading) : null, // Convert string back to number
      speed: locationPoint.speed ? parseFloat(locationPoint.speed) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Location point recording failed:', error);
    throw error;
  }
};