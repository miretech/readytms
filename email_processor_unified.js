/**
 * ReadyTMS Unified Email Processor
 * Monitors ALL insurance-related emails and consolidates information
 *
 * Email Sources:
 * - northex10@gmail.com: Trailer information
 * - readycarriers@gmail.com: Insurance information
 * - info@readycarrier.com: Agent commands (add/remove/updates)
 */

import { db } from './db.js';
import { Telegraf } from 'telegraf';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = TELEGRAM_BOT_TOKEN ? new Telegraf(TELEGRAM_BOT_TOKEN) : null;

const MONITORED_EMAILS = {
  trailers: 'northex10@gmail.com',
  insurance: 'readycarriers@gmail.com',
  commands: 'info@readycarrier.com'
};

/**
 * Parse email content based on source
 */
function parseEmailBySource(emailBody, sender) {
  let source = 'unknown';

  if (sender.includes(MONITORED_EMAILS.trailers)) {
    source = 'trailers';
  } else if (sender.includes(MONITORED_EMAILS.insurance)) {
    source = 'insurance';
  } else if (sender.includes(MONITORED_EMAILS.commands)) {
    source = 'commands';
  }

  const result = {
    source,
    trucks_to_add: [],
    trucks_to_remove: [],
    trailers_to_add: [],
    trailers_to_remove: [],
    drivers_added: [],
    insurance_info: [],
    rawActions: []
  };

  // ==============================
  // SOURCE 1: TRAILERS (northex10)
  // ==============================
  if (source === 'trailers') {
    // Parse trailers from this email
    const trailerPatterns = [
      { pattern: /trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_trailer' },
      { pattern: /add\s+trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_trailer' }
    ];

    for (const { pattern, type } of trailerPatterns) {
      let match;
      while ((match = pattern.exec(emailBody)) !== null) {
        const value = match[1].trim();
        result.rawActions.push({ type, value, source });
        result.trailers_to_add.push({ unit_number: value, status: 'active' });
      }
    }

    // CSV format for trailers
    const csvLines = emailBody.split('\n').filter(line => line.trim());
    for (let i = 1; i < csvLines.length; i++) {
      const parts = csvLines[i].split(',').map(p => p.trim());
      if (parts.length >= 1) {
        const trailerNum = parts[0].replace(/^TRAILER[-\s]?/i, '').trim();
        if (trailerNum && /^[A-Z0-9\-]+$/.test(trailerNum)) {
          result.trailers_to_add.push({
            unit_number: trailerNum,
            status: parts[1]?.toLowerCase() || 'active'
          });
        }
      }
    }
  }

  // ==============================
  // SOURCE 2: INSURANCE (readycarriers)
  // ==============================
  if (source === 'insurance') {
    // Extract insurance information (not commands, just info)
    // Look for trucks, trailers, drivers mentioned in insurance context

    // Trucks in insurance
    const truckPatterns = [
      { pattern: /truck\s+(?:#)?(\d+)/gi },
      { pattern: /unit\s+(?:#)?(\d+)/gi },
      { pattern: /tractor\s+(?:#)?(\d+)/gi }
    ];

    const truckMatches = new Set();
    for (const { pattern } of truckPatterns) {
      let match;
      while ((match = pattern.exec(emailBody)) !== null) {
        truckMatches.add(match[1]);
      }
    }

    for (const truckNum of truckMatches) {
      result.insurance_info.push({ type: 'truck', number: truckNum });
    }

    // Trailers in insurance
    const trailerMatches = new Set();
    const trailerPattern = /trailer\s+(?:#)?([A-Z0-9\-]+)/gi;
    let match;
    while ((match = trailerPattern.exec(emailBody)) !== null) {
      trailerMatches.add(match[1]);
    }

    for (const trailerNum of trailerMatches) {
      result.insurance_info.push({ type: 'trailer', number: trailerNum });
    }

    // Drivers in insurance
    const driverMatches = new Set();
    const driverPattern = /driver[:\s]+([A-Za-z\s]+?)(?:\n|,|$)/gi;
    while ((match = driverPattern.exec(emailBody)) !== null) {
      const name = match[1].trim();
      if (name && name.length > 2) {
        driverMatches.add(name);
      }
    }

    for (const driverName of driverMatches) {
      result.insurance_info.push({ type: 'driver', name: driverName });
    }
  }

  // ==============================
  // SOURCE 3: COMMANDS (info@readycarrier)
  // ==============================
  if (source === 'commands') {
    // Parse explicit commands from agent

    const commandPatterns = [
      { pattern: /add\s+truck\s+(?:#)?(\d+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_truck' },
      { pattern: /remove\s+truck\s+(?:#)?(\d+)(?:\s+.*)?(?=\n|$)/gi, type: 'remove_truck' },
      { pattern: /add\s+trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'add_trailer' },
      { pattern: /remove\s+trailer\s+(?:#)?([A-Z0-9\-]+)(?:\s+.*)?(?=\n|$)/gi, type: 'remove_trailer' },
      { pattern: /add\s+driver\s+([^\n]+)/gi, type: 'add_driver' }
    ];

    for (const { pattern, type } of commandPatterns) {
      let match;
      while ((match = pattern.exec(emailBody)) !== null) {
        const value = match[1].trim();
        result.rawActions.push({ type, value, source });

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

    // CSV format for commands
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
  }

  return result;
}

/**
 * Add truck to insurance_trucks
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
 * Remove truck
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
 * Add trailer to insurance_trailers
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
 * Remove trailer
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
 * Process email and update insurance tables
 */
export async function processEmail(emailData) {
  const { subject, sender, body, date } = emailData;
  const parsed = parseEmailBySource(body, sender);

  const result = {
    email: { subject, sender, date },
    source: parsed.source,
    parsed,
    actions: {
      trucks_added: [],
      trucks_removed: [],
      trucks_failed: [],
      trailers_added: [],
      trailers_removed: [],
      trailers_failed: [],
      drivers_noted: [],
      insurance_found: [],
      errors: []
    }
  };

  console.log(`Processing email from ${parsed.source} (${sender}): "${subject}"`);

  // ================================
  // PROCESS COMMANDS (from info@)
  // ================================
  if (parsed.source === 'commands') {
    // Process trucks
    for (const truck of parsed.trucks_to_add) {
      const res = await addTruck(truck.unit_number, truck.vin, truck.year, truck.make, truck.model, truck.status);
      if (res.success) {
        result.actions.trucks_added.push(truck.unit_number);
      } else {
        result.actions.trucks_failed.push({ unit: truck.unit_number, error: res.error });
      }
    }

    for (const unitNumber of parsed.trucks_to_remove) {
      const res = await removeTruck(unitNumber);
      if (res.success) {
        result.actions.trucks_removed.push(unitNumber);
      } else {
        result.actions.trucks_failed.push({ unit: unitNumber, error: res.error });
      }
    }

    // Process trailers
    for (const trailer of parsed.trailers_to_add) {
      const res = await addTrailer(trailer.unit_number, trailer.status);
      if (res.success) {
        result.actions.trailers_added.push(trailer.unit_number);
      } else {
        result.actions.trailers_failed.push({ unit: trailer.unit_number, error: res.error });
      }
    }

    for (const unitNumber of parsed.trailers_to_remove) {
      const res = await removeTrailer(unitNumber);
      if (res.success) {
        result.actions.trailers_removed.push(unitNumber);
      } else {
        result.actions.trailers_failed.push({ unit: unitNumber, error: res.error });
      }
    }

    result.actions.drivers_noted = parsed.drivers_added;
  }

  // ================================
  // PROCESS INFORMATION (from northex10 & readycarriers)
  // ================================
  if (parsed.source === 'trailers') {
    // Add trailers from northex10 email
    for (const trailer of parsed.trailers_to_add) {
      const res = await addTrailer(trailer.unit_number, trailer.status);
      if (res.success) {
        result.actions.trailers_added.push(trailer.unit_number);
      } else {
        result.actions.trailers_failed.push({ unit: trailer.unit_number, error: res.error });
      }
    }
  }

  if (parsed.source === 'insurance') {
    // Log insurance information found
    for (const info of parsed.insurance_info) {
      if (info.type === 'truck') {
        result.actions.insurance_found.push(`🚗 Truck ${info.number}`);
      } else if (info.type === 'trailer') {
        result.actions.insurance_found.push(`🚐 Trailer ${info.number}`);
      } else if (info.type === 'driver') {
        result.actions.insurance_found.push(`👤 Driver ${info.name}`);
      }
    }
  }

  // Get current status
  const currentStatus = await getCurrentInsuranceStatus();
  result.currentStatus = currentStatus;

  // ================================
  // SEND TELEGRAM ALERT
  // ================================
  const hasChanges = result.actions.trucks_added.length > 0 ||
    result.actions.trucks_removed.length > 0 ||
    result.actions.trailers_added.length > 0 ||
    result.actions.trailers_removed.length > 0 ||
    result.actions.insurance_found.length > 0 ||
    result.actions.drivers_noted.length > 0;

  if (hasChanges) {
    let msg = `📋 <b>INSURANCE EMAIL PROCESSED</b>\n`;
    msg += `📅 ${new Date().toLocaleString()}\n\n`;
    msg += `<b>Source:</b> ${parsed.source.toUpperCase()} (${sender})\n`;
    msg += `<b>Subject:</b> ${subject}\n\n`;

    // Commands section
    if (parsed.source === 'commands') {
      msg += `<b>━━ COMMANDS EXECUTED ━━</b>\n`;

      if (result.actions.trucks_added.length > 0) {
        msg += `✅ Trucks Added: ${result.actions.trucks_added.join(', ')}\n`;
      }
      if (result.actions.trucks_removed.length > 0) {
        msg += `❌ Trucks Removed: ${result.actions.trucks_removed.join(', ')}\n`;
      }
      if (result.actions.trucks_failed.length > 0) {
        msg += `⚠️ Trucks Failed: ${result.actions.trucks_failed.map(f => f.unit).join(', ')}\n`;
      }

      if (result.actions.trailers_added.length > 0) {
        msg += `✅ Trailers Added: ${result.actions.trailers_added.join(', ')}\n`;
      }
      if (result.actions.trailers_removed.length > 0) {
        msg += `❌ Trailers Removed: ${result.actions.trailers_removed.join(', ')}\n`;
      }
      if (result.actions.trailers_failed.length > 0) {
        msg += `⚠️ Trailers Failed: ${result.actions.trailers_failed.map(f => f.unit).join(', ')}\n`;
      }

      if (result.actions.drivers_noted.length > 0) {
        msg += `👤 Drivers Noted: ${result.actions.drivers_noted.join(', ')}\n`;
      }
    }

    // Trailers section
    if (parsed.source === 'trailers') {
      msg += `<b>━━ TRAILERS FROM northex10 ━━</b>\n`;
      if (result.actions.trailers_added.length > 0) {
        msg += `✅ Added: ${result.actions.trailers_added.join(', ')}\n`;
      }
      if (result.actions.trailers_failed.length > 0) {
        msg += `⚠️ Failed: ${result.actions.trailers_failed.map(f => f.unit).join(', ')}\n`;
      }
    }

    // Insurance section
    if (parsed.source === 'insurance') {
      msg += `<b>━━ INSURANCE INFO FROM readycarriers ━━</b>\n`;
      if (result.actions.insurance_found.length > 0) {
        msg += result.actions.insurance_found.join('\n') + '\n';
      } else {
        msg += 'ℹ️ No equipment info found\n';
      }
    }

    // Current status
    msg += `\n<b>━━ CURRENT INSURANCE STATUS ━━</b>\n`;
    msg += `🚗 Active Trucks: ${currentStatus.trucks.length} (${currentStatus.trucks.slice(0, 5).join(', ')}${currentStatus.trucks.length > 5 ? '...' : ''})\n`;
    msg += `🚐 Active Trailers: ${currentStatus.trailers.length} (${currentStatus.trailers.slice(0, 5).join(', ')}${currentStatus.trailers.length > 5 ? '...' : ''})\n`;

    msg += `\n<b>→ Review in ReadyTMS:</b> /insurance`;

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

    // Check if email is from monitored sources
    const isMonitored = Object.values(MONITORED_EMAILS).some(email =>
      sender && sender.includes(email)
    );

    if (!isMonitored) {
      return res.status(403).json({
        error: `Email not from monitored sources. Expected: ${Object.values(MONITORED_EMAILS).join(', ')}`
      });
    }

    const result = await processEmail({ subject, sender, body, date });
    res.json(result);
  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).json({ error: error.message });
  }
};
