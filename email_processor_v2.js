/**
 * ReadyTMS Email Processor V2
 * Works with NEW Insurance Management tables
 * Processes emails from info@readycarrier.com and updates insurance_trucks/insurance_trailers
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
    trucks_to_add: [],
    trucks_to_remove: [],
    trailers_to_add: [],
    trailers_to_remove: [],
    drivers_added: [],
    rawActions: []
  };

  // Format 1: Simple commands
  // "Add truck 770"
  // "Remove truck 445"
  // "Add trailer TR-001"
  // "Remove trailer TR-001"
  // "Add driver John Smith"
  const simplePatterns = [
    { pattern: /add\s+truck\s+(?:#)?(\d+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_truck' },
    { pattern: /remove\s+truck\s+(?:#)?(\d+)(?:\s+.*)?(?=\n|$)/gi, type: 'remove_truck' },
    { pattern: /add\s+trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_trailer' },
    { pattern: /remove\s+trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'remove_trailer' },
    { pattern: /add\s+driver\s+([^\n]+)/gi, type: 'add_driver' }
  ];

  for (const { pattern, type } of simplePatterns) {
    let match;
    while ((match = pattern.exec(emailBody)) !== null) {
      const value = match[1].trim();
      result.rawActions.push({ type, value });

      if (type === 'add_truck') {
        result.trucks_to_add.push({ unit_number: value, status: 'active' });
      } else if (type === 'remove_truck') {
        result.trucks_to_remove.push(value);
      } else if (type === 'add_trailer') {
        result.trailers_to_add.push({ unit_number: value, status: 'active' });
      } else if (type === 'remove_trailer') {
        result.trailers_to_remove.push(value);
      } else if (type === 'add_driver') {
        result.drivers_added.push(value);
      }
    }
  }

  // Format 2: CSV/Table format
  // Unit #,VIN,Status
  // 770,ABC123,Active
  const csvLines = emailBody.split('\n').filter(line => line.trim());
  for (let i = 1; i < csvLines.length; i++) {
    const parts = csvLines[i].split(',').map(p => p.trim());
    if (parts.length >= 1) {
      const unitNum = parts[0].replace(/[^\d]/g, '');
      if (unitNum) {
        result.trucks_to_add.push({
          unit_number: unitNum,
          vin: parts[1] || null,
          year: parts[2] || null,
          make: parts[3] || null,
          model: parts[4] || null,
          status: parts[5]?.toLowerCase() || 'active'
        });
      }
    }
  }

  return result;
}

/**
 * Add truck to insurance_trucks table
 */
