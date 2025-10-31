# spiders/domain_spider.py - Spider implementation for Domain.com.au
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


class DomainSpider(BaseSpider):
    """Simple spider stub that produces deterministic items for Domain.com.au."""

    spider_name = SpiderName.DOMAIN_COM_AU

    async def get_urls(self, context: BrowserContext, config: SiteConfig) -> List[str]:
        return [f"{config.base_url}/mock/{index}" for index in range(config.params.max_pages)]

    async def scrape_detail(self, context: BrowserContext, url: str, config: SiteConfig) -> Item:
        now = datetime.now()
        return {
            "id": None,
            "url": url,
            "title": f"Domain sample listing {url.split('/')[-1]}",
            "address": "456 Demo Road, Melbourne VIC 3000",
            "bedrooms": 3,
            "bathrooms": 2,
            "parking": 1,
            "property_type": "House",
            "price": 750,
            "bond": 3000,
            "available_date": now.isoformat(),
            "scraped_at": now.isoformat(),
            "latitude": -37.8136,
            "longitude": 144.9631,
            "description": "Synthetic Domain listing, replace with Playwright implementation.",
            "features": ["Garage", "Heating"],
            "images": ["https://example.com/imageA.jpg"],
            "source": self.spider_name.value,
        }
