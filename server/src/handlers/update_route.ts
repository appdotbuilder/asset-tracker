import { db } from '../db';
import { routesTable } from '../db/schema';
import { type UpdateRouteInput, type Route } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRoute = async (input: UpdateRouteInput): Promise<Route> => {
  try {
    // Build update values, only including defined fields
    const updateValues: any = {};
    
    if (input.route_name !== undefined) {
      updateValues.route_name = input.route_name;
    }
    
    if (input.end_time !== undefined) {
      updateValues.end_time = input.end_time;
    }
    
    if (input.total_distance !== undefined) {
      updateValues.total_distance = input.total_distance !== null ? input.total_distance.toString() : null;
    }
    
    if (input.total_duration !== undefined) {
      updateValues.total_duration = input.total_duration;
    }
    
    if (input.status !== undefined) {
      updateValues.status = input.status;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the route record
    const result = await db.update(routesTable)
      .set(updateValues)
      .where(eq(routesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Route with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const route = result[0];
    return {
      ...route,
      total_distance: route.total_distance ? parseFloat(route.total_distance) : null
    };
  } catch (error) {
    console.error('Route update failed:', error);
    throw error;
  }
};