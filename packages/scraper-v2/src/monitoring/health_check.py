# monitoring/health_check.py - Lightweight health check HTTP endpoint
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

try:
    from aiohttp import web
except ImportError:  # pragma: no cover
    web = None  # type: ignore[assignment]

from ..utils.enums import HealthStatus


class HealthState:
    """Tracks key health indicators for the scraper service."""

    def __init__(self) -> None:
        self.last_success: Optional[datetime] = None
        self.last_error: Optional[str] = None

    def mark_success(self) -> None:
        self.last_success = datetime.now()
        self.last_error = None

    def mark_error(self, message: str) -> None:
        self.last_error = message

    def status(self) -> HealthStatus:
        if self.last_error:
            return HealthStatus.DEGRADED
        if self.last_success and datetime.now() - self.last_success > timedelta(hours=25):
            return HealthStatus.DEGRADED
        return HealthStatus.HEALTHY

    def to_dict(self) -> dict[str, object]:
        return {
            "status": self.status().value,
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_error": self.last_error,
            "timestamp": datetime.now().isoformat(),
        }


def create_app(state: HealthState) -> "web.Application":
    """Build an aiohttp application exposing /health."""
    if web is None:
        raise RuntimeError("aiohttp not installed; health check endpoint unavailable.")

    app = web.Application()

    async def health_handler(request: "web.Request") -> "web.Response":
        payload = state.to_dict()
        status = 200 if payload["status"] == HealthStatus.HEALTHY.value else 503
        return web.json_response(payload, status=status)

    app.router.add_get("/health", health_handler)
    return app
