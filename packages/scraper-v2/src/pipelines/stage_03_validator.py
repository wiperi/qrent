# pipelines/stage_03_validator.py - Validates cleaned items with Pydantic models
from __future__ import annotations

from typing import Iterable, List

from loguru import logger
from pydantic import ValidationError

from ..models import PropertyModel
from .base import BasePipelineStage, Item


class ValidatorPipeline(BasePipelineStage):
    """Ensure items conform to the PropertyModel schema."""

    async def process(self, items: Iterable[Item]) -> List[Item]:
        validated: List[Item] = []
        for item in items:
            try:
                model = PropertyModel(**item)
            except ValidationError as exc:
                logger.warning(f"Validation failed for {item.get('url')}: {exc}")
                continue
            validated.append(model.model_dump())
        return validated
