# 🔗 Unified Email System - Monitor All 3 Sources

**Complete insurance monitoring from multiple email sources**

---

## 📧 Three Email Sources

```
┌─────────────────────────────────────────────────────────────┐
│                    EMAIL MONITORING                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  northex10@gmail.com                                   │
│     └─ SOURCE: Trailer information                         │
│        WHAT: Trailers list, updates, additions             │
│        ACTION: Auto-add to insurance_trailers              │
│                                                             │
│  2️⃣  readycarriers@gmail.com                               │
│     └─ SOURCE: Insurance company emails                    │
│        WHAT: Coverage list, trucks, drivers, trailers      │
│        ACTION: Extract & log for reference                 │
│                                                             │
│  3️⃣  info@readycarrier.com                                 │
│     └─ SOURCE: Agent commands                              │
│        WHAT: Commands to add/remove trucks, trailers       │
│        ACTION: Execute commands immediately                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 What Each Email Source Does

### Source 1: **northex10@gmail.com** (Trailers)

**Purpose:** Track trailers from Northex

**What the email contains:**
```
Subject: Trailer Updates

Trailers:
TR-001
TR-002
TR-003

CSV Format:
Trailer #,Status
TR-001,Active
TR-002,Active
TR-003,Inactive
```

**What happens:**
1. System detects trailer information
2. Auto-adds trailers to `insurance_trailers` table
3. Sends Telegram alert: "✅ Trailers Added from northex10"
4. Updates show in ReadyTMS `/insurance` page

**Telegram Alert:**
```
📋 INSURANCE EMAIL PROCESSED
📅 2026-06-13 10:30:00

Source: TRAILERS (northex10@gmail.com)
Subject: Trailer Updates

━━ TRAILERS FROM northex10 ━━
✅ Added: TR-001, TR-002
⚠️ Failed: (none)

━━ CURRENT INSURANCE STATUS ━━
🚗 Active Trucks: 12
🚐 Active Trailers: 5 (TR-001, TR-002, TR-003, ...)

→ Review in ReadyTMS: /insurance
```

---

### Source 2: **readycarriers@gmail.com** (Insurance)

**Purpose:** Track insurance coverage information

**What the email contains:**
```
Subject: Insurance Policy Update - June 2026

Covered Equipment:
Trucks: 770, 445, 123, 456
Trailers: TR-001, TR-002, TR-003
Drivers: Ahmed Tamer Hassani, John Smith, Michael Johnson

Policy Effective: June 1, 2026
```

**What happens:**
1. System extracts trucks, trailers, drivers mentioned
2. Logs them for reference (doesn't auto-modify)
3. Sends Telegram alert: "ℹ️ Insurance coverage info found"
4. Shows what's covered so you can verify

**Telegram Alert:**
```
📋 INSURANCE EMAIL PROCESSED
📅 2026-06-13 14:00:00

Source: INSURANCE (readycarriers@gmail.com)
Subject: Insurance Policy Update - June 2026

━━ INSURANCE INFO FROM readycarriers ━━
🚗 Truck 770
🚗 Truck 445
🚗 Truck 123
🚗 Truck 456
🚐 Trailer TR-001
🚐 Trailer TR-002
🚐 Trailer TR-003
👤 Driver Ahmed Tamer Hassani
👤 Driver John Smith
👤 Driver Michael Johnson

━━ CURRENT INSURANCE STATUS ━━
🚗 Active Trucks: 12 (770, 445, 123, 456, ...)
🚐 Active Trailers: 5 (TR-001, TR-002, TR-003, ...)

→ Review in ReadyTMS: /insurance
```

---

### Source 3: **info@readycarrier.com** (Commands)

**Purpose:** Agent sends explicit add/remove commands

**What the email contains:**
```
Subject: Daily Fleet Update

Add truck 770
Add truck 445
Remove truck 600
Add trailer TR-001
Remove trailer TR-999
Add driver Ahmed Tamer Hassani
```

**What happens:**
1. System parses commands (add/remove)
2. **Immediately executes** updates to database
3. Sends Telegram alert: "✅ Trucks Added: 770, 445"
4. Changes show instantly in ReadyTMS

**Telegram Alert:**
```
📋 INSURANCE EMAIL PROCESSED
📅 2026-06-13 15:45:00

Source: COMMANDS (info@readycarrier.com)
Subject: Daily Fleet Update

━━ COMMANDS EXECUTED ━━
✅ Trucks Added: 770, 445
❌ Trucks Removed: 600
✅ Trailers Added: TR-001
❌ Trailers Removed: TR-999
👤 Drivers Noted: Ahmed Tamer Hassani

━━ CURRENT INSURANCE STATUS ━━
🚗 Active Trucks: 12 (770, 445, 123, 456, ...)
🚐 Active Trailers: 5 (TR-001, TR-002, TR-003, ...)

