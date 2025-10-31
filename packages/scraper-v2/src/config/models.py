# config/models.py - Pydantic models for scraper configuration
from __future__ import annotations

from datetime import time
from pathlib import Path
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field, validator

from ..utils.enums import SpiderName


class RequestSettings(BaseModel):
    """Configuration for throttling and headers."""

    delay: Tuple[int, int] = Field(..., description="Random delay range between requests (seconds).")
    headers: dict[str, str] = Field(default_factory=dict, description="HTTP headers for requests.")


class BrowserSettings(BaseModel):
    """Configuration for individual browser contexts."""

    user_agent: Optional[str] = Field(default=None, description="Custom user agent string.")
    viewport: dict[str, int] = Field(default_factory=lambda: {"width": 1920, "height": 1080})
    locale: str = "en-AU"


class SiteParams(BaseModel):
    """Generic parameters passed into spider implementations."""

    locations: List[str] = Field(default_factory=list)
    max_pages: int = Field(default=10, ge=1)
    property_types: List[str] = Field(default_factory=list)
    min_price: Optional[int] = None
    max_price: Optional[int] = None


class SiteConfig(BaseModel):
    """Top-level configuration for an individual site."""

    name: str = Field(..., description="Human readable site name.")
    enabled: bool = True
    spider_class: SpiderName = Field(..., description="Identifier for spider implementation.")
    base_url: str = Field(..., description="Base URL for spider entry point.")
    browser: BrowserSettings = Field(default_factory=BrowserSettings)
    params: SiteParams = Field(default_factory=SiteParams)
    request: RequestSettings = Field(
        default_factory=lambda: RequestSettings(delay=(2, 5), headers={"Accept-Language": "en-AU,en;q=0.9"})
    )


class GlobalConfig(BaseModel):
    """Shared configuration parameters across the scraping system."""

    max_concurrent_spiders: int = Field(default=5, ge=1, le=10)
    request_timeout: int = Field(default=30, ge=5)
    retry_times: int = Field(default=3, ge=0)
    retry_delay: int = Field(default=10, ge=0)


class BackupConfig(BaseModel):
    """Configuration for backup behaviour."""

    enabled: bool = True
    base_dir: Path = Field(default=Path("/data/raw"))
    retention_days: int = Field(default=90, ge=1)
    archive_enabled: bool = False
    archive_after_days: int = Field(default=7, ge=1)


class CloudBackupConfig(BaseModel):
    """Configuration for cloud backup behaviour."""

    enabled: bool = False
    delay_seconds: int = Field(default=1800, ge=0)


class AwsConfig(BaseModel):
    """Configuration for AWS credential loading."""

    region: str = "ap-southeast-2"
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    bucket_name: str = "qrent-scraper-backup"


class ScheduleConfig(BaseModel):
    """Configuration for scheduling daily runs."""

    time_of_day: time = Field(default=time(hour=1, minute=0))
    timezone: str = "Australia/Sydney"
    max_runtime_hours: int = Field(default=6, ge=1)


class LogConfig(BaseModel):
    """Configuration for log behaviour."""

    level: str = "INFO"
    retention_days: int = Field(default=30, ge=1)


class PrometheusConfig(BaseModel):
    """Configuration for Prometheus metrics exposure."""

    port: int = Field(default=9090, ge=1, le=65535)


class HealthCheckConfig(BaseModel):
    """Configuration for HTTP health checks."""

    port: int = Field(default=8080, ge=1, le=65535)


class ScraperConfig(BaseModel):
    """Aggregate configuration for the scraper system."""

    version: str = "2.0"
    global_: GlobalConfig = Field(default_factory=GlobalConfig, alias="global")
    sites: List[SiteConfig] = Field(default_factory=list)
    backup: BackupConfig = Field(default_factory=BackupConfig)
    cloud_backup: CloudBackupConfig = Field(default_factory=CloudBackupConfig)
    aws: AwsConfig = Field(default_factory=AwsConfig)
    schedule: ScheduleConfig = Field(default_factory=ScheduleConfig)
    logging: LogConfig = Field(default_factory=LogConfig)
    prometheus: PrometheusConfig = Field(default_factory=PrometheusConfig)
    health: HealthCheckConfig = Field(default_factory=HealthCheckConfig)

    @validator("sites", pre=True, each_item=True)
    def _coerce_spider_enum(cls, value: dict) -> dict:
        """Ensure spider name strings map to the SpiderName enum."""
        if isinstance(value, dict) and "spider_class" in value:
            value["spider_class"] = SpiderName(value["spider_class"])
        return value

    class Config:
        populate_by_name = True
