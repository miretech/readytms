import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertDriverSchema, type Driver, type Truck } from "@shared/schema";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUp, X, Download, FileText, Image as ImageIcon, Eye } from "lucide-react";

const formSchema = insertDriverSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().optional(),
  licenseNumber: z.string().min(1, "License number is required"),
  status: z.string().min(1, "Status is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
}

export function DriverDialog({ open, onOpenChange, driver }: DriverDialogProps) {
  const { toast } = useToast();
  const isEditing = !!driver;

  // Fetch full driver data including attachments when editing
  const { data: fullDriver } = useQuery<Driver>({
    queryKey: ['/api/drivers', driver?.id],
    enabled: open && isEditing && !!driver?.id,
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const [licenseFile, setLicenseFile] = useState<string | null>(null);
  const [medicalCardFile, setMedicalCardFile] = useState<string | null>(null);
  const [ssnFile, setSsnFile] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      address: "",
      licenseNumber: "",
      licenseExpiration: "",
      licenseIssuedPlace: "",
      licenseAttachment: "",
      medicalCardNumber: "",
      medicalCardExpiration: "",
      medicalCardIssuedDate: "",
      medicalCardAttachment: "",
      socialSecurityNumber: "",
      socialSecurityAttachment: "",
      status: "available",
      isActive: "true",
      dateHired: "",
      dateTerminated: "",
      assignedTruckId: "",
      driverType: "company-driver",
    },
  });

  useEffect(() => {
    // Use fullDriver (with attachments) when available, otherwise use driver from list
    const driverData = fullDriver || driver;
    if (driverData) {
      form.reset({
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        password: "", // Don't show existing password for security
        address: driverData.address || "",
        licenseNumber: driverData.licenseNumber,
        licenseExpiration: driverData.licenseExpiration ? new Date(driverData.licenseExpiration).toISOString().split('T')[0] : "",
        licenseIssuedPlace: driverData.licenseIssuedPlace || "",
        licenseAttachment: driverData.licenseAttachment || "",
        medicalCardNumber: driverData.medicalCardNumber || "",
        medicalCardExpiration: driverData.medicalCardExpiration ? new Date(driverData.medicalCardExpiration).toISOString().split('T')[0] : "",
        medicalCardIssuedDate: driverData.medicalCardIssuedDate ? new Date(driverData.medicalCardIssuedDate).toISOString().split('T')[0] : "",
        medicalCardAttachment: driverData.medicalCardAttachment || "",
        socialSecurityNumber: driverData.socialSecurityNumber || "",
        socialSecurityAttachment: driverData.socialSecurityAttachment || "",
        status: driverData.status,
        isActive: driverData.isActive || "true",
        dateHired: driverData.dateHired ? new Date(driverData.dateHired).toISOString().split('T')[0] : "",
        dateTerminated: driverData.dateTerminated ? new Date(driverData.dateTerminated).toISOString().split('T')[0] : "",
        assignedTruckId: driverData.assignedTruckId || "",
        driverType: (driverData.driverType || "company-driver") as "company-driver" | "owner-operator",
      });
      // Clear attachments immediately when entity changes, then populate from full data when available
      if (fullDriver) {
        setLicenseFile(fullDriver.licenseAttachment || null);
        setMedicalCardFile(fullDriver.medicalCardAttachment || null);
        setSsnFile(fullDriver.socialSecurityAttachment || null);
      } else {
        // Clear while waiting for full data to prevent stale attachment leakage
        setLicenseFile(null);
        setMedicalCardFile(null);
        setSsnFile(null);
      }
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        licenseNumber: "",
        licenseExpiration: "",
        licenseIssuedPlace: "",
        licenseAttachment: "",
        medicalCardNumber: "",
        medicalCardExpiration: "",
        medicalCardIssuedDate: "",
        medicalCardAttachment: "",
        socialSecurityNumber: "",
        socialSecurityAttachment: "",
        status: "available",
        isActive: "true",
        dateHired: "",
        dateTerminated: "",
        assignedTruckId: "",
        driverType: "company-driver",
      });
      setLicenseFile(null);
      setMedicalCardFile(null);
      setSsnFile(null);
    }
  }, [driver, fullDriver, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert empty date strings to undefined for proper database handling
      // For attachments, use null to explicitly clear them (not undefined which omits the field)
      const payload = {
        ...values,
        licenseExpiration: values.licenseExpiration || undefined,
        medicalCardExpiration: values.medicalCardExpiration || undefined,
        medicalCardIssuedDate: values.medicalCardIssuedDate || undefined,
        dateHired: values.dateHired || undefined,
        dateTerminated: values.dateTerminated || undefined,
        assignedTruckId: values.assignedTruckId || undefined,
        address: values.address || undefined,
        licenseIssuedPlace: values.licenseIssuedPlace || undefined,
        medicalCardNumber: values.medicalCardNumber || undefined,
        socialSecurityNumber: values.socialSecurityNumber || undefined,
        // Use null to explicitly clear attachments, empty string means remove
        licenseAttachment: values.licenseAttachment === '' ? null : (values.licenseAttachment || undefined),
        medicalCardAttachment: values.medicalCardAttachment === '' ? null : (values.medicalCardAttachment || undefined),
        socialSecurityAttachment: values.socialSecurityAttachment === '' ? null : (values.socialSecurityAttachment || undefined),
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/drivers/${driver.id}`, payload);
      }
      return await apiRequest("POST", "/api/drivers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: isEditing ? "Driver updated" : "Driver added",
        description: `The driver has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} driver. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: 'license' | 'medical' | 'ssn') => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'license') {
        setLicenseFile(base64);
        form.setValue('licenseAttachment', base64);
      } else if (type === 'medical') {
        setMedicalCardFile(base64);
        form.setValue('medicalCardAttachment', base64);
      } else {
        setSsnFile(base64);
        form.setValue('socialSecurityAttachment', base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'license' | 'medical' | 'ssn') => {
    if (type === 'license') {
      setLicenseFile(null);
      form.setValue('licenseAttachment', '');
    } else if (type === 'medical') {
      setMedicalCardFile(null);
      form.setValue('medicalCardAttachment', '');
    } else {
      setSsnFile(null);
      form.setValue('socialSecurityAttachment', '');
    }
  };

  const getFileTypeFromBase64 = (base64: string): 'image' | 'pdf' | 'unknown' => {
    if (base64.startsWith('data:image/')) return 'image';
    if (base64.startsWith('data:application/pdf')) return 'pdf';
    return 'unknown';
  };

  const getFileExtension = (base64: string): string => {
    if (base64.startsWith('data:image/png')) return 'png';
    if (base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg')) return 'jpg';
    if (base64.startsWith('data:image/gif')) return 'gif';
    if (base64.startsWith('data:application/pdf')) return 'pdf';
    return 'file';
  };

  const downloadFile = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewFile = (base64: string) => {
    const newWindow = window.open();
    if (newWindow) {
      if (getFileTypeFromBase64(base64) === 'pdf') {
        newWindow.document.write(`<iframe src="${base64}" style="width:100%;height:100%;border:none;"></iframe>`);
      } else {
        newWindow.document.write(`<img src="${base64}" style="max-width:100%;height:auto;" />`);
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    // Remove password if it's empty (for edit mode)
    if (isEditing && !values.password) {
      const { password, ...rest } = values;
      mutation.mutate(rest as FormValues);
    } else {
      mutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update driver information" : "Add a new driver to your roster"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-driver-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" data-testid="input-driver-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(555) 123-4567" data-testid="input-driver-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditing ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" data-testid="input-driver-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="123 Main St, City, State ZIP" data-testid="input-driver-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CDL License Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DL123456" data-testid="input-license-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseExpiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CDL Expiration Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-license-expiration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseIssuedPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Issued Place</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="State/Province" data-testid="input-license-issued-place" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseAttachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver License Attachment</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'license');
                          }}
                          data-testid="input-license-attachment"
                        />
                        {licenseFile && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start gap-3">
                              {getFileTypeFromBase64(licenseFile) === 'image' ? (
                                <div className="relative w-20 h-20 rounded border overflow-hidden bg-white flex-shrink-0">
                                  <img 
                                    src={licenseFile} 
                                    alt="License preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded border bg-white flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-10 w-10 text-red-500" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  Driver License.{getFileExtension(licenseFile)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {getFileTypeFromBase64(licenseFile) === 'pdf' ? 'PDF Document' : 'Image File'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewFile(licenseFile)}
                                    data-testid="button-view-license"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile(licenseFile, `driver-license.${getFileExtension(licenseFile)}`)}
                                    data-testid="button-download-license"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile('license')}
                                    className="text-destructive hover:text-destructive"
                                    data-testid="button-remove-license"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Card Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="MC123456" data-testid="input-medical-card-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalCardIssuedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Card Issued Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-medical-card-issued" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalCardExpiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Card Expiration</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-medical-card-expiration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalCardAttachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Card Attachment</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'medical');
                          }}
                          data-testid="input-medical-card-attachment"
                        />
                        {medicalCardFile && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start gap-3">
                              {getFileTypeFromBase64(medicalCardFile) === 'image' ? (
                                <div className="relative w-20 h-20 rounded border overflow-hidden bg-white flex-shrink-0">
                                  <img 
                                    src={medicalCardFile} 
                                    alt="Medical card preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded border bg-white flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-10 w-10 text-red-500" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  Medical Card.{getFileExtension(medicalCardFile)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {getFileTypeFromBase64(medicalCardFile) === 'pdf' ? 'PDF Document' : 'Image File'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewFile(medicalCardFile)}
                                    data-testid="button-view-medical"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile(medicalCardFile, `medical-card.${getFileExtension(medicalCardFile)}`)}
                                    data-testid="button-download-medical"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile('medical')}
                                    className="text-destructive hover:text-destructive"
                                    data-testid="button-remove-medical"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialSecurityNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social Security Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="XXX-XX-XXXX" data-testid="input-ssn" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialSecurityAttachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social Security Attachment</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'ssn');
                          }}
                          data-testid="input-ssn-attachment"
                        />
                        {ssnFile && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start gap-3">
                              {getFileTypeFromBase64(ssnFile) === 'image' ? (
                                <div className="relative w-20 h-20 rounded border overflow-hidden bg-white flex-shrink-0">
                                  <img 
                                    src={ssnFile} 
                                    alt="SSN card preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded border bg-white flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-10 w-10 text-red-500" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  Social Security Card.{getFileExtension(ssnFile)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {getFileTypeFromBase64(ssnFile) === 'pdf' ? 'PDF Document' : 'Image File'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewFile(ssnFile)}
                                    data-testid="button-view-ssn"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile(ssnFile, `social-security-card.${getFileExtension(ssnFile)}`)}
                                    data-testid="button-download-ssn"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile('ssn')}
                                    className="text-destructive hover:text-destructive"
                                    data-testid="button-remove-ssn"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateHired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Hired</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-date-hired" />
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
                    <FormLabel>Date Terminated</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="date" data-testid="input-date-terminated" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-driver-active">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
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
                    <FormLabel>Current Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-driver-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on-duty">On Duty</SelectItem>
                        <SelectItem value="off-duty">Off Duty</SelectItem>
                        <SelectItem value="on-leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTruckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Truck (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assigned-truck">
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
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? "Saving..." : isEditing ? "Update Driver" : "Add Driver"}
              </Button>
            </div>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
