import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Loads from "@/pages/loads";
import Fleet from "@/pages/fleet";
import Drivers from "@/pages/drivers";
import Customers from "@/pages/customers";
import Accounting from "@/pages/accounting";
import Safety from "@/pages/safety";
import Settlements from "@/pages/settlements";
import RecurringExpenses from "@/pages/recurring-expenses";
import Maintenance from "@/pages/maintenance";
import Fuel from "@/pages/fuel";
import GpsTracking from "@/pages/gps-tracking";
import DriverPortal from "@/pages/driver-portal";
import DriverSignup from "@/pages/driver-signup";
import ShortPays from "@/pages/short-pays";
import ChargeBacks from "@/pages/charge-backs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/loads" component={Loads} />
      <Route path="/fleet" component={Fleet} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/customers" component={Customers} />
      <Route path="/safety" component={Safety} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/fuel" component={Fuel} />
      <Route path="/gps-tracking" component={GpsTracking} />
      <Route path="/driver-portal" component={DriverPortal} />
      <Route path="/driver-signup" component={DriverSignup} />
      <Route path="/accounting" component={Accounting} />
      <Route path="/short-pays" component={ShortPays} />
      <Route path="/charge-backs" component={ChargeBacks} />
      <Route path="/settlements" component={Settlements} />
      <Route path="/recurring-expenses" component={RecurringExpenses} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-1 flex-col">
                <header className="flex items-center justify-between border-b border-border p-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-y-auto bg-background p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
