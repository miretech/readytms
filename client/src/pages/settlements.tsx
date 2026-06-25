import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, Receipt, Eye, Zap, Package, Download, X, Mail } from "lucide-react";
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
  additionalAdvances: z.array(z.object({
    amount: z.string().optional(),
    date: z.string().optional(),
    note: z.string().optional(),
  })).optional(),
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
  insuranceWeek: z.string().optional(),
  trailerFee: z.string().optional(),
  trailerWeek: z.string().optional(),
  trailerStartDate: z.string().optional(),
  trailerEndDate: z.string().optional(),
  truckRepair: z.string().optional(),
  trailerRepair: z.string().optional(),
  deductions: z.string().optional(),
  prepassFee: z.string().optional(),
  eldFee: z.string().optional(),
  plateFee: z.string().optional(),
  fee2290: z.string().optional(),
  parkingFee: z.string().optional(),
  truckCredit: z.string().optional(),
  previousSettlement: z.string().optional(),
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the next clean sequential number (0001, 0002, …) when creating.
  const { data: nextNumberData } = useQuery<{ nextNumber: string }>({
    queryKey: ["/api/settlements/next-number"],
    enabled: open && !isEditing,
  });
  const newSettlementNumber = !isEditing && open ? nextNumberData?.nextNumber ?? "" : "";

  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: allLoads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });

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
      additionalAdvances: [],
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
      insuranceWeek: "",
      trailerFee: "0",
      trailerWeek: "",
      trailerStartDate: "",
      trailerEndDate: "",
      truckRepair: "0",
      trailerRepair: "0",
      deductions: "0",
      prepassFee: "0",
      eldFee: "0",
      plateFee: "0",
      fee2290: "0",
      parkingFee: "0",
      truckCredit: "0",
      previousSettlement: "0",
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

  const { fields: advanceFields, append: appendAdvance, remove: removeAdvance } = useFieldArray({
    control: form.control,
    name: "additionalAdvances",
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
        grossAmount: item.amount.toString(),
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
    if (!open) return; // Don't reset if dialog is closed
    
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
        additionalAdvances: ((settlement as any).additionalAdvances || []).map((a: any) => ({
          amount: a?.amount?.toString() || "",
          date: a?.date ? new Date(a.date).toISOString().split("T")[0] : "",
          note: a?.note || "",
        })),
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
        insuranceWeek: settlement.insuranceWeek || "",
        trailerFee: settlement.trailerFee?.toString() || "0",
        trailerWeek: settlement.trailerWeek || "",
        trailerStartDate: settlement.trailerStartDate ? new Date(settlement.trailerStartDate).toISOString().split("T")[0] : "",
        trailerEndDate: settlement.trailerEndDate ? new Date(settlement.trailerEndDate).toISOString().split("T")[0] : "",
        truckRepair: settlement.truckRepair?.toString() || "0",
        trailerRepair: settlement.trailerRepair?.toString() || "0",
        deductions: settlement.deductions?.toString() || "0",
        prepassFee: settlement.prepassFee?.toString() || "0",
        eldFee: settlement.eldFee?.toString() || "0",
        plateFee: settlement.plateFee?.toString() || "0",
        fee2290: settlement.fee2290?.toString() || "0",
        parkingFee: settlement.parkingFee?.toString() || "0",
        truckCredit: settlement.truckCredit?.toString() || "0",
        previousSettlement: settlement.previousSettlement?.toString() || "0",
        netPay: settlement.netPay.toString(),
        status: settlement.status,
        paidDate: settlement.paidDate ? new Date(settlement.paidDate).toISOString().split("T")[0] : "",
        paymentMethod: settlement.paymentMethod || "",
        notes: settlement.notes || "",
      });
    } else {
      form.reset({
        driverId: "",
        truckNumber: "",
        settlementNumber: newSettlementNumber,
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
        additionalAdvances: [],
        fuelFlyingJ: "0",
        fuelFleetOne: "0",
        tolls: "0",
        fuel: "0",
        factoringFeePercentage: "0",
        insurance: "0",
        insuranceWeek: "",
        trailerFee: "0",
        trailerWeek: "",
        trailerStartDate: "",
        trailerEndDate: "",
        truckRepair: "0",
        trailerRepair: "0",
        deductions: "0",
        prepassFee: "0",
        eldFee: "0",
        plateFee: "0",
        fee2290: "0",
        parkingFee: "0",
        truckCredit: "0",
        previousSettlement: "0",
        netPay: "",
        status: "Pending",
        paidDate: "",
        paymentMethod: "",
        notes: "",
      });
    }
  }, [open, settlement, form, newSettlementNumber]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Calculate total deductions and net pay when any relevant field changes
      const relevantFields = ["driverPayPercentage", "dispatchPercentage", "totalRevenue", "factoringFeePercentage", "tolls", "fuel", "fuelFlyingJ", "fuelFleetOne", "advance", "insurance", "trailerFee", "truckRepair", "trailerRepair", "prepassFee", "eldFee", "plateFee", "fee2290", "parkingFee", "truckCredit", "previousSettlement"];
      
      if (relevantFields.includes(name || "") || (name || "").startsWith("additionalAdvances")) {
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
        const additionalAdvancesTotal = (value.additionalAdvances || []).reduce(
          (sum: number, a: any) => sum + (parseFloat((a && a.amount) || "0") || 0),
          0
        );
        const insurance = parseFloat(value.insurance || "0");
        const trailerFee = parseFloat(value.trailerFee || "0");
        const truckRepair = parseFloat(value.truckRepair || "0");
        const trailerRepair = parseFloat(value.trailerRepair || "0");
        const prepassFee = parseFloat(value.prepassFee || "0");
        const eldFee = parseFloat(value.eldFee || "0");
        const plateFee = parseFloat(value.plateFee || "0");
        const fee2290 = parseFloat(value.fee2290 || "0");
        const parkingFee = parseFloat(value.parkingFee || "0");
        const truckCredit = parseFloat(value.truckCredit || "0");
        const previousSettlement = parseFloat(value.previousSettlement || "0");
        
        // Total deductions = dispatch + factoring + fuel sections + all other deductions + new fees
        const totalDeductions = dispatchFee + factoringFee + tolls + fuel + fuelFlyingJ + fuelFleetOne + advance + additionalAdvancesTotal + insurance + trailerFee + truckRepair + trailerRepair + prepassFee + eldFee + plateFee + fee2290 + parkingFee + truckCredit + previousSettlement;
        
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

  // Auto-fill the whole settlement from the driver's real loads + pay model.
  // Calls GET /api/settlements/draft; the form's watchers recompute netPay.
  const watchedDriverId = form.watch("driverId");
  const selectedDriver = drivers.find((d) => d.id === watchedDriverId);

  const handleAutoFill = async () => {
    const driverId = form.getValues("driverId");
    const periodStart = form.getValues("periodStart");
    const periodEnd = form.getValues("periodEnd");
    if (!driverId || !periodStart || !periodEnd) {
      toast({
        title: "Pick a driver and period first",
        description: "Driver, period start, and period end are required to auto-fill.",
        variant: "destructive",
      });
      return;
    }
    setAutoFilling(true);
    try {
      const res = await apiRequest(
        "GET",
        `/api/settlements/draft/${driverId}?periodStart=${periodStart}&periodEnd=${periodEnd}`
      );
      const draft = await res.json();
      const fv = draft.formValues || {};
      if (Array.isArray(fv.lineItems) && fv.lineItems.length > 0) {
        replace(fv.lineItems);
      }
      Object.entries(fv).forEach(([k, v]) => {
        if (k === "lineItems") return;
        form.setValue(k as any, v as any, { shouldValidate: true, shouldDirty: true });
      });
      toast({
        title: `Auto-filled ${draft.loadCount} load${draft.loadCount === 1 ? "" : "s"}`,
        description: `${(draft.driverName || "").trim()} • ${draft.driverType} • Net $${Number(draft.netPay).toFixed(2)}`,
      });
      if (draft.warnings?.length) {
        toast({ title: "Heads up", description: draft.warnings.join(" "), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Auto-fill failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setAutoFilling(false);
    }
  };

  // Auto-save functionality - saves draft every 3 seconds while editing
  useEffect(() => {
    if (!isEditing || !autoSaveEnabled || !settlement?.id) {
      return;
    }

    const subscription = form.watch(() => {
      // Clear previous timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        const values = form.getValues();
        
        // Only auto-save if required fields are filled
        if (!values.driverId || !values.periodStart || !values.periodEnd || !values.totalRevenue || !values.driverPayPercentage) {
          return;
        }

        try {
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
            additionalAdvances: (values.additionalAdvances || [])
              .filter((a) => a && a.amount && parseFloat(a.amount) > 0)
              .map((a) => ({ amount: a.amount as string, date: a.date || undefined, note: a.note || undefined })),
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
            insuranceWeek: values.insuranceWeek || undefined,
            trailerFee: parseFloat(values.trailerFee || "0"),
            trailerWeek: values.trailerWeek || undefined,
            trailerStartDate: values.trailerStartDate || undefined,
            trailerEndDate: values.trailerEndDate || undefined,
            truckRepair: parseFloat(values.truckRepair || "0"),
            trailerRepair: parseFloat(values.trailerRepair || "0"),
            deductions: parseFloat(values.deductions || "0"),
            prepassFee: parseFloat(values.prepassFee || "0"),
            eldFee: parseFloat(values.eldFee || "0"),
            plateFee: parseFloat(values.plateFee || "0"),
            fee2290: parseFloat(values.fee2290 || "0"),
            parkingFee: parseFloat(values.parkingFee || "0"),
            truckCredit: parseFloat(values.truckCredit || "0"),
            previousSettlement: parseFloat(values.previousSettlement || "0"),
            netPay: parseFloat(values.netPay),
            status: values.status,
            paidDate: values.paidDate || undefined,
            paymentMethod: values.paymentMethod || undefined,
            notes: values.notes || undefined,
          };

          await apiRequest("PATCH", `/api/settlements/${settlement.id}`, payload);

          // Clear then re-create line items via the idempotent bulk endpoint.
          await apiRequest("DELETE", `/api/settlements/${settlement.id}/line-items`);

          const lineItems = values.lineItems || [];
          await Promise.all(
            lineItems
              .filter(item => item.description && item.grossAmount)
              .map(item =>
                apiRequest("POST", `/api/settlements/${settlement.id}/line-items`, {
                  settlementId: settlement.id,
                  brokerName: item.brokerName || null,
                  description: item.description,
                  amount: item.grossAmount, // Keep as string to match schema
                  itemType: "revenue",
                })
              )
          );

          // Invalidate queries to refresh cached data
          queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
          queryClient.invalidateQueries({ queryKey: ["/api/settlements", settlement.id, "line-items"] });

          console.log("Auto-saved at", new Date().toLocaleTimeString());
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      }, 3000); // 3 second delay
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form, isEditing, autoSaveEnabled, settlement?.id, existingLineItems]);

  // Enable auto-save when user starts editing
  useEffect(() => {
    if (isEditing && open) {
      // Small delay before enabling auto-save to avoid saving immediately
      const timer = setTimeout(() => setAutoSaveEnabled(true), 2000);
      return () => {
        clearTimeout(timer);
        setAutoSaveEnabled(false);
      };
    }
  }, [isEditing, open]);

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
        additionalAdvances: (values.additionalAdvances || [])
          .filter((a) => a && a.amount && parseFloat(a.amount) > 0)
          .map((a) => ({ amount: a.amount as string, date: a.date || undefined, note: a.note || undefined })),
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
        insuranceWeek: values.insuranceWeek || undefined,
        trailerFee: parseFloat(values.trailerFee || "0"),
        trailerWeek: values.trailerWeek || undefined,
        trailerStartDate: values.trailerStartDate || undefined,
        trailerEndDate: values.trailerEndDate || undefined,
        truckRepair: parseFloat(values.truckRepair || "0"),
        trailerRepair: parseFloat(values.trailerRepair || "0"),
        deductions: parseFloat(values.deductions || "0"),
        prepassFee: parseFloat(values.prepassFee || "0"),
        eldFee: parseFloat(values.eldFee || "0"),
        plateFee: parseFloat(values.plateFee || "0"),
        fee2290: parseFloat(values.fee2290 || "0"),
        parkingFee: parseFloat(values.parkingFee || "0"),
        truckCredit: parseFloat(values.truckCredit || "0"),
        previousSettlement: parseFloat(values.previousSettlement || "0"),
        netPay: parseFloat(values.netPay),
        status: values.status,
        paidDate: values.paidDate || undefined,
        paymentMethod: values.paymentMethod || undefined,
        notes: values.notes || undefined,
      };
      
      let savedSettlementRes;
      if (isEditing) {
        savedSettlementRes = await apiRequest("PATCH", `/api/settlements/${settlement.id}`, payload);
      } else {
        savedSettlementRes = await apiRequest("POST", "/api/settlements", payload);
      }
      
      const savedSettlement = await savedSettlementRes.json();

      // Clear existing line items in one idempotent call (no stale-ID 404s),
      // then re-create from the current form values.
      if (isEditing) {
        await apiRequest("DELETE", `/api/settlements/${savedSettlement.id}/line-items`);
      }

      // Save line items
      const lineItems = values.lineItems || [];
      await Promise.all(
        lineItems
          .filter(item => item.description && item.grossAmount)
          .map(item =>
            apiRequest("POST", `/api/settlements/${savedSettlement.id}/line-items`, {
              settlementId: savedSettlement.id,
              brokerName: item.brokerName || null,
              description: item.description,
              amount: item.grossAmount, // Keep as string to match schema
              itemType: "revenue",
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
                        {drivers
                          .filter((driver) => driver.isActive !== "false" || driver.id === settlement?.driverId)
                          .map((driver) => (
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

              {/* Pay model + one-click auto-fill from the driver's real loads */}
              <FormItem>
                <FormLabel>Pay Model &amp; Auto-Fill</FormLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedDriver ? (
                    <Badge variant="secondary" data-testid="badge-pay-model">
                      {selectedDriver.driverType === "owner-operator" ? "Owner-Operator" : "Company Driver"}
                      {selectedDriver.payPercentage ? ` • ${selectedDriver.payPercentage}%` : " • pay % not set"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Select a driver to see pay model</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFill}
                    disabled={autoFilling || !selectedDriver}
                    data-testid="button-autofill"
                  >
                    {autoFilling ? "Loading…" : "Auto-Fill from Loads"}
                  </Button>
                </div>
              </FormItem>

              <FormField
                control={form.control}
                name="settlementNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-settlement-number" readOnly />
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

              {/* Load-number suggestions from the TMS (selected driver's loads
                  first). Picking/typing a load # auto-fills the gross amount. */}
              <datalist id="settlement-load-numbers">
                {allLoads
                  .filter((l) => !watchedDriverId || l.assignedDriverId === watchedDriverId)
                  .slice(0, 800)
                  .map((l) => (
                    <option key={l.id} value={l.loadNumber}>
                      {l.brokerName || ""}
                    </option>
                  ))}
              </datalist>

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
                              list="settlement-load-numbers"
                              placeholder="Type or pick a load #"
                              data-testid={`input-description-${index}`}
                              onChange={(e) => {
                                field.onChange(e);
                                // Auto-pick: if the entered text matches a TMS load number,
                                // fill the gross amount, broker, and lane (pickup → delivery).
                                const val = e.target.value.trim().toLowerCase();
                                const match = allLoads.find(
                                  (l) => (l.loadNumber || "").trim().toLowerCase() === val
                                );
                                if (match) {
                                  form.setValue(
                                    `lineItems.${index}.grossAmount`,
                                    Number(match.rate).toFixed(2),
                                    { shouldValidate: true, shouldDirty: true }
                                  );
                                  if (match.brokerName) {
                                    form.setValue(`lineItems.${index}.brokerName`, match.brokerName, {
                                      shouldDirty: true,
                                    });
                                  }
                                  // Fill the description with just the load # (keep it clean).
                                  form.setValue(
                                    `lineItems.${index}.description`,
                                    match.loadNumber,
                                    { shouldDirty: true }
                                  );
                                }
                              }}
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

              {/* Additional advances — add as many as needed over time.
                  Each amount is added to the settlement's deductions. */}
              <div className="space-y-2">
                {advanceFields.map((af, i) => (
                  <div key={af.id} className="grid gap-3 md:grid-cols-[2fr,2fr,3fr,auto] items-end">
                    <FormField
                      control={form.control}
                      name={`additionalAdvances.${i}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={i === 0 ? "" : "sr-only"}>Advance ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid={`input-additional-advance-amount-${i}`} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`additionalAdvances.${i}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={i === 0 ? "" : "sr-only"}>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid={`input-additional-advance-date-${i}`} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`additionalAdvances.${i}.note`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={i === 0 ? "" : "sr-only"}>Note</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. fuel advance" {...field} data-testid={`input-additional-advance-note-${i}`} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end h-full pb-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAdvance(i)} data-testid={`button-remove-advance-${i}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAdvance({ amount: "", date: "", note: "" })}
                  data-testid="button-add-advance"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Advance
                </Button>
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
              <div className="grid gap-4 md:grid-cols-2">
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
                  name="insuranceWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-insurance-week">
                            <SelectValue placeholder="Select week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week", "1st-2nd Week", "2nd-3rd Week", "3rd-4th Week", "Full Month"].map((w) => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuranceStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Start (back-datable)</FormLabel>
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
                      <FormLabel>Coverage End</FormLabel>
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
                  name="trailerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer Rent Week</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-trailer-week">
                            <SelectValue placeholder="Select week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["1st Week", "2nd Week", "3rd Week", "4th Week", "5th Week", "1st-2nd Week", "2nd-3rd Week", "3rd-4th Week", "Full Month"].map((w) => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailerStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer Rent Start (back-datable)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-trailer-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailerEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer Rent End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-trailer-end-date" />
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

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Additional Fees</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="prepassFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PrePass Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-prepass-fee"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eldFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ELD Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-eld-fee"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plateFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plate Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-plate-fee"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fee2290"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>2290 Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-fee-2290"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parkingFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-parking-fee"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="truckCredit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Credit ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-truck-credit"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="previousSettlement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Settlement ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-previous-settlement"
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

  const totalRevenue = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

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
                        {formatCurrency(item.amount)}
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
  const [driverTypeFilter, setDriverTypeFilter] = useState<"all" | "owner-operator" | "company-driver">("all");
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

  const getDriver = (driverId: string) => {
    return drivers.find((d) => d.id === driverId);
  };

  const filteredSettlements = settlements.filter((settlement) => {
    const driverName = getDriverName(settlement.driverId).toLowerCase();
    const query = searchQuery.toLowerCase();
    const driver = getDriver(settlement.driverId);
    
    // Filter by search query
    const matchesSearch = settlement.settlementNumber.toLowerCase().includes(query) ||
      driverName.includes(query);
    
    // Filter by driver type
    const matchesDriverType = driverTypeFilter === "all" || 
      (driver && driver.driverType === driverTypeFilter);
    
    return matchesSearch && matchesDriverType;
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

  // Builds the settlement PDF and returns the jsPDF doc + driver (no save/email),
  // so it can be downloaded OR emailed.
  const buildSettlementDoc = async (settlement: Settlement) => {
    // Fetch company settings
    const companyRes = await fetch("/api/company-settings");
    const companySettings = companyRes.ok ? await companyRes.json() : null;

    // Fetch line items
    const lineItemsRes = await fetch(`/api/settlements/${settlement.id}/line-items`);
    const lineItems: SettlementLineItem[] = lineItemsRes.ok ? await lineItemsRes.json() : [];

    const driver = getDriver(settlement.driverId);
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
    
    const companyEmail = companySettings?.email || "";

    // Brand colour. Default = orange (#E67E22). Overridable via company
    // settings brandColor as "#rrggbb".
    const hexToRgb = (hex?: string): [number, number, number] => {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return [230, 126, 34];
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [br, bg, bb] = hexToRgb(companySettings?.brandColor);

    // ── Coloured header banner ──────────────────────────────────────
    doc.setFillColor(br, bg, bb);
    doc.rect(0, 0, 210, 34, "F");

    // Logo on the left, inside the banner (white box backing so it pops)
    let nameX = 105;
    let nameAlign: "center" | "left" = "center";
    if (companySettings?.logoUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(12, 5, 26, 24, 2, 2, "F");
        doc.addImage(companySettings.logoUrl, "PNG", 13, 6, 24, 22);
        nameX = 44;
        nameAlign = "left";
      } catch (error) {
        console.error("Error adding logo to PDF:", error);
      }
    }

    // Company name + contact in white on the banner
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(companyName.toUpperCase(), nameX, 14, { align: nameAlign });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${address}, ${cityStateZip}`, nameX, 21, { align: nameAlign });
    doc.text(companyEmail ? `Phone: ${phone}   •   ${companyEmail}` : `Phone: ${phone}`, nameX, 26, { align: nameAlign });

    // Title bar (brand-coloured text) + meta
    doc.setTextColor(br, bg, bb);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("DRIVER SETTLEMENT", 105, 44, { align: "center" });
    doc.setDrawColor(br, bg, bb);
    doc.setLineWidth(0.6);
    doc.line(20, 47, 190, 47);
    doc.setLineWidth(0.2);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Settlement #: ${settlement.settlementNumber}`, 20, 54);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 190, 54, { align: "right" });

    // Driver Info — two columns to save vertical space
    let yPos = 61;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Driver Information", 20, yPos);
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const infoTop = yPos;
    // Right column: truck + period
    doc.text(`Truck: ${settlement.truckNumber || "N/A"}`, 130, infoTop);
    doc.text(`Period: ${new Date(settlement.periodStart).toLocaleDateString()} - ${new Date(settlement.periodEnd).toLocaleDateString()}`, 130, infoTop + 5);
    // Left column: driver contact
    doc.text(`Driver: ${driverName}`, 20, yPos);
    yPos += 5;
    if (driver?.phone) { doc.text(`Phone: ${driver.phone}`, 20, yPos); yPos += 5; }
    if (driver?.email) { doc.text(`Email: ${driver.email}`, 20, yPos); yPos += 5; }
    if (driver?.address) { doc.text(`Address: ${driver.address}`, 20, yPos); yPos += 5; }
    yPos = Math.max(yPos, infoTop + 11) + 3;

    // Load Line Items Section
    if (lineItems.length > 0) {
      yPos = checkPageBreak(yPos, 40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Load Details", 20, yPos);
      yPos += 6;

      // Table header
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Broker", 20, yPos);
      doc.text("Description", 75, yPos);
      doc.text("Amount", 150, yPos, { align: "right" });
      doc.setFont("helvetica", "normal");
      yPos += 1.5;
      doc.line(20, yPos, 190, yPos);
      yPos += 4.5;

      // Table rows
      lineItems.forEach((item) => {
        yPos = checkPageBreak(yPos, 10);
        doc.text(String(item.brokerName || "N/A").slice(0, 30), 20, yPos);
        doc.text(String(item.description || "").slice(0, 50), 75, yPos);
        doc.text(`$${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 5.5;
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
    
    // Earnings summary. Each deduction is listed ONCE in "Other Deductions"
    // below — no duplicate per-category sections (keeps it to one page).
    yPos += 8;
    yPos = checkPageBreak(yPos, 22);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Earnings", 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Total Revenue:", 20, yPos);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    yPos += 6;
    doc.text(`Driver Pay (${driverPayPct.toFixed(2)}%):`, 20, yPos);
    doc.text(`$${driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    yPos += 10;

    // Deductions Section
    yPos = checkPageBreak(yPos, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Deductions", 20, yPos);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    yPos += 6;

    // Add dispatch, factoring fee, fuel sections, and all other deductions
    // Coverage label for insurance/trailer: week + optional back-dated range,
    // e.g. "Insurance (2nd Week, Apr 26 – May 26)" or just "(4th Week June)".
    const periodMonth = new Date(settlement.periodStart).toLocaleDateString(undefined, { month: "long" });
    const shortDate = (d?: string | Date | null) =>
      d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    const coverageSuffix = (wk?: string | null, start?: string | Date | null, end?: string | Date | null) => {
      const range = start && end ? `${shortDate(start)} – ${shortDate(end)}` : "";
      if (wk && range) return ` (${wk}, ${range})`;
      if (range) return ` (${range})`;
      if (wk) return ` (${wk} ${periodMonth})`;
      return "";
    };

    const deductions = [
      { label: `Dispatch Fee (${dispatchPct.toFixed(2)}%)`, value: dispatchFee },
      { label: `Factoring Fee (${factoringPct.toFixed(2)}%)`, value: factoringFee },
      { label: "Fuel - Flying J", value: Number(settlement.fuelFlyingJ || 0) },
      { label: "Fuel - Fleet One", value: Number(settlement.fuelFleetOne || 0) },
      { label: "Tolls", value: Number(settlement.tolls || 0) },
      { label: "Fuel (Other)", value: Number(settlement.fuel || 0) },
      { label: "Advance", value: Number(settlement.advance || 0) },
      ...(((settlement as any).additionalAdvances || []) as Array<{ amount?: string; date?: string; note?: string }>).map((a, i) => ({
        label: `Advance${a?.note ? ` (${a.note})` : a?.date ? ` (${shortDate(a.date)})` : ` #${i + 2}`}`,
        value: Number(a?.amount || 0),
      })),
      { label: `Insurance${coverageSuffix(settlement.insuranceWeek, settlement.insuranceStartDate, settlement.insuranceEndDate)}`, value: Number(settlement.insurance || 0) },
      { label: `Trailer Fee${coverageSuffix(settlement.trailerWeek, settlement.trailerStartDate, settlement.trailerEndDate)}`, value: Number(settlement.trailerFee || 0) },
      { label: "Truck Repair", value: Number(settlement.truckRepair || 0) },
      { label: "Trailer Repair", value: Number(settlement.trailerRepair || 0) },
      { label: "PrePass Fee", value: Number(settlement.prepassFee || 0) },
      { label: "ELD Fee", value: Number(settlement.eldFee || 0) },
      { label: "Plate Fee", value: Number(settlement.plateFee || 0) },
      { label: "2290 Fee", value: Number(settlement.fee2290 || 0) },
      { label: "Parking Fee", value: Number(settlement.parkingFee || 0) },
      { label: "Truck Credit", value: Number(settlement.truckCredit || 0) },
      { label: "Previous Settlement", value: Number(settlement.previousSettlement || 0) },
    ];
    
    deductions.forEach(({ label, value }) => {
      if (value > 0) {
        yPos = checkPageBreak(yPos, 10);
        doc.text(`${label}:`, 20, yPos);
        doc.text(`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
        yPos += 5.5;
      }
    });

    // Total Deductions - ALL deductions including factoring
    yPos = checkPageBreak(yPos, 15);
    const totalDeductions = deductions.reduce((sum, { value }) => sum + value, 0);
    yPos += 1;
    doc.line(120, yPos, 190, yPos);
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Deductions:`, 20, yPos);
    doc.text(`$${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");

    // Net Pay = driver pay - total deductions
    yPos = checkPageBreak(yPos, 18);
    const correctNetPay = driverPay - totalDeductions;
    yPos += 4;
    doc.setDrawColor(120);
    doc.setLineWidth(0.5);
    doc.line(120, yPos, 190, yPos);
    doc.setLineWidth(0.2);
    yPos += 7;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`NET PAY:`, 20, yPos);
    doc.text(`$${correctNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    
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
    
    return { doc, driver };
  };

  const handleDownloadPDF = async (settlement: Settlement) => {
    const { doc } = await buildSettlementDoc(settlement);
    doc.save(`Settlement-${settlement.settlementNumber}.pdf`);
    toast({
      title: "PDF Downloaded",
      description: `Settlement ${settlement.settlementNumber} has been downloaded as PDF.`,
    });
  };

  const handleEmailToDriver = async (settlement: Settlement) => {
    const { doc, driver } = await buildSettlementDoc(settlement);
    if (!driver?.email) {
      toast({
        title: "No email on file",
        description: `Add an email address to ${driver?.name || "this driver"}'s profile first.`,
        variant: "destructive",
      });
      return;
    }
    // jsPDF datauristring → strip the "data:...;base64," prefix
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    try {
      const res = await apiRequest("POST", `/api/settlements/${settlement.id}/email`, {
        to: driver.email,
        pdfBase64,
      });
      const result = await res.json();
      toast({
        title: result.success ? "Settlement emailed" : "Could not send",
        description: result.success
          ? `Sent settlement ${settlement.settlementNumber} to ${driver.email}.`
          : result.error || "Email failed.",
        variant: result.success ? undefined : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Email failed", description: err?.message || String(err), variant: "destructive" });
    }
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
        <div className="mb-4 flex gap-4 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by settlement number or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={driverTypeFilter} onValueChange={(value: "all" | "owner-operator" | "company-driver") => setDriverTypeFilter(value)}>
            <SelectTrigger className="w-full md:w-[240px]" data-testid="select-driver-type">
              <SelectValue placeholder="Filter by driver type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              <SelectItem value="owner-operator">Owner Operators</SelectItem>
              <SelectItem value="company-driver">Company Drivers</SelectItem>
            </SelectContent>
          </Select>
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
                            onClick={() => handleEmailToDriver(settlement)}
                            data-testid={`button-email-driver-${settlement.id}`}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Email to Driver
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
