import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, Receipt, Eye, Zap, Package, Download, X } from "lucide-react";
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
  lineItems: z.array(z.object({
    brokerName: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    grossAmount: z.string().min(1, "Amount is required"),
  })).optional(),
  totalRevenue: z.string().min(1, "Total revenue is required"),
  driverPayPercentage: z.string().min(1, "Driver pay percentage is required"),
  dispatchPercentage: z.string().optional(),
  advance: z.string().optional(),
  advanceBalance: z.string().optional(),
  advanceDate: z.string().optional(),
  fuelFlyingJ: z.string().optional(),
  fuelFlyingJStartDate: z.string().optional(),
  fuelFlyingJEndDate: z.string().optional(),
  fuelFleetOne: z.string().optional(),
  fuelFleetOneStartDate: z.string().optional(),
  fuelFleetOneEndDate: z.string().optional(),
  tolls: z.string().optional(),
  tollsStartDate: z.string().optional(),
  tollsEndDate: z.string().optional(),
  fuel: z.string().optional(),
  factoringFeePercentage: z.string().optional(),
  insurance: z.string().optional(),
  insuranceStartDate: z.string().optional(),
  insuranceEndDate: z.string().optional(),
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
      lineItems: [{ brokerName: "", description: "", grossAmount: "" }],
      totalRevenue: "0",
      driverPayPercentage: "",
      dispatchPercentage: "0",
      advance: "0",
      advanceBalance: "0",
      advanceDate: "",
      fuelFlyingJ: "0",
      fuelFlyingJStartDate: "",
      fuelFlyingJEndDate: "",
      fuelFleetOne: "0",
      fuelFleetOneStartDate: "",
      fuelFleetOneEndDate: "",
      tolls: "0",
      tollsStartDate: "",
      tollsEndDate: "",
      fuel: "0",
      factoringFeePercentage: "0",
      insurance: "0",
      insuranceStartDate: "",
      insuranceEndDate: "",
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

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const totalRevenueRef = useRef<string>("0");

  // Fetch existing line items when editing
  const { data: existingLineItems = [] } = useQuery<SettlementLineItem[]>({
    queryKey: ["/api/settlements", settlement?.id, "line-items"],
    enabled: isEditing && !!settlement?.id,
  });

  // Populate line items when editing
  useEffect(() => {
    if (isEditing && existingLineItems.length > 0) {
      const lineItemsData = existingLineItems.map(item => ({
        brokerName: item.brokerName || "",
        description: item.description,
        grossAmount: item.grossAmount.toString(),
      }));
      // Use replace to update the field array properly
      replace(lineItemsData);
    }
  }, [existingLineItems, isEditing, replace]);

  // Auto-calculate total revenue from line items
  useEffect(() => {
    const subscription = form.watch((value) => {
      const lineItems = value.lineItems || [];
      const total = lineItems.reduce((sum, item) => {
        const amount = parseFloat(item?.grossAmount || "0");
        return sum + amount;
      }, 0);
      
      const totalStr = total.toFixed(2);
      if (totalRevenueRef.current !== totalStr) {
        totalRevenueRef.current = totalStr;
        form.setValue("totalRevenue", totalStr, { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (settlement) {
      form.reset({
        driverId: settlement.driverId,
        truckNumber: settlement.truckNumber || "",
        settlementNumber: settlement.settlementNumber,
        periodStart: new Date(settlement.periodStart).toISOString().split("T")[0],
        periodEnd: new Date(settlement.periodEnd).toISOString().split("T")[0],
        totalMiles: settlement.totalMiles || undefined,
        lineItems: [{ brokerName: "", description: "", grossAmount: "" }],
        totalRevenue: settlement.totalRevenue.toString(),
        driverPayPercentage: settlement.driverPayPercentage.toString(),
        dispatchPercentage: settlement.dispatchPercentage?.toString() || "0",
        advance: settlement.advance?.toString() || "0",
        advanceBalance: settlement.advanceBalance?.toString() || "0",
        advanceDate: settlement.advanceDate ? new Date(settlement.advanceDate).toISOString().split("T")[0] : "",
        fuelFlyingJ: settlement.fuelFlyingJ?.toString() || "0",
        fuelFlyingJStartDate: settlement.fuelFlyingJStartDate ? new Date(settlement.fuelFlyingJStartDate).toISOString().split("T")[0] : "",
        fuelFlyingJEndDate: settlement.fuelFlyingJEndDate ? new Date(settlement.fuelFlyingJEndDate).toISOString().split("T")[0] : "",
        fuelFleetOne: settlement.fuelFleetOne?.toString() || "0",
        fuelFleetOneStartDate: settlement.fuelFleetOneStartDate ? new Date(settlement.fuelFleetOneStartDate).toISOString().split("T")[0] : "",
        fuelFleetOneEndDate: settlement.fuelFleetOneEndDate ? new Date(settlement.fuelFleetOneEndDate).toISOString().split("T")[0] : "",
        tolls: settlement.tolls?.toString() || "0",
        tollsStartDate: settlement.tollsStartDate ? new Date(settlement.tollsStartDate).toISOString().split("T")[0] : "",
        tollsEndDate: settlement.tollsEndDate ? new Date(settlement.tollsEndDate).toISOString().split("T")[0] : "",
        fuel: settlement.fuel?.toString() || "0",
        factoringFeePercentage: settlement.factoringFeePercentage?.toString() || "0",
        insurance: settlement.insurance?.toString() || "0",
        insuranceStartDate: settlement.insuranceStartDate ? new Date(settlement.insuranceStartDate).toISOString().split("T")[0] : "",
        insuranceEndDate: settlement.insuranceEndDate ? new Date(settlement.insuranceEndDate).toISOString().split("T")[0] : "",
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
        lineItems: [{ brokerName: "", description: "", grossAmount: "" }],
        totalRevenue: "0",
        driverPayPercentage: "",
        dispatchPercentage: "0",
        advance: "0",
        advanceBalance: "0",
        advanceDate: "",
        fuelFlyingJ: "0",
        fuelFleetOne: "0",
        tolls: "0",
        fuel: "0",
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
      const relevantFields = ["driverPayPercentage", "dispatchPercentage", "totalRevenue", "factoringFeePercentage", "tolls", "fuel", "fuelFlyingJ", "fuelFleetOne", "advance", "insurance", "trailerFee", "truckRepair", "trailerRepair"];
      
      if (relevantFields.includes(name || "")) {
        const totalRevenue = parseFloat(value.totalRevenue || "0");
        const driverPayPct = parseFloat(value.driverPayPercentage || "0");
        const dispatchPct = parseFloat(value.dispatchPercentage || "0");
        const factoringPct = parseFloat(value.factoringFeePercentage || "0");
        
        // Calculate driver pay from GROSS revenue
        const driverPay = (totalRevenue * driverPayPct) / 100;
        
        // Calculate dispatch fee from percentage
        const dispatchFee = (totalRevenue * dispatchPct) / 100;
        
        // Calculate factoring fee from percentage
        const factoringFee = (totalRevenue * factoringPct) / 100;
        
        // Sum all deductions INCLUDING dispatch, factoring, and fuel sections
        const tolls = parseFloat(value.tolls || "0");
        const fuel = parseFloat(value.fuel || "0");
        const fuelFlyingJ = parseFloat(value.fuelFlyingJ || "0");
        const fuelFleetOne = parseFloat(value.fuelFleetOne || "0");
        const advance = parseFloat(value.advance || "0");
        const insurance = parseFloat(value.insurance || "0");
        const trailerFee = parseFloat(value.trailerFee || "0");
        const truckRepair = parseFloat(value.truckRepair || "0");
        const trailerRepair = parseFloat(value.trailerRepair || "0");
        
        // Total deductions = dispatch + factoring + fuel sections + all other deductions
        const totalDeductions = dispatchFee + factoringFee + tolls + fuel + fuelFlyingJ + fuelFleetOne + advance + insurance + trailerFee + truckRepair + trailerRepair;
        
        // Debug logging
        console.log("Settlement Calculation:", {
          totalRevenue,
          driverPayPct,
          driverPay,
          dispatchPct,
          dispatchFee,
          factoringPct,
          factoringFee,
          tolls,
          fuel,
          fuelFlyingJ,
          fuelFleetOne,
          advance,
          insurance,
          trailerFee,
          truckRepair,
          trailerRepair,
          totalDeductions,
          netPay: driverPay - totalDeductions
        });
        
        // Store total deductions
        form.setValue("deductions", totalDeductions.toFixed(2));
        
        // Net pay = driver pay (from gross) - total deductions
        const netPay = driverPay - totalDeductions;
        form.setValue("netPay", netPay.toFixed(2));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (values: SettlementFormValues) => {
      const payload = {
        driverId: values.driverId,
        truckNumber: values.truckNumber || undefined,
        settlementNumber: values.settlementNumber,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        totalMiles: values.totalMiles || undefined,
        totalRevenue: parseFloat(values.totalRevenue),
        driverPayPercentage: parseFloat(values.driverPayPercentage),
        dispatchPercentage: parseFloat(values.dispatchPercentage || "0"),
        advance: parseFloat(values.advance || "0"),
        advanceBalance: parseFloat(values.advanceBalance || "0"),
        advanceDate: values.advanceDate || undefined,
        fuelFlyingJ: parseFloat(values.fuelFlyingJ || "0"),
        fuelFlyingJStartDate: values.fuelFlyingJStartDate || undefined,
        fuelFlyingJEndDate: values.fuelFlyingJEndDate || undefined,
        fuelFleetOne: parseFloat(values.fuelFleetOne || "0"),
        fuelFleetOneStartDate: values.fuelFleetOneStartDate || undefined,
        fuelFleetOneEndDate: values.fuelFleetOneEndDate || undefined,
        tolls: parseFloat(values.tolls || "0"),
        tollsStartDate: values.tollsStartDate || undefined,
        tollsEndDate: values.tollsEndDate || undefined,
        fuel: parseFloat(values.fuel || "0"),
        factoringFeePercentage: parseFloat(values.factoringFeePercentage || "0"),
        insurance: parseFloat(values.insurance || "0"),
        insuranceStartDate: values.insuranceStartDate || undefined,
        insuranceEndDate: values.insuranceEndDate || undefined,
        trailerFee: parseFloat(values.trailerFee || "0"),
        truckRepair: parseFloat(values.truckRepair || "0"),
        trailerRepair: parseFloat(values.trailerRepair || "0"),
        deductions: parseFloat(values.deductions || "0"),
        netPay: parseFloat(values.netPay),
        status: values.status,
        paidDate: values.paidDate || undefined,
        paymentMethod: values.paymentMethod || undefined,
        notes: values.notes || undefined,
      };
      
      let savedSettlement;
      if (isEditing) {
        savedSettlement = await apiRequest("PATCH", `/api/settlements/${settlement.id}`, payload);
      } else {
        savedSettlement = await apiRequest("POST", "/api/settlements", payload);
      }

      // Delete existing line items if editing
      if (isEditing && existingLineItems.length > 0) {
        await Promise.all(
          existingLineItems.map(item =>
            apiRequest("DELETE", `/api/settlement-line-items/${item.id}`)
          )
        );
      }

      // Save line items
      const lineItems = values.lineItems || [];
      await Promise.all(
        lineItems
          .filter(item => item.description && item.grossAmount)
          .map(item =>
            apiRequest("POST", `/api/settlements/${savedSettlement.id}/line-items`, {
              brokerName: item.brokerName || null,
              description: item.description,
              grossAmount: parseFloat(item.grossAmount),
            })
          )
      );

      return savedSettlement;
    },
    onSuccess: (savedSettlement) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements", savedSettlement.id, "line-items"] });
      toast({
        title: isEditing ? "Settlement updated" : "Settlement created",
        description: `Settlement has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || `Failed to ${isEditing ? "update" : "create"} settlement. Please check all required fields.`;
      toast({
        title: "Error",
        description: errorMessage,
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
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Load Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ brokerName: "", description: "", grossAmount: "" })}
                  data-testid="button-add-load"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Load
                </Button>
              </div>
              
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 md:grid-cols-[2fr,3fr,2fr,auto] items-start p-3 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.brokerName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Broker Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="ABC Logistics"
                              data-testid={`input-broker-name-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description / Load #</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Load #12345"
                              data-testid={`input-description-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.grossAmount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gross Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              placeholder="0.00"
                              data-testid={`input-gross-amount-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end h-full pb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        data-testid={`button-remove-load-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="totalRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Revenue (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-muted"
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
              <h3 className="text-sm font-medium">Dispatch</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dispatchPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dispatch Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-dispatch-percentage"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Advance</h3>
              <div className="grid gap-4 md:grid-cols-3">
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
                  name="advanceBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance Balance ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-advance-balance"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advanceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-advance-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Fuel - Flying J</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fuelFlyingJ"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-fuel-flying-j"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelFlyingJStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-fuel-flying-j-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelFlyingJEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-fuel-flying-j-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Fuel - Fleet One</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fuelFleetOne"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-fuel-fleet-one"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelFleetOneStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-fuel-fleet-one-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelFleetOneEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-fuel-fleet-one-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Tolls</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="tolls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
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
                  name="tollsStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-tolls-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tollsEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-tolls-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Insurance</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="insurance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
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
                  name="insuranceStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-insurance-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuranceEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-insurance-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Other Deductions</h3>
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
                  name="fuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel (Other) ($)</FormLabel>
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
    queryKey: ["/api/settlements", settlementId, "line-items"],
    enabled: !!settlementId,
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  const totalRevenue = lineItems.reduce((sum, item) => sum + Number(item.grossAmount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Details</DialogTitle>
          <DialogDescription>
            View load line items for this settlement
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
            <p className="text-sm text-muted-foreground">No load line items found for this settlement</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broker Name</TableHead>
                    <TableHead>Description / Load #</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.brokerName || "N/A"}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.grossAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </>
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

  const handleDownloadPDF = async (settlement: Settlement) => {
    // Fetch company settings
    const companyRes = await fetch("/api/company-settings");
    const companySettings = companyRes.ok ? await companyRes.json() : null;
    
    // Fetch line items
    const lineItemsRes = await fetch(`/api/settlements/${settlement.id}/line-items`);
    const lineItems: SettlementLineItem[] = lineItemsRes.ok ? await lineItemsRes.json() : [];
    
    const doc = new jsPDF();
    const driverName = getDriverName(settlement.driverId);
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 20;
    
    // Calculate values - Driver pay from GROSS revenue
    const totalRevenue = Number(settlement.totalRevenue);
    const dispatchPct = Number(settlement.dispatchPercentage || 0);
    const dispatchFee = (totalRevenue * dispatchPct) / 100;
    const factoringPct = Number(settlement.factoringFeePercentage || 0);
    const factoringFee = (totalRevenue * factoringPct) / 100;
    const driverPayPct = Number(settlement.driverPayPercentage);
    const driverPay = (totalRevenue * driverPayPct) / 100; // Driver pay from GROSS revenue
    
    // Helper function to check if we need a new page
    const checkPageBreak = (currentY: number, spaceNeeded: number = 20) => {
      if (currentY + spaceNeeded > pageHeight - bottomMargin) {
        doc.addPage();
        return 20; // Return new Y position at top of new page
      }
      return currentY;
    };
    
    // Company Header - Use settings from database or defaults
    const companyName = companySettings?.companyName || "READY CARRIER LLC";
    const address = companySettings?.address || "2380 Wycliff Street Ste 200";
    const cityStateZip = companySettings?.cityStateZip || "St Paul, MN 55114";
    const phone = companySettings?.phone || "612-567-5034";
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companyName.toUpperCase(), 105, 15, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(address, 105, 21, { align: "center" });
    doc.text(cityStateZip, 105, 26, { align: "center" });
    doc.text(`Phone: ${phone}`, 105, 31, { align: "center" });
    
    // Add company logo if available
    if (companySettings?.logoUrl) {
      try {
        doc.addImage(companySettings.logoUrl, 'PNG', 15, 10, 30, 30);
      } catch (error) {
        console.error("Error adding logo to PDF:", error);
      }
    }
    
    // Settlement Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Driver Settlement", 105, 42, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Settlement #: ${settlement.settlementNumber}`, 20, 52);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 52);
    
    // Driver Info
    let yPos = 65;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Driver Information", 20, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos += 10;
    doc.text(`Driver: ${driverName}`, 20, yPos);
    yPos += 7;
    doc.text(`Truck: ${settlement.truckNumber || "N/A"}`, 20, yPos);
    yPos += 7;
    doc.text(`Period: ${new Date(settlement.periodStart).toLocaleDateString()} - ${new Date(settlement.periodEnd).toLocaleDateString()}`, 20, yPos);
    
    // Load Line Items Section
    if (lineItems.length > 0) {
      yPos += 15;
      yPos = checkPageBreak(yPos, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Load Details", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      
      // Table header
      doc.setFont("helvetica", "bold");
      doc.text("Broker", 20, yPos);
      doc.text("Description", 75, yPos);
      doc.text("Amount", 150, yPos, { align: "right" });
      doc.setFont("helvetica", "normal");
      yPos += 2;
      doc.line(20, yPos, 190, yPos);
      yPos += 5;
      
      // Table rows
      lineItems.forEach((item) => {
        yPos = checkPageBreak(yPos, 10);
        doc.text(item.brokerName || "N/A", 20, yPos);
        doc.text(item.description, 75, yPos);
        doc.text(`$${Number(item.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 7;
      });
      
      // Total line
      yPos += 2;
      doc.line(20, yPos, 190, yPos);
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Total Revenue:", 20, yPos);
      doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      doc.setFont("helvetica", "normal");
      yPos += 10;
    }
    
    // Revenue Section
    yPos += 15;
    yPos = checkPageBreak(yPos, 25);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Revenue", 20, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos += 10;
    doc.text(`Total Revenue:`, 20, yPos);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    yPos += 7;
    doc.text(`Driver Pay (${driverPayPct.toFixed(2)}%):`, 20, yPos);
    doc.text(`$${driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    
    // Dispatch Section
    yPos += 13;
    yPos = checkPageBreak(yPos, 25);
    if (dispatchPct > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Dispatch", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      doc.text(`Dispatch Fee (${dispatchPct.toFixed(2)}%):`, 20, yPos);
      doc.text(`$${dispatchFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      yPos += 13;
    }
    
    // Advance Section
    yPos = checkPageBreak(yPos, 35);
    if (Number(settlement.advance || 0) > 0 || Number(settlement.advanceBalance || 0) > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Advance", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      doc.text(`Advance:`, 20, yPos);
      doc.text(`$${Number(settlement.advance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      yPos += 7;
      doc.text(`Advance Balance:`, 20, yPos);
      doc.text(`$${Number(settlement.advanceBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      if (settlement.advanceDate) {
        yPos += 7;
        doc.text(`Advance Date:`, 20, yPos);
        doc.text(new Date(settlement.advanceDate).toLocaleDateString(), 150, yPos, { align: "right" });
      }
      yPos += 13;
    }
    
    // Fuel Sections
    yPos = checkPageBreak(yPos, 30);
    if (Number(settlement.fuelFlyingJ || 0) > 0 || Number(settlement.fuelFleetOne || 0) > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Fuel", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      if (Number(settlement.fuelFlyingJ || 0) > 0) {
        doc.text(`Fuel - Flying J:`, 20, yPos);
        doc.text(`$${Number(settlement.fuelFlyingJ || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 7;
        if (settlement.fuelFlyingJStartDate || settlement.fuelFlyingJEndDate) {
          doc.setFontSize(8);
          const startDate = settlement.fuelFlyingJStartDate ? new Date(settlement.fuelFlyingJStartDate).toLocaleDateString() : "N/A";
          const endDate = settlement.fuelFlyingJEndDate ? new Date(settlement.fuelFlyingJEndDate).toLocaleDateString() : "N/A";
          doc.text(`  Period: ${startDate} - ${endDate}`, 20, yPos);
          doc.setFontSize(10);
          yPos += 7;
        }
      }
      if (Number(settlement.fuelFleetOne || 0) > 0) {
        doc.text(`Fuel - Fleet One:`, 20, yPos);
        doc.text(`$${Number(settlement.fuelFleetOne || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 7;
        if (settlement.fuelFleetOneStartDate || settlement.fuelFleetOneEndDate) {
          doc.setFontSize(8);
          const startDate = settlement.fuelFleetOneStartDate ? new Date(settlement.fuelFleetOneStartDate).toLocaleDateString() : "N/A";
          const endDate = settlement.fuelFleetOneEndDate ? new Date(settlement.fuelFleetOneEndDate).toLocaleDateString() : "N/A";
          doc.text(`  Period: ${startDate} - ${endDate}`, 20, yPos);
          doc.setFontSize(10);
          yPos += 7;
        }
      }
      yPos += 6;
    }
    
    // Tolls Section (with dates)
    yPos = checkPageBreak(yPos, 30);
    if (Number(settlement.tolls || 0) > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Tolls", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      doc.text(`Tolls:`, 20, yPos);
      doc.text(`$${Number(settlement.tolls || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      yPos += 7;
      if (settlement.tollsStartDate || settlement.tollsEndDate) {
        doc.setFontSize(8);
        const startDate = settlement.tollsStartDate ? new Date(settlement.tollsStartDate).toLocaleDateString() : "N/A";
        const endDate = settlement.tollsEndDate ? new Date(settlement.tollsEndDate).toLocaleDateString() : "N/A";
        doc.text(`  Period: ${startDate} - ${endDate}`, 20, yPos);
        doc.setFontSize(10);
        yPos += 7;
      }
      yPos += 6;
    }
    
    // Insurance Section (with dates)
    yPos = checkPageBreak(yPos, 30);
    if (Number(settlement.insurance || 0) > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Insurance", 20, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos += 10;
      doc.text(`Insurance:`, 20, yPos);
      doc.text(`$${Number(settlement.insurance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
      yPos += 7;
      if (settlement.insuranceStartDate || settlement.insuranceEndDate) {
        doc.setFontSize(8);
        const startDate = settlement.insuranceStartDate ? new Date(settlement.insuranceStartDate).toLocaleDateString() : "N/A";
        const endDate = settlement.insuranceEndDate ? new Date(settlement.insuranceEndDate).toLocaleDateString() : "N/A";
        doc.text(`  Period: ${startDate} - ${endDate}`, 20, yPos);
        doc.setFontSize(10);
        yPos += 7;
      }
      yPos += 6;
    }
    
    // Other Deductions Section
    yPos = checkPageBreak(yPos, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Other Deductions", 20, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos += 10;
    
    // Add dispatch, factoring fee, fuel sections, and all other deductions
    const deductions = [
      { label: `Dispatch Fee (${dispatchPct.toFixed(2)}%)`, value: dispatchFee },
      { label: `Factoring Fee (${factoringPct.toFixed(2)}%)`, value: factoringFee },
      { label: "Fuel - Flying J", value: Number(settlement.fuelFlyingJ || 0) },
      { label: "Fuel - Fleet One", value: Number(settlement.fuelFleetOne || 0) },
      { label: "Tolls", value: Number(settlement.tolls || 0) },
      { label: "Fuel (Other)", value: Number(settlement.fuel || 0) },
      { label: "Advance", value: Number(settlement.advance || 0) },
      { label: "Insurance", value: Number(settlement.insurance || 0) },
      { label: "Trailer Fee", value: Number(settlement.trailerFee || 0) },
      { label: "Truck Repair", value: Number(settlement.truckRepair || 0) },
      { label: "Trailer Repair", value: Number(settlement.trailerRepair || 0) },
    ];
    
    deductions.forEach(({ label, value }) => {
      if (value > 0) {
        yPos = checkPageBreak(yPos, 10);
        doc.text(`${label}:`, 20, yPos);
        doc.text(`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 7;
      }
    });
    
    // Total Deductions - ALL deductions including factoring
    yPos = checkPageBreak(yPos, 15);
    const totalDeductions = deductions.reduce((sum, { value }) => sum + value, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    yPos += 5;
    doc.text(`Total Deductions:`, 20, yPos);
    doc.text(`$${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    
    // Net Pay = driver pay - total deductions
    yPos = checkPageBreak(yPos, 15);
    const correctNetPay = driverPay - totalDeductions;
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Pay:`, 20, yPos);
    doc.text(`$${correctNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    
    // Payment Info
    if (settlement.status === "Paid" && settlement.paidDate) {
      yPos = checkPageBreak(yPos, 25);
      yPos += 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Payment Status: ${settlement.status}`, 20, yPos);
      yPos += 7;
      doc.text(`Paid Date: ${new Date(settlement.paidDate).toLocaleDateString()}`, 20, yPos);
      if (settlement.paymentMethod) {
        yPos += 7;
        doc.text(`Payment Method: ${settlement.paymentMethod}`, 20, yPos);
      }
    }
    
    // Notes
    if (settlement.notes) {
      yPos += 20;
      yPos = checkPageBreak(yPos, 25);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      yPos += 7;
      const lines = doc.splitTextToSize(settlement.notes, 170);
      lines.forEach((line: string, index: number) => {
        yPos = checkPageBreak(yPos, 10);
        doc.text(line, 20, yPos);
        if (index < lines.length - 1) yPos += 7;
      });
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
