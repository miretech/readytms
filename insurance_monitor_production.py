#!/usr/bin/env python3
"""
Ready Carrier Insurance Reconciliation Pipeline
Parses insurance spreadsheets, reconciles with ReadyTMS, auto-populates insurance_records
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
import tempfile

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
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
        logging.FileHandler(LOG_DIR / 'insurance_reconciliation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('InsuranceReconciliation')

CONFIG_PATH = Path(__file__).parent / 'config.json'
DB_PATH = Path(__file__).parent / 'insurance_audit.db'
GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


class GmailClient:
    """Gmail integration for fetching insurance emails"""

    def __init__(self, config: dict):
        self.config = config
        self.service = None
        self._authenticate()

    def _authenticate(self):
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
                    logger.error("Gmail client_secrets.json not found")
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
            logger.info(f"Searching Gmail with query: {query}")

            results = self.service.users().messages().list(userId='me', q=query, maxResults=10).execute()
            messages = results.get('messages', [])

            emails = []
            for msg in messages:
                msg_data = self.service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                emails.append(self._parse_email(msg_data))

            logger.info(f"📧 Found {len(emails)} insurance emails")
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
                if part.get('filename'):
                    attachment_id = part['body'].get('attachmentId')
                    if attachment_id:
                        attachments.append({
                            'filename': part['filename'],
                            'mimeType': part['mimeType'],
                            'attachmentId': attachment_id
                        })

        return {
            'id': message['id'],
            'subject': subject,
            'sender': sender,
            'attachments': attachments
        }

    def download_attachment(self, message_id: str, attachment_id: str) -> Optional[bytes]:
        """Download attachment from email"""
        try:
            att = self.service.users().messages().attachments().get(
                userId='me', messageId=message_id, id=attachment_id
            ).execute()

            data = att['data'].replace('-', '+').replace('_', '/')
            return base64.urlsafe_b64decode(data)
        except Exception as e:
            logger.error(f"❌ Failed to download attachment: {e}")
            return None


class InsuranceParser:
    """Parse insurance spreadsheets"""

    @staticmethod
    def parse(file_path: str) -> Dict:
        """Parse spreadsheet and return trucks/drivers/trailers"""
        result = {
            'trucks': [],
            'drivers': [],
            'trailers': []
        }

        try:
            if file_path.endswith('.xlsx'):
                xls = pd.ExcelFile(file_path)
                dfs = {sheet: pd.read_excel(file_path, sheet_name=sheet) for sheet in xls.sheet_names}
            else:
                dfs = {'data': pd.read_csv(file_path)}

            for sheet_name, df in dfs.items():
                if df.empty:
                    continue

                # Parse trucks
                if 'Unit #' in df.columns or 'Truck #' in df.columns:
                    unit_col = 'Unit #' if 'Unit #' in df.columns else 'Truck #'
                    for _, row in df.iterrows():
                        unit_num = str(row[unit_col]).strip() if pd.notna(row[unit_col]) else None
                        if unit_num and unit_num != 'nan':
                            vin = str(row['VIN']).strip() if 'VIN' in df.columns and pd.notna(row['VIN']) else None
                            status = str(row['Status']).strip().lower() if 'Status' in df.columns and pd.notna(row['Status']) else 'active'

                            result['trucks'].append({
                                'truck_number': unit_num,
                                'vin': vin,
                                'status': status,
                                'effective_date': datetime.now().date()
                            })

                # Parse drivers
                if 'Driver Name' in df.columns or 'Driver' in df.columns:
                    driver_col = 'Driver Name' if 'Driver Name' in df.columns else 'Driver'
                    for _, row in df.iterrows():
                        driver_name = str(row[driver_col]).strip() if pd.notna(row[driver_col]) else None
                        if driver_name and driver_name != 'nan':
                            license_num = str(row['License #']).strip() if 'License #' in df.columns and pd.notna(row['License #']) else None
                            status = str(row['Status']).strip().lower() if 'Status' in df.columns and pd.notna(row['Status']) else 'active'

                            result['drivers'].append({
                                'name': driver_name,
                                'license_number': license_num,
                                'status': status,
                                'hire_date': datetime.now().date()
                            })

                # Parse trailers
                if 'Trailer #' in df.columns or 'Trailer Number' in df.columns:
                    trailer_col = 'Trailer #' if 'Trailer #' in df.columns else 'Trailer Number'
                    for _, row in df.iterrows():
                        trailer_num = str(row[trailer_col]).strip() if pd.notna(row[trailer_col]) else None
                        if trailer_num and trailer_num != 'nan':
                            status = str(row['Status']).strip().lower() if 'Status' in df.columns and pd.notna(row['Status']) else 'active'

                            result['trailers'].append({
                                'trailer_number': trailer_num,
                                'status': status
                            })

            logger.info(f"📋 Parsed: {len(result['trucks'])} trucks, {len(result['drivers'])} drivers, {len(result['trailers'])} trailers")
            return result

        except Exception as e:
            logger.error(f"❌ Error parsing spreadsheet: {e}")
            return result


class ReadyTMSClient:
    """Interact with ReadyTMS PostgreSQL database"""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.conn = None
        self._connect()

    def _connect(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            logger.info("✅ Connected to ReadyTMS database")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            sys.exit(1)

    def get_active_trucks(self) -> List[Dict]:
        """Fetch active trucks from ReadyTMS"""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT id, truck_number, vin, status FROM trucks WHERE status IN ('active', 'in-use', 'available')")
            trucks = [dict(row) for row in cursor.fetchall()]
            cursor.close()
            logger.info(f"Found {len(trucks)} active trucks in ReadyTMS")
            return trucks
        except Exception as e:
            logger.error(f"❌ Failed to fetch trucks: {e}")
            return []

    def get_active_drivers(self) -> List[Dict]:
        """Fetch active drivers from ReadyTMS"""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT id, name, license_number, status FROM drivers WHERE status IN ('active', 'available')")
            drivers = [dict(row) for row in cursor.fetchall()]
            cursor.close()
            logger.info(f"Found {len(drivers)} active drivers in ReadyTMS")
            return drivers
        except Exception as e:
            logger.error(f"❌ Failed to fetch drivers: {e}")
            return []

    def get_active_trailers(self) -> List[Dict]:
        """Fetch active trailers from ReadyTMS"""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT id, trailer_number, status FROM trailers WHERE status IN ('active', 'in-use', 'available')")
            trailers = [dict(row) for row in cursor.fetchall()]
            cursor.close()
            logger.info(f"Found {len(trailers)} active trailers in ReadyTMS")
            return trailers
        except Exception as e:
            logger.error(f"❌ Failed to fetch trailers: {e}")
            return []

    def add_insurance_record(self, truck_number: str, driver_name: str, effective_date, status: str = 'active') -> bool:
        """Add record to insurance_records table"""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """INSERT INTO insurance_records (truck_number, driver_name, effective_date, status)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (truck_number) DO UPDATE
                   SET driver_name = %s, effective_date = %s, status = %s""",
                (truck_number, driver_name, effective_date, status, driver_name, effective_date, status)
            )
            self.conn.commit()
            cursor.close()
            return True
        except Exception as e:
            logger.error(f"❌ Failed to add insurance record: {e}")
            self.conn.rollback()
            return False

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


class TelegramNotifier:
    """Send alerts to Telegram"""

    def __init__(self, config: dict):
        self.bot_token = config.get('telegram', {}).get('bot_token')
        self.chat_id = config.get('telegram', {}).get('primary_chat_id')

    def send(self, title: str, message: str) -> bool:
        """Send message to Telegram"""
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
            logger.error(f"❌ Failed to send alert: {e}")
            return False

    def send_discrepancies(self, discrepancies: Dict) -> bool:
        """Send discrepancy alert to Telegram"""
        missing_trucks = discrepancies.get('trucks', {}).get('missing_from_insurance', [])
        missing_drivers = discrepancies.get('drivers', {}).get('missing_from_insurance', [])
        missing_trailers = discrepancies.get('trailers', {}).get('missing_from_insurance', [])

        title = "⚠️ INSURANCE RECONCILIATION REPORT"
        message = f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"

        if missing_trucks:
            message += "❌ TRUCKS NOT IN INSURANCE:\n"
            for truck in missing_trucks[:5]:
                message += f"   • Truck #{truck['truck_number']}\n"
            if len(missing_trucks) > 5:
                message += f"   ... and {len(missing_trucks) - 5} more\n"

        if missing_drivers:
            message += "\n❌ DRIVERS NOT IN INSURANCE:\n"
            for driver in missing_drivers[:5]:
                message += f"   • {driver['name']}\n"
            if len(missing_drivers) > 5:
                message += f"   ... and {len(missing_drivers) - 5} more\n"

        if missing_trailers:
            message += "\n❌ TRAILERS NOT IN INSURANCE:\n"
            for trailer in missing_trailers[:5]:
                message += f"   • Trailer #{trailer['trailer_number']}\n"
            if len(missing_trailers) > 5:
                message += f"   ... and {len(missing_trailers) - 5} more\n"

        if not missing_trucks and not missing_drivers and not missing_trailers:
            message += "✅ All active equipment is covered by insurance!"

        message += "\n👉 Review in ReadyTMS Insurance Records"

        return self.send(title, message)


class InsuranceReconciliationPipeline:
    """Main reconciliation pipeline"""

    def __init__(self):
        self.config = self._load_config()
        self.gmail = GmailClient(self.config)
        self.db = ReadyTMSClient(self.config['readytms']['database_url'])
        self.notifier = TelegramNotifier(self.config)
        self._init_audit_db()

    def _load_config(self) -> dict:
        """Load configuration"""
        if not CONFIG_PATH.exists():
            logger.error(f"❌ Config file not found: {CONFIG_PATH}")
            sys.exit(1)

        with open(CONFIG_PATH) as f:
            return json.load(f)

    def _init_audit_db(self):
        """Initialize SQLite audit database"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS reconciliation_runs (
                id INTEGER PRIMARY KEY,
                run_date TIMESTAMP,
                trucks_in_insurance INTEGER,
                trucks_active INTEGER,
                drivers_in_insurance INTEGER,
                drivers_active INTEGER,
                trailers_in_insurance INTEGER,
                trailers_active INTEGER,
                discrepancies INTEGER,
                status TEXT
            )
            ''')

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS discrepancy_log (
                id INTEGER PRIMARY KEY,
                run_id INTEGER,
                type TEXT,
                identifier TEXT,
                in_readytms BOOLEAN,
                in_insurance BOOLEAN,
                flagged_date TIMESTAMP
            )
            ''')

            conn.commit()
            conn.close()
            logger.info("✅ Audit database initialized")

        except Exception as e:
            logger.error(f"❌ Failed to init audit DB: {e}")

    def run(self):
        """Execute reconciliation pipeline"""
        logger.info("=" * 70)
        logger.info("🔄 Insurance Reconciliation Pipeline Started")
        logger.info("=" * 70)

        try:
            # Fetch emails
            emails = self.gmail.fetch_insurance_emails(hours=24)

            if not emails:
                logger.info("ℹ️ No insurance emails found in past 24 hours")
                return

            # Process each email
            for email in emails:
                logger.info(f"Processing: {email['subject']}")

                if not email['attachments']:
                    logger.warning(f"⚠️ No attachments in {email['subject']}")
                    continue

                for attachment in email['attachments']:
                    self._process_attachment(email['id'], attachment)

            logger.info("✅ Pipeline completed successfully")

        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
        finally:
            self.db.close()

    def _process_attachment(self, message_id: str, attachment: Dict):
        """Process a single attachment"""
        # Download
        file_data = self.gmail.download_attachment(message_id, attachment['attachmentId'])
        if not file_data:
            return

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=Path(attachment['filename']).suffix, delete=False) as f:
            f.write(file_data)
            temp_path = f.name

        try:
            # Parse
            parsed = InsuranceParser.parse(temp_path)

            # Get ReadyTMS data
            readytms_trucks = self.db.get_active_trucks()
            readytms_drivers = self.db.get_active_drivers()
            readytms_trailers = self.db.get_active_trailers()

            # Compare and get discrepancies
            discrepancies = self._compare(parsed, readytms_trucks, readytms_drivers, readytms_trailers)

            # Add to insurance_records
            self._populate_records(parsed)

            # Send alerts if discrepancies
            if any(discrepancies['trucks']['missing_from_insurance']) or \
               any(discrepancies['drivers']['missing_from_insurance']) or \
               any(discrepancies['trailers']['missing_from_insurance']):
                self.notifier.send_discrepancies(discrepancies)

        finally:
            # Cleanup
            Path(temp_path).unlink()

    def _compare(self, parsed: Dict, readytms_trucks: List, readytms_drivers: List, readytms_trailers: List) -> Dict:
        """Compare insurance data with ReadyTMS"""
        # Extract numbers/names from ReadyTMS
        readytms_truck_nums = {t['truck_number'] for t in readytms_trucks}
        readytms_driver_names = {d['name'].lower() for d in readytms_drivers}
        readytms_trailer_nums = {t['trailer_number'] for t in readytms_trailers}

        # Extract from insurance
        insurance_truck_nums = {t['truck_number'] for t in parsed['trucks']}
        insurance_driver_names = {d['name'].lower() for d in parsed['drivers']}
        insurance_trailer_nums = {t['trailer_number'] for t in parsed['trailers']}

        return {
            'trucks': {
                'missing_from_insurance': [t for t in readytms_trucks if t['truck_number'] not in insurance_truck_nums],
                'not_in_readytms': [t for t in parsed['trucks'] if t['truck_number'] not in readytms_truck_nums]
            },
            'drivers': {
                'missing_from_insurance': [d for d in readytms_drivers if d['name'].lower() not in insurance_driver_names],
                'not_in_readytms': [d for d in parsed['drivers'] if d['name'].lower() not in readytms_driver_names]
            },
            'trailers': {
                'missing_from_insurance': [t for t in readytms_trailers if t['trailer_number'] not in insurance_trailer_nums],
                'not_in_readytms': [t for t in parsed['trailers'] if t['trailer_number'] not in readytms_trailer_nums]
            }
        }

    def _populate_records(self, parsed: Dict):
        """Add insurance records to database"""
        for truck in parsed['trucks']:
            self.db.add_insurance_record(
                truck['truck_number'],
                'Unknown',  # No driver info in truck records
                truck.get('effective_date', datetime.now().date()),
                truck.get('status', 'active')
            )

        logger.info(f"✅ Added {len(parsed['trucks'])} trucks to insurance_records")


def main():
    """Entry point"""
    parser = argparse.ArgumentParser(description='Insurance Reconciliation Pipeline')
    parser.add_argument('--mode', choices=['daily', 'check-now', 'manual'], default='daily')
    args = parser.parse_args()

    pipeline = InsuranceReconciliationPipeline()
    pipeline.run()


if __name__ == '__main__':
    main()
