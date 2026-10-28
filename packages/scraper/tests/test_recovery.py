import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from bs4 import BeautifulSoup

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
    def test_realestate_postcode_comes_from_listing_metadata(self):
        prop = listing(PropertySource.REALESTATE, suburb="Carlton", postcode="")
        soup = BeautifulSoup('''<script type="application/ld+json">[{"@type":"Event",
          "url":"https://www.realestate.com.au/property-apartment-vic-carlton-123",
          "location":{"address":{"addressLocality":"Carlton","addressRegion":"VIC","postalCode":"3053"}}}]</script>''', 'html.parser')
        RealEstateScraper()._complete_locations([prop], soup)
        self.assertEqual((prop.postcode, prop.address_line2), ("3053", "carlton-vic-3053"))

    def test_domain_canonical_link_supplies_state_postcode_and_preserves_unit(self):
        html = '''<li data-testid="listing-18389808"><a href="https://www.domain.com.au/2-10-example-street-melbourne-vic-3000-18389808">
        <span data-testid="address-line1">2/10 Example Street&nbsp;</span>
        <span data-testid="address-line2">Melbourne</span></a>
        <p data-testid="listing-card-price">$600 per week</p></li>'''
        props = DomainScraper().parse_listing_page(html)
        self.assertEqual(len(props), 1)
        prop = props[0]
        self.assertEqual(prop.url, "https://www.domain.com.au/2-10-example-street-melbourne-vic-3000-18389808")
        self.assertEqual((prop.address_line1, prop.suburb, prop.state, prop.postcode),
                         ("2/10 Example Street", "melbourne", "VIC", "3000"))

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
    def test_postcode_reuse_requires_same_unit_and_unambiguous_reference(self):
        from src.services.incremental import complete_postcodes
        target = listing(PropertySource.REALESTATE, postcode="")
        self.assertEqual(complete_postcodes([target], [listing()]), 1)
        self.assertEqual(target.postcode, "3000")
        different = listing(PropertySource.REALESTATE, postcode="", address_line1="3/10 Example Street")
        self.assertEqual(complete_postcodes([different], [listing()]), 0)
        ambiguous = listing(PropertySource.REALESTATE, postcode="")
        self.assertEqual(complete_postcodes([ambiguous], [listing(), listing(postcode="3004")]), 0)
        self.assertEqual(ambiguous.postcode, "")

    def test_cross_source_reuses_complete_details_without_changing_listing_identity(self):
        from src.services.incremental import reuse_details
        ref = listing(address_line1="2/10 Example Street ,", description_en="Sunny apartment", thumbnail_url="https://cdn.example/a.jpg",
                      available_date=datetime(2026, 11, 1), keywords="balcony", average_score=15, scores=[15, 15, 15])
        target = listing(PropertySource.REALESTATE, house_id="456", address_line1="2/10 Example St.",
                         url="https://www.realestate.com.au/property-456")
        self.assertEqual(reuse_details([target], [ref]), 1)
        self.assertEqual((target.house_id, target.source, target.url),
                         ("456", PropertySource.REALESTATE, "https://www.realestate.com.au/property-456"))
        self.assertEqual(target.description_en, "Sunny apartment")
        self.assertEqual(target.scores, [15, 15, 15])

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
            store.save([listing(description_en="Keep this", average_score=15, scores=[15, 15, 15])])
            store.save([])
            store.save([listing(price_per_week=610)])
            self.assertEqual(store.connection.execute(
                "SELECT description_en, is_active FROM properties").fetchone(), ("Keep this", 1))
            self.assertEqual((store.recent()[0].description_en, store.recent()[0].average_score),
                             ("Keep this", 15))
            store.close()


if __name__ == "__main__":
    unittest.main()
