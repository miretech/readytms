import { Resend } from 'resend';
import type { Driver, Maintenance, Truck } from '@shared/schema';
import { SDK } from '@ringcentral/sdk';

// Initialize Resend for email notifications
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// RingCentral configuration (gracefully handles missing credentials)
let rcSDK: any = null;
let rcPlatform: any = null;
let rcReady = false;

// Initialize RingCentral if credentials are available
async function initializeRingCentral() {
  if (rcReady) return true;
  
  const {
    RC_SERVER_URL,
    RC_APP_CLIENT_ID,
    RC_APP_CLIENT_SECRET,
    RC_USER_JWT,
  } = process.env;

  // Check if all required credentials are available
  if (!RC_SERVER_URL || !RC_APP_CLIENT_ID || !RC_APP_CLIENT_SECRET || !RC_USER_JWT) {
    console.log('[Notifications] RingCentral credentials not configured - SMS notifications disabled');
    return false;
  }

  try {
    rcSDK = new SDK({
      server: RC_SERVER_URL,
      clientId: RC_APP_CLIENT_ID,
      clientSecret: RC_APP_CLIENT_SECRET,
    });

    rcPlatform = rcSDK.platform();
    await rcPlatform.login({ jwt: RC_USER_JWT });
    
    rcReady = true;
    console.log('[Notifications] RingCentral initialized successfully - SMS enabled');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to initialize RingCentral:', error);
    return false;
  }
}

// Initialize on module load
initializeRingCentral().catch(console.error);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    type?: string;
  }[];
  from?: string;
}

interface SMSOptions {
  to: string;
  message: string;
}

/**
 * Send an email notification
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    const msg = 'Resend not configured — RESEND_API_KEY missing';
    console.error('[Notifications]', msg);
    return { success: false, error: msg };
  }

  try {
    // Always send from the verified domain. If a custom "from" address is
    // specified, put it in reply_to so replies go back to that address.
    const verifiedSender = 'Ready TMS <noreply@readytms.com>';
    const emailPayload: any = {
      from: verifiedSender,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    if (options.from && options.from !== 'noreply@readytms.com') {
      emailPayload.reply_to = options.from;
    }

    // Add attachments if provided — Resend only accepts filename + content
    if (options.attachments && options.attachments.length > 0) {
      emailPayload.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    console.log('[Notifications] Sending email to:', emailPayload.to, 'reply_to:', emailPayload.reply_to || 'none');
    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      const msg = JSON.stringify(error);
      console.error('[Notifications] Resend error:', msg);
      return { success: false, error: msg };
    }

    console.log('[Notifications] Email sent successfully. ID:', data?.id);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[Notifications] Email send exception:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Send an SMS notification via RingCentral
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  // Try to initialize if not ready
  if (!rcReady) {
    const initialized = await initializeRingCentral();
    if (!initialized) {
      console.log('[Notifications] SMS not sent - RingCentral not configured');
      return false;
    }
  }

  const { RC_PHONE_NUMBER } = process.env;
  if (!RC_PHONE_NUMBER) {
    console.error('[Notifications] RC_PHONE_NUMBER not configured');
    return false;
  }

  try {
    const response = await rcPlatform.post('/restapi/v1.0/account/~/extension/~/sms', {
      from: { phoneNumber: RC_PHONE_NUMBER },
      to: [{ phoneNumber: options.to }],
      text: options.message,
    });

    const data = await response.json();
    console.log('[Notifications] SMS sent successfully:', data.id);
    return true;
  } catch (error) {
    console.error('[Notifications] SMS send error:', error);
    return false;
  }
}

/**
 * Send GPS tracking enabled notification to driver
 */
