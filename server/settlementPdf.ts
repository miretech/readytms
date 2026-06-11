import { jsPDF } from "jspdf";
import type {
  Settlement,
  SettlementLineItem,
  Driver,
  CompanySettings,
} from "@shared/schema";

interface SettlementPdfInputs {
  settlement: Settlement;
  lineItems: SettlementLineItem[];
  driver?: Driver | null;
  companySettings?: CompanySettings | null;
}

/**
 * Server-side driver settlement PDF. Intentionally simpler than the full
 * client editor — focused on what a driver needs to see at a glance:
 *  - period covered
 *  - loads with revenue & their pay share
 *  - deductions
 *  - net pay
 */
export function generateSettlementPdfBuffer(inputs: SettlementPdfInputs): Buffer {
  const { settlement, lineItems, driver, companySettings } = inputs;
  const pdf = new jsPDF();

  const brandBlue: [number, number, number] = [13, 59, 102];
  const blackText: [number, number, number] = [33, 37, 41];
  const grayText: [number, number, number] = [110, 110, 110];

  const companyName = companySettings?.companyName || "Ready Carrier LLC";
  const address = companySettings?.address || "";
  const cityStateZip = companySettings?.cityStateZip || "";
  const phone = companySettings?.phone || "";

  // Header
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text(companyName.toUpperCase(), 105, 18, { align: "center" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...grayText);
  if (address) pdf.text(address, 105, 24, { align: "center" });
  if (cityStateZip) pdf.text(cityStateZip, 105, 29, { align: "center" });
  if (phone) pdf.text(`Phone: ${phone}`, 105, 34, { align: "center" });

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...blackText);
  pdf.text("Driver Settlement", 105, 46, { align: "center" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Settlement #: ${settlement.settlementNumber}`, 20, 58);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 150, 58);

  pdf.text(`Driver: ${driver?.name || "—"}`, 20, 66);
  const periodStart = new Date(settlement.periodStart).toLocaleDateString();
  const periodEnd = new Date(settlement.periodEnd).toLocaleDateString();
  pdf.text(`Period: ${periodStart} – ${periodEnd}`, 20, 73);

  // Loads / revenue items
  let y = 88;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("LOAD REVENUE", 20, y);
  pdf.text("AMOUNT", 180, y, { align: "right" });
  pdf.setDrawColor(...brandBlue);
  pdf.setLineWidth(0.4);
  pdf.line(20, y + 1.5, 190, y + 1.5);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...blackText);
  const revenueItems = lineItems.filter((li) => li.itemType === "revenue");
  for (const item of revenueItems) {
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }
    const desc = (item.description || "").slice(0, 90);
    pdf.text(desc, 20, y);
    pdf.text(
      `$${Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      180,
      y,
      { align: "right" },
    );
    y += 6;
  }
  if (revenueItems.length === 0) {
    pdf.setTextColor(...grayText);
    pdf.text("No revenue items for this period.", 20, y);
    pdf.setTextColor(...blackText);
    y += 6;
  }

  // Deductions
  y += 6;
  if (y > 240) {
    pdf.addPage();
    y = 20;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("DEDUCTIONS", 20, y);
  pdf.text("AMOUNT", 180, y, { align: "right" });
  pdf.line(20, y + 1.5, 190, y + 1.5);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...blackText);
  const deductionItems = lineItems.filter((li) => li.itemType === "deduction");
  for (const item of deductionItems) {
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }
    const desc = (item.description || "").slice(0, 90);
    pdf.text(desc, 20, y);
    pdf.text(
      `$${Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      180,
      y,
      { align: "right" },
    );
    y += 6;
  }
  if (deductionItems.length === 0) {
    pdf.setTextColor(...grayText);
    pdf.text("No deductions for this period.", 20, y);
    pdf.setTextColor(...blackText);
    y += 6;
  }

  // Totals
  y += 10;
  if (y > 240) {
    pdf.addPage();
    y = 20;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...blackText);
  pdf.text("Total revenue:", 130, y);
  pdf.text(
    `$${Number(settlement.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    190,
    y,
    { align: "right" },
  );
  y += 7;
  pdf.text("Total deductions:", 130, y);
  pdf.text(
    `$${Number(settlement.deductions || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    190,
    y,
    { align: "right" },
  );
  y += 9;

  pdf.setFontSize(13);
  pdf.setTextColor(...brandBlue);
  pdf.text("NET PAY:", 130, y);
  pdf.text(
    `$${Number(settlement.netPay).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    190,
    y,
    { align: "right" },
  );

  return Buffer.from(pdf.output("arraybuffer"));
}
