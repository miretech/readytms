import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, TruckIcon, Package } from "lucide-react";

type LoadStatus = "pending" | "assigned" | "in-transit" | "delivered" | "invoiced";
type TruckStatus = "available" | "in-use" | "maintenance" | "out-of-service";
type DriverStatus = "available" | "on-duty" | "off-duty" | "on-leave";

interface StatusBadgeProps {
  status: LoadStatus | TruckStatus | DriverStatus;
  type?: "load" | "truck" | "driver";
}

export function StatusBadge({ status, type = "load" }: StatusBadgeProps) {
  const getStatusConfig = () => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === "pending") {
      return {
        icon: Clock,
        variant: "secondary" as const,
        label: "Pending",
      };
    }
    
    if (statusLower === "assigned") {
      return {
        icon: Package,
        variant: "secondary" as const,
        label: "Assigned",
      };
    }
    
    if (statusLower === "in-transit" || statusLower === "in-use" || statusLower === "on-duty") {
      return {
        icon: TruckIcon,
        variant: "default" as const,
        label: statusLower === "in-transit" ? "In Transit" : statusLower === "in-use" ? "In Use" : "On Duty",
      };
    }
    
    if (statusLower === "delivered") {
      return {
        icon: CheckCircle2,
        variant: "default" as const,
        label: "Delivered",
        className: "bg-chart-2 text-white border-chart-2",
      };
    }
    
    if (statusLower === "invoiced") {
      return {
        icon: CheckCircle2,
        variant: "default" as const,
        label: "Invoiced",
        className: "bg-chart-2 text-white border-chart-2",
      };
    }
    
    if (statusLower === "available") {
      return {
        icon: CheckCircle2,
        variant: "default" as const,
        label: "Available",
        className: "bg-chart-2 text-white border-chart-2",
      };
    }
    
    if (statusLower === "maintenance" || statusLower === "out-of-service" || statusLower === "on-leave") {
      return {
        icon: AlertCircle,
        variant: "default" as const,
        label: statusLower === "maintenance" ? "Maintenance" : statusLower === "out-of-service" ? "Out of Service" : "On Leave",
        className: "bg-chart-3 text-white border-chart-3",
      };
    }
    
    if (statusLower === "off-duty") {
      return {
        icon: Clock,
        variant: "secondary" as const,
        label: "Off Duty",
      };
    }
    
    return {
      icon: Clock,
      variant: "secondary" as const,
      label: status,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
