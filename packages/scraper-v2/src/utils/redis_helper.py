# utils/redis_helper.py - Async Redis abstraction with in-memory fallback
from __future__ import annotations

import asyncio
import time
from typing import Optional

try:
    import aioredis
except ImportError:  # pragma: no cover - fallback when aioredis unavailable
    aioredis = None  # type: ignore[assignment]


class InMemoryRedis:
    """Simple in-memory store respecting expiry semantics for testing."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float]] = {}
        self._lock = asyncio.Lock()

    async def exists(self, key: str) -> bool:
        """Return whether the key currently exists and is not expired."""
        async with self._lock:
            self._prune()
            return key in self._store

    async def setex(self, key: str, ttl: int, value: str) -> None:
        """Set a key with expiry semantics."""
        async with self._lock:
            expiry = time.time() + ttl
            self._store[key] = (value, expiry)

    def _prune(self) -> None:
        """Remove expired keys."""
        now = time.time()
        expired = [key for key, (_, expiry) in self._store.items() if expiry < now]
        for key in expired:
            del self._store[key]


class RedisHelper:
    """Wrapper around aioredis with graceful fallback for development."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
    ) -> None:
        if aioredis is None:
            self._client = InMemoryRedis()
        else:
            self._client = aioredis.from_url(
                f"redis://{host}:{port}/{db}",
                password=password,
                encoding="utf-8",
                decode_responses=True,
            )

    async def exists(self, key: str) -> bool:
        """Check whether the given key exists."""
        return bool(await self._client.exists(key))

    async def setex(self, key: str, ttl: int, value: str) -> None:
        """Set the key with an expiry in seconds."""
        await self._client.setex(key, ttl, value)  # type: ignore[attr-defined]
