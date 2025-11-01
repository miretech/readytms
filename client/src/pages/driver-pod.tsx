import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Camera, Upload, MapPin, Package, CheckCircle2, FileText, X, LogIn, Mail, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Load } from "@shared/schema";

const driverLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function DriverPOD() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [podFiles, setPodFiles] = useState<Array<{ filename: string; data: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/driver/loads"],
    enabled: !!user, // Only fetch if user is logged in
  });

  const uploadMutation = useMutation({
    mutationFn: async (loadId: string) => {
      if (podFiles.length === 0) {
        throw new Error("Please add at least one POD photo");
      }
      
      return await apiRequest("POST", `/api/driver/loads/${loadId}/pod`, {
        podAttachments: podFiles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/loads"] });
      toast({
        title: "POD Uploaded!",
        description: "Proof of delivery has been submitted successfully.",
      });
      setSelectedLoad(null);
      setPodFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload POD. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: typeof podFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image or PDF`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newFiles.push({
          filename: file.name,
          data: base64,
          type: file.type,
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setPodFiles([...podFiles, ...newFiles]);
    event.target.value = "";
  };

  const removePodFile = (index: number) => {
    setPodFiles(podFiles.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500",
      dispatched: "bg-blue-500",
      "in-transit": "bg-purple-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
    };
    
    return (
      <Badge className={statusColors[status.toLowerCase()] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  const activeLoads = loads.filter(load => 
    load.status.toLowerCase() !== 'delivered' && 
    load.status.toLowerCase() !== 'cancelled'
  );

  // Driver login form
  const loginForm = useForm<z.infer<typeof driverLoginSchema>>({
    resolver: zodResolver(driverLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof driverLoginSchema>) => {
      return await apiRequest("POST", "/api/driver/login", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome!",
        description: "You've successfully logged in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid driver credentials",
        variant: "destructive",
      });
    },
  });

  // Show login screen if not authenticated
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
          <h1 className="text-xl font-bold">Driver POD Upload</h1>
          <p className="text-sm opacity-90">Proof of Delivery Portal</p>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Driver Login</CardTitle>
              <CardDescription>
                Enter your driver credentials to access your assigned loads and upload PODs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="driver@example.com"
                              className="pl-10"
                              data-testid="input-driver-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              data-testid="input-driver-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-sm"
                      onClick={() => window.location.href = "/reset-password?type=driver"}
                      data-testid="button-forgot-password-driver"
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-driver-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Driver Login
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 pt-4 border-t text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <a
                    href="/driver-signup"
                    className="text-primary hover:underline font-medium"
                    data-testid="link-driver-signup"
                  >
                    Register here
                  </a>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/login"}
                  data-testid="button-admin-login"
                >
                  Admin Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your loads...</p>
        </div>
      </div>
    );
  }

  if (selectedLoad) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Upload POD</h1>
              <p className="text-sm opacity-90">Load #{selectedLoad.loadNumber}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSelectedLoad(null);
                setPodFiles([]);
              }}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-back"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Load Details */}
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Delivery Location</p>
                  <p className="text-muted-foreground">{selectedLoad.deliveryLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Commodity</p>
                  <p className="text-muted-foreground">{selectedLoad.commodity || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full h-14 text-lg"
              size="lg"
              data-testid="button-take-photo"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-14 text-lg"
              size="lg"
              data-testid="button-upload-file"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload from Gallery
            </Button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileSelect(e, true)}
              className="hidden"
              multiple
              data-testid="input-camera"
            />
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileSelect(e, false)}
              className="hidden"
              multiple
              data-testid="input-file"
            />
          </div>

          {/* POD Files Preview */}
          {podFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attached Files ({podFiles.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {podFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`pod-file-${index}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.filename}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePodFile(index)}
                      className="flex-shrink-0"
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={() => uploadMutation.mutate(selectedLoad.id)}
            disabled={podFiles.length === 0 || uploadMutation.isPending}
            className="w-full h-14 text-lg"
            size="lg"
            data-testid="button-submit-pod"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Submit POD ({podFiles.length} {podFiles.length === 1 ? 'file' : 'files'})
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold">My Loads</h1>
        <p className="text-sm opacity-90">Upload proof of delivery</p>
      </div>

      {/* Loads List */}
      <div className="p-4 space-y-3">
        {activeLoads.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Active Loads</p>
              <p className="text-sm text-muted-foreground">
                You don't have any active loads assigned at the moment.
              </p>
            </div>
          </Card>
        ) : (
          activeLoads.map((load) => (
            <Card 
              key={load.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedLoad(load)}
              data-testid={`load-card-${load.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">Load #{load.loadNumber}</CardTitle>
                    <CardDescription className="mt-1">
                      {load.commodity || "Standard freight"}
                    </CardDescription>
                  </div>
                  {getStatusBadge(load.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Delivery</p>
                    <p className="text-muted-foreground truncate">{load.deliveryLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-muted-foreground">
                    {((load.podAttachments as any)?.length || 0) > 0 
                      ? `${(load.podAttachments as any).length} POD file(s) uploaded`
                      : "No POD uploaded yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
