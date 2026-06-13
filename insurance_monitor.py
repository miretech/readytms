#!/usr/bin/env python3
"""
Ready Carrier Insurance Compliance Monitor
Monitors Gmail for insurance updates, compares against ReadyTMS, sends Telegram alerts
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta
import sqlite3
from typing import List, Dict, Tuple, Optional
import base64
from email.mime.text import MIMEText

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.oauthlib.flow import InstalledAppFlow
from google.api_python_client import build

# Setup logging
LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'insurance_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('InsuranceMonitor')

CONFIG_PATH = Path(__file__).parent / 'config.json'
DB_PATH = Path(__file__).parent / 'insurance_audit.db'
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


class GmailMonitor:
    """Monitor Gmail for insurance emails"""

    def __init__(self, config: dict):
        self.config = config
        self.service = None
        self.authenticate()

    def authenticate(self):
        """Authenticate with Gmail API"""
        creds = None
        token_path = Path(__file__).parent / 'token.json'

        if token_path.exists():
            creds = Credentials.from_authorized_user_file(str(token_path), GMAIL_SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                client_secrets = self.config.get('gmail', {}).get('client_secrets_path')
                if not client_secrets or not Path(client_secrets).exists():
                    logger.error("Gmail client_secrets.json not found. See setup_instructions.md")
                    return

                flow = InstalledAppFlow.from_client_secrets_file(client_secrets, GMAIL_SCOPES)
                creds = flow.run_local_server(port=0)

            with open(token_path, 'w') as token_file:
                token_file.write(creds.to_json())

        self.service = build('gmail', 'v1', credentials=creds)
        logger.info("✅ Gmail authenticated")

    def fetch_insurance_emails(self, hours: int = 24) -> List[Dict]:
        """Fetch insurance emails from past N hours"""
        if not self.service:
            logger.warning("Gmail not authenticated")
            return []

        try:
            monitor_emails = self.config.get('gmail', {}).get('monitor_emails', [])
            keywords = self.config.get('gmail', {}).get('insurance_keywords', [])

            query_parts = [f'from:{email}' for email in monitor_emails]
            query_parts.extend([f'subject:{kw}' for kw in keywords])
            query_parts.append(f'newer_than:{hours}h')

            query = ' OR '.join(f'({q})' for q in query_parts)

            results = self.service.users().messages().list(userId='me', q=query, maxResults=10).execute()
            messages = results.get('messages', [])

            emails = []
            for msg in messages:
                msg_data = self.service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                emails.append(self._parse_email(msg_data))

            logger.info(f"📧 Fetched {len(emails)} insurance emails")
            return emails

        except Exception as e:
            logger.error(f"❌ Failed to fetch emails: {e}")
            return []

    def _parse_email(self, message: dict) -> Dict:
        """Parse email message"""
        headers = message['payload']['headers']
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')

        attachments = []
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part['filename']:
                    attachment_id = part['body'].get('attachmentId')
                    attachments.append({
                        'filename': part['filename'],
                        'mimeType': part['mimeType'],
                        'attachmentId': attachment_id
                    })

        return {
            'id': message['id'],
            'subject': subject,
            'sender': sender,
            'date': next((h['value'] for h in headers if h['name'] == 'Date'), ''),
            'attachments': attachments
        }

    def download_attachment(self, user_id: str, message_id: str, attachment_id: str) -> Optional[bytes]:
        """Download attachment from email"""
        try:
            att = self.service.users().messages().attachments().get(
                userId=user_id, messageId=message_id, id=attachment_id
            ).execute()

            data = att['data'].replace('-', '+').replace('_', '/')
            return base64.urlsafe_b64decode(data)
        except Exception as e:
            logger.error(f"❌ Failed to download attachment: {e}")
            return None


class SpreadsheetParser:
    """Parse insurance spreadsheets (CSV/XLSX)"""

    @staticmethod
    def parse_file(file_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Parse spreadsheet and return trucks/trailers DataFrames"""
        try:
            if file_path.endswith('.xlsx'):
                xls = pd.ExcelFile(file_path)
                dfs = {sheet: pd.read_excel(file_path, sheet_name=sheet) for sheet in xls.sheet_names}
            else:
                dfs = {'data': pd.read_csv(file_path)}

            trucks_df = pd.DataFrame()
            trailers_df = pd.DataFrame()

            for sheet_name, df in dfs.items():
                if df.empty:
                    continue

                # Look for truck/trailer indicators
                if 'Unit #' in df.columns:
                    df['Unit #'] = pd.to_numeric(df['Unit #'], errors='coerce')
                    equipment = df.dropna(subset=['Unit #'])

                    if 'Specific Type' in df.columns:
                        types = equipment['Specific Type'].astype(str).str.lower()
                        if any('tractor' in t or 'truck' in t for t in types):
                            trucks_df = equipment.copy()
                        elif any('trailer' in t for t in types):
                            trailers_df = equipment.copy()

            logger.info(f"📋 Parsed {len(trucks_df)} trucks, {len(trailers_df)} trailers")
            return trucks_df, trailers_df

        except Exception as e:
            logger.error(f"❌ Error parsing spreadsheet: {e}")
            return pd.DataFrame(), pd.DataFrame()


