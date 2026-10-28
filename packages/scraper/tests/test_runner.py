import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_recovery import listing
from src.models import PropertySource
from src.services.sqlite_store import SQLiteStore


class RunnerTests(unittest.TestCase):
    def test_proxy_outage_keeps_direct_domain_capture(self):
        from recovery_runner import build_parser, capture
        class Domain:
            browser = None
            def __init__(self, **kwargs): pass
            def scrape_area(self, area): return [listing()]
        class PaidSource(Domain):
            def scrape_area(self, area): raise AssertionError("Unverified proxy must not be used")
        with tempfile.TemporaryDirectory() as tmp:
            args = build_parser().parse_args(["--areas", "melbourne-vic-3000", "--no-details",
                "--db", str(Path(tmp)/"p.db"), "--output", tmp])
            with patch("recovery_runner.verify_au_proxy", side_effect=RuntimeError("Unavailable")):
                result = capture(args, factories={"domain": Domain, "realestate": PaidSource})
            self.assertEqual((result["status"], result["listings"], result["exit_code"]), ("partial", 1, 1))
            store = SQLiteStore(args.db)
            self.assertEqual(store.connection.execute("SELECT source FROM properties").fetchall(), [("domain",)])
            store.close()

    def test_failed_detail_download_is_partial_and_keeps_listings(self):
        from recovery_runner import build_parser, capture
        class NoDetails:
            browser = None
            def __init__(self, **kwargs): pass
            def scrape_area(self, area): return [listing()]
            def scrape_property_details(self, properties, **kwargs): pass
        with tempfile.TemporaryDirectory() as tmp:
            args = build_parser().parse_args(["--areas", "melbourne-vic-3000", "--scrapers", "domain",
                "--db", str(Path(tmp)/"p.db"), "--output", tmp, "--retries", "0"])
            result = capture(args, factories={"domain": NoDetails})
            self.assertEqual((result["status"], result["exit_code"], result["listings"]), ("partial", 1, 1))
            self.assertEqual(result["details_failed"], 1)

    def test_empty_crawl_exits_failed_and_keeps_old_active_rows(self):
        from recovery_runner import build_parser, capture
        class Empty:
            browser = None
            def __init__(self, **kwargs): pass
            def scrape_area(self, area): return []
        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "properties.db"
            store = SQLiteStore(db)
            store.save([listing(PropertySource.REALESTATE)])
            store.close()
            args = build_parser().parse_args(["--areas", "melbourne-vic-3000", "--db", str(db),
                "--output", tmp, "--no-details", "--skip-proxy-check", "--retries", "0"])
            result = capture(args, factories={"domain": Empty, "realestate": Empty})
            self.assertEqual(result["status"], "failed")
            self.assertEqual(result["exit_code"], 1)
            store = SQLiteStore(db)
            self.assertEqual(store.connection.execute("SELECT COUNT(*) FROM properties WHERE is_active=1").fetchone()[0], 1)
            store.close()

    def test_domain_complete_details_skip_realestate_detail_download(self):
        from recovery_runner import build_parser, capture
        class CompleteDomain:
            browser = None
            def __init__(self, **kwargs): pass
            def scrape_area(self, area):
                return [listing(description_en="Sunny", thumbnail_url="https://cdn.example/a.jpg",
                                available_date=datetime(2026, 11, 1))]
            def scrape_property_details(self, properties, **kwargs):
                raise AssertionError("Already complete; must not fetch")
        class SameRealEstate(CompleteDomain):
            def scrape_area(self, area):
                return [listing(PropertySource.REALESTATE, house_id="456")]
        with tempfile.TemporaryDirectory() as tmp:
            args = build_parser().parse_args(["--areas", "melbourne-vic-3000", "--db", str(Path(tmp)/"p.db"),
                                             "--output", tmp, "--skip-proxy-check"])
            result = capture(args, factories={"domain": CompleteDomain, "realestate": SameRealEstate})
            self.assertEqual((result["status"], result["listings"], result["reused"]), ("success", 2, 1))
            self.assertEqual(result["detail_requests"], 0)


if __name__ == "__main__":
    unittest.main()
