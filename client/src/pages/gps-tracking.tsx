import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  User, 
  RefreshCw, 
  Search, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Truck as TruckIcon
} from "lucide-react";
import type { GpsLocation, Driver, Truck } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function GpsTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: locations = [], isLoading: locationsLoading, refetch } = useQuery<GpsLocation[]>({
    queryKey: ["/api/gps/latest"],
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const toggleGpsMutation = useMutation({
    mutationFn: async ({ driverId, enabled }: { driverId: string; enabled: boolean }) => {
      return await apiRequest("PATCH", `/api/drivers/${driverId}/gps`, {
        gpsEnabled: enabled,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "GPS Tracking Updated",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update GPS tracking status",
        variant: "destructive",
      });
    },
  });

  const getDriverLocation = (driverId: string) => {
    return locations.find(loc => loc.driverId === driverId);
  };

  const getTruckNumber = (truckId: string | null) => {
    if (!truckId) return "N/A";
    const truck = trucks.find((t) => t.id === truckId);
    return truck?.truckNumber || "Unknown";
  };

  const filteredDrivers = drivers.filter((driver) =>
    searchTerm === "" ||
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGoogleMapsLink = (lat: string, lon: string) => {
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (locationsLoading || driversLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">GPS Tracking</h1>
        <p className="text-muted-foreground">Monitor and manage driver GPS tracking</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle>Driver GPS Status</CardTitle>
            <CardDescription>Enable/disable GPS tracking and view driver locations</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          {filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-drivers">
                No drivers found
              </h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm ? "Try adjusting your search" : "Add drivers to start GPS tracking"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrivers.map((driver) => {
                const location = getDriverLocation(driver.id);
                const isGpsEnabled = driver.gpsEnabled === "true";
                const hasRecentLocation = location && driver.lastGpsUpdate;

                return (
                  <Card key={driver.id} className="hover-elevate" data-testid={`card-driver-${driver.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        {/* Driver Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(driver.name)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground truncate" data-testid={`text-driver-name-${driver.id}`}>
                                  {driver.name}
                                </h3>
                                <Badge variant={driver.status === "Active" ? "default" : "secondary"} className="text-xs">
                                  {driver.status}
                                </Badge>
                              </div>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="truncate">{driver.email}</span>
                                <span>CDL: {driver.licenseNumber}</span>
                                {driver.assignedTruckId && (
                                  <span className="flex items-center gap-1">
                                    <TruckIcon className="h-3 w-3" />
                                    {getTruckNumber(driver.assignedTruckId)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* GPS Toggle */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium" data-testid={`text-gps-label-${driver.id}`}>
                                  GPS Tracking
                                </span>
                                <Switch
                                  checked={isGpsEnabled}
                                  onCheckedChange={(checked) => {
                                    toggleGpsMutation.mutate({
                                      driverId: driver.id,
                                      enabled: checked,
                                    });
                                  }}
                                  disabled={toggleGpsMutation.isPending}
                                  data-testid={`switch-gps-${driver.id}`}
                                />
                              </div>
                              <Badge
                                variant={isGpsEnabled ? "default" : "outline"}
                                className="text-xs gap-1"
                                data-testid={`badge-status-${driver.id}`}
                              >
                                {isGpsEnabled ? (
                                  <>
                                    <Activity className="h-3 w-3" />
                                    Enabled
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3" />
                                    Disabled
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Location Info (if GPS enabled) */}
                        {isGpsEnabled && (
                          <div className="border-t pt-3 space-y-2">
                            {hasRecentLocation ? (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-muted-foreground text-xs mb-1">Current Location:</p>
                                      <a
                                        href={getGoogleMapsLink(location!.latitude, location!.longitude)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-mono text-xs truncate block"
                                        data-testid={`link-maps-${driver.id}`}
                                      >
                                        {parseFloat(location!.latitude).toFixed(5)}, {parseFloat(location!.longitude).toFixed(5)}
                                      </a>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-1">Last Update:</p>
                                      <p className="text-foreground text-xs" data-testid={`text-last-update-${driver.id}`}>
                                        {formatDistanceToNow(new Date(driver.lastGpsUpdate!), { addSuffix: true })}
                                      </p>
                                      <p className="text-muted-foreground text-xs">
                                        {format(new Date(driver.lastGpsUpdate!), "MMM d, h:mm a")}
                                      </p>
                                    </div>
                                  </div>

                                  {location!.speed && (
                                    <div className="flex items-start gap-2">
                                      <Navigation className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-muted-foreground text-xs mb-1">Speed:</p>
                                        <p className="text-foreground text-xs">{location!.speed} mph</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                    GPS Active - Location sharing enabled
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    Waiting for driver to share location
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    GPS tracking is enabled. Driver needs to log in to the Driver Portal and turn on duty status to share location.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* GPS Disabled Message */}
                        {!isGpsEnabled && (
                          <div className="border-t pt-3">
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm text-muted-foreground">
                                GPS tracking is disabled for this driver. Enable it to start receiving location updates.
                              </p>
                            </div>
                          </div>
                        )}
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
