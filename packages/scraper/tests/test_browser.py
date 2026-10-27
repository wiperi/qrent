import sys
import unittest
from pathlib import Path

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
    def test_http_challenge_is_navigation_failure(self):
        for status in (403, 429, 502):
            browser = BrowserManager(browser_type=BrowserType.PLAYWRIGHT)
            browser._playwright_page = Page(status)
            self.assertFalse(browser.navigate("https://www.realestate.com.au/rent/", wait_time=0))


if __name__ == "__main__":
    unittest.main()
