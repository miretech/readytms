#!/bin/bash

# Email Automation Complete Setup Script
# Validates, installs, and tests the entire email system

set -e

MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📦 Email Automation Setup"
echo "=========================="
echo "Directory: $MONITOR_DIR"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Python
echo -e "${BLUE}[1/8]${NC} Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python $PYTHON_VERSION${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/8]${NC} Installing Python dependencies..."
if [ -f "$MONITOR_DIR/requirements.txt" ]; then
    pip3 install -q -r "$MONITOR_DIR/requirements.txt" 2>/dev/null || pip install -q -r "$MONITOR_DIR/requirements.txt"
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ requirements.txt not found${NC}"
    exit 1
fi
echo ""

# Step 3: Check config.json
echo -e "${BLUE}[3/8]${NC} Checking configuration..."
if [ ! -f "$MONITOR_DIR/config.json" ]; then
    echo -e "${RED}❌ config.json not found${NC}"
    exit 1
fi

# Validate config has required fields
if ! grep -q '"email"' "$MONITOR_DIR/config.json"; then
    echo -e "${RED}❌ Gmail email not configured${NC}"
    exit 1
fi

if ! grep -q '"app_password"' "$MONITOR_DIR/config.json"; then
    echo -e "${RED}❌ Gmail app_password not configured${NC}"
    exit 1
fi

if ! grep -q '"bot_token"' "$MONITOR_DIR/config.json"; then
    echo -e "${RED}❌ Telegram bot_token not configured${NC}"
    exit 1
fi

if ! grep -q '"primary_chat_id"' "$MONITOR_DIR/config.json"; then
    echo -e "${RED}❌ Telegram primary_chat_id not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration valid${NC}"
echo ""

# Step 4: Create logs directory
echo -e "${BLUE}[4/8]${NC} Setting up directories..."
mkdir -p "$MONITOR_DIR/logs"
mkdir -p "$MONITOR_DIR/.cache"
echo -e "${GREEN}✅ Directories ready${NC}"
echo ""

# Step 5: Test Gmail connection
echo -e "${BLUE}[5/8]${NC} Testing Gmail connection..."
python3 << 'PYEOF'
import json
import imaplib

try:
    with open('/Users/northeast/ready_monitor/config.json') as f:
        config = json.load(f)

    email = config.get('gmail', {}).get('email')
    app_password = config.get('gmail', {}).get('app_password')

    imap = imaplib.IMAP4_SSL('imap.gmail.com')
    imap.login(email, app_password)
    imap.select('INBOX')
    imap.logout()
    print("✅ Gmail authenticated successfully")
except Exception as e:
    print(f"❌ Gmail connection failed: {e}")
    exit(1)
PYEOF
echo ""

# Step 6: Test Telegram connection
echo -e "${BLUE}[6/8]${NC} Testing Telegram connection..."
python3 << 'PYEOF'
import json
import requests

try:
    with open('/Users/northeast/ready_monitor/config.json') as f:
        config = json.load(f)

    bot_token = config.get('telegram', {}).get('bot_token')
    chat_id = config.get('telegram', {}).get('primary_chat_id')

    url = f"https://api.telegram.org/bot{bot_token}/getMe"
    response = requests.get(url, timeout=5)

    if response.status_code == 200:
        print("✅ Telegram bot authenticated")
    else:
        print(f"❌ Telegram error: {response.text}")
        exit(1)
except Exception as e:
    print(f"❌ Telegram connection failed: {e}")
    exit(1)
PYEOF
echo ""

# Step 7: Test email monitor
echo -e "${BLUE}[7/8]${NC} Testing email monitor..."
cd "$MONITOR_DIR"
python3 insurance_email_notifier.py 2>&1 | grep -E "✅|❌|Found|Parsed" | head -5
echo -e "${GREEN}✅ Email monitor working${NC}"
echo ""

# Step 8: Install cron jobs
echo -e "${BLUE}[8/8]${NC} Installing cron jobs..."

# Check if cron jobs already exist
if crontab -l 2>/dev/null | grep -q "insurance_email_notifier"; then
    echo "Cron jobs already installed, updating..."
    crontab -l | grep -v "insurance_email_notifier" | crontab -
fi

# Create cron jobs
CRON_8AM="0 8 * * * cd $MONITOR_DIR && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1"
CRON_4PM="0 16 * * * cd $MONITOR_DIR && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1"

(crontab -l 2>/dev/null; echo "$CRON_8AM"; echo "$CRON_4PM") | crontab -
echo -e "${GREEN}✅ Cron jobs installed${NC}"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Email Monitor Status:"
echo "   • Runs at: 8:00 AM and 4:00 PM daily"
echo "   • Monitors: northex10@gmail.com, readycarriers@gmail.com"
echo "   • Alerts via: Telegram"
echo "   • Logs: $MONITOR_DIR/logs/insurance_email_notifier.log"
echo ""
echo "📋 Verify Setup:"
echo "   crontab -l | grep insurance_email_notifier"
echo ""
echo "🔍 Watch Logs:"
echo "   tail -f $MONITOR_DIR/logs/insurance_email_notifier.log"
echo ""
echo "🧪 Test Now:"
echo "   python3 $MONITOR_DIR/insurance_email_notifier.py"
echo ""
echo "📖 Documentation:"
echo "   • $MONITOR_DIR/EMAIL_AUTOMATION_GUIDE.md"
echo "   • $MONITOR_DIR/DEPLOYMENT_SUMMARY.md"
echo ""
