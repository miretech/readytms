# Email Automation Setup Guide

Complete guide for monitoring emails and auto-adding equipment to ReadyTMS.

## Overview

Two complementary systems:

```
📧 EMAILS from northex10@gmail.com & readycarriers@gmail.com
       ↓
       ├─ INSURANCE EMAILS
       │  ↓
       │  Local Python Monitor
       │  (insurance_email_notifier.py)
       │  ↓
       │  Send Telegram Alert (8am & 4pm)
       │
       └─ EQUIPMENT/DRIVER EMAILS from info@readycarrier.com
          ↓
          ReadyTMS Email Processor
          (email_processor.js)
          ↓
          AUTO-ADD to trucks/drivers/trailers tables
          ↓
          Send Telegram Notification
```

---

## Part 1: Local Python Email Monitor (8am & 4pm)

Monitors insurance emails and sends Telegram alerts **without** reconciliation.

### Setup

1. **Ensure config.json is set**:
   ```json
   {
     "gmail": {
       "client_secrets_path": "./client_secrets.json",
       "monitor_emails": ["northex10@gmail.com", "readycarriers@gmail.com"],
       "insurance_keywords": ["insurance", "policy", "certificate", "coverage", "unit list"]
     },
     "telegram": {
       "bot_token": "YOUR_TOKEN",
       "primary_chat_id": "-5240100622"
     }
   }
   ```

2. **Ensure Gmail OAuth is setup**:
   - Should have `client_secrets.json` in `~/ready_monitor/`
   - First run will authenticate

3. **Install cron jobs (8am & 4pm)**:
   ```bash
   cd ~/ready_monitor
   bash cron_setup_dual.sh
   ```

4. **Verify**:
   ```bash
   crontab -l | grep insurance_email_notifier
   ```

   Should show two lines:
   ```
   0 8 * * * cd /Users/northeast/ready_monitor && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1
   0 16 * * * cd /Users/northeast/ready_monitor && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1
   ```

5. **Test**:
   ```bash
   cd ~/ready_monitor
   python3 insurance_email_notifier.py
   ```

### How It Works

- Runs at **8:00 AM** and **4:00 PM** every day
- Checks Gmail for emails from `northex10@gmail.com` and `readycarriers@gmail.com`
- Searches for insurance-related keywords (insurance, policy, certificate, etc.)
- Sends **one Telegram alert per new email**
- Tracks which emails were already notified (no duplicates)
- Logs all activity to `logs/insurance_email_notifier.log`

### Example Alert

```
📧 NEW INSURANCE EMAIL

From: claims@insurancecompany.com
Subject: Policy Update - Your Covered Units
Time: 2026-06-13 08:15

Preview:
Dear Ready Carrier,
Your updated coverage list is attached. Please review the following changes...

👉 Check Gmail for full details
```

### Logs

```bash
# Watch logs in real-time
tail -f logs/insurance_email_notifier.log

# View specific check
tail -f logs/cron.log
```

---

## Part 2: ReadyTMS Email Processor (Auto-Add Equipment)

Auto-adds trucks, drivers, trailers from emails from `info@readycarrier.com`.

### Integration Steps

#### Step 1: Copy email_processor.js to ReadyTMS

Copy `~/ready_monitor/email_processor.js` to your ReadyTMS server directory.

#### Step 2: Import in routes.ts

In your ReadyTMS `server/routes.ts`, add:

```typescript
import { emailProcessorRoute, processEmail } from './email_processor.js';

// Add route
app.post('/api/email/process', emailProcessorRoute);
```

#### Step 3: Setup Environment Variables

In ReadyTMS `.env` or deployment settings:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=-5240100622
```

#### Step 4: Gmail Webhook (Optional - Auto-Processing)

To automatically process emails as they arrive, set up Gmail to push to ReadyTMS.

**Simple Alternative: Manual Trigger**

Just POST the email data to `/api/email/process`:

```bash
curl -X POST http://localhost:3000/api/email/process \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "New Equipment",
    "sender": "info@readycarrier.com",
    "body": "Add truck 770",
    "date": "2026-06-13T12:00:00Z"
  }'
```

### Email Formats Supported

#### Format 1: Simple Commands

Just write plain English in the email:

```
Subject: New Truck

Body:
Add truck 770
Add trailer TR-001
Add driver Ahmed Tamer Hassani
```

**Supported commands:**
- `Add truck 770`
- `Add truck #770` (with #)
- `Remove truck 445`
- `Add driver John Smith`
- `Add trailer TR-001`
- `Remove trailer TR-001`

