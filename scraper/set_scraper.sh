#!/bin/bash
# This script sets up a cron job to run the property scraper daily at 1 AM.

set -e

SCRIPT_PATH="$(dirname "$0")/start_scraper.sh"
LOG_PATH="$(dirname "$0")/scraper.log"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Script $SCRIPT_PATH does not exist."
    exit 1
fi

chmod +x "$SCRIPT_PATH"
echo "Ensured $SCRIPT_PATH is executable."
# 1am 
CRON_EXPRESSION="0 1 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1"

if crontab -l | grep -F "$SCRIPT_PATH" >/dev/null 2>&1; then
    echo "Cron job for $SCRIPT_PATH already exists. Skipping addition."
else
    (crontab -l 2>/dev/null; echo "$CRON_EXPRESSION") | crontab -
    echo "Added cron job: $CRON_EXPRESSION"
fi
echo "Current cron jobs:"
crontab -l