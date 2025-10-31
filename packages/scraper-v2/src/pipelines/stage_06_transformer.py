# pipelines/stage_06_transformer.py - Transforms data into database schema
from __future__ import annotations

from typing import Iterable, List

from loguru import logger

from .base import BasePipelineStage, Item
from .schema_mapper import SchemaMapper


class TransformerPipeline(BasePipelineStage):
    """Map validated items into the database schema."""

    def __init__(self, mapper: SchemaMapper | None = None) -> None:
        self.mapper = mapper or SchemaMapper()

    async def process(self, items: Iterable[Item]) -> List[Item]:
        transformed: List[Item] = []
        for item in items:
            try:
                transformed.append(self.mapper.transform(item))
            except Exception as exc:
                logger.warning(f"Transformer failing for {item.get('url')}: {exc}")
        return transformed
