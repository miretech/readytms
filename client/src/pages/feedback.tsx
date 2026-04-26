import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Feedback } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, User, Upload, X, FileText, Image as ImageIcon, Download, Clock } from "lucide-react";
import { format } from "date-fns";

export default function FeedbackPage() {
  const { toast } = useToast();
  const [personName, setPersonName] = useState("");
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<{ fileName: string; fileData: string } | null>(null);
  const [nameError, setNameError] = useState("");
  const [noteError, setNoteError] = useState("");

  const { data: feedbacks = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedbacks"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/feedbacks", {
        personName,
        note,
        attachmentFileName: attachment?.fileName || null,
        attachmentFileData: attachment?.fileData || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedbacks"] });
      setPersonName("");
      setNote("");
      setAttachment(null);
      setNameError("");
      setNoteError("");
      toast({ title: "Feedback submitted", description: "Thank you for your feedback!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachment({ fileName: file.name, fileData: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
    },
  });

  const handleSubmit = () => {
    let hasError = false;
    if (!personName.trim()) { setNameError("Name is required"); hasError = true; } else setNameError("");
    if (!note.trim()) { setNoteError("Please share your feedback"); hasError = true; } else setNoteError("");
    if (hasError) return;
    submitMutation.mutate();
  };

  const ALLOWED_MIME = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "application/pdf",
  ];

  const isSafeDataUri = (uri: string): boolean => {
    const match = uri.match(/^data:([^;]+);base64,/);
    if (!match) return false;
    return ALLOWED_MIME.includes(match[1].toLowerCase());
  };

  const isImage = (fileName: string) =>
    /\.(png|jpg|jpeg|gif)$/i.test(fileName);

  const handleDownload = (fileData: string, fileName: string) => {
    if (!isSafeDataUri(fileData)) return;
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Feedback
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share your thoughts, suggestions, or concerns with us.
        </p>
      </div>

      {/* Submission form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              Your Name *
            </label>
            <Input
              placeholder="Enter your full name"
              value={personName}
              onChange={(e) => { setPersonName(e.target.value); if (nameError) setNameError(""); }}
              data-testid="input-person-name"
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Your Feedback *
            </label>
            <Textarea
              placeholder="Share your opinion, suggestion, or concern..."
              value={note}
              onChange={(e) => { setNote(e.target.value); if (noteError) setNoteError(""); }}
              rows={5}
              data-testid="textarea-feedback-note"
            />
            {noteError && <p className="text-xs text-destructive">{noteError}</p>}
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Attachment (Optional)
            </label>

            {attachment ? (
              <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                {isImage(attachment.fileName) ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{attachment.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttachment(null)}
                  data-testid="button-remove-attachment"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                data-testid="dropzone-attachment"
              >
                <input {...getInputProps()} data-testid="input-attachment-upload" />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop a file here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submitted feedback list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Submitted Feedback</h2>
          {feedbacks.length > 0 && (
            <Badge variant="outline">{feedbacks.length} total</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No feedback yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to submit feedback above</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <Card key={fb.id} data-testid={`card-feedback-${fb.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm" data-testid={`text-feedback-name-${fb.id}`}>
                        {fb.personName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(fb.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>

                  <Separator />

                  <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`text-feedback-note-${fb.id}`}>
                    {fb.note}
                  </p>

                  {fb.attachmentFileName && fb.attachmentFileData && isSafeDataUri(fb.attachmentFileData) && (
                    <div className="flex items-center gap-2 pt-1">
                      {isImage(fb.attachmentFileName) ? (
                        <div className="space-y-2">
                          <img
                            src={fb.attachmentFileData}
                            alt={fb.attachmentFileName}
                            className="max-h-40 rounded-md object-contain border"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(fb.attachmentFileData!, fb.attachmentFileName!)}
                            data-testid={`button-download-attachment-${fb.id}`}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            {fb.attachmentFileName}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(fb.attachmentFileData!, fb.attachmentFileName!)}
                          data-testid={`button-download-attachment-${fb.id}`}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          {fb.attachmentFileName}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
