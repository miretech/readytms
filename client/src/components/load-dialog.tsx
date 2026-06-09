import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertLoadSchema, type Load, type Customer, type Driver, type Truck, type LoadDocument } from "@shared/schema";
import { Sparkles, FileText, Download, Eye, X, Calendar, CheckCircle2, AlertTriangle, XCircle, Clock, Bot, Pen } from "lucide-react";
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

// Helper to extract date part (YYYY-MM-DD) without timezone conversion issues
function extractDatePart(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  const str = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
  // Just extract the date part directly - no timezone conversion
  return str.split('T')[0];
}

const formSchema = insertLoadSchema.extend({
  customerId: z.string().optional(), // Optional - can be added via AI extraction later
  status: z.string().min(1, "Status is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  rate: z.string().min(1, "Rate is required"),
  invoiceAttachment: z.string().nullable().optional(),
  podAttachment: z.string().nullable().optional(),
  // Broker information fields (editable)
  brokerName: z.string().optional(),
  brokerAddress: z.string().optional(),
  brokerPhone: z.string().optional(),
  brokerEmail: z.string().optional(),
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBrokerExtract, setShowBrokerExtract] = useState(false);

  // Fetch full load data including attachments when editing
  const { data: fullLoad } = useQuery<Load>({
    queryKey: ['/api/loads', load?.id],
    enabled: open && isEditing && !!load?.id,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  // Fetch paperwork documents for this load when editing
  const { data: loadDocuments = [] } = useQuery<LoadDocument[]>({
    queryKey: ["/api/load-documents", load?.id],
    queryFn: () => fetch(`/api/load-documents?loadId=${load?.id}`).then(r => r.json()),
    enabled: open && isEditing && !!load?.id,
  });

  const approveMutation = useMutation({
    mutationFn: (docId: string) => apiRequest("PATCH", `/api/load-documents/${docId}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/load-documents", load?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Document approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) =>
      apiRequest("PATCH", `/api/load-documents/${docId}`, { status: "rejected", rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/load-documents", load?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Document rejected" });
    },
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
      brokerName: "",
      brokerAddress: "",
      brokerPhone: "",
      brokerEmail: "",
    },
  });

  // Watch for customer selection and populate broker fields
  const customerId = form.watch("customerId");
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        form.setValue("brokerName", customer.name || "");
        form.setValue("brokerAddress", customer.address || "");
        form.setValue("brokerPhone", customer.phone || "");
        form.setValue("brokerEmail", customer.email || "");
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [customerId, customers, form]);

  useEffect(() => {
    // Use fullLoad (with attachments) when available, otherwise use load from list
    const loadData = fullLoad || load;
    if (loadData) {
      // Find the customer for this load
      const customer = customers.find(c => c.id === loadData.customerId);
      
      form.reset({
        loadNumber: loadData.loadNumber,
        customerId: loadData.customerId || "",
        status: loadData.status,
        pickupLocation: loadData.pickupLocation,
        pickupDate: extractDatePart(loadData.pickupDate),
        deliveryLocation: loadData.deliveryLocation,
        deliveryDate: extractDatePart(loadData.deliveryDate),
        assignedDriverId: loadData.assignedDriverId || "",
        assignedTruckId: loadData.assignedTruckId || "",
        rate: loadData.rate.toString(),
        expenses: loadData.expenses?.toString() || "0",
        weight: loadData.weight || 0,
        commodity: loadData.commodity || "",
        notes: loadData.notes || "",
        invoiceAttachment: loadData.invoiceAttachment || "",
        podAttachment: loadData.podAttachment || "",
        brokerName: loadData.brokerName || customer?.name || "",
        brokerAddress: (loadData as any).brokerAddress || customer?.address || "",
        brokerPhone: (loadData as any).brokerPhone || customer?.phone || "",
        brokerEmail: (loadData as any).brokerEmail || customer?.email || "",
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
        brokerName: "",
        brokerAddress: "",
        brokerPhone: "",
        brokerEmail: "",
      });
    }
  }, [load, fullLoad, form, customers]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // If broker information was edited and we have a customerId, update the customer
      if (values.customerId && (values.brokerName || values.brokerAddress || values.brokerPhone || values.brokerEmail)) {
        try {
          // Only include fields that were actually provided to preserve existing customer data
          const customerUpdate: any = {};
          if (values.brokerName) customerUpdate.name = values.brokerName;
          if (values.brokerAddress) customerUpdate.address = values.brokerAddress;
          if (values.brokerPhone) customerUpdate.phone = values.brokerPhone;
          if (values.brokerEmail) customerUpdate.email = values.brokerEmail;
          
          if (Object.keys(customerUpdate).length > 0) {
            await apiRequest("PATCH", `/api/customers/${values.customerId}`, customerUpdate);
          }
        } catch (error) {
          console.error("Failed to update customer:", error);
        }
      }
      
      // Keep brokerName on the load record; strip address/phone/email (stored on customer)
      const { brokerAddress, brokerPhone, brokerEmail, ...loadData } = values;
      
      if (isEditing) {
        return await apiRequest("PATCH", `/api/loads/${load.id}`, loadData);
      }
      return await apiRequest("POST", "/api/loads", loadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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
      source: activeTab === "ai" ? "ai_extract" : "manual",
    };
    mutation.mutate(cleanedValues);
  };

  const handleAIExtraction = (extractedData: any) => {
    // If a new customer was created/found during extraction, refresh the customers list
    // so the Select dropdown can show the new customer by name
    if (extractedData.customerId) {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    }

    // Find the customer if already in cache (may be null for newly created ones — that's fine,
    // the form values below still populate correctly from extractedData directly)
    const customer = extractedData.customerId ? customers.find(c => c.id === extractedData.customerId) : null;
    
    form.reset({
      loadNumber: extractedData.loadNumber || "",
      customerId: extractedData.customerId || "",
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
      brokerName: extractedData.brokerName || customer?.name || "",
      brokerAddress: extractedData.brokerAddress || customer?.address || "",
      brokerPhone: extractedData.brokerPhone || customer?.phone || "",
      brokerEmail: extractedData.brokerEmail || customer?.email || "",
    });
    setActiveTab("manual");
    
    if (extractedData.brokerName && extractedData.customerId) {
      toast({
        title: "Load data extracted with broker!",
        description: `Broker "${extractedData.brokerName}" was automatically linked as the customer.`,
      });
    } else {
      toast({
        title: "Load data extracted!",
        description: "Please review and complete the remaining fields.",
      });
    }
  };

  // Broker-only extraction: fills just the customer/broker fields without touching the rest of the form
  const handleBrokerExtraction = (extractedData: any) => {
    if (extractedData.customerId) {
      form.setValue("customerId", extractedData.customerId);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    }
    if (extractedData.brokerName)    form.setValue("brokerName",    extractedData.brokerName);
    if (extractedData.brokerAddress) form.setValue("brokerAddress", extractedData.brokerAddress);
    if (extractedData.brokerPhone)   form.setValue("brokerPhone",   extractedData.brokerPhone);
    if (extractedData.brokerEmail)   form.setValue("brokerEmail",   extractedData.brokerEmail);
    setShowBrokerExtract(false);
    toast({
      title: extractedData.brokerName
        ? `Broker found: ${extractedData.brokerName}`
        : "Extraction complete",
      description: extractedData.customerId
        ? "Customer linked successfully."
        : "Broker name filled in — please verify.",
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <FormLabel>Customer <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBrokerExtract(v => !v)}
                        data-testid="button-extract-broker-pdf"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {showBrokerExtract ? "Cancel" : "Extract from PDF"}
                      </Button>
                    </div>
                    {showBrokerExtract && (
                      <div className="mb-2">
                        <AILoadUpload
                          onExtracted={handleBrokerExtraction}
                          onClose={() => setShowBrokerExtract(false)}
                        />
                      </div>
                    )}
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer (optional)" />
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

            {/* Broker/Shipper Information Section */}
            <Card className="p-4 bg-muted/30">
              <h4 className="text-sm font-semibold mb-3 text-foreground">Broker/Shipper Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brokerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker/Shipper Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Company name" data-testid="input-broker-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brokerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="(555) 123-4567" data-testid="input-broker-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brokerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Street, City, State, ZIP" data-testid="input-broker-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brokerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" placeholder="broker@company.com" data-testid="input-broker-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
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
              {fullLoad?.podAttachments && Array.isArray(fullLoad.podAttachments) && (fullLoad.podAttachments as any[]).length > 0 && (
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
                        {(fullLoad.podAttachments as any[]).length} {(fullLoad.podAttachments as any[]).length === 1 ? 'file' : 'files'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {(fullLoad.podAttachments as any[]).map((pod: any, index: number) => {
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

              {/* Paperwork Section — only shown in edit mode */}
              {isEditing && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Paperwork
                      </CardTitle>
                      {(() => {
                        const status = (fullLoad as any)?.paperworkStatus || "missing";
                        switch (status) {
                          case "received": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" />Received</Badge>;
                          case "needs_review": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Needs Review</Badge>;
                          case "approved": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
                          case "rejected": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
                          default: return <Badge variant="outline" className="text-muted-foreground">Missing</Badge>;
                        }
                      })()}
                    </div>
                    {(fullLoad as any)?.paperworkNotes && (
                      <CardDescription className="text-xs italic">"{(fullLoad as any).paperworkNotes}"</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {loadDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No documents received yet. Documents attached via Gmail or manual upload will appear here.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {loadDocuments.map(doc => {
                          const confidence = doc.confidenceScore ? parseFloat(doc.confidenceScore) : null;
                          const docTypeLabels: Record<string, string> = { pod: "POD", bol: "BOL", rate_confirmation: "Rate Con", lumper: "Lumper", other: "Other" };
                          return (
                            <div key={doc.id} className="flex flex-col gap-2 rounded-md border p-3 bg-muted/30" data-testid={`paperwork-doc-${doc.id}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate max-w-[180px]" title={doc.fileName}>{doc.fileName}</span>
                                  <Badge variant="outline" className="text-xs shrink-0">{docTypeLabels[doc.documentType] || doc.documentType}</Badge>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {doc.fileData && (
                                    <a href={doc.fileData} download={doc.fileName}>
                                      <Button size="icon" variant="ghost" type="button"><Download className="w-3.5 h-3.5" /></Button>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {doc.extractedLoadNumber && <span><span className="text-foreground font-medium">Load#:</span> {doc.extractedLoadNumber}</span>}
                                {doc.extractedDriverName && <span><span className="text-foreground font-medium">Driver:</span> {doc.extractedDriverName}</span>}
                                {doc.isSigned !== null && (
                                  <span className={doc.isSigned ? "text-green-600 dark:text-green-400 flex items-center gap-1" : "text-red-500 flex items-center gap-1"}>
                                    <Pen className="w-3 h-3" />{doc.isSigned ? "Signed" : "Unsigned"}
                                  </span>
                                )}
                                {confidence !== null && (
                                  <span className={`flex items-center gap-1 ${confidence >= 0.85 ? "text-green-600 dark:text-green-400" : confidence >= 0.65 ? "text-yellow-600" : "text-red-500"}`}>
                                    <Bot className="w-3 h-3" />AI {Math.round(confidence * 100)}%
                                  </span>
                                )}
                                {doc.emailMessageId && <span className="text-blue-500">via Gmail</span>}
                                {doc.rejectionReason && <span className="text-red-500 italic">"{doc.rejectionReason}"</span>}
                              </div>
                              {doc.status !== "approved" && (
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500 text-green-600 hover:text-green-700 dark:border-green-600 dark:text-green-400"
                                    onClick={() => approveMutation.mutate(doc.id)}
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-approve-doc-${doc.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                                  </Button>
                                  {doc.status !== "rejected" && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500 text-red-600 hover:text-red-700 dark:border-red-600 dark:text-red-400"
                                      onClick={() => {
                                        const reason = window.prompt("Rejection reason (optional):") || "";
                                        rejectMutation.mutate({ docId: doc.id, reason });
                                      }}
                                      disabled={rejectMutation.isPending}
                                      data-testid={`button-reject-doc-${doc.id}`}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />Reject
                                    </Button>
                                  )}
                                </div>
                              )}
                              {doc.status === "approved" && (
                                <Badge className="self-start bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />Approved
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
