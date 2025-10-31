# monitoring/prometheus.py - Utilities for exposing Prometheus endpoints
from __future__ import annotations

from typing import Optional

from ..utils.metrics import expose_metrics


def start_metrics_server(port: int) -> Optional[int]:
    """Expose Prometheus metrics on the provided port."""
    return expose_metrics(port)
