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
  AlertTriangle,
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
  insertChargeBackSchema,
  type ChargeBack,
  type Load,
  type Customer,
} from "@shared/schema";
import { format } from "date-fns";

const chargeBackFormSchema = z.object({
  loadId: z.string().min(1, "Load is required"),
  customerId: z.string().min(1, "Customer is required"),
  amount: z.string().min(1, "Amount is required"),
  reason: z.string().min(1, "Reason is required"),
  chargeBackDate: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  resolutionDate: z.string().optional(),
  notes: z.string().optional(),
});

type ChargeBackFormValues = z.infer<typeof chargeBackFormSchema>;

function ChargeBackDialog({
  open,
  onOpenChange,
  chargeBack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeBack?: ChargeBack | null;
}) {
  const { toast } = useToast();
  const isEditing = !!chargeBack;

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const form = useForm<ChargeBackFormValues>({
    resolver: zodResolver(chargeBackFormSchema),
    defaultValues: {
      loadId: "",
      customerId: "",
      amount: "",
      reason: "",
      chargeBackDate: "",
      status: "pending",
      resolutionDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (chargeBack) {
      form.reset({
        loadId: chargeBack.loadId,
        customerId: chargeBack.customerId,
        amount: chargeBack.amount.toString(),
        reason: chargeBack.reason,
        chargeBackDate: chargeBack.chargeBackDate ? new Date(chargeBack.chargeBackDate).toISOString().split("T")[0] : "",
        status: chargeBack.status,
        resolutionDate: chargeBack.resolutionDate ? new Date(chargeBack.resolutionDate).toISOString().split("T")[0] : "",
        notes: chargeBack.notes || "",
      });
    } else {
      form.reset({
        loadId: "",
        customerId: "",
        amount: "",
        reason: "",
        chargeBackDate: new Date().toISOString().split("T")[0],
        status: "pending",
        resolutionDate: "",
        notes: "",
      });
    }
  }, [chargeBack, form]);

  // Auto-fill customer when load is selected
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "loadId" && value.loadId) {
        const selectedLoad = loads.find((l) => l.id === value.loadId);
        if (selectedLoad) {
          form.setValue("customerId", selectedLoad.customerId);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loads]);

  const mutation = useMutation({
    mutationFn: async (values: ChargeBackFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/charge-backs/${chargeBack.id}`, values);
      }
      return await apiRequest("POST", "/api/charge-backs", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charge-backs"] });
      toast({
        title: isEditing ? "Charge back updated" : "Charge back created",
        description: `Charge back has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} charge back.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ChargeBackFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Charge Back" : "Create Charge Back"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update charge back information" : "Record a new charge back"}
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
                name="chargeBackDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge Back Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-charge-back-date" />
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
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
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

export default function ChargeBacksPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChargeBack, setSelectedChargeBack] = useState<ChargeBack | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: chargeBacks = [], isLoading } = useQuery<ChargeBack[]>({
    queryKey: ["/api/charge-backs"],
  });

  const { data: loads = [] } = useQuery<Load[]>({ queryKey: ["/api/loads"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/charge-backs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charge-backs"] });
      toast({
        title: "Charge back deleted",
        description: "Charge back has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete charge back.",
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
      case "approved":
        return "default";
      case "pending":
      case "investigating":
        return "secondary";
      case "denied":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredChargeBacks = chargeBacks.filter((cb) => {
    const loadNumber = getLoadNumber(cb.loadId).toLowerCase();
    const customerName = getCustomerName(cb.customerId).toLowerCase();
    const reason = cb.reason.toLowerCase();
    const search = searchTerm.toLowerCase();
    return loadNumber.includes(search) || customerName.includes(search) || reason.includes(search);
  });

  // Calculate totals
  const totalChargeBacks = filteredChargeBacks.length;
  const totalAmount = filteredChargeBacks.reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);
  const pendingCount = filteredChargeBacks.filter((cb) => cb.status === "pending").length;
  const resolvedCount = filteredChargeBacks.filter((cb) => cb.status === "resolved").length;

  const handleEdit = (chargeBack: ChargeBack) => {
    setSelectedChargeBack(chargeBack);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this charge back?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedChargeBack(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-charge-backs">Charge Backs</h1>
          <p className="text-muted-foreground">
            Manage customer charge back requests
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-charge-back">
          <Plus className="mr-2 h-4 w-4" />
          New Charge Back
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charge Backs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-charge-backs">{totalChargeBacks}</div>
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
            <p className="text-xs text-muted-foreground">At risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-pending">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
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
              <CardTitle>Charge Backs List</CardTitle>
              <CardDescription>All charge back records</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search charge backs..."
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
          ) : filteredChargeBacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-charge-backs">
              No charge backs found. Create your first charge back record.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChargeBacks.map((chargeBack) => (
                    <TableRow key={chargeBack.id} data-testid={`row-charge-back-${chargeBack.id}`}>
                      <TableCell className="font-medium" data-testid={`text-load-${chargeBack.id}`}>
                        {getLoadNumber(chargeBack.loadId)}
                      </TableCell>
                      <TableCell data-testid={`text-customer-${chargeBack.id}`}>
                        {getCustomerName(chargeBack.customerId)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive" data-testid={`text-amount-${chargeBack.id}`}>
                        ${parseFloat(chargeBack.amount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${chargeBack.id}`}>
                        {chargeBack.chargeBackDate ? format(new Date(chargeBack.chargeBackDate), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" data-testid={`text-reason-${chargeBack.id}`}>
                        {chargeBack.reason}
                      </TableCell>
                      <TableCell data-testid={`badge-status-${chargeBack.id}`}>
                        <Badge variant={getStatusBadgeVariant(chargeBack.status)}>
                          {chargeBack.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${chargeBack.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(chargeBack)} data-testid={`menu-edit-${chargeBack.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(chargeBack.id)}
                              className="text-destructive"
                              data-testid={`menu-delete-${chargeBack.id}`}
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

      <ChargeBackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        chargeBack={selectedChargeBack}
      />
    </div>
  );
}
