import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  AlertCircle,
  UserPlus
} from "lucide-react";
import type { Load, Driver } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function DriverPortal() {
  const { toast } = useToast();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [isDutyChanging, setIsDutyChanging] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lon: number; time: Date } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  
  // Use ref to track latest duty state (prevents stale closure issues)
  const isOnDutyRef = useRef(isOnDuty);
  
  // Keep ref in sync with state
  useEffect(() => {
    isOnDutyRef.current = isOnDuty;
  }, [isOnDuty]);

  // Request notification permissions on mount
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsGranted(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            setNotificationsGranted(true);
          }
        });
      }
    }
  }, []);

  // Show browser notification helper function
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (notificationsGranted && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  }, [notificationsGranted]);

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

  // Auto-create driver profile mutation
  const createDriverProfile = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/drivers/signup", {
        name: user?.name || user?.email?.split("@")[0] || "Driver",
        email: user?.email,
        phone: "0000000000",
        licenseNumber: "TEMP-" + Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "Profile Created",
        description: "Your driver profile has been created. You can update your details in the Drivers section.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create driver profile",
        variant: "destructive",
      });
    },
  });

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

      // Update location data
      setLastLocation({
        lat: location.latitude,
        lon: location.longitude,
        time: new Date(),
      });

      // Only update tracking state if still on duty (check ref for latest value)
      const stillOnDuty = isOnDutyRef.current;
      if (stillOnDuty) {
        setIsTracking(true);
        
        // Only show success toast when manually requested and still on duty
        if (showSuccessToast) {
          toast({
            title: "Location Updated",
            description: "Your location has been shared successfully",
          });
        }
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
    if (isDutyChanging) return; // Prevent concurrent toggles

    if (checked) {
      // Set duty state first so sendLocationUpdate can activate tracking
      setIsDutyChanging(true);
      setIsOnDuty(true);
      
      try {
        const success = await sendLocationUpdate(false);
        
        if (success) {
          // Success - show toast
          toast({
            title: "On Duty",
            description: "GPS tracking started. Location updates every 3 minutes.",
          });
        } else {
          // Failed - revert duty state
          setIsOnDuty(false);
          setIsTracking(false);
          // Error toast already shown by sendLocationUpdate
        }
      } catch (error: any) {
        // Failed - revert duty state
        setIsOnDuty(false);
        setIsTracking(false);
        // Error toast already shown by sendLocationUpdate
      } finally {
        setIsDutyChanging(false);
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
  }, [sendLocationUpdate, toast, isDutyChanging]);

  // Auto-update GPS location every 3 minutes when on duty
  useEffect(() => {
    if (!isOnDuty) return;

    const interval = setInterval(() => {
      sendLocationUpdate();
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [isOnDuty, sendLocationUpdate]);

  // Check for GPS reminder notifications (every 30 minutes)
  useEffect(() => {
    if (!currentDriver || currentDriver.gpsEnabled !== "true") return;

    const checkGPSStatus = () => {
      // If driver is not on duty and GPS is enabled, show reminder
      if (!isOnDuty && currentDriver.gpsEnabled === "true") {
        const lastUpdate = currentDriver.lastGpsUpdate ? new Date(currentDriver.lastGpsUpdate) : null;
        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        
        // Show reminder if no update in last 6 hours (or never updated)
        if (!lastUpdate || lastUpdate < sixHoursAgo) {
          showBrowserNotification(
            "GPS Tracking Reminder",
            "Please toggle 'On Duty' to share your location with dispatch."
          );
        }
      }
    };

    // Check immediately on mount if driver has GPS enabled
    checkGPSStatus();

    // Then check every 30 minutes
    const interval = setInterval(checkGPSStatus, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentDriver, isOnDuty, showBrowserNotification]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Driver Portal</CardTitle>
            <CardDescription>Please log in to access the driver portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              data-testid="button-login"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentDriver) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              Create Driver Profile
            </CardTitle>
            <CardDescription>
              You need a driver profile to access the Driver Portal. Click below to create one automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Your profile will be created with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Email: {user?.email}</li>
                <li>Name: {user?.name || user?.email?.split("@")[0] || "Driver"}</li>
              </ul>
              <p className="mt-3">You can update your details (phone, CDL license, etc.) after creation.</p>
            </div>
            <Button 
              onClick={() => createDriverProfile.mutate()} 
              disabled={createDriverProfile.isPending}
              className="w-full"
              data-testid="button-create-driver-profile"
            >
              {createDriverProfile.isPending ? "Creating Profile..." : "Create My Driver Profile"}
            </Button>
          </CardContent>
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
              disabled={isDataLoading || isDutyChanging}
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
