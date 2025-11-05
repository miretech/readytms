import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertLoadSchema, type Load, type Customer, type Driver, type Truck } from "@shared/schema";
import { Sparkles, FileText, Download, Eye, X, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AILoadUpload } from "@/components/ai-load-upload";
import { FileUpload } from "@/components/file-upload";

const formSchema = insertLoadSchema.extend({
  customerId: z.string().optional(), // Optional - can be added via AI extraction later
  status: z.string().min(1, "Status is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  rate: z.string().min(1, "Rate is required"),
  invoiceAttachment: z.string().nullable().optional(),
  podAttachment: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load?: Load | null;
}

export function LoadDialog({ open, onOpenChange, load }: LoadDialogProps) {
  const { toast } = useToast();
  const isEditing = !!load;
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [viewingPod, setViewingPod] = useState<{ filename: string; data: string; type: string } | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loadNumber: "",
      customerId: "",
      status: "pending",
      pickupLocation: "",
      pickupDate: "",
      deliveryLocation: "",
      deliveryDate: "",
      assignedDriverId: "",
      assignedTruckId: "",
      rate: "",
      expenses: "0",
      weight: 0,
      commodity: "",
      notes: "",
      invoiceAttachment: "",
      podAttachment: "",
    },
  });

  useEffect(() => {
    if (load) {
      form.reset({
        loadNumber: load.loadNumber,
        customerId: load.customerId || "",
        status: load.status,
        pickupLocation: load.pickupLocation,
        pickupDate: new Date(load.pickupDate).toISOString().split("T")[0],
        deliveryLocation: load.deliveryLocation,
        deliveryDate: new Date(load.deliveryDate).toISOString().split("T")[0],
        assignedDriverId: load.assignedDriverId || "",
        assignedTruckId: load.assignedTruckId || "",
        rate: load.rate.toString(),
        expenses: load.expenses?.toString() || "0",
        weight: load.weight || 0,
        commodity: load.commodity || "",
        notes: load.notes || "",
        invoiceAttachment: load.invoiceAttachment || "",
        podAttachment: load.podAttachment || "",
      });
    } else {
      form.reset({
        loadNumber: `LD-${Date.now()}`,
        customerId: "",
        status: "pending",
        pickupLocation: "",
        pickupDate: "",
        deliveryLocation: "",
        deliveryDate: "",
        assignedDriverId: "",
        assignedTruckId: "",
        rate: "",
        expenses: "0",
        weight: 0,
        commodity: "",
        notes: "",
        invoiceAttachment: "",
        podAttachment: "",
      });
    }
  }, [load, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/loads/${load.id}`, values);
      }
      return await apiRequest("POST", "/api/loads", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({
        title: isEditing ? "Load updated" : "Load created",
        description: `The load has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} load. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    // Convert empty customerId to undefined for optional field
    const cleanedValues = {
      ...values,
      customerId: values.customerId || undefined,
    };
    mutation.mutate(cleanedValues);
  };

  const handleAIExtraction = (extractedData: any) => {
    form.reset({
      loadNumber: extractedData.loadNumber || "",
      customerId: "",
      status: "pending",
      pickupLocation: extractedData.pickupLocation || "",
      pickupDate: extractedData.pickupDate || "",
      deliveryLocation: extractedData.deliveryLocation || "",
      deliveryDate: extractedData.deliveryDate || "",
      assignedDriverId: "",
      assignedTruckId: "",
      rate: extractedData.rate || "",
      expenses: "0",
      weight: extractedData.weight || 0,
      commodity: extractedData.commodity || "",
      notes: extractedData.notes || "",
    });
    setActiveTab("manual");
    toast({
      title: "Load data extracted!",
      description: "Please review and complete the remaining fields.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Load" : "Create New Load"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update load information" : "Add a new load to your system"}
          </DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Extract
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai" className="mt-4">
              <AILoadUpload 
                onExtracted={handleAIExtraction} 
                onClose={() => setActiveTab("manual")} 
              />
            </TabsContent>

            <TabsContent value="manual">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="loadNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-load-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer (optional - can add via AI later)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commodity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commodity</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g., Electronics" data-testid="input-commodity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickupLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City, State" data-testid="input-pickup-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-pickup-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City, State" data-testid="input-delivery-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-delivery-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedDriverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Driver (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-driver">
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
                name="assignedTruckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Truck (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-truck">
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
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expenses ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-expenses" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-weight" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="invoiceAttachment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FileUpload
                        value={field.value || null}
                        onChange={field.onChange}
                        accept={[".pdf", ".png", ".jpg", ".jpeg"]}
                        label="Invoice Attachment (Optional)"
                        testId="upload-invoice-attachment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="podAttachment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FileUpload
                        value={field.value || null}
                        onChange={field.onChange}
                        accept={[".pdf", ".png", ".jpg", ".jpeg"]}
                        label="POD Attachment (Optional)"
                        testId="upload-pod-attachment"
                      />
                    </FormControl>
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Load" : "Create Load"}
              </Button>
            </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="loadNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Load Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-load-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-pickup-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-pickup-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deliveryLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Location</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-delivery-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-delivery-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="assignedDriverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-driver">
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
                  name="assignedTruckId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-truck">
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
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="commodity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commodity</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-commodity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expenses ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-expenses" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (lbs)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="invoiceAttachment"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUpload
                          value={field.value || null}
                          onChange={field.onChange}
                          accept={[".pdf", ".png", ".jpg", ".jpeg"]}
                          label="Invoice Attachment (Optional)"
                          testId="upload-invoice-attachment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="podAttachment"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUpload
                          value={field.value || null}
                          onChange={field.onChange}
                          accept={[".pdf", ".png", ".jpg", ".jpeg"]}
                          label="POD Attachment (Optional)"
                          testId="upload-pod-attachment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* POD Gallery - Show uploaded PODs from drivers */}
              {load?.podAttachments && Array.isArray(load.podAttachments) && (load.podAttachments as any[]).length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Driver Uploaded PODs
                        </CardTitle>
                        <CardDescription>
                          Proof of delivery documents uploaded by the driver
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" data-testid="badge-pod-count">
                        {(load.podAttachments as any[]).length} {(load.podAttachments as any[]).length === 1 ? 'file' : 'files'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {(load.podAttachments as any[]).map((pod: any, index: number) => {
                        const isPdf = pod.type?.includes('pdf');
                        const isImage = pod.type?.includes('image');
                        
                        return (
                          <div
                            key={index}
                            className="group relative border rounded-lg overflow-hidden hover-elevate"
                            data-testid={`pod-item-${index}`}
                          >
                            {/* Preview */}
                            <div className="aspect-video bg-muted flex items-center justify-center relative">
                              {isImage ? (
                                <img
                                  src={pod.data}
                                  alt={pod.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : isPdf ? (
                                <FileText className="h-16 w-16 text-muted-foreground" />
                              ) : (
                                <FileText className="h-16 w-16 text-muted-foreground" />
                              )}
                              
                              {/* Action overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setViewingPod(pod)}
                                  data-testid={`button-view-pod-${index}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = pod.data;
                                    link.download = pod.filename;
                                    link.click();
                                  }}
                                  data-testid={`button-download-pod-${index}`}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            
                            {/* File info */}
                            <div className="p-2 bg-background">
                              <p className="text-sm font-medium truncate" title={pod.filename}>
                                {pod.filename}
                              </p>
                              {pod.uploadedAt && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(pod.uploadedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                  {mutation.isPending ? "Saving..." : isEditing ? "Update Load" : "Create Load"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>

      {/* POD Viewer Modal */}
      {viewingPod && (
        <Dialog open={!!viewingPod} onOpenChange={() => setViewingPod(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{viewingPod.filename}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setViewingPod(null)}
                  data-testid="button-close-pod-viewer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden" style={{ minHeight: '60vh' }}>
              {viewingPod.type?.includes('image') ? (
                <img
                  src={viewingPod.data}
                  alt={viewingPod.filename}
                  className="max-w-full max-h-[70vh] object-contain"
                  data-testid="pod-viewer-image"
                />
              ) : viewingPod.type?.includes('pdf') ? (
                <iframe
                  src={viewingPod.data}
                  className="w-full h-[70vh]"
                  title={viewingPod.filename}
                  data-testid="pod-viewer-pdf"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Preview not available for this file type</p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingPod.data;
                      link.download = viewingPod.filename;
                      link.click();
                    }}
                    data-testid="button-download-in-viewer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewingPod.data;
                  link.download = viewingPod.filename;
                  link.click();
                }}
                data-testid="button-download-pod"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="secondary" onClick={() => setViewingPod(null)} data-testid="button-close-viewer">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
