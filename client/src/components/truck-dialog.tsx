import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { insertTruckSchema, type Truck } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Truck as TruckIcon, FileText, Upload, X, Download, Calendar, Wrench, User, ClipboardCheck } from "lucide-react";

interface FileAttachment {
  fileName: string;
  fileData: string;
  uploadedAt: string;
}

const formSchema = insertTruckSchema.extend({
  truckNumber: z.string().min(1, "Truck number is required"),
  type: z.string().min(1, "Type is required"),
  status: z.string().min(1, "Status is required"),
  licensePlate: z.string().min(1, "License plate is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface TruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck?: Truck | null;
}

export function TruckDialog({ open, onOpenChange, truck }: TruckDialogProps) {
  const { toast } = useToast();
  const isEditing = !!truck;
  const [cabCardFiles, setCabCardFiles] = useState<FileAttachment[]>([]);
  const [dotInspectionFiles, setDotInspectionFiles] = useState<FileAttachment[]>([]);
  const [repairReceiptFiles, setRepairReceiptFiles] = useState<FileAttachment[]>([]);

  // Fetch full truck data including attachments when editing
  const { data: fullTruck } = useQuery<Truck>({
    queryKey: ['/api/trucks', truck?.id],
    enabled: open && isEditing && !!truck?.id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      truckNumber: "",
      type: "",
      status: "available",
      licensePlate: "",
      vin: "",
      year: undefined,
      make: "",
      model: "",
      cabCardExpirationDate: "",
      dotInspectionDate: "",
      dotInspectionExpirationDate: "",
      dateAddedToCompany: "",
      dateTerminated: "",
      ownerFullName: "",
      isCompanyTruck: false,
    },
  });

  useEffect(() => {
    // Use fullTruck (with attachments) when available, otherwise use truck from list
    const truckData = fullTruck || truck;
    if (truckData) {
      form.reset({
        truckNumber: truckData.truckNumber,
        type: truckData.type,
        status: truckData.status,
        licensePlate: truckData.licensePlate,
        vin: truckData.vin || "",
        year: truckData.year || undefined,
        make: truckData.make || "",
        model: truckData.model || "",
        cabCardExpirationDate: truckData.cabCardExpirationDate || "",
        dotInspectionDate: (truckData as any).dotInspectionDate || "",
        dotInspectionExpirationDate: (truckData as any).dotInspectionExpirationDate || "",
        dateAddedToCompany: (truckData as any).dateAddedToCompany || "",
        dateTerminated: (truckData as any).dateTerminated || "",
        ownerFullName: (truckData as any).ownerFullName || "",
        isCompanyTruck: (truckData as any).isCompanyTruck || false,
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullTruck) {
        setCabCardFiles((fullTruck.cabCardAttachments as FileAttachment[]) || []);
        setDotInspectionFiles(((fullTruck as any).dotInspectionAttachments as FileAttachment[]) || []);
        setRepairReceiptFiles(((fullTruck as any).repairReceiptAttachments as FileAttachment[]) || []);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setCabCardFiles([]);
        setDotInspectionFiles([]);
        setRepairReceiptFiles([]);
      }
    } else {
      form.reset({
        truckNumber: "",
        type: "",
        status: "available",
        licensePlate: "",
        vin: "",
        year: undefined,
        make: "",
        model: "",
        cabCardExpirationDate: "",
        dotInspectionDate: "",
        dotInspectionExpirationDate: "",
        dateAddedToCompany: "",
        dateTerminated: "",
        ownerFullName: "",
        isCompanyTruck: false,
      });
      setCabCardFiles([]);
      setDotInspectionFiles([]);
      setRepairReceiptFiles([]);
    }
  }, [truck, fullTruck, form, open]);

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

  const cabCardDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setCabCardFiles),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const dotInspectionDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setDotInspectionFiles),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const repairReceiptDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setRepairReceiptFiles),
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
        vin: values.vin || undefined,
        make: values.make || undefined,
        model: values.model || undefined,
        cabCardExpirationDate: values.cabCardExpirationDate || undefined,
        cabCardAttachments: cabCardFiles.length > 0 ? cabCardFiles : undefined,
        dotInspectionDate: (values as any).dotInspectionDate || undefined,
        dotInspectionExpirationDate: (values as any).dotInspectionExpirationDate || undefined,
        dotInspectionAttachments: dotInspectionFiles.length > 0 ? dotInspectionFiles : undefined,
        repairReceiptAttachments: repairReceiptFiles.length > 0 ? repairReceiptFiles : undefined,
        dateAddedToCompany: (values as any).dateAddedToCompany || undefined,
        dateTerminated: (values as any).dateTerminated || undefined,
        ownerFullName: (values as any).ownerFullName || undefined,
        isCompanyTruck: (values as any).isCompanyTruck || false,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/trucks/${truck.id}`, payload);
      }
      return await apiRequest("POST", "/api/trucks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: isEditing ? "Truck updated" : "Truck added",
        description: `The truck has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} truck. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const downloadFile = (file: FileAttachment) => {
    const link = document.createElement("a");
    link.href = file.fileData;
    link.download = file.fileName;
    link.click();
  };

  const isCompanyTruck = form.watch("isCompanyTruck");

  const FileUploadSection = ({ 
    dropzone, 
    files, 
    setFiles, 
    title, 
    testIdPrefix 
  }: { 
    dropzone: ReturnType<typeof useDropzone>;
    files: FileAttachment[];
    setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    title: string;
    testIdPrefix: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" />
        {title}
      </label>
      <p className="text-xs text-muted-foreground">
        Upload documents (PDF or images, max 10MB each)
      </p>
      
      <div
        {...dropzone.getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary"
        }`}
        data-testid={`dropzone-${testIdPrefix}`}
      >
        <input {...dropzone.getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {dropzone.isDragActive
            ? "Drop the files here..."
            : "Drag & drop files here, or click to select"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Uploaded Documents ({files.length})</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{file.fileName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadFile(file)}
                  data-testid={`button-download-${testIdPrefix}-${index}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index, setFiles)}
                  data-testid={`button-remove-${testIdPrefix}-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Truck" : "Add New Truck"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update truck information" : "Add a new truck to your inventory"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic" data-testid="tab-basic">
                  <TruckIcon className="mr-2 h-4 w-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="cabcard" data-testid="tab-cabcard">
                  <FileText className="mr-2 h-4 w-4" />
                  Cab Card
                </TabsTrigger>
                <TabsTrigger value="dotinspection" data-testid="tab-dotinspection">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  DOT
                </TabsTrigger>
                <TabsTrigger value="repairs" data-testid="tab-repairs">
                  <Wrench className="mr-2 h-4 w-4" />
                  Repairs
                </TabsTrigger>
                <TabsTrigger value="owner" data-testid="tab-owner">
                  <User className="mr-2 h-4 w-4" />
                  Owner
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] pr-4">
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="truckNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Truck Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="T-001" data-testid="input-truck-number" />
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
                          <FormLabel>Truck Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-truck-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Dry Van">Dry Van</SelectItem>
                              <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                              <SelectItem value="Flatbed">Flatbed</SelectItem>
                              <SelectItem value="Step Deck">Step Deck</SelectItem>
                              <SelectItem value="Tanker">Tanker</SelectItem>
                              <SelectItem value="Semi Truck">Semi Truck</SelectItem>
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
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-truck-status">
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
                          <FormLabel>License Plate *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ABC-1234" data-testid="input-license-plate" />
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
                          <FormLabel>VIN</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="1HGBH41JXMN109186" data-testid="input-vin" />
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
                          <FormLabel>Year</FormLabel>
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
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Freightliner" data-testid="input-make" />
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
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Cascadia" data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="cabcard" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cabCardExpirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Cab Card Expiration Date
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-cab-card-expiration" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FileUploadSection
                      dropzone={cabCardDropzone}
                      files={cabCardFiles}
                      setFiles={setCabCardFiles}
                      title="Cab Card Documents"
                      testIdPrefix="cabcard"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="dotinspection" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Annual DOT Inspection</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="dotInspectionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Inspection Date
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-dot-inspection-date" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dotInspectionExpirationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Expiration Date
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-dot-expiration-date" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FileUploadSection
                      dropzone={dotInspectionDropzone}
                      files={dotInspectionFiles}
                      setFiles={setDotInspectionFiles}
                      title="DOT Inspection Documents"
                      testIdPrefix="dotinspection"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="repairs" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Repair Receipts</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload repair receipts and maintenance records for this truck.
                    </p>

                    <FileUploadSection
                      dropzone={repairReceiptDropzone}
                      files={repairReceiptFiles}
                      setFiles={setRepairReceiptFiles}
                      title="Repair Receipt Documents"
                      testIdPrefix="repairs"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="owner" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Owner & Company Information</h3>

                    <FormField
                      control={form.control}
                      name="isCompanyTruck"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-company-truck"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              This is a company truck
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Check this if the truck is owned by the company (owner info is optional)
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {!isCompanyTruck && (
                      <FormField
                        control={form.control}
                        name="ownerFullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Owner Full Name
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""} 
                                placeholder="John Smith" 
                                data-testid="input-owner-name" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="dateAddedToCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date Added to Company
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-date-added" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateTerminated"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date Terminated
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-date-terminated" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Truck" : "Add Truck"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
