import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { securityOfficersTable } from '../db/schema';
import { type CreateSecurityOfficerInput } from '../schema';
import { createSecurityOfficer } from '../handlers/create_security_officer';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateSecurityOfficerInput = {
  name: 'John Smith',
  badge_number: 'SO-001',
  phone: '+1234567890',
  email: 'john.smith@security.com',
  status: 'active'
};

// Minimal test input (only required fields)
const minimalInput: CreateSecurityOfficerInput = {
  name: 'Jane Doe',
  badge_number: 'SO-002'
};

describe('createSecurityOfficer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a security officer with all fields', async () => {
    const result = await createSecurityOfficer(testInput);

    // Verify all fields are correctly set
    expect(result.name).toEqual('John Smith');
    expect(result.badge_number).toEqual('SO-001');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.smith@security.com');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a security officer with minimal fields', async () => {
    const result = await createSecurityOfficer(minimalInput);

    // Verify required fields and defaults
    expect(result.name).toEqual('Jane Doe');
    expect(result.badge_number).toEqual('SO-002');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.status).toEqual('active'); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save security officer to database', async () => {
    const result = await createSecurityOfficer(testInput);

    // Query database to verify the record was saved
    const officers = await db.select()
      .from(securityOfficersTable)
      .where(eq(securityOfficersTable.id, result.id))
      .execute();

    expect(officers).toHaveLength(1);
    expect(officers[0].name).toEqual('John Smith');
    expect(officers[0].badge_number).toEqual('SO-001');
    expect(officers[0].phone).toEqual('+1234567890');
    expect(officers[0].email).toEqual('john.smith@security.com');
    expect(officers[0].status).toEqual('active');
    expect(officers[0].created_at).toBeInstanceOf(Date);
    expect(officers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different status values', async () => {
    const onDutyInput: CreateSecurityOfficerInput = {
      name: 'Officer On Duty',
      badge_number: 'SO-003',
      status: 'on_duty'
    };

    const result = await createSecurityOfficer(onDutyInput);

    expect(result.status).toEqual('on_duty');
    expect(result.name).toEqual('Officer On Duty');
    expect(result.badge_number).toEqual('SO-003');
  });

  it('should handle null phone and email values', async () => {
    const nullInput: CreateSecurityOfficerInput = {
      name: 'Officer Null',
      badge_number: 'SO-004',
      phone: null,
      email: null
    };

    const result = await createSecurityOfficer(nullInput);

    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.name).toEqual('Officer Null');
    expect(result.badge_number).toEqual('SO-004');
  });

  it('should reject duplicate badge numbers', async () => {
    // Create first officer
    await createSecurityOfficer(testInput);

    // Attempt to create another officer with same badge number
    const duplicateInput: CreateSecurityOfficerInput = {
      name: 'Duplicate Officer',
      badge_number: 'SO-001', // Same badge number
      phone: '+9876543210',
      email: 'duplicate@security.com'
    };

    await expect(createSecurityOfficer(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create multiple officers with different badge numbers', async () => {
    const officer1 = await createSecurityOfficer({
      name: 'Officer One',
      badge_number: 'SO-100'
    });

    const officer2 = await createSecurityOfficer({
      name: 'Officer Two', 
      badge_number: 'SO-200'
    });

    expect(officer1.badge_number).toEqual('SO-100');
    expect(officer2.badge_number).toEqual('SO-200');
    expect(officer1.id).not.toEqual(officer2.id);

    // Verify both are in database
    const allOfficers = await db.select()
      .from(securityOfficersTable)
      .execute();

    expect(allOfficers).toHaveLength(2);
  });
});