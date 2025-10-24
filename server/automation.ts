import { storage } from "./storage";
import type { Load, Driver } from "@shared/schema";
import { differenceInDays } from "date-fns";

/**
 * Automation Engine for Ready TMS
 * Handles automated workflows like auto-invoicing, notifications, and alerts
 */

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
