import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const securityOfficerStatusEnum = pgEnum('security_officer_status', ['active', 'inactive', 'on_duty', 'off_duty']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['active', 'inactive', 'maintenance', 'out_of_service']);
export const vehicleTypeEnum = pgEnum('vehicle_type', ['sedan', 'suv', 'truck', 'van', 'motorcycle']);
export const driverStatusEnum = pgEnum('driver_status', ['active', 'inactive']);
export const entityTypeEnum = pgEnum('entity_type', ['security_officer', 'corporate_vehicle']);
export const routeStatusEnum = pgEnum('route_status', ['active', 'completed', 'interrupted']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['active', 'inactive']);

// Security Officers table
export const securityOfficersTable = pgTable('security_officers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  badge_number: text('badge_number').notNull().unique(),
  phone: text('phone'),
  email: text('email'),
  status: securityOfficerStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Corporate Vehicles table
export const corporateVehiclesTable = pgTable('corporate_vehicles', {
  id: serial('id').primaryKey(),
  license_plate: text('license_plate').notNull().unique(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  vehicle_type: vehicleTypeEnum('vehicle_type').notNull(),
  status: vehicleStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Drivers table
export const driversTable = pgTable('drivers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  license_number: text('license_number').notNull().unique(),
  phone: text('phone'),
  email: text('email'),
  status: driverStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Location Points table (for real-time and historical tracking)
export const locationPointsTable = pgTable('location_points', {
  id: serial('id').primaryKey(),
  entity_type: entityTypeEnum('entity_type').notNull(),
  entity_id: integer('entity_id').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  altitude: numeric('altitude', { precision: 8, scale: 2 }),
  accuracy: numeric('accuracy', { precision: 6, scale: 2 }),
  heading: numeric('heading', { precision: 5, scale: 2 }), // 0-360 degrees
  speed: numeric('speed', { precision: 6, scale: 2 }), // km/h
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Routes table (for historical route tracking)
export const routesTable = pgTable('routes', {
  id: serial('id').primaryKey(),
  entity_type: entityTypeEnum('entity_type').notNull(),
  entity_id: integer('entity_id').notNull(),
  route_name: text('route_name'),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'),
  total_distance: numeric('total_distance', { precision: 8, scale: 3 }), // kilometers
  total_duration: integer('total_duration'), // minutes
  status: routeStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Vehicle-Driver Assignments table
export const vehicleDriverAssignmentsTable = pgTable('vehicle_driver_assignments', {
  id: serial('id').primaryKey(),
  vehicle_id: integer('vehicle_id').notNull(),
  driver_id: integer('driver_id').notNull(),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  unassigned_at: timestamp('unassigned_at'),
  status: assignmentStatusEnum('status').notNull().default('active'),
});

// Relations
export const securityOfficersRelations = relations(securityOfficersTable, ({ many }) => ({
  locationPoints: many(locationPointsTable),
  routes: many(routesTable),
}));

export const corporateVehiclesRelations = relations(corporateVehiclesTable, ({ many }) => ({
  locationPoints: many(locationPointsTable),
  routes: many(routesTable),
  driverAssignments: many(vehicleDriverAssignmentsTable),
}));

export const driversRelations = relations(driversTable, ({ many }) => ({
  vehicleAssignments: many(vehicleDriverAssignmentsTable),
}));

export const locationPointsRelations = relations(locationPointsTable, ({ one }) => ({
  securityOfficer: one(securityOfficersTable, {
    fields: [locationPointsTable.entity_id],
    references: [securityOfficersTable.id],
  }),
  corporateVehicle: one(corporateVehiclesTable, {
    fields: [locationPointsTable.entity_id],
    references: [corporateVehiclesTable.id],
  }),
}));

export const routesRelations = relations(routesTable, ({ one, many }) => ({
  securityOfficer: one(securityOfficersTable, {
    fields: [routesTable.entity_id],
    references: [securityOfficersTable.id],
  }),
  corporateVehicle: one(corporateVehiclesTable, {
    fields: [routesTable.entity_id],
    references: [corporateVehiclesTable.id],
  }),
  locationPoints: many(locationPointsTable),
}));

export const vehicleDriverAssignmentsRelations = relations(vehicleDriverAssignmentsTable, ({ one }) => ({
  vehicle: one(corporateVehiclesTable, {
    fields: [vehicleDriverAssignmentsTable.vehicle_id],
    references: [corporateVehiclesTable.id],
  }),
  driver: one(driversTable, {
    fields: [vehicleDriverAssignmentsTable.driver_id],
    references: [driversTable.id],
  }),
}));

// TypeScript types for the table schemas
export type SecurityOfficer = typeof securityOfficersTable.$inferSelect;
export type NewSecurityOfficer = typeof securityOfficersTable.$inferInsert;

export type CorporateVehicle = typeof corporateVehiclesTable.$inferSelect;
export type NewCorporateVehicle = typeof corporateVehiclesTable.$inferInsert;

export type Driver = typeof driversTable.$inferSelect;
export type NewDriver = typeof driversTable.$inferInsert;

export type LocationPoint = typeof locationPointsTable.$inferSelect;
export type NewLocationPoint = typeof locationPointsTable.$inferInsert;

export type Route = typeof routesTable.$inferSelect;
export type NewRoute = typeof routesTable.$inferInsert;

export type VehicleDriverAssignment = typeof vehicleDriverAssignmentsTable.$inferSelect;
export type NewVehicleDriverAssignment = typeof vehicleDriverAssignmentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  securityOfficers: securityOfficersTable,
  corporateVehicles: corporateVehiclesTable,
  drivers: driversTable,
  locationPoints: locationPointsTable,
  routes: routesTable,
  vehicleDriverAssignments: vehicleDriverAssignmentsTable,
};