import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertShortPaySchema,
  type ShortPay,
  type Load,
  type Customer,
} from "@shared/schema";
import { format } from "date-fns";

const shortPayFormSchema = z.object({
  loadId: z.string().min(1, "Load is required"),
  customerId: z.string().min(1, "Customer is required"),
  originalAmount: z.string().min(1, "Original amount is required"),
  paidAmount: z.string().min(1, "Paid amount is required"),
  shortPayAmount: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  status: z.string().min(1, "Status is required"),
  resolutionDate: z.string().optional(),
  notes: z.string().optional(),
});

type ShortPayFormValues = z.infer<typeof shortPayFormSchema>;

function ShortPayDialog({
  open,
  onOpenChange,
  shortPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortPay?: ShortPay | null;
}) {
  const { toast } = useToast();
  const isEditing = !!shortPay;

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const form = useForm<ShortPayFormValues>({
    resolver: zodResolver(shortPayFormSchema),
    defaultValues: {
      loadId: "",
      customerId: "",
      originalAmount: "",
      paidAmount: "",
      shortPayAmount: "",
      reason: "",
      status: "pending",
      resolutionDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (shortPay) {
      form.reset({
        loadId: shortPay.loadId,
        customerId: shortPay.customerId,
        originalAmount: shortPay.expectedAmount.toString(),
        paidAmount: shortPay.paidAmount.toString(),
        shortPayAmount: shortPay.shortAmount.toString(),
        reason: shortPay.reason,
        status: shortPay.status,
        resolutionDate: shortPay.resolvedAt ? new Date(shortPay.resolvedAt).toISOString().split("T")[0] : "",
        notes: shortPay.notes || "",
      });
    } else {
      form.reset({
        loadId: "",
        customerId: "",
        originalAmount: "",
        paidAmount: "",
        shortPayAmount: "",
        reason: "",
        status: "pending",
        resolutionDate: "",
        notes: "",
      });
    }
  }, [shortPay, form]);

  // Auto-calculate short pay amount when original and paid amounts change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "originalAmount" || name === "paidAmount") {
        const original = parseFloat(value.originalAmount || "0");
        const paid = parseFloat(value.paidAmount || "0");
        const shortPay = original - paid;
        form.setValue("shortPayAmount", shortPay.toFixed(2));
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
          if (!value.originalAmount) {
            form.setValue("originalAmount", selectedLoad.rate.toString());
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loads]);

  const mutation = useMutation({
    mutationFn: async (values: ShortPayFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/short-pays/${shortPay.id}`, values);
      }
      return await apiRequest("POST", "/api/short-pays", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/short-pays"] });
      toast({
        title: isEditing ? "Short pay updated" : "Short pay created",
        description: `Short pay has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} short pay.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ShortPayFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Short Pay" : "Create Short Pay"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update short pay information" : "Record a new short pay"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                name="originalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-original-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-paid-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortPayAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Pay Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly data-testid="input-short-pay-amount" className="bg-muted" />
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under-review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} data-testid="input-reason" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolutionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-resolution-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-notes" />
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ShortPaysPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShortPay, setSelectedShortPay] = useState<ShortPay | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: shortPays = [], isLoading } = useQuery<ShortPay[]>({
    queryKey: ["/api/short-pays"],
  });

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/short-pays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/short-pays"] });
      toast({
        title: "Short pay deleted",
        description: "Short pay has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete short pay.",
        variant: "destructive",
      });
    },
  });

  const getLoadNumber = (loadId: string) => {
    const load = loads.find((l) => l.id === loadId);
    return load?.loadNumber || "N/A";
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "N/A";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "resolved":
        return "default";
      case "pending":
        return "secondary";
      case "under-review":
        return "secondary";
      case "disputed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredShortPays = shortPays.filter((sp) => {
    const loadNumber = getLoadNumber(sp.loadId).toLowerCase();
    const customerName = getCustomerName(sp.customerId).toLowerCase();
    const reason = sp.reason.toLowerCase();
    const search = searchTerm.toLowerCase();
    return loadNumber.includes(search) || customerName.includes(search) || reason.includes(search);
  });

  // Calculate totals
  const totalShortPays = filteredShortPays.length;
  const totalAmount = filteredShortPays.reduce((sum, sp) => sum + parseFloat((sp.shortAmount || 0).toString()), 0);
  const pendingCount = filteredShortPays.filter((sp) => sp.status === "pending" || sp.status === "open").length;
  const resolvedCount = filteredShortPays.filter((sp) => sp.status === "resolved").length;

  const handleEdit = (shortPay: ShortPay) => {
    setSelectedShortPay(shortPay);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this short pay?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedShortPay(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-short-pays">Short Pay Loads</h1>
          <p className="text-muted-foreground">
            Manage loads with payment discrepancies
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-short-pay">
          <Plus className="mr-2 h-4 w-4" />
          New Short Pay
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Short Pays</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-short-pays">{totalShortPays}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-amount">
              ${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-pending">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-resolved">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Short Pays List</CardTitle>
              <CardDescription>All short pay records</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search short pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredShortPays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-short-pays">
              No short pays found. Create your first short pay record.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Short Pay</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShortPays.map((shortPay) => (
                    <TableRow key={shortPay.id} data-testid={`row-short-pay-${shortPay.id}`}>
                      <TableCell className="font-medium" data-testid={`text-load-${shortPay.id}`}>
                        {getLoadNumber(shortPay.loadId)}
                      </TableCell>
                      <TableCell data-testid={`text-customer-${shortPay.id}`}>
                        {getCustomerName(shortPay.customerId)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-original-${shortPay.id}`}>
                        ${parseFloat(shortPay.expectedAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-paid-${shortPay.id}`}>
                        ${parseFloat(shortPay.paidAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive" data-testid={`text-short-pay-${shortPay.id}`}>
                        ${parseFloat(shortPay.shortAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-reason-${shortPay.id}`}>
                        {shortPay.reason}
                      </TableCell>
                      <TableCell data-testid={`badge-status-${shortPay.id}`}>
                        <Badge variant={getStatusBadgeVariant(shortPay.status)}>
                          {shortPay.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${shortPay.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(shortPay)} data-testid={`menu-edit-${shortPay.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(shortPay.id)}
                              className="text-destructive"
                              data-testid={`menu-delete-${shortPay.id}`}
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
        </CardContent>
      </Card>

      <ShortPayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shortPay={selectedShortPay}
      />
    </div>
  );
}
