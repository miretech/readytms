import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Clock, Truck as TruckIcon, User, RefreshCw, Search } from "lucide-react";
import type { GpsLocation, Driver, Truck } from "@shared/schema";
import { format } from "date-fns";

export default function GpsTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "driver" | "truck">("all");

  const { data: locations = [], isLoading: locationsLoading, refetch } = useQuery<GpsLocation[]>({
    queryKey: ["/api/gps/latest"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "N/A";
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "Unknown Driver";
  };

  const getTruckNumber = (truckId: string | null) => {
    if (!truckId) return "N/A";
    const truck = trucks.find((t) => t.id === truckId);
    return truck?.truckNumber || "Unknown Truck";
  };

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      searchTerm === "" ||
      (location.driverId && getDriverName(location.driverId).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.truckId && getTruckNumber(location.truckId).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterType === "all" ||
      (filterType === "driver" && location.driverId) ||
      (filterType === "truck" && location.truckId);

    return matchesSearch && matchesFilter;
  });

  const getGoogleMapsLink = (lat: string, lon: string) => {
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  if (locationsLoading) {
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
        <p className="text-muted-foreground">Real-time driver and truck location tracking</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle>Live Locations</CardTitle>
            <CardDescription>Latest GPS coordinates from drivers and trucks</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by driver or truck..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="driver">Drivers Only</SelectItem>
                <SelectItem value="truck">Trucks Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-locations">
                No GPS locations yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                GPS location data will appear here when drivers or trucks transmit their coordinates
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLocations.map((location) => (
                <Card key={location.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {location.driverId && (
                            <Badge variant="default" className="gap-1" data-testid={`badge-driver-${location.id}`}>
                              <User className="h-3 w-3" />
                              {getDriverName(location.driverId)}
                            </Badge>
                          )}
                          {location.truckId && (
                            <Badge variant="secondary" className="gap-1" data-testid={`badge-truck-${location.id}`}>
                              <TruckIcon className="h-3 w-3" />
                              {getTruckNumber(location.truckId)}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Coordinates:</span>
                            <a
                              href={getGoogleMapsLink(location.latitude, location.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              data-testid={`link-maps-${location.id}`}
                            >
                              {parseFloat(location.latitude).toFixed(5)}, {parseFloat(location.longitude).toFixed(5)}
                            </a>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Time:</span>
                            <span className="text-foreground" data-testid={`text-timestamp-${location.id}`}>
                              {format(new Date(location.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>

                          {location.speed && (
                            <div className="flex items-center gap-2">
                              <Navigation className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Speed:</span>
                              <span className="text-foreground" data-testid={`text-speed-${location.id}`}>
                                {parseFloat(location.speed).toFixed(0)} mph
                              </span>
                            </div>
                          )}

                          {location.heading !== null && location.heading !== undefined && (
                            <div className="flex items-center gap-2">
                              <Navigation className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Heading:</span>
                              <span className="text-foreground">{location.heading}°</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={getGoogleMapsLink(location.latitude, location.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`button-view-map-${location.id}`}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            View on Map
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Information</CardTitle>
          <CardDescription>How to send GPS data to the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-foreground">API Endpoint</h4>
            <code className="text-sm text-muted-foreground">POST /api/gps</code>
            
            <h4 className="font-semibold text-foreground mt-4">Required Fields</h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><code>latitude</code> - Decimal latitude (e.g., "40.7128")</li>
              <li><code>longitude</code> - Decimal longitude (e.g., "-74.0060")</li>
              <li><code>timestamp</code> - ISO 8601 timestamp</li>
              <li><code>driverId</code> or <code>truckId</code> - At least one required</li>
            </ul>

            <h4 className="font-semibold text-foreground mt-4">Optional Fields</h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><code>speed</code> - Speed in mph (e.g., "65.5")</li>
              <li><code>heading</code> - Direction in degrees (0-359)</li>
              <li><code>accuracy</code> - GPS accuracy in meters</li>
              <li><code>loadId</code> - Associated load ID</li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Mobile apps, GPS devices, or fleet telematics systems can POST location data to this endpoint.
              Integrate with services like Geotab, Samsara, or custom GPS hardware.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
