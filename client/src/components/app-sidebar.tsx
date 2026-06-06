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
  CheckSquare,
  Settings,
  UserCheck,
  MessageSquare,
  FileText
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
import { useAuth } from "@/hooks/useAuth";

// Menu items with role access: 
// - "all" = visible to both admin and dispatch
// - "admin" = visible to admin only
const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    access: "all",
  },
  {
    title: "Loads",
    url: "/loads",
    icon: Package,
    access: "all",
  },
  {
    title: "Trucks",
    url: "/trucks",
    icon: Truck,
    access: "all",
  },
  {
    title: "Trailers",
    url: "/trailers",
    icon: Package,
    access: "all",
  },
  {
    title: "Drivers",
    url: "/drivers",
    icon: Users,
    access: "all",
  },
  {
    title: "Customers",
    url: "/customers",
    icon: UserCog,
    access: "all",
  },
  {
    title: "Paperwork",
    url: "/paperwork",
    icon: FileText,
    access: "all",
  },
  {
    title: "Safety",
    url: "/safety",
    icon: ShieldCheck,
    access: "all",
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: Wrench,
    access: "all",
  },
  {
    title: "Fuel",
    url: "/fuel",
    icon: Fuel,
    access: "all",
  },
  {
    title: "GPS Tracking",
    url: "/gps-tracking",
    icon: MapPin,
    access: "all",
  },
  {
    title: "Driver Portal",
    url: "/driver-portal",
    icon: Smartphone,
    access: "all",
  },
  {
    title: "Accounting",
    url: "/accounting",
    icon: DollarSign,
    access: "admin",
  },
  {
    title: "Short Pays",
    url: "/short-pays",
    icon: AlertCircle,
    access: "admin",
  },
  {
    title: "Charge Backs",
    url: "/charge-backs",
    icon: AlertTriangle,
    access: "admin",
  },
  {
    title: "Settlements",
    url: "/settlements",
    icon: Receipt,
    access: "admin",
  },
  {
    title: "Recurring Expenses",
    url: "/recurring-expenses",
    icon: Calendar,
    access: "admin",
  },
  {
    title: "Feedback",
    url: "/feedback",
    icon: MessageSquare,
    access: "all",
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
    access: "all",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Filter menu items based on user role
  const userRole = user?.role || "admin";
  const isAdmin = userRole === "admin";
  
  const filteredMenuItems = menuItems.filter(item => {
    if (item.access === "all") return true;
    if (item.access === "admin" && isAdmin) return true;
    return false;
  });

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
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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
      {isAdmin && (
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild data-testid="link-admin-approvals">
                <Link href="/admin/approvals">
                  <UserCheck className="h-4 w-4" />
                  <span>Admin Approvals</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild data-testid="link-company-settings">
                <Link href="/company-settings">
                  <Settings className="h-4 w-4" />
                  <span>Company Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
