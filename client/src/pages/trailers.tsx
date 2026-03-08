import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, Shield, DollarSign, Calendar, AlertTriangle, XCircle, Paperclip, Download, FileText, Image, Wrench } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { TrailerDialog } from "@/components/trailer-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck as TruckIcon } from "lucide-react";
import type { Trailer, Truck } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileAttachment {
  fileName: string;
  fileData: string;
  uploadedAt: string;
}

export default function Trailers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [viewingTrailer, setViewingTrailer] = useState<Trailer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: trailers = [], isLoading } = useQuery<Trailer[]>({
    queryKey: ["/api/trailers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  // Fetch full trailer data (with attachments) when viewing
  const { data: fullViewTrailer } = useQuery<Trailer>({
    queryKey: ["/api/trailers", viewingTrailer?.id],
    enabled: isViewDialogOpen && !!viewingTrailer?.id,
  });

  const truckMap = new Map(trucks.map((t) => [t.id, t.truckNumber]));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trailers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trailers"] });
      toast({ title: "Trailer deleted", description: "The trailer has been successfully deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete trailer. Please try again.", variant: "destructive" });
    },
  });

  const filteredTrailers = trailers
    .filter((trailer) =>
      trailer.trailerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trailer.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trailer.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.trailerNumber.replace(/\D/g, ''));
      const numB = parseInt(b.trailerNumber.replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.trailerNumber.localeCompare(b.trailerNumber);
    });

  const handleRowClick = (trailer: Trailer) => {
    setViewingTrailer(trailer);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (trailer: Trailer) => {
    setIsViewDialogOpen(false);
    setViewingTrailer(null);
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

  const handleDownload = (file: FileAttachment) => {
    const link = document.createElement("a");
    link.href = file.fileData;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = (fileName: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

  const displayTrailer = fullViewTrailer || viewingTrailer;

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
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-trailer">
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
                  <TableRow
                    key={trailer.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(trailer)}
                    data-testid={`row-trailer-${trailer.id}`}
                  >
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${trailer.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(trailer)} data-testid={`button-edit-${trailer.id}`}>
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

      {/* View Trailer Dialog */}
      {viewingTrailer && (
        <Dialog
          open={isViewDialogOpen}
          onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setViewingTrailer(null); }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-6">
                <div>
                  <DialogTitle className="text-xl">{displayTrailer?.trailerNumber}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    {displayTrailer && <StatusBadge status={displayTrailer.status as any} type="trailer" />}
                    <span>{displayTrailer?.type}</span>
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => displayTrailer && handleEdit(displayTrailer)}
                  data-testid="button-view-edit-trailer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </DialogHeader>

            {displayTrailer && (
              <Tabs defaultValue="details" className="mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="tolls">
                    Tolls
                    {((displayTrailer.tollsAttachments as FileAttachment[]) || []).length > 0 && (
                      <Badge variant="secondary" className="ml-1.5">
                        {((displayTrailer.tollsAttachments as FileAttachment[]) || []).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pictures">
                    Pictures
                    {((displayTrailer.pickupPictures as FileAttachment[]) || []).length > 0 && (
                      <Badge variant="secondary" className="ml-1.5">
                        {((displayTrailer.pickupPictures as FileAttachment[]) || []).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">License Plate</p>
                      <p className="text-sm font-medium font-mono">{displayTrailer.licensePlate || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">VIN</p>
                      <p className="text-sm font-medium font-mono">{displayTrailer.vin || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Year / Make / Model</p>
                      <p className="text-sm font-medium">
                        {[displayTrailer.year, displayTrailer.make, displayTrailer.model].filter(Boolean).join(" ") || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hauling Truck</p>
                      {displayTrailer.haulingTruckId && truckMap.has(displayTrailer.haulingTruckId) ? (
                        <div className="flex items-center gap-1.5">
                          <TruckIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-sm font-medium">{truckMap.get(displayTrailer.haulingTruckId)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                    {displayTrailer.rentPerMonth && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rent / Month</p>
                        <p className="text-sm font-medium">
                          ${parseFloat(displayTrailer.rentPerMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Dates
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Pickup Date</p>
                      <p className="text-sm font-medium">
                        {displayTrailer.pickupDate ? new Date(displayTrailer.pickupDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Drop Off Date</p>
                      <p className="text-sm font-medium">
                        {displayTrailer.dropOffDate ? new Date(displayTrailer.dropOffDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Terminated Date</p>
                      <p className="text-sm font-medium">
                        {displayTrailer.terminatedDate ? new Date(displayTrailer.terminatedDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>

                  {(displayTrailer.repairs || ((displayTrailer.repairsAttachments as FileAttachment[]) || []).length > 0) && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5" /> Repairs & Maintenance
                      </p>
                      {displayTrailer.repairs && (
                        <p className="text-sm whitespace-pre-wrap">{displayTrailer.repairs}</p>
                      )}
                      {((displayTrailer.repairsAttachments as FileAttachment[]) || []).length > 0 && (
                        <div className="space-y-2">
                          {((displayTrailer.repairsAttachments as FileAttachment[]) || []).map((file, i) => (
                            <div key={i} className="flex items-center justify-between rounded-md border p-3 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isImage(file.fileName)
                                  ? <Image className="h-4 w-4 text-blue-500 shrink-0" />
                                  : <FileText className="h-4 w-4 text-red-500 shrink-0" />}
                                <p className="text-sm truncate">{file.fileName}</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                                <Download className="mr-2 h-4 w-4" /> Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="font-medium">Insurance Information</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider</p>
                      <p className="text-sm font-medium">{displayTrailer.insuranceProvider || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Policy Number</p>
                      <p className="text-sm font-medium">{displayTrailer.insurancePolicyNumber || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expiration Date</p>
                      {displayTrailer.insuranceExpirationDate ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {new Date(displayTrailer.insuranceExpirationDate).toLocaleDateString()}
                          </p>
                          <Badge
                            variant={new Date(displayTrailer.insuranceExpirationDate) < new Date() ? "destructive" :
                              new Date(displayTrailer.insuranceExpirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "secondary" : "outline"}
                          >
                            {new Date(displayTrailer.insuranceExpirationDate) < new Date() ? "Expired" :
                              new Date(displayTrailer.insuranceExpirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "Expiring Soon" : "Valid"}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tolls Tab */}
                <TabsContent value="tolls" className="space-y-4 mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" /> Toll Documents
                  </p>
                  {((displayTrailer.tollsAttachments as FileAttachment[]) || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No toll documents attached.</p>
                  ) : (
                    <div className="space-y-2">
                      {((displayTrailer.tollsAttachments as FileAttachment[]) || []).map((file, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border p-3 gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {isImage(file.fileName) ? (
                              <img src={file.fileData} alt={file.fileName} className="h-10 w-10 rounded object-cover border shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Pictures Tab */}
                <TabsContent value="pictures" className="space-y-4 mt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Image className="h-3.5 w-3.5" /> Pickup Pictures
                  </p>
                  {((displayTrailer.pickupPictures as FileAttachment[]) || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pickup pictures attached.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {((displayTrailer.pickupPictures as FileAttachment[]) || []).map((file, i) => (
                        <div key={i} className="rounded-md border overflow-hidden">
                          {isImage(file.fileName) ? (
                            <img src={file.fileData} alt={file.fileName} className="w-full h-40 object-cover" />
                          ) : (
                            <div className="h-40 bg-muted flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium truncate">{file.fileName}</p>
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      )}

      <TrailerDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        trailer={editingTrailer}
      />
    </div>
  );
}
