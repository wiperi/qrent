"""Take checked, private backups of the existing QRent MySQL and Redis containers."""

import fcntl
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Timer


MIB = 1024**2
# This job streams its compressed artifacts and never expands the MySQL dump on disk.
DISK_RESERVE = 1024 * MIB
MAX_MYSQL_BYTES = 256 * MIB
MAX_REDIS_BYTES = 64 * MIB
DUMP_TABLE = re.compile(rb"^CREATE TABLE `([^`]+)`")
MANAGED = re.compile(r"qrent-\d{8}T\d{12}Z")
ACCOUNT_TABLES = {"users", "user_sessions", "_PropertyToUser", "email_preferences"}
MYSQL_TABLES = """
set -eu
test -n "${MYSQL_ROOT_PASSWORD:-}"
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
exec mysql -uroot --batch --skip-column-names "${MYSQL_DATABASE:-qrent}" -e "
  SELECT TABLE_NAME FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME
"
"""
MYSQL_DUMP = """
set -eu
test -n "${MYSQL_ROOT_PASSWORD:-}"
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
exec mysqldump -uroot --single-transaction --quick --skip-lock-tables \
  --no-tablespaces --set-gtid-purged=OFF --routines --events --triggers --hex-blob \
  --comments --dump-date --databases "${MYSQL_DATABASE:-qrent}"
"""
REDIS_DUMP = """
set -eu
snapshot=$(mktemp /tmp/qrent-rdb.XXXXXX)
trap 'rm -f "$snapshot"' EXIT
# Bound the temporary file inside the Redis container as well as the final copy.
ulimit -f 131072
redis-cli --rdb "$snapshot" >/dev/null 2>&1
redis-check-rdb "$snapshot" >/dev/null 2>&1
cat "$snapshot"
"""


def command(container, script):
    return ["docker", "exec", container, "sh", "-c", script]


def ensure_space(directory):
    if shutil.disk_usage(directory).free < DISK_RESERVE:
        raise RuntimeError("backup disk reserve unavailable")


def write_snapshot(args, target, compress=False):
    ensure_space(target.parent)
    output_limit = MAX_MYSQL_BYTES if compress else MAX_REDIS_BYTES
    with subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as process:
        deadline = Timer(180, process.kill)
        deadline.daemon = True
        deadline.start()
        try:
            with target.open("xb") as output:
                if compress:
                    with gzip.GzipFile(filename="", mode="wb", fileobj=output, mtime=0) as stream:
                        copy_snapshot(process.stdout, stream, target.parent, output, output_limit)
                else:
                    copy_snapshot(process.stdout, output, target.parent, output, output_limit)
                if output.tell() > output_limit:
                    raise RuntimeError("backup file exceeds its size limit")
                output.flush()
                os.fsync(output.fileno())
            if process.wait() != 0:
                raise RuntimeError("database snapshot command failed")
        except BaseException:
            process.kill()
            raise
        finally:
            deadline.cancel()


def copy_snapshot(source, target, directory, output, output_limit):
    while chunk := source.read(1024 * 1024):
        target.write(chunk)
        if output.tell() > output_limit:
            raise RuntimeError("backup file exceeds its size limit")
        ensure_space(directory)


def verify_mysql(path, expected):
    tables = set()
    last_line = b""
    with gzip.open(path, "rb") as dump:
        for line in dump:
            if line.strip():
                last_line = line
            match = DUMP_TABLE.match(line)
            if match:
                tables.add(match[1].decode())
    if tables != expected or not last_line.startswith(b"-- Dump completed on "):
        raise RuntimeError("MySQL dump verification failed")


def metadata(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return {"sha256": digest.hexdigest(), "bytes": path.stat().st_size}


def rotate(root, cutoff):
    removed = 0
    for directory in root.iterdir():
        if directory.is_symlink() or not directory.is_dir() or not MANAGED.fullmatch(directory.name):
            continue
        if datetime.strptime(directory.name, "qrent-%Y%m%dT%H%M%S%fZ").replace(tzinfo=timezone.utc) >= cutoff:
            continue
        items = list(directory.iterdir())
        if {item.name for item in items} != {"mysql.sql.gz", "redis.rdb", "receipt.json"}:
            continue
        if any(item.is_symlink() or not item.is_file() for item in items):
            continue
        try:
            receipt = json.loads((directory / "receipt.json").read_text())
        except (OSError, ValueError):
            continue
        if not isinstance(receipt, dict) or receipt.get("status") != "verified":
            continue
        shutil.rmtree(directory)
        removed += 1
    return removed


def backup(root, mysql="qrent-db-1", redis="qrent-redis-1"):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    now = datetime.now(timezone.utc)
    destination = root / now.strftime("qrent-%Y%m%dT%H%M%S%fZ")
    with (root / ".backup.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        ensure_space(root)
        names = subprocess.check_output(
            command(mysql, MYSQL_TABLES), text=True, stderr=subprocess.DEVNULL, timeout=15
        )
        expected = set(names.splitlines())
        if not ACCOUNT_TABLES <= expected:
            raise RuntimeError("required QRent account tables were not found")
        with TemporaryDirectory(dir=root, prefix=".pending-") as work:
            stage = Path(work)
            mysql_file = stage / "mysql.sql.gz"
            redis_file = stage / "redis.rdb"
            write_snapshot(command(mysql, MYSQL_DUMP), mysql_file, compress=True)
            verify_mysql(mysql_file, expected)
            if shutil.disk_usage(stage).free < DISK_RESERVE + 2 * MAX_REDIS_BYTES:
                raise RuntimeError("insufficient space for both Redis snapshot copies")
            write_snapshot(command(redis, REDIS_DUMP), redis_file)
            with redis_file.open("rb") as rdb:
                if rdb.read(5) != b"REDIS" or redis_file.stat().st_size <= 9:
                    raise RuntimeError("Redis snapshot verification failed")
            receipt = {
                "status": "verified",
                "at_utc": now.isoformat(timespec="seconds"),
                "archive": destination.name,
                "mysql": {**metadata(mysql_file), "tables": len(expected)},
                "redis": metadata(redis_file),
                "available_bytes": shutil.disk_usage(stage).free,
            }
            with (stage / "receipt.json").open("x") as output:
                json.dump(receipt, output)
                output.flush()
                os.fsync(output.fileno())
            fsync_directory(stage)
            stage.rename(destination)
            fsync_directory(root)
        return {**receipt, "rotated": rotate(root, now - timedelta(days=7))}


def fsync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        root = Path.home() / "qrent/.deploy/backups/daily"
        print(json.dumps(backup(root)), flush=True)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        # No database output or connection arguments in the cron log.
        print(json.dumps({"status": "backup_failed"}), flush=True)
        sys.exit(1)
