import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import Loads from "@/pages/loads";
import Fleet from "@/pages/fleet";
import Trailers from "@/pages/trailers";
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
import DriverPOD from "@/pages/driver-pod";
import DriverSignup from "@/pages/driver-signup";
import ShortPays from "@/pages/short-pays";
import ChargeBacks from "@/pages/charge-backs";
import Tasks from "@/pages/tasks";
import CompanySettings from "@/pages/company-settings";
import AdminApprovals from "@/pages/admin-approvals";
import Login from "@/pages/login";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

// Protected routes require authentication
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/driver-signup" component={DriverSignup} />
      <Route path="/driver-pod" component={DriverPOD} />
      
      {/* Protected admin routes */}
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/loads">{() => <ProtectedRoute component={Loads} />}</Route>
      <Route path="/fleet">{() => <ProtectedRoute component={Fleet} />}</Route>
      <Route path="/trailers">{() => <ProtectedRoute component={Trailers} />}</Route>
      <Route path="/drivers">{() => <ProtectedRoute component={Drivers} />}</Route>
      <Route path="/customers">{() => <ProtectedRoute component={Customers} />}</Route>
      <Route path="/safety">{() => <ProtectedRoute component={Safety} />}</Route>
      <Route path="/maintenance">{() => <ProtectedRoute component={Maintenance} />}</Route>
      <Route path="/fuel">{() => <ProtectedRoute component={Fuel} />}</Route>
      <Route path="/gps-tracking">{() => <ProtectedRoute component={GpsTracking} />}</Route>
      <Route path="/driver-portal">{() => <ProtectedRoute component={DriverPortal} />}</Route>
      <Route path="/accounting">{() => <ProtectedRoute component={Accounting} />}</Route>
      <Route path="/short-pays">{() => <ProtectedRoute component={ShortPays} />}</Route>
      <Route path="/charge-backs">{() => <ProtectedRoute component={ChargeBacks} />}</Route>
      <Route path="/settlements">{() => <ProtectedRoute component={Settlements} />}</Route>
      <Route path="/recurring-expenses">{() => <ProtectedRoute component={RecurringExpenses} />}</Route>
      <Route path="/tasks">{() => <ProtectedRoute component={Tasks} />}</Route>
      <Route path="/company-settings">{() => <ProtectedRoute component={CompanySettings} />}</Route>
      <Route path="/admin/approvals">{() => <ProtectedRoute component={AdminApprovals} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isPublicPage = ["/login", "/reset-password", "/driver-signup", "/driver-pod"].includes(location);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show public pages without sidebar
  if (isPublicPage) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  // Show main app with sidebar (works with or without login)
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border p-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    {user.firstName} {user.lastName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : null}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
