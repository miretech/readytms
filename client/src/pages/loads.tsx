import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

// Helper to format date without timezone conversion issues
function formatDateLocal(dateString: string | Date): string {
  if (!dateString) return "";
  const str = typeof dateString === 'string' ? dateString : dateString.toISOString();
  // Extract just the date part (YYYY-MM-DD) and parse as local date
  const datePart = str.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString();
}

export default function Loads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);
  
  // Derive clamped page synchronously to prevent empty table on render
  const clampedPage = totalPages === 0 ? 1 : Math.min(Math.max(currentPage, 1), totalPages);
  
  // Update state if clamped value differs (runs after render)
  useEffect(() => {
    if (currentPage !== clampedPage) {
      setCurrentPage(clampedPage);
    }
  }, [currentPage, clampedPage]);
  
  const startIndex = (clampedPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLoads = filteredLoads.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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
              onChange={(e) => handleSearch(e.target.value)}
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
                {paginatedLoads.map((load) => (
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
                    <TableCell>{formatDateLocal(load.pickupDate)}</TableCell>
                    <TableCell>{formatDateLocal(load.deliveryDate)}</TableCell>
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

        {filteredLoads.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredLoads.length)} of {filteredLoads.length} loads
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(clampedPage - 1)}
                disabled={clampedPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (clampedPage <= 3) {
                    pageNumber = i + 1;
                  } else if (clampedPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = clampedPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={clampedPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      data-testid={`button-page-${pageNumber}`}
                      className="min-w-[2.5rem]"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(clampedPage + 1)}
                disabled={clampedPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
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
