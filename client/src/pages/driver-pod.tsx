import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, Upload, CheckCircle2, FileText, X, Truck, Hash, User } from "lucide-react";

const infoSchema = z.object({
  driverName: z.string().min(1, "Name is required"),
  loadNumber: z.string().min(1, "Load number is required"),
  truckNumber: z.string().min(1, "Truck number is required"),
});

type InfoForm = z.infer<typeof infoSchema>;

export default function DriverPOD() {
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "upload" | "done">("info");
  const [driverInfo, setDriverInfo] = useState<InfoForm | null>(null);
  const [podFiles, setPodFiles] = useState<Array<{ filename: string; data: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: { driverName: "", loadNumber: "", truckNumber: "" },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!driverInfo) throw new Error("Missing driver info");
      if (podFiles.length === 0) throw new Error("Please add at least one photo or file");

      return await apiRequest("POST", "/api/public/pod-upload", {
        driverName: driverInfo.driverName,
        loadNumber: driverInfo.loadNumber,
        truckNumber: driverInfo.truckNumber,
        podAttachments: podFiles,
      });
    },
    onSuccess: () => {
      setStep("done");
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload POD. Please try again.",
        variant: "destructive",
      });
    },
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
        newFiles.push({ filename: file.name, data: base64, type: file.type });
      } catch {
        toast({
          title: "Upload failed",
          description: `Failed to process ${file.name}`,
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

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-primary text-primary-foreground p-4 shadow-md">
          <h1 className="text-xl font-bold">Driver POD Upload</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm w-full">
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">POD Submitted!</h2>
            <p className="text-muted-foreground">
              Your proof of delivery for load #{driverInfo?.loadNumber} has been submitted successfully.
            </p>
            <Button
              className="w-full h-12 text-base"
              onClick={() => {
                setStep("info");
                setDriverInfo(null);
                setPodFiles([]);
                form.reset();
              }}
            >
              Submit Another POD
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Upload POD</h1>
              <p className="text-sm opacity-90">Load #{driverInfo?.loadNumber}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("info");
                setPodFiles([]);
              }}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              Back
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{driverInfo?.driverName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Truck #{driverInfo?.truckNumber}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="h-16 text-base flex-col gap-1"
              size="lg"
            >
              <Camera className="h-6 w-6" />
              Take Photo
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-16 text-base flex-col gap-1"
              size="lg"
            >
              <Upload className="h-6 w-6" />
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
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {podFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base">Attached Files ({podFiles.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {podFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={file.data}
                          alt={file.filename}
                          className="h-10 w-10 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{file.filename}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePodFile(index)}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={podFiles.length === 0 || uploadMutation.isPending}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Submit POD{podFiles.length > 0 ? ` (${podFiles.length})` : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-xl font-bold">Driver POD Upload</h1>
        <p className="text-sm opacity-90">Proof of Delivery Portal</p>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Submit Proof of Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  setDriverInfo(values);
                  setStep("upload");
                })}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Your Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="John Smith"
                            className="pl-10 h-12 text-base"
                            autoComplete="name"
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
                      <FormLabel className="text-base">Load Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="e.g. 10042"
                            className="pl-10 h-12 text-base"
                            autoComplete="off"
                            inputMode="text"
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
                      <FormLabel className="text-base">Truck Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="e.g. T-101"
                            className="pl-10 h-12 text-base"
                            autoComplete="off"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-12 text-base mt-2">
                  Continue to Upload
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
