import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createSecurityOfficerInputSchema,
  createCorporateVehicleInputSchema,
  createDriverInputSchema,
  createLocationPointInputSchema,
  createRouteInputSchema,
  updateRouteInputSchema,
  assignDriverToVehicleInputSchema,
  getLocationHistoryInputSchema,
  getRouteHistoryInputSchema
} from './schema';
import { z } from 'zod';

// Import handlers
import { createSecurityOfficer } from './handlers/create_security_officer';
import { getSecurityOfficers } from './handlers/get_security_officers';
import { createCorporateVehicle } from './handlers/create_corporate_vehicle';
import { getCorporateVehicles } from './handlers/get_corporate_vehicles';
import { createDriver } from './handlers/create_driver';
import { getDrivers } from './handlers/get_drivers';
import { recordLocationPoint } from './handlers/record_location_point';
import { getCurrentLocations } from './handlers/get_current_locations';
import { getLocationHistory } from './handlers/get_location_history';
import { createRoute } from './handlers/create_route';
import { updateRoute } from './handlers/update_route';
import { getRouteHistory } from './handlers/get_route_history';
import { assignDriverToVehicle } from './handlers/assign_driver_to_vehicle';
import { unassignDriverFromVehicle } from './handlers/unassign_driver_from_vehicle';
import { getVehicleDriverAssignments } from './handlers/get_vehicle_driver_assignments';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Security Officer routes
  createSecurityOfficer: publicProcedure
    .input(createSecurityOfficerInputSchema)
    .mutation(({ input }) => createSecurityOfficer(input)),
  
  getSecurityOfficers: publicProcedure
    .query(() => getSecurityOfficers()),

  // Corporate Vehicle routes
  createCorporateVehicle: publicProcedure
    .input(createCorporateVehicleInputSchema)
    .mutation(({ input }) => createCorporateVehicle(input)),
  
  getCorporateVehicles: publicProcedure
    .query(() => getCorporateVehicles()),

  // Driver routes
  createDriver: publicProcedure
    .input(createDriverInputSchema)
    .mutation(({ input }) => createDriver(input)),
  
  getDrivers: publicProcedure
    .query(() => getDrivers()),

  // Location tracking routes
  recordLocationPoint: publicProcedure
    .input(createLocationPointInputSchema)
    .mutation(({ input }) => recordLocationPoint(input)),
  
  getCurrentLocations: publicProcedure
    .query(() => getCurrentLocations()),
  
  getLocationHistory: publicProcedure
    .input(getLocationHistoryInputSchema)
    .query(({ input }) => getLocationHistory(input)),

  // Route management routes
  createRoute: publicProcedure
    .input(createRouteInputSchema)
    .mutation(({ input }) => createRoute(input)),
  
  updateRoute: publicProcedure
    .input(updateRouteInputSchema)
    .mutation(({ input }) => updateRoute(input)),
  
  getRouteHistory: publicProcedure
    .input(getRouteHistoryInputSchema)
    .query(({ input }) => getRouteHistory(input)),

  // Vehicle-Driver assignment routes
  assignDriverToVehicle: publicProcedure
    .input(assignDriverToVehicleInputSchema)
    .mutation(({ input }) => assignDriverToVehicle(input)),
  
  unassignDriverFromVehicle: publicProcedure
    .input(z.object({ vehicleId: z.number() }))
    .mutation(({ input }) => unassignDriverFromVehicle(input.vehicleId)),
  
  getVehicleDriverAssignments: publicProcedure
    .query(() => getVehicleDriverAssignments()),

  // Dashboard data route
  getDashboardData: publicProcedure
    .query(() => getDashboardData()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();