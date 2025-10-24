import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreVertical, Edit, Trash2, DollarSign, Calendar, User } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRecurringExpenseSchema, type RecurringExpense, type Driver } from "@shared/schema";

const recurringExpenseFormSchema = insertRecurringExpenseSchema.extend({
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.string().min(1, "Frequency is required"),
  category: z.string().min(1, "Category is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isActive: z.string(),
});

type RecurringExpenseFormValues = z.infer<typeof recurringExpenseFormSchema>;

function RecurringExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: RecurringExpense | null;
}) {
  const { toast } = useToast();
  const isEditing = !!expense;

  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseFormSchema),
    defaultValues: {
      driverId: "",
      name: "",
      description: "",
      amount: "",
      frequency: "weekly",
      category: "other",
      startDate: "",
      endDate: "",
      isActive: "true",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        driverId: expense.driverId || "",
        name: expense.name,
        description: expense.description || "",
        amount: expense.amount.toString(),
        frequency: expense.frequency,
        category: expense.category,
        startDate: new Date(expense.startDate).toISOString().split("T")[0],
        endDate: expense.endDate ? new Date(expense.endDate).toISOString().split("T")[0] : "",
        isActive: expense.isActive === "true" ? "true" : "false",
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      form.reset({
        driverId: "",
        name: "",
        description: "",
        amount: "",
        frequency: "weekly",
        category: "other",
        startDate: today,
        endDate: "",
        isActive: "true",
      });
    }
  }, [expense, form]);

  const mutation = useMutation({
    mutationFn: async (values: RecurringExpenseFormValues) => {
      const payload = {
        ...values,
        driverId: values.driverId && values.driverId !== "none" ? values.driverId : undefined,
        description: values.description || undefined,
        endDate: values.endDate || undefined,
      };
      if (isEditing) {
        return await apiRequest("PATCH", `/api/recurring-expenses/${expense.id}`, payload);
      }
      return await apiRequest("POST", "/api/recurring-expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-expenses"] });
      toast({
        title: isEditing ? "Expense updated" : "Expense created",
        description: `Recurring expense has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} recurring expense.`,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Recurring Expense" : "Create Recurring Expense"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update recurring expense information" : "Create a new recurring expense template"}
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
                    <FormLabel>Driver (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-driver">
                          <SelectValue placeholder="All drivers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">All drivers</SelectItem>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" placeholder="e.g., Insurance Premium" />
                    </FormControl>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="truck_lease">Truck Lease</SelectItem>
                        <SelectItem value="fuel_advance">Fuel Advance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        data-testid="input-amount"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-frequency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} data-testid="input-description" rows={3} />
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
                {mutation.isPending ? "Saving..." : isEditing ? "Update Expense" : "Create Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function RecurringExpenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery<RecurringExpense[]>({
    queryKey: ["/api/recurring-expenses"],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/recurring-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-expenses"] });
      toast({
        title: "Expense deleted",
        description: "The recurring expense has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recurring expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "All Drivers";
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "Unknown Driver";
  };

  const filteredExpenses = expenses.filter((expense) => {
    const query = searchQuery.toLowerCase();
    return (
      expense.name.toLowerCase().includes(query) ||
      expense.category.toLowerCase().includes(query) ||
      getDriverName(expense.driverId).toLowerCase().includes(query)
    );
  });

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this recurring expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
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
            Recurring Expenses
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
            Manage recurring deductions for driver settlements
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          data-testid="button-create-expense"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Expense
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium" data-testid="text-empty-title">
              No recurring expenses found
            </h3>
            <p className="mb-4 text-sm text-muted-foreground" data-testid="text-empty-description">
              {searchQuery ? "Try adjusting your search" : "Get started by creating your first recurring expense"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create">
                <Plus className="mr-2 h-4 w-4" />
                Create Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${expense.id}`}>
                      {expense.name}
                    </TableCell>
                    <TableCell data-testid={`text-driver-${expense.id}`}>
                      {getDriverName(expense.driverId)}
                    </TableCell>
                    <TableCell data-testid={`text-category-${expense.id}`}>
                      <Badge variant="outline">
                        {expense.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-amount-${expense.id}`}>
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell data-testid={`text-frequency-${expense.id}`}>
                      {formatFrequency(expense.frequency)}
                    </TableCell>
                    <TableCell data-testid={`text-start-date-${expense.id}`}>
                      {new Date(expense.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell data-testid={`text-end-date-${expense.id}`}>
                      {expense.endDate ? new Date(expense.endDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-status-${expense.id}`}>
                      <Badge variant={expense.isActive === "true" ? "default" : "secondary"}>
                        {expense.isActive === "true" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-menu-${expense.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(expense)}
                            data-testid={`button-edit-${expense.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(expense.id)}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <RecurringExpenseDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        expense={editingExpense}
      />
    </div>
  );
}
