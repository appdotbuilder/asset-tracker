import { db } from '../db';
import { driversTable } from '../db/schema';
import { type CreateDriverInput, type Driver } from '../schema';

export const createDriver = async (input: CreateDriverInput): Promise<Driver> => {
  try {
    // Insert driver record
    const result = await db.insert(driversTable)
      .values({
        name: input.name,
        license_number: input.license_number,
        phone: input.phone ?? null,
        email: input.email ?? null,
        status: input.status ?? 'active'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Driver creation failed:', error);
    throw error;
  }
};