# Ready Carrier Insurance Compliance Monitor

A Python CLI tool that automates insurance compliance monitoring for Ready Carrier LLC.

## What It Does

1. **Monitors Gmail** for insurance company emails with spreadsheet attachments
2. **Parses Spreadsheets** (Excel/CSV) containing truck, trailer, and driver lists
3. **Queries ReadyTMS** PostgreSQL database for active equipment
4. **Compares** insurance roster vs ReadyTMS roster
5. **Flags Discrepancies** - missing equipment, drivers, coverage gaps
6. **Posts Alerts** to Telegram group in real-time
7. **Logs Activity** to SQLite for audit trail
8. **Monitors Claims** - watches for accident/incident emails and posts URGENT alerts

## Key Features

✅ Fully automated daily checks
✅ Real-time Telegram alerts
✅ Spreadsheet parsing (Excel, CSV)
✅ PostgreSQL integration
✅ Audit trail & logging
✅ Manual or scheduled runs
✅ Claims/incident detection
✅ Modular design

## Architecture

```
┌─────────────┐
│    Gmail    │──── Download insurance spreadsheets
└─────────────┘
      │
      ▼
┌──────────────────┐
│ Spreadsheet      │──── Parse trucks/trailers/drivers
│ Parser           │
└──────────────────┘
      │
      ▼
┌──────────────────┐     ┌──────────────────┐
│ Insurance Lists  │────▶│ ReadyTMS Database│
└──────────────────┘     └──────────────────┘
      │
      ▼
┌──────────────────┐
│ Compare &        │
│ Flag Issues      │
└──────────────────┘
      │
      ├──────────────────┐
      ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  Telegram Alert  │  │  SQLite Audit    │
│  (Real-time)     │  │  (Compliance Log)│
└──────────────────┘  └──────────────────┘
```

## Quick Start

### 1. Install
```bash
cd ~/ready_monitor
pip install -r requirements.txt
```

### 2. Configure
```bash
cp config.example.json config.json
# Edit config.json with your credentials
```

### 3. Setup Gmail OAuth
- See SETUP_INSTRUCTIONS.md for detailed steps
- Download `client_secrets.json` from Google Cloud Console
- Place in `~/ready_monitor/`

### 4. Get Telegram Credentials
- Create bot via @BotFather
- Get group chat ID
- Add to config.json

### 5. Run
```bash
# Test right now
python insurance_monitor.py --mode check-now

# Schedule daily at 8am
bash cron_setup.sh
```

## Usage

### Command Line Options

```bash
# Manual check (right now)
python insurance_monitor.py --mode check-now

# Scheduled daily check (8:00 AM)
python insurance_monitor.py --mode daily

# Monitor for claims/accidents
python insurance_monitor.py --mode claims
```

### View Logs
```bash
# Real-time log
tail -f logs/insurance_monitor.log

# Cron execution log
tail -f logs/cron.log
```

### Query Audit Database
```bash
# All reconciliations
sqlite3 insurance_audit.db "SELECT * FROM reconciliations;"

# All discrepancies
sqlite3 insurance_audit.db "SELECT * FROM discrepancies;"

# All incidents
sqlite3 insurance_audit.db "SELECT * FROM incidents;"
```

## Alert Examples

### Insurance Discrepancy Alert
```
⚠️ INSURANCE UPDATE - ACTION NEEDED
📅 Updated: 2026-06-13 10:45

❌ MISSING FROM INSURANCE:
   • TRUCK #770
   • TRUCK #445

✅ NEEDS REMOVAL FROM POLICY:
   • TRUCK #600

👉 Action: Review in ReadyTMS Insurance Management
```

### Incident Alert
```
🚨 INCIDENT REPORT
📌 Driver: Ahmed Tamer Hassani
🚗 Truck: #770
📍 Location: Ohio Turnpike
💥 Type: Minor collision
📞 Contact Insurance ASAP
```

## Configuration

### `config.json` Structure

```json
{
  "gmail": {
    "client_secrets_path": "./client_secrets.json",
    "monitor_emails": ["readycarriers@gmail.com", "info@readycarrier.com"],
    "insurance_keywords": ["insurance", "policy", "unit list", "tractor", "trailer"]
  },
  "readytms": {
    "database_url": "postgresql://user:pass@host:5432/db?sslmode=require"
  },
  "telegram": {
    "bot_token": "YOUR_BOT_TOKEN",
    "primary_chat_id": "-5240100622"
  },
  "schedule": {
    "daily_check_time": "08:00",
    "timezone": "US/Eastern"
  }
}
```

## Database Tables

### SQLite (Local Audit)
- **reconciliations** - Daily check summaries
- **discrepancies** - Flagged issues (truck/trailer/driver mismatches)
- **incidents** - Accident/claim reports

### PostgreSQL (ReadyTMS)
- **insurance_trucks** - Insurance coverage for trucks
- **insurance_trailers** - Insurance coverage for trailers
- **insurance_claims** - Claim/incident tracking

## Files

- `insurance_monitor.py` - Main script
- `requirements.txt` - Python dependencies
- `config.json` - Your configuration
- `config.example.json` - Configuration template
- `SETUP_INSTRUCTIONS.md` - Detailed setup guide
- `cron_setup.sh` - Automate daily runs
- `logs/` - Application logs
- `insurance_audit.db` - Local SQLite database

## Troubleshooting

### Gmail Authentication
```bash
# Delete token and re-authenticate
rm token.json
python insurance_monitor.py --mode check-now
```

### Database Connection
```bash
# Test PostgreSQL connection
psql "your_connection_string" -c "SELECT 1"
```

### Telegram Issues
```bash
# Verify bot token
curl "https://api.telegram.org/bot[YOUR_TOKEN]/getMe"
```

### View Cron Logs
```bash
# macOS cron logs
log stream --predicate 'process == "cron"' | grep insurance
```

## Development

### Modular Design
The tool is split into independent modules:
- `GmailMonitor` - Email fetching & OAuth
- `SpreadsheetParser` - Excel/CSV parsing
- `ReadyTMSDatabase` - PostgreSQL integration
- `TelegramAlerter` - Alert posting
- `InsuranceMonitor` - Main orchestrator

### Adding Features
Each component can be tested independently:
```python
# Test Gmail
gmail = GmailMonitor(config)
emails = gmail.fetch_insurance_emails()

# Test Parser
trucks, trailers = SpreadsheetParser.parse_file('file.xlsx')

# Test Database
db = ReadyTMSDatabase(connection_string)
trucks = db.get_active_equipment()

# Test Alerts
alerter = TelegramAlerter(config)
alerter.send_alert("Title", "Message")
```

## Support

For issues:
1. Check logs: `tail -f logs/insurance_monitor.log`
2. Verify config.json is correct
3. Test each component independently
4. Check ReadyTMS database is accessible
5. Verify Telegram bot token is valid

## License

Internal use - Ready Carrier LLC

## Next Steps

1. ✅ Read SETUP_INSTRUCTIONS.md
2. ✅ Configure config.json
3. ✅ Run initial test: `python insurance_monitor.py --mode check-now`
4. ✅ Setup cron: `bash cron_setup.sh`
5. ✅ Monitor logs: `tail -f logs/insurance_monitor.log`
