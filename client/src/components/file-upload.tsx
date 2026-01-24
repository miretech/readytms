import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image as ImageIcon, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileData {
  filename: string;
  data: string; // base64 data URL
  type: string;
}

interface FileUploadProps {
  value?: string | null;
  onChange: (fileData: string | null) => void;
  accept?: string[];
  label: string;
  testId?: string;
}

// Parse the stored value - could be base64 JSON or legacy file path
function parseValue(value: string | null | undefined): FileData | null {
  if (!value) return null;
  
  // Check if it's a JSON string (new format)
  if (value.startsWith('{')) {
    try {
      return JSON.parse(value) as FileData;
    } catch {
      return null;
    }
  }
  
  // Check if it's a base64 data URL directly
  if (value.startsWith('data:')) {
    const mimeMatch = value.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    return {
      filename: 'file',
      data: value,
      type: mimeType
    };
  }
  
  // Legacy format: file path like /api/files/filename.pdf
  // Try to extract filename from path
  const filename = value.split('/').pop() || 'file';
  const ext = filename.split('.').pop()?.toLowerCase();
  let type = 'application/octet-stream';
  if (ext === 'pdf') type = 'application/pdf';
  if (ext === 'png') type = 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
  
  return {
    filename: filename.replace(/^\d+-/, ''), // Remove timestamp prefix
    data: value, // Keep the path for legacy files
    type
  };
}

export function FileUpload({ value, onChange, accept = [".pdf", ".png", ".jpg", ".jpeg"], label, testId }: FileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  const fileData = parseValue(value);
  const isLegacyPath = value && !value.startsWith('{') && !value.startsWith('data:');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = reader.result as string;
          
          // Store as JSON with filename, data, and type
          const fileDataObj: FileData = {
            filename: file.name,
            data: base64String,
            type: file.type
          };
          
          onChange(JSON.stringify(fileDataObj));
          toast({
            title: "File uploaded",
            description: `${file.name} has been uploaded successfully.`,
          });
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

  const handleRemove = () => {
    onChange(null);
  };

  const handleView = async () => {
    if (fileData) {
      // For legacy paths, check if file exists first, then open or show error
      if (isLegacyPath) {
        try {
          const response = await fetch(fileData.data, { method: 'HEAD' });
          if (response.ok) {
            window.open(fileData.data, '_blank');
          } else {
            toast({
              title: "File not available",
              description: "This file was uploaded before and is no longer available. Please re-upload the file.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "File not available", 
            description: "This file was uploaded before and is no longer available. Please re-upload the file.",
            variant: "destructive",
          });
        }
      } else {
        // For base64 data, open in a dialog viewer
        setViewerOpen(true);
      }
    }
  };

  const handleDownload = async () => {
    if (fileData) {
      // For legacy paths, check if file exists first
      if (isLegacyPath) {
        try {
          const response = await fetch(fileData.data);
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            toast({
              title: "File not available",
              description: "This file was uploaded before and is no longer available. Please re-upload the file.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "File not available",
            description: "This file was uploaded before and is no longer available. Please re-upload the file.",
            variant: "destructive",
          });
        }
      } else {
        // For base64 data, download directly
        const link = document.createElement('a');
        link.href = fileData.data;
        link.download = fileData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const getFileIcon = () => {
    if (!fileData) return null;
    if (fileData.type.includes('pdf')) return <FileText className="h-8 w-8 text-primary" />;
    return <ImageIcon className="h-8 w-8 text-primary" />;
  };

  const getFileName = () => {
    return fileData?.filename || 'Unknown file';
  };

  if (value && fileData) {
    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium">{label}</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{getFileName()}</p>
              <p className="text-xs text-muted-foreground">
                {isLegacyPath ? "Legacy file (may need re-upload)" : "Uploaded"}
              </p>
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
        
        {/* File Viewer Dialog */}
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{fileData.filename}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden" style={{ minHeight: '60vh' }}>
              {fileData.type.includes('image') ? (
                <img
                  src={fileData.data}
                  alt={fileData.filename}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : fileData.type.includes('pdf') ? (
                <iframe
                  src={fileData.data}
                  className="w-full h-[70vh]"
                  title={fileData.filename}
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Preview not available for this file type</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="secondary" onClick={() => setViewerOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
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
