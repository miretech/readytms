import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, AlertCircle, FileText, Download, X, Upload, Bell } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Maintenance, Truck } from "@shared/schema";
import { insertMaintenanceSchema } from "@shared/schema";

const maintenanceFormSchema = insertMaintenanceSchema.extend({
  truckId: z.string().min(1, "Truck is required"),
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  serviceDate: z.string().min(1, "Service date is required"),
  cost: z.string().min(1, "Cost is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  mileage: z.number().optional().or(z.string().optional()),
  vendor: z.string().optional(),
  nextServiceMileage: z.number().optional().or(z.string().optional()),
  nextServiceDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance | null;
}

function MaintenanceDialog({ open, onOpenChange, maintenance }: MaintenanceDialogProps) {
  const { toast } = useToast();
  const isEditing = !!maintenance;
  const [attachments, setAttachments] = useState<Array<{ filename: string; data: string; type: string }>>([]);

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      truckId: "",
      maintenanceType: "",
      serviceDate: "",
      mileage: "",
      cost: "",
      vendor: "",
      description: "",
      nextServiceMileage: "",
      nextServiceDate: "",
      status: "Scheduled",
      invoiceNumber: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (maintenance) {
      form.reset({
        truckId: maintenance.truckId,
        maintenanceType: maintenance.maintenanceType,
        serviceDate: new Date(maintenance.serviceDate).toISOString().split("T")[0],
        mileage: maintenance.mileage?.toString() || "",
        cost: maintenance.cost,
        vendor: maintenance.vendor || "",
        description: maintenance.description,
        nextServiceMileage: maintenance.nextServiceMileage?.toString() || "",
        nextServiceDate: maintenance.nextServiceDate
          ? new Date(maintenance.nextServiceDate).toISOString().split("T")[0]
          : "",
        status: maintenance.status,
        invoiceNumber: maintenance.invoiceNumber || "",
        notes: maintenance.notes || "",
      });
      setAttachments((maintenance.attachments as any) || []);
    } else {
      form.reset({
        truckId: "",
        maintenanceType: "",
        serviceDate: new Date().toISOString().split("T")[0],
        mileage: "",
        cost: "",
        vendor: "",
        description: "",
        nextServiceMileage: "",
        nextServiceDate: "",
        status: "Scheduled",
        invoiceNumber: "",
        notes: "",
      });
      setAttachments([]);
    }
  }, [maintenance, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Array<{ filename: string; data: string; type: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          filename: file.name,
          data: base64,
          type: file.type,
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setAttachments([...attachments, ...newAttachments]);
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const downloadAttachment = (attachment: { filename: string; data: string; type: string }) => {
    const link = document.createElement("a");
    link.href = attachment.data;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const payload: any = {
        ...values,
        mileage: values.mileage ? Number(values.mileage) : undefined,
        nextServiceMileage: values.nextServiceMileage ? Number(values.nextServiceMileage) : undefined,
        nextServiceDate: values.nextServiceDate || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (isEditing) {
        return await apiRequest("PATCH", `/api/maintenance/${maintenance.id}`, payload);
      }
      return await apiRequest("POST", "/api/maintenance", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: isEditing ? "Maintenance updated" : "Maintenance recorded",
        description: `The service record has been successfully ${isEditing ? "updated" : "recorded"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} maintenance. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: MaintenanceFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service Record" : "Add Service Record"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update maintenance details" : "Record a new maintenance service"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-maintenance-truck">
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.truckNumber} - {truck.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-maintenance-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Oil Change">Oil Change</SelectItem>
                        <SelectItem value="Tire Rotation">Tire Rotation</SelectItem>
                        <SelectItem value="Brake Service">Brake Service</SelectItem>
                        <SelectItem value="Engine Repair">Engine Repair</SelectItem>
                        <SelectItem value="Transmission">Transmission</SelectItem>
                        <SelectItem value="Inspection">Inspection</SelectItem>
                        <SelectItem value="PM Service">PM Service</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-service-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mileage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter mileage"
                        {...field}
                        data-testid="input-mileage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter vendor name"
                        {...field}
                        data-testid="input-vendor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter invoice number"
                        {...field}
                        data-testid="input-invoice-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextServiceMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Service Mileage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter mileage"
                        {...field}
                        data-testid="input-next-service-mileage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextServiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Service Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-next-service-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the maintenance performed"
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes"
                      {...field}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Attachments</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  data-testid="button-upload-attachment"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <span className="text-sm text-muted-foreground">
                  PDF or images (max 10MB each)
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded-md"
                      data-testid={`attachment-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{attachment.filename}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => downloadAttachment(attachment)}
                          data-testid={`button-download-${index}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeAttachment(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getMaintenanceTypeBadge(type: string) {
  const variants: Record<string, string> = {
    "Oil Change": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "Tire Rotation": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    "Brake Service": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    "Engine Repair": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Transmission": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    "Inspection": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "PM Service": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    "Other": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <Badge className={variants[type] || variants["Other"]} data-testid={`badge-type-${type}`}>
      {type}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    "Scheduled": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "Cancelled": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <Badge className={variants[status] || variants["Scheduled"]} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

export default function Maintenance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const { toast } = useToast();

  const { data: maintenanceRecords = [], isLoading } = useQuery<Maintenance[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      toast({
        title: "Maintenance deleted",
        description: "The service record has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete maintenance record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getTruckInfo = (truckId: string) => {
    const truck = trucks.find((t) => t.id === truckId);
    return truck ? `${truck.truckNumber} - ${truck.type}` : "Unknown";
  };

  const filteredRecords = maintenanceRecords.filter((record) => {
    const truck = trucks.find((t) => t.id === record.truckId);
    const truckNumber = truck?.truckNumber.toLowerCase() || "";
    const vendor = record.vendor?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    return truckNumber.includes(query) || vendor.includes(query);
  });

  const isOverdue = (nextServiceDate: Date | null) => {
    if (!nextServiceDate) return false;
    return new Date(nextServiceDate) < new Date();
  };

  const handleEdit = (record: Maintenance) => {
    setEditingMaintenance(record);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this maintenance record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingMaintenance(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const checkRemindersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/maintenance/check-reminders", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Maintenance reminders checked",
        description: `Sent ${data.sent} reminder(s) to drivers. Skipped ${data.skipped} record(s).`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check maintenance reminders. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Track vehicle service and repairs</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => checkRemindersMutation.mutate()}
            disabled={checkRemindersMutation.isPending}
            data-testid="button-check-reminders"
          >
            <Bell className="mr-2 h-4 w-4" />
            {checkRemindersMutation.isPending ? "Checking..." : "Send Reminders"}
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            data-testid="button-add-service-record"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service Record
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by truck number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-maintenance"
            />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No maintenance records found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first service record"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-add-service">
                <Plus className="mr-2 h-4 w-4" />
                Add Service Record
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`row-maintenance-${record.id}`}>
                    <TableCell className="font-medium">
                      {new Date(record.serviceDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getTruckInfo(record.truckId)}</TableCell>
                    <TableCell>{getMaintenanceTypeBadge(record.maintenanceType)}</TableCell>
                    <TableCell>{record.vendor || "-"}</TableCell>
                    <TableCell className="font-semibold">
                      ${Number(record.cost).toLocaleString()}
                    </TableCell>
                    <TableCell>{record.mileage?.toLocaleString() || "-"}</TableCell>
                    <TableCell>
                      {record.nextServiceDate || record.nextServiceMileage ? (
                        <div className={isOverdue(record.nextServiceDate) ? "text-destructive" : ""}>
                          {record.nextServiceDate && (
                            <div className="flex items-center gap-1">
                              {isOverdue(record.nextServiceDate) && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {new Date(record.nextServiceDate).toLocaleDateString()}
                            </div>
                          )}
                          {record.nextServiceMileage && (
                            <div className="text-xs text-muted-foreground">
                              {record.nextServiceMileage.toLocaleString()} mi
                            </div>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.attachments && (record.attachments as any).length > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{(record.attachments as any).length}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${record.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(record)}
                            data-testid={`button-edit-${record.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${record.id}`}
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

      <MaintenanceDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        maintenance={editingMaintenance}
      />
    </div>
  );
}
