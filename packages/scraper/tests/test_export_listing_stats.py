from datetime import datetime
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops.export_listing_stats import published_ids


class ListingStatsTest(unittest.TestCase):
    def test_today_uses_completed_publications_across_runs_and_sydney_midnight(self):
        now = datetime.fromisoformat('2026-11-13T13:02:00+00:00')
        with TemporaryDirectory() as tmp:
            root = Path(tmp)

            def receipt(run, number, completed, ids, published=True):
                batch = root / f'school-enrichment-{run}/queue/batch-{number:04d}'
                (batch / 'publish').mkdir(parents=True)
                (batch / 'publish/result.json').write_text(json.dumps({
                    'status': 'published' if published else 'publication_failed',
                    'mysql_written': published,
                }))
                path = batch / 'receipt.json'
                path.write_text(json.dumps({
                    'status': 'processed',
                    'completed_at': completed,
                    'published_ids': [['domain', str(i)] for i in ids],
                    'published_addresses': len(ids),
                }))
                # An older copied receipt can have a newer filesystem timestamp.
                os.utime(path, (now.timestamp(), now.timestamp()))

            receipt('yesterday', 1, '2026-11-13T12:59:59+00:00', [41])
            receipt('yesterday', 2, '2026-11-13T13:00:00+00:00', [42, 43])
            receipt('today', 1, '2026-11-13T13:01:00+00:00', [42, 44])
            receipt('today', 2, '2026-11-13T13:01:30+00:00', [])
            self.assertEqual(published_ids(root, now), {42, 43, 44})

            receipt('today', 3, '2026-11-13T13:01:40+00:00', [45], published=False)
            with self.assertRaisesRegex(ValueError, 'lacks a successful MySQL publication'):
                published_ids(root, now)


if __name__ == '__main__':
    unittest.main()
