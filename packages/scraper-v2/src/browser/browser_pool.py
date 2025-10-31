# browser/browser_pool.py - Manages Playwright browser lifecycle and contexts
from __future__ import annotations

from typing import Dict, List, Optional

try:
    from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright
except ImportError:  # pragma: no cover
    Browser = BrowserContext = Playwright = None  # type: ignore[assignment]
    async_playwright = None  # type: ignore[assignment]


class BrowserPool:
    """Creates and reuses Playwright browser contexts."""

    def __init__(self, max_contexts: int = 5, headless: bool = True) -> None:
        self.max_contexts = max_contexts
        self.headless = headless
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._contexts: List[BrowserContext] = []

    async def __aenter__(self) -> "BrowserPool":
        if async_playwright is None:
            raise RuntimeError("Playwright is required for browser pool operation.")
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        for context in self._contexts:
            await context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._contexts.clear()

    async def create_context(self, **kwargs: Dict[str, object]) -> BrowserContext:
        """Provision a new browser context with anti-bot defaults."""
        if self._browser is None:
            raise RuntimeError("BrowserPool not initialised; use async context manager.")
        if len(self._contexts) >= self.max_contexts:
            raise RuntimeError("Maximum number of browser contexts reached.")
        context = await self._browser.new_context(
            user_agent=kwargs.get("user_agent"),
            viewport=kwargs.get("viewport", {"width": 1920, "height": 1080}),
            locale=kwargs.get("locale", "en-AU"),
            timezone_id="Australia/Sydney",
            extra_http_headers={"Accept-Language": "en-AU,en;q=0.9"},
        )
        await context.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            """
        )
        self._contexts.append(context)
        return context
