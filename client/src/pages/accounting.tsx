import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Receipt,
  CreditCard,
  FileText,
  Download,
  Mail,
  Paperclip,
} from "lucide-react";
import jsPDF from "jspdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MetricCard } from "@/components/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertInvoiceSchema,
  insertExpenseSchema,
  insertPaymentSchema,
  type Invoice,
  type Expense,
  type Payment,
  type Load,
  type Customer,
  type CompanySettings,
} from "@shared/schema";
import { MultiFileUpload } from "@/components/multi-file-upload";

// Form schemas
const invoiceFormSchema = insertInvoiceSchema.extend({
  loadId: z.string().min(1, "Load is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer is required"),
  status: z.string().min(1, "Status is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  subtotal: z.string().min(1, "Subtotal is required"),
  total: z.string().min(1, "Total is required"),
  attachments: z.array(z.any()).optional(), // Accept flexible attachments format
  // Carrier info fields (editable)
  carrierName: z.string().optional(),
  carrierAddress: z.string().optional(),
});

const expenseFormSchema = insertExpenseSchema.extend({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
});

const paymentFormSchema = insertPaymentSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// Helper function to clean AI-generated invalid addresses
function cleanAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  
  const invalidPatterns = [
    /not\s*(explicitly\s*)?(defined|found|available|provided|specified|mentioned)/i,
    /address\s*not\s*(explicitly\s*)?(defined|found|available|provided|specified|mentioned)/i,
    /contact\s*information\s*includes/i,
    /n\/a/i,
    /^none$/i,
    /^null$/i,
    /^undefined$/i,
    /not\s*listed/i,
    /not\s*given/i,
    /no\s*address/i,
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(address)) {
      return null;
    }
  }
  
  return address;
}

