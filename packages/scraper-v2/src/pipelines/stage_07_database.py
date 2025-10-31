# pipelines/stage_07_database.py - Persists transformed items to PostgreSQL
from __future__ import annotations

from typing import Iterable, List

from loguru import logger

from ..utils.db_helper import DatabaseHelper
from .base import BasePipelineStage, Item


class DatabasePipeline(BasePipelineStage):
    """Persist transformed items into the database layer."""

    def __init__(self, db_helper: DatabaseHelper | None = None) -> None:
        self.db_helper = db_helper or DatabaseHelper()

    async def process(self, items: Iterable[Item]) -> List[Item]:
        data = list(items)
        if not data:
            return data

        try:
            stats = await self.db_helper.upsert_properties(data)
            logger.info(f"Database upsert completed: {stats}")
        except Exception as exc:
            logger.error(f"Database pipeline failed: {exc}")
            raise
        return data
