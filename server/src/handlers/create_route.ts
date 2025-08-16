import { db } from '../db';
import { routesTable } from '../db/schema';
import { type CreateRouteInput, type Route } from '../schema';

export const createRoute = async (input: CreateRouteInput): Promise<Route> => {
  try {
    // Insert route record
    const result = await db.insert(routesTable)
      .values({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        route_name: input.route_name || null,
        start_time: input.start_time || new Date(),
        end_time: null,
        total_distance: null,
        total_duration: null,
        status: 'active'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const route = result[0];
    return {
      ...route,
      total_distance: route.total_distance ? parseFloat(route.total_distance) : null
    };
  } catch (error) {
    console.error('Route creation failed:', error);
    throw error;
  }
};