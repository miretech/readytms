import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  UserCog,
  ShieldCheck,
  Wrench,
  Fuel,
  MapPin,
  Smartphone,
  DollarSign,
  Receipt,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Settings
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Loads",
    url: "/loads",
    icon: Package,
  },
  {
    title: "Fleet",
    url: "/fleet",
    icon: Truck,
  },
  {
    title: "Drivers",
    url: "/drivers",
    icon: Users,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: UserCog,
  },
  {
    title: "Safety",
    url: "/safety",
    icon: ShieldCheck,
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: Wrench,
  },
  {
    title: "Fuel",
    url: "/fuel",
    icon: Fuel,
  },
  {
    title: "GPS Tracking",
    url: "/gps-tracking",
    icon: MapPin,
  },
  {
    title: "Driver Portal",
    url: "/driver-portal",
    icon: Smartphone,
  },
  {
    title: "Accounting",
    url: "/accounting",
    icon: DollarSign,
  },
  {
    title: "Short Pays",
    url: "/short-pays",
    icon: AlertCircle,
  },
  {
    title: "Charge Backs",
    url: "/charge-backs",
    icon: AlertTriangle,
  },
  {
    title: "Settlements",
    url: "/settlements",
    icon: Receipt,
  },
  {
    title: "Recurring Expenses",
    url: "/recurring-expenses",
    icon: Calendar,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ready TMS</h2>
            <p className="text-xs text-muted-foreground">Transportation Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="link-settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
