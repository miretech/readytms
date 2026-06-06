import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Upload, Check, X, Eye, Download, AlertTriangle,
  Clock, CheckCircle2, XCircle, Search, RefreshCw, Bot, Pen
} from "lucide-react";
import type { LoadDocument } from "@shared/schema";

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "received":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" />Received</Badge>;
    case "needs_review":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Needs Review</Badge>;
    case "approved":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function docTypeBadge(type: string) {
  const labels: Record<string, string> = {
    pod: "POD",
    bol: "BOL",
    rate_confirmation: "Rate Con",
    lumper: "Lumper",
    other: "Other",
  };
  return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
}

function confidenceColor(score: number | null) {
  if (!score) return "text-muted-foreground";
  if (score >= 0.85) return "text-green-600 dark:text-green-400";
  if (score >= 0.65) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

// ── Document Card ──────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onView,
  onApprove,
  onReject,
}: {
  doc: LoadDocument;
  onView: (doc: LoadDocument) => void;
  onApprove: (doc: LoadDocument) => void;
  onReject: (doc: LoadDocument) => void;
}) {
  const confidence = doc.confidenceScore ? parseFloat(doc.confidenceScore) : null;

  return (
    <Card className="flex flex-col gap-0" data-testid={`card-document-${doc.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate max-w-[200px]" title={doc.fileName}>
              {doc.fileName}
            </span>
            {docTypeBadge(doc.documentType)}
            {statusBadge(doc.status)}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(doc.createdAt).toLocaleString()}
            {doc.emailMessageId && <span className="ml-2 text-blue-500">via Gmail</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onView(doc)} data-testid={`button-view-${doc.id}`}>
            <Eye className="w-4 h-4" />
          </Button>
          {doc.fileData && (
            <a
              href={doc.fileData}
              download={doc.fileName}
              data-testid={`button-download-${doc.id}`}
            >
              <Button size="icon" variant="ghost"><Download className="w-4 h-4" /></Button>
            </a>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pt-0">
        {/* Extracted AI fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {doc.extractedLoadNumber && (
            <div><span className="text-muted-foreground">Load #:</span>{" "}
              <span className="font-medium">{doc.extractedLoadNumber}</span></div>
          )}
          {doc.extractedDriverName && (
            <div><span className="text-muted-foreground">Driver:</span>{" "}
              <span className="font-medium">{doc.extractedDriverName}</span></div>
          )}
          {doc.extractedTruckNumber && (
            <div><span className="text-muted-foreground">Truck:</span>{" "}
              <span className="font-medium">{doc.extractedTruckNumber}</span></div>
          )}
          {doc.extractedDeliveryDate && (
            <div><span className="text-muted-foreground">Del. Date:</span>{" "}
              <span className="font-medium">{doc.extractedDeliveryDate}</span></div>
          )}
          {doc.extractedPickupLocation && (
            <div><span className="text-muted-foreground">From:</span>{" "}
              <span className="font-medium">{doc.extractedPickupLocation}</span></div>
          )}
          {doc.extractedDeliveryLocation && (
            <div><span className="text-muted-foreground">To:</span>{" "}
              <span className="font-medium">{doc.extractedDeliveryLocation}</span></div>
          )}
          {doc.extractedShipper && (
            <div><span className="text-muted-foreground">Shipper:</span>{" "}
              <span className="font-medium">{doc.extractedShipper}</span></div>
          )}
          {doc.extractedReceiver && (
            <div><span className="text-muted-foreground">Receiver:</span>{" "}
              <span className="font-medium">{doc.extractedReceiver}</span></div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {doc.isSigned !== null && (
            <span className={doc.isSigned ? "text-green-600 dark:text-green-400 flex items-center gap-1" : "text-red-500 flex items-center gap-1"}>
              <Pen className="w-3 h-3" />
              {doc.isSigned ? "Signed" : "Unsigned"}
            </span>
          )}
          {doc.pageCount && <span>{doc.pageCount}p</span>}
          {confidence !== null && (
            <span className={`flex items-center gap-1 ${confidenceColor(confidence)}`}>
              <Bot className="w-3 h-3" />
              AI {Math.round(confidence * 100)}%
            </span>
          )}
          {doc.rejectionReason && (
            <span className="text-red-500 italic">"{doc.rejectionReason}"</span>
          )}
        </div>

        {/* Action buttons */}
        {doc.status !== "approved" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-green-500 text-green-600 hover:text-green-700 dark:border-green-600 dark:text-green-400"
              onClick={() => onApprove(doc)}
              data-testid={`button-approve-${doc.id}`}
            >
              <Check className="w-3 h-3 mr-1" />Approve
            </Button>
            {doc.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:text-red-700 dark:border-red-600 dark:text-red-400"
                onClick={() => onReject(doc)}
                data-testid={`button-reject-${doc.id}`}
              >
                <X className="w-3 h-3 mr-1" />Reject
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────────

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loadNumber, setLoadNumber] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/load-documents", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/load-documents"] });
      toast({ title: "Document uploaded", description: "AI extraction complete." });
      onClose();
      setFile(null);
      setLoadNumber("");
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  async function handleSubmit() {
    if (!file) return toast({ title: "Select a file first", variant: "destructive" });
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        let resolvedLoadId: string | undefined;
        if (loadNumber.trim()) {
          const res = await fetch(`/api/loads?search=${encodeURIComponent(loadNumber.trim())}`).then(r => r.json()).catch(() => []);
          const matched = Array.isArray(res) ? res.find((l: any) => l.loadNumber === loadNumber.trim()) : null;
          if (matched) resolvedLoadId = matched.id;
        }
        upload.mutate({
          loadId: resolvedLoadId,
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileData: reader.result as string,
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Paperwork</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <Label>Load Number (optional)</Label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. 1234"
              value={loadNumber}
              onChange={e => setLoadNumber(e.target.value)}
              data-testid="input-load-number"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank — AI will try to detect it from the document</p>
          </div>
          <div>
            <Label>Document (PDF or Image)</Label>
            <div
              className="mt-1 border-2 border-dashed border-input rounded-md p-6 text-center cursor-pointer hover-elevate"
              onClick={() => fileRef.current?.click()}
              data-testid="div-file-drop"
            >
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm">Click to select a PDF or image</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
              data-testid="input-file"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={uploading || upload.isPending} data-testid="button-upload-submit">
              {uploading || upload.isPending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Extracting…</> : <><Upload className="w-4 h-4 mr-2" />Upload & Extract</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────────────

function RejectModal({
  doc,
  onClose,
}: {
  doc: LoadDocument | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");

  const reject = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/load-documents/${doc!.id}`, {
        status: "rejected",
        rejectionReason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/load-documents"] });
      toast({ title: "Document rejected" });
      onClose();
      setReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!doc} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <Label>Rejection Reason</Label>
            <Textarea
              className="mt-1"
              placeholder="e.g. POD is unsigned, wrong load number…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              data-testid="input-rejection-reason"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
              data-testid="button-confirm-reject"
            >
              {reject.isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── View Modal ─────────────────────────────────────────────────────────────────

function ViewModal({ doc, onClose }: { doc: LoadDocument | null; onClose: () => void }) {
  if (!doc) return null;
  const isImage = doc.fileType.startsWith("image/");
  const isPdf = doc.fileType === "application/pdf";

  return (
    <Dialog open={!!doc} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {doc.fileName}
            {docTypeBadge(doc.documentType)}
            {statusBadge(doc.status)}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {doc.fileData && isPdf && (
            <iframe
              src={doc.fileData}
              title={doc.fileName}
              className="w-full"
              style={{ height: "60vh" }}
              data-testid="iframe-document"
            />
          )}
          {doc.fileData && isImage && (
            <img src={doc.fileData} alt={doc.fileName} className="max-w-full mx-auto" data-testid="img-document" />
          )}
          {!doc.fileData && (
            <p className="text-center text-muted-foreground py-8">File data not available for preview</p>
          )}
        </div>
        {doc.fileData && (
          <a href={doc.fileData} download={doc.fileName} className="self-end mt-2">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Download</Button>
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Loads with missing paperwork ───────────────────────────────────────────────

function MissingPaperworkTab() {
  const { data: loads = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/loads"],
  });

  const missingLoads = loads.filter(
    l => !l.paperworkStatus || l.paperworkStatus === "missing"
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading loads…</div>;
  }

  if (missingLoads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <p className="text-sm">All loads have paperwork — great job!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {missingLoads.map(load => (
        <Card key={load.id} data-testid={`card-missing-load-${load.id}`}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">Load #{load.loadNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {load.deliveryLocation}
                </p>
                {load.deliveryDate && (
                  <p className="text-xs text-muted-foreground">
                    Del: {new Date(load.deliveryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 shrink-0">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Missing
              </Badge>
            </div>
            {load.status && (
              <p className="text-xs text-muted-foreground mt-2">Status: {load.status}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Paperwork() {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<LoadDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<LoadDocument | null>(null);

  const { data: allDocs = [], isLoading, refetch } = useQuery<LoadDocument[]>({
    queryKey: ["/api/load-documents"],
  });

  const approve = useMutation({
    mutationFn: (doc: LoadDocument) =>
      apiRequest("PATCH", `/api/load-documents/${doc.id}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/load-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({ title: "Document approved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const received = allDocs.filter(d => d.status === "received");
  const needsReview = allDocs.filter(d => d.status === "needs_review");
  const approved = allDocs.filter(d => d.status === "approved");
  const rejected = allDocs.filter(d => d.status === "rejected");

  function renderDocGrid(docs: LoadDocument[]) {
    if (docs.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FileText className="w-10 h-10" />
          <p className="text-sm">No documents in this category</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onView={setViewDoc}
            onApprove={d => approve.mutate(d)}
            onReject={setRejectDoc}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Paperwork</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Driver PODs, BOLs, and delivery documents — auto-received via Gmail + manual uploads
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            data-testid="button-upload"
          >
            <Upload className="w-4 h-4 mr-2" />Upload Document
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Needs Review", count: needsReview.length, color: "text-yellow-600 dark:text-yellow-400", icon: <AlertTriangle className="w-5 h-5" /> },
          { label: "Received", count: received.length, color: "text-blue-600 dark:text-blue-400", icon: <Clock className="w-5 h-5" /> },
          { label: "Approved", count: approved.length, color: "text-green-600 dark:text-green-400", icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: "Rejected", count: rejected.length, color: "text-red-600 dark:text-red-400", icon: <XCircle className="w-5 h-5" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <span className={stat.color}>{stat.icon}</span>
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="needs_review">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="missing" data-testid="tab-missing">
            Missing
          </TabsTrigger>
          <TabsTrigger value="needs_review" data-testid="tab-needs-review">
            Needs Review
            {needsReview.length > 0 && (
              <Badge className="ml-1 bg-yellow-500 text-white text-xs px-1.5">{needsReview.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" data-testid="tab-received">
            Received
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="mt-4">
          <MissingPaperworkTab />
        </TabsContent>

        <TabsContent value="needs_review" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading documents…</div>
          ) : renderDocGrid(needsReview)}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading documents…</div>
          ) : renderDocGrid(received)}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading documents…</div>
          ) : renderDocGrid(approved)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading documents…</div>
          ) : renderDocGrid(rejected)}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />
      <RejectModal doc={rejectDoc} onClose={() => setRejectDoc(null)} />
    </div>
  );
}