export async function sendGPSEnabledNotification(driver: Driver): Promise<void> {
  const driverPortalUrl = process.env.VITE_APP_URL || 'https://readytms.com';
  
  // Email notification
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .steps { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .step { margin: 15px 0; padding-left: 30px; position: relative; }
        .step::before { content: "→"; position: absolute; left: 0; color: #2563eb; font-weight: bold; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GPS Tracking Enabled</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <p><strong>GPS tracking has been enabled for your account.</strong></p>
          
          <p>Please start sharing your location so dispatch can track your assignments:</p>
          
          <div class="steps">
            <div class="step">Visit the Driver Portal</div>
            <div class="step">Log in with your credentials</div>
            <div class="step">Toggle "On Duty" to start GPS tracking</div>
            <div class="step">Keep the page open while driving</div>
          </div>
          
          <div style="text-align: center;">
            <a href="${driverPortalUrl}/driver-portal" class="button">Open Driver Portal</a>
          </div>
          
          <p><small>Your location will be shared every 3 minutes while you're on duty. You can toggle off duty to stop sharing.</small></p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>If you have questions, contact dispatch</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: 'GPS Tracking Enabled - Ready TMS',
    html: emailHtml,
  });

  // SMS notification
  const smsMessage = `Ready TMS: GPS tracking enabled for your account. Please visit ${driverPortalUrl}/driver-portal and toggle "On Duty" to start sharing your location.`;
  
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage,
  });

  console.log(`[Notifications] GPS enabled notification sent to ${driver.name} - Email: ${emailSent}, SMS: ${smsSent}`);
}

/**
 * Send GPS tracking reminder to driver
 */
export async function sendGPSReminderNotification(driver: Driver): Promise<void> {
  const driverPortalUrl = process.env.VITE_APP_URL || 'https://readytms.com';
  
  // Email notification
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ GPS Location Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <div class="alert">
            <strong>We haven't received your GPS location in the last 24 hours.</strong>
          </div>
          
          <p>Please share your location if you're currently on duty:</p>
          
          <div style="text-align: center;">
            <a href="${driverPortalUrl}/driver-portal" class="button">Share Location Now</a>
          </div>
          
          <p><strong>How to share your location:</strong></p>
          <ol>
            <li>Open the Driver Portal</li>
            <li>Toggle "On Duty"</li>
            <li>Keep the page open</li>
          </ol>
          
          <p><small>If you're off duty or on vacation, you can ignore this reminder.</small></p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>This is an automated reminder</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: 'GPS Location Reminder - Ready TMS',
    html: emailHtml,
  });

  // SMS notification
  const smsMessage = `Ready TMS Reminder: We haven't received your GPS location in 24 hours. Please visit ${driverPortalUrl}/driver-portal and toggle "On Duty" to share your location.`;
  
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage,
  });

  console.log(`[Notifications] GPS reminder sent to ${driver.name} - Email: ${emailSent}, SMS: ${smsSent}`);
}

/**
 * Send maintenance reminder notification to driver
 */
