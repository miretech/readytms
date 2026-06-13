#!/usr/bin/env python3
"""
Insurance Email Notifier
Monitors insurance emails and sends Telegram alerts
Runs at 8am and 4pm daily
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
import sqlite3
import imaplib
from email.parser import BytesParser
from email import policy

import requests

LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'insurance_email_notifier.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('InsuranceEmailNotifier')

CONFIG_PATH = Path(__file__).parent / 'config.json'
LAST_CHECK_DB = Path(__file__).parent / 'last_check.db'


class GmailClient:
    """Gmail integration via IMAP"""

    def __init__(self, config: dict):
        self.config = config
        self.imap = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Gmail IMAP"""
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

    def fetch_insurance_emails(self, hours: int = 8) -> list:
        """Fetch new insurance emails from past N hours"""
        if not self.imap:
            logger.warning("Gmail not authenticated")
            return []

        try:
            self.imap.select('INBOX')

            monitor_emails = self.config.get('gmail', {}).get('monitor_emails', [])
            keywords = self.config.get('gmail', {}).get('insurance_keywords', [])

            # Get RECENT emails (much smaller set)
            status, messages = self.imap.search(None, 'RECENT')
            message_ids = messages[0].split()

            logger.info(f"Found {len(message_ids)} recent emails")

            emails = []
            for msg_id in message_ids[-50:]:  # Last 50 recent emails
                try:
                    status, msg_data = self.imap.fetch(msg_id, '(RFC822)')
                    if not msg_data or not msg_data[0]:
                        continue

                    email_msg = BytesParser(policy=policy.default).parsebytes(msg_data[0][1])
                    parsed = self._parse_email(email_msg)

                    # Filter by sender and keywords
                    sender_match = any(addr in parsed['sender'].lower() for addr in monitor_emails)
                    keyword_match = any(kw.lower() in parsed['subject'].lower() for kw in keywords)

                    if sender_match or keyword_match:
                        emails.append(parsed)
                except Exception as e:
                    logger.warning(f"Could not parse email {msg_id}: {e}")

            logger.info(f"📧 Parsed {len(emails)} insurance emails")
            return emails

        except Exception as e:
            logger.error(f"❌ Failed to fetch emails: {e}")
            return []

    def _parse_email(self, msg) -> dict:
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
            'body': body[:500]  # First 500 chars
        }

    def close(self):
        """Close IMAP connection"""
        if self.imap:
            self.imap.close()
            self.imap.logout()


class TelegramNotifier:
    """Send alerts to Telegram"""

    def __init__(self, config: dict):
        self.bot_token = config.get('telegram', {}).get('bot_token')
        self.chat_id = config.get('telegram', {}).get('primary_chat_id')

    def send_email_alert(self, email: dict) -> bool:
        """Send email alert to Telegram"""
        if not self.bot_token or not self.chat_id:
            logger.warning("⚠️ Telegram not configured")
            return False

        try:
            # Format message
            message = f"""📧 NEW INSURANCE EMAIL

<b>From:</b> {email['sender']}
<b>Subject:</b> {email['subject']}
<b>Time:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}

<b>Preview:</b>
{email['body'][:300]}...

👉 Check Gmail for full details
"""

            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': 'HTML'
            }

            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                logger.info(f"✅ Telegram alert sent for: {email['subject']}")
                return True
            else:
                logger.error(f"❌ Telegram error: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to send alert: {e}")
            return False


class EmailTracker:
    """Track which emails have been notified"""

    def __init__(self):
        self._init_db()

    def _init_db(self):
        """Initialize tracking database"""
        try:
            conn = sqlite3.connect(LAST_CHECK_DB)
            cursor = conn.cursor()

            cursor.execute('''
            CREATE TABLE IF NOT EXISTS notified_emails (
                id TEXT PRIMARY KEY,
                subject TEXT,
                sender TEXT,
                notified_at TIMESTAMP
            )
            ''')

            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Failed to init tracker DB: {e}")

    def is_notified(self, email_id: str) -> bool:
        """Check if email was already notified"""
        try:
            conn = sqlite3.connect(LAST_CHECK_DB)
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM notified_emails WHERE id = ?", (email_id,))
            result = cursor.fetchone() is not None
            conn.close()
            return result
        except Exception as e:
            logger.error(f"❌ Failed to check notified: {e}")
            return False

    def mark_notified(self, email_id: str, subject: str, sender: str):
        """Mark email as notified"""
        try:
            conn = sqlite3.connect(LAST_CHECK_DB)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO notified_emails (id, subject, sender, notified_at) VALUES (?, ?, ?, ?)",
                (email_id, subject, sender, datetime.now().isoformat())
            )
            conn.commit()
            conn.close()
            logger.info(f"📌 Tracked email: {email_id}")
        except Exception as e:
            logger.error(f"❌ Failed to mark notified: {e}")


class InsuranceEmailNotifier:
    """Main email notifier"""

    def __init__(self):
        self.config = self._load_config()
        self.gmail = GmailClient(self.config)
        self.notifier = TelegramNotifier(self.config)
        self.tracker = EmailTracker()

    def _load_config(self) -> dict:
        """Load configuration"""
        if not CONFIG_PATH.exists():
            logger.error(f"❌ Config file not found: {CONFIG_PATH}")
            sys.exit(1)

        with open(CONFIG_PATH) as f:
            return json.load(f)

    def check_and_notify(self):
        """Check for new insurance emails and send alerts"""
        logger.info("=" * 70)
        logger.info("🔍 Checking for new insurance emails...")
        logger.info("=" * 70)

        try:
            # Fetch emails from last 8 hours
            emails = self.gmail.fetch_insurance_emails(hours=8)

            if not emails:
                logger.info("ℹ️ No insurance emails found")
                return

            notified_count = 0
            for email in emails:
                # Skip if already notified
                if self.tracker.is_notified(email['id']):
                    logger.info(f"⏭️ Already notified: {email['subject']}")
                    continue

                # Send alert
                if self.notifier.send_email_alert(email):
                    self.tracker.mark_notified(email['id'], email['subject'], email['sender'])
                    notified_count += 1

            logger.info(f"✅ Check complete. {notified_count} new alerts sent.")

        except Exception as e:
            logger.error(f"❌ Check failed: {e}")
        finally:
            self.gmail.close()


def main():
    """Entry point"""
    notifier = InsuranceEmailNotifier()
    notifier.check_and_notify()


if __name__ == '__main__':
    main()
