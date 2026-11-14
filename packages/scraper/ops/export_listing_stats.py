#!/usr/bin/env python3
"""Publish aggregate counts from the Sydney crawler's verified publication receipts."""

import argparse
from datetime import datetime, time, timezone
import json
import os
from pathlib import Path
import re
import sys
from tempfile import mkstemp
from zoneinfo import ZoneInfo

SYDNEY = ZoneInfo('Australia/Sydney')
SCHOOLS = ('UNSW', 'USYD', 'UTS')
DAILY_QUEUE = re.compile(r'school-enrichment-\d{8}_\d{6}_\d{6}')


def daily_publications(output: Path, now: datetime) -> tuple[set[int], int]:
    day = now.astimezone(SYDNEY).date()
    start = datetime.combine(day, time.min, tzinfo=SYDNEY).timestamp()
    ids = set()
    inserted = 0
    for path in output.glob('school-enrichment-*/queue/batch-*/receipt.json'):
        if not DAILY_QUEUE.fullmatch(path.parents[2].name) or path.stat().st_mtime < start:
            continue
        receipt = json.loads(path.read_text())
        if receipt['status'] != 'processed' or not receipt['published_addresses']:
            continue
        completed = datetime.fromisoformat(receipt['completed_at'])
        if completed.astimezone(SYDNEY).date() != day or completed > now:
            continue
        publish = json.loads((path.parent / 'publish/result.json').read_text())
        if publish['status'] != 'published' or not publish['mysql_written']:
            raise ValueError('Batch receipt lacks a successful MySQL publication')
        batch = {int(house_id) for _, house_id in receipt['published_ids']}
        if len(batch) != receipt['published_addresses']:
            raise ValueError('Batch receipt count and published identities differ')
        publication = publish['publication']
        if not publication or publication != receipt['publication']:
            raise ValueError('Batch receipt and MySQL publication counters differ')
        # MySQL has one row per listing. The first school inserts it, and subsequent
        # schools and republications update that same row.
        inserts = sum(school['inserted'] for school in publication.values())
        if not 0 <= inserts <= len(batch):
            raise ValueError('Batch insert count exceeds the published inventory')
        inserted += inserts
        ids.update(batch)
    return ids, inserted


def searchable_ids(mysql_env: Path) -> set[int]:
    import mysql.connector
    from ops.backup_mysql import config_from_env

    with mysql.connector.connect(
        **config_from_env(mysql_env),
        connection_timeout=8,
        compress=True,
        allow_local_infile=False,
    ) as db:
        db.start_transaction(readonly=True, consistent_snapshot=True)
        with db.cursor() as cursor:
            cursor.execute(
                '''SELECT p.house_id FROM properties p
                   WHERE EXISTS (
                       SELECT 1 FROM property_school ps JOIN schools s ON s.id = ps.school_id
                       WHERE ps.property_id = p.id AND s.name IN (%s, %s, %s)
                   )''',
                SCHOOLS,
            )
            return {row[0] for row in cursor}


def export(root: Path, destination: Path) -> None:
    now = datetime.now(timezone.utc)
    today, inserted = daily_publications(root / 'output', now)
    current = searchable_ids(root / 'enrichment/qrent-writer.env')
    updated = len(today & current)
    if inserted > updated:
        raise ValueError('New listings exceed today’s confirmed searchable inventory')
    snapshot = {
        'date': now.astimezone(SYDNEY).date().isoformat(),
        'generatedAt': now.isoformat(timespec='seconds'),
        'newToday': inserted,
        'updatedToday': updated,
        'currentListings': len(current),
    }
    # Only the aggregate is world-readable. Replace it after both sources pass.
    fd, name = mkstemp(dir=destination.parent, prefix='.listing-stats-')
    temp = Path(name)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(json.dumps(snapshot) + '\n')
        temp.chmod(0o644)
        temp.replace(destination)
    finally:
        temp.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/root/qrent-scraper'))
    parser.add_argument('--output', type=Path, default=Path('/var/www/qrent-stats/listing-stats.json'))
    args = parser.parse_args()
    sys.path.insert(0, str(args.root / 'releases/recovery-20261027'))
    export(args.root, args.output)


if __name__ == '__main__':
    main()
