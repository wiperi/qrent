from datetime import datetime
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops.export_listing_stats import daily_publications


class ListingStatsTest(unittest.TestCase):
    def test_today_counts_inserts_once_across_schools_and_sydney_midnight(self):
        now = datetime.fromisoformat('2026-11-13T13:02:00+00:00')
        with TemporaryDirectory() as tmp:
            root = Path(tmp)

            def receipt(run, number, completed, ids, schools=None, published=True):
                batch = root / f'school-enrichment-{run}/queue/batch-{number:04d}'
                (batch / 'publish').mkdir(parents=True)
                publication = {
                    school: {'inserted': inserted, 'updated': updated}
                    for school, (inserted, updated) in (schools or {}).items()
                }
                (batch / 'publish/result.json').write_text(json.dumps({
                    'status': 'published' if published else 'publication_failed',
                    'mysql_written': published,
                    'publication': publication,
                }))
                path = batch / 'receipt.json'
                path.write_text(json.dumps({
                    'status': 'processed',
                    'completed_at': completed,
                    'published_ids': [['domain', str(i)] for i in ids],
                    'published_addresses': len(ids),
                    'publication': publication,
                }))
                # An older copied receipt can have a newer filesystem timestamp.
                os.utime(path, (now.timestamp(), now.timestamp()))

            earlier = '20261113_020001_100001'
            later = '20261113_210001_200002'
            receipt(earlier, 1, '2026-11-13T12:59:59+00:00', [41], {'UNSW': (1, 0)})
            receipt(earlier, 2, '2026-11-13T13:00:00+00:00', [42, 43],
                    {'UNSW': (1, 1), 'USYD': (0, 2)})
            receipt(later, 1, '2026-11-13T13:01:00+00:00', [42, 44], {'UTS': (1, 1)})
            receipt(later, 2, '2026-11-13T13:01:30+00:00', [])
            receipt('preview', 1, '2026-11-13T13:01:30+00:00', [99], {'UNSW': (1, 0)})
            self.assertEqual(daily_publications(root, now), ({42, 43, 44}, 2))

            receipt(later, 3, '2026-11-13T13:01:40+00:00', [45], published=False)
            with self.assertRaisesRegex(ValueError, 'lacks a successful MySQL publication'):
                daily_publications(root, now)


if __name__ == '__main__':
    unittest.main()
