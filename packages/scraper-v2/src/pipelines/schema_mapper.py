# pipelines/schema_mapper.py - Maps raw items to database schema fields
from __future__ import annotations

import hashlib
import re
from datetime import datetime
from typing import MutableMapping

Item = MutableMapping[str, object]


class SchemaMapper:
    """Convert validated property dictionaries into database records."""

    def transform(self, raw_item: Item) -> Item:
        url = str(raw_item.get("url", ""))
        return {
            "house_id": self._generate_house_id(url),
            "url": url,
            "title": raw_item.get("title"),
            "address": raw_item.get("address"),
            "bedrooms": raw_item.get("bedrooms"),
            "bathrooms": raw_item.get("bathrooms"),
            "parking": raw_item.get("parking"),
            "property_type": raw_item.get("property_type"),
            "weekly_rent": raw_item.get("price"),
            "bond": raw_item.get("bond"),
            "suburb": raw_item.get("suburb"),
            "postcode": raw_item.get("postcode"),
            "state": raw_item.get("state"),
            "latitude": raw_item.get("latitude"),
            "longitude": raw_item.get("longitude"),
            "available_date": raw_item.get("available_date"),
            "published_at": raw_item.get("published_at"),
            "thumbnail_url": self._first_image(raw_item.get("images")),
            "scraped_at": raw_item.get("scraped_at", datetime.now()),
        }

    def _generate_house_id(self, url: str) -> str:
        digest = hashlib.md5(url.encode(), usedforsecurity=False).hexdigest()
        return digest[:16]

    def _first_image(self, images: object) -> str | None:
        if isinstance(images, list) and images:
            return str(images[0])
        return None
