import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Mail, Clock } from "lucide-react";
import { format } from "date-fns";

type PendingAdmin = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
};

export default function AdminApprovals() {
  const { toast } = useToast();

  const { data: pendingAdmins = [], isLoading } = useQuery<PendingAdmin[]>({
    queryKey: ["/api/admin/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/approve/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
      toast({
        title: "Admin Approved",
        description: "The admin account has been approved and the user has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve admin. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/reject/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
      toast({
        title: "Registration Rejected",
        description: "The admin registration has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject admin. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending admin registrations</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading pending approvals...
          </CardContent>
        </Card>
      ) : pendingAdmins.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
            <p className="text-muted-foreground">All admin registrations have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingAdmins.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {admin.email}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Registered {format(new Date(admin.createdAt), "PPP 'at' p")}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    onClick={() => approveMutation.mutate(admin.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid={`button-approve-${admin.id}`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(admin.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid={`button-reject-${admin.id}`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
