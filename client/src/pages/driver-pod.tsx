import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Camera, Upload, MapPin, Package, CheckCircle2, FileText, X } from "lucide-react";
import type { Load } from "@shared/schema";

export default function DriverPOD() {
  const { toast } = useToast();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [podFiles, setPodFiles] = useState<Array<{ filename: string; data: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["/api/driver/loads"],
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

  if (isLoading) {
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
