import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image as ImageIcon, File, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileAttachment {
  filename: string;
  data: string;
  type: string;
  uploadedAt: string;
  label?: string;
}

interface MultiFileUploadProps {
  value: FileAttachment[];
  onChange: (files: FileAttachment[]) => void;
  accept?: string[];
  label: string;
  testId?: string;
}

export function MultiFileUpload({
  value = [],
  onChange,
  accept = [".pdf", ".png", ".jpg", ".jpeg"],
  label,
  testId,
}: MultiFileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    try {
      const newFiles: FileAttachment[] = [];

      for (const file of acceptedFiles) {
        // Convert file to base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newFiles.push({
          filename: file.name,
          data: base64String,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          label: "", // User can set this later
        });
      }

      onChange([...value, ...newFiles]);
      
      toast({
        title: "Files added",
        description: `${newFiles.length} file(s) added successfully.`,
      });
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, ext) => {
      if (ext === ".pdf") acc["application/pdf"] = [".pdf"];
      if (ext === ".png") acc["image/png"] = [".png"];
      if (ext === ".jpg" || ext === ".jpeg") acc["image/jpeg"] = [".jpg", ".jpeg"];
      return acc;
    }, {} as Record<string, string[]>),
    multiple: true,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const updateLabel = (index: number, label: string) => {
    const newFiles = [...value];
    newFiles[index] = { ...newFiles[index], label };
    onChange(newFiles);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="h-8 w-8" />;
    if (type.includes('pdf')) return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
        data-testid={testId}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Accepted formats: {accept.join(", ")}
        </p>
      </div>

      {/* File list */}
      {value.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{value.length} file(s) attached</p>
          {value.map((file, index) => {
            const isPdf = file.type?.includes('pdf');
            const isImage = file.type?.includes('image');

            return (
              <Card key={index} data-testid={`attachment-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="flex-shrink-0 w-16 h-16 bg-muted rounded flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={file.data}
                          alt={file.filename}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        getFileIcon(file.type)
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-sm font-medium truncate" title={file.filename}>
                          {file.filename}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.uploadedAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Label selector */}
                      <Select
                        value={file.label || ""}
                        onValueChange={(newLabel) => updateLabel(index, newLabel)}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-label-${index}`}>
                          <SelectValue placeholder="Select document type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rate Confirmation">Rate Confirmation</SelectItem>
                          <SelectItem value="BOL">Bill of Lading (BOL)</SelectItem>
                          <SelectItem value="Invoice">Invoice</SelectItem>
                          <SelectItem value="Receipt">Receipt</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
