/**
 * Gmail Poller — checks Gmail every 5 minutes for unread emails
 * with PDF attachments and auto-creates loads in the TMS.
 * Searches ALL unread PDFs — Claude AI determines if it's a rate con.
 */

import { google } from "googleapis";
import { storage } from "./storage";
import { extractLoadFromDocument } from "./aiExtraction";

// Use the same redirect URI fallback as gmail.ts so the OAuth client is identical
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://readytms.com/api/gmail/oauth/callback";

function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/** Decode base64url encoded Gmail attachment data */
function decodeBase64Url(data: string): Buffer {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

/** Generate a unique load number */
function generateLoadNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `AUTO-${datePart}-${randPart}`;
}

/** Process a single Gmail message: download PDF, run Claude extraction, create load */
async function processMessage(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<{ success: boolean; loadNumber?: string; error?: string }> {
  try {
    const msgResp = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const msg = msgResp.data;
    const payload = msg.payload;
    if (!payload) return { success: false, error: "No payload in message" };

    const subjectHeader = payload.headers?.find(
      (h: any) => h.name?.toLowerCase() === "subject"
    );
    const subject = subjectHeader?.value || "(no subject)";
    console.log(`[GmailPoller] Processing email: "${subject}"`);

    const pdfParts: Array<{ partId: string; filename: string; attachmentId: string }> = [];

    const findPdfParts = (parts: typeof payload.parts): void => {
      if (!parts) return;
      for (const part of parts) {
        const mimeType = part.mimeType || "";
        if (
          (mimeType === "application/pdf" || part.filename?.toLowerCase().endsWith(".pdf")) &&
          part.body?.attachmentId
        ) {
          pdfParts.push({
            partId: part.partId || "",
            filename: part.filename || "attachment.pdf",
            attachmentId: part.body.attachmentId,
          });
        }
        if (part.parts) findPdfParts(part.parts);
      }
    };

    findPdfParts(payload.parts);

    if (pdfParts.length === 0) {
      return { success: false, error: "No PDF attachments found" };
    }

    const pdfPart = pdfParts[0];
    console.log(`[GmailPoller] Downloading PDF: ${pdfPart.filename}`);

    const attachResp = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: pdfPart.attachmentId,
    });

    const attachData = attachResp.data.data;
    if (!attachData) {
      return { success: false, error: "Empty attachment data" };
    }

    const pdfBuffer = decodeBase64Url(attachData);
    console.log(`[GmailPoller] PDF downloaded (${pdfBuffer.length} bytes), running Claude extraction`);

    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    const extracted = await extractLoadFromDocument(dataUrl, "application/pdf");

    if (!extracted.pickupLocation || !extracted.deliveryLocation) {
      console.log(`[GmailPoller] Not a rate con (no pickup/delivery): "${subject}"`);
      return { success: false, error: "Not a rate confirmation — no pickup/delivery data" };
    }

    const loadNumber = extracted.loadNumber || generateLoadNumber();
    const existing = await storage.getLoadByNumber(loadNumber);
    if (existing) {
      console.log(`[GmailPoller] Load ${loadNumber} already exists, skipping`);
      return { success: false, error: `Load ${loadNumber} already exists` };
    }

    const load = await storage.createLoad({
      loadNumber,
      status: "pending",
      pickupLocation: extracted.pickupLocation,
      pickupDate: extracted.pickupDate,
      deliveryLocation: extracted.deliveryLocation,
      deliveryDate: extracted.deliveryDate,
      rate: extracted.rate,
      weight: extracted.weight ?? undefined,
      commodity: extracted.commodity ?? undefined,
      source: "ai_extract",
      invoiceAttachment: dataUrl,
      // Set broker fields directly on the load so they show up in the
      // dedicated Broker column on the loads list page. Previously these
      // were stuffed into the notes field as plain text, which is why the
      // Broker column on the Loads page was always blank.
      brokerName: extracted.brokerName || undefined,
      brokerAddress: extracted.brokerAddress || undefined,
      brokerPhone: extracted.brokerPhone || undefined,
      brokerEmail: extracted.brokerEmail || undefined,
      notes: [
        extracted.notes,
        `Auto-imported from Gmail (${pdfPart.filename})`,
        `Email subject: ${subject}`,
      ]
        .filter(Boolean)
        .join("\n"),
    } as any);

    await storage.createNotification({
      type: "success",
      category: "gmail_auto_import",
      title: "Load Auto-Created from Gmail",
      message: `Load ${load.loadNumber} created from rate con email (${pdfPart.filename}). Pickup: ${extracted.pickupLocation}, Delivery: ${extracted.deliveryLocation}, Rate: $${extracted.rate}.`,
      relatedEntityType: "load",
      relatedEntityId: load.id,
      isRead: "false",
    });

    await storage.createActivityLog({
      action: "gmail_load_import",
      entityType: "load",
      entityId: load.id,
      details: `Auto-created load ${load.loadNumber} from Gmail attachment ${pdfPart.filename}`,
      metadata: {
        gmailMessageId: messageId,
        filename: pdfPart.filename,
        subject,
        brokerName: extracted.brokerName,
      },
      status: "success",
    });

    console.log(`[GmailPoller] Created load ${load.loadNumber} from "${subject}"`);
    return { success: true, loadNumber: load.loadNumber };
  } catch (err: any) {
    console.error(`[GmailPoller] Failed to process message ${messageId}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function pollGmail(): Promise<void> {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) {
    console.log("[GmailPoller] No Gmail tokens found — skipping poll");
    return;
  }

  const connectedEmail = settings.gmailEmail ?? "unknown";
  console.log(`[GmailPoller] Polling Gmail for ${connectedEmail}`);

  try {
    // Build OAuth client and set credentials — same pattern as gmail.ts sendViaGmail
    const auth = buildOAuth2Client();
    auth.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? undefined,
    });

    // Explicitly refresh the access token (same as gmail.ts)
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);

    // Persist the refreshed access token
    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : undefined,
      });
    }

    const gmail = google.gmail({ version: "v1", auth });

    // Search ALL unread emails with PDF attachments — Claude decides if it is a rate con
    const query = "is:unread has:attachment filename:pdf";

    const listResp = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 20 });
    const messages = listResp.data.messages || [];
    if (messages.length === 0) {
      console.log("[GmailPoller] No unread PDF emails found");
      return;
    }

    console.log(`[GmailPoller] Found ${messages.length} unread PDF email(s) to check`);

    for (const message of messages) {
      if (!message.id) continue;
      const result = await processMessage(gmail, message.id);
      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
      if (result.success) {
        console.log(`[GmailPoller] Load created: ${result.loadNumber}`);
      } else {
        console.log(`[GmailPoller] Skipped: ${result.error}`);
      }
    }
  } catch (err: any) {
    console.error("[GmailPoller] Poll error:", err.message);
    if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
      console.error("[GmailPoller] Token expired/revoked — clearing Gmail credentials");
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

export function startGmailPoller(): void {
  if (pollerInterval) return;
  console.log("[GmailPoller] Starting (5-minute interval)");
  pollGmail().catch((err) => console.error("[GmailPoller] Initial poll error:", err));
  pollerInterval = setInterval(() => {
    pollGmail().catch((err) => console.error("[GmailPoller] Poll error:", err));
  }, POLL_INTERVAL_MS);
}

export function stopGmailPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[GmailPoller] Stopped");
  }
}
