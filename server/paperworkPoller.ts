/**
 * Paperwork Poller — checks Gmail every 5 minutes for driver paperwork emails
 * (POD, BOL, delivery receipts, etc.) and auto-attaches them to matching loads.
 */

import { google } from "googleapis";
import { storage } from "./storage";
import { extractPaperworkDocument } from "./aiExtraction";
import { uploadBufferPaperworkToS3 } from "./s3";

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback";
const PAPERWORK_KEYWORDS = ["pod", "bol", "paperwork", "delivery receipt", "signed", "proof of delivery", "bill of lading"];

function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

function decodeBase64Url(data: string): Buffer {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function isPaperworkEmail(subject: string, body: string): boolean {
  const text = (subject + " " + body).toLowerCase();
  return PAPERWORK_KEYWORDS.some(kw => text.includes(kw));
}

async function matchLoadForDocument(extracted: {
  extractedLoadNumber?: string | null;
  extractedTruckNumber?: string | null;
  extractedDriverName?: string | null;
  extractedDeliveryDate?: string | null;
  extractedDeliveryLocation?: string | null;
}): Promise<{ loadId: string | null; confidence: number }> {
  const allLoads = await storage.getAllLoads();

  // 1. Match by load number (highest confidence)
  if (extracted.extractedLoadNumber) {
    const byNumber = allLoads.find(l =>
      l.loadNumber.toLowerCase().trim() === extracted.extractedLoadNumber!.toLowerCase().trim()
    );
    if (byNumber) return { loadId: byNumber.id, confidence: 0.95 };
  }

  // 2. Match by truck number + delivery date
  if (extracted.extractedTruckNumber && extracted.extractedDeliveryDate) {
    const allTrucks = await storage.getAllTrucks();
    const truck = allTrucks.find(t =>
      t.truckNumber?.toLowerCase() === extracted.extractedTruckNumber!.toLowerCase()
    );
    if (truck) {
      const delivDate = new Date(extracted.extractedDeliveryDate!);
      const byTruckDate = allLoads.find(l => {
        if (l.assignedTruckId !== truck.id) return false;
        const diff = Math.abs(new Date(l.deliveryDate).getTime() - delivDate.getTime());
        return diff < 86400000; // within 1 day
      });
      if (byTruckDate) return { loadId: byTruckDate.id, confidence: 0.8 };
    }
  }

  // 3. Match by driver name + delivery location
  if (extracted.extractedDriverName && extracted.extractedDeliveryLocation) {
    const allDrivers = await storage.getAllDrivers();
    const driver = allDrivers.find(d => {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      return fullName.includes(extracted.extractedDriverName!.toLowerCase()) ||
        extracted.extractedDriverName!.toLowerCase().includes(fullName);
    });
    if (driver) {
      const byDriver = allLoads.find(l =>
        l.assignedDriverId === driver.id &&
        l.deliveryLocation.toLowerCase().includes(
          extracted.extractedDeliveryLocation!.toLowerCase().split(",")[0]
        )
      );
      if (byDriver) return { loadId: byDriver.id, confidence: 0.7 };
    }
  }

  return { loadId: null, confidence: 0 };
}

function determineStatus(params: {
  confidence: number;
  loadId: string | null;
  extracted: any;
  load: any;
}): "received" | "needs_review" {
  const { confidence, loadId, extracted, load } = params;
  if (!loadId) return "needs_review";
  if (!extracted.extractedLoadNumber) return "needs_review";
  if (extracted.isSigned === false) return "needs_review";
  if (confidence < 0.75) return "needs_review";
  if (extracted.extractedDeliveryDate && load?.deliveryDate) {
    const diff = Math.abs(
      new Date(extracted.extractedDeliveryDate).getTime() -
      new Date(load.deliveryDate).getTime()
    );
    if (diff > 86400000 * 2) return "needs_review";
  }
  return "received";
}

async function processPaperworkMessage(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<void> {
  const msgResp = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = msgResp.data;
  const payload = msg.payload;
  if (!payload) return;

  const subjectHeader = payload.headers?.find((h: any) => h.name?.toLowerCase() === "subject");
  const subject = subjectHeader?.value || "";

  // Get body snippet for keyword matching
  const body = msg.snippet || "";

  if (!isPaperworkEmail(subject, body)) {
    console.log(`[PaperworkPoller] Skipping non-paperwork email: "${subject}"`);
    return;
  }

  // Collect all attachments (PDF + images)
  const attachments: Array<{ partId: string; filename: string; attachmentId: string; mimeType: string }> = [];
  const findAttachments = (parts: typeof payload.parts): void => {
    if (!parts) return;
    for (const part of parts) {
      const mime = part.mimeType || "";
      const filename = part.filename || "";
      if (part.body?.attachmentId && filename &&
        (mime.includes("pdf") || mime.startsWith("image/") || filename.toLowerCase().endsWith(".pdf"))) {
        attachments.push({
          partId: part.partId || "",
          filename,
          attachmentId: part.body.attachmentId,
          mimeType: mime || "application/pdf",
        });
      }
      if (part.parts) findAttachments(part.parts);
    }
  };
  findAttachments(payload.parts);

  if (attachments.length === 0) {
    console.log(`[PaperworkPoller] No PDF/image attachments in: "${subject}"`);
    return;
  }

  console.log(`[PaperworkPoller] Processing paperwork email: "${subject}" — ${attachments.length} attachment(s)`);

  for (const att of attachments) {
    // Check duplicate by emailMessageId + filename
    const existing = await storage.getLoadDocumentByEmailAndFile(messageId, att.filename);
    if (existing) {
      console.log(`[PaperworkPoller] Duplicate skipped: ${att.filename}`);
      continue;
    }

    const attachResp = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: att.attachmentId,
    });

    const rawData = attachResp.data.data;
    if (!rawData) continue;

    const fileBuffer = decodeBase64Url(rawData);
    // Build a temporary base64 data URL only for AI extraction — we don't store it in the DB
    const tempBase64DataUrl = `data:${att.mimeType};base64,${fileBuffer.toString("base64")}`;

    console.log(`[PaperworkPoller] Extracting data from ${att.filename} (${fileBuffer.length} bytes)`);

    let extracted: any = {};
    try {
      extracted = await extractPaperworkDocument(tempBase64DataUrl, att.mimeType);
    } catch (err: any) {
      console.error(`[PaperworkPoller] AI extraction failed for ${att.filename}:`, err.message);
      extracted = { confidenceScore: 0 };
    }

    // Upload to S3 and store the URL (not the raw base64)
    let fileUrl: string | undefined;
    try {
      fileUrl = await uploadBufferPaperworkToS3(fileBuffer, att.filename, att.mimeType);
      console.log(`[PaperworkPoller] Uploaded to S3: ${fileUrl}`);
    } catch (err: any) {
      console.error(`[PaperworkPoller] S3 upload failed for ${att.filename}:`, err.message);
      // Fall back to base64 storage if S3 fails
      fileUrl = tempBase64DataUrl;
    }

    const { loadId, confidence } = await matchLoadForDocument(extracted);
    const load = loadId ? await storage.getLoad(loadId) : null;

    const docStatus = determineStatus({ confidence, loadId, extracted, load });

    const doc = await storage.createLoadDocument({
      loadId: loadId ?? undefined,
      emailMessageId: messageId,
      fileName: att.filename,
      fileType: att.mimeType,
      fileData: fileUrl,
      documentType: extracted.documentType || "other",
      extractedLoadNumber: extracted.extractedLoadNumber || null,
      extractedDriverName: extracted.extractedDriverName || null,
      extractedTruckNumber: extracted.extractedTruckNumber || null,
      extractedPickupDate: extracted.extractedPickupDate || null,
      extractedDeliveryDate: extracted.extractedDeliveryDate || null,
      extractedPickupLocation: extracted.extractedPickupLocation || null,
      extractedDeliveryLocation: extracted.extractedDeliveryLocation || null,
      extractedShipper: extracted.extractedShipper || null,
      extractedReceiver: extracted.extractedReceiver || null,
      isSigned: extracted.isSigned ?? null,
      pageCount: extracted.pageCount ?? null,
      confidenceScore: String(extracted.confidenceScore ?? confidence),
      status: docStatus,
    });

    if (loadId && docStatus === "received") {
      await storage.updateLoad(loadId, {
        paperworkStatus: "received",
        paperworkReceivedAt: new Date().toISOString(),
      } as any);
      await storage.createActivityLog({
        action: "paperwork_received",
        entityType: "load",
        entityId: loadId,
        details: `Paperwork received via Gmail: ${att.filename}`,
        metadata: { documentId: doc.id, emailSubject: subject, confidence },
      });
      console.log(`[PaperworkPoller] Matched to load ${load?.loadNumber} — status: received`);
    } else if (docStatus === "needs_review") {
      if (loadId) {
        await storage.createActivityLog({
          action: "paperwork_needs_review",
          entityType: "load",
          entityId: loadId,
          details: `Paperwork needs review: ${att.filename} (confidence: ${confidence.toFixed(2)})`,
          metadata: { documentId: doc.id, emailSubject: subject },
        });
      }
      console.log(`[PaperworkPoller] Document needs review: ${att.filename}`);
    }
  }
}

