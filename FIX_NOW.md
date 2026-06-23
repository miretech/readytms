# ▶︎ FIX NOW — Telegram monitor only sending to one chat

**For:** Claude Code running locally on the user's Mac Mini
**From:** cloud Claude session (no Mac access)
**User pain:** "Only one Telegram chat gets messages, dispatch and operations have been silent for a while. I don't want to paste commands all day."

---

## TL;DR — three things, then done

1. `cd ~/ready_monitor && git pull --no-rebase origin insurance-monitor` (resolve any merge with `git checkout --theirs` if conflicts)
2. Run the test below to fire one alert into all 3 Telegram chats
3. Tell the user which of the 3 groups received the message

---

## Background (so you can answer follow-ups)

- The user runs an insurance-email monitor at `~/ready_monitor/insurance_unified.py`
- It's triggered twice daily by cron: 8 AM + 4 PM
- It monitors 3 Gmail inboxes and posts alerts to **3** Telegram chats: `primary_chat_id`, `dispatch_chat_id`, `operations_chat_id` (all in `config.json` under the `telegram` key)
- **Bug found:** the script's `send_telegram()` function only used `primary_chat_id`. The other two chats were defined in config but never used.
- **Fix pushed to GitHub** branch `insurance-monitor` (commit `7ed257a`): `send_telegram()` now iterates every key ending in `_chat_id` and sends to each.
- The auto-pull launchd job only watches `main`, NOT `insurance-monitor`. That's why this branch needs a manual `git pull` to reach the Mac.

---

## Step 1 — pull the fix

```bash
cd ~/ready_monitor
git fetch origin insurance-monitor
git pull --no-rebase origin insurance-monitor
```

If merge fails on conflicts:
```bash
git checkout --theirs .gitignore insurance_unified.py 2>/dev/null
git add -A
git commit -m "merge: take GitHub versions"
```

Verify the fix is in place:
```bash
grep -A1 "_chat_id" insurance_unified.py | head -10
# expected: shows code iterating chat_ids, NOT a single primary_chat_id lookup
```

## Step 2 — test all 3 chats

Run a Python one-liner that invokes the patched `send_telegram` once:

```bash
cd ~/ready_monitor && python3 -c "
import sys; sys.path.insert(0, '.')
from insurance_unified import InsuranceUnifiedMonitor
m = InsuranceUnifiedMonitor()
ok = m.send_telegram('🧪 TEST', 'Verifying primary/dispatch/operations all receive alerts.')
print('all_ok:', ok)
"
```

Expected output:
```
✅ Telegram alert sent → primary_chat_id
✅ Telegram alert sent → dispatch_chat_id
✅ Telegram alert sent → operations_chat_id
all_ok: True
```

## Step 3 — confirm with the user

Open Telegram on the user's phone or web, check the 3 groups, and tell the user which received the test message. If any group didn't, the chat_id in `config.json` for that group is wrong — show the user the matching error from the log.

---

## Side note: keep insurance-monitor in sync automatically

The user mentioned they don't want to manually `git pull` for this branch. Optional improvement:

Append this command to `~/ready_monitor/deploy.sh` (or whatever script the autopull launchd calls) so future fixes auto-deploy:

```bash
( cd ~/ready_monitor && git fetch origin insurance-monitor && git merge --no-edit --strategy-option=theirs origin/insurance-monitor ) >> /tmp/insurance-autopull.log 2>&1
```

Ask the user before making this change — they may want to keep insurance-monitor manual.

---

## What NOT to do

- Don't merge `insurance-monitor` into `main`. They're separate by design: main is the TypeScript TMS app; insurance-monitor is the Python email watcher.
- Don't touch the `config.json` — it has secrets (Gmail app password, Telegram bot token).
- Don't change the cron schedule (8 AM / 4 PM) without asking the user.

Done state: user sees a test message arrive in **all three** Telegram groups. After that, the next 4 PM cron firing will alert all three groups automatically if any insurance emails arrive.
