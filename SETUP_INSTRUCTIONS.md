# Ready Carrier Insurance Compliance Monitor - Setup Guide

## Overview
A Python CLI tool that monitors Gmail for insurance spreadsheets, compares them against ReadyTMS, and sends Telegram alerts for discrepancies.

## Prerequisites
- Python 3.10+
- Mac mini M4 (or any macOS)
- Gmail account (readycarriers@gmail.com or info@readycarrier.com)
- Telegram bot & group chat
- ReadyTMS PostgreSQL database access

## Step 1: Clone/Setup Project

```bash
cd ~/ready_monitor
```

## Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 3: Setup Gmail OAuth

### 3a. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Ready Carrier Insurance Monitor"
3. Enable **Gmail API**:
   - Search for "Gmail API"
   - Click "Enable"

### 3b. Create OAuth 2.0 Credentials
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **Desktop application**
3. Download JSON → Save as `client_secrets.json` in `~/ready_monitor/`

## Step 4: Configure Application

```bash
cp config.example.json config.json
```

Edit `config.json` with:

```json
{
  "gmail": {
    "client_secrets_path": "./client_secrets.json",
    "monitor_emails": [
      "readycarriers@gmail.com",
      "info@readycarrier.com"
    ]
  },
  "readytms": {
    "database_url": "postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST:5432/neondb?sslmode=require"
  },
  "telegram": {
    "bot_token": "YOUR_BOT_TOKEN",
    "primary_chat_id": "YOUR_CHAT_ID"
  }
}
```

## Step 5: Get Telegram Credentials

### 5a. Create Telegram Bot
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Type `/newbot`
3. Follow prompts to create bot
4. Copy bot token → paste in `config.json`

### 5b. Get Group Chat ID
1. Create Telegram group for alerts
2. Add your bot to the group
3. Send a test message
4. Get chat ID:
   ```bash
   curl "https://api.telegram.org/botYOUR_TOKEN/getUpdates" | grep "chat"
   ```
5. Copy `"id"` value → paste in `config.json` as `primary_chat_id`

## Step 6: Test Setup

```bash
# First run will authenticate Gmail (opens browser)
python insurance_monitor.py --mode check-now

# Should output:
# ✅ Connected to ReadyTMS database
# ✅ Gmail authenticated
# ✅ All components initialized
```

## Step 7: Schedule Daily Runs (Optional)

### Using cron (automated)
```bash
bash cron_setup.sh
```

This runs the monitor daily at 8:00 AM.

### Verify cron is installed
```bash
crontab -l
```

You should see:
```
0 8 * * * cd /Users/northeast/ready_monitor && /usr/bin/python3 insurance_monitor.py --mode daily >> logs/cron.log 2>&1
```

## Usage

### Manual Check (Right Now)
```bash
python insurance_monitor.py --mode check-now
```

### Daily Check (Once per day)
```bash
python insurance_monitor.py --mode daily
```

### Claims Monitor (Watch for accidents)
```bash
python insurance_monitor.py --mode claims
```

### View Logs
```bash
tail -f logs/insurance_monitor.log
```

### View Audit Database
```bash
sqlite3 insurance_audit.db ".tables"
sqlite3 insurance_audit.db "SELECT * FROM reconciliations;"
```

## Troubleshooting

### "Gmail not authenticated"
- Delete `token.json` and run again
- Make sure `client_secrets.json` is in the right location
- Check that Gmail API is enabled in Google Cloud Console

### "Failed to connect to database"
- Verify PostgreSQL connection string in `config.json`
- Test connection:
  ```bash
  psql "your_connection_string" -c "SELECT 1"
  ```

### "Telegram not configured"
- Make sure bot token is correct
- Verify chat ID is negative (e.g., `-5240100622`)
- Test bot:
  ```bash
  curl "https://api.telegram.org/botYOUR_TOKEN/getMe"
  ```

### Cron job not running
```bash
# Check cron logs (macOS)
log stream --predicate 'process == "cron"' | grep insurance

# Or manually test:
cd ~/ready_monitor && /usr/bin/python3 insurance_monitor.py --mode daily
```

## Features

✅ Monitors Gmail for insurance emails
✅ Parses Excel/CSV spreadsheets
✅ Compares against ReadyTMS database
✅ Sends Telegram alerts for discrepancies
✅ Logs all activity to SQLite
✅ Watches for accident/claim emails
✅ Runs on schedule or on-demand

## Next Steps

1. Fill in `config.json` with your credentials
2. Run `python insurance_monitor.py --mode check-now`
3. Check Telegram for test alert
4. Run `bash cron_setup.sh` to automate daily checks
5. Monitor logs: `tail -f logs/insurance_monitor.log`

## Support

For issues, check logs:
```bash
tail -50 logs/insurance_monitor.log
```

All activity is audited in `insurance_audit.db`.
