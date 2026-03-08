import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Shield, DollarSign, Calendar, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { TrailerDialog } from "@/components/trailer-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trailer, Truck } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Truck as TruckIcon } from "lucide-react";

export default function Trailers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const { toast } = useToast();

  const { data: trailers = [], isLoading } = useQuery<Trailer[]>({
    queryKey: ["/api/trailers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const truckMap = new Map(trucks.map((t) => [t.id, t.truckNumber]));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trailers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trailers"] });
      toast({
        title: "Trailer deleted",
        description: "The trailer has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trailer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredTrailers = trailers
    .filter((trailer) =>
      trailer.trailerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trailer.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trailer.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Extract numeric parts from trailer numbers for intelligent sorting
      const numA = parseInt(a.trailerNumber.replace(/\D/g, ''));
      const numB = parseInt(b.trailerNumber.replace(/\D/g, ''));
      
      // If both have valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      // If only one has a number, put it first
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      
      // If neither has a number, sort alphabetically
      return a.trailerNumber.localeCompare(b.trailerNumber);
    });

  const handleEdit = (trailer: Trailer) => {
    setEditingTrailer(trailer);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this trailer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTrailer(null);
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
          <h1 className="text-3xl font-semibold tracking-tight">Trailer Management</h1>
          <p className="text-sm text-muted-foreground">Manage your trailers and equipment</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-trailer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Trailer
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trailers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-trailers"
            />
          </div>
        </div>

        {filteredTrailers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No trailers found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first trailer"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-trailer">
                <Plus className="mr-2 h-4 w-4" />
                Add Trailer
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trailer #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hauling Truck</TableHead>
                  <TableHead>Vehicle Details</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Rent/Mo</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrailers.map((trailer) => (
                  <TableRow key={trailer.id} data-testid={`row-trailer-${trailer.id}`}>
                    <TableCell className="font-medium">{trailer.trailerNumber}</TableCell>
                    <TableCell>{trailer.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={trailer.status as any} type="trailer" />
                    </TableCell>
                    <TableCell>
                      {trailer.haulingTruckId && truckMap.has(trailer.haulingTruckId) ? (
                        <div className="flex items-center gap-1.5">
                          <TruckIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{truckMap.get(trailer.haulingTruckId)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {trailer.year && trailer.make && trailer.model ? (
                          <span>{trailer.year} {trailer.make} {trailer.model}</span>
                        ) : trailer.licensePlate ? (
                          <span className="font-mono">{trailer.licensePlate}</span>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trailer.insuranceProvider ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{trailer.insuranceProvider}</span>
                          </div>
                          {trailer.insuranceExpirationDate && (
                            <Badge 
                              variant={new Date(trailer.insuranceExpirationDate) < new Date() ? "destructive" : 
                                       new Date(trailer.insuranceExpirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {new Date(trailer.insuranceExpirationDate) < new Date() ? (
                                <><AlertTriangle className="h-3 w-3 mr-1" />Expired</>
                              ) : (
                                <>Exp: {new Date(trailer.insuranceExpirationDate).toLocaleDateString()}</>
                              )}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {trailer.rentPerMonth ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {parseFloat(trailer.rentPerMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {trailer.pickupDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-green-600" />
                            <span>In: {new Date(trailer.pickupDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {trailer.dropOffDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-orange-600" />
                            <span>Out: {new Date(trailer.dropOffDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {trailer.terminatedDate && (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span>Term: {new Date(trailer.terminatedDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {!trailer.pickupDate && !trailer.dropOffDate && !trailer.terminatedDate && (
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
                            data-testid={`button-actions-${trailer.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(trailer)}
                            data-testid={`button-edit-${trailer.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(trailer.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${trailer.id}`}
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

      <TrailerDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        trailer={editingTrailer}
      />
    </div>
  );
}
