import { z } from 'zod';

// Security Officer schema
export const securityOfficerSchema = z.object({
  id: z.number(),
  name: z.string(),
  badge_number: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'on_duty', 'off_duty']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SecurityOfficer = z.infer<typeof securityOfficerSchema>;

// Corporate Vehicle schema
export const corporateVehicleSchema = z.object({
  id: z.number(),
  license_plate: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  vehicle_type: z.enum(['sedan', 'suv', 'truck', 'van', 'motorcycle']),
  status: z.enum(['active', 'inactive', 'maintenance', 'out_of_service']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CorporateVehicle = z.infer<typeof corporateVehicleSchema>;

// Driver schema (for corporate vehicles)
export const driverSchema = z.object({
  id: z.number(),
  name: z.string(),
  license_number: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.enum(['active', 'inactive']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Driver = z.infer<typeof driverSchema>;

// Location Point schema (for real-time tracking)
export const locationPointSchema = z.object({
  id: z.number(),
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().nullable(),
  accuracy: z.number().nullable(),
  heading: z.number().nullable(), // Direction in degrees
  speed: z.number().nullable(), // Speed in km/h
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

// Route schema (for historical route tracking)
export const routeSchema = z.object({
  id: z.number(),
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number(),
  route_name: z.string().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  total_distance: z.number().nullable(), // Distance in kilometers
  total_duration: z.number().nullable(), // Duration in minutes
  status: z.enum(['active', 'completed', 'interrupted']),
  created_at: z.coerce.date()
});

export type Route = z.infer<typeof routeSchema>;

// Vehicle-Driver Assignment schema
export const vehicleDriverAssignmentSchema = z.object({
  id: z.number(),
  vehicle_id: z.number(),
  driver_id: z.number(),
  assigned_at: z.coerce.date(),
  unassigned_at: z.coerce.date().nullable(),
  status: z.enum(['active', 'inactive'])
});

export type VehicleDriverAssignment = z.infer<typeof vehicleDriverAssignmentSchema>;

// Input schemas for creating entities
export const createSecurityOfficerInputSchema = z.object({
  name: z.string().min(1),
  badge_number: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(['active', 'inactive', 'on_duty', 'off_duty']).optional()
});

export type CreateSecurityOfficerInput = z.infer<typeof createSecurityOfficerInputSchema>;

export const createCorporateVehicleInputSchema = z.object({
  license_plate: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  vehicle_type: z.enum(['sedan', 'suv', 'truck', 'van', 'motorcycle']),
  status: z.enum(['active', 'inactive', 'maintenance', 'out_of_service']).optional()
});

export type CreateCorporateVehicleInput = z.infer<typeof createCorporateVehicleInputSchema>;

export const createDriverInputSchema = z.object({
  name: z.string().min(1),
  license_number: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export type CreateDriverInput = z.infer<typeof createDriverInputSchema>;

export const createLocationPointInputSchema = z.object({
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
  timestamp: z.coerce.date().optional()
});

export type CreateLocationPointInput = z.infer<typeof createLocationPointInputSchema>;

export const createRouteInputSchema = z.object({
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number(),
  route_name: z.string().nullable().optional(),
  start_time: z.coerce.date().optional()
});

export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;

export const assignDriverToVehicleInputSchema = z.object({
  vehicle_id: z.number(),
  driver_id: z.number()
});

export type AssignDriverToVehicleInput = z.infer<typeof assignDriverToVehicleInputSchema>;

// Query input schemas
export const getLocationHistoryInputSchema = z.object({
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(1000).optional()
});

export type GetLocationHistoryInput = z.infer<typeof getLocationHistoryInputSchema>;

export const getRouteHistoryInputSchema = z.object({
  entity_type: z.enum(['security_officer', 'corporate_vehicle']),
  entity_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: z.enum(['active', 'completed', 'interrupted']).optional()
});

export type GetRouteHistoryInput = z.infer<typeof getRouteHistoryInputSchema>;

export const updateRouteInputSchema = z.object({
  id: z.number(),
  route_name: z.string().nullable().optional(),
  end_time: z.coerce.date().nullable().optional(),
  total_distance: z.number().nullable().optional(),
  total_duration: z.number().nullable().optional(),
  status: z.enum(['active', 'completed', 'interrupted']).optional()
});

export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  active_security_officers: z.number(),
  active_vehicles: z.number(),
  total_active_routes: z.number(),
  officers_on_duty: z.number(),
  vehicles_in_use: z.number(),
  recent_location_updates: z.array(locationPointSchema).optional()
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;