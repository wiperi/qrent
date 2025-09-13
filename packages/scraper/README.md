# QRent Scraper - Independent Deployment

🚀 **Independent** Australian property data scraping and processing service, specifically designed for rental information around Sydney universities (UNSW, USYD, UTS).

## ✨ Features

- 🏠 Scrape property basic information from Domain.com.au
- 🧹 Intelligent data cleaning and standardization
- 📍 Google Maps API for commute time calculation
- 🤖 AI-driven property scoring and keyword extraction
- 🗄️ Incremental database updates
- 🐳 **Completely independent Docker deployment**
- ⏰ Scheduled task support (runs daily at 1:00 AM)
- 🔒 Fully isolated from main application

## 🚦 Quick Start

### 1. Initialize Environment
```bash
cd packages/scraper
./deploy.sh init
```

### 2. Configure Environment Variables
```bash
# Edit configuration file
nano .env

# Required configuration:
# - Database connection information
# - Google Maps API key
# - DashScope API key
```

### 3. Build and Start
```bash
# Build image
./deploy.sh build

# Start service
./deploy.sh start

# Check status
./deploy.sh status
```

## 📋 Management Commands

```bash
./deploy.sh init        # Initialize environment
./deploy.sh build       # Build Docker image
./deploy.sh start       # Start service
./deploy.sh stop        # Stop service
./deploy.sh restart     # Restart service
./deploy.sh status      # Show status
./deploy.sh logs        # Show real-time logs
./deploy.sh run         # Execute scraper immediately
./deploy.sh shell       # Enter container command line
./deploy.sh test        # Test mode
./deploy.sh backup      # Backup data
./deploy.sh cleanup     # Clean all resources
./deploy.sh help        # Show help
```

## 🔧 Configuration Options

### Environment Variables Configuration
Configure the following variables in the `.env` file:

```bash
# Database Configuration
DB_HOST=your_database_host
DB_USER=property_user
DB_PASSWORD=your_secure_password
DB_DATABASE=qrent_db
DB_PORT=3306

# API Keys
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PROPERTY_RATING_API_KEY=your_dashscope_api_key
```

### Running Mode Configuration
Modify the `command` parameter in `docker-compose.yml`:

- `["cron-only"]` - Scheduled task mode (recommended for production)
- `["run"]` - Immediate execution mode
- `["test"]` - Test mode

## 📁 Project Structure

```
packages/scraper/
├── deploy.sh                    # 🎯 Independent deployment management script
├── docker-compose.yml           # 🐳 Independent Docker configuration
├── Dockerfile                   # 📦 Docker image build file
├── .env.example                 # ⚙️ Environment variables template
├── property.py                  # Main program
├── scraper.py                   # Basic data scraping
├── target_areas.py              # Target area configuration
├── data_cleaner.py              # Data cleaning
├── scraper_detailed.py          # Detailed information scraping
├── commute_time.py              # Commute time calculation
├── point.py                     # AI scoring and keyword extraction
├── csv_cleaner_and_importer.py  # Database import
├── requirements.txt             # Python dependencies
├── docker-entrypoint.sh         # Docker entry script
├── backup/                      # 🗂️ Backup directory
├── logs/                        # 📋 Log directory
└── README.md                    # 📖 This documentation
```

## 🔄 Data Processing Workflow

```
Domain.com.au Property Data
         ↓
1. Basic Data Scraping (UNSW + USYD)
         ↓
2. Data Cleaning and Standardization
         ↓
3. Detailed Information Supplementation (description, available date)
         ↓
4. Commute Time Calculation (to universities)
         ↓
5. AI Scoring and Keyword Extraction
         ↓
6. UTS Data Generation (copy USYD data)
         ↓
7. UTS Commute Time Recalculation
         ↓
8. Database Import (three universities separately)
         ↓
9. Cleanup Temporary Files
```

## 🎯 Target Areas

### UNSW Surrounding Areas (10 postcodes)
newtown, eastgardens, pagewood, maroubra, kensington, kingsford, randwick, mascot, rosebery, zetland

### USYD Surrounding Areas (10 postcodes)
sydney-city, wolli-creek, hurstville, burwood, newtown, glebe, waterloo, chippendale, ultimo, haymarket

### UTS Surrounding Areas (10 postcodes)
sydney-city, ultimo, haymarket, pyrmont, chippendale, surry-hills, redfern, waterloo, glebe, newtown

