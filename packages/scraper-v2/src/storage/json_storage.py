# storage/json_storage.py - JSON file storage helpers for backups
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


class JsonStorage:
    """Utility class for reading and writing JSON backups."""

    def __init__(self, base_dir: Path | str) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def write(self, relative_path: str, payload: Dict[str, Any]) -> Path:
        """Persist payload under the given relative path."""
        target = self.base_dir / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return target

    def read(self, relative_path: str) -> Dict[str, Any]:
        """Load payload from disk."""
        target = self.base_dir / relative_path
        return json.loads(target.read_text(encoding="utf-8"))
