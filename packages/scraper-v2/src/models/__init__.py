# models/__init__.py - Public exports for data models
from __future__ import annotations

from .property import PropertyModel
from .scrape_result import ScrapeResult

__all__ = ["PropertyModel", "ScrapeResult"]
