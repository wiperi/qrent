# QRent Property Scraper

A production-ready, modular property scraping framework for Australian rental market, specifically designed for university student accommodation near UNSW, USYD, and UTS.

## 🌟 Features

### Core Capabilities
- **Multi-Platform Scraping**: Supports RealEstate.com.au and Domain.com.au
- **Anti-Bot Protection**: Playwright persistent browser profiles with automatic reset mechanism
- **Historical Data Reuse**: Intelligent caching system to avoid redundant API calls
- **AI-Powered Scoring**: Property quality assessment using DashScope (Qwen) API
- **Commute Time Calculation**: Google Maps API integration for transit time estimates
- **Database Integration**: MySQL storage with intelligent update/delete logic
- **Modular Architecture**: Clean separation of scrapers, services, models, and utilities

### Advanced Features
- **Smart Region Matching**: Fuzzy address parsing for flexible location handling
- **Profile Reset Strategy**: Bypasses IP blocking by resetting browser profile every 30 properties
- **Concurrent Processing**: Multi-threaded scoring and commute calculation
- **Real-time Logging**: Live progress monitoring with automatic flush
- **CSV Export**: Structured data output with date-stamped filenames
- **Error Recovery**: Comprehensive retry mechanisms and error handling

## � Project Structure

```
src/
├── config/
│   ├── __init__.py
│   └── settings.py          # Centralized configuration management
├── models/
│   ├── __init__.py
│   └── property.py          # Property data model & enums
├── scrapers/
│   ├── __init__.py
│   ├── base.py              # Base scraper abstract class
│   ├── domain.py            # Domain.com.au scraper
│   └── realestate.py        # RealEstate.com.au scraper (Playwright)
├── services/
│   ├── __init__.py
│   ├── commute.py           # Google Maps commute time service
│   ├── scoring.py           # AI property scoring service
│   ├── database.py          # Database connection service
│   └── database_importer.py # CSV to MySQL import logic
├── utils/
│   ├── __init__.py
│   ├── browser.py           # Browser manager (Selenium/Playwright)
│   ├── helpers.py           # Utility functions
│   └── logger.py            # Logging configuration
└── pipeline.py              # Main orchestration pipeline
```

## � Quick Start

### Prerequisites

- Python 3.8+
- MySQL 5.7+ or 8.0+
- Google Maps API key (for commute calculation)
- DashScope API key (for property scoring)

### Installation

```bash
# Clone the repository
cd packages/scraper

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=qrent
DB_PORT=3306

# API Keys
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
DASHSCOPE_API_KEY=your_dashscope_api_key
PROPERTY_RATING_API_KEY=your_dashscope_api_key  # Alternative key name

# Output Directory
OUTPUT_DIR=./output
```

### Basic Usage

```python
from src.pipeline import ScraperPipeline

# Initialize pipeline with all features enabled
pipeline = ScraperPipeline(
    scraper_types=['realestate'],  # or ['domain'] or both
    enable_scoring=True,
    enable_commute=True,
    enable_database=True,
    output_dir='./output'
)

# Run complete pipeline for UNSW
properties = pipeline.run(
    university='UNSW',
    scrape_details=True,
    skip_existing=True
)

print(f"Scraped {len(properties)} properties")
```

### Command Line Usage

```bash
# Run full pipeline for UNSW
python -m src.pipeline UNSW

# Generate UTS data from USYD (with commute time reuse)
python generate_uts_csv.py

# Process USYD details only (list already exists)
python process_usyd_only.py

# Clean CSV (remove properties without description)
python clean_csv.py output/UNSW_rentdata_251222.csv

# Import to database
python csv_cleaner_and_importer.py process output/UNSW_rentdata_251222.csv
```

## 🏗️ Architecture

### Pipeline Workflow

```
1. List Scraping
   ↓
2. Historical Data Loading (7-day cache)
   ↓
3. Detail Scraping (with profile reset every 30 properties)
   ↓
4. AI Scoring (DashScope API, 0-20 scale)
   ↓
5. Commute Time Calculation (Google Maps Transit API)
   ↓
6. Database Import (with outdated RealEstate property deletion)
   ↓
7. CSV Export
```

### Key Components

#### 1. ScraperPipeline (`pipeline.py`)
- **Purpose**: Orchestrates the complete scraping workflow
- **Key Methods**:
  - `_load_history_csv()`: Loads last 7 days' CSV for data reuse
  - `_apply_history_data()`: Applies cached details/scores/commute times
  - `run()`: Main execution flow for a university
  - **UTS Generation** (lines 641-710): Copies USYD data with UTS-specific commute

#### 2. RealEstateScraper (`scrapers/realestate.py`)
- **Purpose**: RealEstate.com.au scraping with Kasada bypass
- **Anti-Bot Strategy**:
  - Playwright persistent browser (`rea_profile/`)
  - Profile reset every 30 properties via `_reset_profile()`
  - Random delays (1-2 seconds) between requests
  - Page scrolling simulation
- **Key Methods**:
  - `scrape_listings()`: Scrapes property list pages
  - `scrape_property_details()`: Scrapes individual property details

#### 3. ScoringService (`services/scoring.py`)
- **Purpose**: AI-powered property quality assessment
- **Scoring Dimensions**:
  1. House Quality (0-10)
  2. Living Experience (0-10)
  3. Internal Facilities (0-10)
  - **Total Score** = (Sum of 3 dimensions) / 30 × 20
