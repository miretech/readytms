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
import { LoadDialog } from "@/components/load-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Load } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Loads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const { toast } = useToast();

  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/loads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({
        title: "Load deleted",
        description: "The load has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete load. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredLoads = loads.filter((load) =>
    load.loadNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    load.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    load.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (load: Load) => {
    setEditingLoad(load);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this load?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingLoad(null);
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
          <h1 className="text-3xl font-semibold tracking-tight">Loads</h1>
          <p className="text-sm text-muted-foreground">Manage your shipments and deliveries</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-load"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Load
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search loads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-loads"
            />
          </div>
        </div>

        {filteredLoads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No loads found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by creating your first load"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-load">
                <Plus className="mr-2 h-4 w-4" />
                Create Load
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoads.map((load) => (
                  <TableRow key={load.id} data-testid={`row-load-${load.id}`}>
                    <TableCell className="font-medium">{load.loadNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={load.status as any} type="load" />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{load.pickupLocation}</div>
                        <div className="text-muted-foreground">→ {load.deliveryLocation}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(load.pickupDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(load.deliveryDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold">
                      ${Number(load.rate).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${load.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(load)}
                            data-testid={`button-edit-${load.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(load.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${load.id}`}
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

      <LoadDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        load={editingLoad}
      />
    </div>
  );
}