#### Format 2: CSV/Table

Include structured data:

```
Subject: Equipment Roster

Body:
Unit #,VIN,Status
770,ABC123DEF456,Active
445,XYZ789UVW012,Active
```

#### Format 3: Mixed

Combine both in one email - all patterns are extracted.

### Database Changes

Equipment is added to these ReadyTMS tables:

**trucks** table:
```sql
INSERT INTO trucks (truck_number, vin, status, created_at)
VALUES ('770', 'ABC123', 'active', NOW());
```

**drivers** table:
```sql
INSERT INTO drivers (name, license_number, status, hire_date)
VALUES ('Ahmed Tamer Hassani', NULL, 'active', CURRENT_DATE);
```

**trailers** table:
```sql
INSERT INTO trailers (trailer_number, status)
VALUES ('TR-001', 'active');
```

### Example Telegram Notification

```
✅ EQUIPMENT AUTO-UPDATE

From: info@readycarrier.com
Subject: New Equipment

✅ Trucks Added: 770, 445
❌ Trucks Removed: 600
✅ Drivers Added: Ahmed Tamer Hassani, John Smith
✅ Trailers Added: TR-001, TR-002
❌ Trailers Removed: TR-999
```

---

## Complete Daily Schedule

Your complete automation runs:

| Time | Job | Source | Action |
|------|-----|--------|--------|
| **8:00 AM** | Email Monitor | Python (Local) | Check insurance emails → Telegram alerts |
| **Throughout day** | Equipment Processor | ReadyTMS (Web) | Auto-add equipment from info@ emails |
| **4:00 PM** | Email Monitor | Python (Local) | Check insurance emails → Telegram alerts |

---

## Troubleshooting

### Insurance Monitor Not Running at 8am/4pm

```bash
# Check if installed
crontab -l | grep insurance_email_notifier

# Check if running
tail -f logs/cron.log

# Test manually
python3 insurance_email_notifier.py

# View system cron logs (macOS)
log stream --predicate 'process == "cron"' | grep insurance_email_notifier
```

### Gmail Not Finding Emails

```bash
# Test Gmail authentication
python3 -c "
from insurance_email_notifier import GmailClient
import json
with open('config.json') as f:
    config = json.load(f)
gmail = GmailClient(config)
print('✅ Gmail authenticated')
"

# Delete token and re-auth
rm token.json
python3 insurance_email_notifier.py
# Will open browser for re-authentication
```

### Equipment Not Auto-Adding

1. **Check email sender**: Must be exactly `info@readycarrier.com`
2. **Check format**: Use one of the supported formats above
3. **Check logs**: ReadyTMS server logs for errors
4. **Test endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/email/process \
     -H "Content-Type: application/json" \
     -d '{
       "subject": "Test",
       "sender": "info@readycarrier.com",
       "body": "Add truck 999"
     }'
   ```

### Telegram Not Sending

**Local Python:**
```bash
# Test token
curl "https://api.telegram.org/botYOUR_TOKEN/getMe"

# Check config.json has correct token and chat_id
cat config.json | grep telegram
```

**ReadyTMS:**
```bash
# Test environment variables
echo $TELEGRAM_BOT_TOKEN
echo $TELEGRAM_CHAT_ID
```

---

## Files

**Local (Mac mini):**
- `insurance_email_notifier.py` - Email monitor
- `cron_setup_dual.sh` - Setup 8am & 4pm jobs
- `config.json` - Configuration
- `logs/insurance_email_notifier.log` - Monitor logs

**ReadyTMS (Replit/Server):**
- `email_processor.js` - Equipment processor
- Routes configured in `server/routes.ts`

---

## Quick Commands

```bash
# Test email monitor
python3 insurance_email_notifier.py

# View logs
tail -f logs/insurance_email_notifier.log
tail -f logs/cron.log

# Setup dual jobs (8am + 4pm)
bash cron_setup_dual.sh

# Remove jobs
crontab -e  # Then delete the insurance_email_notifier lines

# Check config
cat config.json | jq '.gmail, .telegram'
```

---

## Next Steps

1. ✅ Verify `config.json` has correct credentials
2. ✅ Run test: `python3 insurance_email_notifier.py`
3. ✅ Setup cron: `bash cron_setup_dual.sh`
4. ✅ Copy `email_processor.js` to ReadyTMS server
5. ✅ Add route to ReadyTMS `server/routes.ts`
6. ✅ Test equipment auto-add with test email

Both systems will then run automatically!