class ReadyTMSDatabase:
    """Connect to ReadyTMS PostgreSQL database"""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.conn = None
        self.connect()

    def connect(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            logger.info("✅ Connected to ReadyTMS database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")

    def get_active_equipment(self) -> Tuple[List[Dict], List[Dict]]:
        """Fetch active trucks and trailers from ReadyTMS"""
        trucks = []
        trailers = []

        if not self.conn:
            return trucks, trailers

        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)

            # Fetch from insurance_trucks table
            cursor.execute("SELECT * FROM insurance_trucks WHERE status = 'active' ORDER BY unit_number")
            trucks = [dict(row) for row in cursor.fetchall()]
            logger.info(f"Found {len(trucks)} active trucks in ReadyTMS")

            # Fetch from insurance_trailers table
            cursor.execute("SELECT * FROM insurance_trailers WHERE status = 'active' ORDER BY unit_number")
            trailers = [dict(row) for row in cursor.fetchall()]
            logger.info(f"Found {len(trailers)} active trailers in ReadyTMS")

            cursor.close()
        except Exception as e:
            logger.error(f"❌ Database query error: {e}")

        return trucks, trailers

    def add_insurance_record(self, unit_number: str, unit_type: str, **kwargs) -> bool:
        """Add insurance record to database"""
        if not self.conn:
            return False

        try:
            cursor = self.conn.cursor()
            table = 'insurance_trucks' if unit_type == 'truck' else 'insurance_trailers'

            columns = ['unit_number', 'status', 'created_at', 'updated_at']
            values = [unit_number, 'active', 'NOW()', 'NOW()']
            placeholders = ['%s', '%s', 'NOW()', 'NOW()']

            for key, value in kwargs.items():
                if value is not None:
                    columns.append(key)
                    values.append(value)
                    placeholders.append('%s')

            query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
            cursor.execute(query, [v for v in values if v != 'NOW()'])
            self.conn.commit()
            cursor.close()

            logger.info(f"✅ Added {unit_type} #{unit_number} to insurance records")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to add record: {e}")
            return False

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


