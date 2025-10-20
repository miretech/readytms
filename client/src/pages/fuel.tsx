import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { FuelTransaction, Truck, Driver, Load } from "@shared/schema";
import { insertFuelTransactionSchema } from "@shared/schema";

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

type FuelTransactionFormValues = z.infer<typeof fuelTransactionFormSchema>;

const vendorColors: Record<string, string> = {
  "FleetOne": "bg-blue-500",
  "Pilot": "bg-red-500",
  "Love's": "bg-yellow-500",
  "TA": "bg-green-500",
  "Flying J": "bg-purple-500",
  "Speedway": "bg-orange-500",
  "Shell": "bg-amber-500",
  "Other": "bg-gray-500",
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFuelTransaction, setEditingFuelTransaction] = useState<FuelTransaction | null>(null);
  const { toast } = useToast();

  const { data: fuelTransactions = [], isLoading } = useQuery<FuelTransaction[]>({
    queryKey: ["/api/fuel"],
  });

  const { data: trucks = [] } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
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

  const handleEdit = (transaction: FuelTransaction) => {
    setEditingFuelTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fuel purchase?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingFuelTransaction(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fuel Management</h1>
          <p className="text-sm text-muted-foreground">Track fuel purchases and fuel card transactions</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-fuel"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Fuel Purchase
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by truck, driver, vendor, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-fuel"
            />
          </div>
        </div>

        {filteredFuelTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No fuel purchases found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by recording your first fuel purchase"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-fuel">
                <Plus className="mr-2 h-4 w-4" />
                Add Fuel Purchase
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Gallons</TableHead>
                  <TableHead className="text-right">Price/Gal</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuelTransactions.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`row-fuel-${transaction.id}`}>
                    <TableCell>
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getTruckNumber(transaction.truckId)}
                    </TableCell>
                    <TableCell>{getDriverName(transaction.driverId)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`${vendorColors[transaction.vendor] || vendorColors.Other} text-white`}
                        data-testid={`badge-vendor-${transaction.id}`}
                      >
                        {transaction.vendor}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{transaction.location}</TableCell>
                    <TableCell className="text-right">
                      {Number(transaction.gallons).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(transaction.pricePerGallon).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(transaction.totalCost).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.fuelType}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${transaction.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(transaction)}
                            data-testid={`button-edit-${transaction.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(transaction.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${transaction.id}`}
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

      <FuelDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        fuelTransaction={editingFuelTransaction}
      />
    </div>
  );
}
