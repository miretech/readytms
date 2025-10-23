import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Phone, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { DriverDialog } from "@/components/driver-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Driver } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

export default function Drivers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const { toast } = useToast();

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "Driver deleted",
        description: "The driver has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete driver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredDrivers = drivers.filter((driver) =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this driver?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDriver(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getExpirationStatus = (expirationDate: Date | null | undefined) => {
    if (!expirationDate) return null;
    const daysUntilExpiration = differenceInDays(new Date(expirationDate), new Date());
    
    if (daysUntilExpiration < 0) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (daysUntilExpiration <= 30) {
      return { status: "expiring", label: `${daysUntilExpiration}d`, variant: "secondary" as const };
    }
    return { status: "valid", label: "Valid", variant: "outline" as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Driver Management</h1>
          <p className="text-sm text-muted-foreground">Manage your driver roster and assignments</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-driver"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-drivers"
            />
          </div>
        </div>

        {filteredDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No drivers found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first driver"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-driver">
                <Plus className="mr-2 h-4 w-4" />
                Add Driver
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>CDL / Medical</TableHead>
                  <TableHead>Assigned Truck</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{driver.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={driver.status as any} type="driver" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{driver.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{driver.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">CDL: </span>
                          <span className="font-mono">{driver.licenseNumber}</span>
                          {driver.licenseExpiration && (
                            <>
                              {" "}
                              {(() => {
                                const status = getExpirationStatus(driver.licenseExpiration);
                                return status && (
                                  <Badge variant={status.variant} className="ml-2">
                                    {status.status === "expired" ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                                    {status.label}
                                  </Badge>
                                );
                              })()}
                            </>
                          )}
                        </div>
                        {driver.medicalCardExpiration && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Medical: </span>
                            {(() => {
                              const status = getExpirationStatus(driver.medicalCardExpiration);
                              return status && (
                                <Badge variant={status.variant}>
                                  {status.status === "expired" ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                                  {status.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.assignedTruckId ? (
                        <span className="text-sm">{driver.assignedTruckId}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${driver.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(driver)}
                            data-testid={`button-edit-${driver.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(driver.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${driver.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <DriverDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        driver={editingDriver}
      />
    </div>
  );
}
