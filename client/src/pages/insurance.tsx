import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Shield } from "lucide-react";
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
import { InsuranceDialog } from "@/components/insurance-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InsuranceRecord {
  id: string;
  unitNumber: string;
  unitType: "truck" | "trailer";
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export default function Insurance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InsuranceRecord | null>(null);
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery<InsuranceRecord[]>({
    queryKey: ["/api/insurance"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/insurance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance"] });
      toast({
        title: "Insurance record deleted",
        description: "The insurance record has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete insurance record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredRecords = records
    .filter((record) =>
      record.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.vin?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.unitNumber.replace(/\D/g, ""));
      const numB = parseInt(b.unitNumber.replace(/\D/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;

      return a.unitNumber.localeCompare(b.unitNumber);
    });

  const handleEdit = (record: InsuranceRecord) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this insurance record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
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
          <h1 className="text-3xl font-semibold tracking-tight">Insurance Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage insurance coverage for trucks and trailers</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Insurance Record
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by unit number, make, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No insurance records found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first insurance record"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Insurance Record
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Make</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.unitNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.unitType === "truck" ? "Truck" : "Trailer"}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.year || "-"}</TableCell>
                    <TableCell>{record.make || "-"}</TableCell>
                    <TableCell>{record.model || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{record.vin || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={record.status === "active" ? "default" : "secondary"}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive"
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

      <InsuranceDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        record={editingRecord}
      />
    </div>
  );
}
