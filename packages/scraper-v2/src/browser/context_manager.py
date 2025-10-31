# browser/context_manager.py - Helper utilities for browser context lifecycle
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, Optional

from .browser_pool import BrowserPool


@asynccontextmanager
async def browser_context(pool: BrowserPool, options: Optional[Dict[str, object]] = None) -> AsyncIterator:
    """Provide a managed browser context from the pool."""
    context = await pool.create_context(**(options or {}))
    try:
        yield context
    finally:
        await context.close()
