# pipelines/_pipeline_factory.py - Factory helpers for assembling pipeline stages
from __future__ import annotations

from typing import List

from .base import BasePipelineStage
from .stage_01_extractor import ExtractorPipeline
from .stage_02_cleaner import CleanerPipeline
from .stage_03_validator import ValidatorPipeline
from .stage_04_deduplicator import DeduplicatorPipeline
from .stage_05_backup import BackupPipeline
from .stage_06_transformer import TransformerPipeline
from .stage_07_database import DatabasePipeline


def build_default_pipeline() -> List[BasePipelineStage]:
    """Construct the default pipeline sequence."""
    return [
        ExtractorPipeline(),
        CleanerPipeline(),
        ValidatorPipeline(),
        DeduplicatorPipeline(),
        BackupPipeline(),
        TransformerPipeline(),
        DatabasePipeline(),
    ]
