# config/loader.py - Helpers for loading scraper configuration from disk
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from .models import ScraperConfig


class ConfigError(RuntimeError):
    """Raised when the configuration fails to load or validate."""


def load_config(config_path: Path) -> ScraperConfig:
    """Load and validate configuration from YAML or JSON."""
    if not config_path.exists():
        raise ConfigError(f"Configuration file not found: {config_path}")

    try:
        raw_data = _read_file(config_path)
        return ScraperConfig.model_validate(raw_data)
    except ValidationError as exc:
        raise ConfigError(f"Configuration validation failed: {exc}") from exc


def _read_file(config_path: Path) -> dict[str, Any]:
    """Read structured data from YAML or JSON files."""
    content = config_path.read_text(encoding="utf-8")
    if config_path.suffix.lower() in {".yaml", ".yml"}:
        return yaml.safe_load(content) or {}
    if config_path.suffix.lower() == ".json":
        return json.loads(content)
    raise ConfigError(f"Unsupported configuration format: {config_path.suffix}")
