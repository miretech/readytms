// ============================================================
// ReadyTMS x Claude AI — Full Automation Engine
// PASTE THIS AS: ai-automation.js (new file in Replit)
// ============================================================
const Anthropic = require("@anthropic-ai/sdk");
const express = require("express");
const router = express.Router();
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function ask(system, user) {
  const r = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  return r.content[0].text;
}

async function invoiceAndSettlement(d) {
  const gross = (d.miles * d.ratePerMile).toFixed(2);
  const driverPay = (gross * d.driverPayPercent).toFixed(2);
  const companyNet = (gross - driverPay).toFixed(2);
  const invoice = await ask(
    "You are a freight billing assistant for Ready Carrier LLC (USDOT 3440653, MC 1117901), St. Paul MN. Write professional invoice text. Plain text only, no markdown.",
    `Create a freight invoice:\nLoad ID: ${d.loadId}\nShipper: ${d.shipperName}\nOrigin: ${d.origin} -> Destination: ${d.destination}\nCommodity: ${d.commodity} | Weight: ${d.weight} lbs\nMiles: ${d.miles} | Rate: $${d.ratePerMile}/mile\nTotal Due: $${gross}\nDelivered: ${d.deliveredAt}\nPayment Terms: Net 30`
  );
  const settlement = await ask(
    "You are a payroll assistant for Ready Carrier LLC trucking. Write driver settlement sheets. Plain text only.",
    `Create a driver settlement sheet:\nDriver: ${d.driverName}\nLoad ID: ${d.loadId}\nRoute: ${d.origin} -> ${d.destination}\nMiles: ${d.miles}\nGross Revenue: $${gross}\nDriver Pay (${(d.driverPayPercent * 100).toFixed(0)}%): $${driverPay}\nDelivered: ${d.deliveredAt}`
  );
  return { loadId: d.loadId, gross, driverPay, companyNet, invoice, settlement };
}

async function autoQuote(d) {
  const RATES = { "Dry Van": 2.85, "Reefer": 3.25, "Flatbed": 3.10 };
  const FUEL = 0.45;
  const rpm = (RATES[d.equipmentType] || 2.85) + FUEL;
  const total = (d.estimatedMiles * rpm).toFixed(2);
  const floor = (total * 0.92).toFixed(2);
  const email = await ask(
    "You are a sales rep for Ready Carrier LLC / North East Express, St. Paul MN. Write confident, professional, brief quote emails. Plain text only.",
    `Write a freight quote email:\nTo: ${d.shipperName} <${d.shipperEmail}>\nRoute: ${d.origin} -> ${d.destination}\nCommodity: ${d.commodity} | Weight: ${d.weight} lbs\nEquipment: ${d.equipmentType} | Pickup: ${d.pickupDate}\nMiles: ${d.estimatedMiles}\nOur Quote: $${total} all-in\nSign off: Ready Carrier Dispatch | (651) XXX-XXXX`
  );
  return {
    shipperName: d.shipperName,
    shipperEmail: d.shipperEmail,
    route: `${d.origin} -> ${d.destination}`,
    ratePerMile: rpm.toFixed(2),
    totalQuote: total,
    minimumFloor: floor,
    emailDraft: email,
  };
}

async function assignDriver(load, drivers) {
  const list = drivers
    .map((d, i) => `${i + 1}. ${d.name} | Unit: ${d.truckUnit} | Location: ${d.currentLocation} | HOS: ${d.hoursAvailable}hrs`)
    .join("\n");
  const reply = await ask(
    `You are a dispatch AI for Ready Carrier LLC. Assign the best driver.\nRespond ONLY in this exact format:\nASSIGNED: [name]\nUNIT: [unit number]\nREASON: [1 sentence]\nETA: [hours to pickup]\nBACKUP: [name]`,
    `Assign a driver for:\nRoute: ${load.origin} -> ${load.destination}\nMiles: ${load.estimatedMiles} | Pickup: ${load.pickupDate} ${load.pickupTime}\n\nAvailable Drivers:\n${list}`
  );
  const get = (label) => reply.split("\n").find((l) => l.startsWith(label))?.replace(label, "").trim();
  return {
    assignedDriver: get("ASSIGNED:"),
    truckUnit: get("UNIT:"),
    reason: get("REASON:"),
    etaToPickup: get("ETA:"),
    backupDriver: get("BACKUP:"),
    load,
  };
}

async function extractBOL(bolText) {
  const raw = await ask(
    "You are a freight document parser. Extract BOL data precisely. Return ONLY valid JSON, no markdown, no explanation.",
    `Extract all fields from this Bill of Lading and return as JSON:\n\n${bolText}\n\nRequired JSON structure:\n{"bolNumber":"","proNumber":"","poNumber":"","referenceNumber":"","shipperName":"","shipperAddress":"","consigneeName":"","consigneeAddress":"","origin":"","destination":"","pickupDate":"","deliveryDate":"","commodity":"","weight":"","pieces":"","equipmentType":"","specialInstructions":""}`
  );
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return { status: "ok", data: JSON.parse(clean) };
  } catch {
    return { status: "parse_error", raw };
  }
}

router.post("/load-delivered", async (req, res) => {
  try {
    const result = await invoiceAndSettlement(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/quote-request", async (req, res) => {
  try {
    const result = await autoQuote(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/assign-driver", async (req, res) => {
  try {
    const { load, drivers } = req.body;
    const result = await assignDriver(load, drivers);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/bol-upload", async (req, res) => {
  try {
    const result = await extractBOL(req.body.bolText);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/health", (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    status: "ReadyTMS AI running",
    apiKey: key ? `set (${key.slice(0, 8)}...)` : "MISSING",
    model: "claude-sonnet-4-20250514",
    routes: [
      "POST /webhook/load-delivered",
      "POST /webhook/quote-request",
      "POST /webhook/assign-driver",
      "POST /webhook/bol-upload",
    ],
    time: new Date().toISOString(),
  });
});

module.exports = { router, invoiceAndSettlement, autoQuote, assignDriver, extractBOL };
