import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Car, User, Plus, UserCheck, UserX, Settings } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { 
  SecurityOfficer, 
  CorporateVehicle, 
  Driver, 
  VehicleDriverAssignment,
  CreateSecurityOfficerInput,
  CreateCorporateVehicleInput,
  CreateDriverInput,
  AssignDriverToVehicleInput
} from '../../../server/src/schema';

interface EntityManagementProps {
  securityOfficers: SecurityOfficer[];
  corporateVehicles: CorporateVehicle[];
  drivers: Driver[];
  vehicleAssignments: VehicleDriverAssignment[];
  onDataUpdate: () => Promise<void>;
}

export function EntityManagement({
  securityOfficers,
  corporateVehicles,
  drivers,
  vehicleAssignments,
  onDataUpdate
}: EntityManagementProps) {
  // Form states
  const [officerForm, setOfficerForm] = useState<CreateSecurityOfficerInput>({
    name: '',
    badge_number: '',
    phone: null,
    email: null,
    status: 'active'
  });

  const [vehicleForm, setVehicleForm] = useState<CreateCorporateVehicleInput>({
    license_plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: 'sedan',
    status: 'active'
  });

  const [driverForm, setDriverForm] = useState<CreateDriverInput>({
    name: '',
    license_number: '',
    phone: null,
    email: null,
    status: 'active'
  });

  // UI states
  const [isCreatingOfficer, setIsCreatingOfficer] = useState(false);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [openDialogs, setOpenDialogs] = useState({
    officer: false,
    vehicle: false,
    driver: false
  });

  // Create security officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingOfficer(true);
    try {
      await trpc.createSecurityOfficer.mutate(officerForm);
      setOfficerForm({
        name: '',
        badge_number: '',
        phone: null,
        email: null,
        status: 'active'
      });
      setOpenDialogs(prev => ({ ...prev, officer: false }));
      await onDataUpdate();
    } catch (error) {
      console.error('Failed to create security officer:', error);
    } finally {
      setIsCreatingOfficer(false);
    }
  };

  // Create corporate vehicle
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingVehicle(true);
    try {
      await trpc.createCorporateVehicle.mutate(vehicleForm);
      setVehicleForm({
        license_plate: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vehicle_type: 'sedan',
        status: 'active'
      });
      setOpenDialogs(prev => ({ ...prev, vehicle: false }));
      await onDataUpdate();
    } catch (error) {
      console.error('Failed to create corporate vehicle:', error);
    } finally {
      setIsCreatingVehicle(false);
    }
  };

  // Create driver
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingDriver(true);
    try {
      await trpc.createDriver.mutate(driverForm);
      setDriverForm({
        name: '',
        license_number: '',
        phone: null,
        email: null,
        status: 'active'
      });
      setOpenDialogs(prev => ({ ...prev, driver: false }));
      await onDataUpdate();
    } catch (error) {
      console.error('Failed to create driver:', error);
    } finally {
      setIsCreatingDriver(false);
    }
  };

  // Assign driver to vehicle
  const handleAssignDriver = async (vehicleId: number, driverId: number) => {
    setIsAssigningDriver(true);
    try {
      const input: AssignDriverToVehicleInput = {
        vehicle_id: vehicleId,
        driver_id: driverId
      };
      await trpc.assignDriverToVehicle.mutate(input);
      await onDataUpdate();
    } catch (error) {
      console.error('Failed to assign driver to vehicle:', error);
    } finally {
      setIsAssigningDriver(false);
    }
  };

  // Unassign driver from vehicle
  const handleUnassignDriver = async (vehicleId: number) => {
    setIsAssigningDriver(true);
    try {
      await trpc.unassignDriverFromVehicle.mutate({ vehicleId });
      await onDataUpdate();
    } catch (error) {
      console.error('Failed to unassign driver from vehicle:', error);
    } finally {
      setIsAssigningDriver(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Entity Management</h2>
          <p className="text-gray-600">Manage security officers, vehicles, and drivers</p>
        </div>
      </div>

      <Tabs defaultValue="officers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="officers" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Officers ({securityOfficers.length})
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicles ({corporateVehicles.length})
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Drivers ({drivers.length})
          </TabsTrigger>
        </TabsList>

        {/* Security Officers Tab */}
        <TabsContent value="officers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Security Officers
                  </CardTitle>
                  <CardDescription>
                    Manage security personnel and their status
                  </CardDescription>
                </div>
                <Dialog open={openDialogs.officer} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, officer: open }))}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Officer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Security Officer</DialogTitle>
                      <DialogDescription>
                        Create a new security officer profile
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOfficer} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={officerForm.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setOfficerForm(prev => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="badge">Badge Number</Label>
                          <Input
                            id="badge"
                            value={officerForm.badge_number}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setOfficerForm(prev => ({ ...prev, badge_number: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={officerForm.phone || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setOfficerForm(prev => ({ ...prev, phone: e.target.value || null }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={officerForm.email || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setOfficerForm(prev => ({ ...prev, email: e.target.value || null }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={officerForm.status}
                          onValueChange={(value: 'active' | 'inactive' | 'on_duty' | 'off_duty') =>
                            setOfficerForm(prev => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_duty">On Duty</SelectItem>
                            <SelectItem value="off_duty">Off Duty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingOfficer}>
                        {isCreatingOfficer ? 'Creating...' : 'Create Officer'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {securityOfficers.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No Security Officers</p>
                  <p className="text-sm text-gray-400">Add your first security officer to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {securityOfficers.map((officer: SecurityOfficer) => (
                    <Card key={officer.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{officer.name}</h3>
                            <p className="text-sm text-gray-600">Badge: {officer.badge_number}</p>
                          </div>
                          <Badge variant={getStatusColor(officer.status)}>
                            {officer.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          {officer.phone && (
                            <p>📞 {officer.phone}</p>
                          )}
                          {officer.email && (
                            <p>✉️ {officer.email}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Added: {officer.created_at.toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-green-600" />
                    Corporate Vehicles
                  </CardTitle>
                  <CardDescription>
                    Manage fleet vehicles and driver assignments
                  </CardDescription>
                </div>
                <Dialog open={openDialogs.vehicle} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, vehicle: open }))}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Corporate Vehicle</DialogTitle>
                      <DialogDescription>
                        Register a new vehicle in the fleet
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateVehicle} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="license_plate">License Plate</Label>
                        <Input
                          id="license_plate"
                          value={vehicleForm.license_plate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setVehicleForm(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))
                          }
                          placeholder="ABC-1234"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="make">Make</Label>
                          <Input
                            id="make"
                            value={vehicleForm.make}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setVehicleForm(prev => ({ ...prev, make: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model">Model</Label>
                          <Input
                            id="model"
                            value={vehicleForm.model}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setVehicleForm(prev => ({ ...prev, model: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">Year</Label>
                          <Input
                            id="year"
                            type="number"
                            value={vehicleForm.year}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setVehicleForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))
                            }
                            min="1990"
                            max="2030"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vehicle_type">Vehicle Type</Label>
                          <Select
                            value={vehicleForm.vehicle_type}
                            onValueChange={(value: 'sedan' | 'suv' | 'truck' | 'van' | 'motorcycle') =>
                              setVehicleForm(prev => ({ ...prev, vehicle_type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sedan">Sedan</SelectItem>
                              <SelectItem value="suv">SUV</SelectItem>
                              <SelectItem value="truck">Truck</SelectItem>
                              <SelectItem value="van">Van</SelectItem>
                              <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicle_status">Status</Label>
                          <Select
                            value={vehicleForm.status}
                            onValueChange={(value: 'active' | 'inactive' | 'maintenance' | 'out_of_service') =>
                              setVehicleForm(prev => ({ ...prev, status: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="out_of_service">Out of Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingVehicle}>
                        {isCreatingVehicle ? 'Creating...' : 'Create Vehicle'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {corporateVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No Vehicles</p>
                  <p className="text-sm text-gray-400">Add your first vehicle to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {corporateVehicles.map((vehicle: CorporateVehicle) => {
                    const assignment = vehicleAssignments.find(
                      (a: VehicleDriverAssignment) => a.vehicle_id === vehicle.id && a.status === 'active'
                    );
                    const assignedDriver = assignment ? drivers.find((d: Driver) => d.id === assignment.driver_id) : null;
                    const availableDrivers = drivers.filter((d: Driver) => 
                      d.status === 'active' && !vehicleAssignments.some(
                        (a: VehicleDriverAssignment) => a.driver_id === d.id && a.status === 'active'
                      )
                    );

                    return (
                      <Card key={vehicle.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{vehicle.license_plate}</h3>
                              <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                              <p className="text-xs text-gray-500 capitalize">{vehicle.vehicle_type}</p>
                            </div>
                            <Badge variant={getStatusColor(vehicle.status)}>
                              {vehicle.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <Separator className="my-3" />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Assigned Driver:</span>
                              {assignedDriver ? (
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{assignedDriver.name}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <UserX className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-500">Unassigned</span>
                                </div>
                              )}
                            </div>

                            {assignedDriver ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleUnassignDriver(vehicle.id)}
                                disabled={isAssigningDriver}
                              >
                                <UserX className="h-3 w-3 mr-1" />
                                Unassign Driver
                              </Button>
                            ) : availableDrivers.length > 0 ? (
                              <Select onValueChange={(driverId) => handleAssignDriver(vehicle.id, parseInt(driverId))}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Assign Driver" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDrivers.map((driver: Driver) => (
                                    <SelectItem key={driver.id} value={driver.id.toString()}>
                                      {driver.name} - {driver.license_number}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-2">
                                No available drivers
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                            Added: {vehicle.created_at.toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    Drivers
                  </CardTitle>
                  <CardDescription>
                    Manage licensed drivers for vehicle assignments
                  </CardDescription>
                </div>
                <Dialog open={openDialogs.driver} onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, driver: open }))}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Driver
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Driver</DialogTitle>
                      <DialogDescription>
                        Register a new licensed driver
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateDriver} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="driver_name">Full Name</Label>
                          <Input
                            id="driver_name"
                            value={driverForm.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setDriverForm(prev => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="license_number">License Number</Label>
                          <Input
                            id="license_number"
                            value={driverForm.license_number}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setDriverForm(prev => ({ ...prev, license_number: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="driver_phone">Phone Number</Label>
                          <Input
                            id="driver_phone"
                            type="tel"
                            value={driverForm.phone || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setDriverForm(prev => ({ ...prev, phone: e.target.value || null }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="driver_email">Email Address</Label>
                          <Input
                            id="driver_email"
                            type="email"
                            value={driverForm.email || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setDriverForm(prev => ({ ...prev, email: e.target.value || null }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="driver_status">Status</Label>
                        <Select
                          value={driverForm.status}
                          onValueChange={(value: 'active' | 'inactive') =>
                            setDriverForm(prev => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingDriver}>
                        {isCreatingDriver ? 'Creating...' : 'Create Driver'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No Drivers</p>
                  <p className="text-sm text-gray-400">Add your first driver to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drivers.map((driver: Driver) => {
                    const assignment = vehicleAssignments.find(
                      (a: VehicleDriverAssignment) => a.driver_id === driver.id && a.status === 'active'
                    );
                    const assignedVehicle = assignment ? corporateVehicles.find((v: CorporateVehicle) => v.id === assignment.vehicle_id) : null;

                    return (
                      <Card key={driver.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{driver.name}</h3>
                              <p className="text-sm text-gray-600">License: {driver.license_number}</p>
                            </div>
                            <Badge variant={getStatusColor(driver.status)}>
                              {driver.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            {driver.phone && (
                              <p>📞 {driver.phone}</p>
                            )}
                            {driver.email && (
                              <p>✉️ {driver.email}</p>
                            )}
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Vehicle:</span>
                              {assignedVehicle ? (
                                <div className="flex items-center gap-1">
                                  <Car className="h-3 w-3 text-green-600" />
                                  <span className="text-xs">{assignedVehicle.license_plate}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Available</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              Added: {driver.created_at.toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}