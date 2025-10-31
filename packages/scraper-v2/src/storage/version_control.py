# storage/version_control.py - Simple version metadata tracking for backups
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import yaml


@dataclass(slots=True)
class BackupVersion:
    """Metadata describing a stored backup version."""

    source: str
    date: datetime
    file_path: Path
    record_count: int


class VersionControl:
    """Maintains metadata regarding available backups."""

    def __init__(self, metadata_path: Path) -> None:
        self.metadata_path = metadata_path
        self.metadata_path.parent.mkdir(parents=True, exist_ok=True)

    def record_version(self, version: BackupVersion) -> None:
        """Persist metadata for the provided backup version."""
        content = self._load_all()
        source_versions = content.setdefault(version.source, [])
        source_versions.append(
            {
                "date": version.date.isoformat(),
                "file_path": str(version.file_path),
                "record_count": version.record_count,
            }
        )
        self._write(content)

    def list_versions(self, source: str) -> List[BackupVersion]:
        """Return all known versions for the supplied source."""
        content = self._load_all()
        versions = []
        for entry in content.get(source, []):
            versions.append(
                BackupVersion(
                    source=source,
                    date=datetime.fromisoformat(entry["date"]),
                    file_path=Path(entry["file_path"]),
                    record_count=int(entry["record_count"]),
                )
            )
        return versions

    def _load_all(self) -> Dict[str, List[Dict]]:
        if not self.metadata_path.exists():
            return {}
        return yaml.safe_load(self.metadata_path.read_text(encoding="utf-8")) or {}

    def _write(self, data: Dict[str, List[Dict]]) -> None:
        self.metadata_path.write_text(yaml.safe_dump(data), encoding="utf-8")
