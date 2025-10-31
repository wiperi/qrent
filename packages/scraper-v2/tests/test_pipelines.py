# tests/test_pipelines.py - Validates pipeline processing behaviour
from __future__ import annotations

import pytest

from scraper_v2.pipelines.pipeline_manager import PipelineManager


@pytest.mark.asyncio
async def test_pipeline_processes_items(tmp_path) -> None:
    pipeline = PipelineManager()
    items = [
        {
            "url": "https://example.com/listing/1",
            "title": "  Test Property ",
            "address": "123 Example St",
            "raw_price": "$500 per week",
            "price": 500,
            "bedrooms": 2,
            "bathrooms": 1,
            "parking": 1,
            "scraped_at": "2024-01-01T00:00:00",
        }
    ]
    processed = await pipeline.process(items)
    assert processed
    assert processed[0]["weekly_rent"] == 500
