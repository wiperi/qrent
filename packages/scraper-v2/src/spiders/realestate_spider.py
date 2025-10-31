# spiders/realestate_spider.py - Spider implementation for RealEstate.com.au
from __future__ import annotations

from datetime import datetime
from typing import List

from ..config.models import SiteConfig
from ..utils.enums import SpiderName
from .base_spider import BaseSpider, Item

try:
    from playwright.async_api import BrowserContext
except ImportError:  # pragma: no cover
    BrowserContext = object  # type: ignore[assignment]


class RealEstateSpider(BaseSpider):
    """Simple spider stub that synthesises property items for demonstration."""

    spider_name = SpiderName.REALESTATE_AU

    async def get_urls(self, context: BrowserContext, config: SiteConfig) -> List[str]:
        """Generate mock URLs for the configured locations."""
        return [f"{config.base_url}/mock/{location}" for location in config.params.locations]

    async def scrape_detail(self, context: BrowserContext, url: str, config: SiteConfig) -> Item:
        """Return a synthesised property payload for the provided URL."""
        now = datetime.now()
        return {
            "id": None,
            "url": url,
            "title": f"Sample property at {url.split('/')[-1]}",
            "address": "123 Example Street, Sydney NSW 2000",
            "bedrooms": 2,
            "bathrooms": 1,
            "parking": 1,
            "property_type": "Apartment",
            "price": 650,
            "bond": 2600,
            "available_date": now.isoformat(),
            "scraped_at": now.isoformat(),
            "latitude": -33.8688,
            "longitude": 151.2093,
            "description": "Synthetic sample listing, replace with real scraping logic.",
            "features": ["Air Conditioning", "Dishwasher"],
            "images": ["https://example.com/image1.jpg"],
            "source": self.spider_name.value,
        }
