import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertLoadSchema, type Load, type Customer, type Driver, type Truck } from "@shared/schema";
import { Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const formSchema = insertLoadSchema.extend({
  customerId: z.string().min(1, "Customer is required"),
  status: z.string().min(1, "Status is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  rate: z.string().min(1, "Rate is required"),
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
    },
  });

  useEffect(() => {
    if (load) {
      form.reset({
        loadNumber: load.loadNumber,
        customerId: load.customerId,
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
    mutation.mutate(values);
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
                      <Input {...field} placeholder="e.g., Electronics" data-testid="input-commodity" />
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
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-weight" />
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
                    <Textarea {...field} rows={3} data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        <Input {...field} data-testid="input-commodity" />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-weight" />
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
                      <Textarea {...field} rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
    </Dialog>
  );
}
