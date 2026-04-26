import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, CheckCircle2, Clock, AlertCircle, Paperclip, X, Download, Upload, Eye, Mail } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTaskSchema, type Task } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";

interface Attachment {
  fileName: string;
  fileData: string;
  uploadedAt: string;
}

const formSchema = insertTaskSchema.extend({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  reminderEmail: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Multi-email state
  const [reminderEmails, setReminderEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      dueTime: "",
      repeatDaily: "false",
      reminderEmail: "",
      assignedTo: "",
      status: "pending",
      priority: "medium",
      category: "",
      completedAt: "",
      attachments: [],
    },
  });

  const handleAddEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (reminderEmails.includes(trimmed)) {
      setEmailError("This email has already been added");
      return;
    }
    setReminderEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
    setEmailError("");
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleRemoveEmail = (email: string) => {
    setReminderEmails((prev) => prev.filter((e) => e !== email));
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const reminderEmail = reminderEmails.join(", ");
      const payload = { ...values, reminderEmail, attachments };
      if (editingTask) {
        return await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, payload);
      }
      return await apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: editingTask ? "Task updated" : "Task created",
        description: `The task has been successfully ${editingTask ? "updated" : "created"}.`,
      });
      setIsDialogOpen(false);
      setEditingTask(null);
      setAttachments([]);
      setReminderEmails([]);
      setEmailInput("");
      setEmailError("");
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${editingTask ? "update" : "create"} task. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "The task has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}`, {
        status: status === "completed" ? "pending" : "completed",
        completedAt: status === "completed" ? "" : new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (task.assignedTo?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (task: Task) => {
    setViewingTask(task);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setIsViewDialogOpen(false);
    setViewingTask(null);
    setEditingTask(task);
    const existingAttachments = (task.attachments as Attachment[] | null) || [];
    setAttachments(existingAttachments);
    // Parse stored comma-separated emails
    const storedEmails = task.reminderEmail
      ? task.reminderEmail.split(",").map((e) => e.trim()).filter(Boolean)
      : [];
    setReminderEmails(storedEmails);
    setEmailInput("");
    setEmailError("");
    form.reset({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      dueTime: task.dueTime || "",
      repeatDaily: task.repeatDaily || "false",
      reminderEmail: "",
      assignedTo: task.assignedTo || "",
      status: task.status,
      priority: task.priority,
      category: task.category || "",
      completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : "",
      attachments: existingAttachments,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    setAttachments([]);
    setReminderEmails([]);
    setEmailInput("");
    setEmailError("");
    form.reset();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        fileName: file.name,
        fileData: base64,
        uploadedAt: new Date().toISOString(),
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const link = document.createElement("a");
    link.href = attachment.fileData;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIsImage = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
  };

  const getStatusIcon = (task: Task) => {
    if (task.status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "completed") return <AlertCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-blue-600" />;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = { low: "outline" as const, medium: "secondary" as const, high: "destructive" as const };
    return <Badge variant={variants[priority as keyof typeof variants] || "secondary"}>{priority}</Badge>;
  };

  const getStatusLabel = (task: Task) => {
    if (task.status === "completed") return "Completed";
    if (task.dueDate && isPast(new Date(task.dueDate))) return "Overdue";
    if (task.dueDate && isToday(new Date(task.dueDate))) return "Due Today";
    return "Pending";
  };

  const parseEmails = (raw: string | null | undefined): string[] =>
    raw ? raw.split(",").map((e) => e.trim()).filter(Boolean) : [];

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
          <h1 className="text-3xl font-semibold tracking-tight">Task Manager</h1>
          <p className="text-sm text-muted-foreground">Track daily reminders and recurring tasks</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-task">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tasks"
            />
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No tasks found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first task"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-create-task">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const taskAttachments = (task.attachments as Attachment[] | null) || [];
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(task)}
                      data-testid={`row-task-${task.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={() => toggleCompleteMutation.mutate({ id: task.id, status: task.status })}
                          data-testid={`checkbox-complete-${task.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {getStatusIcon(task)}
                          <div>
                            <div className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">{task.description}</div>
                            )}
                            {task.repeatDaily === "true" && (
                              <Badge variant="outline" className="mt-1">Repeats Daily</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(task.dueDate), "MMM d, yyyy")}
                          {task.dueTime && <div className="text-muted-foreground">{task.dueTime}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{task.assignedTo || "Unassigned"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{getStatusLabel(task)}</div>
                      </TableCell>
                      <TableCell>
                        {taskAttachments.length > 0 ? (
                          <Badge variant="secondary" data-testid={`badge-attachments-${task.id}`}>
                            <Paperclip className="mr-1 h-3 w-3" />
                            {taskAttachments.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${task.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(task)} data-testid={`button-edit-${task.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(task.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${task.id}`}
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

      {/* View Task Dialog */}
      {viewingTask && (
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setViewingTask(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-6">
                <div className="flex items-start gap-2 min-w-0">
                  {getStatusIcon(viewingTask)}
                  <div className="min-w-0">
                    <DialogTitle className={`text-xl leading-tight ${viewingTask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {viewingTask.title}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {getStatusLabel(viewingTask)}
                      {viewingTask.repeatDaily === "true" && (
                        <Badge variant="outline" className="ml-2">Repeats Daily</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(viewingTask)}
                  data-testid="button-view-edit"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(viewingTask.dueDate), "MMMM d, yyyy")}
                    {viewingTask.dueTime && <span className="text-muted-foreground ml-1">at {viewingTask.dueTime}</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                  {getPriorityBadge(viewingTask.priority)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</p>
                  <p className="text-sm font-medium">{viewingTask.assignedTo || "Unassigned"}</p>
                </div>
                {viewingTask.category && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                    <p className="text-sm font-medium capitalize">{viewingTask.category}</p>
                  </div>
                )}
                {viewingTask.repeatDaily === "true" && viewingTask.reminderEmail && (
                  <div className="space-y-2 col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Daily Reminder Emails
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parseEmails(viewingTask.reminderEmail).map((email) => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          <Mail className="mr-1 h-3 w-3" />
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingTask.description && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{viewingTask.description}</p>
                  </div>
                </>
              )}

              {/* Attachments */}
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments
                  {((viewingTask.attachments as Attachment[] | null) || []).length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {((viewingTask.attachments as Attachment[] | null) || []).length}
                    </Badge>
                  )}
                </p>

                {((viewingTask.attachments as Attachment[] | null) || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments on this task.</p>
                ) : (
                  <div className="space-y-2">
                    {((viewingTask.attachments as Attachment[]) || []).map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border p-3 gap-2"
                        data-testid={`view-attachment-${index}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIsImage(attachment.fileName) ? (
                            <img
                              src={attachment.fileData}
                              alt={attachment.fileName}
                              className="h-10 w-10 rounded object-cover border shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {format(new Date(attachment.uploadedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment)}
                          data-testid={`button-view-download-${index}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Create a new task or reminder"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Complete oil change on Truck #123" data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Additional details..." data-testid="input-task-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-task-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="time" data-testid="input-task-due-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
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
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="paperwork">Paperwork</SelectItem>
                          <SelectItem value="dispatch">Dispatch</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Person or department" data-testid="input-task-assigned-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repeatDaily"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="checkbox-repeat-daily"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Repeat this task daily</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Multi-email section — only shown when repeatDaily is checked */}
              {form.watch("repeatDaily") === "true" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Daily Reminder Emails (Optional)
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      A morning reminder will be sent to all addresses below each day.
                    </p>

                    {/* Existing email tags */}
                    {reminderEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {reminderEmails.map((email) => (
                          <div
                            key={email}
                            className="flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-sm"
                            data-testid={`email-tag-${email}`}
                          >
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium">{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              data-testid={`button-remove-email-${email}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new email input */}
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Add email address..."
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setEmailError(""); }}
                        onKeyDown={handleEmailKeyDown}
                        className={emailError ? "border-destructive" : ""}
                        data-testid="input-task-reminder-email"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddEmail}
                        data-testid="button-add-reminder-email"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    {emailError && (
                      <p className="text-xs text-destructive mt-1">{emailError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Attachments</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-attachment"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Files"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="input-file-attachment"
                  />
                </div>

                {attachments.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-attachments"
                  >
                    <Paperclip className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No attachments yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to upload PDFs, images, or documents (max 10MB each)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border p-3 gap-2"
                        data-testid={`attachment-item-${index}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(attachment.uploadedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {getFileIsImage(attachment.fileName) && (
                            <img
                              src={attachment.fileData}
                              alt={attachment.fileName}
                              className="h-8 w-8 rounded object-cover border"
                            />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadAttachment(attachment)}
                            data-testid={`button-download-attachment-${index}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAttachment(index)}
                            data-testid={`button-remove-attachment-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-add-more-attachments"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add More Files
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
                  {createMutation.isPending ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
