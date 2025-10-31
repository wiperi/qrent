# utils/metrics.py - Prometheus metric utilities for scraper-v2
from __future__ import annotations

from typing import Optional

try:
    from prometheus_client import Counter, Gauge, Histogram, Summary, start_http_server
except ImportError:  # pragma: no cover - fallback when prometheus-client is unavailable
    Counter = Histogram = Gauge = Summary = None  # type: ignore[assignment]
    start_http_server = None  # type: ignore[assignment]

from .enums import MetricLabel, SpiderStatus


class MetricsCollector:
    """Wraps Prometheus metrics, providing graceful fallbacks in tests."""

    def __init__(self) -> None:
        self._metrics_enabled = Counter is not None
        if not self._metrics_enabled:
            return

        self.scrape_total = Counter(
            "scraper_scrape_total",
            "Total scrape tasks",
            [MetricLabel.SPIDER.value, MetricLabel.STATUS.value],
        )
        self.items_scraped = Counter(
            "scraper_items_total",
            "Total items scraped",
            [MetricLabel.SPIDER.value],
        )
        self.scrape_duration = Histogram(
            "scraper_duration_seconds",
            "Scrape duration in seconds",
            [MetricLabel.SPIDER.value],
            buckets=[1, 5, 10, 30, 60, 120, 300, 600],
        )
        self.active_spiders = Gauge("scraper_active_spiders", "Number of active spiders")
        self.page_load_time = Summary("scraper_page_load_seconds", "Page load time in seconds")

    def record_scrape(self, spider_name: str, duration: float, status: SpiderStatus, items_count: int) -> None:
        """Record metrics for a completed scrape job."""
        if not self._metrics_enabled:
            return
        self.scrape_total.labels(spider=spider_name, status=status.value).inc()
        self.scrape_duration.labels(spider=spider_name).observe(duration)
        self.items_scraped.labels(spider=spider_name).inc(items_count)

    def update_active(self, count: int) -> None:
        """Set the number of concurrently running spiders."""
        if not self._metrics_enabled:
            return
        self.active_spiders.set(count)


def expose_metrics(port: int) -> Optional[int]:
    """Expose Prometheus metrics on the provided port if the dependency is installed."""
    if start_http_server is None:
        return None
    start_http_server(port)
    return port
