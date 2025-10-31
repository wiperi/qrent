# models/scrape_result.py - Domain model for scraped data batches
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List

from .property import PropertyModel


@dataclass(slots=True)
class ScrapeResult:
    """Represents the outcome of a spider run."""

    spider_name: str
    scraped_at: datetime
    items: List[PropertyModel]

    @classmethod
    def from_items(cls, spider_name: str, items: Iterable[PropertyModel]) -> "ScrapeResult":
        """Construct a result from iterable of property models."""
        return cls(spider_name=spider_name, scraped_at=datetime.now(), items=list(items))
