/**
 * ReadyTMS Email Processor
 * Parses emails from info@readycarrier.com and auto-adds trucks/drivers/trailers
 *
 * Usage:
 * - Add this to your ReadyTMS server/routes.ts as a new endpoint
 * - Call via: POST /api/email/process
 * - Or setup via Gmail webhook/webhook integration
 */

import { db } from './db.js';
import { Telegraf } from 'telegraf';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = TELEGRAM_BOT_TOKEN ? new Telegraf(TELEGRAM_BOT_TOKEN) : null;

/**
 * Parse email and extract equipment data
 * Supports both simple commands and structured formats
 */
function parseEmailContent(emailBody) {
  const result = {
    trucks: [],
    trailers: [],
    drivers: [],
    rawActions: []
  };

  // Format 1: Simple commands
  // "Add truck 770"
  // "Remove truck 445"
  // "Add driver John Smith"
  // "Add trailer TR-001"
  const simplePatterns = [
    { pattern: /add\s+truck\s+(?:#)?(\d+)/gi, type: 'add_truck' },
    { pattern: /remove\s+truck\s+(?:#)?(\d+)/gi, type: 'remove_truck' },
    { pattern: /add\s+driver\s+([^\n]+)/gi, type: 'add_driver' },
    { pattern: /add\s+trailer\s+(?:#)?([A-Z0-9\-]+)/gi, type: 'add_trailer' },
    { pattern: /remove\s+trailer\s+(?:#)?([A-Z0-9\-]+)/gi, type: 'remove_trailer' }
  ];

  for (const { pattern, type } of simplePatterns) {
    let match;
    while ((match = pattern.exec(emailBody)) !== null) {
      const value = match[1].trim();
      result.rawActions.push({ type, value });

      if (type === 'add_truck') {
        result.trucks.push({ action: 'add', truck_number: value, status: 'active' });
      } else if (type === 'remove_truck') {
        result.trucks.push({ action: 'remove', truck_number: value });
      } else if (type === 'add_driver') {
        result.drivers.push({ action: 'add', name: value, status: 'active' });
      } else if (type === 'add_trailer') {
        result.trailers.push({ action: 'add', trailer_number: value, status: 'active' });
      } else if (type === 'remove_trailer') {
        result.trailers.push({ action: 'remove', trailer_number: value });
      }
    }
  }

  // Format 2: CSV/Table format
  // Unit #,VIN,Status
  // 770,ABC123,Active
  // 445,XYZ789,Active
  const csvLines = emailBody.split('\n').filter(line => line.trim());
  for (let i = 1; i < csvLines.length; i++) {
    const parts = csvLines[i].split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const truckNum = parts[0].replace(/[^\d]/g, '');
      const vin = parts[1];
      if (truckNum && vin) {
        result.trucks.push({
          action: 'add',
          truck_number: truckNum,
          vin: vin,
          status: parts[2]?.toLowerCase() || 'active'
        });
      }
    }
  }

  return result;
}

/**
 * Add truck to database
 */
async function addTruck(truckNumber, vin = null, status = 'active') {
  try {
    const result = await db.query(
      `INSERT INTO trucks (truck_number, vin, status, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (truck_number) DO UPDATE SET status = $3
       RETURNING *`,
      [truckNumber, vin, status]
    );
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add truck ${truckNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove truck (set status to removed)
 */
async function removeTruck(truckNumber) {
  try {
    const result = await db.query(
      `UPDATE trucks SET status = 'removed', removed_at = NOW()
       WHERE truck_number = $1
       RETURNING *`,
      [truckNumber]
    );
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove truck ${truckNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Add driver to database
 */
async function addDriver(name, licenseNumber = null, status = 'active') {
  try {
    const result = await db.query(
      `INSERT INTO drivers (name, license_number, status, hire_date)
       VALUES ($1, $2, $3, CURRENT_DATE)
       ON CONFLICT (name) DO UPDATE SET status = $3
       RETURNING *`,
      [name, licenseNumber, status]
    );
    return { success: true, driver: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add driver ${name}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Add trailer to database
 */
async function addTrailer(trailerNumber, status = 'active') {
  try {
    const result = await db.query(
      `INSERT INTO trailers (trailer_number, status)
       VALUES ($1, $2)
       ON CONFLICT (trailer_number) DO UPDATE SET status = $2
       RETURNING *`,
      [trailerNumber, status]
    );
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add trailer ${trailerNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove trailer (set status to removed)
 */
async function removeTrailer(trailerNumber) {
  try {
    const result = await db.query(
      `UPDATE trailers SET status = 'removed'
       WHERE trailer_number = $1
       RETURNING *`,
      [trailerNumber]
    );
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove trailer ${trailerNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to Telegram
 */
async function notifyTelegram(title, message) {
  if (!bot || !TELEGRAM_CHAT_ID) return;

  try {
    await bot.telegram.sendMessage(
      TELEGRAM_CHAT_ID,
      `${title}\n${message}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
  }
}

/**
 * Process email content and update ReadyTMS
 */
export async function processEmail(emailData) {
  const { subject, sender, body, date } = emailData;
  const result = {
    email: { subject, sender, date },
    parsed: parseEmailContent(body),
    changes: {
      trucks_added: [],
      trucks_removed: [],
      drivers_added: [],
      trailers_added: [],
      trailers_removed: [],
      errors: []
    }
  };

  // Process trucks
  for (const truck of result.parsed.trucks) {
    if (truck.action === 'add') {
      const res = await addTruck(truck.truck_number, truck.vin, truck.status);
      if (res.success) {
        result.changes.trucks_added.push(truck.truck_number);
      } else {
        result.changes.errors.push(`Truck ${truck.truck_number}: ${res.error}`);
      }
    } else if (truck.action === 'remove') {
      const res = await removeTruck(truck.truck_number);
      if (res.success) {
        result.changes.trucks_removed.push(truck.truck_number);
      } else {
        result.changes.errors.push(`Remove truck ${truck.truck_number}: ${res.error}`);
      }
    }
  }

  // Process drivers
  for (const driver of result.parsed.drivers) {
    if (driver.action === 'add') {
      const res = await addDriver(driver.name, driver.license_number, driver.status);
      if (res.success) {
        result.changes.drivers_added.push(driver.name);
      } else {
        result.changes.errors.push(`Driver ${driver.name}: ${res.error}`);
      }
    }
  }

  // Process trailers
  for (const trailer of result.parsed.trailers) {
    if (trailer.action === 'add') {
      const res = await addTrailer(trailer.trailer_number, trailer.status);
      if (res.success) {
        result.changes.trailers_added.push(trailer.trailer_number);
      } else {
        result.changes.errors.push(`Trailer ${trailer.trailer_number}: ${res.error}`);
      }
    } else if (trailer.action === 'remove') {
      const res = await removeTrailer(trailer.trailer_number);
      if (res.success) {
        result.changes.trailers_removed.push(trailer.trailer_number);
      } else {
        result.changes.errors.push(`Remove trailer ${trailer.trailer_number}: ${res.error}`);
      }
    }
  }

  // Send Telegram notification if changes made
  if (result.changes.trucks_added.length > 0 ||
      result.changes.trucks_removed.length > 0 ||
      result.changes.drivers_added.length > 0 ||
      result.changes.trailers_added.length > 0 ||
      result.changes.trailers_removed.length > 0) {

    let msg = `✅ <b>EQUIPMENT UPDATE FROM EMAIL</b>\n\n`;
    msg += `<b>From:</b> ${sender}\n`;
    msg += `<b>Subject:</b> ${subject}\n\n`;

    if (result.changes.trucks_added.length > 0) {
      msg += `✅ Trucks Added: ${result.changes.trucks_added.join(', ')}\n`;
    }
    if (result.changes.trucks_removed.length > 0) {
      msg += `❌ Trucks Removed: ${result.changes.trucks_removed.join(', ')}\n`;
    }
    if (result.changes.drivers_added.length > 0) {
      msg += `✅ Drivers Added: ${result.changes.drivers_added.join(', ')}\n`;
    }
    if (result.changes.trailers_added.length > 0) {
      msg += `✅ Trailers Added: ${result.changes.trailers_added.join(', ')}\n`;
    }
    if (result.changes.trailers_removed.length > 0) {
      msg += `❌ Trailers Removed: ${result.changes.trailers_removed.join(', ')}\n`;
    }

    await notifyTelegram('📧 EQUIPMENT AUTO-UPDATE', msg);
  }

  return result;
}

/**
 * API endpoint for processing emails
 * POST /api/email/process
 *
 * Body: {
 *   "subject": "New Equipment",
 *   "sender": "info@readycarrier.com",
 *   "body": "Add truck 770",
 *   "date": "2026-06-13T12:00:00Z"
 * }
 */
export const emailProcessorRoute = async (req, res) => {
  try {
    const { subject, sender, body, date } = req.body;

    // Only process emails from info@readycarrier.com
    if (!sender || !sender.includes('info@readycarrier.com')) {
      return res.status(403).json({ error: 'Only info@readycarrier.com emails are processed' });
    }

    const result = await processEmail({ subject, sender, body, date });
    res.json(result);
  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).json({ error: error.message });
  }
};
