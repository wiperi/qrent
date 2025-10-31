# storage/backup_manager.py - Manages on-disk backups of scraped data
from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, MutableMapping

from loguru import logger

from ..utils.enums import StorageBackend

Item = MutableMapping[str, object]


class BackupManager:
    """Handles persistence of raw scrape outputs to disk."""

    def __init__(self, base_dir: Path | str = Path("/data/raw")) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_daily_backup(self, data: Iterable[Item], source: str, timestamp: datetime) -> Dict[str, object]:
        """Persist a collection of items to the backup directory."""
        items: List[Item] = list(data)
        if not items:
            return {"count": 0, "file_path": None}

        logger.debug(f"Persisting backup for {source} with {len(items)} items")

        return await asyncio.to_thread(self._write_backup, items, source, timestamp)

    def _write_backup(self, items: List[Item], source: str, timestamp: datetime) -> Dict[str, object]:
        date_dir = self.base_dir / timestamp.strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)

        file_path = date_dir / f"{source}_properties.json"
        payload = {
            "metadata": {
                "source": source,
                "scraped_at": timestamp.isoformat(),
                "count": len(items),
                "version": "2.0",
                "storage_backend": StorageBackend.JSON.value,
            },
            "properties": items,
        }

        file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        self._update_latest_link(source, file_path)
        self._save_metadata(date_dir, source, timestamp, len(items))

        size_mb = file_path.stat().st_size / (1024 * 1024)
        logger.info(f"Backup written to {file_path} ({size_mb:.2f} MB)")
        return {"count": len(items), "file_path": str(file_path), "size_mb": size_mb}

    def _update_latest_link(self, source: str, file_path: Path) -> None:
        latest_dir = self.base_dir / "latest"
        latest_dir.mkdir(exist_ok=True)
        link_path = latest_dir / f"{source}_properties.json"
        if link_path.exists() or link_path.is_symlink():
            link_path.unlink()
        link_path.symlink_to(file_path)

    def _save_metadata(self, date_dir: Path, source: str, timestamp: datetime, count: int) -> None:
        metadata_path = date_dir / "metadata.json"
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        else:
            metadata = {"date": timestamp.strftime("%Y-%m-%d"), "sources": {}}

        metadata["sources"][source] = {
            "count": count,
            "scraped_at": timestamp.isoformat(),
            "file": f"{source}_properties.json",
        }

        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
