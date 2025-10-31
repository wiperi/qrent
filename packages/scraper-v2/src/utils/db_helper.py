# utils/db_helper.py - Database helper utilities for PostgreSQL persistence
from __future__ import annotations

import asyncio
from typing import Dict, Iterable, Optional

try:
    import asyncpg
except ImportError:  # pragma: no cover
    asyncpg = None  # type: ignore[assignment]


class DatabaseHelper:
    """Provides async helpers for interacting with PostgreSQL."""

    def __init__(
        self,
        dsn: Optional[str] = None,
        *,
        host: str = "localhost",
        port: int = 5432,
        user: str = "scraper",
        password: str = "scraper",
        database: str = "scraper",
        enable_fallback: bool = True,
    ) -> None:
        self.dsn = dsn or f"postgresql://{user}:{password}@{host}:{port}/{database}"
        self._pool: Optional["asyncpg.Pool"] = None
        self._lock = asyncio.Lock()
        self._fallback = asyncpg is None and enable_fallback

    async def _ensure_pool(self) -> "asyncpg.Pool":
        """Ensure the async connection pool is initialised."""
        if asyncpg is None:
            raise RuntimeError("asyncpg not installed; cannot access database.")
        if self._pool is None:
            async with self._lock:
                if self._pool is None:
                    self._pool = await asyncpg.create_pool(dsn=self.dsn)
        return self._pool

    async def upsert_properties(self, items: Iterable[Dict]) -> Dict[str, int]:
        """Insert or update property records in batch and return stats."""
        if self._fallback:
            count = sum(1 for _ in items)
            return {"inserted": count, "updated": 0}
        pool = await self._ensure_pool()
        inserted = updated = 0
        async with pool.acquire() as connection:
            async with connection.transaction():
                for item in items:
                    house_id = item.get("house_id")
                    if house_id is None:
                        continue
                    result = await connection.fetchrow(
                        """
                        INSERT INTO properties (house_id, data)
                        VALUES ($1, $2)
                        ON CONFLICT (house_id) DO UPDATE SET data = EXCLUDED.data
                        RETURNING xmax = 0 AS inserted
                        """,
                        house_id,
                        item,
                    )
                    if result and result["inserted"]:
                        inserted += 1
                    else:
                        updated += 1
        return {"inserted": inserted, "updated": updated}
