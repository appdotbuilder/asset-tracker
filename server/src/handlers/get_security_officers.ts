import { db } from '../db';
import { securityOfficersTable } from '../db/schema';
import { type SecurityOfficer } from '../schema';

export async function getSecurityOfficers(): Promise<SecurityOfficer[]> {
  try {
    const result = await db.select()
      .from(securityOfficersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch security officers:', error);
    throw error;
  }
}