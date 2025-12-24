import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, AlertTriangle, Upload, FileText, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  Inspection, 
  InsertInspection,
  Accident,
  InsertAccident,
  Violation,
  InsertViolation,
  Driver, 
  Truck, 
  Load 
} from "@shared/schema";
import { 
  insertInspectionSchema, 
  insertAccidentSchema, 
  insertViolationSchema 
} from "@shared/schema";
import { format } from "date-fns";

const inspectionFormSchema = insertInspectionSchema.extend({
  truckId: z.string().min(1, "Truck is required"),
  driverId: z.string().min(1, "Driver is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
  status: z.string().min(1, "Status is required"),
  defects: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
});

const accidentFormSchema = insertAccidentSchema.extend({
  driverId: z.string().min(1, "Driver is required"),
  location: z.string().min(1, "Location is required"),
  severity: z.string().min(1, "Severity is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  truckId: z.string().optional(),
  loadId: z.string().optional(),
  policeReportNumber: z.string().optional(),
  insuranceClaimNumber: z.string().optional(),
  injuriesReported: z.number().optional(),
});

const violationFormSchema = insertViolationSchema.extend({
  driverId: z.string().min(1, "Driver is required"),
  violationType: z.string().min(1, "Violation type is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  truckId: z.string().optional(),
  citationNumber: z.string().optional(),
  points: z.number().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionFormSchema>;
type AccidentFormValues = z.infer<typeof accidentFormSchema>;
type ViolationFormValues = z.infer<typeof violationFormSchema>;

interface InspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection?: Inspection | null;
}

function InspectionDialog({ open, onOpenChange, inspection }: InspectionDialogProps) {
  const { toast } = useToast();
  const isEditing = !!inspection;
  const [attachments, setAttachments] = useState<Array<{ filename: string; data: string; type: string }>>([]);

  // Fetch full inspection data including attachments when editing
  const { data: fullInspection } = useQuery<Inspection>({
    queryKey: ['/api/inspections', inspection?.id],
    enabled: open && isEditing && !!inspection?.id,
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      truckId: "",
      driverId: "",
      inspectionType: "",
      inspectionDate: "",
      status: "Pending",
      defects: "",
      notes: "",
      performedBy: "",
    },
  });

  useEffect(() => {
    // Use fullInspection (with attachments) when available, otherwise use inspection from list
    const inspectionData = fullInspection || inspection;
    if (inspectionData) {
      form.reset({
        truckId: inspectionData.truckId,
        driverId: inspectionData.driverId,
        inspectionType: inspectionData.inspectionType,
        inspectionDate: new Date(inspectionData.inspectionDate).toISOString().split("T")[0],
        status: inspectionData.status,
        defects: inspectionData.defects ?? "",
        notes: inspectionData.notes ?? "",
        performedBy: inspectionData.performedBy ?? "",
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullInspection) {
        setAttachments((fullInspection.attachments as any) || []);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setAttachments([]);
      }
    } else {
      form.reset({
        truckId: "",
        driverId: "",
        inspectionType: "",
        inspectionDate: new Date().toISOString().split("T")[0],
        status: "Pending",
        defects: "",
        notes: "",
        performedBy: "",
      });
      setAttachments([]);
    }
  }, [inspection, fullInspection, form]);

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
    link.click();
  };

  const mutation = useMutation({
    mutationFn: async (values: InspectionFormValues) => {
      const payload: any = {
        ...values,
        attachments,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/inspections/${inspection.id}`, payload);
      }
      return await apiRequest("POST", "/api/inspections", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: isEditing ? "Inspection updated" : "Inspection recorded",
        description: `The inspection has been successfully ${isEditing ? "updated" : "recorded"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} inspection. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: InspectionFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Inspection" : "Record Inspection"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update inspection details" : "Record a new safety inspection"}
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
                    <FormLabel>Truck</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-truck">
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.truckNumber}
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
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-driver">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
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
                name="inspectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pre-Trip">Pre-Trip</SelectItem>
                        <SelectItem value="Post-Trip">Post-Trip</SelectItem>
                        <SelectItem value="Annual">Annual</SelectItem>
                        <SelectItem value="DOT">DOT</SelectItem>
                        <SelectItem value="Roadside">Roadside</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inspectionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-inspection-date" />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Passed">Passed</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="performedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performed By</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Inspector name" data-testid="input-performed-by" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="defects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Defects</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="List any defects found..." data-testid="input-defects" />
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
                    <Textarea {...field} rows={3} placeholder="Additional notes..." data-testid="input-inspection-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Attachments {attachments.length > 0 && `(${attachments.length} file${attachments.length > 1 ? 's' : ''})`}</FormLabel>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="inspection-file-upload"
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-inspection-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("inspection-file-upload")?.click()}
                    data-testid="button-upload-inspection-attachment"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {attachments.length > 0 ? 'Add More Files' : 'Upload Files'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Select multiple files • PDF or images • Max 10MB each
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground">Attached files:</p>
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                        data-testid={`inspection-attachment-${index}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{attachment.filename}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(attachment.data.length * 0.75 / 1024).toFixed(0)}KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => downloadAttachment(attachment)}
                            data-testid={`button-download-inspection-${index}`}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAttachment(index)}
                            data-testid={`button-remove-inspection-${index}`}
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-inspection"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-inspection">
                {mutation.isPending ? "Saving..." : isEditing ? "Update Inspection" : "Record Inspection"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AccidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accident?: Accident | null;
}

function AccidentDialog({ open, onOpenChange, accident }: AccidentDialogProps) {
  const { toast } = useToast();
  const isEditing = !!accident;
  const [attachments, setAttachments] = useState<Array<{ filename: string; data: string; type: string }>>([]);

  // Fetch full accident data including attachments when editing
  const { data: fullAccident } = useQuery<Accident>({
    queryKey: ['/api/accidents', accident?.id],
    enabled: open && isEditing && !!accident?.id,
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: loads = [] } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const form = useForm<AccidentFormValues>({
    resolver: zodResolver(accidentFormSchema),
    defaultValues: {
      driverId: "",
      truckId: "",
      loadId: "",
      accidentDate: "",
      location: "",
      severity: "",
      description: "",
      injuriesReported: 0,
      policeReportNumber: "",
      insuranceClaimNumber: "",
      estimatedCost: "",
      status: "Reported",
    },
  });

  useEffect(() => {
    // Use fullAccident (with attachments) when available, otherwise use accident from list
    const accidentData = fullAccident || accident;
    if (accidentData) {
      form.reset({
        driverId: accidentData.driverId,
        truckId: accidentData.truckId ?? "",
        loadId: accidentData.loadId ?? "",
        accidentDate: new Date(accidentData.accidentDate).toISOString().split("T")[0],
        location: accidentData.location,
        severity: accidentData.severity,
        description: accidentData.description,
        injuriesReported: accidentData.injuriesReported ?? 0,
        policeReportNumber: accidentData.policeReportNumber ?? "",
        insuranceClaimNumber: accidentData.insuranceClaimNumber ?? "",
        estimatedCost: accidentData.estimatedCost?.toString() ?? "",
        status: accidentData.status,
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullAccident) {
        setAttachments((fullAccident.attachments as any) || []);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setAttachments([]);
      }
    } else {
      form.reset({
        driverId: "",
        truckId: "",
        loadId: "",
        accidentDate: new Date().toISOString().split("T")[0],
        location: "",
        severity: "",
        description: "",
        injuriesReported: 0,
        policeReportNumber: "",
        insuranceClaimNumber: "",
        estimatedCost: "",
        status: "Reported",
      });
      setAttachments([]);
    }
  }, [accident, fullAccident, form]);

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
    link.click();
  };

  const mutation = useMutation({
    mutationFn: async (values: AccidentFormValues) => {
      const payload: any = {
        ...values,
        attachments,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/accidents/${accident.id}`, payload);
      }
      return await apiRequest("POST", "/api/accidents", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accidents"] });
      toast({
        title: isEditing ? "Accident updated" : "Accident reported",
        description: `The accident has been successfully ${isEditing ? "updated" : "reported"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "report"} accident. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AccidentFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Accident" : "Report Accident"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update accident details" : "Report a new accident or incident"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accident-driver">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
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
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accident-truck">
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.truckNumber}
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
                name="loadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accident-load">
                          <SelectValue placeholder="Select load" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loads.map((load) => (
                          <SelectItem key={load.id} value={load.id}>
                            {load.loadNumber}
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
                name="accidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accident Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-accident-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City, State or Address" data-testid="input-accident-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accident-severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Minor">Minor</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Severe">Severe</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuriesReported"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Injuries Reported</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                        data-testid="input-injuries-reported" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="policeReportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Police Report #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Report number" data-testid="input-police-report" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceClaimNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Claim #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Claim number" data-testid="input-insurance-claim" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-estimated-cost" />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-accident-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Reported">Reported</SelectItem>
                        <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Detailed description of the accident..." data-testid="input-accident-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Attachments {attachments.length > 0 && `(${attachments.length} file${attachments.length > 1 ? 's' : ''})`}</FormLabel>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="accident-file-upload"
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-accident-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("accident-file-upload")?.click()}
                    data-testid="button-upload-accident-attachment"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {attachments.length > 0 ? 'Add More Files' : 'Upload Files'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Select multiple files • PDF or images • Max 10MB each
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground">Attached files:</p>
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                        data-testid={`accident-attachment-${index}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{attachment.filename}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(attachment.data.length * 0.75 / 1024).toFixed(0)}KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => downloadAttachment(attachment)}
                            data-testid={`button-download-accident-${index}`}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAttachment(index)}
                            data-testid={`button-remove-accident-${index}`}
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-accident"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-accident">
                {mutation.isPending ? "Saving..." : isEditing ? "Update Accident" : "Report Accident"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation?: Violation | null;
}

function ViolationDialog({ open, onOpenChange, violation }: ViolationDialogProps) {
  const { toast } = useToast();
  const isEditing = !!violation;
  const [attachments, setAttachments] = useState<Array<{ filename: string; data: string; type: string }>>([]);

  // Fetch full violation data including attachments when editing
  const { data: fullViolation } = useQuery<Violation>({
    queryKey: ['/api/violations', violation?.id],
    enabled: open && isEditing && !!violation?.id,
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const form = useForm<ViolationFormValues>({
    resolver: zodResolver(violationFormSchema),
    defaultValues: {
      driverId: "",
      truckId: "",
      violationType: "",
      violationDate: "",
      location: "",
      description: "",
      citationNumber: "",
      fineAmount: "",
      points: 0,
      status: "Pending",
      dueDate: "",
    },
  });

  useEffect(() => {
    // Use fullViolation (with attachments) when available, otherwise use violation from list
    const violationData = fullViolation || violation;
    if (violationData) {
      form.reset({
        driverId: violationData.driverId,
        truckId: violationData.truckId ?? "",
        violationType: violationData.violationType,
        violationDate: new Date(violationData.violationDate).toISOString().split("T")[0],
        location: violationData.location,
        description: violationData.description,
        citationNumber: violationData.citationNumber ?? "",
        fineAmount: violationData.fineAmount?.toString() ?? "",
        points: violationData.points ?? 0,
        status: violationData.status,
        dueDate: violationData.dueDate ? new Date(violationData.dueDate).toISOString().split("T")[0] : "",
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullViolation) {
        setAttachments((fullViolation.attachments as any) || []);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setAttachments([]);
      }
    } else {
      form.reset({
        driverId: "",
        truckId: "",
        violationType: "",
        violationDate: new Date().toISOString().split("T")[0],
        location: "",
        description: "",
        citationNumber: "",
        fineAmount: "",
        points: 0,
        status: "Pending",
        dueDate: "",
      });
      setAttachments([]);
    }
  }, [violation, fullViolation, form]);

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
    link.click();
  };

  const mutation = useMutation({
    mutationFn: async (values: ViolationFormValues) => {
      const payload: any = {
        ...values,
        attachments,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/violations/${violation.id}`, payload);
      }
      return await apiRequest("POST", "/api/violations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/violations"] });
      toast({
        title: isEditing ? "Violation updated" : "Violation recorded",
        description: `The violation has been successfully ${isEditing ? "updated" : "recorded"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} violation. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ViolationFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Violation" : "Record Violation"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update violation details" : "Record a new traffic or DOT violation"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-violation-driver">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
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
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-violation-truck">
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.truckNumber}
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
                name="violationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Violation Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-violation-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Speeding">Speeding</SelectItem>
                        <SelectItem value="HOS">HOS</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Weight">Weight</SelectItem>
                        <SelectItem value="DOT">DOT</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="violationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Violation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-violation-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City, State" data-testid="input-violation-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="citationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Citation Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Citation #" data-testid="input-citation-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fineAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fine Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-fine-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                        data-testid="input-points" 
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-violation-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Contested">Contested</SelectItem>
                        <SelectItem value="Dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-due-date" />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Violation details..." data-testid="input-violation-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Attachments {attachments.length > 0 && `(${attachments.length} file${attachments.length > 1 ? 's' : ''})`}</FormLabel>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="violation-file-upload"
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-violation-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("violation-file-upload")?.click()}
                    data-testid="button-upload-violation-attachment"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {attachments.length > 0 ? 'Add More Files' : 'Upload Files'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Select multiple files • PDF or images • Max 10MB each
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground">Attached files:</p>
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                        data-testid={`violation-attachment-${index}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{attachment.filename}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(attachment.data.length * 0.75 / 1024).toFixed(0)}KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => downloadAttachment(attachment)}
                            data-testid={`button-download-violation-${index}`}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAttachment(index)}
                            data-testid={`button-remove-violation-${index}`}
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-violation"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-violation">
                {mutation.isPending ? "Saving..." : isEditing ? "Update Violation" : "Record Violation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Safety() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("inspections");
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [isAccidentDialogOpen, setIsAccidentDialogOpen] = useState(false);
  const [isViolationDialogOpen, setIsViolationDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [editingAccident, setEditingAccident] = useState<Accident | null>(null);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const { toast } = useToast();

  const { data: inspections = [], isLoading: loadingInspections } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: accidents = [], isLoading: loadingAccidents } = useQuery<Accident[]>({
    queryKey: ["/api/accidents"],
  });

  const { data: violations = [], isLoading: loadingViolations } = useQuery<Violation[]>({
    queryKey: ["/api/violations"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: "Inspection deleted",
        description: "The inspection has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccidentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/accidents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accidents"] });
      toast({
        title: "Accident deleted",
        description: "The accident has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete accident. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteViolationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/violations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/violations"] });
      toast({
        title: "Violation deleted",
        description: "The violation has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete violation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getTruckNumber = (truckId: string | null) => {
    if (!truckId) return "N/A";
    const truck = trucks.find(t => t.id === truckId);
    return truck?.truckNumber || "Unknown";
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || "Unknown";
  };

  const filteredInspections = inspections.filter((inspection) => {
    const truck = getTruckNumber(inspection.truckId);
    const driver = getDriverName(inspection.driverId);
    const search = searchQuery.toLowerCase();
    return (
      truck.toLowerCase().includes(search) ||
      driver.toLowerCase().includes(search) ||
      inspection.inspectionType.toLowerCase().includes(search) ||
      inspection.status.toLowerCase().includes(search)
    );
  });

  const filteredAccidents = accidents.filter((accident) => {
    const driver = getDriverName(accident.driverId);
    const search = searchQuery.toLowerCase();
    return (
      driver.toLowerCase().includes(search) ||
      accident.location.toLowerCase().includes(search) ||
      accident.severity.toLowerCase().includes(search) ||
      accident.status.toLowerCase().includes(search)
    );
  });

  const filteredViolations = violations.filter((violation) => {
    const driver = getDriverName(violation.driverId);
    const search = searchQuery.toLowerCase();
    return (
      driver.toLowerCase().includes(search) ||
      violation.violationType.toLowerCase().includes(search) ||
      violation.location.toLowerCase().includes(search) ||
      violation.status.toLowerCase().includes(search) ||
      (violation.citationNumber && violation.citationNumber.toLowerCase().includes(search))
    );
  });

  const handleEditInspection = (inspection: Inspection) => {
    setEditingInspection(inspection);
    setIsInspectionDialogOpen(true);
  };

  const handleEditAccident = (accident: Accident) => {
    setEditingAccident(accident);
    setIsAccidentDialogOpen(true);
  };

  const handleEditViolation = (violation: Violation) => {
    setEditingViolation(violation);
    setIsViolationDialogOpen(true);
  };

  const handleDeleteInspection = (id: string) => {
    if (confirm("Are you sure you want to delete this inspection?")) {
      deleteInspectionMutation.mutate(id);
    }
  };

  const handleDeleteAccident = (id: string) => {
    if (confirm("Are you sure you want to delete this accident record?")) {
      deleteAccidentMutation.mutate(id);
    }
  };

  const handleDeleteViolation = (id: string) => {
    if (confirm("Are you sure you want to delete this violation?")) {
      deleteViolationMutation.mutate(id);
    }
  };

  const handleInspectionDialogClose = () => {
    setIsInspectionDialogOpen(false);
    setEditingInspection(null);
  };

  const handleAccidentDialogClose = () => {
    setIsAccidentDialogOpen(false);
    setEditingAccident(null);
  };

  const handleViolationDialogClose = () => {
    setIsViolationDialogOpen(false);
    setEditingViolation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Safety & Compliance</h1>
          <p className="text-sm text-muted-foreground">Manage inspections, accidents, and violations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-safety">
          <TabsTrigger value="inspections" data-testid="tab-inspections">Inspections</TabsTrigger>
          <TabsTrigger value="accidents" data-testid="tab-accidents">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Accidents
          </TabsTrigger>
          <TabsTrigger value="violations" data-testid="tab-violations">Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search inspections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-inspections"
                />
              </div>
              <Button
                onClick={() => setIsInspectionDialogOpen(true)}
                data-testid="button-record-inspection"
              >
                <Plus className="mr-2 h-4 w-4" />
                Record Inspection
              </Button>
            </div>

            {loadingInspections ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">No inspections found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search" : "Get started by recording your first inspection"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsInspectionDialogOpen(true)} data-testid="button-empty-record-inspection">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Inspection
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
                      <TableHead>Driver</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Defects</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInspections.map((inspection) => (
                      <TableRow key={inspection.id} data-testid={`row-inspection-${inspection.id}`}>
                        <TableCell data-testid={`text-inspection-date-${inspection.id}`}>
                          {format(new Date(inspection.inspectionDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`text-inspection-truck-${inspection.id}`}>
                          {getTruckNumber(inspection.truckId)}
                        </TableCell>
                        <TableCell data-testid={`text-inspection-driver-${inspection.id}`}>
                          {getDriverName(inspection.driverId)}
                        </TableCell>
                        <TableCell data-testid={`text-inspection-type-${inspection.id}`}>
                          {inspection.inspectionType}
                        </TableCell>
                        <TableCell data-testid={`status-inspection-${inspection.id}`}>
                          <StatusBadge status={inspection.status} />
                        </TableCell>
                        <TableCell data-testid={`text-inspection-defects-${inspection.id}`}>
                          {inspection.defects ? (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                              {inspection.defects}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-inspection-${inspection.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditInspection(inspection)} data-testid={`button-edit-inspection-${inspection.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteInspection(inspection.id)} 
                                className="text-destructive"
                                data-testid={`button-delete-inspection-${inspection.id}`}
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
        </TabsContent>

        <TabsContent value="accidents" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-accidents"
                />
              </div>
              <Button
                onClick={() => setIsAccidentDialogOpen(true)}
                data-testid="button-report-accident"
              >
                <Plus className="mr-2 h-4 w-4" />
                Report Accident
              </Button>
            </div>

            {loadingAccidents ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredAccidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">No accidents found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search" : "No accidents have been reported"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsAccidentDialogOpen(true)} data-testid="button-empty-report-accident">
                    <Plus className="mr-2 h-4 w-4" />
                    Report Accident
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Truck</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Injuries</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccidents.map((accident) => (
                      <TableRow key={accident.id} data-testid={`row-accident-${accident.id}`}>
                        <TableCell data-testid={`text-accident-date-${accident.id}`}>
                          {format(new Date(accident.accidentDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`text-accident-driver-${accident.id}`}>
                          {getDriverName(accident.driverId)}
                        </TableCell>
                        <TableCell data-testid={`text-accident-truck-${accident.id}`}>
                          {getTruckNumber(accident.truckId)}
                        </TableCell>
                        <TableCell data-testid={`text-accident-location-${accident.id}`}>
                          {accident.location}
                        </TableCell>
                        <TableCell data-testid={`text-accident-severity-${accident.id}`}>
                          <StatusBadge status={accident.severity} />
                        </TableCell>
                        <TableCell data-testid={`text-accident-injuries-${accident.id}`}>
                          {accident.injuriesReported || 0}
                        </TableCell>
                        <TableCell data-testid={`status-accident-${accident.id}`}>
                          <StatusBadge status={accident.status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-accident-${accident.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAccident(accident)} data-testid={`button-edit-accident-${accident.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAccident(accident.id)} 
                                className="text-destructive"
                                data-testid={`button-delete-accident-${accident.id}`}
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
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search violations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-violations"
                />
              </div>
              <Button
                onClick={() => setIsViolationDialogOpen(true)}
                data-testid="button-record-violation"
              >
                <Plus className="mr-2 h-4 w-4" />
                Record Violation
              </Button>
            </div>

            {loadingViolations ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-medium">No violations found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search" : "No violations have been recorded"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsViolationDialogOpen(true)} data-testid="button-empty-record-violation">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Violation
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Citation #</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((violation) => (
                      <TableRow key={violation.id} data-testid={`row-violation-${violation.id}`}>
                        <TableCell data-testid={`text-violation-date-${violation.id}`}>
                          {format(new Date(violation.violationDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`text-violation-driver-${violation.id}`}>
                          {getDriverName(violation.driverId)}
                        </TableCell>
                        <TableCell data-testid={`text-violation-type-${violation.id}`}>
                          {violation.violationType}
                        </TableCell>
                        <TableCell data-testid={`text-violation-citation-${violation.id}`}>
                          {violation.citationNumber || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-violation-fine-${violation.id}`}>
                          {violation.fineAmount ? `$${Number(violation.fineAmount).toFixed(2)}` : "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-violation-points-${violation.id}`}>
                          {violation.points || 0}
                        </TableCell>
                        <TableCell data-testid={`status-violation-${violation.id}`}>
                          <StatusBadge status={violation.status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-violation-${violation.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditViolation(violation)} data-testid={`button-edit-violation-${violation.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteViolation(violation.id)} 
                                className="text-destructive"
                                data-testid={`button-delete-violation-${violation.id}`}
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
        </TabsContent>
      </Tabs>

      <InspectionDialog
        open={isInspectionDialogOpen}
        onOpenChange={handleInspectionDialogClose}
        inspection={editingInspection}
      />

      <AccidentDialog
        open={isAccidentDialogOpen}
        onOpenChange={handleAccidentDialogClose}
        accident={editingAccident}
      />

      <ViolationDialog
        open={isViolationDialogOpen}
        onOpenChange={handleViolationDialogClose}
        violation={editingViolation}
      />
    </div>
  );
}
