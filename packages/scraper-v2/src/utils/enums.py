# utils/enums.py - Shared enumerations for scraper-v2 modules
from __future__ import annotations

from enum import Enum, IntEnum, StrEnum


class SpiderName(StrEnum):
    """Enumerates supported spiders to avoid magic strings."""

    REALESTATE_AU = "realestate_au"
    DOMAIN_COM_AU = "domain_com_au"


class SpiderStatus(StrEnum):
    """Enumerates scrape execution status labels."""

    SUCCESS = "success"
    FAILURE = "failure"


class PipelineStage(IntEnum):
    """Enumerates pipeline processing stages in execution order."""

    EXTRACTOR = 1
    CLEANER = 2
    VALIDATOR = 3
    DEDUPLICATOR = 4
    BACKUP = 5
    TRANSFORMER = 6
    DATABASE = 7


class StorageBackend(StrEnum):
    """Enumerates storage backends used in data persistence."""

    JSON = "json"
    S3 = "s3"
    DATABASE = "database"


class MetricLabel(StrEnum):
    """Enumerates metric label keys for Prometheus metrics."""

    SPIDER = "spider"
    STATUS = "status"


class HealthStatus(StrEnum):
    """Enumerates possible service health states."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
