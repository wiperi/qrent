import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.models import PropertyData, PropertySource, RegionInfo
from src.scrapers.domain import DomainScraper
from src.scrapers.realestate import RealEstateScraper


def listing(source=PropertySource.DOMAIN, house_id="123", **changes):
    data = dict(house_id=house_id, source=source, address_line1="2/10 Example Street",
                address_line2="melbourne-vic-3000", suburb="Melbourne", state="VIC",
                postcode="3000", price_per_week=600, bedroom_count=2)
    data.update(changes)
    return PropertyData(**data)


class AddressTests(unittest.TestCase):
    def test_realestate_vic_url_preserves_state_without_state_in_card_text(self):
        data = RealEstateScraper()._parse_address(
            "2/10 Example Street, Melbourne", "/property-apartment-vic-melbourne-445123456")
        self.assertEqual(data[3], "VIC")

    def test_melbourne_state_survives_domain_parsing(self):
        self.assertEqual(DomainScraper()._parse_address_line2("Melbourne VIC 3000"),
                         ("melbourne", "VIC", "3000"))

    def test_melbourne_can_be_written_as_a_region(self):
        region = RegionInfo.from_address_line2("carlton-vic-3053")
        self.assertIsNotNone(region)
        self.assertEqual((region.name, region.state, region.postcode), ("carlton", "VIC", 3053))


class IncrementalTests(unittest.TestCase):
    def test_cross_source_reuses_complete_details_without_changing_listing_identity(self):
        from src.services.incremental import reuse_details
        ref = listing(description_en="Sunny apartment", thumbnail_url="https://cdn.example/a.jpg",
                      available_date=datetime(2026, 11, 1), keywords="balcony", average_score=15)
        target = listing(PropertySource.REALESTATE, house_id="456", address_line1="2/10 Example St.",
                         url="https://www.realestate.com.au/property-456")
        self.assertEqual(reuse_details([target], [ref]), 1)
        self.assertEqual((target.house_id, target.source, target.url),
                         ("456", PropertySource.REALESTATE, "https://www.realestate.com.au/property-456"))
        self.assertEqual(target.description_en, "Sunny apartment")

    def test_different_units_prices_or_stale_ads_are_not_reused(self):
        from src.services.incremental import reuse_details
        ref = listing(description_en="Old description", thumbnail_url="https://cdn.example/a.jpg",
                      available_date=datetime(2026, 11, 1))
        for changes in ({"address_line1": "3/10 Example St"}, {"price_per_week": 650},
                        {"state": "NSW", "postcode": "2000"}):
            target = listing(PropertySource.REALESTATE, **changes)
            self.assertEqual(reuse_details([target], [ref]), 0)
            self.assertIsNone(target.description_en)
        ref.scraped_at = datetime.now() - timedelta(days=8)
        self.assertEqual(reuse_details([listing(PropertySource.REALESTATE)], [ref]), 0)

    def test_incomplete_reference_does_not_prevent_detail_fetch(self):
        from src.services.incremental import reuse_details
        target = listing(PropertySource.REALESTATE)
        self.assertEqual(reuse_details([target], [listing(description_en="Incomplete")]), 0)
        self.assertIsNone(target.description_en)


class StoreTests(unittest.TestCase):
    def test_platform_ids_do_not_overwrite_each_other_and_partial_runs_keep_old_rows(self):
        from src.services.sqlite_store import SQLiteStore
        with tempfile.TemporaryDirectory() as tmp:
            store = SQLiteStore(Path(tmp) / "properties.db")
            store.save([listing(), listing(PropertySource.REALESTATE)])
            store.save([listing(price_per_week=700)])
            rows = store.connection.execute(
                "SELECT source, price_per_week, is_active FROM properties ORDER BY source").fetchall()
            self.assertEqual(rows, [("domain", 700, 1), ("realestate", 600, 1)])
            store.close()

    def test_empty_save_preserves_existing_listing_and_details(self):
        from src.services.sqlite_store import SQLiteStore
        with tempfile.TemporaryDirectory() as tmp:
            store = SQLiteStore(Path(tmp) / "properties.db")
            store.save([listing(description_en="Keep this")])
            store.save([])
            store.save([listing(price_per_week=610)])
            self.assertEqual(store.connection.execute(
                "SELECT description_en, is_active FROM properties").fetchone(), ("Keep this", 1))
            store.close()


if __name__ == "__main__":
    unittest.main()
