#!/bin/bash
# Scraper execution wrapper with cleanup and error handling

set -e

echo "🔍 Cleaning up old processes..."
pkill -9 chrome || true
pkill -9 chromedriver || true
sleep 2

echo "💾 Checking memory..."
free -h

echo "🐍 Activating Python environment..."
cd /app
source venv/bin/activate 2>/dev/null || true

echo "🕷️ Running property scraper..."
python property.py

echo "📊 Importing data to database..."
python csv_cleaner_and_importer.py

echo "✅ Scraper completed successfully"
