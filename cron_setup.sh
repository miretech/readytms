#!/bin/bash

# Setup cron job for daily insurance check at 8:00 AM

MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CRON_JOB="0 8 * * * cd $MONITOR_DIR && /usr/bin/python3 insurance_monitor_production.py --mode check-now >> logs/cron.log 2>&1"

echo "Setting up daily cron job at 8:00 AM..."
echo "Directory: $MONITOR_DIR"

# Check if job already exists
if crontab -l 2>/dev/null | grep -q "insurance_monitor"; then
    echo "⚠️  Old cron job found. Removing..."
    crontab -l | grep -v "insurance_monitor" | crontab -
fi

# Add new cron job
mkdir -p "$MONITOR_DIR/logs"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed:"
crontab -l | grep "insurance_monitor"
echo ""
echo "📍 Log file: $MONITOR_DIR/logs/cron.log"
echo ""
echo "To remove: crontab -e and delete the line"
echo "To test: cd $MONITOR_DIR && python3 insurance_monitor_production.py --mode check-now"
