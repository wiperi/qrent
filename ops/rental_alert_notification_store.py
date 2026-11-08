"""Read signups from the existing container and keep private delivery receipts."""

import base64
import json
import os
import re
import sqlite3
import subprocess
import sys
from contextlib import closing
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path


SIGNUP_KEY = "qrent:rental-alerts:interest:v1"
LEDGER = Path.home() / "qrent/.deploy/rental-alert-mail/receipts.sqlite3"
BATCH_SIZE = 50
SCAN_PAGES = 20
DIGEST = re.compile(r"[a-f0-9]{64}")
BATCH = re.compile(r"[a-f0-9]{32}")
CURSOR = re.compile(r"[0-9]{1,20}")
ADDRESS = re.compile(r"[!-~]+@[A-Za-z0-9.-]+")

READ_REDIS = """
import { createRequire } from 'node:module';
const require = createRequire('/app/packages/backend/package.json');
const { createClient } = require('redis');
const [key, mode, cursor] = process.argv.slice(2);
if (!process.env.REDIS_URL) process.exit(1);
const client = createClient({
  url: process.env.REDIS_URL,
  disableOfflineQueue: true,
  socket: { connectTimeout: 4000, reconnectStrategy: false },
});
client.on('error', () => {});
try {
  await client.connect();
  const result = mode === 'count'
    ? await client.hLen(key)
    : await client.hScan(key, cursor, { COUNT: 256 });
  console.log(JSON.stringify(result));
} catch {
  process.exitCode = 1;
} finally {
  if (client.isOpen) client.destroy();
}
"""


def redis_read(mode, cursor="0"):
    response = subprocess.run(
        [
            "docker", "exec", "-i", "qrent-backend-1",
            "node", "--input-type=module", "-", SIGNUP_KEY, mode, cursor,
        ],
        input=READ_REDIS,
        capture_output=True,
        text=True,
        check=True,
        timeout=7,
    )
    return json.loads(response.stdout)


def connect_ledger(path, read_only=False):
    if read_only:
        return sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=5)
    path.parent.mkdir(mode=0o700, exist_ok=True)
    db = sqlite3.connect(path, timeout=5)
    db.execute("PRAGMA synchronous = FULL")
    db.execute(
        """CREATE TABLE IF NOT EXISTS deliveries (
            digest TEXT PRIMARY KEY,
            batch TEXT NOT NULL,
            sent INTEGER NOT NULL DEFAULT 0,
            reserved_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )"""
    )
    db.execute(
        """CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            cursor TEXT NOT NULL
        )"""
    )
    return db


def inspect(path, read_redis):
    result = {
        "registered": read_redis("count"),
        "sent": 0,
        "reserved": 0,
        "pending_batches": [],
    }
    if not path.exists():
        return result
    with closing(connect_ledger(path, read_only=True)) as db:
        for sent, count in db.execute("SELECT sent, COUNT(*) FROM deliveries GROUP BY sent"):
            result["sent" if sent else "reserved"] = count
        result["pending_batches"] = [
            row[0] for row in db.execute(
                "SELECT batch FROM deliveries WHERE sent = 0 GROUP BY batch "
                "ORDER BY MIN(reserved_at) LIMIT 5"
            )
        ]
    return result


def parse_signup(entry):
    digest = entry.get("field")
    if not isinstance(digest, str) or not DIGEST.fullmatch(digest):
        return None
    try:
        record = json.loads(entry["value"])
        email = record["email"]
        locale = record["locale"]
        registered = datetime.fromisoformat(record["registeredAt"].replace("Z", "+00:00"))
        if (
            len(email) <= 254 and ADDRESS.fullmatch(email)
            and sha256(email.encode("ascii")).hexdigest() == digest
            and locale in ("zh", "en") and registered.tzinfo is not None
        ):
            return {
                "digest": digest,
                "email": email,
                "locale": locale,
                "registered": registered.astimezone(timezone.utc).isoformat(timespec="seconds"),
            }
    except (AttributeError, KeyError, TypeError, ValueError):
        return None
    return None


def pending(path, read_redis):
    start = "0"
    if path.exists():
        with closing(connect_ledger(path, read_only=True)) as db:
            row = db.execute("SELECT cursor FROM progress WHERE id = 1").fetchone()
            if row:
                start = row[0]
    cursor = start
    picked = {}
    first_selected = None
    for _ in range(SCAN_PAGES):
        page = read_redis("scan", cursor)
        records = [record for entry in page["entries"] if (record := parse_signup(entry))]
        if records and path.exists():
            marks = ",".join("?" for _ in records)
            with closing(connect_ledger(path, read_only=True)) as db:
                claimed = {
                    row[0] for row in db.execute(
                        f"SELECT digest FROM deliveries WHERE digest IN ({marks})",
                        [record["digest"] for record in records],
                    )
                }
            records = [record for record in records if record["digest"] not in claimed]
        if records:
            if first_selected is None:
                first_selected = cursor
            for record in records:
                picked[record["digest"]] = record
        cursor = page["cursor"]
        if not CURSOR.fullmatch(cursor):
            raise ValueError("invalid scan cursor")
        if len(picked) >= BATCH_SIZE or cursor == "0":
            break
    # Resume at the first selected page so any unclaimed records stay eligible.
    resume = first_selected if first_selected is not None else cursor
    if resume != start:
        with closing(connect_ledger(path)) as db, db:
            db.execute(
                "INSERT INTO progress VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET cursor=excluded.cursor",
                (resume,),
            )
    return {"records": list(picked.values())[:BATCH_SIZE]}


def record_delivery(path, operation, batch, digests=()):
    if not BATCH.fullmatch(batch) or len(digests) > BATCH_SIZE or not all(
        DIGEST.fullmatch(digest) for digest in digests
    ):
        raise ValueError("invalid delivery request")
    with closing(connect_ledger(path)) as db, db:
        if operation == "reserve":
            claimed = []
            for digest in digests:
                result = db.execute(
                    "INSERT OR IGNORE INTO deliveries (digest, batch) VALUES (?, ?)",
                    (digest, batch),
                )
                if result.rowcount == 1:
                    claimed.append(digest)
            return {"claimed": claimed}
        if operation == "sent":
            return {
                "count": db.execute(
                    "UPDATE deliveries SET sent = 1 WHERE batch = ? AND sent = 0",
                    (batch,),
                ).rowcount
            }
        if operation == "release":
            return {
                "count": db.execute(
                    "DELETE FROM deliveries WHERE batch = ? AND sent = 0",
                    (batch,),
                ).rowcount
            }
    raise ValueError("invalid store operation")


def main():
    os.umask(0o077)
    request = json.loads(base64.urlsafe_b64decode(sys.argv[1]))
    operation = request["operation"]
    if operation == "inspect":
        result = inspect(LEDGER, redis_read)
    elif operation == "pending":
        result = pending(LEDGER, redis_read)
    else:
        result = record_delivery(LEDGER, operation, request["batch"], request.get("digests", ()))
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # SSH diagnostics and Redis records never reach the public Actions log.
        print("Signup store operation failed", file=sys.stderr)
        sys.exit(1)
