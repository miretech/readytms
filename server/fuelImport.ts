import Anthropic from "@anthropic-ai/sdk";

/**
 * Fuel report importer — Ready TMS.
 * Parses ANY fuel-card report (WEX/EFS "Cost Plus", Fleet One, Comdata, Pilot…)
 * — CSV/text OR PDF — into normalized rows. Captures the per-transaction WEX
 * discount so settlements can apply the owner-operator 50/50 discount split.
 * Matching rows → driver/truck happens in routes.ts (DB-aware).
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export interface ParsedFuelRow {
  transactionDate: string; // YYYY-MM-DD
  driverName: string | null;
  cardNumber: string | null; // full or last 4
  vendor: string; // TA, Flying J, Pilot, Love's, Speedway, Other
  location: string; // City, State
  gallons: number;
  pricePerGallon: number; // net price actually paid per gallon
  totalCost: number; // NET amount charged (after discount)
  discount: number; // WEX discount on this transaction (0 if none)
  fuelType: string; // Diesel, Gas, DEF
}

const FUEL_TOOL: Anthropic.Tool = {
  name: "extract_fuel_transactions",
  description:
    "Extract every fuel purchase row from a fuel-card transaction report (any provider/format), including the per-transaction discount.",
  input_schema: {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            transactionDate: { type: "string", description: "Purchase date in YYYY-MM-DD" },
            driverName: { anyOf: [{ type: "string" }, { type: "null" }], description: "Driver / card holder name if present" },
            cardNumber: { anyOf: [{ type: "string" }, { type: "null" }], description: "Card number or last 4 digits" },
            vendor: { type: "string", description: "Merchant/truck-stop brand, e.g. TA, Flying J, Pilot, Love's" },
            location: { type: "string", description: "City and state" },
            gallons: { type: "number", description: "Gallons purchased — the 'Qty' column." },
            pricePerGallon: { type: "number", description: "NET price per gallon actually paid. On a WEX 'Cost Plus' report this is 'Disc PPU' (discounted price/gal), NOT 'Unit Price' (retail). If no discount columns, use Unit Price." },
            totalCost: { type: "number", description: "NET dollar amount charged for the row = gallons × net price/gal. On a WEX 'Cost Plus' report this is the 'Amt' / 'Amt DB Currency' column (the rightmost dollar TOTAL, tens-to-hundreds of dollars), NOT 'Disc Cost' (a per-gallon number) and NOT the retail amount." },
            discount: { type: "number", description: "TOTAL discount DOLLARS for the row (retail total − net total). On a WEX 'Cost Plus' report use the 'Disc Amt' column (a dollar total, often tens of dollars), NOT 'Disc Cost' (which is the per-gallon discount). 0 if the report has no discount column." },
            fuelType: { type: "string", description: "Diesel, Gas, or DEF. ULSD = Diesel." },
          },
          required: [
            "transactionDate", "driverName", "cardNumber", "vendor",
            "location", "gallons", "pricePerGallon", "totalCost", "discount", "fuelType",
          ],
        },
      },
    },
    required: ["transactions"],
  },
};

const SYSTEM = `You parse trucking fuel-card transaction reports (WEX/EFS, Fleet One, Comdata, Pilot Flying J, etc.). Reports vary in column names and order. Extract EVERY fuel purchase line.
Critical rules:
- Dates → YYYY-MM-DD. Numbers without currency symbols or commas.
- WEX "Cost Plus" report columns (memorize these exactly):
    • "Unit Price" = RETAIL price per gallon — do NOT use it for cost.
    • "Disc PPU" = NET (discounted) price per gallon paid → pricePerGallon.
    • "Qty" = gallons → gallons.
    • "Amt" (a.k.a. "Amt DB Currency", the rightmost dollar total) = NET dollars charged → totalCost. (Sanity: Amt ≈ Disc PPU × Qty.)
    • "Disc Amt" = TOTAL discount DOLLARS for the row → discount. (Sanity: Disc Amt ≈ (Unit Price − Disc PPU) × Qty, usually tens of dollars.)
    • "Disc Cost" = the PER-GALLON discount (Unit Price − Disc PPU), a small number (~$1). NEVER use "Disc Cost" for totalCost OR discount.
- Retail-only report (only Unit Price + Qty + Amt, no Disc columns): discount = 0, totalCost = Amt (= Unit Price × Qty).
- pricePerGallon = the net price per gallon paid (Disc PPU if present, else Unit Price).
- Ignore summary/total/grand-total rows, fees-only lines, headers, and balance lines.
- vendor = truck-stop brand (e.g. "TA" for a "TA MANNING" location). location = city, state.`;

async function callClaude(userContent: Anthropic.MessageParam["content"]): Promise<ParsedFuelRow[]> {
  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    system: SYSTEM,
    tools: [FUEL_TOOL],
    tool_choice: { type: "tool", name: "extract_fuel_transactions" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = resp.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
  );
  if (!toolUse) return [];

  const out = (toolUse.input as { transactions?: ParsedFuelRow[] }).transactions ?? [];
  return out
    .map((r) => {
      const gallons = Number(r.gallons) || 0;
      let total = Number(r.totalCost) || 0;
      const ppg = Number(r.pricePerGallon) || (gallons ? total / gallons : 0);
      if (!total && gallons && ppg) total = gallons * ppg;
      return {
        transactionDate: String(r.transactionDate || "").slice(0, 10),
        driverName: r.driverName ?? null,
        cardNumber: r.cardNumber ? String(r.cardNumber) : null,
        vendor: r.vendor || "Other",
        location: r.location || "",
        gallons,
        pricePerGallon: ppg,
        totalCost: total,
        discount: Math.max(0, Number(r.discount) || 0),
        fuelType: r.fuelType || "Diesel",
      };
    })
    .filter((r) => r.transactionDate && r.totalCost > 0);
}

/** Parse a raw fuel report (CSV/TSV/pasted text) into normalized fuel rows. */
export async function parseFuelReport(rawText: string): Promise<ParsedFuelRow[]> {
  if (!rawText || rawText.trim().length === 0) return [];
  return callClaude(`Extract all fuel purchases from this report:\n\n${rawText.slice(0, 100000)}`);
}

/** Parse a fuel report PDF (base64, no data: prefix) using Claude's native PDF support. */
export async function parseFuelPdf(base64: string): Promise<ParsedFuelRow[]> {
  const data = base64.includes(",") ? base64.split(",")[1] : base64;
  if (!data) return [];
  return callClaude([
    { type: "text", text: "Extract all fuel purchases from this fuel-card report PDF:" },
    { type: "document", source: { type: "base64", media_type: "application/pdf", data } } as any,
  ]);
}
