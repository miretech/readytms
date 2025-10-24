import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, ExternalLink, CreditCard, Fuel as FuelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FormDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FuelTransaction, FuelCard, Truck, Driver, Load } from "@shared/schema";
import { insertFuelTransactionSchema, insertFuelCardSchema } from "@shared/schema";

const fuelTransactionFormSchema = insertFuelTransactionSchema.extend({
  truckId: z.string().min(1, "Truck is required"),
  driverId: z.string().min(1, "Driver is required"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  vendor: z.string().min(1, "Vendor is required"),
  location: z.string().min(1, "Location is required"),
  gallons: z.string().min(1, "Gallons is required"),
  pricePerGallon: z.string().min(1, "Price per gallon is required"),
  totalCost: z.string().min(1, "Total cost is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
});

const fuelCardFormSchema = insertFuelCardSchema.extend({
  provider: z.string().min(1, "Provider is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
});

type FuelTransactionFormValues = z.infer<typeof fuelTransactionFormSchema>;
type FuelCardFormValues = z.infer<typeof fuelCardFormSchema>;

const vendorColors: Record<string, string> = {
  "FleetOne": "bg-blue-500",
  "Pilot": "bg-red-500",
  "Pilot Flying J": "bg-red-500",
  "Love's": "bg-yellow-500",
  "TA": "bg-green-500",
  "Flying J": "bg-purple-500",
  "Speedway": "bg-orange-500",
  "Shell": "bg-amber-500",
  "Other": "bg-gray-500",
};

// Fuel Card Dialog
interface FuelCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fuelCard?: FuelCard | null;
}

function FuelCardDialog({ open, onOpenChange, fuelCard }: FuelCardDialogProps) {
  const { toast } = useToast();
  const isEditing = !!fuelCard;

  const form = useForm<FuelCardFormValues>({
    resolver: zodResolver(fuelCardFormSchema),
    defaultValues: {
      provider: "",
      accountName: "",
      accountNumber: "",
      cardNumbers: [],
      apiUsername: "",
      apiEnabled: "false",
      portalUrl: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (fuelCard) {
      form.reset({
        provider: fuelCard.provider,
        accountName: fuelCard.accountName,
        accountNumber: fuelCard.accountNumber,
        cardNumbers: fuelCard.cardNumbers || [],
        apiUsername: fuelCard.apiUsername || "",
        apiEnabled: fuelCard.apiEnabled || "false",
        portalUrl: fuelCard.portalUrl || "",
        contactEmail: fuelCard.contactEmail || "",
        contactPhone: fuelCard.contactPhone || "",
        notes: fuelCard.notes || "",
        status: fuelCard.status || "active",
      });
    } else {
      form.reset({
        provider: "",
        accountName: "",
        accountNumber: "",
        cardNumbers: [],
        apiUsername: "",
        apiEnabled: "false",
        portalUrl: "",
        contactEmail: "",
        contactPhone: "",
        notes: "",
        status: "active",
      });
    }
  }, [fuelCard, form]);

  const mutation = useMutation({
    mutationFn: async (values: FuelCardFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/fuel-cards/${fuelCard.id}`, values);
      }
      return await apiRequest("POST", "/api/fuel-cards", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-cards"] });
      toast({
        title: isEditing ? "Fuel card updated" : "Fuel card added",
        description: `The fuel card account has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} fuel card. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FuelCardFormValues) => {
    mutation.mutate(values);
  };

  // Set default portal URL based on provider
  useEffect(() => {
    const provider = form.watch("provider");
    if (provider === "FleetOne" && !form.getValues("portalUrl")) {
      form.setValue("portalUrl", "https://manage.fleetone.com/security/fleetOneLogin");
    } else if (provider === "Pilot Flying J" && !form.getValues("portalUrl")) {
      form.setValue("portalUrl", "https://customerportal.pilotflyingj.com/");
    }
  }, [form.watch("provider")]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Fuel Card Account" : "Add Fuel Card Account"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update fuel card account details" : "Add a new FleetOne or Pilot Flying J account"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-card-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FleetOne">FleetOne (WEX)</SelectItem>
                        <SelectItem value="Pilot Flying J">Pilot Flying J</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company Name"
                        {...field}
                        data-testid="input-fuel-card-account-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Account #"
                        {...field}
                        data-testid="input-fuel-card-account-number"
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
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-card-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="portalUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portal URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-card-portal-url"
                      />
                    </FormControl>
                    <FormDescription>Link to the provider's portal</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="support@example.com"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-card-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 555-5555"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-card-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="For future API integration"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-card-api-username"
                      />
                    </FormControl>
                    <FormDescription>For automated import (when available)</FormDescription>
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
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-fuel-card-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-fuel-card"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-fuel-card"
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Fuel Transaction Dialog
interface FuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fuelTransaction?: FuelTransaction | null;
}

function FuelDialog({ open, onOpenChange, fuelTransaction }: FuelDialogProps) {
  const { toast } = useToast();
  const isEditing = !!fuelTransaction;

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: loads = [] } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const form = useForm<FuelTransactionFormValues>({
    resolver: zodResolver(fuelTransactionFormSchema),
    defaultValues: {
      truckId: "",
      driverId: "",
      loadId: "",
      transactionDate: "",
      vendor: "",
      location: "",
      gallons: "",
      pricePerGallon: "",
      totalCost: "",
      fuelType: "",
      cardNumber: "",
      receiptNumber: "",
      odometerReading: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (fuelTransaction) {
      form.reset({
        truckId: fuelTransaction.truckId,
        driverId: fuelTransaction.driverId,
        loadId: fuelTransaction.loadId || "",
        transactionDate: new Date(fuelTransaction.transactionDate).toISOString().split("T")[0],
        vendor: fuelTransaction.vendor,
        location: fuelTransaction.location,
        gallons: fuelTransaction.gallons.toString(),
        pricePerGallon: fuelTransaction.pricePerGallon.toString(),
        totalCost: fuelTransaction.totalCost.toString(),
        fuelType: fuelTransaction.fuelType,
        cardNumber: fuelTransaction.cardNumber || "",
        receiptNumber: fuelTransaction.receiptNumber || "",
        odometerReading: fuelTransaction.odometerReading || undefined,
        notes: fuelTransaction.notes || "",
      });
    } else {
      form.reset({
        truckId: "",
        driverId: "",
        loadId: "",
        transactionDate: new Date().toISOString().split("T")[0],
        vendor: "",
        location: "",
        gallons: "",
        pricePerGallon: "",
        totalCost: "",
        fuelType: "",
        cardNumber: "",
        receiptNumber: "",
        odometerReading: undefined,
        notes: "",
      });
    }
  }, [fuelTransaction, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "gallons" || name === "pricePerGallon") {
        const gallons = parseFloat(value.gallons || "0");
        const pricePerGallon = parseFloat(value.pricePerGallon || "0");
        const totalCost = gallons * pricePerGallon;
        form.setValue("totalCost", totalCost.toFixed(2));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (values: FuelTransactionFormValues) => {
      const payload: any = {
        ...values,
        loadId: values.loadId || undefined,
        cardNumber: values.cardNumber || undefined,
        receiptNumber: values.receiptNumber || undefined,
        odometerReading: values.odometerReading || undefined,
        notes: values.notes || undefined,
      };

      if (isEditing) {
        return await apiRequest("PATCH", `/api/fuel/${fuelTransaction.id}`, payload);
      }
      return await apiRequest("POST", "/api/fuel", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel"] });
      toast({
        title: isEditing ? "Fuel purchase updated" : "Fuel purchase recorded",
        description: `The fuel transaction has been successfully ${isEditing ? "updated" : "recorded"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} fuel purchase. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FuelTransactionFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Fuel Purchase" : "Add Fuel Purchase"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update fuel transaction details" : "Record a new fuel purchase"}
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
                    <FormLabel>Truck *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-truck">
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
                    <FormLabel>Driver *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-driver">
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
                name="loadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-load">
                          <SelectValue placeholder="Select load" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-fuel-transaction-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FleetOne">FleetOne</SelectItem>
                        <SelectItem value="Pilot">Pilot</SelectItem>
                        <SelectItem value="Pilot Flying J">Pilot Flying J</SelectItem>
                        <SelectItem value="Love's">Love's</SelectItem>
                        <SelectItem value="TA">TA</SelectItem>
                        <SelectItem value="Flying J">Flying J</SelectItem>
                        <SelectItem value="Speedway">Speedway</SelectItem>
                        <SelectItem value="Shell">Shell</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City, State"
                        {...field}
                        data-testid="input-fuel-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gallons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gallons *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                        data-testid="input-fuel-gallons"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerGallon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Gallon *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                        data-testid="input-fuel-price-per-gallon"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        readOnly
                        className="bg-muted"
                        data-testid="input-fuel-total-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fuel-type">
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Gas">Gas</SelectItem>
                        <SelectItem value="DEF">DEF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number (Last 4 Digits)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234"
                        maxLength={4}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-card-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Receipt #"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-fuel-receipt-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometerReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer Reading</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="123456"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-fuel-odometer"
                      />
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
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-fuel-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-fuel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-fuel"
              >
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Fuel() {
  const [activeTab, setActiveTab] = useState("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingFuelCard, setEditingFuelCard] = useState<FuelCard | null>(null);
  const [editingFuelTransaction, setEditingFuelTransaction] = useState<FuelTransaction | null>(null);
  const { toast } = useToast();

  const { data: fuelCards = [], isLoading: isLoadingCards } = useQuery<FuelCard[]>({
    queryKey: ["/api/fuel-cards"],
  });

  const { data: fuelTransactions = [], isLoading: isLoadingTransactions } = useQuery<FuelTransaction[]>({
    queryKey: ["/api/fuel-cards"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/fuel-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-cards"] });
      toast({
        title: "Fuel card deleted",
        description: "The fuel card account has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete fuel card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/fuel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel"] });
      toast({
        title: "Fuel purchase deleted",
        description: "The fuel transaction has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete fuel purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getTruckNumber = (truckId: string) => {
    const truck = trucks.find((t) => t.id === truckId);
    return truck?.truckNumber || "N/A";
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "N/A";
  };

  const filteredFuelCards = fuelCards.filter((card) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      card.provider.toLowerCase().includes(searchLower) ||
      card.accountName.toLowerCase().includes(searchLower) ||
      card.accountNumber.toLowerCase().includes(searchLower)
    );
  });

  const filteredFuelTransactions = fuelTransactions.filter((transaction) => {
    const searchLower = searchQuery.toLowerCase();
    const truckNumber = getTruckNumber(transaction.truckId).toLowerCase();
    const driverName = getDriverName(transaction.driverId).toLowerCase();
    const vendor = transaction.vendor.toLowerCase();
    const location = transaction.location.toLowerCase();

    return (
      truckNumber.includes(searchLower) ||
      driverName.includes(searchLower) ||
      vendor.includes(searchLower) ||
      location.includes(searchLower)
    );
  });

  const handleEditCard = (card: FuelCard) => {
    setEditingFuelCard(card);
    setIsCardDialogOpen(true);
  };

  const handleDeleteCard = (id: string) => {
    if (confirm("Are you sure you want to delete this fuel card account?")) {
      deleteCardMutation.mutate(id);
    }
  };

  const handleEditTransaction = (transaction: FuelTransaction) => {
    setEditingFuelTransaction(transaction);
    setIsTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Are you sure you want to delete this fuel purchase?")) {
      deleteTransactionMutation.mutate(id);
    }
  };

  const handleCardDialogClose = () => {
    setIsCardDialogOpen(false);
    setEditingFuelCard(null);
  };

  const handleTransactionDialogClose = () => {
    setIsTransactionDialogOpen(false);
    setEditingFuelTransaction(null);
  };

  if (isLoadingCards || isLoadingTransactions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fuel Management</h1>
        <p className="text-sm text-muted-foreground">Manage fuel card accounts and track fuel purchases</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cards" data-testid="tab-fuel-cards">
            <CreditCard className="mr-2 h-4 w-4" />
            Fuel Card Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-fuel-transactions">
            <FuelIcon className="mr-2 h-4 w-4" />
            Fuel Transactions
          </TabsTrigger>
        </TabsList>

        {/* Fuel Cards Tab */}
        <TabsContent value="cards" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search fuel cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-fuel-cards"
              />
            </div>
            <Button
              onClick={() => setIsCardDialogOpen(true)}
              data-testid="button-create-fuel-card"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fuel Card
            </Button>
          </div>

          <Card className="p-6">
            {filteredFuelCards.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No fuel cards</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your FleetOne or Pilot Flying J accounts to get started
                </p>
                <Button onClick={() => setIsCardDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fuel Card
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>API Integration</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFuelCards.map((card) => (
                    <TableRow key={card.id} data-testid={`row-fuel-card-${card.id}`}>
                      <TableCell className="font-medium">{card.provider}</TableCell>
                      <TableCell>{card.accountName}</TableCell>
                      <TableCell>{card.accountNumber}</TableCell>
                      <TableCell>
                        {card.portalUrl ? (
                          <a
                            href={card.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                            data-testid={`link-fuel-portal-${card.id}`}
                          >
                            Open Portal <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={card.status === "active" ? "default" : "secondary"} data-testid={`badge-fuel-card-status-${card.id}`}>
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={card.apiEnabled === "true" ? "default" : "outline"} data-testid={`badge-fuel-card-api-${card.id}`}>
                          {card.apiEnabled === "true" ? "Enabled" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-fuel-card-actions-${card.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCard(card)} data-testid={`action-edit-fuel-card-${card.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCard(card.id)}
                              className="text-destructive"
                              data-testid={`action-delete-fuel-card-${card.id}`}
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
            )}
          </Card>
        </TabsContent>

        {/* Fuel Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-fuel-transactions"
              />
            </div>
            <Button
              onClick={() => setIsTransactionDialogOpen(true)}
              data-testid="button-create-fuel-transaction"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Fuel Purchase
            </Button>
          </div>

          <Card className="p-6">
            {filteredFuelTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FuelIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No fuel transactions</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Record fuel purchases to track expenses
                </p>
                <Button onClick={() => setIsTransactionDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fuel Purchase
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Truck</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Gallons</TableHead>
                      <TableHead className="text-right">Price/Gal</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFuelTransactions.map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`row-fuel-transaction-${transaction.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getTruckNumber(transaction.truckId)}</TableCell>
                        <TableCell>{getDriverName(transaction.driverId)}</TableCell>
                        <TableCell>
                          <Badge className={vendorColors[transaction.vendor] || "bg-gray-500"}>
                            {transaction.vendor}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.location}</TableCell>
                        <TableCell>{transaction.fuelType}</TableCell>
                        <TableCell className="text-right">{parseFloat(transaction.gallons).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(transaction.pricePerGallon).toFixed(3)}</TableCell>
                        <TableCell className="text-right font-medium">${parseFloat(transaction.totalCost).toFixed(2)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-fuel-transaction-actions-${transaction.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTransaction(transaction)} data-testid={`action-edit-fuel-transaction-${transaction.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-destructive"
                                data-testid={`action-delete-fuel-transaction-${transaction.id}`}
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

      {/* Dialogs */}
      <FuelCardDialog
        open={isCardDialogOpen}
        onOpenChange={handleCardDialogClose}
        fuelCard={editingFuelCard}
      />
      <FuelDialog
        open={isTransactionDialogOpen}
        onOpenChange={handleTransactionDialogClose}
        fuelTransaction={editingFuelTransaction}
      />
    </div>
  );
}
