import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image as ImageIcon, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  value?: string | null;
  onChange: (filePath: string | null) => void;
  accept?: string[];
  label: string;
  testId?: string;
}

export function FileUpload({ value, onChange, accept = [".pdf", ".png", ".jpg", ".jpeg"], label, testId }: FileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          
          // Upload file to backend
          const response = await apiRequest(
            "POST", 
            "/api/upload", 
            {
              file: base64String,
              filename: file.name
            }
          );

          const data = await response.json() as { success: boolean; filename: string; path: string };

          if (data.success) {
            onChange(data.path);
            toast({
              title: "File uploaded",
              description: `${file.name} has been uploaded successfully.`,
            });
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast({
            title: "Upload failed",
            description: "Failed to upload file. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: "Error reading file",
          description: "Failed to read the file. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File processing error:", error);
      setIsUploading(false);
    }
  }, [onChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, ext) => {
      if (ext === ".pdf") acc["application/pdf"] = [".pdf"];
      if (ext === ".png") acc["image/png"] = [".png"];
      if (ext === ".jpg" || ext === ".jpeg") acc["image/jpeg"] = [".jpg", ".jpeg"];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemove = async () => {
    if (value) {
      try {
        // Extract filename from path
        const filename = value.split('/').pop();
        if (filename) {
          await apiRequest("DELETE", `/api/files/${filename}`, {});
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
    onChange(null);
  };

  const handleView = () => {
    if (value) {
      window.open(value, '_blank');
    }
  };

  const handleDownload = () => {
    if (value) {
      const link = document.createElement('a');
      link.href = value;
      link.download = value.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = () => {
    if (!value) return null;
    const ext = value.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-8 w-8 text-primary" />;
    return <ImageIcon className="h-8 w-8 text-primary" />;
  };

  const getFileName = () => {
    if (!value) return null;
    const filename = value.split('/').pop() || '';
    // Remove timestamp prefix (e.g., "1234567890-filename.pdf" -> "filename.pdf")
    return filename.replace(/^\d+-/, '');
  };

  if (value) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getFileName()}</p>
            <p className="text-xs text-muted-foreground">Uploaded</p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleView}
              data-testid={`${testId}-view`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              data-testid={`${testId}-download`}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleRemove}
              data-testid={`${testId}-remove`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer
          ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
        data-testid={testId}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragActive ? "Drop file here" : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept.join(", ").toUpperCase()} files only
          </p>
        </div>
        {isUploading && (
          <p className="text-xs text-primary">Uploading...</p>
        )}
      </div>
    </div>
  );
}
