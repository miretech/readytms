import { useEffect, useState, useCallback } from "react";

// Converts any stored date string (MM/DD/YYYY or ISO) to YYYY-MM-DD for <input type="date">
function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { insertTrailerSchema, type Trailer, type Truck, type TrailerTruckAssignment, type TrailerDotInspection } from "@shared/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, Calendar, Shield, DollarSign, Wrench, Receipt, Camera, Plus, Trash2, History, CheckCircle2, ClipboardCheck } from "lucide-react";

interface FileAttachment {
  fileName: string;
  fileData: string;
  uploadedAt: string;
}

const formSchema = insertTrailerSchema.extend({
  trailerNumber: z.string().min(1, "Trailer number is required"),
  type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  licensePlate: z.string().min(1, "License plate is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailer?: Trailer | null;
}

export function TrailerDialog({ open, onOpenChange, trailer }: TrailerDialogProps) {
  const { toast } = useToast();
  const isEditing = !!trailer;
  const [tollsFiles, setTollsFiles] = useState<FileAttachment[]>([]);
  const [pickupPictures, setPickupPictures] = useState<FileAttachment[]>([]);
  const [repairsAttachments, setRepairsAttachments] = useState<FileAttachment[]>([]);

  // Truck assignment form state
  const [assignTruckId, setAssignTruckId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignFormError, setAssignFormError] = useState("");

  // Editing an existing assignment's end date
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingEndDate, setEditingEndDate] = useState("");

  // DOT inspection form state
  const [dotIssueDate, setDotIssueDate] = useState("");
  const [dotExpirationDate, setDotExpirationDate] = useState("");
  const [dotShopName, setDotShopName] = useState("");
  const [dotShopAddress, setDotShopAddress] = useState("");
  const [dotResult, setDotResult] = useState("");
  const [dotNotes, setDotNotes] = useState("");
  const [dotAttachments, setDotAttachments] = useState<FileAttachment[]>([]);
  const [dotFormError, setDotFormError] = useState("");

  // Fetch full trailer data including attachments when editing
  const { data: fullTrailer } = useQuery<Trailer>({
    queryKey: ['/api/trailers', trailer?.id],
    enabled: open && isEditing && !!trailer?.id,
  });

  // Fetch trucks for the hauling truck selector
  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ['/api/trucks'],
    enabled: open,
  });

  // Fetch assignment history for this trailer
  const { data: assignments = [] } = useQuery<TrailerTruckAssignment[]>({
    queryKey: ['/api/trailers', trailer?.id, 'assignments'],
    queryFn: async () => {
      const res = await fetch(`/api/trailers/${trailer!.id}/assignments`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: open && isEditing && !!trailer?.id,
  });

  const truckMap = new Map(trucks.map((t) => [t.id, t.truckNumber]));

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/trailers/${trailer!.id}/assignments`, {
        truckId: assignTruckId,
        startDate: assignStartDate,
        endDate: assignEndDate || undefined,
        notes: assignNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trailers', trailer!.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trailers'] });
      setAssignTruckId("");
      setAssignStartDate("");
      setAssignEndDate("");
      setAssignNotes("");
      setAssignFormError("");
      toast({ title: "Assignment added", description: "Truck assignment recorded successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add assignment.", variant: "destructive" });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      return await apiRequest("PATCH", `/api/trailer-assignments/${id}`, { endDate: endDate || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trailers', trailer!.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trailers'] });
      setEditingAssignmentId(null);
      setEditingEndDate("");
      toast({ title: "Assignment updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update assignment.", variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trailer-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trailers', trailer!.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trailers'] });
      toast({ title: "Assignment removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove assignment.", variant: "destructive" });
    },
  });

  // Fetch DOT inspections for this trailer
  const { data: dotInspections = [] } = useQuery<TrailerDotInspection[]>({
    queryKey: ['/api/trailers', trailer?.id, 'dot-inspections'],
    queryFn: async () => {
      const res = await fetch(`/api/trailers/${trailer!.id}/dot-inspections`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: open && isEditing && !!trailer?.id,
  });

  const createDotInspectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/trailers/${trailer!.id}/dot-inspections`, {
        issueDate: dotIssueDate || undefined,
        expirationDate: dotExpirationDate || undefined,
        shopName: dotShopName || undefined,
        shopAddress: dotShopAddress || undefined,
        result: dotResult || undefined,
        notes: dotNotes || undefined,
        attachments: dotAttachments.length > 0 ? dotAttachments : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trailers', trailer!.id, 'dot-inspections'] });
      setDotIssueDate(""); setDotExpirationDate(""); setDotShopName("");
      setDotShopAddress(""); setDotResult(""); setDotNotes("");
      setDotAttachments([]); setDotFormError("");
      toast({ title: "DOT inspection added", description: "Inspection record saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save inspection.", variant: "destructive" });
    },
  });

  const deleteDotInspectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/trailer-dot-inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trailers', trailer!.id, 'dot-inspections'] });
      toast({ title: "Inspection removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove inspection.", variant: "destructive" });
    },
  });

  const handleAddDotInspection = () => {
    if (!dotIssueDate && !dotExpirationDate && !dotShopName) {
      setDotFormError("Please fill in at least one field (issue date, expiration date, or shop name)");
      return;
    }
    setDotFormError("");
    createDotInspectionMutation.mutate();
  };

  const handleAddAssignment = () => {
    if (!assignTruckId) { setAssignFormError("Please select a truck"); return; }
    if (!assignStartDate) { setAssignFormError("Please set a start date"); return; }
    setAssignFormError("");
    createAssignmentMutation.mutate();
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trailerNumber: "",
      type: "",
      status: "available",
      licensePlate: "",
      vin: "",
      year: undefined,
      make: "",
      model: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      insuranceExpirationDate: "",
      pickupDate: "",
      dropOffDate: "",
      terminatedDate: "",
      repairs: "",
      rentPerMonth: "",
      haulingTruckId: "",
    },
  });

  useEffect(() => {
    // Use fullTrailer (with attachments) when available, otherwise use trailer from list
    const trailerData = fullTrailer || trailer;
    if (trailerData) {
      form.reset({
        trailerNumber: trailerData.trailerNumber,
        type: trailerData.type,
        status: trailerData.status,
        licensePlate: trailerData.licensePlate,
        vin: trailerData.vin || "",
        year: trailerData.year || undefined,
        make: trailerData.make || "",
        model: trailerData.model || "",
        insuranceProvider: trailerData.insuranceProvider || "",
        insurancePolicyNumber: trailerData.insurancePolicyNumber || "",
        insuranceExpirationDate: toInputDate(trailerData.insuranceExpirationDate),
        pickupDate: toInputDate(trailerData.pickupDate),
        dropOffDate: toInputDate(trailerData.dropOffDate),
        terminatedDate: toInputDate(trailerData.terminatedDate),
        repairs: trailerData.repairs || "",
        rentPerMonth: trailerData.rentPerMonth || "",
        haulingTruckId: trailerData.haulingTruckId || "",
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullTrailer) {
        setTollsFiles((fullTrailer.tollsAttachments as FileAttachment[]) || []);
        setPickupPictures((fullTrailer.pickupPictures as FileAttachment[]) || []);
        setRepairsAttachments((fullTrailer.repairsAttachments as FileAttachment[]) || []);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setTollsFiles([]);
        setPickupPictures([]);
        setRepairsAttachments([]);
      }
    } else {
      form.reset({
        trailerNumber: "",
        type: "",
        status: "available",
        licensePlate: "",
        vin: "",
        year: undefined,
        make: "",
        model: "",
        insuranceProvider: "",
        insurancePolicyNumber: "",
        insuranceExpirationDate: "",
        pickupDate: "",
        dropOffDate: "",
        terminatedDate: "",
        repairs: "",
        rentPerMonth: "",
        haulingTruckId: "",
      });
      setTollsFiles([]);
      setPickupPictures([]);
      setRepairsAttachments([]);
    }
  }, [trailer, fullTrailer, form, open]);

  const handleFileUpload = useCallback((
    acceptedFiles: File[],
    setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>
  ) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileData: base64,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = (index: number, setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const tollsDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setTollsFiles),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const picturesDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setPickupPictures),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const repairsDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setRepairsAttachments),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const dotDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setDotAttachments),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        rentPerMonth: values.rentPerMonth && values.rentPerMonth !== "" ? values.rentPerMonth : undefined,
        insuranceProvider: values.insuranceProvider || undefined,
        insurancePolicyNumber: values.insurancePolicyNumber || undefined,
        insuranceExpirationDate: values.insuranceExpirationDate || undefined,
        pickupDate: values.pickupDate || undefined,
        dropOffDate: values.dropOffDate || undefined,
        terminatedDate: values.terminatedDate || undefined,
        repairs: values.repairs || undefined,
        vin: values.vin || undefined,
        make: values.make || undefined,
        model: values.model || undefined,
        haulingTruckId: values.haulingTruckId || null,
        tollsAttachments: tollsFiles.length > 0 ? tollsFiles : undefined,
        pickupPictures: pickupPictures.length > 0 ? pickupPictures : undefined,
        repairsAttachments: repairsAttachments.length > 0 ? repairsAttachments : undefined,
      };
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/trailers/${trailer.id}`, payload);
        return await res.json() as Trailer;
      }
      const res = await apiRequest("POST", "/api/trailers", payload);
      return await res.json() as Trailer;
    },
    onSuccess: (savedTrailer) => {
      // Immediately write the fresh trailer into both caches — no refetch race condition
      queryClient.setQueryData(["/api/trailers", savedTrailer.id], savedTrailer);
      queryClient.setQueriesData<Trailer[]>(
        { queryKey: ["/api/trailers"] },
        (old) => {
          if (!Array.isArray(old)) return old;
          const exists = old.some((t) => t.id === savedTrailer.id);
          return exists
            ? old.map((t) => (t.id === savedTrailer.id ? savedTrailer : t))
            : [...old, savedTrailer];
        }
      );
      // Also mark stale so a background refetch picks up any server-side changes
      queryClient.invalidateQueries({ queryKey: ["/api/trailers"] });
      toast({
        title: isEditing ? "Trailer updated" : "Trailer added",
        description: `The trailer has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} trailer. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Trailer" : "Add New Trailer"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update trailer information" : "Add a new trailer to your inventory"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className={`grid w-full ${isEditing ? "grid-cols-7" : "grid-cols-5"}`}>
                  <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="insurance" data-testid="tab-insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="dates" data-testid="tab-dates">Dates & Rent</TabsTrigger>
                  <TabsTrigger value="tolls" data-testid="tab-tolls">Tolls</TabsTrigger>
                  <TabsTrigger value="pictures" data-testid="tab-pictures">Pictures</TabsTrigger>
                  {isEditing && (
                    <TabsTrigger value="dot-inspection" data-testid="tab-dot-inspection">
                      DOT Insp.
                    </TabsTrigger>
                  )}
                  {isEditing && (
                    <TabsTrigger value="truck-history" data-testid="tab-truck-history">
                      Truck History
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="trailerNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trailer Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="TR-001" data-testid="input-trailer-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trailer Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-trailer-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Dry Van">Dry Van</SelectItem>
                              <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                              <SelectItem value="Flatbed">Flatbed</SelectItem>
                              <SelectItem value="Step Deck">Step Deck</SelectItem>
                              <SelectItem value="Tanker">Tanker</SelectItem>
                              <SelectItem value="Lowboy">Lowboy</SelectItem>
                              <SelectItem value="Conestoga">Conestoga</SelectItem>
                            </SelectContent>
                          </Select>
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
                              <SelectTrigger data-testid="select-trailer-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="in-use">In Use</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="out-of-service">Out of Service</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="haulingTruckId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hauling Truck (Optional)</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-hauling-truck">
                                <SelectValue placeholder="Select truck" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
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
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="XYZ-5678" data-testid="input-license-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="1ZVBP8AM7D5220313" data-testid="input-vin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ""}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="2024" 
                              data-testid="input-year" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Utility" data-testid="input-make" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="3000R" data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Repairs Section in Basic Tab */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Repairs & Maintenance</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="repairs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repair Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter repair notes (tires, brakes, lights, etc.)"
                              className="min-h-[80px]"
                              data-testid="input-repairs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Repairs Attachments Upload */}
                    <div className="mt-4">
                      <FormLabel>Repair Receipts & Documents</FormLabel>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload tire repairs, maintenance receipts, service records (PDF/Images, max 10MB each)
                      </p>
                      <div
                        {...repairsDropzone.getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          repairsDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                      >
                        <input {...repairsDropzone.getInputProps()} data-testid="input-repairs-upload" />
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {repairsDropzone.isDragActive ? "Drop files here" : "Click or drag files to upload"}
                        </p>
                      </div>
                      
                      {repairsAttachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium">Uploaded Documents ({repairsAttachments.length})</p>
                          <div className="grid gap-2">
                            {repairsAttachments.map((file, index) => (
                              <Card key={index} className="p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {file.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                      <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    )}
                                    <span className="text-sm truncate">{file.fileName}</span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = file.fileData;
                                        link.download = file.fileName;
                                        link.click();
                                      }}
                                      data-testid={`button-download-repair-${index}`}
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => removeFile(index, setRepairsAttachments)}
                                      data-testid={`button-remove-repair-${index}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Insurance Tab */}
                <TabsContent value="insurance" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Insurance Information</h3>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="insuranceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Progressive, State Farm, etc." data-testid="input-insurance-provider" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insurancePolicyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="POL-123456789" data-testid="input-insurance-policy" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceExpirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Expiration Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-insurance-expiration" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Dates & Rent Tab */}
                <TabsContent value="dates" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Dates & Rental Information</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pick Up Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-pickup-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dropOffDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drop Off Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-dropoff-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="terminatedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terminated Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-terminated-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Rental Cost</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="rentPerMonth"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel>Rent Per Month ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              {...field} 
                              value={field.value || ""} 
                              placeholder="1500.00"
                              data-testid="input-rent-per-month" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tolls Tab */}
                <TabsContent value="tolls" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Tolls Attachments</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload toll receipts and documents (PDF or images, max 10MB each)
                  </p>

                  <div
                    {...tollsDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      tollsDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                  >
                    <input {...tollsDropzone.getInputProps()} data-testid="input-tolls-upload" />
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Drop toll files here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, GIF up to 10MB</p>
                  </div>

                  {tollsFiles.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-medium">Uploaded Tolls ({tollsFiles.length})</h4>
                      <div className="grid gap-2">
                        {tollsFiles.map((file, index) => (
                          <Card key={index} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">{file.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index, setTollsFiles)}
                              data-testid={`button-remove-toll-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* DOT Inspection Tab — only shown when editing */}
                {isEditing && (
                  <TabsContent value="dot-inspection" className="space-y-5 mt-4">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">DOT Inspection Records</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Record every DOT inspection for this trailer. Each entry tracks the shop, dates, pass/fail result, and supporting documents.
                    </p>

                    {/* Add new inspection form */}
                    <Card className="p-4 space-y-4">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add New DOT Inspection
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Issue Date</label>
                          <Input
                            type="date"
                            value={dotIssueDate}
                            onChange={(e) => setDotIssueDate(e.target.value)}
                            data-testid="input-dot-issue-date"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Expiration Date</label>
                          <Input
                            type="date"
                            value={dotExpirationDate}
                            onChange={(e) => setDotExpirationDate(e.target.value)}
                            data-testid="input-dot-expiration-date"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Shop / Station Name</label>
                          <Input
                            value={dotShopName}
                            onChange={(e) => setDotShopName(e.target.value)}
                            placeholder="e.g. ABC Inspection Station"
                            data-testid="input-dot-shop-name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Result</label>
                          <Select value={dotResult} onValueChange={setDotResult}>
                            <SelectTrigger data-testid="select-dot-result">
                              <SelectValue placeholder="Select result" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passed">Passed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-sm font-medium">Shop Address</label>
                          <Input
                            value={dotShopAddress}
                            onChange={(e) => setDotShopAddress(e.target.value)}
                            placeholder="123 Main St, City, ST 00000"
                            data-testid="input-dot-shop-address"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-sm font-medium">Notes (Optional)</label>
                          <Textarea
                            value={dotNotes}
                            onChange={(e) => setDotNotes(e.target.value)}
                            placeholder="Any additional details about this inspection..."
                            className="min-h-[60px]"
                            data-testid="input-dot-notes"
                          />
                        </div>
                      </div>

                      {/* File attachment upload */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Attachments (PDF / Images)</label>
                        <div
                          {...dotDropzone.getRootProps()}
                          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                            dotDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                          }`}
                        >
                          <input {...dotDropzone.getInputProps()} data-testid="input-dot-upload" />
                          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {dotDropzone.isDragActive ? "Drop files here" : "Click or drag inspection documents to upload"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">PDF or images, max 10MB each</p>
                        </div>
                        {dotAttachments.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {dotAttachments.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                                <div className="flex items-center gap-2 min-w-0">
                                  {file.fileName.match(/\.(jpg|jpeg|png|gif)$/i)
                                    ? <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    : <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                  <span className="text-sm truncate">{file.fileName}</span>
                                </div>
                                <Button
                                  type="button" variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeFile(idx, setDotAttachments)}
                                  data-testid={`button-remove-dot-file-${idx}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {dotFormError && <p className="text-xs text-destructive">{dotFormError}</p>}
                      <Button
                        type="button"
                        onClick={handleAddDotInspection}
                        disabled={createDotInspectionMutation.isPending}
                        data-testid="button-add-dot-inspection"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {createDotInspectionMutation.isPending ? "Saving..." : "Save Inspection"}
                      </Button>
                    </Card>

                    <Separator />

                    {/* Inspection history list */}
                    {dotInspections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ClipboardCheck className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">No inspections recorded</p>
                        <p className="text-xs text-muted-foreground mt-1">Add the first DOT inspection above</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {dotInspections.length} inspection{dotInspections.length !== 1 ? "s" : ""} on record
                        </p>
                        {dotInspections.map((insp) => {
                          const isPassed = insp.result === "passed";
                          const isFailed = insp.result === "failed";
                          const isExpired = insp.expirationDate
                            ? new Date(insp.expirationDate) < new Date()
                            : false;
                          return (
                            <Card key={insp.id} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {insp.shopName && (
                                      <span className="font-medium text-sm">{insp.shopName}</span>
                                    )}
                                    {insp.result && (
                                      <Badge
                                        variant={isPassed ? "default" : "destructive"}
                                        className="text-xs"
                                      >
                                        {isPassed ? (
                                          <><CheckCircle2 className="mr-1 h-3 w-3" />Passed</>
                                        ) : (
                                          <>Failed</>
                                        )}
                                      </Badge>
                                    )}
                                    {isExpired && (
                                      <Badge variant="destructive" className="text-xs">Expired</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    {insp.issueDate && <p>Issued: {insp.issueDate}</p>}
                                    {insp.expirationDate && (
                                      <p className={isExpired ? "text-destructive font-medium" : ""}>
                                        Expires: {insp.expirationDate}
                                      </p>
                                    )}
                                    {insp.shopAddress && <p>{insp.shopAddress}</p>}
                                  </div>
                                  {insp.notes && (
                                    <p className="text-xs text-muted-foreground italic">{insp.notes}</p>
                                  )}
                                  {insp.attachments && (insp.attachments as FileAttachment[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(insp.attachments as FileAttachment[]).map((att, ai) => (
                                        <button
                                          key={ai}
                                          type="button"
                                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                                          onClick={() => {
                                            const link = document.createElement("a");
                                            link.href = att.fileData;
                                            link.download = att.fileName;
                                            link.click();
                                          }}
                                          data-testid={`button-download-dot-att-${insp.id}-${ai}`}
                                        >
                                          <FileText className="h-3 w-3" />
                                          {att.fileName}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive shrink-0"
                                  onClick={() => {
                                    if (confirm("Remove this inspection record?")) {
                                      deleteDotInspectionMutation.mutate(insp.id);
                                    }
                                  }}
                                  disabled={deleteDotInspectionMutation.isPending}
                                  data-testid={`button-delete-dot-${insp.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Truck History Tab — only shown when editing */}
                {isEditing && (
                  <TabsContent value="truck-history" className="space-y-5 mt-4">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Truck Assignment History</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Log every truck that has pulled this trailer. Each assignment tracks the truck, start date, and end date so history is never lost.
                    </p>

                    {/* Add new assignment form */}
                    <Card className="p-4 space-y-4">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add New Truck Assignment
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Truck *</label>
                          <Select value={assignTruckId} onValueChange={setAssignTruckId}>
                            <SelectTrigger data-testid="select-assign-truck">
                              <SelectValue placeholder="Select truck" />
                            </SelectTrigger>
                            <SelectContent>
                              {trucks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.truckNumber}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Start Date *</label>
                          <Input
                            type="date"
                            value={assignStartDate}
                            onChange={(e) => setAssignStartDate(e.target.value)}
                            data-testid="input-assign-start-date"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">End Date (Optional)</label>
                          <Input
                            type="date"
                            value={assignEndDate}
                            onChange={(e) => setAssignEndDate(e.target.value)}
                            data-testid="input-assign-end-date"
                          />
                          <p className="text-xs text-muted-foreground">Leave blank if still assigned to this truck</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Notes (Optional)</label>
                          <Input
                            value={assignNotes}
                            onChange={(e) => setAssignNotes(e.target.value)}
                            placeholder="e.g. long haul route, seasonal"
                            data-testid="input-assign-notes"
                          />
                        </div>
                      </div>
                      {assignFormError && (
                        <p className="text-xs text-destructive">{assignFormError}</p>
                      )}
                      <Button
                        type="button"
                        onClick={handleAddAssignment}
                        disabled={createAssignmentMutation.isPending}
                        data-testid="button-add-assignment"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {createAssignmentMutation.isPending ? "Saving..." : "Add Assignment"}
                      </Button>
                    </Card>

                    <Separator />

                    {/* Assignment history list */}
                    {assignments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <History className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">No assignments yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add the first truck assignment above</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} on record
                        </p>
                        {assignments.map((a) => {
                          const isActive = !a.endDate;
                          const isEditingThis = editingAssignmentId === a.id;
                          return (
                            <Card key={a.id} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">
                                      Truck #{truckMap.get(a.truckId) || a.truckId}
                                    </span>
                                    {isActive ? (
                                      <Badge variant="default" className="text-xs">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Completed</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {a.startDate}
                                    {" → "}
                                    {a.endDate ? a.endDate : <span className="text-green-600 font-medium">Present</span>}
                                  </p>
                                  {a.notes && (
                                    <p className="text-xs text-muted-foreground italic">{a.notes}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {isEditingThis ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="date"
                                        value={editingEndDate}
                                        onChange={(e) => setEditingEndDate(e.target.value)}
                                        className="w-36 h-8 text-xs"
                                        data-testid={`input-edit-end-date-${a.id}`}
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => updateAssignmentMutation.mutate({ id: a.id, endDate: editingEndDate })}
                                        disabled={updateAssignmentMutation.isPending}
                                        data-testid={`button-save-end-date-${a.id}`}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setEditingAssignmentId(null); setEditingEndDate(""); }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setEditingAssignmentId(a.id); setEditingEndDate(toInputDate(a.endDate)); }}
                                        data-testid={`button-edit-assignment-${a.id}`}
                                      >
                                        {isActive ? "Set End Date" : "Edit"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => {
                                          if (confirm("Remove this assignment record?")) {
                                            deleteAssignmentMutation.mutate(a.id);
                                          }
                                        }}
                                        disabled={deleteAssignmentMutation.isPending}
                                        data-testid={`button-delete-assignment-${a.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Pictures Tab */}
                <TabsContent value="pictures" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Trailer Pickup Pictures</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload photos taken when picking up the trailer (max 10MB each)
                  </p>

                  <div
                    {...picturesDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      picturesDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                  >
                    <input {...picturesDropzone.getInputProps()} data-testid="input-pictures-upload" />
                    <Image className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Drop images here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>

                  {pickupPictures.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-medium">Uploaded Pictures ({pickupPictures.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {pickupPictures.map((file, index) => (
                          <Card key={index} className="p-2 relative group">
                            <img
                              src={file.fileData}
                              alt={file.fileName}
                              className="w-full h-24 object-cover rounded"
                            />
                            <p className="text-xs text-muted-foreground mt-1 truncate">{file.fileName}</p>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(index, setPickupPictures)}
                              data-testid={`button-remove-picture-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                  {mutation.isPending ? "Saving..." : isEditing ? "Update Trailer" : "Add Trailer"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
