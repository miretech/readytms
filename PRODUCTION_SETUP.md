# Insurance Reconciliation Pipeline - Production Setup

## What This Tool Does

Automatically reconciles your insurance spreadsheets with ReadyTMS data:

1. **Monitors Gmail** for insurance emails from your insurance company
2. **Parses Spreadsheets** (Excel/CSV) extracting trucks, drivers, trailers
3. **Queries ReadyTMS** for active trucks, drivers, trailers
4. **Compares** insurance roster vs. active equipment
5. **Auto-populates** `insurance_records` table in ReadyTMS
6. **Posts Telegram Alerts** for any discrepancies (missing coverage, excess equipment)
7. **Runs Daily** at 8:00 AM on your Mac mini

## Database Schema (Your Tables)

```sql
-- Source tables (ReadyTMS)
trucks:        id, truck_number, vin, status, created_at, removed_at
drivers:       id, name, license_number, status, hire_date
trailers:      id, trailer_number, status

-- Destination table (for insurance data)
insurance_records: id, truck_number, driver_name, effective_date, status
```

## Setup Steps

### 1. Update Your Config

Edit `~/ready_monitor/config.json`:

```json
{
  "gmail": {
    "client_secrets_path": "./client_secrets.json",
    "monitor_emails": ["readycarriers@gmail.com", "info@readycarrier.com"],
    "insurance_keywords": ["insurance", "unit list", "certificate", "policy"]
  },
  "readytms": {
    "database_url": "postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST:5432/neondb?sslmode=require"
  },
  "telegram": {
    "bot_token": "YOUR_BOT_TOKEN",
    "primary_chat_id": "-5240100622"
  }
}
```

### 2. Setup Gmail OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "Ready Carrier Insurance"
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials (Desktop application)
5. Download JSON → Save as `client_secrets.json` in `~/ready_monitor/`

### 3. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather)
2. Type `/newbot`
3. Follow prompts
4. Copy token → add to `config.json`
5. Create Telegram group
6. Add bot to group
7. Get chat ID:
   ```bash
   curl "https://api.telegram.org/botYOUR_TOKEN/getUpdates" | grep "chat"
   ```

### 4. Test

```bash
cd ~/ready_monitor

# Install dependencies (first time only)
pip install -r requirements.txt

# Run reconciliation now
python insurance_monitor_production.py --mode check-now
```

### 5. Schedule Daily at 8am

```bash
bash cron_setup.sh
```

Verify:
```bash
crontab -l
```

## How It Works

### Pipeline Flow

```
Gmail (Insurance Emails)
       ↓
    Download Attachments
       ↓
   Parse Spreadsheet
       ↓
ReadyTMS Database ←──→ Compare
    (Trucks, Drivers,
     Trailers)
       ↓
  Discrepancies Found?
    ↙         ↘
  Yes         No
   ↓           ↓
Send Alert   Update Records
   ↓           ↓
Log in DB ←────┘
```

### What Gets Populated

The `insurance_records` table gets filled with:
- **truck_number** - From insurance spreadsheet
- **driver_name** - From insurance spreadsheet
- **effective_date** - Date of spreadsheet
- **status** - active/inactive from spreadsheet

### Comparison Logic

For each equipment type (trucks, drivers, trailers):

**Missing from Insurance:**
```
Active in ReadyTMS BUT NOT in insurance spreadsheet
→ Coverage gap alert!
```

**Not in ReadyTMS:**
```
In insurance spreadsheet BUT NOT active in ReadyTMS
→ Possible overpaying/unused coverage
```

## Example Alert

```
⚠️ INSURANCE RECONCILIATION REPORT
📅 2026-06-13 08:15

❌ TRUCKS NOT IN INSURANCE:
   • Truck #770
   • Truck #445
   ... and 2 more

❌ DRIVERS NOT IN INSURANCE:
   • Ahmed Tamer Hassani

❌ TRAILERS NOT IN INSURANCE:
   • Trailer #TR-001

👉 Review in ReadyTMS Insurance Records
```

## Logs & Audit Trail

### View Logs
```bash
# Real-time monitoring
tail -f logs/insurance_reconciliation.log

# Cron execution
tail -f logs/cron.log
```

### Audit Database
```bash
# Query reconciliation runs
sqlite3 insurance_audit.db "SELECT * FROM reconciliation_runs;"

# Query discrepancy log
sqlite3 insurance_audit.db "SELECT * FROM discrepancy_log;"
```

## Files

- `insurance_monitor_production.py` - Main reconciliation pipeline
- `config.json` - Your configuration
- `requirements.txt` - Python dependencies
- `cron_setup.sh` - Automates 8am daily runs
- `logs/` - All logs stored here
- `insurance_audit.db` - SQLite audit trail

## Troubleshooting

### Gmail Not Working
```bash
rm token.json
python insurance_monitor_production.py --mode check-now
# Will open browser for re-authentication
```

### Database Connection Error
```bash
# Test connection
psql "your_connection_string" -c "SELECT 1"

# Check config.json database_url
```

### Telegram Not Posting
```bash
# Verify bot token
curl "https://api.telegram.org/botYOUR_TOKEN/getMe"

# Verify chat ID (should be negative)
# Format: -5240100622
```

### Cron Not Running
```bash
# Check if installed
crontab -l | grep insurance

# View cron logs (macOS)
log stream --predicate 'process == "cron"' | grep insurance

# Test manually
cd ~/ready_monitor && python insurance_monitor_production.py --mode check-now
```

## What Happens Each Day

**8:00 AM (automatically):**

1. ✅ Fetch last 24h of emails from Gmail
2. ✅ Find insurance spreadsheet attachments
3. ✅ Parse trucks, drivers, trailers from spreadsheet
4. ✅ Query ReadyTMS for active equipment
5. ✅ Compare: find coverage gaps and excess coverage
6. ✅ Insert records into `insurance_records` table
7. ✅ If discrepancies found → Post Telegram alert
8. ✅ Log results to SQLite audit database

**You get:**
- Real-time Telegram alerts
- Complete audit trail in SQLite
- Insurance data synced to ReadyTMS

## Next Steps

1. ✅ Update `config.json` with your PostgreSQL connection string
2. ✅ Download `client_secrets.json` from Google Cloud Console
3. ✅ Create Telegram bot and add token to `config.json`
4. ✅ Run test: `python insurance_monitor_production.py --mode check-now`
5. ✅ Setup cron: `bash cron_setup.sh`
6. ✅ Monitor logs: `tail -f logs/insurance_reconciliation.log`

## Support

Check logs for any errors:
```bash
tail -50 logs/insurance_reconciliation.log
```

All activity is audited in `insurance_audit.db` for compliance.
