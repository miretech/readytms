import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck as TruckIcon, 
  MapPinned,
  Activity,
  Package,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { Load, Driver } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function DriverPortal() {
  const { toast } = useToast();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lon: number; time: Date } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Get driver info for current user
  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  // Match driver by email since there's no userId field
  const currentDriver = drivers.find(d => d.email === user?.email);

  // Get loads assigned to this driver
  const { data: loads = [], isLoading: loadsLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const isDataLoading = userLoading || driversLoading || loadsLoading;

  const currentLoad = loads.find(
    l => l.assignedDriverId === currentDriver?.id && l.status !== "delivered" && l.status !== "cancelled"
  );

  // Function to get current GPS location
  const getCurrentLocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = "Unable to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Send GPS location to server (silent on success, only shows errors)
  const sendLocationUpdate = useCallback(async (showSuccessToast: boolean = false): Promise<boolean> => {
    if (!currentDriver) {
      const errorMsg = "Driver profile not found";
      setLocationError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setLocationError(null);
      const location = await getCurrentLocation();
      
      const gpsData = {
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        timestamp: new Date().toISOString(),
        driverId: currentDriver.id,
        truckId: currentDriver.assignedTruckId || undefined,
        loadId: currentLoad?.id || undefined,
      };

      const response = await fetch("/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gpsData),
      });

      if (!response.ok) {
        throw new Error("Failed to update location");
      }

      setLastLocation({
        lat: location.latitude,
        lon: location.longitude,
        time: new Date(),
      });

      setIsTracking(true);

      // Only show success toast when manually requested
      if (showSuccessToast) {
        toast({
          title: "Location Updated",
          description: "Your location has been shared successfully",
        });
      }

      return true;
    } catch (error: any) {
      setLocationError(error.message);
      setIsTracking(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [currentDriver, currentLoad, getCurrentLocation, toast]);

  // Handle On Duty toggle
  const handleDutyToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      // Try to send immediate location update when going on duty
      try {
        const success = await sendLocationUpdate(false);
        
        if (success) {
          setIsOnDuty(true);
          toast({
            title: "On Duty",
            description: "GPS tracking started. Location updates every 3 minutes.",
          });
        } else {
          // Revert toggle if first upload failed
          setIsOnDuty(false);
          // Error toast already shown by sendLocationUpdate
        }
      } catch (error: any) {
        // Revert toggle on failure
        setIsOnDuty(false);
        // Error toast already shown by sendLocationUpdate
      }
    } else {
      setIsOnDuty(false);
      setIsTracking(false);
      setLocationError(null);
      toast({
        title: "Off Duty",
        description: "GPS tracking stopped.",
      });
    }
  }, [sendLocationUpdate, toast]);

  // Auto-update GPS location every 3 minutes when on duty
  useEffect(() => {
    if (!isOnDuty) return;

    const interval = setInterval(() => {
      sendLocationUpdate();
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [isOnDuty, sendLocationUpdate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Driver Portal</CardTitle>
            <CardDescription>Please log in to access the driver portal</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentDriver) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Driver Profile Not Found</CardTitle>
            <CardDescription>
              Your account is not linked to a driver profile. Please contact your dispatcher.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Driver Portal
        </h1>
        <p className="text-muted-foreground">Welcome, {currentDriver.name}</p>
      </div>

      {/* Duty Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Duty Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="duty-toggle" className="text-base font-semibold">
                {isOnDuty ? "On Duty" : "Off Duty"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isDataLoading
                  ? "Loading driver information..."
                  : isOnDuty
                  ? "GPS tracking is active. Your location is being shared."
                  : "Turn on duty to start GPS tracking."}
              </p>
            </div>
            <Switch
              id="duty-toggle"
              checked={isOnDuty}
              onCheckedChange={handleDutyToggle}
              disabled={isDataLoading}
              data-testid="switch-duty-status"
            />
          </div>

          <Separator />

          {isOnDuty && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tracking Status:</span>
                <Badge variant={isTracking ? "default" : "secondary"} className="gap-1">
                  {isTracking ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Waiting
                    </>
                  )}
                </Badge>
              </div>

              {lastLocation && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Update:</span>
                    <span className="text-sm text-foreground" data-testid="text-last-update">
                      {format(lastLocation.time, "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coordinates:</span>
                    <a
                      href={`https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                      data-testid="link-last-location"
                    >
                      {lastLocation.lat.toFixed(5)}, {lastLocation.lon.toFixed(5)}
                    </a>
                  </div>
                </>
              )}

              <Button
                onClick={() => sendLocationUpdate(true)}
                variant="outline"
                className="w-full"
                data-testid="button-share-location"
              >
                <MapPinned className="h-4 w-4 mr-2" />
                Share Location Now
              </Button>

              {locationError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {locationError}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Location updates automatically every 3 minutes while on duty
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Load Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Load
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLoad ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Load Number:</span>
                <span className="text-sm font-semibold text-foreground" data-testid="text-load-number">
                  #{currentLoad.loadNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={currentLoad.status === "in-transit" ? "default" : "secondary"}>
                  {currentLoad.status === "in-transit" ? "In Transit" :
                   currentLoad.status === "picked-up" ? "Picked Up" :
                   currentLoad.status === "assigned" ? "Assigned" :
                   currentLoad.status}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Pickup</p>
                    <p className="text-sm text-muted-foreground">{currentLoad.pickupLocation}</p>
                    {currentLoad.pickupDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(currentLoad.pickupDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Delivery</p>
                    <p className="text-sm text-muted-foreground">{currentLoad.deliveryLocation}</p>
                    {currentLoad.deliveryDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(currentLoad.deliveryDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {currentLoad.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{currentLoad.notes}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-foreground font-medium" data-testid="text-no-load">No Active Load</p>
              <p className="text-sm text-muted-foreground">
                You don't have any active loads assigned at the moment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Driver Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name:</span>
            <span className="text-sm text-foreground">{currentDriver.name}</span>
          </div>

          {currentDriver.phone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Phone:</span>
              <span className="text-sm text-foreground">{currentDriver.phone}</span>
            </div>
          )}

          {currentDriver.email && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm text-foreground">{currentDriver.email}</span>
            </div>
          )}

          {currentDriver.assignedTruckId && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assigned Truck:</span>
              <Badge variant="secondary">{currentDriver.assignedTruckId}</Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={currentDriver.status === "active" ? "default" : "secondary"}>
              {currentDriver.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">GPS Tracking Instructions</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Toggle "On Duty" to start sharing your location</li>
                <li>Your location will update automatically every 3 minutes</li>
                <li>Click "Share Location Now" for an immediate update</li>
                <li>Keep this page open in your browser while on duty</li>
                <li>Toggle "Off Duty" when you finish your shift</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
