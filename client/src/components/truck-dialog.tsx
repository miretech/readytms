import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { z } from "zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Truck as TruckIcon,
  Shield,
  Calendar,
  ClipboardCheck,
  FileText,
  Wrench,
  Camera,
  CircleDot,
  Upload,
  X,
  File,
  Image as ImageIcon,
} from "lucide-react";

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

  const [proofOfInsurance, setProofOfInsurance] = useState<FileAttachment[]>([]);
  const [dotInspectionFiles, setDotInspectionFiles] = useState<FileAttachment[]>([]);
  const [cabCardFiles, setCabCardFiles] = useState<FileAttachment[]>([]);
  const [repairReceiptFiles, setRepairReceiptFiles] = useState<FileAttachment[]>([]);
  const [truckPictureFiles, setTruckPictureFiles] = useState<FileAttachment[]>([]);
  const [tiresFiles, setTiresFiles] = useState<FileAttachment[]>([]);

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
      insuranceProvider: "",
      insurancePolicyNumber: "",
      insuranceExpirationDate: "",
      addedDate: "",
      terminatedDate: "",
      dotInspectionDate: "",
      dotInspectionExpirationDate: "",
    },
  });

  useEffect(() => {
    if (truck) {
      form.reset({
        truckNumber: truck.truckNumber,
        type: truck.type,
        status: truck.status,
        licensePlate: truck.licensePlate,
        vin: truck.vin || "",
        year: truck.year || undefined,
        make: truck.make || "",
        model: truck.model || "",
        insuranceProvider: truck.insuranceProvider || "",
        insurancePolicyNumber: truck.insurancePolicyNumber || "",
        insuranceExpirationDate: truck.insuranceExpirationDate || "",
        addedDate: truck.addedDate || "",
        terminatedDate: truck.terminatedDate || "",
        dotInspectionDate: truck.dotInspectionDate || "",
        dotInspectionExpirationDate: truck.dotInspectionExpirationDate || "",
      });
      setProofOfInsurance(truck.proofOfInsurance || []);
      setDotInspectionFiles(truck.dotInspectionAttachments || []);
      setCabCardFiles(truck.cabCardAttachments || []);
      setRepairReceiptFiles(truck.repairReceiptAttachments || []);
      setTruckPictureFiles(truck.truckPictures || []);
      setTiresFiles(truck.tiresAttachments || []);
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
        insuranceProvider: "",
        insurancePolicyNumber: "",
        insuranceExpirationDate: "",
        addedDate: "",
        terminatedDate: "",
        dotInspectionDate: "",
        dotInspectionExpirationDate: "",
      });
      setProofOfInsurance([]);
      setDotInspectionFiles([]);
      setCabCardFiles([]);
      setRepairReceiptFiles([]);
      setTruckPictureFiles([]);
      setTiresFiles([]);
    }
  }, [truck, form, open]);

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

  const insuranceDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setProofOfInsurance),
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

  const cabCardDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setCabCardFiles),
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

  const truckPicturesDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setTruckPictureFiles),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const tiresDropzone = useDropzone({
    onDrop: (files) => handleFileUpload(files, setTiresFiles),
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
        insuranceProvider: values.insuranceProvider || undefined,
        insurancePolicyNumber: values.insurancePolicyNumber || undefined,
        insuranceExpirationDate: values.insuranceExpirationDate || undefined,
        addedDate: values.addedDate || undefined,
        terminatedDate: values.terminatedDate || undefined,
        dotInspectionDate: values.dotInspectionDate || undefined,
        dotInspectionExpirationDate: values.dotInspectionExpirationDate || undefined,
        proofOfInsurance: proofOfInsurance.length > 0 ? proofOfInsurance : undefined,
        dotInspectionAttachments: dotInspectionFiles.length > 0 ? dotInspectionFiles : undefined,
        cabCardAttachments: cabCardFiles.length > 0 ? cabCardFiles : undefined,
        repairReceiptAttachments: repairReceiptFiles.length > 0 ? repairReceiptFiles : undefined,
        truckPictures: truckPictureFiles.length > 0 ? truckPictureFiles : undefined,
        tiresAttachments: tiresFiles.length > 0 ? tiresFiles : undefined,
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

  const FileUploadZone = ({
    dropzone,
    files,
    setFiles,
    label,
    acceptLabel,
    testIdPrefix,
    imagesOnly = false,
  }: {
    dropzone: ReturnType<typeof useDropzone>;
    files: FileAttachment[];
    setFiles: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    label: string;
    acceptLabel: string;
    testIdPrefix: string;
    imagesOnly?: boolean;
  }) => (
    <div className="space-y-3">
      <div
        {...dropzone.getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dropzone.isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        data-testid={`dropzone-${testIdPrefix}`}
      >
        <input {...dropzone.getInputProps()} data-testid={`input-file-${testIdPrefix}`} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{acceptLabel}</p>
        <p className="text-xs text-muted-foreground">Max 10MB per file</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
              data-testid={`file-item-${testIdPrefix}-${index}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {file.fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
                ) : (
                  <File className="h-4 w-4 flex-shrink-0 text-red-500" />
                )}
                <span className="text-sm truncate">{file.fileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => removeFile(index, setFiles)}
                data-testid={`button-remove-file-${testIdPrefix}-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Truck" : "Add New Truck"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update truck information" : "Add a new truck to your fleet"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
                <TabsTrigger value="basic" className="flex flex-col gap-1 py-2" data-testid="tab-basic">
                  <TruckIcon className="h-4 w-4" />
                  <span className="text-xs">Basic</span>
                </TabsTrigger>
                <TabsTrigger value="insurance" className="flex flex-col gap-1 py-2" data-testid="tab-insurance">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs">Insurance</span>
                </TabsTrigger>
                <TabsTrigger value="dates" className="flex flex-col gap-1 py-2" data-testid="tab-dates">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Dates</span>
                </TabsTrigger>
                <TabsTrigger value="dot" className="flex flex-col gap-1 py-2" data-testid="tab-dot">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="text-xs">DOT</span>
                </TabsTrigger>
                <TabsTrigger value="cabcard" className="flex flex-col gap-1 py-2" data-testid="tab-cabcard">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Cab Card</span>
                </TabsTrigger>
                <TabsTrigger value="repairs" className="flex flex-col gap-1 py-2" data-testid="tab-repairs">
                  <Wrench className="h-4 w-4" />
                  <span className="text-xs">Repairs</span>
                </TabsTrigger>
                <TabsTrigger value="pictures" className="flex flex-col gap-1 py-2" data-testid="tab-pictures">
                  <Camera className="h-4 w-4" />
                  <span className="text-xs">Pictures</span>
                </TabsTrigger>
                <TabsTrigger value="tires" className="flex flex-col gap-1 py-2" data-testid="tab-tires">
                  <CircleDot className="h-4 w-4" />
                  <span className="text-xs">Tires</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <div className="pr-4">
                  <TabsContent value="basic" className="mt-0 space-y-4">
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

                  <TabsContent value="insurance" className="mt-0 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="State Farm" data-testid="input-insurance-provider" />
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
                              <Input {...field} value={field.value || ""} placeholder="POL-123456" data-testid="input-insurance-policy" />
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
                            <FormLabel>Expiration Date</FormLabel>
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

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Proof of Insurance Documents
                      </h4>
                      <FileUploadZone
                        dropzone={insuranceDropzone}
                        files={proofOfInsurance}
                        setFiles={setProofOfInsurance}
                        label="Upload proof of insurance"
                        acceptLabel="PDF or images (JPG, PNG, GIF)"
                        testIdPrefix="proof-of-insurance"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="dates" className="mt-0 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="addedDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Added Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-added-date"
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
                  </TabsContent>

                  <TabsContent value="dot" className="mt-0 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="dotInspectionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last DOT Inspection Date</FormLabel>
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
                            <FormLabel>DOT Inspection Expiration</FormLabel>
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

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        DOT Inspection Documents
                      </h4>
                      <FileUploadZone
                        dropzone={dotInspectionDropzone}
                        files={dotInspectionFiles}
                        setFiles={setDotInspectionFiles}
                        label="Upload DOT inspection documents"
                        acceptLabel="PDF or images (JPG, PNG, GIF)"
                        testIdPrefix="dot-inspection"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="cabcard" className="mt-0 space-y-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Cab Card Documents
                    </h4>
                    <FileUploadZone
                      dropzone={cabCardDropzone}
                      files={cabCardFiles}
                      setFiles={setCabCardFiles}
                      label="Upload cab card documents"
                      acceptLabel="PDF or images (JPG, PNG, GIF)"
                      testIdPrefix="cab-card"
                    />
                  </TabsContent>

                  <TabsContent value="repairs" className="mt-0 space-y-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Repair Receipts
                    </h4>
                    <FileUploadZone
                      dropzone={repairReceiptDropzone}
                      files={repairReceiptFiles}
                      setFiles={setRepairReceiptFiles}
                      label="Upload repair receipts"
                      acceptLabel="PDF or images (JPG, PNG, GIF)"
                      testIdPrefix="repair-receipts"
                    />
                  </TabsContent>

                  <TabsContent value="pictures" className="mt-0 space-y-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Semi Truck Pictures
                    </h4>
                    <FileUploadZone
                      dropzone={truckPicturesDropzone}
                      files={truckPictureFiles}
                      setFiles={setTruckPictureFiles}
                      label="Upload truck pictures"
                      acceptLabel="Images only (JPG, PNG, GIF)"
                      testIdPrefix="truck-pictures"
                      imagesOnly
                    />
                  </TabsContent>

                  <TabsContent value="tires" className="mt-0 space-y-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CircleDot className="h-4 w-4" />
                      Tires Documentation
                    </h4>
                    <FileUploadZone
                      dropzone={tiresDropzone}
                      files={tiresFiles}
                      setFiles={setTiresFiles}
                      label="Upload tires documentation"
                      acceptLabel="PDF or images (JPG, PNG, GIF)"
                      testIdPrefix="tires"
                    />
                  </TabsContent>
                </div>
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
