import { db } from '../db';
import { driversTable } from '../db/schema';
import { type Driver } from '../schema';

export const getDrivers = async (): Promise<Driver[]> => {
  try {
    // Fetch all drivers from the database
    const result = await db.select()
      .from(driversTable)
      .execute();

    // Return drivers (no numeric conversions needed for this table)
    return result;
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
    throw error;
  }
};