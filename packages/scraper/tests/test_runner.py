import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_recovery import listing
from src.models import PropertySource
from src.services.sqlite_store import SQLiteStore


class RunnerTests(unittest.TestCase):
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
