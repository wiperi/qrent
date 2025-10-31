# coordinator/task_coordinator.py - Coordinates concurrent spider execution
from __future__ import annotations

import asyncio
from typing import List, Sequence

from loguru import logger

from ..browser import BrowserPool
from ..config.models import ScraperConfig, SiteConfig
from ..spiders import SPIDER_REGISTRY, BaseSpider
from ..utils.enums import SpiderStatus


class TaskCoordinator:
    """Coordinates spider execution across configured sites."""

    def __init__(self, config: ScraperConfig) -> None:
        self.config = config
        self.browser_pool = BrowserPool(max_contexts=config.global_.max_concurrent_spiders)

    async def run_all_tasks(self) -> None:
        """Run all enabled spiders concurrently."""
        active_sites = [site for site in self.config.sites if site.enabled]
        if not active_sites:
            logger.warning("No enabled sites found in configuration.")
            return

        logger.info(f"Launching coordinator for {len(active_sites)} sites")

        async with self.browser_pool:
            tasks = [self._run_site(site) for site in active_sites]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            self._handle_results(active_sites, results)

    async def _run_site(self, site: SiteConfig) -> None:
        """Execute a single site spider using the configured browser settings."""
        spider_cls = SPIDER_REGISTRY.get(site.spider_class)
        if spider_cls is None:
            raise RuntimeError(f"No spider registered for {site.spider_class}")

        spider: BaseSpider = spider_cls()
        context = await self.browser_pool.create_context(
            user_agent=site.browser.user_agent,
            viewport=site.browser.viewport,
            locale=site.browser.locale,
        )

        try:
            await spider.scrape(context, site)
        finally:
            await context.close()

    def _handle_results(self, sites: Sequence[SiteConfig], results: Sequence[object]) -> None:
        """Log summary of spider execution outcomes."""
        for site, result in zip(sites, results, strict=False):
            if isinstance(result, Exception):
                logger.error(f"Spider {site.name} finished with {SpiderStatus.FAILURE.value}: {result}")
            else:
                logger.info(f"Spider {site.name} finished with {SpiderStatus.SUCCESS.value}")