async function addTruck(unitNumber, vin = null, year = null, make = null, model = null, status = 'active') {
  try {
    const result = await db.query(
      `INSERT INTO insurance_trucks (unit_number, vin, year, make, model, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (unit_number) DO UPDATE SET status = $6, updated_at = NOW()
       RETURNING *`,
      [unitNumber, vin, year, make, model, status]
    );
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add truck ${unitNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove truck (set status to removed)
 */
async function removeTruck(unitNumber) {
  try {
    const result = await db.query(
      `UPDATE insurance_trucks SET status = 'removed', updated_at = NOW()
       WHERE unit_number = $1
       RETURNING *`,
      [unitNumber]
    );
    if (result.rows.length === 0) {
      return { success: false, error: 'Truck not found' };
    }
    return { success: true, truck: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove truck ${unitNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Add trailer to insurance_trailers table
 */
async function addTrailer(unitNumber, status = 'active') {
  try {
    const result = await db.query(
      `INSERT INTO insurance_trailers (unit_number, status, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (unit_number) DO UPDATE SET status = $2, updated_at = NOW()
       RETURNING *`,
      [unitNumber, status]
    );
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to add trailer ${unitNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove trailer (set status to removed)
 */
async function removeTrailer(unitNumber) {
  try {
    const result = await db.query(
      `UPDATE insurance_trailers SET status = 'removed', updated_at = NOW()
       WHERE unit_number = $1
       RETURNING *`,
      [unitNumber]
    );
    if (result.rows.length === 0) {
      return { success: false, error: 'Trailer not found' };
    }
    return { success: true, trailer: result.rows[0] };
  } catch (error) {
    console.error(`Failed to remove trailer ${unitNumber}:`, error.message);
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
 * Get current insurance status
 */
async function getCurrentInsuranceStatus() {
  try {
    const trucks = await db.query('SELECT unit_number, status FROM insurance_trucks WHERE status = $1', ['active']);
    const trailers = await db.query('SELECT unit_number, status FROM insurance_trailers WHERE status = $1', ['active']);
    return {
      trucks: trucks.rows.map(t => t.unit_number),
      trailers: trailers.rows.map(t => t.unit_number)
    };
  } catch (error) {
    console.error('Failed to get insurance status:', error.message);
    return { trucks: [], trailers: [] };
  }
}

/**
 * Process email content and update insurance tables
 */
export async function processEmail(emailData) {
  const { subject, sender, body, date } = emailData;
  const parsed = parseEmailContent(body);

  const result = {
    email: { subject, sender, date },
    parsed,
    actions: {
      trucks_added: [],
      trucks_removed: [],
      trucks_failed: [],
      trailers_added: [],
      trailers_removed: [],
      trailers_failed: [],
      drivers_noted: [],
      errors: []
    }
  };

  console.log(`Processing email: "${subject}" from ${sender}`);

  // Process trucks to add
  for (const truck of parsed.trucks_to_add) {
    const res = await addTruck(
      truck.unit_number,
      truck.vin,
      truck.year,
      truck.make,
      truck.model,
      truck.status
    );
    if (res.success) {
      result.actions.trucks_added.push(truck.unit_number);
    } else {
      result.actions.trucks_failed.push({ unit: truck.unit_number, error: res.error });
    }
  }

  // Process trucks to remove
  for (const unitNumber of parsed.trucks_to_remove) {
    const res = await removeTruck(unitNumber);
    if (res.success) {
      result.actions.trucks_removed.push(unitNumber);
    } else {
      result.actions.trucks_failed.push({ unit: unitNumber, error: res.error });
    }
  }

  // Process trailers to add
  for (const trailer of parsed.trailers_to_add) {
    const res = await addTrailer(trailer.unit_number, trailer.status);
    if (res.success) {
      result.actions.trailers_added.push(trailer.unit_number);
    } else {
      result.actions.trailers_failed.push({ unit: trailer.unit_number, error: res.error });
    }
  }

  // Process trailers to remove
  for (const unitNumber of parsed.trailers_to_remove) {
    const res = await removeTrailer(unitNumber);
    if (res.success) {
      result.actions.trailers_removed.push(unitNumber);
    } else {
      result.actions.trailers_failed.push({ unit: unitNumber, error: res.error });
    }
  }

  // Note drivers (stored for reference)
  result.actions.drivers_noted = parsed.drivers_added;

  // Get current insurance status
  const currentStatus = await getCurrentInsuranceStatus();
  result.currentStatus = currentStatus;

  // Send comprehensive Telegram notification
  if (result.actions.trucks_added.length > 0 ||
      result.actions.trucks_removed.length > 0 ||
      result.actions.trailers_added.length > 0 ||
      result.actions.trailers_removed.length > 0 ||
      result.actions.drivers_noted.length > 0) {

    let msg = `📋 <b>INSURANCE UPDATE FROM EMAIL</b>\n`;
    msg += `📅 ${new Date().toLocaleString()}\n\n`;
    msg += `<b>From:</b> ${sender}\n`;
    msg += `<b>Subject:</b> ${subject}\n\n`;

    msg += `<b>━━ TRUCKS ━━</b>\n`;
    if (result.actions.trucks_added.length > 0) {
      msg += `✅ Added: ${result.actions.trucks_added.join(', ')}\n`;
    }
    if (result.actions.trucks_removed.length > 0) {
      msg += `❌ Removed: ${result.actions.trucks_removed.join(', ')}\n`;
    }
    if (result.actions.trucks_failed.length > 0) {
      msg += `⚠️ Failed: ${result.actions.trucks_failed.map(f => f.unit).join(', ')}\n`;
    }

    msg += `\n<b>━━ TRAILERS ━━</b>\n`;
    if (result.actions.trailers_added.length > 0) {
      msg += `✅ Added: ${result.actions.trailers_added.join(', ')}\n`;
    }
    if (result.actions.trailers_removed.length > 0) {
      msg += `❌ Removed: ${result.actions.trailers_removed.join(', ')}\n`;
    }
    if (result.actions.trailers_failed.length > 0) {
      msg += `⚠️ Failed: ${result.actions.trailers_failed.map(f => f.unit).join(', ')}\n`;
    }

    msg += `\n<b>━━ DRIVERS ━━</b>\n`;
    if (result.actions.drivers_noted.length > 0) {
      msg += `👤 Noted: ${result.actions.drivers_noted.join(', ')}\n`;
    } else {
      msg += `👤 None mentioned\n`;
    }

    msg += `\n<b>━━ CURRENT INSURANCE STATUS ━━</b>\n`;
    msg += `🚗 Active Trucks: ${currentStatus.trucks.length} (${currentStatus.trucks.join(', ') || 'None'})\n`;
    msg += `🚐 Active Trailers: ${currentStatus.trailers.length} (${currentStatus.trailers.join(', ') || 'None'})\n`;

    // Show any mismatches (trucks/trailers in one but not other)
    const allUnits = new Set([...currentStatus.trucks, ...currentStatus.trailers]);
    if (allUnits.size > 0) {
      msg += `\n<b>ℹ️ Check Insurance Records →</b> /insurance`;
    }

    await notifyTelegram('📧 EMAIL PROCESSED', msg);
  }

  return result;
}

/**
 * API endpoint for processing emails
 * POST /api/email/process
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
