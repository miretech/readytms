import { Package, Truck, Users, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Load, Truck as TruckType, Driver } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: loads = [], isLoading: loadsLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const { data: trucks = [], isLoading: trucksLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const activeLoads = loads.filter(l => l.status === "in-transit" || l.status === "assigned").length;
  const availableTrucks = trucks.filter(t => t.status === "available").length;
  const activeDrivers = drivers.filter(d => d.status === "on-duty").length;
  const totalRevenue = loads.reduce((sum, load) => sum + Number(load.rate), 0);

  const recentLoads = loads.slice(0, 5);

  if (loadsLoading || trucksLoading || driversLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your operations</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Loads"
          value={activeLoads}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
          description={`${loads.length} total loads`}
        />
        <MetricCard
          title="Available Trucks"
          value={availableTrucks}
          icon={Truck}
          description={`${trucks.length} total trucks`}
        />
        <MetricCard
          title="Active Drivers"
          value={activeDrivers}
          icon={Users}
          description={`${drivers.length} total drivers`}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 22, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Loads</CardTitle>
            <CardDescription>Latest load activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLoads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">No loads yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first load to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLoads.map((load) => (
                  <div
                    key={load.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover-elevate"
                    data-testid={`load-item-${load.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium" data-testid={`text-load-number-${load.id}`}>
                          {load.loadNumber}
                        </p>
                        <StatusBadge status={load.status as any} type="load" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {load.pickupLocation} → {load.deliveryLocation}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(load.rate).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(load.pickupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
            <CardDescription>Current truck availability</CardDescription>
          </CardHeader>
          <CardContent>
            {trucks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Truck className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">No trucks yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add trucks to your fleet to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {trucks.slice(0, 5).map((truck) => (
                  <div
                    key={truck.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover-elevate"
                    data-testid={`truck-item-${truck.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{truck.truckNumber}</p>
                        <StatusBadge status={truck.status as any} type="truck" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {truck.year} {truck.make} {truck.model}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {truck.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
