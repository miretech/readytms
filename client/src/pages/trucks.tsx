import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { TruckDialog } from "@/components/truck-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Truck } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isBefore, addDays, isValid } from "date-fns";

const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = "MM/dd/yyyy"): string => {
  const parsed = safeParseDate(dateStr);
  return parsed ? format(parsed, formatStr) : "";
};

export default function Trucks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const { toast } = useToast();

  const { data: trucks = [], isLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trucks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: "Truck deleted",
        description: "The truck has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete truck. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredTrucks = trucks
    .filter((truck) =>
      truck.truckNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.truckNumber.replace(/\D/g, ''));
      const numB = parseInt(b.truckNumber.replace(/\D/g, ''));
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      
      return a.truckNumber.localeCompare(b.truckNumber);
    });

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this truck?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTruck(null);
  };

  const getInsuranceStatus = (expirationDate: string | null) => {
    const expDate = safeParseDate(expirationDate);
    if (!expDate) return null;
    
    const now = new Date();
    const warningDate = addDays(now, 30);

    if (isBefore(expDate, now)) {
      return { variant: "destructive" as const, label: "Expired" };
    } else if (isBefore(expDate, warningDate)) {
      return { variant: "secondary" as const, label: "Expiring Soon" };
    } else {
      return { variant: "default" as const, label: "Active" };
    }
  };

  const getDotStatus = (expirationDate: string | null) => {
    const expDate = safeParseDate(expirationDate);
    if (!expDate) return null;
    
    const now = new Date();
    const warningDate = addDays(now, 30);

    if (isBefore(expDate, now)) {
      return { variant: "destructive" as const, label: "Expired" };
    } else if (isBefore(expDate, warningDate)) {
      return { variant: "secondary" as const, label: "Due Soon" };
    } else {
      return { variant: "default" as const, label: "Valid" };
    }
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
          <h1 className="text-3xl font-semibold tracking-tight">Truck Management</h1>
          <p className="text-sm text-muted-foreground">Manage your trucks and equipment</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-truck"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Truck
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trucks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-trucks"
            />
          </div>
        </div>

        {filteredTrucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No trucks found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first truck"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-truck">
                <Plus className="mr-2 h-4 w-4" />
                Add Truck
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle Details</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>DOT Inspection</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => {
                  const insuranceStatus = getInsuranceStatus(truck.insuranceExpirationDate);
                  const dotStatus = getDotStatus(truck.dotInspectionExpirationDate);
                  
                  return (
                    <TableRow key={truck.id} data-testid={`row-truck-${truck.id}`}>
                      <TableCell className="font-medium">{truck.truckNumber}</TableCell>
                      <TableCell>{truck.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={truck.status as any} type="truck" />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {truck.year && truck.make && truck.model ? (
                            <span>{truck.year} {truck.make} {truck.model}</span>
                          ) : (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {truck.licensePlate}
                        </div>
                      </TableCell>
                      <TableCell>
                        {truck.insuranceProvider ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{truck.insuranceProvider}</div>
                            {insuranceStatus && (
                              <Badge 
                                variant={insuranceStatus.variant}
                                className="text-xs"
                              >
                                {insuranceStatus.label}
                              </Badge>
                            )}
                            {truck.insuranceExpirationDate && (
                              <div className="text-xs text-muted-foreground">
                                Exp: {safeFormatDate(truck.insuranceExpirationDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {truck.dotInspectionExpirationDate ? (
                          <div className="space-y-1">
                            {dotStatus && (
                              <Badge 
                                variant={dotStatus.variant}
                                className="text-xs"
                              >
                                {dotStatus.label}
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Exp: {safeFormatDate(truck.dotInspectionExpirationDate)}
                            </div>
                            {truck.dotInspectionDate && (
                              <div className="text-xs text-muted-foreground">
                                Last: {safeFormatDate(truck.dotInspectionDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {truck.addedDate && (
                            <div>
                              <span className="text-muted-foreground">Added: </span>
                              {safeFormatDate(truck.addedDate)}
                            </div>
                          )}
                          {truck.terminatedDate && (
                            <div className="text-destructive">
                              <span>Terminated: </span>
                              {safeFormatDate(truck.terminatedDate)}
                            </div>
                          )}
                          {!truck.addedDate && !truck.terminatedDate && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${truck.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(truck)}
                              data-testid={`button-edit-${truck.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(truck.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${truck.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <TruckDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        truck={editingTruck}
      />
    </div>
  );
}
