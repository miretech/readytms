import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Building2, Upload, Plus, Pencil, Trash2, Star, StarOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CompanySettings, type Division } from "@shared/schema";

const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  cityStateZip: z.string().min(1, "City, State, ZIP is required"),
  phone: z.string().min(1, "Phone number is required"),
  logoUrl: z.string().optional(),
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

const divisionSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  cityStateZip: z.string().min(1, "City, State, ZIP is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

type DivisionFormValues = z.infer<typeof divisionSchema>;

function DivisionDialog({
  open,
  onOpenChange,
  division,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: Division;
}) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string>("");
  const isEditing = !!division;

  const form = useForm<DivisionFormValues>({
    resolver: zodResolver(divisionSchema),
    defaultValues: division
      ? {
          companyName: division.companyName,
          address: division.address,
          cityStateZip: division.cityStateZip,
          phone: division.phone,
          email: division.email || "",
          logoUrl: division.logoUrl || "",
          isPrimary: division.isPrimary,
          isActive: division.isActive,
        }
      : {
          companyName: "",
          address: "",
          cityStateZip: "",
          phone: "",
          email: "",
          logoUrl: "",
          isPrimary: false,
          isActive: true,
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: DivisionFormValues) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/divisions/${division.id}`, data);
      }
      return await apiRequest("POST", "/api/divisions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({
        title: isEditing ? "Division Updated" : "Division Created",
        description: `${form.getValues("companyName")} has been ${isEditing ? "updated" : "added"} successfully.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        form.setValue("logoUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Division" : "Add Division"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this division's information"
              : "Add a new company division with separate branding"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="North East Express"
                      data-testid="input-division-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123 Main Street"
                      data-testid="input-division-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cityStateZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City, State, ZIP *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Boston, MA 02101"
                      data-testid="input-division-citystatezip"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="612-555-0100"
                      data-testid="input-division-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="info@northeastexpress.com"
                      data-testid="input-division-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo</FormLabel>
                  <FormDescription>
                    Upload a logo for this division (PNG or JPG)
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleLogoChange}
                        data-testid="input-division-logo"
                      />
                      {(logoPreview || field.value) && (
                        <div className="flex items-center gap-4">
                          <img
                            src={logoPreview || field.value}
                            alt="Division Logo"
                            className="w-24 h-24 object-contain border rounded"
                            data-testid="img-division-logo-preview"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLogoPreview("");
                              form.setValue("logoUrl", "");
                            }}
                            data-testid="button-remove-division-logo"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-division"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-division"
              >
                <Save className="mr-2 h-4 w-4" />
                {mutation.isPending
                  ? "Saving..."
                  : isEditing
                    ? "Update Division"
                    : "Create Division"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | undefined>();
  const [deletingDivision, setDeletingDivision] = useState<Division | undefined>();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteDivision, setInviteDivision] = useState<Division | undefined>();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const { data: divisionsList = [], isLoading: divisionsLoading } = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CompanySettingsFormValues) => {
      return await apiRequest("PATCH", "/api/company-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      toast({
        title: "Settings Updated",
        description: "Company settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDivisionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/divisions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({
        title: "Division Deleted",
        description: "The division has been removed.",
      });
      setDeletingDivision(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ divisionId, email }: { divisionId: string; email: string }) => {
      return await apiRequest("POST", `/api/divisions/${divisionId}/invite`, { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}.`,
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteDivision(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/divisions/${id}`, { isPrimary: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({
        title: "Primary Division Set",
        description: "This division is now the primary company.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    values: settings
      ? {
          companyName: settings.companyName,
          address: settings.address,
          cityStateZip: settings.cityStateZip,
          phone: settings.phone,
          logoUrl: settings.logoUrl || "",
        }
      : undefined,
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        form.setValue("logoUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: CompanySettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Company Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company information, divisions, and branding
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Main Company Information</CardTitle>
          <CardDescription>
            This information will appear on settlement PDFs and other generated
            documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ready Carrier LLC"
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="2380 Wycliff Street Ste 200"
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cityStateZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City, State, ZIP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="St Paul, MN 55114"
                        data-testid="input-city-state-zip"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="612-567-5034"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Logo</FormLabel>
                    <FormDescription>
                      Upload a logo to display on settlement PDFs (PNG or JPG,
                      recommended 300x300px)
                    </FormDescription>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleLogoChange}
                          data-testid="input-logo"
                        />
                        {(logoPreview || field.value) && (
                          <div className="flex items-center gap-4">
                            <img
                              src={logoPreview || field.value}
                              alt="Company Logo"
                              className="w-32 h-32 object-contain border rounded"
                              data-testid="img-logo-preview"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLogoPreview("");
                                setLogoFile(null);
                                form.setValue("logoUrl", "");
                              }}
                              data-testid="button-remove-logo"
                            >
                              Remove Logo
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">Divisions</h2>
            <p className="text-muted-foreground">
              Manage separate companies or sub-divisions under your Ready TMS
              account
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingDivision(undefined);
              setDivisionDialogOpen(true);
            }}
            data-testid="button-add-division"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Division
          </Button>
        </div>

        {divisionsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : divisionsList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Divisions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add divisions to manage multiple companies or sub-divisions
                under your Ready TMS account. Each division gets its own
                branding for invoices and documents.
              </p>
              <Button
                onClick={() => {
                  setEditingDivision(undefined);
                  setDivisionDialogOpen(true);
                }}
                data-testid="button-add-first-division"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Division
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {divisionsList.map((division) => (
              <Card key={division.id} data-testid={`card-division-${division.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      {division.logoUrl ? (
                        <img
                          src={division.logoUrl}
                          alt={division.companyName}
                          className="w-12 h-12 object-contain border rounded shrink-0"
                          data-testid={`img-division-logo-${division.id}`}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="font-semibold text-lg"
                            data-testid={`text-division-name-${division.id}`}
                          >
                            {division.companyName}
                          </h3>
                          {division.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              Primary
                            </Badge>
                          )}
                          {!division.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {division.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {division.cityStateZip}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {division.phone}
                        </p>
                        {division.email && (
                          <p className="text-sm text-muted-foreground">
                            {division.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!division.isPrimary && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPrimaryMutation.mutate(division.id)}
                          title="Set as primary"
                          data-testid={`button-set-primary-${division.id}`}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setInviteDivision(division);
                          setInviteDialogOpen(true);
                        }}
                        title="Send invitation"
                        data-testid={`button-invite-division-${division.id}`}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingDivision(division);
                          setDivisionDialogOpen(true);
                        }}
                        data-testid={`button-edit-division-${division.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingDivision(division)}
                        data-testid={`button-delete-division-${division.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {divisionDialogOpen && (
        <DivisionDialog
          open={divisionDialogOpen}
          onOpenChange={(open) => {
            setDivisionDialogOpen(open);
            if (!open) setEditingDivision(undefined);
          }}
          division={editingDivision}
        />
      )}

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            setInviteDivision(undefined);
            setInviteEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to {inviteDivision?.companyName}</DialogTitle>
            <DialogDescription>
              Send an invitation email to join this division on Ready TMS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteDialogOpen(false);
                  setInviteEmail("");
                  setInviteDivision(undefined);
                }}
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (inviteDivision && inviteEmail) {
                    inviteMutation.mutate({ divisionId: inviteDivision.id, email: inviteEmail });
                  }
                }}
                disabled={!inviteEmail || inviteMutation.isPending}
                data-testid="button-send-invite"
              >
                <Send className="mr-2 h-4 w-4" />
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingDivision}
        onOpenChange={(open) => {
          if (!open) setDeletingDivision(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Division</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDivision?.companyName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-division">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingDivision) {
                  deleteDivisionMutation.mutate(deletingDivision.id);
                }
              }}
              data-testid="button-confirm-delete-division"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
