import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Camera, Upload, CheckCircle2, FileText, X, Truck, User, Hash,
  RotateCcw, Search, Clock, Package,
} from "lucide-react";
import { format } from "date-fns";

const podFormSchema = z.object({
  driverName: z.string().min(1, "Driver name is required"),
  loadNumber: z.string().min(1, "Load number is required"),
  truckNumber: z.string().min(1, "Truck number is required"),
});

type PodFormValues = z.infer<typeof podFormSchema>;

interface PodStatusResult {
  loadNumber: string;
  status: string;
  podCount: number;
  submissions: Array<{
    filename: string;
    uploadedAt: string;
    uploadedBy?: string;
    truckNumber?: string;
  }>;
}

export default function DriverPOD() {
  const { toast } = useToast();
  const [podFiles, setPodFiles] = useState<Array<{ filename: string; data: string; type: string }>>([]);
  const [uploadSuccess, setUploadSuccess] = useState<{ loadNumber: string } | null>(null);
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupQuery, setLookupQuery] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PodFormValues>({
    resolver: zodResolver(podFormSchema),
    defaultValues: {
      driverName: "",
      loadNumber: "",
      truckNumber: "",
    },
  });

  const parseApiError = (error: any): string => {
    const msg: string = error?.message || "";
    // apiRequest throws "STATUS: {json}" — extract the human-readable error field if present
    const jsonMatch = msg.match(/^\d+:\s*(\{.*\})$/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return parsed.error || parsed.message || msg;
      } catch {}
    }
    return msg || "Something went wrong. Please try again.";
  };

  const uploadMutation = useMutation({
    mutationFn: async (values: PodFormValues) => {
      if (podFiles.length === 0) {
        throw new Error("Please add at least one POD photo or file before submitting.");
      }
      const res = await fetch("/api/public/pod-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, podAttachments: podFiles }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload POD. Please try again.");
      }
      return data as { message: string; loadNumber: string };
    },
    onSuccess: (data) => {
      setUploadSuccess({ loadNumber: data.loadNumber });
      setPodFiles([]);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: parseApiError(error),
        variant: "destructive",
      });
    },
  });

  const { data: podStatus, isLoading: isLookingUp, error: lookupError } = useQuery<PodStatusResult>({
    queryKey: ["/api/public/pod-status", lookupQuery],
    queryFn: async () => {
      const res = await fetch(`/api/public/pod-status/${encodeURIComponent(lookupQuery!)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Load not found");
      }
      return res.json();
    },
    enabled: !!lookupQuery,
    retry: false,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: typeof podFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image or PDF`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit`,
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
        newFiles.push({ filename: file.name, data: base64, type: file.type });
      } catch {
        toast({
          title: "Processing failed",
          description: `Could not process ${file.name}`,
          variant: "destructive",
        });
      }
    }

    setPodFiles((prev) => [...prev, ...newFiles]);
    event.target.value = "";
  };

  const removePodFile = (index: number) => {
    setPodFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setUploadSuccess(null);
    setPodFiles([]);
    form.reset();
  };

  const handleLookup = () => {
    const trimmed = lookupNumber.trim();
    if (!trimmed) return;
    setLookupQuery(trimmed);
  };

  // Success state
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50 shadow-md">
          <h1 className="text-xl font-bold">Driver POD Upload</h1>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">POD Submitted!</h2>
              <p className="text-muted-foreground">
                Your proof of delivery for Load{" "}
                <span className="font-semibold text-foreground">#{uploadSuccess.loadNumber}</span>{" "}
                has been received and recorded.
              </p>
              <Button
                onClick={handleReset}
                className="w-full"
                size="lg"
                data-testid="button-submit-another"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Submit Another POD
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-bold">Driver POD Upload</h1>
        <p className="text-sm opacity-90">Proof of Delivery Portal</p>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 pt-6">
        {/* Upload form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Proof of Delivery</CardTitle>
            <CardDescription>
              Enter your details and attach a photo or document of the signed delivery receipt.
              No account required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => uploadMutation.mutate(values))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Your full name"
                            className="pl-10"
                            data-testid="input-driver-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loadNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Load Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="e.g. 10042"
                            className="pl-10"
                            data-testid="input-load-number"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="truckNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="e.g. T-101"
                            className="pl-10"
                            data-testid="input-truck-number"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File attachment area */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">POD Photos / Documents</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => cameraInputRef.current?.click()}
                      data-testid="button-take-photo"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-file"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </Button>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    data-testid="input-camera"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    data-testid="input-file"
                  />
                </div>

                {/* Attached files list */}
                {podFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {podFiles.length} file{podFiles.length !== 1 ? "s" : ""} attached
                    </p>
                    {podFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded-md"
                        data-testid={`pod-file-${index}`}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{file.filename}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePodFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={uploadMutation.isPending}
                  data-testid="button-submit-pod"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Submit POD
                      {podFiles.length > 0
                        ? ` (${podFiles.length} file${podFiles.length !== 1 ? "s" : ""})`
                        : ""}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* POD status lookup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Check Submission Status
            </CardTitle>
            <CardDescription>
              Enter a load number to see if PODs have been submitted for it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={lookupNumber}
                  onChange={(e) => {
                    setLookupNumber(e.target.value);
                    if (lookupQuery) setLookupQuery(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="e.g. 10042"
                  className="pl-10"
                  data-testid="input-lookup-number"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleLookup}
                disabled={isLookingUp || !lookupNumber.trim()}
                data-testid="button-lookup"
              >
                {isLookingUp ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {lookupError && (
              <p className="text-sm text-destructive" data-testid="text-lookup-error">
                {(lookupError as Error).message}
              </p>
            )}

            {podStatus && (
              <div className="space-y-2" data-testid="pod-status-result">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Load #{podStatus.loadNumber}</span>
                  <Badge variant={podStatus.podCount > 0 ? "default" : "secondary"}>
                    {podStatus.podCount > 0
                      ? `${podStatus.podCount} POD${podStatus.podCount !== 1 ? "s" : ""} submitted`
                      : "No PODs yet"}
                  </Badge>
                </div>

                {podStatus.submissions.length > 0 && (
                  <div className="space-y-1">
                    {podStatus.submissions.map((sub, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-sm"
                        data-testid={`submission-${i}`}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{sub.filename}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            {sub.uploadedAt
                              ? format(new Date(sub.uploadedAt), "MMM d, yyyy 'at' h:mm a")
                              : "Unknown time"}
                            {sub.uploadedBy && (
                              <span>· {sub.uploadedBy}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
