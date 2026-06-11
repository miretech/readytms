import { storage } from "./storage";
import type { Load, Driver, Invoice, Customer } from "@shared/schema";
import { differenceInDays, format } from "date-fns";
import { sendEmail, sendSMS } from "./notifications";
import { generateInvoicePdfBuffer } from "./invoicePdf";

/**
 * Automation Engine for Ready TMS
 * Handles automated workflows like auto-invoicing, notifications, and alerts
 */

// Pick the best email address to send an invoice to. Prefers the customer
// record's email (curated by dispatch), falls back to the broker email
// captured on the load itself by the AI extraction.
function pickInvoiceRecipientEmail(load: Load, customer?: Customer | null): string | null {
  const customerEmail = customer?.email?.trim();
  if (customerEmail) return customerEmail;
  const brokerEmail = (load as any).brokerEmail?.trim();
  if (brokerEmail) return brokerEmail;
  return null;
}

// Build & send the invoice email with PDF attachment. Returns success flag.
export async function sendInvoiceEmail(
  invoice: Invoice,
  load: Load,
  customer: Customer | null,
): Promise<{ sent: boolean; reason?: string; to?: string }> {
  const to = pickInvoiceRecipientEmail(load, customer);
  if (!to) {
    return { sent: false, reason: "no broker/customer email on file" };
  }

  let pdfBuffer: Buffer;
  try {
    const companySettings = await storage.getCompanySettings();
    pdfBuffer = generateInvoicePdfBuffer({
      invoice,
      load,
      customer,
      companySettings: companySettings || null,
    });
  } catch (err: any) {
    return { sent: false, reason: `PDF generation failed: ${err?.message || String(err)}` };
  }

  const total = Number(invoice.total);
  const dueDate = format(new Date(invoice.dueDate), "MMM d, yyyy");
  const carrierName = invoice.carrierName || "Ready Carrier LLC";
  const subject = `Invoice ${invoice.invoiceNumber} — Load ${load.loadNumber}`;
  const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #222; max-width: 600px;">
      <p>Hello${customer?.contactPerson ? ` ${customer.contactPerson}` : ""},</p>
      <p>Please find attached our invoice for load <strong>${load.loadNumber}</strong>
      (${load.pickupLocation} → ${load.deliveryLocation}).</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Invoice #</td><td><strong>${invoice.invoiceNumber}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Amount due</td><td><strong>$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #555;">Due date</td><td>${dueDate}</td></tr>
      </table>
      <p>Please remit payment within the terms shown on the invoice. Reply to this email if you have any questions.</p>
      <p>Thank you,<br/>${carrierName}</p>
    </div>
  `;

  const result = await sendEmail({
    to,
    subject,
    html,
    attachments: [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (!result.success) {
    return { sent: false, reason: result.error || "sendEmail failed", to };
  }
  return { sent: true, to };
}

// Auto-generate invoice when load is delivered
export async function autoGenerateInvoice(load: Load) {
  try {
    // Check if automation is enabled
    const setting = await storage.getAutomationSetting("auto_invoice_on_delivery");
    if (setting && setting.enabled === "false") {
      return null;
    }

    // Check if invoice already exists for this load (optimized)
    const existingInvoices = await storage.getAllInvoices();
    const invoiceExists = existingInvoices.some(inv => inv.loadId === load.id); // TODO: Add getInvoicesByLoad method for optimization
    
    if (invoiceExists) {
      console.log(`Invoice already exists for load ${load.loadNumber}`);
      return null;
    }

    // Generate invoice number
    const today = new Date();
    const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Calculate invoice details
    const subtotal = parseFloat(load.rate.toString());
    const tax = subtotal * 0.0; // No tax by default, can be configured
    const total = subtotal + tax;

    // Create the invoice
    const invoice = await storage.createInvoice({
      invoiceNumber,
      loadId: load.id,
      customerId: load.customerId,
      status: "Pending",
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      paidAmount: "0.00",
      notes: `Auto-generated invoice for load ${load.loadNumber}`,
    });

    // Create notification
    await storage.createNotification({
      type: "success",
      category: "invoice_created",
      title: "Invoice Auto-Generated",
      message: `Invoice ${invoiceNumber} has been automatically created for load ${load.loadNumber}`,
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
      isRead: "false",
    });

    // Log the activity
    await storage.createActivityLog({
      action: "invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      details: `Auto-generated invoice ${invoiceNumber} for load ${load.loadNumber} (Total: $${total.toFixed(2)})`,
      metadata: { loadId: load.id, invoiceId: invoice.id, amount: total },
      status: "success",
    });

    console.log(`Auto-generated invoice ${invoiceNumber} for load ${load.loadNumber}`);

    // Auto-email the invoice to the broker/customer if enabled. Failure here
    // does NOT roll back the invoice — dispatch can always resend manually.
    try {
      const emailSetting = await storage.getAutomationSetting("auto_email_invoice_on_delivery");
      const emailEnabled = !emailSetting || emailSetting.enabled !== "false";
      if (emailEnabled) {
        const customer = load.customerId
          ? (await storage.getAllCustomers()).find((c) => c.id === load.customerId) || null
          : null;
        const emailResult = await sendInvoiceEmail(invoice, load, customer);
        if (emailResult.sent) {
          await storage.createActivityLog({
            action: "invoice_emailed",
            entityType: "invoice",
            entityId: invoice.id,
            details: `Auto-emailed invoice ${invoiceNumber} to ${emailResult.to}`,
            metadata: { invoiceId: invoice.id, loadId: load.id, to: emailResult.to },
            status: "success",
          });
          console.log(`Auto-emailed invoice ${invoiceNumber} to ${emailResult.to}`);
        } else {
          await storage.createActivityLog({
            action: "invoice_email_skipped",
            entityType: "invoice",
            entityId: invoice.id,
            details: `Skipped auto-email of invoice ${invoiceNumber}: ${emailResult.reason}`,
            metadata: { invoiceId: invoice.id, loadId: load.id, reason: emailResult.reason },
            status: "warning",
          });
          console.log(`Skipped auto-email of invoice ${invoiceNumber}: ${emailResult.reason}`);
        }
      }
    } catch (emailErr: any) {
      console.error(`Auto-email of invoice ${invoiceNumber} failed:`, emailErr);
      // swallow — invoice creation itself succeeded; we don't want to fail the load update.
    }

    return invoice;
  } catch (error) {
    console.error("Error auto-generating invoice:", error);
    
    // Log the failure
    await storage.createActivityLog({
      action: "invoice_creation_failed",
      entityType: "load",
      entityId: load.id,
      details: `Failed to auto-generate invoice for load ${load.loadNumber}: ${(error as Error).message}`,
      status: "failed",
    });
    
    return null;
  }
}

// Check for expiring licenses and medical cards
export async function checkExpiringDocuments() {
  try {
    const setting = await storage.getAutomationSetting("alert_expiring_documents");
    if (setting && setting.enabled === "false") {
      return;
    }

    const drivers = await storage.getAllDrivers();
    const today = new Date();
    const warningDays = 30; // Alert 30 days before expiration

    for (const driver of drivers) {
      // Check CDL license expiration
      if (driver.licenseExpiration) {
        const daysUntilExpiration = differenceInDays(new Date(driver.licenseExpiration), today);
        
        if (daysUntilExpiration <= 0) {
          // Expired
          await storage.createNotification({
            type: "alert",
            category: "license_expiry",
            title: "CDL License Expired",
            message: `Driver ${driver.name}'s CDL license has expired`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false",
          });

          await storage.createActivityLog({
            action: "alert_triggered",
            entityType: "driver",
            entityId: driver.id,
            details: `CDL license expired for driver ${driver.name}`,
            status: "success",
          });

          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS ALERT: Your CDL license has EXPIRED. Please renew immediately and contact dispatch. - Ready TMS`,
            });
          }
        } else if (daysUntilExpiration > 0 && daysUntilExpiration <= warningDays) {
          // Expiring soon
          await storage.createNotification({
            type: "warning",
            category: "license_expiry",
            title: "CDL License Expiring Soon",
            message: `Driver ${driver.name}'s CDL license expires in ${daysUntilExpiration} days`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false",
          });

          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS Reminder: Your CDL license expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}. Please renew soon and contact dispatch. - Ready TMS`,
            });
          }
        }
      }

      // Check medical card expiration
      if (driver.medicalCardExpiration) {
        const daysUntilExpiration = differenceInDays(new Date(driver.medicalCardExpiration), today);
        
        if (daysUntilExpiration <= 0) {
          // Expired
          await storage.createNotification({
            type: "alert",
            category: "medical_card_expiry",
            title: "Medical Card Expired",
            message: `Driver ${driver.name}'s medical card has expired`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false",
          });

          await storage.createActivityLog({
            action: "alert_triggered",
            entityType: "driver",
            entityId: driver.id,
            details: `Medical card expired for driver ${driver.name}`,
            status: "success",
          });

          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS ALERT: Your medical card has EXPIRED. You cannot legally drive until it is renewed. Contact dispatch immediately. - Ready TMS`,
            });
          }
        } else if (daysUntilExpiration > 0 && daysUntilExpiration <= warningDays) {
          // Expiring soon
          await storage.createNotification({
            type: "warning",
            category: "medical_card_expiry",
            title: "Medical Card Expiring Soon",
            message: `Driver ${driver.name}'s medical card expires in ${daysUntilExpiration} days`,
            relatedEntityType: "driver",
            relatedEntityId: driver.id,
            recipientEmail: driver.email,
            isRead: "false",
          });

          if (driver.phone) {
            await sendSMS({
              to: driver.phone,
              message: `Ready TMS Reminder: Your medical card expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}. Please schedule your DOT physical soon. - Ready TMS`,
            });
          }
        }
      }
    }

    console.log("Checked expiring documents for all drivers");
  } catch (error) {
    console.error("Error checking expiring documents:", error);
  }
}

