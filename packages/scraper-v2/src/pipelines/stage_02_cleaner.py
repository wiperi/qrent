# pipelines/stage_02_cleaner.py - Cleans and normalises raw property items
from __future__ import annotations

import re
from datetime import datetime
from typing import Iterable, List

from .base import BasePipelineStage, Item


class CleanerPipeline(BasePipelineStage):
    """Perform light-weight cleansing of raw property dictionaries."""

    async def process(self, items: Iterable[Item]) -> List[Item]:
        cleaned: List[Item] = []
        for item in items:
            normalised = dict(item)
            price_field = normalised.get("raw_price") or normalised.get("price")
            normalised["raw_price"] = price_field
            normalised["price"] = self._clean_price(price_field)
            normalised["title"] = self._clean_str(normalised.get("title"))
            normalised["address"] = self._clean_str(normalised.get("address"))
            normalised["available_date"] = self._parse_date(normalised.get("available_date"))
            cleaned.append(normalised)
        return cleaned

    def _clean_price(self, price_str: object) -> int | None:
        """Convert price strings like '$450 per week' into integers."""
        if price_str is None:
            return None
        digits = re.sub(r"[^\d]", "", str(price_str))
        return int(digits) if digits else None

    def _clean_str(self, value: object) -> str | None:
        """Trim whitespace from free text fields."""
        if value is None:
            return None
        return str(value).strip()

    def _parse_date(self, value: object) -> datetime | None:
        """Parse a date string if it follows ISO 8601."""
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value))
        except ValueError:
            return None
