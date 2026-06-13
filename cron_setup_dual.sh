#!/bin/bash

# Setup DUAL cron jobs:
# - 8:00 AM: Insurance email monitor (check for new emails)
# - 4:00 PM: Insurance email monitor (afternoon check)

MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create logs directory
mkdir -p "$MONITOR_DIR/logs"

echo "Setting up DUAL daily cron jobs..."
echo "Directory: $MONITOR_DIR"

# Remove existing insurance jobs
if crontab -l 2>/dev/null | grep -q "insurance_email_notifier"; then
    echo "⚠️  Old cron jobs found. Removing..."
    crontab -l | grep -v "insurance_email_notifier" | crontab -
fi

# Create cron jobs
CRON_8AM="0 8 * * * cd $MONITOR_DIR && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1"
CRON_4PM="0 16 * * * cd $MONITOR_DIR && /usr/bin/python3 insurance_email_notifier.py >> logs/cron.log 2>&1"

echo ""
echo "Installing cron jobs..."

# Add both jobs
(crontab -l 2>/dev/null; echo "$CRON_8AM"; echo "$CRON_4PM") | crontab -

echo ""
echo "✅ Cron jobs installed:"
echo ""
crontab -l | grep "insurance_email_notifier"

echo ""
echo "📍 Logs: $MONITOR_DIR/logs/cron.log"
echo "📧 Email monitor runs at:"
echo "   • 8:00 AM"
echo "   • 4:00 PM (16:00)"
echo ""
echo "To remove jobs: crontab -e and delete the lines"
echo "To test: cd $MONITOR_DIR && python3 insurance_email_notifier.py"
