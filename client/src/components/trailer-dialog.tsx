import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { insertTrailerSchema, type Trailer } from "@shared/schema";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, Calendar, Shield, DollarSign, Wrench, Receipt, Camera } from "lucide-react";

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

  // Fetch full trailer data including attachments when editing
  const { data: fullTrailer } = useQuery<Trailer>({
    queryKey: ['/api/trailers', trailer?.id],
    enabled: open && isEditing && !!trailer?.id,
  });

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
        insuranceExpirationDate: trailerData.insuranceExpirationDate || "",
        pickupDate: trailerData.pickupDate || "",
        dropOffDate: trailerData.dropOffDate || "",
        terminatedDate: trailerData.terminatedDate || "",
        repairs: trailerData.repairs || "",
        rentPerMonth: trailerData.rentPerMonth || "",
      });
      // Only set attachments from full trailer data (which has actual attachment data)
      if (fullTrailer) {
        setTollsFiles((fullTrailer.tollsAttachments as FileAttachment[]) || []);
        setPickupPictures((fullTrailer.pickupPictures as FileAttachment[]) || []);
        setRepairsAttachments((fullTrailer.repairsAttachments as FileAttachment[]) || []);
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
        tollsAttachments: tollsFiles.length > 0 ? tollsFiles : undefined,
        pickupPictures: pickupPictures.length > 0 ? pickupPictures : undefined,
        repairsAttachments: repairsAttachments.length > 0 ? repairsAttachments : undefined,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/trailers/${trailer.id}`, payload);
      }
      return await apiRequest("POST", "/api/trailers", payload);
    },
    onSuccess: () => {
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="insurance" data-testid="tab-insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="dates" data-testid="tab-dates">Dates & Rent</TabsTrigger>
                  <TabsTrigger value="tolls" data-testid="tab-tolls">Tolls</TabsTrigger>
                  <TabsTrigger value="pictures" data-testid="tab-pictures">Pictures</TabsTrigger>
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
