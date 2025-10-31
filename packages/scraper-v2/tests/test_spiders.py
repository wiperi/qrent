# tests/test_spiders.py - Ensures spider stubs output expected structure
from __future__ import annotations

import asyncio

import pytest

from scraper_v2.config.models import BrowserSettings, RequestSettings, SiteConfig, SiteParams
from scraper_v2.spiders.domain_spider import DomainSpider
from scraper_v2.spiders.realestate_spider import RealEstateSpider


class DummyContext:
    """Minimal context stub satisfying BaseSpider requirements."""

    async def close(self) -> None:  # pragma: no cover - no action required
        return None


@pytest.mark.asyncio
async def test_realestate_spider_stub() -> None:
    config = SiteConfig(
        name="RealEstate",
        spider_class="realestate_au",
        enabled=True,
        base_url="https://example.com",
        params=SiteParams(locations=["foo"]),
        browser=BrowserSettings(),
        request=RequestSettings(delay=(0, 0), headers={}),
    )
    spider = RealEstateSpider()
    urls = await spider.get_urls(DummyContext(), config)
    assert urls
    item = await spider.scrape_detail(DummyContext(), urls[0], config)
    assert item["source"] == "realestate_au"


@pytest.mark.asyncio
async def test_domain_spider_stub() -> None:
    config = SiteConfig(
        name="Domain",
        spider_class="domain_com_au",
        enabled=True,
        base_url="https://example.com",
        params=SiteParams(max_pages=1),
        browser=BrowserSettings(),
        request=RequestSettings(delay=(0, 0), headers={}),
    )
    spider = DomainSpider()
    urls = await spider.get_urls(DummyContext(), config)
    assert urls
    item = await spider.scrape_detail(DummyContext(), urls[0], config)
    assert item["source"] == "domain_com_au"
