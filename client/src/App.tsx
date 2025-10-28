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
import Tasks from "@/pages/tasks";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/driver-signup" component={DriverSignup} />
      
      {/* Protected routes */}
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/loads">{() => <ProtectedRoute component={Loads} />}</Route>
      <Route path="/fleet">{() => <ProtectedRoute component={Fleet} />}</Route>
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
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password", "/driver-signup"].includes(location);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isAuthPage || !user) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border p-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
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