// Create notification for load status change
export async function notifyLoadStatusChange(load: Load, oldStatus: string, newStatus: string) {
  try {
    const setting = await storage.getAutomationSetting("notify_load_status_change");
    if (setting && setting.enabled === "false") {
      return;
    }

    let type: "info" | "success" | "warning" | "alert" = "info";
    let message = `Load ${load.loadNumber} status changed from ${oldStatus} to ${newStatus}`;

    if (newStatus === "delivered") {
      type = "success";
      message = `Load ${load.loadNumber} has been delivered`;
    } else if (newStatus === "cancelled") {
      type = "warning";
      message = `Load ${load.loadNumber} has been cancelled`;
    }

    await storage.createNotification({
      type,
      category: "load_status_change",
      title: "Load Status Updated",
      message,
      relatedEntityType: "load",
      relatedEntityId: load.id,
      isRead: "false",
    });

    await storage.createActivityLog({
      action: "load_status_changed",
      entityType: "load",
      entityId: load.id,
      details: `Load ${load.loadNumber} status changed: ${oldStatus} → ${newStatus}`,
      metadata: { oldStatus, newStatus },
      status: "success",
    });
  } catch (error) {
    console.error("Error notifying load status change:", error);
  }
}

// Parse a comma-separated email string into an array of trimmed, non-empty emails
function parseEmails(raw: string): string[] {
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

// Send an immediate reminder email for a single task (used on create/update)
export async function sendSingleTaskReminder(task: { title: string; dueDate: Date | string | null; dueTime?: string | null; priority: string; category?: string | null; assignedTo?: string | null; reminderEmail: string }) {
  try {
    const today = new Date();
    const due = task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—";
    const priority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    const category = task.category ? ` [${task.category}]` : "";

    const html = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Task Reminder</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;">${format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#374151;margin:0 0 16px;">You have a recurring daily task reminder:</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;">
            <h2 style="margin:0 0 8px;font-size:16px;color:#111827;">${task.title}${category}</h2>
            <p style="margin:0;color:#6b7280;font-size:14px;">
              <strong>Due:</strong> ${due}${task.dueTime ? " at " + task.dueTime : ""} &nbsp;&bull;&nbsp;
              <strong>Priority:</strong> ${priority}${task.assignedTo ? " &nbsp;&bull;&nbsp; <strong>Assigned to:</strong> " + task.assignedTo : ""}
            </p>
          </div>
          <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">This task is set to repeat daily. You will receive a reminder each morning. Log in to Ready TMS to update or complete it.</p>
        </div>
      </div>`;

    const emails = parseEmails(task.reminderEmail);
    let anySuccess = false;
    for (const email of emails) {
      const { success: sent } = await sendEmail({
        to: email,
        subject: `[Ready TMS] Task Reminder: ${task.title}`,
        html,
      });
      if (sent) {
        console.log(`[Automation] Sent immediate task reminder to ${email} for task "${task.title}"`);
        anySuccess = true;
      }
    }
    return anySuccess;
  } catch (error) {
    console.error("[Automation] Error sending single task reminder:", error);
    return false;
  }
}

// Send daily email reminders for tasks with repeatDaily = "true" and a reminderEmail set
export async function sendDailyTaskReminders() {
  try {
    const allTasks = await storage.getAllTasks();
    const today = new Date();

    const dailyTasks = allTasks.filter(
      (t) =>
        t.repeatDaily === "true" &&
        t.reminderEmail &&
        t.status !== "completed"
    );

    if (dailyTasks.length === 0) {
      console.log("[Automation] No daily task reminders to send today");
      return;
    }

    // Build a map: email → tasks that should be sent to that address
    // Each task may have multiple comma-separated emails
    const byEmail: Record<string, typeof dailyTasks> = {};
    for (const task of dailyTasks) {
      const emails = parseEmails(task.reminderEmail!);
      for (const email of emails) {
        if (!byEmail[email]) byEmail[email] = [];
        byEmail[email].push(task);
      }
    }

    for (const [email, tasks] of Object.entries(byEmail)) {
      const taskRows = tasks
        .map((t) => {
          const due = t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "—";
          const priority = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
          const category = t.category ? ` [${t.category}]` : "";
          return `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.title}${category}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${due}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${priority}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.assignedTo || "—"}</td>
            </tr>`;
        })
        .join("");

      const html = `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Daily Task Reminder</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;">${format(today, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;margin:0 0 16px;">You have <strong>${tasks.length} recurring task${tasks.length !== 1 ? "s" : ""}</strong> scheduled as daily reminders:</p>
            <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Task</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Due Date</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Priority</th>
                  <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Assigned To</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">Log in to Ready TMS to update or complete these tasks.</p>
          </div>
        </div>`;

      const { success: sent } = await sendEmail({
        to: email,
        subject: `[Ready TMS] Daily Task Reminder – ${tasks.length} task${tasks.length !== 1 ? "s" : ""} (${format(today, "MMM d")})`,
        html,
      });

      if (sent) {
        console.log(`[Automation] Sent daily task reminder to ${email} (${tasks.length} tasks)`);
      } else {
        console.error(`[Automation] Failed to send daily task reminder to ${email}`);
      }
    }
  } catch (error) {
    console.error("[Automation] Error sending daily task reminders:", error);
  }
}

/**
 * Check for loads missing POD and text the assigned driver
 * Checks loads that are in_transit or delivered but have no POD attached
 */
export async function checkAndSendMissingPODReminders(): Promise<void> {
  try {
    const loads = await storage.getAllLoads();
    const drivers = await storage.getAllDrivers();

    // Find loads that are active (in_transit) or delivered but missing POD
    const missingPODLoads = loads.filter((load) => {
      const isMissingPOD = !load.podAttachment || load.podAttachment === "";
      const isActiveOrDelivered = load.status === "in_transit" || load.status === "delivered";
      const notCancelled = load.status !== "cancelled";
      return isMissingPOD && isActiveOrDelivered && notCancelled;
    });

    let sent = 0;
    for (const load of missingPODLoads) {
      if (!load.assignedDriverId) continue;
      const driver = drivers.find((d) => d.id === load.assignedDriverId);
      if (!driver || !driver.phone) continue;

      const statusLabel = load.status === "delivered" ? "delivered" : "in transit";
      await sendSMS({
        to: driver.phone,
        message: `Ready TMS: Load ${load.loadNumber} is ${statusLabel} but no POD has been submitted. Please upload your Proof of Delivery at readytms.com/driver-pod. - Ready TMS`,
      });
      sent++;
    }

    console.log(`[Automation] Missing POD reminders sent: ${sent}`);
  } catch (error) {
    console.error("[Automation] Error sending missing POD reminders:", error);
  }
}

// Send dunning reminders for unpaid invoices. Runs daily and emails the
// broker/customer once per stage at 15, 30, and 45 days past invoice date.
// Tracked via activity log to avoid duplicate emails.
const DUNNING_STAGES_DAYS = [15, 30, 45];

export async function sendInvoiceDunningReminders(): Promise<{
  scanned: number;
  reminded: number;
  skipped: number;
}> {
  const result = { scanned: 0, reminded: 0, skipped: 0 };
  try {
    const setting = await storage.getAutomationSetting("auto_invoice_dunning");
    if (setting && setting.enabled === "false") return result;

    const invoices = await storage.getAllInvoices();
    const customers = await storage.getAllCustomers();
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const now = Date.now();

    for (const invoice of invoices) {
      // Only chase unpaid invoices.
      const status = (invoice.status || "").toLowerCase();
      if (status === "paid" || status === "cancelled" || status === "void") continue;

      const paid = Number(invoice.paidAmount || 0);
      const total = Number(invoice.total || 0);
      if (paid >= total && total > 0) continue;

      const invoiceMs = new Date(invoice.invoiceDate).getTime();
      if (isNaN(invoiceMs)) continue;
      const ageDays = Math.floor((now - invoiceMs) / (24 * 60 * 60 * 1000));

      // Find the highest stage this invoice has crossed.
      const reachedStages = DUNNING_STAGES_DAYS.filter((d) => ageDays >= d);
      if (reachedStages.length === 0) continue;
      const stage = Math.max(...reachedStages);

      result.scanned++;

      // De-dupe: have we already sent THIS stage's reminder for this invoice?
      const priorLogs = await storage.getActivityLogsByEntity("invoice", invoice.id).catch(() => []);
      const alreadySent = priorLogs.some(
        (l) =>
          l.action === "invoice_dunning_sent" &&
          (l.metadata as any)?.stage === stage,
      );
      if (alreadySent) {
        result.skipped++;
        continue;
      }

      const load = invoice.loadId ? await storage.getLoad(invoice.loadId) : null;
      if (!load) {
        result.skipped++;
        continue;
      }
      const customer = invoice.customerId ? customerById.get(invoice.customerId) ?? null : null;
      const to = pickInvoiceRecipientEmail(load, customer);
      if (!to) {
        result.skipped++;
        continue;
      }

      const total$ = Number(invoice.total).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const subject = `Reminder: Invoice ${invoice.invoiceNumber} — ${stage} days past due`;
      const html = `
        <div style="font-family: Helvetica, Arial, sans-serif; color: #222; max-width: 600px;">
          <p>Hello${customer?.contactPerson ? ` ${customer.contactPerson}` : ""},</p>
          <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong>
          for load <strong>${load.loadNumber}</strong>
          (${load.pickupLocation} → ${load.deliveryLocation})
          is now <strong>${stage} days</strong> past its invoice date.</p>
          <p>Outstanding balance: <strong>$${total$}</strong></p>
          <p>If payment has already been sent, please disregard. Otherwise, please remit at your earliest convenience.</p>
          <p>Thank you,<br/>${invoice.carrierName || "Ready Carrier LLC"}</p>
        </div>
      `;

      // Re-attach the same invoice PDF so the broker has it on hand.
      let attachments: { filename: string; content: Buffer }[] = [];
      try {
        const companySettings = await storage.getCompanySettings();
        const pdfBuffer = generateInvoicePdfBuffer({
          invoice,
          load,
          customer,
          companySettings: companySettings || null,
        });
        attachments = [{ filename: `Invoice-${invoice.invoiceNumber}.pdf`, content: pdfBuffer }];
      } catch {
        // No attachment — still send the reminder text.
      }

      const sent = await sendEmail({ to, subject, html, attachments });
      if (sent.success) {
        await storage.createActivityLog({
          action: "invoice_dunning_sent",
          entityType: "invoice",
          entityId: invoice.id,
          details: `Sent ${stage}-day dunning reminder for invoice ${invoice.invoiceNumber} to ${to}`,
          metadata: { invoiceId: invoice.id, stage, to, ageDays },
          status: "success",
        });
        result.reminded++;
      } else {
        await storage.createActivityLog({
          action: "invoice_dunning_failed",
          entityType: "invoice",
          entityId: invoice.id,
          details: `Failed to send ${stage}-day dunning for invoice ${invoice.invoiceNumber}: ${sent.error}`,
          metadata: { invoiceId: invoice.id, stage, to, error: sent.error },
          status: "failed",
        });
      }
    }
  } catch (err) {
    console.error("[Automation] dunning reminders failed:", err);
  }
  return result;
}

// Initialize default automation settings
export async function initializeAutomationSettings() {
  try {
    const defaultSettings = [
      {
        name: "auto_invoice_on_delivery",
        enabled: "true",
        config: { enabled: true, description: "Automatically generate invoices when loads are delivered" },
      },
      {
        name: "auto_email_invoice_on_delivery",
        enabled: "true",
        config: { enabled: true, description: "Auto-email new invoices to broker on creation" },
      },
      {
        name: "auto_invoice_dunning",
        enabled: "true",
        config: { enabled: true, stagesDays: DUNNING_STAGES_DAYS, description: "Email unpaid invoice reminders at 15/30/45 days" },
      },
      {
        name: "alert_expiring_documents",
        enabled: "true",
        config: { enabled: true, warningDays: 30, description: "Alert when CDL licenses and medical cards are expiring" },
      },
      {
        name: "notify_load_status_change",
        enabled: "true",
        config: { enabled: true, description: "Send notifications when load status changes" },
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await storage.getAutomationSetting(setting.name);
      if (!existing) {
        await storage.createAutomationSetting(setting);
        console.log(`Created automation setting: ${setting.name}`);
      }
    }
  } catch (error) {
    console.error("Error initializing automation settings:", error);
  }
}
