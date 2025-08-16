import { db } from '../db';
import { locationPointsTable } from '../db/schema';
import { type GetLocationHistoryInput, type LocationPoint } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export async function getLocationHistory(input: GetLocationHistoryInput): Promise<LocationPoint[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(locationPointsTable.entity_type, input.entity_type),
      eq(locationPointsTable.entity_id, input.entity_id)
    ];

    // Add date range filters if provided
    if (input.start_date) {
      conditions.push(gte(locationPointsTable.timestamp, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(locationPointsTable.timestamp, input.end_date));
    }

    // Apply limit (default to 100 if not specified to prevent performance issues)
    const limit = input.limit ?? 100;

    // Build complete query in one chain to avoid type issues
    const results = await db.select()
      .from(locationPointsTable)
      .where(and(...conditions))
      .orderBy(desc(locationPointsTable.timestamp))
      .limit(limit)
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(point => ({
      ...point,
      latitude: parseFloat(point.latitude),
      longitude: parseFloat(point.longitude),
      altitude: point.altitude ? parseFloat(point.altitude) : null,
      accuracy: point.accuracy ? parseFloat(point.accuracy) : null,
      heading: point.heading ? parseFloat(point.heading) : null,
      speed: point.speed ? parseFloat(point.speed) : null
    }));
  } catch (error) {
    console.error('Failed to get location history:', error);
    throw error;
  }
}