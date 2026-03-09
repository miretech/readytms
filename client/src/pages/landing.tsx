import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Truck, 
  Users, 
  FileText, 
  DollarSign, 
  MapPin, 
  Shield,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2,
  Package,
  Wrench,
  Fuel,
  ListTodo,
  ClipboardList,
  ChevronDown,
  Building2
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export default function Landing() {
  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
    retry: false,
  });

  const nonPrimaryDivisions = divisions.filter((d) => !d.isPrimary);
  const allCompanyDivisions = divisions; // All companies under ReadyTMS

  const allFeatures = [
    { icon: Package, title: "Load Management", description: "AI-powered load extraction with lifecycle tracking" },
    { icon: Truck, title: "Truck Management", description: "Fleet inventory with DOT inspection & cab card tracking" },
    { icon: ClipboardList, title: "Trailer Management", description: "Trailer inventory with insurance & rent tracking" },
    { icon: Users, title: "Driver Management", description: "Driver profiles, DOT compliance, CDL tracking" },
    { icon: MapPin, title: "GPS Tracking", description: "Real-time location tracking with notifications" },
    { icon: Shield, title: "Safety & Compliance", description: "Inspections, accidents, violations with documents" },
    { icon: DollarSign, title: "Invoicing (AR)", description: "Invoice generation with PDF export & email" },
    { icon: FileText, title: "Driver Settlements", description: "Automated payroll with dynamic fee calculations" },
    { icon: Building2, title: "Customer CRM", description: "Shipper & receiver relationship management" },
    { icon: Fuel, title: "Fuel Tracking", description: "Fuel card accounts & transaction management" },
    { icon: Wrench, title: "Maintenance", description: "Service records with automated reminders" },
    { icon: ListTodo, title: "Task Manager", description: "Daily tasks & recurring reminders" },
  ];

  const features = allFeatures.slice(0, 6);

  const benefits = [
    "Complete load-to-invoice workflow automation",
    "Driver settlements with dynamic fee calculations",
    "Maintenance scheduling with automated reminders",
    "Customer relationship management (CRM)",
    "Multi-channel notifications (Email & SMS)",
    "Professional invoice PDF generation with branding"
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-primary">ReadyTMS</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[600px] p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {allFeatures.map((feature, index) => (
                          <a
                            key={index}
                            href="#features"
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-muted transition-colors"
                          >
                            <div className="p-2 rounded-md bg-primary/10 shrink-0">
                              <feature.icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{feature.title}</div>
                              <div className="text-xs text-muted-foreground">{feature.description}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Benefits
            </a>
          </nav>
          <div className="flex items-center gap-2 flex-wrap">
            <ThemeToggle />
            {allCompanyDivisions.map((division) => (
              <Link key={division.id} href={`/division-login/${division.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid={`button-division-header-${division.id}`}>
                  <Building2 className="h-3.5 w-3.5" />
                  {division.companyName}
                </Button>
              </Link>
            ))}
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="button-admin-login-header">
                ReadyTMS Admin
              </Button>
            </Link>
            <Link href="/login?role=dispatch">
              <Button variant="outline" size="sm" data-testid="button-dispatch-login-header">
                Dispatch
              </Button>
            </Link>
            <Link href="/driver-pod">
              <Button size="sm" data-testid="button-driver-login-header">
                Driver Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="container mx-auto px-4 md:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                <span className="text-primary">Enterprise</span> Transportation
                <br />Management System
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Streamline your trucking operations with our comprehensive TMS solution. 
                From dispatch to settlement, manage everything in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Link href="/login">
                  <Button size="lg" className="gap-2 text-lg px-8" data-testid="button-admin-login-hero">
                    Admin Login
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login?role=dispatch">
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8" data-testid="button-dispatch-login-hero">
                    Dispatch Login
                    <Package className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/driver-pod">
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8" data-testid="button-driver-portal-hero">
                    Driver Portal
                    <Truck className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Run Your Fleet
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete suite of tools designed specifically for trucking companies
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="py-20">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Built for Modern Trucking Operations
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Ready TMS combines powerful features with an intuitive interface, 
                  helping you save time and reduce errors across your entire operation.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-primary mb-1">100%</div>
                  <div className="text-sm text-muted-foreground">Cloud-Based</div>
                </Card>
                <Card className="p-6 text-center">
                  <Clock className="h-10 w-10 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                  <div className="text-sm text-muted-foreground">Access Anywhere</div>
                </Card>
                <Card className="p-6 text-center">
                  <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-primary mb-1">DOT</div>
                  <div className="text-sm text-muted-foreground">Compliance Ready</div>
                </Card>
                <Card className="p-6 text-center">
                  <Users className="h-10 w-10 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-primary mb-1">Easy</div>
                  <div className="text-sm text-muted-foreground">Driver Portal</div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {allCompanyDivisions.length > 0 && (
          <section className="py-16 bg-muted/20">
            <div className="container mx-auto px-4 md:px-8">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-medium mb-4">
                  <Truck className="h-3.5 w-3.5" />
                  Powered by ReadyTMS
                </div>
                <h2 className="text-3xl font-bold mb-3">Company Portals</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  ReadyTMS manages multiple companies. Select yours to sign in or request access.
                </p>
              </div>
              <div className="flex flex-wrap gap-6 justify-center">
                {allCompanyDivisions.map((division) => (
                  <Card key={division.id} className="p-8 text-center w-72 hover-elevate transition-all duration-200">
                    <div className="flex justify-center mb-4">
                      {division.logoUrl ? (
                        <img
                          src={division.logoUrl}
                          alt={division.companyName}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-1">{division.companyName}</h3>
                    {division.address && (
                      <p className="text-sm text-muted-foreground mb-4">{division.address}</p>
                    )}
                    <Link href={`/division-login/${division.id}`}>
                      <Button className="w-full gap-2" data-testid={`button-division-login-${division.id}`}>
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
              <div className="text-center mt-10 pt-8 border-t border-muted">
                <p className="text-sm text-muted-foreground mb-3">
                  Platform administrator?
                </p>
                <Link href="/login">
                  <Button variant="outline" className="gap-2" data-testid="button-platform-admin-login">
                    <Shield className="h-4 w-4" />
                    ReadyTMS Platform Login
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">ReadyTMS Platform</h3>
                <p className="text-muted-foreground mb-6">
                  Master platform control — manage all companies, accounting, settlements, and system settings.
                </p>
                <Link href="/login">
                  <Button size="lg" className="gap-2 px-8" data-testid="button-admin-login-card">
                    Platform Login
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </Card>

              <Card className="p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Dispatch</h3>
                <p className="text-muted-foreground mb-6">
                  Manage loads, assign drivers, track trucks, handle customers, and daily dispatch operations.
                </p>
                <Link href="/login?role=dispatch">
                  <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-dispatch-login-card">
                    Dispatch Login
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </Card>

              <Card className="p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Drivers</h3>
                <p className="text-muted-foreground mb-6">
                  Access your assignments, share GPS location, upload PODs, and view your settlement information.
                </p>
                <Link href="/driver-pod">
                  <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-driver-portal-card">
                    Driver Portal
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Streamline Your Operations?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join trucking companies that trust Ready TMS for their daily operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8" data-testid="button-get-started-cta">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-primary">ReadyTMS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Ready TMS. All rights reserved.
            </p>
            <div className="flex gap-6 flex-wrap justify-center">
              {allCompanyDivisions.map((d) => (
                <Link key={d.id} href={`/division-login/${d.id}`}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                    {d.companyName}
                  </span>
                </Link>
              ))}
              <Link href="/login">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Platform Login
                </span>
              </Link>
              <Link href="/login?role=dispatch">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Dispatch
                </span>
              </Link>
              <Link href="/driver-pod">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Driver Portal
                </span>
              </Link>
              <Link href="/driver-signup">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Driver Signup
                </span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