## 📊 Monitoring and Logging

### Check Service Status
```bash
./deploy.sh status
```

### Real-time Log Monitoring
```bash
./deploy.sh logs
```

### Manual Task Execution
```bash
# Complete scraping process
./deploy.sh run

# Enter container for debugging
./deploy.sh shell
```

## 🛠️ API Configuration

### Google Maps API
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Maps JavaScript API" and "Distance Matrix API"
3. Create API key and set restrictions
4. Add key to `GOOGLE_MAPS_API_KEY` in `.env` file

### DashScope API (Alibaba Cloud)
1. Visit [Alibaba Cloud DashScope Console](https://dashscope.console.aliyun.com/)
2. Create API key
3. Add key to `PROPERTY_RATING_API_KEY` in `.env` file

## 🔍 Troubleshooting

### Common Issues

1. **Cannot connect to database**
   ```bash
   # Check database configuration
   ./deploy.sh shell
   env | grep DB_
   ```

2. **Chrome/ChromeDriver errors**
   ```bash
   # Rebuild image
   ./deploy.sh build
   ```

3. **API quota exceeded**
   - Check Google Maps API and DashScope API usage
   - Adjust concurrency or add delays

### Debug Mode
```bash
# Run test mode
./deploy.sh test

# Enter container for debugging
./deploy.sh shell

# View detailed logs
docker-compose logs scraper
```

## 🔒 Security Features

- ✅ Independent network isolation
- ✅ Run as non-root user
- ✅ Resource limit configuration
- ✅ Secure environment variable management
- ✅ Regular security updates

## 📈 Performance Configuration

### Resource Limits
- **Memory**: 1-2GB
- **CPU**: 0.5-1 core
- **Disk**: Automatic temporary file cleanup

### Optimization Configuration
- Intelligent data caching
- Incremental update strategy
- Concurrency control
- API call optimization

## 🔄 Updates and Maintenance

### Regular Maintenance
```bash
# Backup data
./deploy.sh backup

# Update image
./deploy.sh update

# Restart service
./deploy.sh restart
```

### Complete Cleanup
```bash
# Clean all Docker resources
./deploy.sh cleanup
```

## 🏗️ Docker Architecture

### Container Components
- **Base Image**: Python 3.11-slim-bullseye
- **Browser**: Google Chrome (stable)
- **WebDriver**: ChromeDriver (version-matched)
- **Process Manager**: Cron for scheduled tasks
- **User Security**: Non-root user execution

### Volume Management
- `scraper_logs`: Persistent log storage
- `scraper_data`: Temporary data storage
- `./backup`: Local backup directory

### Network Configuration
- **Isolated Network**: `qrent-scraper-network`
- **External Access**: Database connection only
- **Port Exposure**: None (security by design)

### Health Checks
- **Chrome Installation**: Verified on startup
- **ChromeDriver Version**: Automatic compatibility check
- **Python Dependencies**: Import validation
- **API Connectivity**: Runtime verification

## 🚀 Deployment Modes

### Production Mode (Recommended)
```bash
# Scheduled execution at 1:00 AM daily
./deploy.sh start
```

### Development Mode
```bash
# Immediate execution for testing
docker-compose run --rm scraper run
```

### Debug Mode
```bash
# Interactive shell access
./deploy.sh shell
```

## 📦 Data Management

### University-Specific Logic
- **UNSW & USYD**: Independent data scraping
- **UTS**: Copies USYD data, recalculates commute times only
- **Database Import**: Separate tables for each university

### Data Lifecycle
1. **Scraping**: Fresh data from Domain.com.au
2. **Processing**: AI enhancement and geo-calculation
3. **Storage**: Incremental database updates
4. **Cleanup**: Automatic temporary file removal
5. **Backup**: Optional data preservation

## 📞 Support

If you encounter issues:
1. Check logs: `./deploy.sh logs`
2. Run tests: `./deploy.sh test`
3. Check configuration: `./deploy.sh status`
4. Debug mode: `./deploy.sh shell`

Independent deployment ensures scraper service is completely isolated from the main application, providing better stability and security.

## 📄 License

This project is part of the QRent application suite. All rights reserved.

---

**Note**: This scraper is designed specifically for educational and research purposes related to Sydney university area rental market analysis.
