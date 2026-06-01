const Anthropic = require("@anthropic-ai/sdk");
const { google } = require("googleapis");
const express = require("express");
const router = express.Router();
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
function getOAuth2Client() { return new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, process.env.GMAIL_REDIRECT_URI); }
function getGmail() { const auth = getOAuth2Client(); auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN }); return google.gmail({ version: "v1", auth }); }
router.get("/auth", (req, res) => { const auth = getOAuth2Client(); const url = auth.generateAuthUrl({ access_type: "offline", scope: ["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send","https://www.googleapis.com/auth/gmail.modify"], prompt: "consent" }); res.redirect(url); });
router.get("/callback", async (req, res) => { try { const auth = getOAuth2Client(); const { tokens } = await auth.getToken(req.query.code); res.json({ success: true, message: "Gmail connected! Add refresh_token to Replit Secrets as GMAIL_REFRESH_TOKEN", refresh_token: tokens.refresh_token }); } catch (e) { res.status(500).json({ error: e.message }); } });
const loads = [];
async function extractRateConData(emailBody, subject, from) {
  const response = await claude.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: "You are a freight data extraction AI for Ready Carrier LLC. Extract rate confirmation data. Return ONLY valid JSON. No markdown.", messages: [{ role: "user", content: "Extract load data from this rate con email.\nFROM: " + from + "\nSUBJECT: " + subject + "\nEMAIL:\n" + emailBody + "\n\nReturn JSON with: brokerName, brokerEmail, loadNumber, origin, destination, pickupDate, pickupTime, deliveryDate, commodity, weight, equipmentType, totalPay, rate, specialInstructions, shipperName, consigneeName" }] });
  try { const clean = response.content[0].text.replace(/```json|```/g, "").trim(); return { success: true, data: JSON.parse(clean) }; } catch { return { success: false, raw: response.content[0].text }; }
}
function createLoadInTMS(data, emailId) { const load = { id: "RC-" + Date.now(), emailId, status: "new", createdAt: new Date().toISOString(), source: "gmail_ratecon", ...data }; loads.push(load); return load; }
router.get("/health", async (req, res) => { try { const gmail = getGmail(); const profile = await gmail.users.getProfile({ userId: "me" }); res.json({ status: "Gmail connected", email: profile.data.emailAddress }); } catch (e) { res.json({ status: "Gmail not connected", error: e.message, fix: "Visit /gmail/auth" }); } });
router.get("/fetch-ratecons", async (req, res) => {
  try {
    const gmail = getGmail();
    const search = await gmail.users.messages.list({ userId: "me", q: "subject:(rate confirmation OR rate con OR load confirmation) is:unread", maxResults: 10 });
    if (!search.data.messages?.length) return res.json({ success: true, message: "No unread rate con emails found", loads: [] });
    const results = [];
    for (const msg of search.data.messages) {
      const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
      const headers = full.data.payload.headers;
      const subject = headers.find(h => h.name === "Subject")?.value || "";
      const from = headers.find(h => h.name === "From")?.value || "";
      const body = full.data.payload.body?.data ? Buffer.from(full.data.payload.body.data, "base64").toString() : "";
      const extracted = await extractRateConData(body.slice(0,4000), subject, from);
      if (extracted.success) { const load = createLoadInTMS(extracted.data, msg.id); results.push({ subject, load, status: "created" }); }
    }
    res.json({ success: true, processed: results.length, results });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
router.post("/extract-ratecon", async (req, res) => {
  try { const { emailBody, subject, from } = req.body; const result = await extractRateConData(emailBody, subject || "Rate Confirmation", from || "broker@example.com"); if (result.success) { const load = createLoadInTMS(result.data, "manual"); res.json({ success: true, extracted: result.data, load }); } else { res.status(422).json({ success: false, error: "Could not parse", raw: result.raw }); }
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
router.post("/send-ratecon", async (req, res) => {
  try {
    const d = req.body;
    const emailBody = await claude.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 800, system: "You are a dispatcher for Ready Carrier LLC. Write professional rate confirmation emails. Plain text only.", messages: [{ role: "user", content: "Write a rate confirmation email to: " + d.carrierName + "\nLoad: " + d.loadId + "\nRoute: " + d.origin + " to " + d.destination + "\nRate: $" + d.rate + "\nPickup: " + d.pickupDate + " " + d.pickupTime }] });
    const text = emailBody.content[0].text;
    const gmail = getGmail();
    const subject = "Rate Confirmation - Load " + d.loadId;
    const msg = ["To: " + d.carrierEmail, "Subject: " + subject, "Content-Type: text/plain; charset=utf-8", "", text].join("\n");
    const raw = Buffer.from(msg).toString("base64").replace(/\+/g,"-").replace(/\//g,"_");
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    res.json({ success: true, data: { sent: true, to: d.carrierEmail, subject, body: text } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
router.get("/loads", (req, res) => { res.json({ success: true, count: loads.length, loads }); });
module.exports = { router, extractRateConData };
