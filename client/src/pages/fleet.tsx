import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
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
import { TruckDialog } from "@/components/truck-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Truck } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Fleet() {
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

  const filteredTrucks = trucks.filter((truck) =>
    truck.truckNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    truck.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    truck.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-semibold tracking-tight">Fleet Management</h1>
          <p className="text-sm text-muted-foreground">Manage your truck fleet and equipment</p>
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
                  <TableHead>VIN</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => (
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
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {truck.vin || "N/A"}
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
                ))}
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