→ Review in ReadyTMS: /insurance
```

---

## 🎯 Email Format Examples

### Format 1: Simple List
```
From: northex10@gmail.com
To: info@readycarrier.com

Trailers in fleet:
TR-001
TR-002
TR-003
```

### Format 2: CSV Table
```
From: readycarriers@gmail.com
To: info@readycarrier.com

Truck #,VIN,Status
770,ABC123,Active
445,XYZ789,Active
```

### Format 3: Commands
```
From: info@readycarrier.com
To: (automated)

Add truck 770
Add truck 445
Remove truck 600
Add trailer TR-001
```

### Format 4: Mixed
```
From: northex10@gmail.com
To: info@readycarrier.com

Current Trailers:
TR-001
TR-002

Add trailer TR-003
Remove trailer TR-999

Drivers:
Ahmed Tamer Hassani
John Smith
```

---

## 🔄 Daily Workflow

```
MORNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8:00 AM
  • System checks all 3 emails
  • Processes trailers from northex10
  • Processes insurance info from readycarriers
  • Executes commands from info@

AFTERNOON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agent sends updates to info@readycarrier.com:
  "Add truck 770"
  "Remove trailer TR-600"

System immediately:
  • Parses commands
  • Updates database
  • Sends Telegram alert
  • Changes show in ReadyTMS /insurance

EVENING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4:00 PM
  • System checks all 3 emails again
  • Consolidates daily updates
  • Sends final status report
```

---

## 📲 Telegram Alerts - What You See

### Trailer Updates (northex10)
```
Source: TRAILERS (northex10@gmail.com)
✅ Added: TR-001, TR-002
```

### Insurance Coverage (readycarriers)
```
Source: INSURANCE (readycarriers@gmail.com)
🚗 Truck 770, 445, 123
🚐 Trailer TR-001, TR-002
👤 Driver Ahmed, John, Michael
```

### Commands Executed (info@)
```
Source: COMMANDS (info@readycarrier.com)
✅ Trucks Added: 770, 445
❌ Trucks Removed: 600
✅ Trailers Added: TR-001
```

---

## ✅ Example - Complete Day

### 8:00 AM - Email from northex10
```
Subject: Weekly Trailer List

TR-001
TR-002
TR-003
```
→ Telegram: "✅ Trailers Added: TR-001, TR-002, TR-003"
→ Database: `insurance_trailers` updated

### 10:00 AM - Email from readycarriers
```
Subject: Insurance Policy Coverage Update

Covered Trucks: 770, 445, 123, 456
Covered Trailers: TR-001, TR-002
Drivers: Ahmed Tamer Hassani, John Smith
```
→ Telegram: "ℹ️ Insurance coverage: 4 trucks, 2 trailers, 2 drivers"
→ No database changes (reference only)

### 2:00 PM - Agent sends command email
```
Subject: Fleet Update

Add truck 770
Add truck 445
Remove truck 600
Add trailer TR-001
Add driver Ahmed Tamer Hassani
```
→ Telegram: "✅ Trucks Added: 770, 445 | ❌ Removed: 600 | ✅ Trailers: TR-001"
→ Database: `insurance_trucks` & `insurance_trailers` updated immediately
→ ReadyTMS `/insurance` page updated live

### 4:00 PM - Final Check
```
System consolidates:
Current Active Trucks: 12
Current Active Trailers: 5
Last Update: 2:00 PM (trucks 770, 445 added; 600 removed)
```
→ Telegram: Final daily summary sent

---

## 🚀 Deployment

### 1. Copy Unified Processor
```bash
cp email_processor_unified.js server/email_processor.js
```

### 2. Routes Already Configured
```typescript
// In routes.ts:
import { emailProcessorRoute } from "./email_processor.js";
app.post("/api/email/process", emailProcessorRoute);
```

### 3. Environment Variables
```
TELEGRAM_BOT_TOKEN=8871488327:AAFgpbfMFPe_KqTUV_8xjPy2I7T5C0Fmmkc
TELEGRAM_CHAT_ID=-5240100622
```

### 4. Deploy & Test
```bash
git add .
git commit -m "Deploy unified email processor (3 sources)"
git push
npm run build && npm start
```

---

## 📊 Summary

| Email Source | Purpose | Action | Frequency |
|---|---|---|---|
| **northex10** | Trailer info | Auto-add to DB | Multiple/day |
| **readycarriers** | Insurance coverage | Log for reference | Daily |
| **info@** | Commands | Execute immediately | Anytime |

**Result:** Complete visibility + automatic updates + agent control!

---

## 🎯 What You Get

✅ Trailers auto-added from northex10  
✅ Insurance coverage tracked from readycarriers  
✅ Agent commands executed immediately from info@  
✅ Real-time Telegram alerts for all changes  
✅ Current status always visible in ReadyTMS  
✅ Complete audit trail of all updates  

**All monitoring, zero manual data entry!**