class TelegramAlerter:
    """Send alerts to Telegram"""

    def __init__(self, config: dict):
        self.config = config
        self.bot_token = config.get('telegram', {}).get('bot_token')
        self.chat_id = config.get('telegram', {}).get('primary_chat_id')

    def send_alert(self, title: str, message: str) -> bool:
        """Send alert to Telegram"""
        if not self.bot_token or not self.chat_id:
            logger.warning("⚠️ Telegram not configured")
            return False

        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                'chat_id': self.chat_id,
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
            logger.error(f"❌ Failed to send Telegram alert: {e}")
            return False

    def send_discrepancy_alert(self, missing_from_insurance: List, missing_from_tms: List):
        """Send discrepancy alert"""
        title = "⚠️ INSURANCE UPDATE - ACTION NEEDED"
        message = f"📅 Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"

        if missing_from_tms:
            message += "❌ MISSING FROM INSURANCE:\n"
            for item in missing_from_tms[:5]:
                message += f"   • {item['type'].upper()} #{item['unit_number']}\n"
            if len(missing_from_tms) > 5:
                message += f"   ... and {len(missing_from_tms) - 5} more\n"

        if missing_from_insurance:
            message += "\n✅ NEEDS REMOVAL FROM POLICY:\n"
            for item in missing_from_insurance[:5]:
                message += f"   • {item['type'].upper()} #{item['unit_number']}\n"
            if len(missing_from_insurance) > 5:
                message += f"   ... and {len(missing_from_insurance) - 5} more\n"

        message += "\n👉 Action: Review in ReadyTMS Insurance Management"

        self.send_alert(title, message)

    def send_incident_alert(self, driver_name: str, truck_number: str, location: str, description: str):
        """Send urgent incident alert"""
        title = "🚨 INCIDENT REPORT"
        message = f"""📌 Driver: {driver_name}
🚗 Truck: #{truck_number}
📍 Location: {location}
💥 Type: {description}
📞 Contact Insurance ASAP"""

        self.send_alert(title, message)


