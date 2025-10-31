# config/__init__.py - Public configuration loading helpers
from __future__ import annotations

from pathlib import Path

from .loader import ConfigError, load_config
from .models import ScraperConfig

__all__ = ["ConfigError", "ScraperConfig", "load_config", "Path"]
