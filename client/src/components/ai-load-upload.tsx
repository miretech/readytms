import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

interface ExtractedLoad {
  loadNumber?: string;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string;
  rate: string;
  weight?: number;
  commodity?: string;
  notes?: string;
}

interface AILoadUploadProps {
  onExtracted: (data: ExtractedLoad) => void;
  onClose: () => void;
}

export function AILoadUpload({ onExtracted, onClose }: AILoadUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // File size validation: 5MB for PDFs/images (OpenAI Vision API limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is 5MB due to AI processing limits.`);
      return;
    }

    setFileName(file.name);
    setError(null);
    setUploading(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        setPreview(fileData);
        setUploading(false);
        setExtracting(true);

        try {
          const response = await apiRequest("POST", "/api/extract-load", {
            fileData,
            fileType: file.type,
          });
          
          const result = await response.json();
          setExtracting(false);
          onExtracted(result);
        } catch (err: any) {
          setExtracting(false);
          setError(err.message || "Failed to extract load data. Please try again.");
        }
      };

      reader.onerror = () => {
        setUploading(false);
        setError("Failed to read file. Please try again.");
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploading(false);
      setError(err.message || "Failed to process file");
    }
  }, [onExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: uploading || extracting,
  });

  const isImage = preview && (preview.startsWith("data:image/") || fileName?.match(/\.(png|jpg|jpeg|gif|webp)$/i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Upload Load Document</h3>
          <p className="text-sm text-muted-foreground">
            Drop a rate confirmation, BOL, or load tender. AI will extract the load details.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-upload">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!preview ? (
        <Card
          {...getRootProps()}
          className={`border-2 border-dashed p-12 text-center transition-colors hover-elevate ${
            isDragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
          data-testid="dropzone-upload"
        >
          <input {...getInputProps()} data-testid="input-file-upload" />
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                {uploading ? "Processing file..." : isDragActive ? "Drop file here" : "Drag & drop a document"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse (PNG, JPG, or GIF images up to 5MB)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Have a PDF? Convert it to PNG or JPG first (screenshot or "Export as Image")
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {isImage ? (
                  <Image className="h-6 w-6 text-primary" />
                ) : (
                  <FileText className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground" data-testid="text-filename">
                      {fileName}
                    </p>
                    {extracting && (
                      <div className="mt-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          AI is extracting load information...
                        </p>
                      </div>
                    )}
                    {!extracting && !error && (
                      <div className="mt-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <p className="text-sm text-success">Extraction complete!</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreview(null);
                      setFileName(null);
                      setError(null);
                    }}
                    disabled={extracting}
                    data-testid="button-remove-file"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {isImage && (
            <Card className="overflow-hidden p-2">
              <img
                src={preview}
                alt="Document preview"
                className="h-auto w-full rounded-md"
                data-testid="img-preview"
              />
            </Card>
          )}

          {error && (
            <Card className="border-destructive bg-destructive/5 p-4">
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
