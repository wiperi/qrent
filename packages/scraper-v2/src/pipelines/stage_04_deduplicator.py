# pipelines/stage_04_deduplicator.py - De-duplicates items using Redis cache
from __future__ import annotations

from typing import Iterable, List

from loguru import logger

from ..utils.redis_helper import RedisHelper
from .base import BasePipelineStage, Item


class DeduplicatorPipeline(BasePipelineStage):
    """Remove items that already exist in the Redis cache."""

    def __init__(self, cache_prefix: str = "scraper:seen:", ttl_seconds: int = 7 * 24 * 3600) -> None:
        self.cache_prefix = cache_prefix
        self.ttl_seconds = ttl_seconds
        self.redis = RedisHelper()

    async def process(self, items: Iterable[Item]) -> List[Item]:
        unique: List[Item] = []
        for item in items:
            item_id = str(item.get("url") or item.get("id"))
            cache_key = f"{self.cache_prefix}{item_id}"

            if await self.redis.exists(cache_key):
                logger.debug(f"Skipping duplicate item: {item_id}")
                continue

            await self.redis.setex(cache_key, self.ttl_seconds, "1")
            unique.append(item)

        logger.info(f"Deduplication reduced items to {len(unique)}")
        return unique
