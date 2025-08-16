import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { securityOfficersTable } from '../db/schema';
import { type CreateSecurityOfficerInput } from '../schema';
import { getSecurityOfficers } from '../handlers/get_security_officers';

// Test data
const testOfficer1: CreateSecurityOfficerInput = {
  name: 'John Smith',
  badge_number: 'SO001',
  phone: '+1234567890',
  email: 'john.smith@security.com',
  status: 'on_duty'
};

const testOfficer2: CreateSecurityOfficerInput = {
  name: 'Jane Doe',
  badge_number: 'SO002',
  phone: null,
  email: 'jane.doe@security.com',
  status: 'active'
};

const testOfficer3: CreateSecurityOfficerInput = {
  name: 'Bob Wilson',
  badge_number: 'SO003',
  phone: '+1987654321',
  email: null,
  status: 'inactive'
};

describe('getSecurityOfficers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no officers exist', async () => {
    const result = await getSecurityOfficers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all security officers', async () => {
    // Create test officers
    await db.insert(securityOfficersTable)
      .values([testOfficer1, testOfficer2, testOfficer3])
      .execute();

    const result = await getSecurityOfficers();

    expect(result).toHaveLength(3);
    
    // Verify all officers are returned
    const badges = result.map(officer => officer.badge_number);
    expect(badges).toContain('SO001');
    expect(badges).toContain('SO002');
    expect(badges).toContain('SO003');
  });

  it('should return officers with correct data structure', async () => {
    // Create one test officer
    await db.insert(securityOfficersTable)
      .values(testOfficer1)
      .execute();

    const result = await getSecurityOfficers();

    expect(result).toHaveLength(1);
    const officer = result[0];

    // Verify all required fields are present
    expect(officer.id).toBeDefined();
    expect(typeof officer.id).toBe('number');
    expect(officer.name).toBe('John Smith');
    expect(officer.badge_number).toBe('SO001');
    expect(officer.phone).toBe('+1234567890');
    expect(officer.email).toBe('john.smith@security.com');
    expect(officer.status).toBe('on_duty');
    expect(officer.created_at).toBeInstanceOf(Date);
    expect(officer.updated_at).toBeInstanceOf(Date);
  });

  it('should handle officers with null phone and email fields', async () => {
    // Create officer with null fields
    await db.insert(securityOfficersTable)
      .values({
        name: 'Test Officer',
        badge_number: 'SO999',
        phone: null,
        email: null,
        status: 'active'
      })
      .execute();

    const result = await getSecurityOfficers();

    expect(result).toHaveLength(1);
    const officer = result[0];

    expect(officer.name).toBe('Test Officer');
    expect(officer.badge_number).toBe('SO999');
    expect(officer.phone).toBeNull();
    expect(officer.email).toBeNull();
    expect(officer.status).toBe('active');
  });

  it('should return officers with different statuses', async () => {
    // Create officers with different statuses
    const officers = [
      { ...testOfficer1, status: 'on_duty' as const },
      { ...testOfficer2, status: 'off_duty' as const },
      { ...testOfficer3, status: 'active' as const }
    ];

    await db.insert(securityOfficersTable)
      .values(officers)
      .execute();

    const result = await getSecurityOfficers();

    expect(result).toHaveLength(3);

    const statuses = result.map(officer => officer.status);
    expect(statuses).toContain('on_duty');
    expect(statuses).toContain('off_duty');
    expect(statuses).toContain('active');
  });

  it('should return officers ordered by creation time', async () => {
    // Create officers with slight delay to ensure different timestamps
    await db.insert(securityOfficersTable)
      .values(testOfficer1)
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(securityOfficersTable)
      .values(testOfficer2)
      .execute();

    const result = await getSecurityOfficers();

    expect(result).toHaveLength(2);
    
    // Verify the first officer was created before the second
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
  });
});