# Ready Carrier Insurance Monitor - Setup Checklist

## ✅ Done (Claude Code)

- [x] Created Python CLI tool skeleton
- [x] Set up local SQLite audit database
- [x] Created config template (`config.example.json`)
- [x] Built database schema for insurance tracking
- [x] Created Gmail API integration stub
- [x] Built Telegram alerting structure
- [x] Created cron setup script for daily 8am runs
- [x] Added all dependencies to `requirements.txt`
- [x] Created comprehensive README and documentation
- [x] Created ReadyTMS PostgreSQL schema for insurance tables

## 🔲 What You Need to Do (Asad)

### 1. Gmail Setup (15 min)

**Create App Password for Gmail:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Find "App passwords" (requires 2FA enabled)
3. Select "Mail" and "Mac"
4. Google generates a 16-character password
5. Copy it to `config.json` → `gmail.app_password`

**Verify email addresses:**
- Update `config.json` → `gmail.monitor_emails` with your insurance monitoring addresses
- Currently set to: `readycarriers@gmail.com`, `info@readycarrier.com`

### 2. ReadyTMS PostgreSQL Setup (30 min)

**Get your database connection string:**
1. Log into ReadyTMS Replit
2. Find PostgreSQL connection details (usually in .env or deployment config)
3. Format: `postgres://username:password@host:port/database`
4. Add to `config.json` → `readytms.database_url`

**Create insurance tables in ReadyTMS:**
1. Connect to your ReadyTMS PostgreSQL database
2. Run the schema file:
   ```bash
   psql your_connection_string < readytms_insurance_schema.sql
   ```
   This creates:
   - `insurance_trucks` table
   - `insurance_trailers` table
   - `insurance_sync_log` table
   - `insurance_claims` table
   - `insurance_audit_trail` table

### 3. Telegram Setup (20 min) - Can Do Later

**Create Telegram Bot:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Type `/newbot`
3. Follow prompts to create your bot
4. BotFather gives you a **token** (e.g., `123456789:ABCdeFGHij...`)
5. Save the token to `config.json` → `telegram.bot_token`

**Set up Telegram Group:**
1. Create a new Telegram group called "Ready Carrier Alerts"
2. Add your bot to the group
3. Send a message in the group
4. Your bot will need the **chat ID** (you can get it from bot messages)
5. Add chat ID to `config.json` → `telegram.chat_id`

### 4. Install Dependencies (5 min)

```bash
cd ~/ready_monitor
pip install -r requirements.txt
```

### 5. Create Config File

```bash
cp config.example.json config.json
```

Fill in all values from steps 1-3.

### 6. Test the Setup (10 min)

```bash
# Test immediate check
python insurance_monitor.py --mode check-now

# Test claims monitor
python insurance_monitor.py --mode claims

# Generate test report
python insurance_monitor.py --report 1
```

### 7. Schedule Daily Cron Job (5 min)

```bash
bash cron_setup.sh
```

Verify it's installed:
```bash
crontab -l
```

You should see:
```
0 8 * * * cd /Users/northeast/ready_monitor && /usr/bin/python3 insurance_monitor.py --mode daily >> logs/cron.log 2>&1
```

## 📋 Current File Structure

```
~/ready_monitor/
├── insurance_monitor.py           # Main CLI tool
├── init_db.py                     # Database initialization
├── cron_setup.sh                  # Schedule daily runs
├── requirements.txt               # Python dependencies
├── config.example.json            # Config template
├── config.json                    # Your actual config (after setup)
├── README.md                      # Full documentation
├── SETUP.md                       # This file
├── .gitignore                     # Secrets protection
├── readytms_insurance_schema.sql  # ReadyTMS database schema
├── insurance_audit.db             # Local SQLite audit database
└── logs/                          # Log files
    ├── insurance_monitor.log      # Main log
    └── cron.log                   # Cron execution log
```

## 🔧 What Still Needs Implementation

Once you provide the above info, Claude Code will:

1. **Parse Insurance Spreadsheets**
   - Read XLSX/CSV files with trucks/trailers/drivers
   - Extract: unit #, VIN, year, make, model, status
   - Sync into ReadyTMS `insurance_trucks`/`insurance_trailers` tables

2. **Compare ReadyTMS vs Insurance**
   - Query active trucks from `trucks` table
   - Query insurance trucks from `insurance_trucks` table
   - Flag discrepancies:
     * Equipment in insurance but NOT active in ReadyTMS → "Remove from policy"
     * Equipment in ReadyTMS but NOT in insurance → "Add to insurance (coverage gap)"

3. **Gmail API Integration**
   - Authenticate with app password
   - Monitor `readycarriers@gmail.com` for insurance emails
   - Download PDF/XLSX attachments automatically
   - Extract spreadsheet data

4. **Telegram Alerts**
   - Format pretty alerts with emojis
   - Post to your Telegram group when:
     * New insurance data arrives
     * Discrepancies found
     * Claims/incidents detected

5. **Claims Monitoring**
   - Watch for keywords: "accident", "claim", "incident", "damage"
   - Extract driver name, truck #, location, description
   - Post URGENT alert to Telegram
   - Log to `insurance_claims` table

## ⚠️ Quick Reference

| Task | Command |
|------|---------|
| Install deps | `pip install -r requirements.txt` |
| Initialize DB | `python init_db.py` |
| Test now | `python insurance_monitor.py --mode check-now` |
| View logs | `tail -f logs/insurance_monitor.log` |
| Generate report | `python insurance_monitor.py --report 30` |
| Check cron | `crontab -l` |
| View cron logs | `tail -f logs/cron.log` |

## 📞 Next Steps

1. **Gather info from above** (Gmail app password, PostgreSQL connection, etc.)
2. **Run setup steps 1-7** in order
3. **Test with:** `python insurance_monitor.py --mode check-now`
4. **Let Claude Code know** when you're ready and provide the ReadyTMS schema details

Questions? Check the logs:
```bash
tail -f ~/ready_monitor/logs/insurance_monitor.log
```
