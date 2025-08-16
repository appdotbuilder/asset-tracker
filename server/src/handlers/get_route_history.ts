import { db } from '../db';
import { routesTable } from '../db/schema';
import { type Route } from '../schema';
import { and, eq, gte, lte, desc, type SQL } from 'drizzle-orm';

// Custom input type for this handler that makes entity_type optional
export type GetRouteHistoryInput = {
  entity_type?: 'security_officer' | 'corporate_vehicle';
  entity_id?: number;
  start_date?: Date;
  end_date?: Date;
  status?: 'active' | 'completed' | 'interrupted';
};

export async function getRouteHistory(input: GetRouteHistoryInput): Promise<Route[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by entity type and ID
    if (input.entity_type) {
      conditions.push(eq(routesTable.entity_type, input.entity_type));
    }

    if (input.entity_id !== undefined) {
      conditions.push(eq(routesTable.entity_id, input.entity_id));
    }

    // Filter by date range
    if (input.start_date) {
      conditions.push(gte(routesTable.start_time, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(routesTable.start_time, input.end_date));
    }

    // Filter by status
    if (input.status) {
      conditions.push(eq(routesTable.status, input.status));
    }

    // Build and execute the query
    let results;
    
    if (conditions.length === 0) {
      // No filters - get all routes
      results = await db.select()
        .from(routesTable)
        .orderBy(desc(routesTable.start_time))
        .execute();
    } else if (conditions.length === 1) {
      // Single condition
      results = await db.select()
        .from(routesTable)
        .where(conditions[0])
        .orderBy(desc(routesTable.start_time))
        .execute();
    } else {
      // Multiple conditions
      results = await db.select()
        .from(routesTable)
        .where(and(...conditions))
        .orderBy(desc(routesTable.start_time))
        .execute();
    }

    // Convert numeric fields to numbers
    return results.map(route => ({
      ...route,
      total_distance: route.total_distance ? parseFloat(route.total_distance) : null
    }));
  } catch (error) {
    console.error('Route history retrieval failed:', error);
    throw error;
  }
}