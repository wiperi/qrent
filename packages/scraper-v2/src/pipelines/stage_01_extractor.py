# pipelines/stage_01_extractor.py - Extracts raw items into list structures
from __future__ import annotations

from typing import Iterable, List, MutableMapping, Sequence

from .base import BasePipelineStage, Item


class ExtractorPipeline(BasePipelineStage):
    """Ensures incoming items are materialised into mutable dictionaries."""

    async def process(self, items: Iterable[Item]) -> List[Item]:
        extracted: List[Item] = []
        for item in items:
            if isinstance(item, MutableMapping):
                extracted.append(dict(item))
            else:
                raise TypeError(f"Unsupported item type: {type(item)}")
        return extracted
