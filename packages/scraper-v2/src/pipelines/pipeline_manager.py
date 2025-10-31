# pipelines/pipeline_manager.py - Coordinates sequential pipeline processing
from __future__ import annotations

from typing import Iterable, List, MutableMapping, Sequence

from loguru import logger

from ..utils.enums import PipelineStage
from ._pipeline_factory import build_default_pipeline
from .base import BasePipelineStage

Item = MutableMapping[str, object]


class PipelineManager:
    """Runs configured pipeline stages sequentially for scraped items."""

    def __init__(self, stages: Sequence[BasePipelineStage] | None = None) -> None:
        self.stages: List[BasePipelineStage] = list(stages or build_default_pipeline())

    async def process(self, items: Iterable[Item]) -> List[Item]:
        """Process data sequentially through configured stages."""
        processed: List[Item] = list(items)
        for index, stage in enumerate(self.stages, start=1):
            stage_name = PipelineStage(index).name
            logger.debug(f"Running pipeline stage: {stage_name} on {len(processed)} items")
            processed = await stage.process(processed)
        return processed
