import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertCircle, Users, Car, Route, MapPin, Clock, Shield, Activity } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { 
  DashboardData, 
  SecurityOfficer, 
  CorporateVehicle, 
  Driver, 
  LocationPoint,
  Route as RouteType,
  VehicleDriverAssignment 
} from '../../server/src/schema';

// Import components
import { LiveMapComponent } from '@/components/LiveMapComponent';
import { EntityManagement } from '@/components/EntityManagement';
import { RouteHistory } from '@/components/RouteHistory';

function App() {
  // Dashboard state
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    active_security_officers: 0,
    active_vehicles: 0,
    total_active_routes: 0,
    officers_on_duty: 0,
    vehicles_in_use: 0,
    recent_location_updates: []
  });

  // Entity state
  const [securityOfficers, setSecurityOfficers] = useState<SecurityOfficer[]>([]);
  const [corporateVehicles, setCorporateVehicles] = useState<CorporateVehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentLocations, setCurrentLocations] = useState<LocationPoint[]>([]);
  const [vehicleAssignments, setVehicleAssignments] = useState<VehicleDriverAssignment[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await trpc.getDashboardData.query();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  // Load all entities
  const loadAllEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      const [officers, vehicles, driversData, locations, assignments] = await Promise.all([
        trpc.getSecurityOfficers.query(),
        trpc.getCorporateVehicles.query(),
        trpc.getDrivers.query(),
        trpc.getCurrentLocations.query(),
        trpc.getVehicleDriverAssignments.query()
      ]);
      
      setSecurityOfficers(officers);
      setCorporateVehicles(vehicles);
      setDrivers(driversData);
      setCurrentLocations(locations);
      setVehicleAssignments(assignments);
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
    loadAllEntities();
  }, [loadDashboardData, loadAllEntities]);

  // Set up real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
      if (activeTab === 'dashboard' || activeTab === 'live-map') {
        // Refresh current locations every 30 seconds
        trpc.getCurrentLocations.query().then(setCurrentLocations);
      }
    }, 30000); // 30 seconds

    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (interval) clearInterval(interval);
    };
  }, [activeTab, loadDashboardData]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([loadDashboardData(), loadAllEntities()]);
  }, [loadDashboardData, loadAllEntities]);

  // Get status color for badges
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
      case 'on_duty':
        return 'default';
      case 'inactive':
      case 'off_duty':
      case 'out_of_service':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold">FleetGuard Pro</h1>
              <p className="text-xs text-gray-500">Real-time Security & Fleet Tracking</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <Activity className="h-4 w-4 mr-2" />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Tracking Active
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="live-map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Live Map
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Management
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Routes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Officers</CardTitle>
                  <Shield className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.active_security_officers}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.officers_on_duty} on duty
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                  <Car className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.active_vehicles}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.vehicles_in_use} in use
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                  <Route className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.total_active_routes}</div>
                  <p className="text-xs text-muted-foreground">Currently tracking</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Location Updates</CardTitle>
                  <MapPin className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentLocations.length}</div>
                  <p className="text-xs text-muted-foreground">Recent positions</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Status Overview */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Security Officers Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {securityOfficers.length === 0 ? (
                    <p className="text-sm text-gray-500">No security officers registered</p>
                  ) : (
                    securityOfficers.slice(0, 5).map((officer: SecurityOfficer) => (
                      <div key={officer.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{officer.name}</p>
                          <p className="text-sm text-gray-500">Badge: {officer.badge_number}</p>
                        </div>
                        <Badge variant={getStatusColor(officer.status)}>
                          {officer.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))
                  )}
                  {securityOfficers.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{securityOfficers.length - 5} more officers
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-green-600" />
                    Vehicle Fleet Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {corporateVehicles.length === 0 ? (
                    <p className="text-sm text-gray-500">No vehicles registered</p>
                  ) : (
                    corporateVehicles.slice(0, 5).map((vehicle: CorporateVehicle) => {
                      const assignment = vehicleAssignments.find(
                        (a: VehicleDriverAssignment) => a.vehicle_id === vehicle.id && a.status === 'active'
                      );
                      const driver = assignment ? drivers.find((d: Driver) => d.id === assignment.driver_id) : null;
                      
                      return (
                        <div key={vehicle.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{vehicle.license_plate}</p>
                            <p className="text-sm text-gray-500">
                              {vehicle.make} {vehicle.model} • {driver ? driver.name : 'Unassigned'}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(vehicle.status)}>
                            {vehicle.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                  {corporateVehicles.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{corporateVehicles.length - 5} more vehicles
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Location Updates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Recent Location Updates
                </CardTitle>
                <CardDescription>
                  Latest GPS coordinates from active entities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentLocations.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent location updates available</p>
                ) : (
                  <div className="space-y-3">
                    {currentLocations.slice(0, 8).map((location: LocationPoint) => {
                      const entityName = location.entity_type === 'security_officer' 
                        ? securityOfficers.find((o: SecurityOfficer) => o.id === location.entity_id)?.name || `Officer ${location.entity_id}`
                        : corporateVehicles.find((v: CorporateVehicle) => v.id === location.entity_id)?.license_plate || `Vehicle ${location.entity_id}`;
                      
                      return (
                        <div key={location.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            {location.entity_type === 'security_officer' ? (
                              <Shield className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Car className="h-4 w-4 text-green-600" />
                            )}
                            <div>
                              <p className="font-medium">{entityName}</p>
                              <p className="text-gray-500">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500">
                              {location.timestamp.toLocaleTimeString()}
                            </p>
                            {location.speed && (
                              <p className="text-xs text-gray-400">
                                {location.speed} km/h
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live-map">
            <LiveMapComponent 
              currentLocations={currentLocations}
              securityOfficers={securityOfficers}
              corporateVehicles={corporateVehicles}
              drivers={drivers}
              vehicleAssignments={vehicleAssignments}
            />
          </TabsContent>

          <TabsContent value="management">
            <EntityManagement
              securityOfficers={securityOfficers}
              corporateVehicles={corporateVehicles}
              drivers={drivers}
              vehicleAssignments={vehicleAssignments}
              onDataUpdate={loadAllEntities}
            />
          </TabsContent>

          <TabsContent value="routes">
            <RouteHistory
              securityOfficers={securityOfficers}
              corporateVehicles={corporateVehicles}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;