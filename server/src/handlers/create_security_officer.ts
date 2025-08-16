import { db } from '../db';
import { securityOfficersTable } from '../db/schema';
import { type CreateSecurityOfficerInput, type SecurityOfficer } from '../schema';

export const createSecurityOfficer = async (input: CreateSecurityOfficerInput): Promise<SecurityOfficer> => {
  try {
    // Insert security officer record
    const result = await db.insert(securityOfficersTable)
      .values({
        name: input.name,
        badge_number: input.badge_number,
        phone: input.phone || null,
        email: input.email || null,
        status: input.status || 'active'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Security officer creation failed:', error);
    throw error;
  }
};