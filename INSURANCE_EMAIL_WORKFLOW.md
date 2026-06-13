# 🔄 Insurance Email Workflow - Complete Guide

**User Flow:** Email → Agent reads → Auto-update → Telegram alerts

---

## 📧 Step 1: Agent Sends Email

**To:** `info@readycarrier.com`  
**From:** Any user  
**Subject:** Any (e.g., "Insurance Update", "Fleet Changes")

**Email Body Examples:**

### Format 1: Simple Commands
```
Add truck 770
Add truck 445
Remove truck 600
Add trailer TR-001
Remove trailer TR-999
Add driver Ahmed Tamer Hassani
```

### Format 2: CSV Table
```
Unit #,VIN,Year,Make,Model,Status
770,ABC123DEF456,2023,Volvo,VNL,Active
445,XYZ789UVW012,2022,Freightliner,Cascadia,Active
TR-001,TRLR123,2021,Wabash,Dry Van,Active
```

### Format 3: Mixed
```
Add truck 770
Add truck 445

Trailers to remove:
TR-600
TR-601

Drivers:
Add driver John Smith
Add driver Michael Johnson
```

---

## 🤖 Step 2: Email Processor Reads & Parses

When email arrives at `info@readycarrier.com`:

1. **Extract** trucks, trailers, drivers from email text
2. **Parse** both simple commands and CSV formats
3. **Identify** add vs remove operations
4. **Validate** unit numbers format

---

## 💾 Step 3: Update Insurance Tables

### Trucks Added ✅
```sql
INSERT INTO insurance_trucks 
  (unit_number, vin, year, make, model, status, created_at, updated_at)
VALUES 
  ('770', 'ABC123', 2023, 'Volvo', 'VNL', 'active', NOW(), NOW())
```

### Trucks Removed ❌
```sql
UPDATE insurance_trucks 
SET status = 'removed', updated_at = NOW() 
WHERE unit_number = '600'
```

### Trailers Added ✅
```sql
INSERT INTO insurance_trailers 
  (unit_number, status, created_at, updated_at)
VALUES 
  ('TR-001', 'active', NOW(), NOW())
```

### Trailers Removed ❌
```sql
UPDATE insurance_trailers 
SET status = 'removed', updated_at = NOW() 
WHERE unit_number = 'TR-999'
```

---

## 📲 Step 4: Telegram Alert Shows:

### What Matched ✅
```
✅ Trucks Added: 770, 445
✅ Trailers Added: TR-001
```

### What Was Removed ❌
```
❌ Trucks Removed: 600
❌ Trailers Removed: TR-999
```

### What's Missing/Issues ⚠️
```
⚠️ Trucks Failed: (if any invalid)
⚠️ Trailers Failed: (if any invalid)
```

### Drivers Mentioned 👤
```
👤 Noted: Ahmed Tamer Hassani, John Smith
(Noted for your reference - not auto-added to database)
```

### Current Status Summary 📊
```
🚗 Active Trucks: 12 (770, 445, 123, 456, ...)
🚐 Active Trailers: 8 (TR-001, TR-002, ...)
```

---

## 🎯 Complete Daily Example

### Email Received
```
To: info@readycarrier.com
Subject: Daily Fleet Update - June 13

Add truck 770
Add truck 445
Remove truck 600
Add trailer TR-001
Add driver Ahmed Tamer Hassani
```

### What Happens Automatically
1. Parse email → Extract trucks (770, 445, 600) and trailer (TR-001)
2. Add trucks 770, 445 to insurance_trucks table (status: active)
3. Remove truck 600 from insurance (set status: removed)
4. Add trailer TR-001 to insurance_trailers table (status: active)
5. Note driver: Ahmed Tamer Hassani for reference

### Telegram Alert Sent
```
📋 INSURANCE UPDATE FROM EMAIL
📅 2026-06-13 14:45:32

From: john@readycarrier.com
Subject: Daily Fleet Update - June 13

━━ TRUCKS ━━
✅ Added: 770, 445
❌ Removed: 600

━━ TRAILERS ━━
✅ Added: TR-001

━━ DRIVERS ━━
👤 Noted: Ahmed Tamer Hassani

━━ CURRENT INSURANCE STATUS ━━
🚗 Active Trucks: 12 (770, 445, 123, 456, ...)
🚐 Active Trailers: 8 (TR-001, TR-002, ...)

ℹ️ Check Insurance Records → /insurance
```

---

## 🔌 How to Trigger

### Option A: Manual API Call
```bash
curl -X POST https://readytms.replit.dev/api/email/process \
  -H 'Content-Type: application/json' \
  -d '{
    "subject": "Fleet Update",
    "sender": "info@readycarrier.com",
    "body": "Add truck 770\nAdd trailer TR-001",
    "date": "2026-06-13T14:45:00Z"
  }'
```

### Option B: Gmail Webhook (Automated)
- Setup Gmail to push emails to `/api/email/process`
- Email arrives → Automatically processed
- No manual steps needed

### Option C: Email Parser Service
- Use service like Zapier/n8n to forward emails
- Automatically calls `/api/email/process`
- Processes in background

---

## 📋 Field Mapping

### Trucks
```
Email Format              → Database Field
truck 770                 → unit_number = '770'
VIN ABC123                → vin = 'ABC123'
2023                      → year = 2023
Volvo                     → make = 'Volvo'
VNL                       → model = 'VNL'
Active/Inactive/Removed   → status = 'active'/'inactive'/'removed'
```

### Trailers
```
Email Format              → Database Field
trailer TR-001            → unit_number = 'TR-001'
Active/Inactive/Removed   → status = 'active'/'inactive'/'removed'
```

### Drivers
```
Email Format              → Notes/Reference
Add driver John Smith     → Recorded for reference
                          → Not auto-added to database
                          → Manual review recommended
```

---

## ✅ Daily Checklist

Each day you can:

1. **Send email** with updates
2. **Get Telegram alert** showing what changed
3. **Check ReadyTMS** at `/insurance` page
4. **Verify status** of trucks & trailers

---

## 🚀 Deployment

### Copy to ReadyTMS
```bash
cp email_processor_v2.js server/email_processor.js
```

### Update routes.ts
```typescript
// Replace old import with:
import { emailProcessorRoute } from './email_processor.js';

// Route already exists:
app.post('/api/email/process', emailProcessorRoute);
```

### Environment Variables
```
TELEGRAM_BOT_TOKEN=8871488327:AAFgpbfMFPe_KqTUV_8xjPy2I7T5C0Fmmkc
TELEGRAM_CHAT_ID=-5240100622
```

### Redeploy to Replit
```bash
git add .
git commit -m "Update email processor for new insurance tables"
git push
```

---

## 🎯 Summary

**Daily Flow:**
1. Agent sends email to `info@readycarrier.com`
2. System reads & parses trucks/trailers/drivers
3. Updates `insurance_trucks` & `insurance_trailers` tables
4. Sends Telegram showing:
   - ✅ What was added
   - ❌ What was removed
   - ⚠️ What failed
   - 📊 Current insurance status
5. You review in ReadyTMS at `/insurance` page

**Result:** Insurance data always up-to-date, Telegram confirms every change!