// Invoice Dialog Component
function InvoiceDialog({
  open,
  onOpenChange,
  invoice,
  existingInvoices = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  existingInvoices?: Invoice[];
}) {
  const { toast } = useToast();
  const isEditing = !!invoice;

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: companySettings } = useQuery<CompanySettings>({ queryKey: ["/api/company-settings"] });
  // Fetch all invoices directly to ensure we have the latest data for invoice number generation
  const { data: allInvoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      loadId: "",
      customerId: "",
      status: "draft",
      invoiceDate: "",
      dueDate: "",
      subtotal: "",
      lumperFee: "0",
      tax: "0",
      total: "",
      paidAmount: "0",
      notes: "",
      attachments: [],
      carrierName: "",
      carrierAddress: "",
    },
  });

  useEffect(() => {
    if (invoice) {
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        loadId: invoice.loadId,
        customerId: invoice.customerId,
        status: invoice.status,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split("T")[0],
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        subtotal: invoice.subtotal.toString(),
        lumperFee: invoice.lumperFee?.toString() || "0",
        tax: invoice.tax?.toString() || "0",
        total: invoice.total.toString(),
        paidAmount: invoice.paidAmount?.toString() || "0",
        notes: invoice.notes || "",
        attachments: (invoice.attachments as any) || [],
        carrierName: (invoice as any).carrierName || companySettings?.companyName || "",
        carrierAddress: (invoice as any).carrierAddress || (companySettings ? `${companySettings.address}, ${companySettings.cityStateZip}` : ""),
      });
    } else {
      // Generate short numeric invoice number starting from 8200
      // Use allInvoices (directly fetched) to ensure we have the latest data
      // Only consider invoice numbers in the 8200-99999 range (4-5 digit numbers starting from 8200)
      const invoicesToCheck = allInvoices.length > 0 ? allInvoices : existingInvoices;
      const existingNumbers = invoicesToCheck
        .map(inv => parseInt(inv.invoiceNumber))
        .filter(n => !isNaN(n) && n >= 8200 && n < 100000);
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 8199;
      const invoiceNumber = String(maxNumber + 1);
      
      // Pre-populate carrier info from company settings
      const carrierName = companySettings?.companyName || "Ready TMS";
      const carrierAddress = companySettings 
        ? `${companySettings.address}, ${companySettings.cityStateZip}` 
        : "2380 Wycliff Street Ste 200, St Paul, MN 55114";
      
      form.reset({
        invoiceNumber,
        loadId: "",
        customerId: "",
        status: "draft",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        subtotal: "",
        lumperFee: "0",
        tax: "0",
        total: "",
        paidAmount: "0",
        notes: "",
        attachments: [],
        carrierName,
        carrierAddress,
      });
    }
  }, [invoice, existingInvoices, allInvoices, form, companySettings]);

  // Auto-calculate total when subtotal, lumper fee, or tax changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "subtotal" || name === "lumperFee" || name === "tax") {
        const subtotal = parseFloat(value.subtotal || "0");
        const lumperFee = parseFloat(value.lumperFee || "0");
        const tax = parseFloat(value.tax || "0");
        const total = subtotal + lumperFee + tax;
        form.setValue("total", total.toFixed(2));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Auto-fill customer when load is selected
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "loadId" && value.loadId) {
        const selectedLoad = loads.find((l) => l.id === value.loadId);
        if (selectedLoad) {
          form.setValue("customerId", selectedLoad.customerId);
          if (!value.subtotal) {
            form.setValue("subtotal", selectedLoad.rate.toString());
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loads]);

  const mutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/invoices/${invoice.id}`, values);
      }
      return await apiRequest("POST", "/api/invoices", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: isEditing ? "Invoice updated" : "Invoice created",
        description: `Invoice has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} invoice.`,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update invoice information" : "Create a new invoice"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            {/* Carrier & Broker Info Section */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Carrier Info (Your Company) - Editable */}
              <Card className="p-4 bg-muted/30">
                <h4 className="text-sm font-semibold mb-3 text-foreground">Carrier Information</h4>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="carrierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Carrier Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter carrier name"
                            data-testid="input-carrier-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carrierAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Carrier Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter carrier address"
                            rows={2}
                            className="resize-none"
                            data-testid="input-carrier-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>

              {/* Broker Info (Selected Customer) */}
              <Card className="p-4 bg-muted/30">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Broker Information</h4>
                {(() => {
                  const customerId = form.watch("customerId");
                  const customer = customers.find((c) => c.id === customerId);
                  if (customer) {
                    return (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-muted-foreground">{cleanAddress(customer.address) || "No address"}</p>
                        <p className="text-muted-foreground">
                          {[customer.city, customer.state, customer.zip].filter(Boolean).join(", ") || "No city/state"}
                        </p>
                        <p className="text-muted-foreground">{customer.phone || "No phone"}</p>
                      </div>
                    );
                  }
                  return <p className="text-sm text-muted-foreground">Select a customer to see broker info</p>;
                })()}
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-load">
                          <SelectValue placeholder="Select load" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loads.map((load) => {
                          const customer = customers.find((c) => c.id === load.customerId);
                          return (
                            <SelectItem key={load.id} value={load.id}>
                              {load.loadNumber} - {customer?.name || "Unknown"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-invoice-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-subtotal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lumperFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lumper Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-lumper-fee" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-tax" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly data-testid="input-total" />
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

            {/* Attachments Section - Prominent Styling */}
            <div className="border-t pt-4 mt-2">
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <FormLabel className="text-base font-semibold">
                        Attachments (Rate Confirmation, BOL, etc.)
                      </FormLabel>
                    </div>
                    <FormControl>
                      <MultiFileUpload
                        value={field.value || []}
                        onChange={field.onChange}
                        accept={[".pdf", ".png", ".jpg", ".jpeg"]}
                        label=""
                        testId="upload-invoice-attachments"
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Expense Dialog Component
function ExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}) {
  const { toast } = useToast();
  const isEditing = !!expense;

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      loadId: "",
      category: "",
      description: "",
      amount: "",
      expenseDate: "",
      vendor: "",
      paymentMethod: "",
      receiptUrl: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        loadId: expense.loadId || "",
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        expenseDate: new Date(expense.expenseDate).toISOString().split("T")[0],
        vendor: expense.vendor || "",
        paymentMethod: expense.paymentMethod || "",
        receiptUrl: expense.receiptUrl || "",
        notes: expense.notes || "",
      });
    } else {
      form.reset({
        loadId: "",
        category: "",
        description: "",
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0],
        vendor: "",
        paymentMethod: "",
        receiptUrl: "",
        notes: "",
      });
    }
  }, [expense, form]);

  const mutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/expenses/${expense.id}`, values);
      }
      return await apiRequest("POST", "/api/expenses", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: isEditing ? "Expense updated" : "Expense added",
        description: `Expense has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} expense.`,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update expense information" : "Record a new expense"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="loadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-load">
                          <SelectValue placeholder="Select load" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Tolls">Tolls</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Driver Pay">Driver Pay</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
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
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-vendor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-receipt-url" />
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Expense" : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Payment Dialog Component
function PaymentDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
}) {
  const { toast } = useToast();
  const isEditing = !!payment;

  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: "",
      customerId: "",
      amount: "",
      paymentDate: "",
      paymentMethod: "",
      referenceNumber: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (payment) {
      form.reset({
        invoiceId: payment.invoiceId || "",
        customerId: payment.customerId || "",
        amount: payment.amount.toString(),
        paymentDate: new Date(payment.paymentDate).toISOString().split("T")[0],
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber || "",
        notes: payment.notes || "",
      });
    } else {
      form.reset({
        invoiceId: "",
        customerId: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "",
        referenceNumber: "",
        notes: "",
      });
    }
  }, [payment, form]);

  // Auto-fill customer and amount when invoice is selected
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "invoiceId" && value.invoiceId) {
        const selectedInvoice = invoices.find((inv) => inv.id === value.invoiceId);
        if (selectedInvoice) {
          form.setValue("customerId", selectedInvoice.customerId);
          const balance = Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0);
          if (!value.amount) {
            form.setValue("amount", balance.toFixed(2));
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, invoices]);

  const mutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/payments/${payment.id}`, values);
      }
      return await apiRequest("POST", "/api/payments", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: isEditing ? "Payment updated" : "Payment recorded",
        description: `Payment has been successfully ${isEditing ? "updated" : "recorded"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "record"} payment.`,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Record Payment"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update payment information" : "Record a new payment"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice">
                          <SelectValue placeholder="Select invoice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {invoices.map((invoice) => {
                          const balance = Number(invoice.total) - Number(invoice.paidAmount || 0);
                          return (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {invoice.invoiceNumber} - ${balance.toFixed(2)} balance
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-payment-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Wire">Wire</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-reference-number" />
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Payment" : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Attachments Viewer Dialog Component
function AttachmentsViewerDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}) {
  const attachments = (invoice?.attachments as any) || [];

  const downloadAttachment = (attachment: any) => {
    const link = document.createElement("a");
    link.href = attachment.data;
    link.download = attachment.filename;
    link.click();
  };

  const openAttachment = (attachment: any) => {
    window.open(attachment.data, "_blank");
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('image')) return <FileText className="h-8 w-8 text-blue-500" />;
    if (type?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Attachments</DialogTitle>
          <DialogDescription>
            {invoice && `Attachments for Invoice ${invoice.invoiceNumber}`}
          </DialogDescription>
        </DialogHeader>

        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Paperclip className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No attachments</h3>
            <p className="text-sm text-muted-foreground">
              This invoice has no attachments
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {attachments.map((attachment: any, index: number) => {
              const isPdf = attachment.type?.includes('pdf');
              const isImage = attachment.type?.includes('image');

              return (
                <Card key={index} data-testid={`attachment-card-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Preview */}
                      <div className="relative w-full h-48 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          <img
                            src={attachment.data}
                            alt={attachment.filename}
                            className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openAttachment(attachment)}
                            data-testid={`img-preview-${index}`}
                          />
                        ) : (
                          <div
                            className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openAttachment(attachment)}
                            data-testid={`pdf-preview-${index}`}
                          >
                            {getFileIcon(attachment.type)}
                            <p className="text-xs text-muted-foreground">Click to view</p>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium truncate" title={attachment.filename}>
                          {attachment.filename}
                        </p>
                        {attachment.label && (
                          <Badge variant="secondary" className="text-xs">
                            {attachment.label}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(attachment.uploadedAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAttachment(attachment)}
                          className="flex-1"
                          data-testid={`button-view-${index}`}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="flex-1"
                          data-testid={`button-download-${index}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Email Factoring Dialog Component
function EmailFactoringDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}) {
  const { toast } = useToast();
  const [attachPods, setAttachPods] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: companySettings } = useQuery<CompanySettings>({ queryKey: ["/api/company-settings"] });

  const form = useForm({
    defaultValues: {
      to: "",
      from: "",
      subject: "",
      message: "",
    },
  });

  useEffect(() => {
    if (invoice && open) {
      const customer = customers.find(c => c.id === invoice.customerId);
      const load = loads.find(l => l.id === invoice.loadId);
      
      const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
      const subtotal = typeof invoice.subtotal === 'string' ? parseFloat(invoice.subtotal) : invoice.subtotal;
      const lumperFee = typeof invoice.lumperFee === 'string' ? parseFloat(invoice.lumperFee || '0') : (invoice.lumperFee || 0);
      
      // Build structured email message
      let emailMessage = `Dear ${customer?.name || "Valued Customer"},\n\n`;
      emailMessage += `Please find attached the invoice and proof of delivery documents for your recent shipment.\n\n`;
      emailMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      emailMessage += `INVOICE SUMMARY\n`;
      emailMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      emailMessage += `Invoice Number: ${invoice.invoiceNumber}\n`;
      emailMessage += `Load Number: ${load?.loadNumber || "N/A"}\n`;
      emailMessage += `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}\n`;
      emailMessage += `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\n`;
      
      if (load) {
        emailMessage += `SHIPMENT DETAILS\n`;
        emailMessage += `Origin: ${load.pickupLocation}\n`;
        emailMessage += `Destination: ${load.deliveryLocation}\n`;
        if (load.commodity) {
          emailMessage += `Commodity: ${load.commodity}\n`;
        }
        emailMessage += `\n`;
      }
      
      emailMessage += `CHARGES\n`;
      emailMessage += `Freight Charges: $${subtotal.toFixed(2)}\n`;
      if (lumperFee > 0) {
        emailMessage += `Lumper Fee: $${lumperFee.toFixed(2)}\n`;
      }
      emailMessage += `TOTAL AMOUNT DUE: $${total.toFixed(2)}\n\n`;
      emailMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      emailMessage += `Please remit payment to the address listed on the attached invoice.\n\n`;
      emailMessage += `Thank you for your business!\n\n`;
      emailMessage += `Best regards,\n`;
      emailMessage += `${companySettings?.companyName || "Ready TMS"}\n`;
      if (companySettings?.phone) {
        emailMessage += `Phone: ${companySettings.phone}`;
      }
      
      form.reset({
        to: customer?.email || "",
        from: "",
        subject: `Invoice ${invoice.invoiceNumber} - ${companySettings?.companyName || "Ready TMS"}`,
        message: emailMessage,
      });
    }
  }, [invoice, customers, loads, companySettings, open, form]);

  // Helper function to generate invoice PDF as base64
  const generateInvoicePDFBase64 = async (): Promise<string | null> => {
    if (!invoice) return null;

    const customer = customers.find((c) => c.id === invoice.customerId);
    const load = loads.find((l) => l.id === invoice.loadId);
    const pdf = new jsPDF();
    
    // Brand colors
    const brandBlue = [13, 59, 102]; // Dark navy blue
    const brandRed = [180, 40, 40]; // Dark red for lines
    const blackText = [33, 37, 41]; // Near black for body text

    let yPos = 20;
    
    // Add logo if available from company settings (top right)
    if (companySettings?.logoUrl) {
      try {
        pdf.addImage(companySettings.logoUrl, 'PNG', 160, 10, 35, 35);
      } catch (e) {
        console.log('Could not add logo to PDF:', e);
      }
    }

    // Invoice Title - Dark blue with underline
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("INVOICE", 15, yPos);
    // Underline for title
    pdf.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.setLineWidth(0.8);
    pdf.line(15, yPos + 2, 62, yPos + 2);
    yPos += 15;
    
    // Company Information - Use invoice's carrier info first, then fall back to company settings
    const carrierName = (invoice as any).carrierName || companySettings?.companyName || "Ready Carrier LLC";
    const carrierAddress = (invoice as any).carrierAddress || (companySettings ? `${companySettings.address || ""}, ${companySettings.cityStateZip || ""}` : "");
    
    // Reset to black for body text
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(carrierName, 15, yPos);
    yPos += 6;
    
    // Split address by comma and put each part on a new line
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    if (carrierAddress) {
      const addressParts = carrierAddress.split(",").map((s: string) => s.trim()).filter(Boolean);
      addressParts.forEach((part: string) => {
        pdf.text(part.toUpperCase(), 15, yPos);
        yPos += 5;
      });
    }
    yPos += 10;
    
    // Bill To Section - Blue with underline
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("BILL TO", 15, yPos);
    pdf.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPos + 1, 42, yPos + 1);
    
    // Invoice Number and Date (Right Side) - Blue labels
    pdf.text("INVOICE #", 130, yPos);
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(invoice.invoiceNumber, 175, yPos);
    
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    if (customer) {
      pdf.text(customer.name, 15, yPos);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("INVOICE DATE", 130, yPos);
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(new Date(invoice.invoiceDate).toLocaleDateString(), 175, yPos);
    
    yPos += 6;
    const cleanedAddress = cleanAddress(customer?.address);
    if (cleanedAddress) {
      pdf.text(cleanedAddress, 15, yPos);
      yPos += 5;
    }
    
    // Customer city, state, zip
    const customerLocation = [customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ");
    if (customerLocation) {
      pdf.text(customerLocation, 15, yPos);
      yPos += 5;
    }
    
    // Table Header - Blue text with red line
    yPos += 15;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("DESCRIPTION", 15, yPos);
    pdf.text("AMOUNT", 175, yPos);
    
    yPos += 3;
    pdf.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    pdf.setLineWidth(0.8);
    pdf.line(15, yPos, 195, yPos);
    
    // Load Number Line Item - Black text
    yPos += 10;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.text(`LOAD NUMBER #${load?.loadNumber || "N/A"}`, 15, yPos);
    
    const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : invoice.total;
    pdf.text(`${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 175, yPos);
    
    // Total Line - Blue label
    yPos += 25;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("TOTAL", 140, yPos);
    pdf.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 175, yPos);
    
    // Terms & Conditions (Centered at Bottom)
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms & Conditions", 105, 250, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Thank you. Payment is due within 15 days", 105, 258, { align: "center" });
    
    // Get PDF as base64 string (remove data URI prefix)
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    return pdfBase64;
  };

  const handleSend = async () => {
    const values = form.getValues();
    
    if (!values.to || !values.subject || !values.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!invoice) {
      toast({
        title: "Error",
        description: "No invoice selected",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      console.log('[Email Factoring] Starting email send process...');
      
      // Generate PDF as base64
      console.log('[Email Factoring] Generating PDF...');
      const pdfBase64 = await generateInvoicePDFBase64();
      console.log('[Email Factoring] PDF generated, length:', pdfBase64?.length);

      const payload = {
        to: values.to,
        from: values.from || undefined,
        subject: values.subject,
        message: values.message,
        invoiceId: invoice.id,
        loadId: invoice.loadId,
        invoicePdf: pdfBase64,
        attachPods,
        invoiceAttachments: invoice.attachments || [],
      };
      
      console.log('[Email Factoring] Sending request with payload:', {
        to: payload.to,
        from: payload.from,
        subject: payload.subject,
        invoiceId: payload.invoiceId,
        loadId: payload.loadId,
        attachPods: payload.attachPods,
        hasPdf: !!payload.invoicePdf,
        pdfSize: pdfBase64?.length,
        invoiceAttachmentsCount: (invoice.attachments as any)?.length || 0,
      });

      // Send email
      const response = await apiRequest("POST", "/api/accounting/factoring-email", payload);
      console.log('[Email Factoring] Response received:', response);

      toast({
        title: "Email Sent",
        description: "Invoice has been emailed to factoring company",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('[Email Factoring] Error occurred:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to send email: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email to Factoring Company</DialogTitle>
          <DialogDescription>
            Send invoice {invoice?.invoiceNumber} to your factoring company
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="factoring@example.com" data-testid="input-to-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="your@email.com" data-testid="input-from-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Invoice subject" data-testid="input-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={8} placeholder="Email message..." data-testid="input-message" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attach-invoice"
                  checked={true}
                  disabled
                  data-testid="checkbox-attach-invoice"
                />
                <label htmlFor="attach-invoice" className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Invoice PDF (automatically attached)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attach-pods"
                  checked={attachPods}
                  onCheckedChange={(checked) => setAttachPods(checked as boolean)}
                  data-testid="checkbox-attach-pods"
                />
                <label htmlFor="attach-pods" className="text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attach PODs (Proof of Delivery)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending} data-testid="button-send-email">
                {isSending ? "Sending..." : <><Mail className="mr-2 h-4 w-4" /> Send Email</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Accounting() {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [viewingAttachmentsInvoice, setViewingAttachmentsInvoice] = useState<Invoice | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const { toast } = useToast();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });
  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: companySettings } = useQuery<CompanySettings>({ queryKey: ["/api/company-settings"] });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted", description: "Invoice has been successfully deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invoice.", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted", description: "Expense has been successfully deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete expense.", variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Payment deleted", description: "Payment has been successfully deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment.", variant: "destructive" });
    },
  });

  // Calculate financial metrics
  const totalRevenue = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + Number(inv.total), 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [expenses]);

  const netProfit = totalRevenue - totalExpenses;

  const pendingRevenue = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + Number(inv.total), 0);
  }, [invoices]);

  // Filter data
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customerId);
      const load = loads.find((l) => l.id === invoice.loadId);
      return (
        invoice.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        customer?.name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        load?.loadNumber.toLowerCase().includes(invoiceSearch.toLowerCase())
      );
    });
  }, [invoices, invoiceSearch, customers, loads]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const load = loads.find((l) => l.id === expense.loadId);
      return (
        expense.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        load?.loadNumber.toLowerCase().includes(expenseSearch.toLowerCase())
      );
    });
  }, [expenses, expenseSearch, loads]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      const customer = customers.find((c) => c.id === payment.customerId);
      return (
        invoice?.invoiceNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        customer?.name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(paymentSearch.toLowerCase())
      );
    });
  }, [payments, paymentSearch, invoices, customers]);

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDialogOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleInvoiceDialogClose = () => {
    setInvoiceDialogOpen(false);
    setEditingInvoice(null);
  };

  const handleExpenseDialogClose = () => {
    setExpenseDialogOpen(false);
    setEditingExpense(null);
  };

  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setEditingPayment(null);
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const downloadInvoicePDF = (invoice: Invoice) => {
    const customer = customers.find((c) => c.id === invoice.customerId);
    const load = loads.find((l) => l.id === invoice.loadId);
    const pdf = new jsPDF();
    
    // Brand colors
    const brandBlue = [13, 59, 102]; // Dark navy blue
    const brandRed = [180, 40, 40]; // Dark red for lines
    const blackText = [33, 37, 41]; // Near black for body text

    let yPos = 20;
    
    // Add logo if available from company settings (top right)
    if (companySettings?.logoUrl) {
      try {
        pdf.addImage(companySettings.logoUrl, 'PNG', 160, 10, 35, 35);
      } catch (e) {
        console.log('Could not add logo to PDF:', e);
      }
    }

    // Invoice Title - Dark blue with underline
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("INVOICE", 15, yPos);
    // Underline for title
    pdf.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.setLineWidth(0.8);
    pdf.line(15, yPos + 2, 62, yPos + 2);
    yPos += 15;
    
    // Company Information - Use invoice's carrier info first, then fall back to company settings
    const carrierName = (invoice as any).carrierName || companySettings?.companyName || "Ready Carrier LLC";
    const carrierAddress = (invoice as any).carrierAddress || (companySettings ? `${companySettings.address || ""}, ${companySettings.cityStateZip || ""}` : "");
    
    // Reset to black for body text
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(carrierName, 15, yPos);
    yPos += 6;
    
    // Split address by comma and put each part on a new line
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    if (carrierAddress) {
      const addressParts = carrierAddress.split(",").map((s: string) => s.trim()).filter(Boolean);
      addressParts.forEach((part: string) => {
        pdf.text(part.toUpperCase(), 15, yPos);
        yPos += 5;
      });
    }
    yPos += 10;
    
    // Bill To Section - Blue with underline
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("BILL TO", 15, yPos);
    pdf.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPos + 1, 42, yPos + 1);
    
    // Invoice Number and Date (Right Side) - Blue labels
    pdf.text("INVOICE #", 130, yPos);
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(invoice.invoiceNumber, 175, yPos);
    
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    if (customer) {
      pdf.text(customer.name, 15, yPos);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("INVOICE DATE", 130, yPos);
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(new Date(invoice.invoiceDate).toLocaleDateString(), 175, yPos);
    
    yPos += 6;
    const cleanedAddress = cleanAddress(customer?.address);
    if (cleanedAddress) {
      pdf.text(cleanedAddress, 15, yPos);
      yPos += 5;
    }
    
    // Customer city, state, zip
    const customerLocation = [customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ");
    if (customerLocation) {
      pdf.text(customerLocation, 15, yPos);
      yPos += 5;
    }
    
    // Table Header - Blue text with red line
    yPos += 15;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("DESCRIPTION", 15, yPos);
    pdf.text("AMOUNT", 175, yPos);
    
    yPos += 3;
    pdf.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    pdf.setLineWidth(0.8);
    pdf.line(15, yPos, 195, yPos);
    
    // Load Number Line Item - Black text
    yPos += 10;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.text(`LOAD NUMBER #${load?.loadNumber || "N/A"}`, 15, yPos);
    
    const total = Number(invoice.total);
    pdf.text(`${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 175, yPos);
    
    // Total Line - Blue label
    yPos += 25;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    pdf.text("TOTAL", 140, yPos);
    pdf.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 175, yPos);
    
    // Terms & Conditions (Centered at Bottom)
    pdf.setTextColor(blackText[0], blackText[1], blackText[2]);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms & Conditions", 105, 250, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Thank you. Payment is due within 15 days", 105, 258, { align: "center" });
    
    // Download
    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    toast({
      title: "Invoice downloaded",
      description: `Invoice ${invoice.invoiceNumber} has been downloaded as PDF.`,
    });
  };

  if (invoicesLoading || expensesLoading || paymentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Accounting</h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive financial management and reporting
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList data-testid="tabs-accounting">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <FileText className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <TrendingDown className="mr-2 h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 22, isPositive: true }}
              data-testid="card-total-revenue"
            />
            <MetricCard
              title="Total Expenses"
              value={`$${totalExpenses.toLocaleString()}`}
              icon={TrendingDown}
              data-testid="card-total-expenses"
            />
            <MetricCard
              title="Net Profit"
              value={`$${netProfit.toLocaleString()}`}
              icon={TrendingUp}
              description={`${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% margin`}
              data-testid="card-net-profit"
            />
            <MetricCard
              title="Pending Revenue"
              value={`$${pendingRevenue.toLocaleString()}`}
              icon={Package}
              description={`${invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length} pending invoices`}
              data-testid="card-pending-revenue"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest billing activity</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.slice(0, 5).map((invoice) => {
                      const customer = customers.find((c) => c.id === invoice.customerId);
                      const balance = Number(invoice.total) - Number(invoice.paidAmount || 0);
                      return (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between"
                          data-testid={`recent-invoice-${invoice.id}`}
                        >
                          <div>
                            <div className="font-medium">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-muted-foreground">{customer?.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${Number(invoice.total).toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              ${balance.toFixed(2)} balance
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Latest expense activity</CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.slice(0, 5).map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between"
                        data-testid={`recent-expense-${expense.id}`}
                      >
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          <div className="text-sm text-muted-foreground">{expense.category}</div>
                        </div>
                        <div className="font-semibold">
                          ${Number(expense.amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-invoices"
              />
            </div>
            <Button onClick={() => setInvoiceDialogOpen(true)} data-testid="button-create-invoice">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>

          <Card className="p-6">
            {filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No invoices found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {invoiceSearch ? "Try adjusting your search" : "Get started by creating your first invoice"}
                </p>
                {!invoiceSearch && (
                  <Button onClick={() => setInvoiceDialogOpen(true)} data-testid="button-empty-create-invoice">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Load #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Attachments</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const load = loads.find((l) => l.id === invoice.loadId);
                      const customer = customers.find((c) => c.id === invoice.customerId);
                      const balance = Number(invoice.total) - Number(invoice.paidAmount || 0);
                      return (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{load?.loadNumber || "-"}</TableCell>
                          <TableCell>{customer?.name || "-"}</TableCell>
                          <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${Number(invoice.total).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${Number(invoice.paidAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${balance.toFixed(2)}
                          </TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-center">
                            {invoice.attachments && (invoice.attachments as any).length > 0 ? (
                              <Badge variant="secondary" className="gap-1" data-testid={`badge-attachments-${invoice.id}`}>
                                <Paperclip className="h-3 w-3" />
                                {(invoice.attachments as any).length}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {invoice.attachments && (invoice.attachments as any).length > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setViewingAttachmentsInvoice(invoice);
                                      setAttachmentsDialogOpen(true);
                                    }}
                                    data-testid={`button-view-attachments-${invoice.id}`}
                                  >
                                    <Paperclip className="mr-2 h-4 w-4" />
                                    View Attachments
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEmailingInvoice(invoice);
                                    setEmailDialogOpen(true);
                                  }}
                                  data-testid={`button-email-${invoice.id}`}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Email to Factoring
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => downloadInvoicePDF(invoice)}
                                  data-testid={`button-download-${invoice.id}`}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditInvoice(invoice)}
                                  data-testid={`button-edit-${invoice.id}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this invoice?")) {
                                      deleteInvoiceMutation.mutate(invoice.id);
                                    }
                                  }}
                                  className="text-destructive"
                                  data-testid={`button-delete-${invoice.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-expenses"
              />
            </div>
            <Button onClick={() => setExpenseDialogOpen(true)} data-testid="button-add-expense">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          <Card className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingDown className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No expenses found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {expenseSearch ? "Try adjusting your search" : "Get started by recording your first expense"}
                </p>
                {!expenseSearch && (
                  <Button onClick={() => setExpenseDialogOpen(true)} data-testid="button-empty-add-expense">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Load</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => {
                      const load = loads.find((l) => l.id === expense.loadId);
                      return (
                        <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="text-muted-foreground">{expense.vendor || "-"}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${Number(expense.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>{load?.loadNumber || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {expense.paymentMethod || "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-actions-${expense.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditExpense(expense)}
                                  data-testid={`button-edit-${expense.id}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this expense?")) {
                                      deleteExpenseMutation.mutate(expense.id);
                                    }
                                  }}
                                  className="text-destructive"
                                  data-testid={`button-delete-${expense.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-payments"
              />
            </div>
            <Button onClick={() => setPaymentDialogOpen(true)} data-testid="button-record-payment">
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>

          <Card className="p-6">
            {filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No payments found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {paymentSearch ? "Try adjusting your search" : "Get started by recording your first payment"}
                </p>
                {!paymentSearch && (
                  <Button onClick={() => setPaymentDialogOpen(true)} data-testid="button-empty-record-payment">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference #</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
                      const customer = customers.find((c) => c.id === payment.customerId);
                      return (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{invoice?.invoiceNumber || "-"}</TableCell>
                          <TableCell>{customer?.name || "-"}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${Number(payment.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.referenceNumber || "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-actions-${payment.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditPayment(payment)}
                                  data-testid={`button-edit-${payment.id}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this payment?")) {
                                      deletePaymentMutation.mutate(payment.id);
                                    }
                                  }}
                                  className="text-destructive"
                                  data-testid={`button-delete-${payment.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={handleInvoiceDialogClose}
        invoice={editingInvoice}
        existingInvoices={invoices}
      />
      <EmailFactoringDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        invoice={emailingInvoice}
      />
      <AttachmentsViewerDialog
        open={attachmentsDialogOpen}
        onOpenChange={setAttachmentsDialogOpen}
        invoice={viewingAttachmentsInvoice}
      />
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={handleExpenseDialogClose}
        expense={editingExpense}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={handlePaymentDialogClose}
        payment={editingPayment}
      />
    </div>
  );
}
