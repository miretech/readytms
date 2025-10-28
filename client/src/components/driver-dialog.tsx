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
import { FileUp, X } from "lucide-react";

const formSchema = insertDriverSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
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

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const [licenseFile, setLicenseFile] = useState<string | null>(null);
  const [ssnFile, setSsnFile] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      licenseNumber: "",
      licenseExpiration: "",
      licenseIssuedPlace: "",
      licenseAttachment: "",
      medicalCardNumber: "",
      medicalCardExpiration: "",
      medicalCardIssuedDate: "",
      socialSecurityNumber: "",
      socialSecurityAttachment: "",
      status: "available",
      isActive: "true",
      dateHired: "",
      dateTerminated: "",
      assignedTruckId: "",
    },
  });

  useEffect(() => {
    if (driver) {
      form.reset({
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        address: driver.address || "",
        licenseNumber: driver.licenseNumber,
        licenseExpiration: driver.licenseExpiration ? new Date(driver.licenseExpiration).toISOString().split('T')[0] : "",
        licenseIssuedPlace: driver.licenseIssuedPlace || "",
        licenseAttachment: driver.licenseAttachment || "",
        medicalCardNumber: driver.medicalCardNumber || "",
        medicalCardExpiration: driver.medicalCardExpiration ? new Date(driver.medicalCardExpiration).toISOString().split('T')[0] : "",
        medicalCardIssuedDate: driver.medicalCardIssuedDate ? new Date(driver.medicalCardIssuedDate).toISOString().split('T')[0] : "",
        socialSecurityNumber: driver.socialSecurityNumber || "",
        socialSecurityAttachment: driver.socialSecurityAttachment || "",
        status: driver.status,
        isActive: driver.isActive || "true",
        dateHired: driver.dateHired ? new Date(driver.dateHired).toISOString().split('T')[0] : "",
        dateTerminated: driver.dateTerminated ? new Date(driver.dateTerminated).toISOString().split('T')[0] : "",
        assignedTruckId: driver.assignedTruckId || "",
      });
      setLicenseFile(driver.licenseAttachment || null);
      setSsnFile(driver.socialSecurityAttachment || null);
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        licenseNumber: "",
        licenseExpiration: "",
        licenseIssuedPlace: "",
        licenseAttachment: "",
        medicalCardNumber: "",
        medicalCardExpiration: "",
        medicalCardIssuedDate: "",
        socialSecurityNumber: "",
        socialSecurityAttachment: "",
        status: "available",
        isActive: "true",
        dateHired: "",
        dateTerminated: "",
        assignedTruckId: "",
      });
      setLicenseFile(null);
      setSsnFile(null);
    }
  }, [driver, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/drivers/${driver.id}`, values);
      }
      return await apiRequest("POST", "/api/drivers", values);
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

  const handleFileUpload = async (file: File, type: 'license' | 'ssn') => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'license') {
        setLicenseFile(base64);
        form.setValue('licenseAttachment', base64);
      } else {
        setSsnFile(base64);
        form.setValue('socialSecurityAttachment', base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'license' | 'ssn') => {
    if (type === 'license') {
      setLicenseFile(null);
      form.setValue('licenseAttachment', '');
    } else {
      setSsnFile(null);
      form.setValue('socialSecurityAttachment', '');
    }
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
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
                      <div className="space-y-2">
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>File attached</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFile('license')}
                              data-testid="button-remove-license"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
                      <div className="space-y-2">
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>File attached</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFile('ssn')}
                              data-testid="button-remove-ssn"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
