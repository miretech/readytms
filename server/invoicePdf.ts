import { jsPDF } from "jspdf";
import type { Invoice, Load, Customer, CompanySettings } from "@shared/schema";

interface InvoicePdfInputs {
  invoice: Invoice;
  load?: Load | null;
  customer?: Customer | null;
  companySettings?: CompanySettings | null;
}

/**
 * Server-side invoice PDF generator. Mirrors the client format in
 * client/src/pages/accounting.tsx (downloadInvoicePDF) so brokers see the
 * same document whether dispatch downloads it manually or the system
 * emails it automatically on delivery.
 *
 * Returns the PDF as a Buffer so it can be attached to Resend emails.
 */
export function generateInvoicePdfBuffer(inputs: InvoicePdfInputs): Buffer {
  const { invoice, load, customer, companySettings } = inputs;
  const pdf = new jsPDF();

  const brandBlue: [number, number, number] = [13, 59, 102];
  const brandRed: [number, number, number] = [180, 40, 40];
  const blackText: [number, number, number] = [33, 37, 41];

  let yPos = 20;

  if (companySettings?.logoUrl) {
    try {
      pdf.addImage(companySettings.logoUrl, "PNG", 160, 10, 35, 35);
    } catch {
      // Logo unavailable / unsupported format — silently skip.
    }
  }

  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("INVOICE", 15, yPos);
  pdf.setDrawColor(...brandBlue);
  pdf.setLineWidth(0.8);
  pdf.line(15, yPos + 2, 62, yPos + 2);
  yPos += 15;

  const carrierName = invoice.carrierName || companySettings?.companyName || "Ready Carrier LLC";
  const carrierAddress =
    invoice.carrierAddress ||
    (companySettings ? `${companySettings.address || ""}, ${companySettings.cityStateZip || ""}` : "");

  pdf.setTextColor(...blackText);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(carrierName, 15, yPos);
  yPos += 6;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  if (carrierAddress) {
    const parts = carrierAddress.split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach((part) => {
      pdf.text(part.toUpperCase(), 15, yPos);
      yPos += 5;
    });
  }
  yPos += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("BILL TO", 15, yPos);
  pdf.setDrawColor(...brandBlue);
  pdf.setLineWidth(0.5);
  pdf.line(15, yPos + 1, 42, yPos + 1);

  pdf.text("INVOICE #", 130, yPos);
  pdf.setTextColor(...blackText);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.invoiceNumber, 175, yPos);

  yPos += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...blackText);
  if (customer) {
    pdf.text(customer.name, 15, yPos);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("INVOICE DATE", 130, yPos);
  pdf.setTextColor(...blackText);
  pdf.setFont("helvetica", "normal");
  pdf.text(new Date(invoice.invoiceDate).toLocaleDateString(), 175, yPos);

  yPos += 6;
  if (customer?.address) {
    pdf.text(customer.address, 15, yPos);
    yPos += 5;
  }

  const customerLocation = [customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ");
  if (customerLocation) {
    pdf.text(customerLocation, 15, yPos);
    yPos += 5;
  }

  yPos += 15;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("DESCRIPTION", 15, yPos);
  pdf.text("AMOUNT", 175, yPos);

  yPos += 3;
  pdf.setDrawColor(...brandRed);
  pdf.setLineWidth(0.8);
  pdf.line(15, yPos, 195, yPos);

  yPos += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...blackText);
  pdf.text(`LOAD NUMBER #${load?.loadNumber || "N/A"}`, 15, yPos);

  const total = Number(invoice.total);
  pdf.text(
    total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    175,
    yPos,
  );

  yPos += 25;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...brandBlue);
  pdf.text("TOTAL", 140, yPos);
  pdf.text(
    `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    175,
    yPos,
  );

  pdf.setTextColor(...blackText);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Terms & Conditions", 105, 250, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Thank you. Payment is due within 15 days", 105, 258, { align: "center" });

  const arrayBuffer = pdf.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
