import { google } from 'googleapis';
import { storage } from './storage';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://readytms.com/api/gmail/oauth/callback';

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getGmailAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
}

export async function exchangeCodeAndSave(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2Api.userinfo.get();

  await storage.updateCompanySettings({
    gmailAccessToken: tokens.access_token ?? undefined,
    gmailRefreshToken: tokens.refresh_token ?? undefined,
    gmailEmail: data.email ?? undefined,
    gmailTokenExpiry: tokens.expiry_date ? String(tokens.expiry_date) : undefined,
  });
}

export async function getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
  const settings = await storage.getCompanySettings();
  if (!settings?.gmailRefreshToken) return { connected: false };
  return { connected: true, email: settings.gmailEmail ?? undefined };
}

export async function clearGmailTokens(): Promise<void> {
  const settings = await storage.getCompanySettings();
  if (!settings) return;
  const { db } = await import('./db');
  const { companySettings } = await import('@shared/schema');
  const { eq, sql: drizzleSql } = await import('drizzle-orm');
  await db.execute(drizzleSql`
    UPDATE company_settings
    SET gmail_access_token = NULL,
        gmail_refresh_token = NULL,
        gmail_email = NULL,
        gmail_token_expiry = NULL
    WHERE id = ${settings.id}
  `);
}

function buildRFC2822(opts: {
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer | string; type?: string }>;
}): string {
  const boundary = `----_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc?.length) lines.push(`Cc: ${opts.cc.join(', ')}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push('MIME-Version: 1.0');

  if (opts.attachments?.length) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('');
    lines.push(opts.html);

    for (const att of opts.attachments) {
      const b64 = Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(att.content as string, 'base64').toString('base64');
      const chunks = b64.match(/.{1,76}/g) ?? [];
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.type || 'application/octet-stream'}; name="${att.filename}"`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push('');
      lines.push(...chunks);
    }
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('');
    lines.push(opts.html);
  }

  return lines.join('\r\n');
}

interface GmailSendOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer | string; type?: string }>;
}

export async function sendViaGmail(opts: GmailSendOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getCompanySettings();
    if (!settings?.gmailRefreshToken) {
      return { success: false, error: 'Gmail not connected' };
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: settings.gmailRefreshToken,
      access_token: settings.gmailAccessToken ?? undefined,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    if (credentials.access_token) {
      await storage.updateCompanySettings({
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? String(credentials.expiry_date) : undefined,
      });
    }

    const from = settings.gmailEmail ?? 'me';
    const raw = buildRFC2822({ from, ...opts });
    const encoded = Buffer.from(raw).toString('base64url');

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });

    return { success: true };
  } catch (err: any) {
    console.error('[Gmail] Send error:', err?.message ?? err);
    return { success: false, error: err?.message ?? 'Failed to send via Gmail' };
  }
}
