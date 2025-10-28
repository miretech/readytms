import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, Receipt, Eye, Zap, Package, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertSettlementSchema, type Settlement, type Driver, type SettlementLineItem, type Load } from "@shared/schema";

const settlementFormSchema = insertSettlementSchema.extend({
  driverId: z.string().min(1, "Driver is required"),
  truckNumber: z.string().optional(),
  settlementNumber: z.string().min(1, "Settlement number is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  totalRevenue: z.string().min(1, "Total revenue is required"),
  driverPayPercentage: z.string().min(1, "Driver pay percentage is required"),
  tolls: z.string().optional(),
  fuel: z.string().optional(),
  advance: z.string().optional(),
  factoringFeePercentage: z.string().optional(),
  insurance: z.string().optional(),
  trailerFee: z.string().optional(),
  truckRepair: z.string().optional(),
  trailerRepair: z.string().optional(),
  deductions: z.string().optional(),
  netPay: z.string().min(1, "Net pay is required"),
  status: z.string().min(1, "Status is required"),
  paidDate: z.string().optional(),
});

type SettlementFormValues = z.infer<typeof settlementFormSchema>;

function SettlementDialog({
  open,
  onOpenChange,
  settlement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement?: Settlement | null;
}) {
  const { toast } = useToast();
  const isEditing = !!settlement;

  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      driverId: "",
      truckNumber: "",
      settlementNumber: "",
      periodStart: "",
      periodEnd: "",
      totalMiles: undefined,
      totalRevenue: "",
      driverPayPercentage: "",
      tolls: "0",
      fuel: "0",
      advance: "0",
      factoringFeePercentage: "0",
      insurance: "0",
      trailerFee: "0",
      truckRepair: "0",
      trailerRepair: "0",
      deductions: "0",
      netPay: "",
      status: "Pending",
      paidDate: "",
      paymentMethod: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (settlement) {
      form.reset({
        driverId: settlement.driverId,
        truckNumber: settlement.truckNumber || "",
        settlementNumber: settlement.settlementNumber,
        periodStart: new Date(settlement.periodStart).toISOString().split("T")[0],
        periodEnd: new Date(settlement.periodEnd).toISOString().split("T")[0],
        totalMiles: settlement.totalMiles || undefined,
        totalRevenue: settlement.totalRevenue.toString(),
        driverPayPercentage: settlement.driverPayPercentage.toString(),
        tolls: settlement.tolls?.toString() || "0",
        fuel: settlement.fuel?.toString() || "0",
        advance: settlement.advance?.toString() || "0",
        factoringFeePercentage: settlement.factoringFeePercentage?.toString() || "0",
        insurance: settlement.insurance?.toString() || "0",
        trailerFee: settlement.trailerFee?.toString() || "0",
        truckRepair: settlement.truckRepair?.toString() || "0",
        trailerRepair: settlement.trailerRepair?.toString() || "0",
        deductions: settlement.deductions?.toString() || "0",
        netPay: settlement.netPay.toString(),
        status: settlement.status,
        paidDate: settlement.paidDate ? new Date(settlement.paidDate).toISOString().split("T")[0] : "",
        paymentMethod: settlement.paymentMethod || "",
        notes: settlement.notes || "",
      });
    } else {
      const today = new Date();
      const settlementNumber = `SETTLE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      form.reset({
        driverId: "",
        truckNumber: "",
        settlementNumber,
        periodStart: "",
        periodEnd: "",
        totalMiles: undefined,
        totalRevenue: "",
        driverPayPercentage: "",
        tolls: "0",
        fuel: "0",
        advance: "0",
        factoringFeePercentage: "0",
        insurance: "0",
        trailerFee: "0",
        truckRepair: "0",
        trailerRepair: "0",
        deductions: "0",
        netPay: "",
        status: "Pending",
        paidDate: "",
        paymentMethod: "",
        notes: "",
      });
    }
  }, [settlement, form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Calculate total deductions and net pay when any relevant field changes
      const relevantFields = ["driverPayPercentage", "totalRevenue", "factoringFeePercentage", "tolls", "fuel", "advance", "insurance", "trailerFee", "truckRepair", "trailerRepair"];
      
      if (relevantFields.includes(name || "")) {
        const totalRevenue = parseFloat(value.totalRevenue || "0");
        const driverPayPct = parseFloat(value.driverPayPercentage || "0");
        const factoringPct = parseFloat(value.factoringFeePercentage || "0");
        
        // Calculate factoring fee from percentage (deducted from revenue first)
        const factoringFee = (totalRevenue * factoringPct) / 100;
        
        // Calculate net revenue after factoring
        const netRevenue = totalRevenue - factoringFee;
        
        // Calculate driver pay from NET revenue (after factoring)
        const driverPay = (netRevenue * driverPayPct) / 100;
        
        // Sum all other deductions (NOT including factoring - it's already deducted from revenue)
        const tolls = parseFloat(value.tolls || "0");
        const fuel = parseFloat(value.fuel || "0");
        const advance = parseFloat(value.advance || "0");
        const insurance = parseFloat(value.insurance || "0");
        const trailerFee = parseFloat(value.trailerFee || "0");
        const truckRepair = parseFloat(value.truckRepair || "0");
        const trailerRepair = parseFloat(value.trailerRepair || "0");
        
        // Calculate ONLY other deductions (factoring already removed from revenue, so don't count it again)
        const otherDeductions = tolls + fuel + advance + insurance + trailerFee + truckRepair + trailerRepair;
        
        // Store only OTHER deductions in the deductions field (for consistency)
        form.setValue("deductions", otherDeductions.toFixed(2));
        
        // Net pay = driver pay (from net revenue) - other deductions
        const netPay = driverPay - otherDeductions;
        form.setValue("netPay", netPay.toFixed(2));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (values: SettlementFormValues) => {
      const payload = {
        ...values,
        totalMiles: values.totalMiles || undefined,
        paidDate: values.paidDate || undefined,
        paymentMethod: values.paymentMethod || undefined,
        notes: values.notes || undefined,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/settlements/${settlement.id}`, payload);
      }
      return await apiRequest("POST", "/api/settlements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({
        title: isEditing ? "Settlement updated" : "Settlement created",
        description: `Settlement has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} settlement.`,
        variant: "destructive",
      });
    },
  });

  const statusValue = form.watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Settlement" : "Create Settlement"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update settlement information" : "Create a new driver settlement"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
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
                name="settlementNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-settlement-number" readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="truckNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Truck Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-truck-number" placeholder="TRK-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-start" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalMiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Miles (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-total-miles"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Revenue</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-total-revenue"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverPayPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Pay (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-driver-pay-percentage"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Deductions</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="factoringFeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Factoring Fee (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-factoring-fee-percentage"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tolls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tolls ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-tolls"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-fuel"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-advance"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-insurance"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailerFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-trailer-fee"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="truckRepair"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Repair ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-truck-repair"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailerRepair"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer Repair ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-trailer-repair"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="deductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Deductions (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-deductions"
                        placeholder="0.00"
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="netPay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Net Pay (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-net-pay"
                        placeholder="0.00"
                        readOnly
                        className="bg-muted"
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {statusValue === "Paid" && (
                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-paid-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Wire">Wire</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} data-testid="input-notes" rows={3} />
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
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? "Saving..." : isEditing ? "Update Settlement" : "Create Settlement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SettlementDetailsDialog({
  open,
  onOpenChange,
  settlementId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementId: string | null;
}) {
  const { data: lineItems = [], isLoading } = useQuery<SettlementLineItem[]>({
    queryKey: ["/api/settlement-line-items", settlementId],
    enabled: !!settlementId,
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settlement Details</DialogTitle>
          <DialogDescription>
            View detailed line items for this settlement
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : lineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No line items found for this settlement</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Load #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.itemType === "revenue" ? "default" : "secondary"}>
                        {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.loadId || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.itemType === "deduction" && "-"}
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AutoGenerateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        driverIds: selectedDrivers.length > 0 ? selectedDrivers : undefined,
        periodStart,
        periodEnd,
      };
      return await apiRequest("POST", "/api/settlements/auto-generate", payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({
        title: "Settlements generated",
        description: `Successfully created ${data.count || 0} settlement(s) from completed loads.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate settlements. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      toast({
        title: "Validation error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    autoGenerateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-Generate Settlements</DialogTitle>
          <DialogDescription>
            Automatically create settlements from completed loads for the selected period
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start</label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                data-testid="input-period-start"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period End</label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                data-testid="input-period-end"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Drivers (Optional - Leave empty for all drivers)</label>
            <Select
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedDrivers([]);
                } else {
                  setSelectedDrivers([value]);
                }
              }}
            >
              <SelectTrigger data-testid="select-drivers">
                <SelectValue placeholder="All drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={autoGenerateMutation.isPending} data-testid="button-generate">
              {autoGenerateMutation.isPending ? "Generating..." : "Generate Settlements"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "Paid":
      return "default";
    case "Approved":
      return "secondary";
    case "Pending":
      return "outline";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default function Settlements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);
  const { toast } = useToast();

  const { data: settlements = [], isLoading } = useQuery<Settlement[]>({
    queryKey: ["/api/settlements"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/settlements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({
        title: "Settlement deleted",
        description: "The settlement has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete settlement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "Unknown Driver";
  };

  const filteredSettlements = settlements.filter((settlement) => {
    const driverName = getDriverName(settlement.driverId).toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      settlement.settlementNumber.toLowerCase().includes(query) ||
      driverName.includes(query)
    );
  });

  const handleEdit = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this settlement?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSettlement(null);
  };

  const handleViewDetails = (settlementId: string) => {
    setSelectedSettlementId(settlementId);
    setIsDetailsDialogOpen(true);
  };

  const handleDownloadPDF = (settlement: Settlement) => {
    const doc = new jsPDF();
    const driverName = getDriverName(settlement.driverId);
    
    // Calculate values - CORRECT METHOD: Factoring deducted FIRST
    const totalRevenue = Number(settlement.totalRevenue);
    const factoringPct = Number(settlement.factoringFeePercentage || 0);
    const factoringFee = (totalRevenue * factoringPct) / 100;
    const netRevenue = totalRevenue - factoringFee; // Revenue after factoring
    const driverPayPct = Number(settlement.driverPayPercentage);
    const driverPay = (netRevenue * driverPayPct) / 100; // Driver pay from NET revenue
    
    // Header
    doc.setFontSize(20);
    doc.text("Driver Settlement", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Settlement #: ${settlement.settlementNumber}`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 35);
    
    // Driver Info
    doc.setFontSize(14);
    doc.text("Driver Information", 20, 50);
    doc.setFontSize(10);
    doc.text(`Driver: ${driverName}`, 20, 60);
    doc.text(`Truck: ${settlement.truckNumber || "N/A"}`, 20, 67);
    doc.text(`Period: ${new Date(settlement.periodStart).toLocaleDateString()} - ${new Date(settlement.periodEnd).toLocaleDateString()}`, 20, 74);
    
    // Revenue Section
    doc.setFontSize(14);
    doc.text("Revenue Breakdown", 20, 90);
    doc.setFontSize(10);
    doc.text(`Total Revenue:`, 20, 100);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 100, { align: "right" });
    
    if (factoringFee > 0) {
      doc.text(`Less: Factoring Fee (${factoringPct.toFixed(2)}%):`, 20, 107);
      doc.text(`-$${factoringFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 107, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`Net Revenue (after factoring):`, 20, 114);
      doc.text(`$${netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 114, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Driver Pay (${driverPayPct.toFixed(2)}% of net):`, 20, 121);
      doc.text(`$${driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 121, { align: "right" });
    } else {
      doc.text(`Driver Pay (${driverPayPct.toFixed(2)}%):`, 20, 107);
      doc.text(`$${driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 107, { align: "right" });
    }
    
    // Deductions Section (factoring already handled above)
    const startYPos = factoringFee > 0 ? 135 : 120;
    doc.setFontSize(14);
    doc.text("Other Deductions", 20, startYPos);
    doc.setFontSize(10);
    let yPos = startYPos + 10;
    
    const deductions = [
      { label: "Tolls", value: Number(settlement.tolls || 0) },
      { label: "Fuel", value: Number(settlement.fuel || 0) },
      { label: "Advance", value: Number(settlement.advance || 0) },
      { label: "Insurance", value: Number(settlement.insurance || 0) },
      { label: "Trailer Fee", value: Number(settlement.trailerFee || 0) },
      { label: "Truck Repair", value: Number(settlement.truckRepair || 0) },
      { label: "Trailer Repair", value: Number(settlement.trailerRepair || 0) },
    ];
    
    deductions.forEach(({ label, value }) => {
      if (value > 0) {
        doc.text(`${label}:`, 20, yPos);
        doc.text(`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 7;
      }
    });
    
    // Total Other Deductions - recalculate to ensure accuracy
    const otherDeductionsTotal = deductions.reduce((sum, { value }) => sum + value, 0);
    doc.setFontSize(12);
    yPos += 5;
    doc.text(`Total Other Deductions:`, 20, yPos);
    doc.text(`$${otherDeductionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    
    // Net Pay - recalculate from driverPay - otherDeductions (factoring already removed from revenue)
    const correctNetPay = driverPay - otherDeductionsTotal;
    yPos += 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Pay:`, 20, yPos);
    doc.text(`$${correctNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    
    // Payment Info
    if (settlement.status === "Paid" && settlement.paidDate) {
      yPos += 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Payment Status: ${settlement.status}`, 20, yPos);
      doc.text(`Paid Date: ${new Date(settlement.paidDate).toLocaleDateString()}`, 20, yPos + 7);
      if (settlement.paymentMethod) {
        doc.text(`Payment Method: ${settlement.paymentMethod}`, 20, yPos + 14);
      }
    }
    
    // Notes
    if (settlement.notes) {
      yPos += 25;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(settlement.notes, 170);
      doc.text(lines, 20, yPos + 7);
    }
    
    // Save PDF
    doc.save(`Settlement-${settlement.settlementNumber}.pdf`);
    
    toast({
      title: "PDF Downloaded",
      description: `Settlement ${settlement.settlementNumber} has been downloaded as PDF.`,
    });
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
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-title">
            Driver Settlements
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
            Manage driver payroll and payments
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsAutoGenerateOpen(true)}
            data-testid="button-auto-generate"
          >
            <Zap className="mr-2 h-4 w-4" />
            Auto-Generate
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            data-testid="button-create-settlement"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Settlement
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by settlement number or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {filteredSettlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium" data-testid="text-empty-title">
              No settlements found
            </h3>
            <p className="mb-4 text-sm text-muted-foreground" data-testid="text-empty-description">
              {searchQuery ? "Try adjusting your search" : "Get started by creating your first settlement"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create">
                <Plus className="mr-2 h-4 w-4" />
                Create Settlement
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement #</TableHead>
                  <TableHead>Truck #</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Miles</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Driver Pay %</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.map((settlement) => (
                  <TableRow key={settlement.id} data-testid={`row-settlement-${settlement.id}`}>
                    <TableCell className="font-medium" data-testid={`text-settlement-number-${settlement.id}`}>
                      {settlement.settlementNumber}
                    </TableCell>
                    <TableCell data-testid={`text-truck-number-${settlement.id}`}>
                      {settlement.truckNumber || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-driver-${settlement.id}`}>
                      {getDriverName(settlement.driverId)}
                    </TableCell>
                    <TableCell data-testid={`text-period-${settlement.id}`}>
                      <div className="text-sm">
                        {new Date(settlement.periodStart).toLocaleDateString()} -{" "}
                        {new Date(settlement.periodEnd).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-miles-${settlement.id}`}>
                      {settlement.totalMiles ? settlement.totalMiles.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-revenue-${settlement.id}`}>
                      ${Number(settlement.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-driver-pay-${settlement.id}`}>
                      {Number(settlement.driverPayPercentage).toFixed(2)}%
                    </TableCell>
                    <TableCell data-testid={`text-deductions-${settlement.id}`}>
                      ${Number(settlement.deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold" data-testid={`text-net-pay-${settlement.id}`}>
                      ${Number(settlement.netPay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${settlement.id}`}>
                      <Badge variant={getStatusBadgeVariant(settlement.status)}>
                        {settlement.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-paid-date-${settlement.id}`}>
                      {settlement.paidDate ? new Date(settlement.paidDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${settlement.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(settlement.id)}
                            data-testid={`button-view-details-${settlement.id}`}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(settlement)}
                            data-testid={`button-download-pdf-${settlement.id}`}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(settlement)}
                            data-testid={`button-edit-${settlement.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(settlement.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${settlement.id}`}
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

      <SettlementDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        settlement={editingSettlement}
      />
      <SettlementDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        settlementId={selectedSettlementId}
      />
      <AutoGenerateDialog
        open={isAutoGenerateOpen}
        onOpenChange={setIsAutoGenerateOpen}
      />
    </div>
  );
}
