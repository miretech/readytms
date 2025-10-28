import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Check, X, UserCog, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    return user.status === filter;
  });

  const pendingCount = users.filter((u) => u.status === "pending").length;
  const approvedCount = users.filter((u) => u.status === "approved").length;
  const suspendedCount = users.filter((u) => u.status === "suspended").length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return (
      <Badge className={variants[status] || variants["pending"]} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      user: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return (
      <Badge className={variants[role] || variants["user"]} data-testid={`badge-role-${role}`}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">Manage user access and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <UserCog className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold text-red-600">{suspendedCount}</p>
            </div>
            <X className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Filter by Status:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48" data-testid="select-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No users found</p>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{new Date(user.createdAt!).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {user.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatusMutation.mutate({ userId: user.id, status: "approved" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-approve-${user.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatusMutation.mutate({ userId: user.id, status: "suspended" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-suspend-${user.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {user.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ userId: user.id, status: "suspended" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-suspend-${user.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                      {user.status === "suspended" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatusMutation.mutate({ userId: user.id, status: "approved" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-approve-${user.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
