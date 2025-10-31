# pipelines/base.py - Abstract pipeline stage definitions
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, List, MutableMapping

Item = MutableMapping[str, object]


class BasePipelineStage(ABC):
    """Defines the contract for pipeline processing stages."""

    @abstractmethod
    async def process(self, items: Iterable[Item]) -> List[Item]:
        """Process items and return a list for the next stage."""
