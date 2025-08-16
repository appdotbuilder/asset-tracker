import { db } from '../db';
import { 
  securityOfficersTable, 
  corporateVehiclesTable, 
  routesTable, 
  locationPointsTable,
  vehicleDriverAssignmentsTable
} from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, and, desc, isNull, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getDashboardData(): Promise<DashboardData> {
  try {
    // Get count of active security officers
    const activeOfficersResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(securityOfficersTable)
      .where(eq(securityOfficersTable.status, 'active'))
      .execute();
    
    // Get count of officers currently on duty
    const onDutyOfficersResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(securityOfficersTable)
      .where(eq(securityOfficersTable.status, 'on_duty'))
      .execute();

    // Get count of active vehicles
    const activeVehiclesResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(corporateVehiclesTable)
      .where(eq(corporateVehiclesTable.status, 'active'))
      .execute();

    // Get count of vehicles currently in use (have active driver assignments)
    const vehiclesInUseResult = await db
      .select({ count: sql<number>`cast(count(distinct ${vehicleDriverAssignmentsTable.vehicle_id}) as int)` })
      .from(vehicleDriverAssignmentsTable)
      .innerJoin(
        corporateVehiclesTable,
        eq(vehicleDriverAssignmentsTable.vehicle_id, corporateVehiclesTable.id)
      )
      .where(
        and(
          eq(vehicleDriverAssignmentsTable.status, 'active'),
          isNull(vehicleDriverAssignmentsTable.unassigned_at),
          eq(corporateVehiclesTable.status, 'active')
        )
      )
      .execute();

    // Get count of active routes
    const activeRoutesResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(routesTable)
      .where(eq(routesTable.status, 'active'))
      .execute();

    // Get recent location updates (last 10, within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentLocationUpdatesResult = await db
      .select()
      .from(locationPointsTable)
      .where(gte(locationPointsTable.timestamp, oneDayAgo))
      .orderBy(desc(locationPointsTable.timestamp))
      .limit(10)
      .execute();

    // Convert numeric fields back to numbers for location points
    const recentLocationUpdates = recentLocationUpdatesResult.map(point => ({
      ...point,
      latitude: parseFloat(point.latitude),
      longitude: parseFloat(point.longitude),
      altitude: point.altitude ? parseFloat(point.altitude) : null,
      accuracy: point.accuracy ? parseFloat(point.accuracy) : null,
      heading: point.heading ? parseFloat(point.heading) : null,
      speed: point.speed ? parseFloat(point.speed) : null
    }));

    return {
      active_security_officers: activeOfficersResult[0]?.count || 0,
      active_vehicles: activeVehiclesResult[0]?.count || 0,
      total_active_routes: activeRoutesResult[0]?.count || 0,
      officers_on_duty: onDutyOfficersResult[0]?.count || 0,
      vehicles_in_use: vehiclesInUseResult[0]?.count || 0,
      recent_location_updates: recentLocationUpdates || []
    };
  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}