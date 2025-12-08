import { Link } from "wouter";
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
  Package
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Package,
      title: "Load Management",
      description: "AI-powered load extraction from rate confirmations with complete lifecycle tracking."
    },
    {
      icon: Truck,
      title: "Fleet Management",
      description: "Track trucks, trailers, and equipment with real-time status updates and maintenance scheduling."
    },
    {
      icon: Users,
      title: "Driver Management",
      description: "Manage driver profiles, DOT compliance, CDL tracking, and automated document expiration alerts."
    },
    {
      icon: DollarSign,
      title: "Full Accounting",
      description: "Invoicing, expenses, payments, and driver settlements with professional PDF generation."
    },
    {
      icon: MapPin,
      title: "GPS Tracking",
      description: "Real-time driver location tracking with automated notification systems."
    },
    {
      icon: Shield,
      title: "Safety & Compliance",
      description: "DOT inspections, accident reporting, violation tracking with document management."
    },
  ];

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
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Benefits
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="button-admin-login-header">
                Admin Login
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="gap-2 text-lg px-8" data-testid="button-admin-login-hero">
                    Admin Login
                    <ArrowRight className="h-5 w-5" />
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

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Administrators</h3>
                <p className="text-muted-foreground mb-6">
                  Manage your entire fleet operation including dispatch, drivers, trucks, accounting, and compliance.
                </p>
                <Link href="/login">
                  <Button size="lg" className="gap-2 px-8" data-testid="button-admin-login-card">
                    Admin Login
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
            <div className="flex gap-6">
              <Link href="/login">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  Admin Login
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
