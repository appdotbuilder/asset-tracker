import { db } from '../db';
import { locationPointsTable, securityOfficersTable, corporateVehiclesTable } from '../db/schema';
import { type LocationPoint } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function getCurrentLocations(): Promise<LocationPoint[]> {
  try {
    // Get the most recent location for each active security officer
    const securityOfficerLocations = await db
      .select({
        id: locationPointsTable.id,
        entity_type: locationPointsTable.entity_type,
        entity_id: locationPointsTable.entity_id,
        latitude: locationPointsTable.latitude,
        longitude: locationPointsTable.longitude,
        altitude: locationPointsTable.altitude,
        accuracy: locationPointsTable.accuracy,
        heading: locationPointsTable.heading,
        speed: locationPointsTable.speed,
        timestamp: locationPointsTable.timestamp,
        created_at: locationPointsTable.created_at,
      })
      .from(locationPointsTable)
      .innerJoin(
        securityOfficersTable,
        eq(locationPointsTable.entity_id, securityOfficersTable.id)
      )
      .where(
        and(
          eq(locationPointsTable.entity_type, 'security_officer'),
          eq(securityOfficersTable.status, 'on_duty')
        )
      )
      .orderBy(
        locationPointsTable.entity_id,
        desc(locationPointsTable.timestamp)
      );

    // Get the most recent location for each active corporate vehicle
    const vehicleLocations = await db
      .select({
        id: locationPointsTable.id,
        entity_type: locationPointsTable.entity_type,
        entity_id: locationPointsTable.entity_id,
        latitude: locationPointsTable.latitude,
        longitude: locationPointsTable.longitude,
        altitude: locationPointsTable.altitude,
        accuracy: locationPointsTable.accuracy,
        heading: locationPointsTable.heading,
        speed: locationPointsTable.speed,
        timestamp: locationPointsTable.timestamp,
        created_at: locationPointsTable.created_at,
      })
      .from(locationPointsTable)
      .innerJoin(
        corporateVehiclesTable,
        eq(locationPointsTable.entity_id, corporateVehiclesTable.id)
      )
      .where(
        and(
          eq(locationPointsTable.entity_type, 'corporate_vehicle'),
          eq(corporateVehiclesTable.status, 'active')
        )
      )
      .orderBy(
        locationPointsTable.entity_id,
        desc(locationPointsTable.timestamp)
      );

    // Combine all locations and get the latest for each entity
    const allLocations = [...securityOfficerLocations, ...vehicleLocations];
    
    // Group by entity_type and entity_id to get the most recent location for each entity
    const latestLocationMap = new Map<string, any>();
    
    allLocations.forEach(location => {
      const key = `${location.entity_type}-${location.entity_id}`;
      const existing = latestLocationMap.get(key);
      
      if (!existing || new Date(location.timestamp) > new Date(existing.timestamp)) {
        latestLocationMap.set(key, location);
      }
    });

    // Convert the results and handle numeric field conversions
    const currentLocations = Array.from(latestLocationMap.values()).map(location => ({
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      altitude: location.altitude ? parseFloat(location.altitude) : null,
      accuracy: location.accuracy ? parseFloat(location.accuracy) : null,
      heading: location.heading ? parseFloat(location.heading) : null,
      speed: location.speed ? parseFloat(location.speed) : null,
    }));

    return currentLocations;
  } catch (error) {
    console.error('Failed to fetch current locations:', error);
    throw error;
  }
}