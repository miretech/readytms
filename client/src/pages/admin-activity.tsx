import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Calendar, User, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityLog, User as UserType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function AdminActivity() {
  const [limit] = useState(500);

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity", limit],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
  });

  // Group logs by date
  const logsByDate = logs.reduce((acc, log) => {
    const date = new Date(log.createdAt!).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  // Group logs by user for daily summary
  const activityByUser = logs.reduce((acc, log) => {
    const metadata = log.metadata as any;
    const userId = metadata?.userId || metadata?.adminId || "system";
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  const getUserName = (userId: string) => {
    if (userId === "system") return "System";
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: typeof CheckCircle }> = {
      success: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle },
      failed: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: XCircle },
      pending: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", icon: Clock },
    };
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.className} data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    return (
      <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-action-${action}`}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Log
          </h1>
          <p className="text-muted-foreground">Monitor user actions and system events</p>
        </div>
      </div>

      {/* Daily Activity Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users Today</p>
              <p className="text-2xl font-bold">{Object.keys(activityByUser).length}</p>
            </div>
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Days Tracked</p>
              <p className="text-2xl font-bold">{Object.keys(logsByDate).length}</p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* User Activity Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Activity by User</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(activityByUser).map(([userId, userLogs]) => (
            <Card key={userId} className="p-4 hover-elevate">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{getUserName(userId)}</span>
                </div>
                <Badge variant="secondary">{userLogs.length} actions</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Last active: {formatDistanceToNow(new Date(userLogs[0]?.createdAt!), { addSuffix: true })}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Activity Log Table */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No activity recorded yet</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                    <TableCell className="font-mono text-xs">
                      {formatDistanceToNow(new Date(log.createdAt!), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {getUserName((log.metadata as any)?.userId || (log.metadata as any)?.adminId || "system")}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.entityType && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{log.entityType}</span>
                          {log.entityId && (
                            <code className="text-xs bg-muted px-1 rounded">{log.entityId.slice(0, 8)}</code>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{log.details || "-"}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
