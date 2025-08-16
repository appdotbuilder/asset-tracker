import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MapPin, Shield, Car, Clock, Navigation, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { 
  LocationPoint, 
  SecurityOfficer, 
  CorporateVehicle, 
  Driver, 
  VehicleDriverAssignment,
  GetLocationHistoryInput 
} from '../../../server/src/schema';

interface LiveMapProps {
  currentLocations: LocationPoint[];
  securityOfficers: SecurityOfficer[];
  corporateVehicles: CorporateVehicle[];
  drivers: Driver[];
  vehicleAssignments: VehicleDriverAssignment[];
}

export function LiveMapComponent({
  currentLocations,
  securityOfficers,
  corporateVehicles,
  drivers,
  vehicleAssignments
}: LiveMapProps) {
  const [selectedEntity, setSelectedEntity] = useState<LocationPoint | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'security_officer' | 'corporate_vehicle'>('all');
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filter locations based on selected type
  const filteredLocations = currentLocations.filter((location: LocationPoint) => 
    filterType === 'all' || location.entity_type === filterType
  );

  // Load location history for selected entity
  const loadLocationHistory = useCallback(async (entityType: 'security_officer' | 'corporate_vehicle', entityId: number) => {
    setIsLoadingHistory(true);
    try {
      const input: GetLocationHistoryInput = {
        entity_type: entityType,
        entity_id: entityId,
        limit: 50
      };
      const history = await trpc.getLocationHistory.query(input);
      setLocationHistory(history);
    } catch (error) {
      console.error('Failed to load location history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Get entity details
  const getEntityDetails = (location: LocationPoint) => {
    if (location.entity_type === 'security_officer') {
      const officer = securityOfficers.find((o: SecurityOfficer) => o.id === location.entity_id);
      return {
        name: officer?.name || `Officer ${location.entity_id}`,
        details: officer?.badge_number ? `Badge: ${officer.badge_number}` : '',
        status: officer?.status || 'unknown',
        icon: Shield,
        color: 'blue'
      };
    } else {
      const vehicle = corporateVehicles.find((v: CorporateVehicle) => v.id === location.entity_id);
      const assignment = vehicleAssignments.find(
        (a: VehicleDriverAssignment) => a.vehicle_id === location.entity_id && a.status === 'active'
      );
      const driver = assignment ? drivers.find((d: Driver) => d.id === assignment.driver_id) : null;
      
      return {
        name: vehicle?.license_plate || `Vehicle ${location.entity_id}`,
        details: vehicle ? `${vehicle.make} ${vehicle.model} • ${driver?.name || 'Unassigned'}` : '',
        status: vehicle?.status || 'unknown',
        icon: Car,
        color: 'green'
      };
    }
  };

  // Get status badge color
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                Live Tracking Map
              </CardTitle>
              <CardDescription>
                Real-time locations of security officers and corporate vehicles
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={(value: 'all' | 'security_officer' | 'corporate_vehicle') => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="security_officer">Security Officers Only</SelectItem>
                  <SelectItem value="corporate_vehicle">Vehicles Only</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {filteredLocations.length} active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Map Placeholder - In a real implementation, this would be an actual map component */}
          <div className="relative bg-gray-100 rounded-lg h-96 border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-gray-500 font-medium">Interactive Map View</p>
              <p className="text-sm text-gray-400">
                Map integration with Google Maps, Leaflet, or similar service would be implemented here
              </p>
              <p className="text-xs text-gray-400">
                Displaying {filteredLocations.length} location points
              </p>
            </div>
            
            {/* Simulated map markers */}
            <div className="absolute inset-4 overflow-hidden">
              {filteredLocations.slice(0, 8).map((location: LocationPoint, index: number) => {
                const entityDetails = getEntityDetails(location);
                const IconComponent = entityDetails.icon;
                
                return (
                  <button
                    key={location.id}
                    onClick={() => setSelectedEntity(location)}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-all hover:scale-110 ${
                      entityDetails.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                    style={{
                      left: `${20 + (index % 4) * 20}%`,
                      top: `${30 + Math.floor(index / 4) * 30}%`
                    }}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-purple-600" />
            Active Locations ({filteredLocations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active locations found</p>
              <p className="text-sm text-gray-400">
                {filterType === 'all' 
                  ? 'No entities are currently transmitting location data'
                  : `No ${filterType.replace('_', ' ')}s are currently active`
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((location: LocationPoint) => {
                const entityDetails = getEntityDetails(location);
                const IconComponent = entityDetails.icon;
                
                return (
                  <Card key={location.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 text-${entityDetails.color}-600`} />
                          <div>
                            <p className="font-medium text-sm">{entityDetails.name}</p>
                            {entityDetails.details && (
                              <p className="text-xs text-gray-500">{entityDetails.details}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(entityDetails.status)} className="text-xs">
                          {entityDetails.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Latitude:</span>
                          <span className="font-mono">{location.latitude.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Longitude:</span>
                          <span className="font-mono">{location.longitude.toFixed(6)}</span>
                        </div>
                        {location.speed && (
                          <div className="flex justify-between">
                            <span>Speed:</span>
                            <span>{location.speed} km/h</span>
                          </div>
                        )}
                        {location.heading && (
                          <div className="flex justify-between">
                            <span>Heading:</span>
                            <span>{location.heading}°</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Last Update:</span>
                          <span>{location.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => loadLocationHistory(location.entity_type, location.entity_id)}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              View History
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                              <SheetTitle className="flex items-center gap-2">
                                <IconComponent className={`h-5 w-5 text-${entityDetails.color}-600`} />
                                {entityDetails.name} - Location History
                              </SheetTitle>
                              <SheetDescription>
                                Recent location updates and movement history
                              </SheetDescription>
                            </SheetHeader>
                            
                            <div className="mt-6 space-y-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium">Current Status</p>
                                  <Badge variant={getStatusColor(entityDetails.status)} className="text-xs mt-1">
                                    {entityDetails.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">History Records</p>
                                  <p className="text-sm text-gray-600">{locationHistory.length} points</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {isLoadingHistory ? (
                                  <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                                    <span className="ml-2 text-gray-500">Loading history...</span>
                                  </div>
                                ) : locationHistory.length === 0 ? (
                                  <div className="text-center py-8">
                                    <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">No location history available</p>
                                  </div>
                                ) : (
                                  locationHistory.map((historyPoint: LocationPoint, index: number) => (
                                    <div key={historyPoint.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                          <span className="text-sm font-medium">
                                            Point {locationHistory.length - index}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <p>
                                            {historyPoint.latitude.toFixed(6)}, {historyPoint.longitude.toFixed(6)}
                                          </p>
                                          {historyPoint.speed && (
                                            <p>Speed: {historyPoint.speed} km/h</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right text-xs text-gray-500">
                                        <p>{historyPoint.timestamp.toLocaleDateString()}</p>
                                        <p>{historyPoint.timestamp.toLocaleTimeString()}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
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