export async function sendMaintenanceReminderNotification(
  driver: Driver,
  truck: Truck,
  maintenance: Maintenance
): Promise<void> {
  const daysUntilDue = maintenance.nextServiceDate
    ? Math.ceil((new Date(maintenance.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const status = isOverdue ? 'OVERDUE' : daysUntilDue === 0 ? 'DUE TODAY' : `Due in ${daysUntilDue} days`;

  // Email notification
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isOverdue ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background: ${isOverdue ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${isOverdue ? '#dc2626' : '#f59e0b'}; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; color: #6b7280; }
        .detail-value { color: #111827; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isOverdue ? '⚠️ MAINTENANCE OVERDUE' : '🔧 Maintenance Reminder'}</h1>
        </div>
        <div class="content">
          <p>Hi ${driver.name},</p>
          
          <div class="alert-box">
            <h3 style="margin-top:0;">${status}</h3>
            <p style="margin-bottom:0;"><strong>${maintenance.maintenanceType}</strong> is ${isOverdue ? 'overdue' : 'due soon'} for Truck ${truck.truckNumber}</p>
          </div>

          <div class="details">
            <h3 style="margin-top:0;">Maintenance Details</h3>
            <div class="detail-row">
              <span class="detail-label">Truck:</span>
              <span class="detail-value">${truck.truckNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Service Type:</span>
              <span class="detail-value">${maintenance.maintenanceType}</span>
            </div>
            ${maintenance.nextServiceDate ? `
            <div class="detail-row">
              <span class="detail-label">Due Date:</span>
              <span class="detail-value">${new Date(maintenance.nextServiceDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
            ${maintenance.nextServiceMileage ? `
            <div class="detail-row">
              <span class="detail-label">Due at Mileage:</span>
              <span class="detail-value">${maintenance.nextServiceMileage.toLocaleString()} miles</span>
            </div>
            ` : ''}
            ${maintenance.description ? `
            <div class="detail-row">
              <span class="detail-label">Notes:</span>
              <span class="detail-value">${maintenance.description}</span>
            </div>
            ` : ''}
          </div>
          
          <p><strong>Action Required:</strong> Please ${isOverdue ? 'schedule this service immediately' : 'plan to schedule this service'} to keep the truck in optimal condition and comply with DOT regulations.</p>
          
          <p>Contact dispatch or the maintenance department to schedule this service.</p>
          
          <div class="footer">
            <p>Ready TMS - Transportation Management System</p>
            <p>If you have questions, contact dispatch</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const { success: emailSent } = await sendEmail({
    to: driver.email,
    subject: `${isOverdue ? '⚠️ OVERDUE' : '🔧'} Maintenance ${status} - Truck ${truck.truckNumber}`,
    html: emailHtml,
  });

  // SMS notification
  const smsMessage = `Ready TMS: ${isOverdue ? 'OVERDUE' : 'Reminder'} - ${maintenance.maintenanceType} ${status.toLowerCase()} for Truck ${truck.truckNumber}. ${maintenance.nextServiceDate ? `Due: ${new Date(maintenance.nextServiceDate).toLocaleDateString()}` : ''}. Contact dispatch to schedule.`;
  
  const smsSent = await sendSMS({
    to: driver.phone,
    message: smsMessage,
  });

  console.log(`[Notifications] Maintenance reminder sent to ${driver.name} for Truck ${truck.truckNumber} - Email: ${emailSent}, SMS: ${smsSent}`);
}

/**
 * Check all maintenance records and send reminders for upcoming/overdue services
 */
export async function checkAndSendMaintenanceReminders(
  getAllMaintenance: () => Promise<Maintenance[]>,
  getAllTrucks: () => Promise<Truck[]>,
  getAllDrivers: () => Promise<Driver[]>
): Promise<{ sent: number; skipped: number }> {
  console.log('[Notifications] Checking maintenance reminders...');
  
  const maintenanceRecords = await getAllMaintenance();
  const trucks = await getAllTrucks();
  const drivers = await getAllDrivers();

  let sent = 0;
  let skipped = 0;

  for (const maintenance of maintenanceRecords) {
    // Only check for scheduled/active maintenance with next service date
    if (maintenance.status !== 'Completed' && maintenance.nextServiceDate) {
      const daysUntilDue = Math.ceil(
        (new Date(maintenance.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder if: overdue, due today, or due within 7 days
      if (daysUntilDue <= 7) {
        const truck = trucks.find(t => t.id === maintenance.truckId);
        if (!truck) {
          console.log(`[Notifications] Truck not found for maintenance ${maintenance.id}`);
          skipped++;
          continue;
        }

        // Find driver assigned to this truck
        const driver = drivers.find(d => d.assignedTruckId === truck.id);
        if (!driver || !driver.email) {
          console.log(`[Notifications] No driver or email found for truck ${truck.truckNumber}`);
          skipped++;
          continue;
        }

        try {
          await sendMaintenanceReminderNotification(driver, truck, maintenance);
          sent++;
        } catch (error) {
          console.error(`[Notifications] Failed to send maintenance reminder:`, error);
          skipped++;
        }
      }
    }
  }

  console.log(`[Notifications] Maintenance reminders complete - Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}
