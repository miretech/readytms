import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Settlement, Driver, SettlementLineItem, SettlementDeduction } from "@shared/schema";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export async function generateSettlementPDF(
  settlement: Settlement,
  driver: Driver | undefined,
  lineItems: SettlementLineItem[],
  deductions: SettlementDeduction[]
): Promise<void> {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(settlement.settlementNumber, pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(driver?.name || "Unknown Driver", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 15;

    // Settlement Summary Section
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Settlement Summary", 14, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    const summaryData = [
      ["Period Start:", new Date(settlement.periodStart).toLocaleDateString()],
      ["Period End:", new Date(settlement.periodEnd).toLocaleDateString()],
      ["Total Miles:", settlement.totalMiles?.toLocaleString() || "-"],
      ["Payment Method:", settlement.paymentMethod || "Not specified"],
      ["Status:", settlement.status],
    ];

    summaryData.forEach(([label, value]) => {
      pdf.text(label, 14, yPos);
      pdf.text(value, 80, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Line Items Section
    if (lineItems.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Loads", 14, yPos);
      yPos += 5;

      const lineItemsTableData = lineItems.map((item) => [
        item.description,
        item.companyName || "-",
        item.quantity ? parseFloat(item.quantity).toLocaleString() : "-",
        item.rate ? `$${parseFloat(item.rate).toFixed(2)}` : "-",
        `$${parseFloat(item.amount.toString()).toFixed(2)}`,
        `$${parseFloat(item.factoredAmount?.toString() || "0").toFixed(2)}`,
      ]);

      const totalAmount = lineItems.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
      const totalFactored = lineItems.reduce((sum, item) => sum + parseFloat(item.factoredAmount?.toString() || "0"), 0);

      pdf.autoTable({
        startY: yPos,
        head: [["Description", "Company", "Quantity", "Rate", "Amount", "Factored"]],
        body: lineItemsTableData,
        foot: [["", "", "", "Total:", `$${totalAmount.toFixed(2)}`, `$${totalFactored.toFixed(2)}`]],
        theme: "striped",
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
        styles: { fontSize: 9 },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
        },
      });

      yPos = pdf.lastAutoTable?.finalY || yPos + 10;
      yPos += 10;
    }

    // Deductions Section
    if (deductions.length > 0) {
      // Check if we need a new page
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Deductions", 14, yPos);
      yPos += 5;

      const deductionsTableData = deductions.map((deduction) => {
        const periodText = deduction.periodStart && deduction.periodEnd
          ? `${new Date(deduction.periodStart).toLocaleDateString()} - ${new Date(deduction.periodEnd).toLocaleDateString()}`
          : "-";

        return [
          deduction.category.replace(/_/g, " "),
          deduction.description || "-",
          periodText,
          `$${parseFloat(deduction.amount.toString()).toFixed(2)}`,
        ];
      });

      const totalDeductions = deductions.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);

      pdf.autoTable({
        startY: yPos,
        head: [["Category", "Description", "Period", "Amount"]],
        body: deductionsTableData,
        foot: [["", "", "Total Deductions:", `$${totalDeductions.toFixed(2)}`]],
        theme: "striped",
        headStyles: { fillColor: [220, 53, 69], textColor: 255 },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
        styles: { fontSize: 9 },
        columnStyles: {
          3: { halign: "right" },
        },
      });

      yPos = pdf.lastAutoTable?.finalY || yPos + 10;
      yPos += 10;
    }

    // Financial Summary Section
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Financial Summary", 14, yPos);
    yPos += 8;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");

    const financialSummary = [
      ["Total Revenue:", `$${parseFloat(settlement.totalRevenue.toString()).toFixed(2)}`],
    ];

    if (settlement.factoringPercentage) {
      const factoringFee = (parseFloat(settlement.totalRevenue.toString()) * parseFloat(settlement.factoringPercentage)) / 100;
      financialSummary.push([
        `Factoring Fee (${settlement.factoringPercentage}%):`,
        `-$${factoringFee.toFixed(2)}`,
      ]);
      financialSummary.push([
        "Revenue After Factoring:",
        `$${parseFloat(settlement.revenueAfterFactoring?.toString() || "0").toFixed(2)}`,
      ]);
    }

    financialSummary.push(
      ["Driver Pay:", `$${parseFloat(settlement.driverPay.toString()).toFixed(2)}`],
      ["Total Deductions:", `-$${parseFloat(settlement.totalDeductions?.toString() || "0").toFixed(2)}`]
    );

    financialSummary.forEach(([label, value]) => {
      pdf.text(label, 14, yPos);
      pdf.text(value, pageWidth - 14, yPos, { align: "right" });
      yPos += 7;
    });

    yPos += 5;
    pdf.setLineWidth(0.5);
    pdf.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Net Pay:", 14, yPos);
    pdf.text(`$${parseFloat(settlement.netPay.toString()).toFixed(2)}`, pageWidth - 14, yPos, { align: "right" });

    if (settlement.paidDate) {
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text(`Paid on ${new Date(settlement.paidDate).toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });
    }

    // Footer with generation date
    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 14,
        pdf.internal.pageSize.getHeight() - 10,
        { align: "right" }
      );
    }

    // Download the PDF
    pdf.save(`${settlement.settlementNumber}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
