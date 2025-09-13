#!/bin/bash
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting scraper container..."

# Check if running as root for initial setup
if [ "$(id -u)" = "0" ]; then
    log "Setting up environment as root..."
    
    # Create necessary directories
    mkdir -p /app/scraper/logs
    mkdir -p /app/scraper/data
    
    # Create log files
    touch /app/scraper/logs/scraper.log
    touch /app/scraper/logs/cron.log
    
    # Set permissions
    chown -R app:app /app/scraper
    chmod -R 755 /app/scraper
    
    # Create cron job
    echo "# Scraper cron job - runs daily at 1 AM" > /etc/cron.d/scraper-cron
    echo "0 1 * * * app cd /app/scraper && /usr/local/bin/python property.py >> /app/scraper/logs/cron.log 2>&1" >> /etc/cron.d/scraper-cron
    echo "" >> /etc/cron.d/scraper-cron
    chmod 0644 /etc/cron.d/scraper-cron
    
    # Start cron service
    service cron start
    log "Cron service started - scraper will run daily at 1:00 AM"
    
    # Switch to app user for running the scraper
    exec gosu app "$0" "$@"
fi

# Running as app user
cd /app/scraper

# Verify Chrome and ChromeDriver
log "Verifying Chrome installation..."
google-chrome --version || { log "ERROR: Chrome not found"; exit 1; }

log "Verifying ChromeDriver installation..."
chromedriver --version || { log "ERROR: ChromeDriver not found"; exit 1; }

# Check required environment variables
required_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_DATABASE" "GOOGLE_MAPS_API_KEY" "PROPERTY_RATING_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log "WARNING: Environment variable $var is not set"
    fi
done

# Handle different run modes
case "${1:-cron-only}" in
    "run")
        log "Running scraper immediately..."
        python property.py 2>&1 | tee -a logs/scraper.log
        ;;
    "cron-only")
        log "Starting in cron-only mode - scraper will run daily at 1:00 AM"
        # Keep container running by tailing logs
        tail -f logs/scraper.log logs/cron.log
        ;;
    "test")
        log "Running in test mode..."
        python -c "
import sys
sys.path.append('.')
from scraper import *
from target_areas import *
print('✅ All imports successful')
print('📍 UNSW postcodes:', len(postcodes_unsw))
print('📍 USYD postcodes:', len(postcodes_usyd))
"
        ;;
    "shell")
        log "Starting interactive shell..."
        exec /bin/bash
        ;;
    *)
        log "Running custom command: $*"
        exec "$@"
        ;;
esac 