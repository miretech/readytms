import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, FileText } from "lucide-react";
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

function getCabCardStatus(expirationDate: string | null): { status: "expired" | "warning" | "valid" | "not-set"; label: string } {
  if (!expirationDate) {
    return { status: "not-set", label: "Not set" };
  }
  
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: "expired", label: "Expired" };
  } else if (diffDays <= 30) {
    return { status: "warning", label: `${diffDays}d left` };
  } else {
    return { status: "valid", label: expirationDate };
  }
}

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
      // Extract numeric parts from truck numbers for intelligent sorting
      const numA = parseInt(a.truckNumber.replace(/\D/g, ''));
      const numB = parseInt(b.truckNumber.replace(/\D/g, ''));
      
      // If both have valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      // If only one has a number, put it first
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      
      // If neither has a number, sort alphabetically
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle Details</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Cab Card</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => {
                  const cabCardStatus = getCabCardStatus(truck.cabCardExpirationDate);
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
                    </TableCell>
                    <TableCell className="font-mono text-sm">{truck.licensePlate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {truck.cabCardAttachments && (truck.cabCardAttachments as any[]).length > 0 && (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge
                          variant={
                            cabCardStatus.status === "expired" ? "destructive" :
                            cabCardStatus.status === "warning" ? "outline" :
                            cabCardStatus.status === "valid" ? "default" : "secondary"
                          }
                          className={
                            cabCardStatus.status === "warning" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : ""
                          }
                          data-testid={`badge-cabcard-${truck.id}`}
                        >
                          {cabCardStatus.label}
                        </Badge>
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
