# Ready Carrier Insurance Compliance Monitor

A Python CLI tool that monitors insurance company emails, compares equipment/driver lists against ReadyTMS, and alerts via Telegram when discrepancies are found.

## Features

- 📧 Monitors Gmail for insurance company emails
- 📊 Parses insurance spreadsheets (XLSX/CSV)
- ⚖️ Compares against ReadyTMS PostgreSQL database
- 🚨 Posts alerts to Telegram group
- 📝 Maintains audit trail of all discrepancies
- 🔄 Runs daily on schedule (8am) or on-demand
- 🚨 Monitors for accident/claim emails with urgent alerts

## Setup

### 1. Install Dependencies

```bash
cd ~/ready_monitor
pip install -r requirements.txt
```

### 2. Initialize Database

```bash
python init_db.py
```

### 3. Configure Credentials

Copy the example config and fill in your details:

```bash
cp config.example.json config.json
```

Edit `config.json` with:

- **Gmail**:
  - `email`: Your Gmail address (readycarriers@gmail.com or info@readycarrier.com)
  - `app_password`: [16-character app password from Google](https://myaccount.google.com/apppasswords)
  
- **ReadyTMS**:
  - `database_url`: Your PostgreSQL connection string (e.g., `postgres://user:pass@host:5432/readytms`)
  
- **Telegram**:
  - `bot_token`: Create a bot via [@BotFather](https://t.me/botfather) and get the token
  - `chat_id`: Your Telegram group chat ID (will add once group is created)

### 4. Set Up Telegram Group (Later)

1. Create a Telegram group for Ready Carrier alerts
2. Add your bot to the group
3. Get the group chat ID and add to `config.json`

## Usage

### Daily Scheduled Check

The monitor runs automatically at 8:00 AM via cron job. To set up:

```bash
bash cron_setup.sh
```

### Manual Check (Right Now)

```bash
python insurance_monitor.py --mode check-now
```

### Continuous Claims Monitoring

```bash
python insurance_monitor.py --mode claims
```

### Mark Discrepancy as Resolved

```bash
python insurance_monitor.py --resolve 5 --notes "Removed truck 445 from policy"
```

### Generate Monthly Report

```bash
python insurance_monitor.py --report 30
```

## Database Schema

### Local Audit Database (SQLite)

```
insurance_reconciliations:
  - id, date, file_name, equipment_count, driver_count, discrepancy_count, status

insurance_equipment:
  - id, reconciliation_id, unit_number, unit_type, vin, year, make, model, status, in_readytms, in_insurance

insurance_drivers:
  - id, reconciliation_id, name, license_number, status, in_readytms, in_insurance

insurance_discrepancies:
  - id, reconciliation_id, discrepancy_type, unit_number, unit_type, driver_name, details, flagged_date, resolved_date, resolution_notes, telegram_posted

claims_incidents:
  - id, date, driver_name, truck_number, location, description, claim_type, email_subject, email_from, telegram_posted
```

### ReadyTMS Schema (Create Insurance Section)

```sql
-- Insurance records in ReadyTMS (PostgreSQL)
CREATE TABLE insurance_trucks (
  id SERIAL PRIMARY KEY,
  unit_number TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  specific_type TEXT,
  status TEXT,
  physical_damage TEXT,
  owner_operator BOOLEAN,
  loss_payee_name TEXT,
  loss_payee_address TEXT,
  loss_payee_city TEXT,
  loss_payee_state TEXT,
  loss_payee_zip TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE insurance_trailers (
  id SERIAL PRIMARY KEY,
  unit_number TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  specific_type TEXT,
  status TEXT,
  loss_payee_name TEXT,
  loss_payee_address TEXT,
  loss_payee_city TEXT,
  loss_payee_state TEXT,
  loss_payee_zip TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE insurance_sync_log (
  id SERIAL PRIMARY KEY,
  file_name TEXT,
  sync_date TIMESTAMP DEFAULT NOW(),
  trucks_updated INTEGER,
  trailers_updated INTEGER,
  status TEXT
);
```

## Alert Format

### Insurance Discrepancy Alert

```
⚠️ INSURANCE UPDATE - ACTION NEEDED
📅 Updated: [Date]

❌ MISSING FROM INSURANCE:
   • Truck #770 (Freightliner, VIN: XXX)
   • Truck #445

✅ NEEDS REMOVAL FROM POLICY:
   • Driver: [Name]

👉 Action: Review in ReadyTMS dashboard
```

### Incident/Claim Alert

```
🚨 INCIDENT REPORT
📌 Driver: [Name]
🚗 Truck: #[Number]
📍 Location: [Details]
🕐 Date: [When]
💥 Type: [Damage/accident/incident]
📞 Next Steps: Contact insurance immediately
```

## Logs

Logs are written to `logs/insurance_monitor.log` for debugging.

## Troubleshooting

**Q: "Missing dependency" error**
- Run `pip install -r requirements.txt`

**Q: Config file not found**
- Copy `config.example.json` to `config.json` and fill in your credentials

**Q: Can't connect to ReadyTMS**
- Verify your PostgreSQL connection string in `config.json`
- Check that the ReadyTMS database is running

**Q: Telegram alerts not sending**
- Verify bot token and chat ID in `config.json`
- Make sure the bot was added to your Telegram group with admin permissions

## Next Steps

1. ✅ Get your PostgreSQL connection string from ReadyTMS
2. ✅ Create Google App Password for Gmail
3. ✅ Create Telegram bot (once group is ready)
4. ✅ Run `bash cron_setup.sh` to schedule daily 8am checks
5. ✅ Test with `python insurance_monitor.py --mode check-now`

## Support

For issues or questions, check the logs:
```bash
tail -f logs/insurance_monitor.log
```
