import sys
import unittest
import os
import socket
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.utils.browser import BrowserManager, BrowserType


class Page:
    def __init__(self, status):
        self.status = status

    def goto(self, *args, **kwargs):
        return self

    def wait_for_timeout(self, milliseconds):
        pass


class BrowserTests(unittest.TestCase):
    def test_missing_engine_closes_its_started_egress_listener(self):
        from src.utils.egress import EgressProxy
        created = []
        def gateway(*args, **kwargs):
            proxy = EgressProxy(*args, **kwargs)
            created.append(proxy)
            return proxy
        try:
            with tempfile.TemporaryDirectory() as profile, patch.dict(os.environ, {
                "PROXY_SERVER": "http://127.0.0.1:9", "PROXY_SOURCES": "realestate",
                "PROXY_COUNTRY": "AU", "BROWSER_ENGINE": "camoufox"}, clear=True), \
                    patch.dict(sys.modules, {"camoufox.sync_api": None}), \
                    patch("src.utils.browser.EgressProxy", side_effect=gateway):
                browser = BrowserManager(browser_type=BrowserType.PLAYWRIGHT, profile_dir=profile)
                with self.assertRaises(ImportError):
                    browser.create_driver()
                self.assertTrue(created)
                with self.assertRaises(OSError):
                    with socket.create_connection(("127.0.0.1", created[0].port), timeout=0.3):
                        pass
        finally:
            for proxy in created:
                proxy.close()

    def test_http_challenge_is_navigation_failure(self):
        for status in (403, 429, 502):
            browser = BrowserManager(browser_type=BrowserType.PLAYWRIGHT)
            browser._playwright_page = Page(status)
            self.assertFalse(browser.navigate("https://www.realestate.com.au/rent/", wait_time=0))


if __name__ == "__main__":
    unittest.main()
