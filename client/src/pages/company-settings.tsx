import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Building2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CompanySettings } from "@shared/schema";

const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  cityStateZip: z.string().min(1, "City, State, ZIP is required"),
  phone: z.string().min(1, "Phone number is required"),
  logoUrl: z.string().optional(),
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
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

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    values: settings ? {
      companyName: settings.companyName,
      address: settings.address,
      cityStateZip: settings.cityStateZip,
      phone: settings.phone,
      logoUrl: settings.logoUrl || "",
    } : undefined,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Company Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company information and branding for PDFs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            This information will appear on settlement PDFs and other generated documents
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
                      Upload a logo to display on settlement PDFs (PNG or JPG, recommended 300x300px)
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
    </div>
  );
}
