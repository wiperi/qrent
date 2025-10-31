# pipelines/stage_05_backup.py - Persists validated data to local backups
from __future__ import annotations

from datetime import datetime
from typing import Iterable, List

from loguru import logger

from ..storage.backup_manager import BackupManager
from .base import BasePipelineStage, Item


class BackupPipeline(BasePipelineStage):
    """Persist the raw payload to the local backup store."""

    def __init__(self, backup_manager: BackupManager | None = None) -> None:
        self.backup_manager = backup_manager or BackupManager()

    async def process(self, items: Iterable[Item]) -> List[Item]:
        data = list(items)
        if not data:
            return data

        try:
            await self.backup_manager.save_daily_backup(
                data=data,
                source=str(data[0].get("source", "unknown")),
                timestamp=datetime.now(),
            )
        except Exception as exc:  # pragma: no cover - logging side effect
            logger.error(f"Backup stage failed: {exc}")
        return data
