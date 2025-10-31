# utils/retry.py - Simple async retry decorator utilities
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any, TypeVar

T = TypeVar("T")
AsyncCallable = Callable[..., Awaitable[T]]


def async_retry(times: int = 3, delay_seconds: float = 1.0, exceptions: tuple[type[Exception], ...] = (Exception,)) -> Callable[[AsyncCallable], AsyncCallable]:
    """Retry coroutine function with exponential backoff-like delay."""

    def decorator(func: AsyncCallable) -> AsyncCallable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            attempt = 0
            while True:
                try:
                    return await func(*args, **kwargs)
                except exceptions:
                    attempt += 1
                    if attempt > times:
                        raise
                    await asyncio.sleep(delay_seconds * attempt)

        return wrapper

    return decorator
