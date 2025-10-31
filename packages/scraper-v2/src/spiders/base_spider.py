# spiders/base_spider.py - Base class defining spider execution contract
from __future__ import annotations

import asyncio
import random
import time
from abc import ABC, abstractmethod
from typing import Iterable, List, MutableMapping

from loguru import logger

from ..config.models import SiteConfig
from ..pipelines import PipelineManager
from ..utils.enums import SpiderStatus
from ..utils.metrics import MetricsCollector

try:
    from playwright.async_api import BrowserContext
except ImportError:  # pragma: no cover
    BrowserContext = object  # type: ignore[assignment]

Item = MutableMapping[str, object]


class BaseSpider(ABC):
    """Provides shared scrape orchestration logic for site spiders."""

    def __init__(self, pipeline: PipelineManager | None = None) -> None:
        self.pipeline = pipeline or PipelineManager()
        self.metrics = MetricsCollector()

    async def scrape(self, context: BrowserContext, config: SiteConfig) -> List[Item]:
        """Run full scrape flow: listing discovery, detail scraping, pipeline processing."""
        self.metrics.update_active(+1)
        start = time.perf_counter()
        try:
            urls = await self.get_urls(context, config)
            logger.info(f"{config.name}: discovered {len(urls)} urls")

            items: List[Item] = []
            for url in urls:
                try:
                    raw_item = await self.scrape_detail(context, url, config)
                    if raw_item:
                        items.append(raw_item)
                except Exception as exc:  # pragma: no cover - logging side effect
                    logger.error(f"{config.name}: failed to scrape {url}: {exc}")
                await asyncio.sleep(random.uniform(*config.request.delay))

            processed = await self.pipeline.process(items)
            duration = time.perf_counter() - start
            self.metrics.record_scrape(config.spider_class.value, duration, SpiderStatus.SUCCESS, len(processed))
            return processed
        except Exception:
            duration = time.perf_counter() - start
            self.metrics.record_scrape(config.spider_class.value, duration, SpiderStatus.FAILURE, 0)
            raise
        finally:
            self.metrics.update_active(-1)

    @abstractmethod
    async def get_urls(self, context: BrowserContext, config: SiteConfig) -> List[str]:
        """Return listing page URLs to scrape."""

    @abstractmethod
    async def scrape_detail(self, context: BrowserContext, url: str, config: SiteConfig) -> Item:
        """Scrape data from the provided detail url."""