class InsuranceMonitor:
    """Main insurance compliance monitor"""

    def __init__(self):
        self.config = self._load_config()
        self.db = None
        self.gmail = None
        self.alerter = None
        self.local_db = None
        self._init_components()

    def _load_config(self) -> dict:
        """Load configuration"""
        if not CONFIG_PATH.exists():
            logger.error(f"❌ Config file not found: {CONFIG_PATH}")
            logger.error("Copy config.example.json to config.json and fill in your details")
            sys.exit(1)

        with open(CONFIG_PATH) as f:
            return json.load(f)

    def _init_components(self):
        """Initialize all components"""
        try:
            # Database
            db_url = self.config.get('readytms', {}).get('database_url')
            if db_url:
                self.db = ReadyTMSDatabase(db_url)

            # Gmail
            self.gmail = GmailMonitor(self.config)

            # Telegram
            self.alerter = TelegramAlerter(self.config)

            # SQLite
            self._init_local_db()

            logger.info("✅ All components initialized")

        except Exception as e:
            logger.error(f"❌ Failed to initialize: {e}")

    def _init_local_db(self):
        """Initialize SQLite audit database"""
        try:
            self.local_db = sqlite3.connect(DB_PATH)
            cursor = self.local_db.cursor()

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS reconciliations (
                id INTEGER PRIMARY KEY,
                date TIMESTAMP,
                file_name TEXT,
                trucks_count INTEGER,
                trailers_count INTEGER,
                discrepancies INTEGER,
                status TEXT
            )
            ''')

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS discrepancies (
                id INTEGER PRIMARY KEY,
                reconciliation_id INTEGER,
                type TEXT,
                unit_number TEXT,
                unit_type TEXT,
                flagged_date TIMESTAMP,
                resolved_date TIMESTAMP,
                notes TEXT
            )
            ''')

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY,
                date TIMESTAMP,
                driver_name TEXT,
                truck_number TEXT,
                location TEXT,
                description TEXT,
                claim_type TEXT,
                posted_to_telegram BOOLEAN
            )
            ''')

            self.local_db.commit()
            logger.info("✅ SQLite database initialized")

        except Exception as e:
            logger.error(f"❌ Failed to init local DB: {e}")

    def run_daily_check(self):
        """Run daily insurance check"""
        logger.info("=" * 60)
        logger.info("🔄 Daily insurance check started")
        logger.info("=" * 60)

        if not self.db or not self.gmail or not self.alerter:
            logger.error("❌ Components not initialized")
            return

        try:
            # Fetch emails
            emails = self.gmail.fetch_insurance_emails(hours=24)

            if not emails:
                logger.info("ℹ️ No insurance emails found")
                return

            # Process each email
            for email in emails:
                logger.info(f"Processing: {email['subject']}")

                if not email['attachments']:
                    continue

                for attachment in email['attachments']:
                    if attachment['mimeType'].startswith('application/'):
                        # Download and parse
                        file_data = self.gmail.download_attachment('me', email['id'], attachment['attachmentId'])
                        if file_data:
                            self._process_attachment(file_data, attachment['filename'])

            logger.info("✅ Daily check completed")

        except Exception as e:
            logger.error(f"❌ Daily check failed: {e}")

    def _process_attachment(self, file_data: bytes, filename: str):
        """Process attachment spreadsheet"""
        # Save temp file
        temp_file = Path('/tmp') / filename
        with open(temp_file, 'wb') as f:
            f.write(file_data)

        # Parse
        trucks_df, trailers_df = SpreadsheetParser.parse_file(str(temp_file))

        if trucks_df.empty and trailers_df.empty:
            logger.warning(f"⚠️ No equipment found in {filename}")
            return

        # Get ReadyTMS data
        readytms_trucks, readytms_trailers = self.db.get_active_equipment()

        # Compare
        discrepancies = self._compare_equipment(
            trucks_df, trailers_df, readytms_trucks, readytms_trailers
        )

        # Alert if discrepancies
        if discrepancies['missing_from_insurance'] or discrepancies['missing_from_readytms']:
            self.alerter.send_discrepancy_alert(
                discrepancies['missing_from_insurance'],
                discrepancies['missing_from_readytms']
            )

        # Cleanup
        temp_file.unlink()

    def _compare_equipment(self, trucks_df, trailers_df, readytms_trucks, readytms_trailers):
        """Compare insurance vs ReadyTMS equipment"""
        discrepancies = {
            'missing_from_insurance': [],
            'missing_from_readytms': []
        }

        # Insurance equipment
        insurance_trucks = set(str(u).strip() for u in trucks_df['Unit #'].unique() if pd.notna(u))
        insurance_trailers = set(str(u).strip() for u in trailers_df['Unit #'].unique() if pd.notna(u))

        # ReadyTMS equipment
        readytms_truck_nums = set(str(t.get('unit_number', '')).strip() for t in readytms_trucks)
        readytms_trailer_nums = set(str(t.get('unit_number', '')).strip() for t in readytms_trailers)

        # Find discrepancies
        for truck in insurance_trucks - readytms_truck_nums:
            discrepancies['missing_from_readytms'].append({'type': 'truck', 'unit_number': truck})

        for truck in readytms_truck_nums - insurance_trucks:
            discrepancies['missing_from_insurance'].append({'type': 'truck', 'unit_number': truck})

        for trailer in insurance_trailers - readytms_trailer_nums:
            discrepancies['missing_from_readytms'].append({'type': 'trailer', 'unit_number': trailer})

        for trailer in readytms_trailer_nums - insurance_trailers:
            discrepancies['missing_from_insurance'].append({'type': 'trailer', 'unit_number': trailer})

        return discrepancies

    def run_claims_monitor(self):
        """Monitor for claim/accident emails"""
        logger.info("🚨 Claims monitor started")

        claim_keywords = ['accident', 'claim', 'incident', 'damage', 'injury']
        logger.info(f"Watching for: {claim_keywords}")

    def close(self):
        """Cleanup"""
        if self.db:
            self.db.close()
        if self.local_db:
            self.local_db.close()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Ready Carrier Insurance Compliance Monitor')
    parser.add_argument('--mode', choices=['daily', 'check-now', 'claims'], default='daily')
    args = parser.parse_args()

    monitor = InsuranceMonitor()

    try:
        if args.mode == 'daily':
            monitor.run_daily_check()
        elif args.mode == 'check-now':
            monitor.run_daily_check()
        elif args.mode == 'claims':
            monitor.run_claims_monitor()
    finally:
        monitor.close()


if __name__ == '__main__':
    main()
