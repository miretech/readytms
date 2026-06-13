#!/usr/bin/env python3
"""
Insurance Unified Monitor
Monitors 3 email sources and auto-updates insurance tables locally
Runs on Mac mini, no cloud services needed
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
import sqlite3
import imaplib
from email.parser import BytesParser
from email import policy
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import re

# Setup logging
LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'insurance_unified.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('InsuranceUnified')

CONFIG_PATH = Path(__file__).parent / 'config.json'
SEEN_DB = Path(__file__).parent / 'seen_emails.db'

# Email sources
EMAIL_SOURCES = {
    'trailers': 'northex10@gmail.com',
    'insurance': 'readycarriers@gmail.com',
    'commands': 'info@readycarrier.com'
}

# Keywords that flag an email as insurance-relevant
INSURANCE_KEYWORDS = [
    'add truck', 'remove truck', 'add trailer', 'remove trailer',
    'add driver', 'unit list', 'insurance', 'policy', 'coverage',
    'certificate', 'trailer interchange', 'fleet update'
]


class SeenEmailTracker:
    """Track which emails have already been processed"""

    def __init__(self):
        conn = sqlite3.connect(SEEN_DB)
        conn.execute('''CREATE TABLE IF NOT EXISTS seen_emails
                        (uid TEXT PRIMARY KEY, source TEXT, subject TEXT, processed_at TEXT)''')
        conn.commit()
        conn.close()

    def is_seen(self, uid):
        conn = sqlite3.connect(SEEN_DB)
        result = conn.execute('SELECT 1 FROM seen_emails WHERE uid = ?', (uid,)).fetchone()
        conn.close()
        return result is not None

    def mark_seen(self, uid, source, subject):
        conn = sqlite3.connect(SEEN_DB)
        conn.execute('INSERT OR IGNORE INTO seen_emails VALUES (?, ?, ?, ?)',
                     (uid, source, subject, datetime.now().isoformat()))
        conn.commit()
        conn.close()


class UnifiedEmailMonitor:
    """Monitor all 3 email sources"""

    def __init__(self, config):
        self.config = config
        self.imap = None
        self.tracker = SeenEmailTracker()
        self._authenticate()
        self.db = self._connect_db()

    def _authenticate(self):
        """Authenticate with Gmail via IMAP"""
        try:
            email = self.config.get('gmail', {}).get('email')
            app_password = self.config.get('gmail', {}).get('app_password')

            if not email or not app_password:
                logger.error("Gmail email and app_password required in config.json")
                return

            self.imap = imaplib.IMAP4_SSL('imap.gmail.com')
            self.imap.login(email, app_password)
            logger.info("✅ Gmail authenticated via IMAP")
        except Exception as e:
            logger.error(f"❌ Gmail authentication failed: {e}")
            self.imap = None

    def _connect_db(self):
        """Connect to PostgreSQL"""
        try:
            conn = psycopg2.connect(
                self.config.get('readytms', {}).get('database_url')
            )
            logger.info("✅ Connected to ReadyTMS database")
            return conn
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            return None

    def fetch_emails_by_source(self, source_name):
        """Fetch only NEW unseen insurance-relevant emails from specific source"""
        if not self.imap:
            return []

        try:
            self.imap.select('INBOX')
            source_email = EMAIL_SOURCES.get(source_name)

            # Only fetch UNSEEN emails from this sender
            search_str = f'(UNSEEN FROM "{source_email}")'
            status, messages = self.imap.search(None, search_str)
            message_ids = messages[0].split()

            logger.info(f"Found {len(message_ids)} unread emails from {source_email}")

            emails = []
            for msg_id in message_ids:
                try:
                    # Fetch headers first to check subject (cheaper)
                    status, hdr_data = self.imap.fetch(msg_id, '(BODY[HEADER.FIELDS (SUBJECT FROM DATE MESSAGE-ID)])')
                    if not hdr_data or not hdr_data[0]:
                        continue

                    hdr_msg = BytesParser(policy=policy.default).parsebytes(hdr_data[0][1])
                    subject = hdr_msg.get('Subject', '')
                    msg_id_str = hdr_msg.get('Message-ID', str(msg_id))

                    # Skip if already processed
                    if self.tracker.is_seen(msg_id_str):
                        continue

                    # For insurance/readycarriers: only process if subject has insurance keywords
                    if source_name == 'insurance':
                        if not any(kw.lower() in subject.lower() for kw in INSURANCE_KEYWORDS):
                            # Mark seen so we skip it next time too
                            self.tracker.mark_seen(msg_id_str, source_name, subject)
                            continue

                    # Fetch full email
                    status, msg_data = self.imap.fetch(msg_id, '(RFC822)')
                    if not msg_data or not msg_data[0]:
                        continue

                    email_msg = BytesParser(policy=policy.default).parsebytes(msg_data[0][1])
                    parsed = self._parse_email(email_msg)
                    parsed['uid'] = msg_id_str
                    emails.append(parsed)

                except Exception as e:
                    logger.warning(f"Could not parse email {msg_id}: {e}")

            logger.info(f"📧 {len(emails)} new relevant emails from {source_name}")
            return emails

        except Exception as e:
            logger.error(f"❌ Failed to fetch emails: {e}")
            return []

    def _parse_email(self, msg):
        """Parse email message"""
        subject = msg.get('Subject', 'No Subject')
        sender = msg.get('From', 'Unknown')
        date_str = msg.get('Date', 'Unknown')

        # Get email body
        body = ""
        if msg.is_multipart():
            for part in msg.iter_parts():
                if part.get_content_type() == 'text/plain':
                    body = part.get_content()
                    break
        else:
            body = msg.get_content()

        return {
            'id': f"{subject}_{sender}_{datetime.now().timestamp()}",
            'subject': subject,
            'sender': sender,
            'date': date_str,
            'body': body[:1000]
        }

    def parse_trailers_email(self, body):
        """Parse trailers from northex10 email"""
        trailers = []

        # Simple format: TR-001, TR-002
        pattern = r'TR[-\s]?(\d+[A-Z0-9]*)'
        matches = re.findall(pattern, body, re.IGNORECASE)
        for match in matches:
            trailer_num = f"TR-{match}" if not match.startswith('TR') else match
            trailers.append({'unit_number': trailer_num, 'status': 'active'})

        # CSV format
        lines = body.split('\n')
        for line in lines[1:]:
            if ',' in line:
                parts = [p.strip() for p in line.split(',')]
                if parts and re.match(r'^TR[-\s]?', parts[0], re.IGNORECASE):
                    trailer_num = parts[0].upper()
                    status = parts[1].lower() if len(parts) > 1 else 'active'
                    trailers.append({'unit_number': trailer_num, 'status': status})

        return trailers

    def parse_insurance_email(self, body):
        """Parse insurance info from readycarriers email"""
        info = []

        # Find trucks
        truck_pattern = r'(?:truck|unit|tractor)\s+#?(\d+)'
        for match in re.finditer(truck_pattern, body, re.IGNORECASE):
            info.append({'type': 'truck', 'number': match.group(1)})

        # Find trailers
        trailer_pattern = r'trailer\s+#?([A-Z0-9\-]+)'
        for match in re.finditer(trailer_pattern, body, re.IGNORECASE):
            info.append({'type': 'trailer', 'number': match.group(1)})

        # Find drivers
        driver_pattern = r'driver[:\s]+([A-Za-z\s]+?)(?:\n|,|$)'
        for match in re.finditer(driver_pattern, body, re.IGNORECASE):
            name = match.group(1).strip()
            if len(name) > 2 and name.lower() not in ['driver', 'name']:
                info.append({'type': 'driver', 'name': name})

        return info

    def parse_commands_email(self, body):
        """Parse commands from info@ email"""
        commands = {
            'trucks_to_add': [],
            'trucks_to_remove': [],
            'trailers_to_add': [],
            'trailers_to_remove': [],
            'drivers_to_add': []
        }

        # Add trucks
        pattern = r'add\s+truck\s+#?(\d+)'
        for match in re.finditer(pattern, body, re.IGNORECASE):
            commands['trucks_to_add'].append(match.group(1))

        # Remove trucks
        pattern = r'remove\s+truck\s+#?(\d+)'
        for match in re.finditer(pattern, body, re.IGNORECASE):
            commands['trucks_to_remove'].append(match.group(1))

        # Add trailers
        pattern = r'add\s+trailer\s+#?([A-Z0-9\-]+)'
        for match in re.finditer(pattern, body, re.IGNORECASE):
            commands['trailers_to_add'].append(match.group(1))

        # Remove trailers
        pattern = r'remove\s+trailer\s+#?([A-Z0-9\-]+)'
        for match in re.finditer(pattern, body, re.IGNORECASE):
            commands['trailers_to_remove'].append(match.group(1))

        # Add drivers
        pattern = r'add\s+driver\s+([A-Za-z\s]+?)(?:\n|$)'
        for match in re.finditer(pattern, body, re.IGNORECASE):
            name = match.group(1).strip()
            if name:
                commands['drivers_to_add'].append(name)

        return commands

    def add_trailer(self, unit_number, vin=None, year=None, make=None, model=None, status='active'):
        """Add trailer to insurance_trailers"""
        try:
            cursor = self.db.cursor()
            cursor.execute(
                """INSERT INTO insurance_trailers
                     (unit_number, vin, year, make, model, status, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                   ON CONFLICT (unit_number) DO UPDATE
                     SET status = EXCLUDED.status,
                         vin = COALESCE(EXCLUDED.vin, insurance_trailers.vin),
                         year = COALESCE(EXCLUDED.year, insurance_trailers.year),
                         make = COALESCE(EXCLUDED.make, insurance_trailers.make),
                         model = COALESCE(EXCLUDED.model, insurance_trailers.model),
                         updated_at = NOW()""",
                (unit_number, vin, year, make, model, status)
            )
            self.db.commit()
            cursor.close()
            logger.info(f"✅ Added trailer: {unit_number}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to add trailer {unit_number}: {e}")
            self.db.rollback()
            return False

    def add_truck(self, unit_number, vin=None, year=None, make=None, model=None, status='active'):
        """Add truck to insurance_trucks"""
        try:
            cursor = self.db.cursor()
            cursor.execute(
                """INSERT INTO insurance_trucks
                     (unit_number, vin, year, make, model, status, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                   ON CONFLICT (unit_number) DO UPDATE
                     SET status = EXCLUDED.status,
                         vin = COALESCE(EXCLUDED.vin, insurance_trucks.vin),
                         year = COALESCE(EXCLUDED.year, insurance_trucks.year),
                         make = COALESCE(EXCLUDED.make, insurance_trucks.make),
                         model = COALESCE(EXCLUDED.model, insurance_trucks.model),
                         updated_at = NOW()""",
                (unit_number, vin, year, make, model, status)
            )
            self.db.commit()
            cursor.close()
            logger.info(f"✅ Added truck: {unit_number}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to add truck {unit_number}: {e}")
            self.db.rollback()
            return False

    def remove_truck(self, unit_number):
        """Remove truck from insurance_trucks"""
        try:
            cursor = self.db.cursor()
            cursor.execute(
                """UPDATE insurance_trucks SET status = 'removed', updated_at = NOW()
                   WHERE unit_number = %s""",
                (unit_number,)
            )
            self.db.commit()
            cursor.close()
            logger.info(f"❌ Removed truck: {unit_number}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to remove truck {unit_number}: {e}")
            self.db.rollback()
            return False

    def remove_trailer(self, unit_number):
        """Remove trailer from insurance_trailers"""
        try:
            cursor = self.db.cursor()
            cursor.execute(
                """UPDATE insurance_trailers SET status = 'removed', updated_at = NOW()
                   WHERE unit_number = %s""",
                (unit_number,)
            )
            self.db.commit()
            cursor.close()
            logger.info(f"❌ Removed trailer: {unit_number}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to remove trailer {unit_number}: {e}")
            self.db.rollback()
            return False

    def _status_line(self):
        """Return a compact current status string"""
        s = self.get_current_status()
        return (f"🚗 Active Trucks: {len(s['trucks'])} | "
                f"🚐 Active Trailers: {len(s['trailers'])}")

    def get_current_status(self):
        """Get current insurance status"""
        try:
            cursor = self.db.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT unit_number FROM insurance_trucks WHERE status = 'active'")
            trucks = [row['unit_number'] for row in cursor.fetchall()]

            cursor.execute("SELECT unit_number FROM insurance_trailers WHERE status = 'active'")
            trailers = [row['unit_number'] for row in cursor.fetchall()]

            cursor.close()
            return {'trucks': trucks, 'trailers': trailers}
        except Exception as e:
            logger.error(f"❌ Failed to get status: {e}")
            return {'trucks': [], 'trailers': []}

    def send_telegram(self, title, message):
        """Send Telegram alert"""
        try:
            bot_token = self.config.get('telegram', {}).get('bot_token')
            chat_id = self.config.get('telegram', {}).get('primary_chat_id')

            if not bot_token or not chat_id:
                logger.warning("⚠️ Telegram not configured")
                return False

            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                'chat_id': chat_id,
                'text': f"{title}\n{message}",
                'parse_mode': 'HTML'
            }

            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info("✅ Telegram alert sent")
                return True
            else:
                logger.error(f"❌ Telegram error: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram: {e}")
            return False

    def monitor(self):
        """Monitor all email sources"""
        logger.info("=" * 70)
        logger.info("🔄 Insurance Unified Monitor Started")
        logger.info("=" * 70)

        # Get current status
        current = self.get_current_status()

        # ========== SOURCE 1: TRAILERS (northex10) ==========
        logger.info("\n📧 Checking northex10@gmail.com (trailers)...")
        trailer_emails = self.fetch_emails_by_source('trailers')

        trailers_added = []
        for email in trailer_emails:
            trailers = self.parse_trailers_email(email['body'])
            for trailer in trailers:
                if self.add_trailer(trailer['unit_number']):
                    trailers_added.append(trailer['unit_number'])
            self.tracker.mark_seen(email['uid'], 'trailers', email['subject'])

        if trailers_added:
            msg = f"✅ Trailers Added: {', '.join(trailers_added)}\n\n"
            msg += self._status_line()
            self.send_telegram("📧 TRAILERS FROM northex10", msg)

        # ========== SOURCE 2: INSURANCE (readycarriers) ==========
        logger.info("\n📧 Checking readycarriers@gmail.com (insurance)...")
        insurance_emails = self.fetch_emails_by_source('insurance')

        for email in insurance_emails:
            info = self.parse_insurance_email(email['body'])
            insurance_found = []
            for item in info:
                if item['type'] == 'truck':
                    insurance_found.append(f"🚗 Truck {item['number']}")
                elif item['type'] == 'trailer':
                    insurance_found.append(f"🚐 Trailer {item['number']}")
                elif item['type'] == 'driver':
                    insurance_found.append(f"👤 {item['name']}")
            self.tracker.mark_seen(email['uid'], 'insurance', email['subject'])

            if insurance_found:
                msg = f"<b>Subject:</b> {email['subject']}\n\n"
                msg += '\n'.join(insurance_found)
                msg += f"\n\n{self._status_line()}"
                self.send_telegram("ℹ️ INSURANCE EMAIL FROM readycarriers", msg)

        # ========== SOURCE 3: COMMANDS (info@) ==========
        logger.info("\n📧 Checking info@readycarrier.com (commands)...")
        command_emails = self.fetch_emails_by_source('commands')

        for email in command_emails:
            commands = self.parse_commands_email(email['body'])
            trucks_added, trucks_removed = [], []
            trailers_added, trailers_removed = [], []

            for truck in commands['trucks_to_add']:
                if self.add_truck(truck):
                    trucks_added.append(truck)
            for truck in commands['trucks_to_remove']:
                if self.remove_truck(truck):
                    trucks_removed.append(truck)
            for trailer in commands['trailers_to_add']:
                if self.add_trailer(trailer):
                    trailers_added.append(trailer)
            for trailer in commands['trailers_to_remove']:
                if self.remove_trailer(trailer):
                    trailers_removed.append(trailer)

            self.tracker.mark_seen(email['uid'], 'commands', email['subject'])

            if trucks_added or trucks_removed or trailers_added or trailers_removed or commands['drivers_to_add']:
                msg = f"<b>Subject:</b> {email['subject']}\n\n"
                if trucks_added:    msg += f"✅ Trucks Added: {', '.join(trucks_added)}\n"
                if trucks_removed:  msg += f"❌ Trucks Removed: {', '.join(trucks_removed)}\n"
                if trailers_added:  msg += f"✅ Trailers Added: {', '.join(trailers_added)}\n"
                if trailers_removed: msg += f"❌ Trailers Removed: {', '.join(trailers_removed)}\n"
                if commands['drivers_to_add']: msg += f"👤 Drivers: {', '.join(commands['drivers_to_add'])}\n"
                msg += f"\n{self._status_line()}"
                self.send_telegram("⚙️ COMMANDS EXECUTED FROM info@", msg)
            else:
                logger.info(f"ℹ️ No insurance commands found in: {email['subject']}")

        # ========== FINAL LOG ==========
        updated = self.get_current_status()
        logger.info(f"🚗 Active Trucks: {len(updated['trucks'])} | 🚐 Active Trailers: {len(updated['trailers'])}")
        logger.info("✅ Monitor completed")

    def close(self):
        """Close connections"""
        if self.imap:
            self.imap.close()
            self.imap.logout()
        if self.db:
            self.db.close()


def main():
    """Entry point"""
    if not CONFIG_PATH.exists():
        logger.error(f"❌ Config file not found: {CONFIG_PATH}")
        sys.exit(1)

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    monitor = UnifiedEmailMonitor(config)
    try:
        monitor.monitor()
    finally:
        monitor.close()


if __name__ == '__main__':
    main()
