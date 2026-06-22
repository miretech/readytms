# BUGFIX — Telegram Insurance Email Monitor stopped firing

**For:** the Claude Code agent running locally on the Mac Mini
**From:** the cloud Claude session (no Mac access, can't fix this directly)
**Date:** Sun Jun 14, 2026

---

## Symptom

User reports:
- Insurance email monitor was working **Thursday and Friday** (got Telegram alerts)
- **Today (Sunday)** — silent. No Telegram messages.

## What this is

A Python cron job that runs **twice daily (8 AM + 4 PM)**:
- Watches Gmail (via IMAP, 3 monitored inbox addresses) for new insurance-related emails
- Posts a Telegram alert when one arrives
- Lives on the `insurance-monitor` branch of `miretech/readytms`
- Was set up by `cron_setup_dual.sh` from that branch
- Source files: `insurance_email_notifier.py`, `config.json`, `logs/insurance_email_notifier.log`

## Most likely failure modes (in priority order)

1. **Cron job got wiped from crontab.** Most common — someone ran `crontab -r` or edited crontab and lost it. Fix: reinstall.
2. **Gmail app password expired/revoked.** Google rotates these for security. Symptom: log shows `Authentication failed`.
3. **Telegram bot token revoked.** Bot owner disabled it. Symptom: log shows `Unauthorized` from `api.telegram.org`.
4. **Mac was asleep at 8 AM today.** macOS doesn't run cron jobs while asleep — they don't catch up. Fix: re-run manually + consider switching to launchd which CAN wake the Mac.
5. **Script crashed last run, left stale lock or bad state in `last_check.db`.**

---

## Diagnose

```bash
# Find the monitor directory
DIR=$(find ~ -maxdepth 5 -name "insurance_email_notifier.py" 2>/dev/null | head -1 | xargs dirname)
echo "Monitor dir: $DIR"
cd "$DIR" || { echo "NOT FOUND — clone from insurance-monitor branch first"; exit 1; }

# 1. Is cron registered?
echo "─── Crontab ───"
crontab -l 2>/dev/null | grep insurance_email_notifier || echo "❌ NOT IN CRONTAB"

# 2. When did it last run?
echo "─── Log freshness ───"
ls -la logs/insurance_email_notifier.log logs/cron.log 2>/dev/null
tail -30 logs/insurance_email_notifier.log 2>/dev/null

# 3. Does config exist with creds?
echo "─── Config ───"
[ -f config.json ] && python3 -c "
import json
c = json.load(open('config.json'))
print('Gmail set:', 'email' in c.get('gmail', {}))
print('Gmail app password set:', bool(c.get('gmail', {}).get('app_password')))
print('Telegram token set:', bool(c.get('telegram', {}).get('bot_token')))
print('Telegram chat_id set:', bool(c.get('telegram', {}).get('chat_id')))
print('Monitored emails:', c.get('gmail', {}).get('monitor_emails'))
"

# 4. Sleep check — did Mac sleep at 8 AM today?
pmset -g log | grep -E "Sleep|Wake" | tail -10
```

## Fix (depends on what diagnose finds)

### If cron is missing
```bash
cd "$DIR"
bash cron_setup_dual.sh
# Verifies with: crontab -l | grep insurance_email_notifier
```

### If Gmail auth is failing
- User must regenerate app password at https://myaccount.google.com/apppasswords
- Update `config.json` → `gmail.app_password`

### If Telegram bot token revoked
- User must check the bot in @BotFather on Telegram
- Get fresh token via `/mybots → choose bot → API Token`
- Update `config.json` → `telegram.bot_token`

### If Mac was asleep at 8 AM
- Run the script manually NOW to catch up:
```bash
cd "$DIR" && /usr/bin/python3 insurance_email_notifier.py
```
- For future-proofing, consider migrating from `cron` to `launchd` with `StartCalendarInterval` — launchd CAN wake a sleeping Mac. (Optional, ask user first.)

### If script crashed mid-run (corrupted last_check.db)
```bash
cd "$DIR"
rm -f last_check.db    # forces a fresh state — safe, may re-send recent emails
/usr/bin/python3 insurance_email_notifier.py
```

---

## Verify the fix worked

After applying the fix, prove the loop end-to-end:

```bash
cd "$DIR"
/usr/bin/python3 insurance_email_notifier.py 2>&1 | tee /tmp/insurance-test.log
echo "---"
echo "Look for these in the output above:"
echo "  ✅ Gmail authenticated via IMAP"
echo "  📧 Parsed N insurance emails (or 'No new emails')"
echo "  ✅ Telegram message sent (if there were any emails to alert on)"
```

Then ask the user to check their Telegram — they should either see a fresh alert or know the script ran cleanly with nothing new to report.

If everything works, leave the user with:

> Fix applied. The 4 PM cron will fire tonight and alerts should resume. If they don't, run `tail -f $DIR/logs/insurance_email_notifier.log` to watch live.

---

## DO NOT do these things

- Don't modify the script itself unless you find a real bug — it was working Thursday and Friday
- Don't change the cron times (8 AM / 4 PM) without asking the user
- Don't commit `config.json` (has secrets — Gmail app password, Telegram bot token)
- Don't delete `last_check.db` unless dedup is causing the failure — it tracks which emails have been alerted on

---

## Background context (in case you need it)

- Repo: github.com/miretech/readytms, branch `insurance-monitor`
- ReadyTMS web app runs on Mac Mini at port 3001 (NOT 5000 — that's AirPlay)
- Cloudflare Tunnel forwards readytms.com → port 3001
- Auto-pull launchd service `com.readytms.autopull` only watches the `main` branch — it does NOT touch the insurance-monitor branch, so this script lives in its own clone somewhere on the Mac
- Common location guess: `~/ready_monitor/` or a subfolder of it