- **API**: DashScope `qwen-plus-1220` model
- **Strategy**: Multiple calls for consistency, average results

#### 4. CommuteService (`services/commute.py`)
- **Purpose**: Calculate public transit commute times
- **API**: Google Maps Directions API
- **Parameters**: 
  - Mode: Transit
  - Departure: Next day 8:30 AM
  - Alternatives: False (fastest route only)
- **Smart Reuse**: Checks `commute_times` dict before API call

#### 5. DatabaseImporter (`services/database_importer.py`)


## 🔧 Configuration

### ScraperConfig

```python
max_pages: int = 7          # Pages to scrape per area
page_delay: float = 5.0     # Delay between pages
request_delay: float = 3.0  # Delay between requests
retry_count: int = 3
retry_delay: float = 10.0
```

### Target Areas

Configurable target suburbs for each university in `config/settings.py`:

```python
TARGET_AREAS = {
    'UNSW': [
        "kensington-nsw-2033",
        "kingsford-nsw-2032",
        "randwick-nsw-2031",
        # ... 7 more areas
    ],
    'USYD': [...],
    'UTS': [...]
}
```

## 🛡️ Anti-Bot Strategies

### 1. Browser Profile Management
- **Persistent Profile**: Saves cookies, localStorage, session data
- **Automatic Reset**: Deletes profile every 30 properties
- **Directory**: `rea_profile/` (can be customized)

### 2. Request Patterns
- **Random Delays**: 1-2 seconds between requests
- **Page Scrolling**: Simulates human behavior
- **Wait Times**: Explicit waits for elements

### 3. Detection Avoidance
- Non-headless mode by default (uses Xvfb on servers)
- User-agent rotation (optional)
- Request header customization

## 📈 Performance Optimization

### Historical Data Reuse

The pipeline caches data from the last 7 days to minimize redundant operations:

```python
# Reuse statistics from a typical USYD run:
Details:  823 properties (no need to re-scrape)
Scores:   823 properties (no AI API calls)
Commute:  varies by university (no Google Maps API calls)
```

### Concurrent Processing

```python
# Scoring: 2 workers (configurable)
scoring_service = ScoringService(
    max_workers=2
)

# Commute: 5 workers (configurable)
commute_service = CommuteService(
    max_workers=5,
    request_delay=1.1  # Rate limiting
)
```

## 📦 CSV Output Format

Generated files: `{UNIVERSITY}_rentdata_YYMMDD.csv`

```csv
houseId,bedrooms,bathrooms,parking,propertyType,pricePerWeek,address_line1,address_line2,suburb,state,postcode,url,thumbnail_url,description_en,keywords,average_score,commuteTime_UNSW,commuteTime_USYD,commuteTime_UTS,available_date,source
```

## 🗄️ Database Schema

### Key Tables

- `property`: Main property data
- `property_school`: Many-to-many relationship (property ↔ school)
- `property_images`: Property image gallery
- `regions`: Suburb/postcode lookup table
- `schools`: University information

## 🔍 Troubleshooting

### IP Blocking Issues

If you encounter "Access Denied" or Kasada challenges:

```python
# Increase profile reset frequency
scraper._reset_profile()  # Manual reset
```

### Historical Data Not Loading

Check the output directory for CSV files:

```bash
ls -lt output/UNSW_rentdata_*.csv
```

Ensure files are within 7 days and don't contain `_list_` in filename.

### Database Import Errors

**Region Mismatch**: The fuzzy matching should handle most cases, but if you see warnings about unmatched regions, new records will be created with `state=NSW` and `postcode=0`. Review and update manually if needed.

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t qrent-scraper -f Dockerfile .

# Run scraper
docker run --env-file .env qrent-scraper python src/pipeline.py UNSW
```

### Scheduled Runs (Cron)

```cron
# Daily scraping at 2 AM
0 2 * * * cd /path/to/scraper && python src/pipeline.py UNSW >> logs/unsw.log 2>&1
0 3 * * * cd /path/to/scraper && python src/pipeline.py USYD >> logs/usyd.log 2>&1
0 4 * * * cd /path/to/scraper && python src/pipeline.py UTS >> logs/uts.log 2>&1
```

## 📝 Development

### Adding a New Scraper

```python
from src.scrapers.base import BaseScraper
from src.models import PropertyData, PropertySource

class NewSiteScraper(BaseScraper):
    SOURCE = PropertySource.NEW_SITE
    BASE_URL = "https://newsite.com.au"
    
    def scrape_listings(self, area: str) -> List[PropertyData]:
        # Implement listing scraping
        pass
    
    def scrape_property_details(self, properties: List[PropertyData]) -> None:
        # Implement detail scraping
        pass

# Register in pipeline.py
SCRAPERS = {
    'domain': DomainScraper,
    'realestate': RealEstateScraper,
    'newsite': NewSiteScraper,  # Add here
}
```

### Running Tests

```bash
# Run unit tests
pytest tests/

# Run with coverage
pytest --cov=src tests/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for QRent internal use only.

## 📧 Contact

For questions or issues, please contact the development team.

## 🙏 Acknowledgments

---

**Last Updated**: December 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅
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
