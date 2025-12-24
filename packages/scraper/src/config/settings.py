"""
Scraper Configuration
Centralized configuration management
"""
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
env_paths = ['.env', '../.env', '../../.env', '/app/.env']
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    load_dotenv()


@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = field(default_factory=lambda: os.getenv("DB_HOST", "localhost"))
    user: str = field(default_factory=lambda: os.getenv("DB_USER", "root"))
    password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", ""))
    database: str = field(default_factory=lambda: os.getenv("DB_DATABASE", "qrent"))
    port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", 3306)))
    charset: str = "utf8mb4"
    connect_timeout: int = 60


@dataclass
class SeleniumConfig:
    """Selenium browser configuration"""
    headless: bool = True
    disable_gpu: bool = True
    window_size: str = "1920x1080"
    log_level: int = 3
    user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    page_load_timeout: int = 30
    implicit_wait: int = 10


@dataclass 
class ScraperConfig:
    """General scraper configuration"""
    max_pages: int = 7  # Scrape first 7 pages per area only
    page_delay: float = 5.0  # Page navigation delay
    request_delay: float = 3.0  # Request interval (seconds)
    retry_count: int = 3
    retry_delay: float = 10.0


@dataclass
class ScoringConfig:
    """Scoring service configuration"""
    api_key: str = field(default_factory=lambda: os.getenv("PROPERTY_RATING_API_KEY") or os.getenv("DASHSCOPE_API_KEY", ""))
    model_name: str = "qwen-plus-1220"
    num_calls: int = 2
    scores_per_call: int = 4
    max_workers: int = 2
    temperature: float = 0.7
    max_tokens: int = 150


@dataclass
class CommuteConfig:
    """Commute time calculation configuration"""
    api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_MAPS_API_KEY", ""))
    max_workers: int = 5
    request_delay: float = 1.1


# School coordinates configuration
SCHOOL_COORDINATES: Dict[str, str] = {
    'UNSW': "University of New South Wales, Kensington NSW 2052, Australia",
    'USYD': "University of Sydney, Camperdown NSW 2006, Australia",
    'UTS': "University of Technology Sydney, Ultimo NSW 2007, Australia"
}

# School name mapping
SCHOOL_NAME_MAPPING: Dict[str, str] = {
    'UNSW': 'University of New South Wales',
    'USYD': 'University of Sydney',
    'UTS': 'University of Technology Sydney'
}

# Target areas configuration
TARGET_AREAS: Dict[str, List[str]] = {
    'UNSW': [
        "newtown-nsw-2042",
        "eastgardens-nsw-2036",
        "pagewood-nsw-2035",
        "maroubra-nsw-2035",
        "kensington-nsw-2033",
        "kingsford-nsw-2032",
        "randwick-nsw-2031",
        "mascot-nsw-2020",
        "rosebery-nsw-2018",
        "zetland-nsw-2017",
    ],
    'USYD': [
        "sydney-city-nsw",
        "wolli-creek-nsw-2205",
        "hurstville-nsw-2220",
        "burwood-nsw-2134",
        "newtown-nsw-2042",
        "glebe-nsw-2037",
        "waterloo-nsw-2017",
        "chippendale-nsw-2008",
        "ultimo-nsw-2007",
        "haymarket-nsw-2000",
    ],
    'UTS': [
        "sydney-city-nsw",
        "ultimo-nsw-2007",
        "haymarket-nsw-2000",
        "pyrmont-nsw-2009",
        "chippendale-nsw-2008",
        "surry-hills-nsw-2010",
        "redfern-nsw-2016",
        "waterloo-nsw-2017",
        "glebe-nsw-2037",
        "newtown-nsw-2042",
    ]
}

# Property type mapping
PROPERTY_TYPE_MAPPING: Dict[str, int] = {
    'house': 1,
    'apartment': 2,
    'apartment / unit / flat': 2,
    'unit': 2,
    'flat': 2,
    'studio': 3,
    'semi-detached': 4,
    'townhouse': 5,
    'villa': 6,
    'duplex': 7,
    'terrace': 8,
}


@dataclass
class Settings:
    """Global settings"""
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    selenium: SeleniumConfig = field(default_factory=SeleniumConfig)
    scraper: ScraperConfig = field(default_factory=ScraperConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)
    commute: CommuteConfig = field(default_factory=CommuteConfig)
    
    # Data output directory
    output_dir: str = "."
    
    # Logging configuration
    log_level: str = "INFO"
    log_file: str = "scraper.log"


# Global settings instance
settings = Settings()
