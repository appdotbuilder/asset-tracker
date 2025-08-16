import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Route, Shield, Car, Clock, MapPin, Calendar as CalendarIcon, Plus, Search, Filter, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
// Date formatting utility
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

import type { 
  SecurityOfficer, 
  CorporateVehicle, 
  Route as RouteType,
  LocationPoint,
  CreateRouteInput,
  GetRouteHistoryInput,
  GetLocationHistoryInput,
  UpdateRouteInput
} from '../../../server/src/schema';

interface RouteHistoryProps {
  securityOfficers: SecurityOfficer[];
  corporateVehicles: CorporateVehicle[];
}

export function RouteHistory({
  securityOfficers,
  corporateVehicles
}: RouteHistoryProps) {
  // State
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const [routeLocations, setRouteLocations] = useState<LocationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    entityType: 'all' as 'all' | 'security_officer' | 'corporate_vehicle',
    entityId: undefined as number | undefined,
    status: 'all' as 'all' | 'active' | 'completed' | 'interrupted',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined
  });

  // Form state for creating routes
  const [routeForm, setRouteForm] = useState<CreateRouteInput>({
    entity_type: 'security_officer',
    entity_id: 0,
    route_name: null,
    start_time: new Date()
  });

  // Load routes with filters
  const loadRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      // Handle the case where we need to fetch all routes vs filtered routes
      if (filters.entityType === 'all' && !filters.entityId && filters.status === 'all' && !filters.startDate && !filters.endDate) {
        // If no filters are applied, fetch for both entity types
        const securityOfficerQuery: GetRouteHistoryInput = { entity_type: 'security_officer' };
        const vehicleQuery: GetRouteHistoryInput = { entity_type: 'corporate_vehicle' };
        
        if (filters.startDate) {
          securityOfficerQuery.start_date = filters.startDate;
          vehicleQuery.start_date = filters.startDate;
        }
        if (filters.endDate) {
          securityOfficerQuery.end_date = filters.endDate;
          vehicleQuery.end_date = filters.endDate;
        }
        
        const [securityOfficerRoutes, vehicleRoutes] = await Promise.all([
          trpc.getRouteHistory.query(securityOfficerQuery),
          trpc.getRouteHistory.query(vehicleQuery)
        ]);
        setRoutes([...securityOfficerRoutes, ...vehicleRoutes]);
      } else {
        // Apply specific filters
        const input: GetRouteHistoryInput = {
          entity_type: filters.entityType === 'all' ? 'security_officer' : filters.entityType
        };
        
        if (filters.entityId) {
          input.entity_id = filters.entityId;
        }
        
        if (filters.status !== 'all') {
          input.status = filters.status;
        }
        
        if (filters.startDate) {
          input.start_date = filters.startDate;
        }
        
        if (filters.endDate) {
          input.end_date = filters.endDate;
        }
        
        if (filters.entityType === 'all') {
          // Get both types when "all" is selected
          const securityOfficerInput: GetRouteHistoryInput = { ...input, entity_type: 'security_officer' };
          const vehicleInput: GetRouteHistoryInput = { ...input, entity_type: 'corporate_vehicle' };
          
          const [securityOfficerRoutes, vehicleRoutes] = await Promise.all([
            trpc.getRouteHistory.query(securityOfficerInput),
            trpc.getRouteHistory.query(vehicleInput)
          ]);
          setRoutes([...securityOfficerRoutes, ...vehicleRoutes]);
        } else {
          const result = await trpc.getRouteHistory.query(input);
          setRoutes(result);
        }
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load route locations
  const loadRouteLocations = useCallback(async (route: RouteType) => {
    setIsLoadingLocations(true);
    try {
      const input: GetLocationHistoryInput = {
        entity_type: route.entity_type,
        entity_id: route.entity_id,
        start_date: route.start_time,
        end_date: route.end_time || new Date(),
        limit: 1000
      };
      const locations = await trpc.getLocationHistory.query(input);
      setRouteLocations(locations);
    } catch (error) {
      console.error('Failed to load route locations:', error);
      setRouteLocations([]);
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Create new route
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingRoute(true);
    try {
      await trpc.createRoute.mutate(routeForm);
      setRouteForm({
        entity_type: 'security_officer',
        entity_id: 0,
        route_name: null,
        start_time: new Date()
      });
      setOpenCreateDialog(false);
      await loadRoutes();
    } catch (error) {
      console.error('Failed to create route:', error);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  // Complete a route
  const handleCompleteRoute = async (route: RouteType) => {
    try {
      const input: UpdateRouteInput = {
        id: route.id,
        status: 'completed',
        end_time: new Date()
      };
      await trpc.updateRoute.mutate(input);
      await loadRoutes();
    } catch (error) {
      console.error('Failed to complete route:', error);
    }
  };

  // Get entity name
  const getEntityName = (entityType: 'security_officer' | 'corporate_vehicle', entityId: number): string => {
    if (entityType === 'security_officer') {
      const officer = securityOfficers.find((o: SecurityOfficer) => o.id === entityId);
      return officer?.name || `Officer ${entityId}`;
    } else {
      const vehicle = corporateVehicles.find((v: CorporateVehicle) => v.id === entityId);
      return vehicle?.license_plate || `Vehicle ${entityId}`;
    }
  };

  // Get available entities for route creation
  const getAvailableEntities = () => {
    if (routeForm.entity_type === 'security_officer') {
      return securityOfficers.filter((o: SecurityOfficer) => o.status === 'active' || o.status === 'on_duty');
    } else {
      return corporateVehicles.filter((v: CorporateVehicle) => v.status === 'active');
    }
  };

  // Get status color
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'interrupted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Calculate route statistics
  const routeStats = {
    total: routes.length,
    active: routes.filter((r: RouteType) => r.status === 'active').length,
    completed: routes.filter((r: RouteType) => r.status === 'completed').length,
    interrupted: routes.filter((r: RouteType) => r.status === 'interrupted').length,
    totalDistance: routes.reduce((sum: number, r: RouteType) => sum + (r.total_distance || 0), 0),
    totalDuration: routes.reduce((sum: number, r: RouteType) => sum + (r.total_duration || 0), 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Route History</h2>
          <p className="text-gray-600">Track and analyze movement patterns</p>
        </div>
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Start New Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Route</DialogTitle>
              <DialogDescription>
                Begin tracking a new route for an entity
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={routeForm.entity_type}
                  onValueChange={(value: 'security_officer' | 'corporate_vehicle') =>
                    setRouteForm(prev => ({ ...prev, entity_type: value, entity_id: 0 }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security_officer">Security Officer</SelectItem>
                    <SelectItem value="corporate_vehicle">Corporate Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Entity</Label>
                <Select
                  value={routeForm.entity_id.toString()}
                  onValueChange={(value) =>
                    setRouteForm(prev => ({ ...prev, entity_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableEntities().map((entity: any) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {routeForm.entity_type === 'security_officer' 
                          ? `${entity.name} (${entity.badge_number})`
                          : `${entity.license_plate} (${entity.make} ${entity.model})`
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Route Name (Optional)</Label>
                <Input
                  value={routeForm.route_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRouteForm(prev => ({ ...prev, route_name: e.target.value || null }))
                  }
                  placeholder="e.g., Morning Patrol, Site Inspection"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreatingRoute || routeForm.entity_id === 0}>
                {isCreatingRoute ? 'Starting...' : 'Start Route'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Route Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
            <Route className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routeStats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routeStats.active}</div>
            <p className="text-xs text-muted-foreground">Currently tracking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routeStats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished routes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <MapPin className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routeStats.totalDistance.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Kilometers tracked</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(routeStats.totalDuration / 60)}</div>
            <p className="text-xs text-muted-foreground">Hours tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value: 'all' | 'security_officer' | 'corporate_vehicle') =>
                  setFilters(prev => ({ ...prev, entityType: value, entityId: undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="security_officer">Security Officers</SelectItem>
                  <SelectItem value="corporate_vehicle">Vehicles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filters.entityType !== 'all' && (
              <div className="space-y-2">
                <Label>Specific Entity</Label>
                <Select
                  value={filters.entityId?.toString() || ''}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, entityId: value ? parseInt(value) : undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All entities</SelectItem>
                    {filters.entityType === 'security_officer' 
                      ? securityOfficers.map((officer: SecurityOfficer) => (
                          <SelectItem key={officer.id} value={officer.id.toString()}>
                            {officer.name} ({officer.badge_number})
                          </SelectItem>
                        ))
                      : corporateVehicles.map((vehicle: CorporateVehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.license_plate} ({vehicle.make} {vehicle.model})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: 'all' | 'active' | 'completed' | 'interrupted') =>
                  setFilters(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="interrupted">Interrupted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !filters.startDate ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? formatDate(filters.startDate) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !filters.endDate ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? formatDate(filters.endDate) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadRoutes} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Apply Filters'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({
                  entityType: 'all',
                  entityId: undefined,
                  status: 'all',
                  startDate: undefined,
                  endDate: undefined
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Routes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-purple-600" />
            Routes ({routes.length})
          </CardTitle>
          <CardDescription>
            Historical and active route data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <div className="text-center py-12">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No Routes Found</p>
              <p className="text-sm text-gray-400">
                {isLoading ? 'Loading routes...' : 'No routes match your current filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {routes.map((route: RouteType) => {
                const entityName = getEntityName(route.entity_type, route.entity_id);
                const IconComponent = route.entity_type === 'security_officer' ? Shield : Car;
                
                return (
                  <Card key={route.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`h-5 w-5 ${route.entity_type === 'security_officer' ? 'text-blue-600' : 'text-green-600'}`} />
                          <div>
                            <h3 className="font-semibold">
                              {route.route_name || `${entityName} Route`}
                            </h3>
                            <p className="text-sm text-gray-600">{entityName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(route.status)}>
                            {route.status}
                          </Badge>
                          {route.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteRoute(route)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Start Time</p>
                          <p className="font-medium">{route.start_time.toLocaleString()}</p>
                        </div>
                        {route.end_time && (
                          <div>
                            <p className="text-gray-500">End Time</p>
                            <p className="font-medium">{route.end_time.toLocaleString()}</p>
                          </div>
                        )}
                        {route.total_distance && (
                          <div>
                            <p className="text-gray-500">Distance</p>
                            <p className="font-medium">{route.total_distance.toFixed(2)} km</p>
                          </div>
                        )}
                        {route.total_duration && (
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{Math.round(route.total_duration)} min</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedRoute(route);
                                loadRouteLocations(route);
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              View Route Details
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                              <SheetTitle className="flex items-center gap-2">
                                <IconComponent className={`h-5 w-5 ${route.entity_type === 'security_officer' ? 'text-blue-600' : 'text-green-600'}`} />
                                Route Details
                              </SheetTitle>
                              <SheetDescription>
                                {route.route_name || `${entityName} Route`}
                              </SheetDescription>
                            </SheetHeader>
                            
                            <div className="mt-6 space-y-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium">Status</p>
                                  <Badge variant={getStatusColor(route.status)} className="mt-1">
                                    {route.status}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Entity</p>
                                  <p className="text-sm text-gray-600">{entityName}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Start Time</p>
                                  <p className="text-sm text-gray-600">{route.start_time.toLocaleString()}</p>
                                </div>
                                {route.end_time && (
                                  <div>
                                    <p className="text-sm font-medium">End Time</p>
                                    <p className="text-sm text-gray-600">{route.end_time.toLocaleString()}</p>
                                  </div>
                                )}
                                {route.total_distance && (
                                  <div>
                                    <p className="text-sm font-medium">Total Distance</p>
                                    <p className="text-sm text-gray-600">{route.total_distance.toFixed(2)} km</p>
                                  </div>
                                )}
                                {route.total_duration && (
                                  <div>
                                    <p className="text-sm font-medium">Duration</p>
                                    <p className="text-sm text-gray-600">{Math.round(route.total_duration)} minutes</p>
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-3">Route Path ({routeLocations.length} points)</h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {isLoadingLocations ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Clock className="h-6 w-6 animate-spin text-gray-400" />
                                      <span className="ml-2 text-gray-500">Loading route data...</span>
                                    </div>
                                  ) : routeLocations.length === 0 ? (
                                    <div className="text-center py-8">
                                      <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                      <p className="text-gray-500">No location data available</p>
                                    </div>
                                  ) : (
                                    routeLocations.map((location: LocationPoint, index: number) => (
                                      <div key={location.id} className="flex items-center justify-between p-2 bg-white border rounded">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                                            <span className="text-sm font-medium">Point {index + 1}</span>
                                          </div>
                                          <p className="text-xs text-gray-600">
                                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                          </p>
                                          {location.speed && (
                                            <p className="text-xs text-gray-500">Speed: {location.speed} km/h</p>
                                          )}
                                        </div>
                                        <div className="text-right text-xs text-gray-500">
                                          <p>{location.timestamp.toLocaleTimeString()}</p>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}