async function pollGmailForPaperwork(): Promise<void> {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) return;

  try {
    const auth = buildOAuth2Client();
    auth.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? undefined,
    });

    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);

    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : undefined,
      });
    }

    const gmail = google.gmail({ version: "v1", auth });

    const subjectQuery = PAPERWORK_KEYWORDS.map(k => `subject:${k}`).join(" OR ");
    const query = `(${subjectQuery} OR has:attachment) is:unread newer_than:7d`;

    const listResp = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 30 });
    const messages = listResp.data.messages || [];

    if (messages.length === 0) {
      console.log("[PaperworkPoller] No new paperwork emails");
      return;
    }

    console.log(`[PaperworkPoller] Found ${messages.length} email(s) to check`);

    for (const message of messages) {
      if (!message.id) continue;
      try {
        await processPaperworkMessage(gmail, message.id);
        await gmail.users.messages.modify({
          userId: "me",
          id: message.id,
          requestBody: { removeLabelIds: ["UNREAD"] },
        });
      } catch (err: any) {
        console.error(`[PaperworkPoller] Error processing message ${message.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[PaperworkPoller] Poll error:", err.message);
    if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
      await storage.updateCompanySettings({
        gmailAccessToken: undefined,
        gmailRefreshToken: undefined,
        gmailEmail: undefined,
        gmailTokenExpiry: undefined,
      });
    }
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;
let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startPaperworkPoller(): void {
  if (pollerInterval) return;
  console.log("[PaperworkPoller] Starting (5-minute interval)");
  pollGmailForPaperwork().catch(err => console.error("[PaperworkPoller] Initial poll error:", err));
  pollerInterval = setInterval(() => {
    pollGmailForPaperwork().catch(err => console.error("[PaperworkPoller] Poll error:", err));
  }, POLL_INTERVAL_MS);
}

export function stopPaperworkPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}
