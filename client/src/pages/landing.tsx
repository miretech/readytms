import { Button } from "@/components/ui/button";
import { Truck, Package, Users, DollarSign, TrendingUp, MapPin } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="container mx-auto flex items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ready TMS</h1>
            <p className="text-sm text-muted-foreground">Transportation Management System</p>
          </div>
        </div>
        <Button asChild size="lg" data-testid="button-login">
          <a href="/api/login">Log In</a>
        </Button>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-5xl font-bold tracking-tight text-foreground">
            Streamline Your Fleet Operations
          </h2>
          <p className="mb-12 text-xl text-muted-foreground">
            Complete transportation management solution for trucking companies.
            Manage loads, track fleet, optimize routes, and maximize profitability.
          </p>
          <Button asChild size="lg" className="gap-2 px-8" data-testid="button-get-started">
            <a href="/api/login">
              Get Started
              <TrendingUp className="h-5 w-5" />
            </a>
          </Button>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Load Management</h3>
            <p className="text-muted-foreground">
              Create, assign, and track loads through every stage from pickup to delivery.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Fleet Tracking</h3>
            <p className="text-muted-foreground">
              Monitor your entire fleet with real-time status updates and maintenance scheduling.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Driver Management</h3>
            <p className="text-muted-foreground">
              Manage driver profiles, assignments, and settlements all in one place.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Accounting</h3>
            <p className="text-muted-foreground">
              Track revenue, expenses, and profitability with detailed financial reporting.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">GPS Tracking</h3>
            <p className="text-muted-foreground">
              Real-time location tracking for all active loads and in-transit shipments.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 hover-elevate">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">Analytics</h3>
            <p className="text-muted-foreground">
              Gain insights with revenue trends, fleet utilization, and performance metrics.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-3xl rounded-lg border border-border bg-card p-12 text-center">
          <h3 className="mb-4 text-3xl font-bold text-card-foreground">
            Ready to optimize your operations?
          </h3>
          <p className="mb-8 text-lg text-muted-foreground">
            Join trucking companies that trust Ready TMS for their transportation management needs.
          </p>
          <Button asChild size="lg" className="px-8" data-testid="button-login-footer">
            <a href="/api/login">Log In to Get Started</a>
          </Button>
        </div>
      </main>

      <footer className="container mx-auto border-t border-border px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm text-muted-foreground">
            © 2025 Ready TMS. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Truck className="h-5 w-5 text-primary" />
            <span>Powering efficient logistics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
