import gzip
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import backup_qrent_backend as job


class BackendBackupTests(unittest.TestCase):
    def test_dump_with_missing_table_or_footer_is_rejected(self):
        with TemporaryDirectory() as work:
            path = Path(work) / "mysql.sql.gz"
            with gzip.open(path, "wb") as output:
                output.write(b"CREATE TABLE `users` (id INT);\n-- Dump completed on 2026-11-08\n")
            with self.assertRaisesRegex(RuntimeError, "verification failed"):
                job.verify_mysql(path, job.ACCOUNT_TABLES)
            with gzip.open(path, "wb") as output:
                output.write(b"CREATE TABLE `users` (id INT);\n")
            with self.assertRaisesRegex(RuntimeError, "verification failed"):
                job.verify_mysql(path, {"users"})

    def test_failed_redis_stage_preserves_older_archives_and_discards_partial_files(self):
        with TemporaryDirectory() as work:
            root = Path(work)
            old = root / "qrent-20250101T000000000000Z"
            old.mkdir()
            (old / "mysql.sql.gz").write_bytes(b"original archive")
            (old / "redis.rdb").write_bytes(b"original account state")
            (old / "receipt.json").write_text(json.dumps({"status": "verified"}))

            def snapshot(_command, target, compress=False):
                if not compress:
                    target.write_bytes(b"truncated redis")
                    raise RuntimeError("Redis failed")
                with gzip.open(target, "wb") as output:
                    for name in sorted(job.ACCOUNT_TABLES):
                        output.write(f"CREATE TABLE `{name}` (id INT);\n".encode())
                    output.write(b"-- Dump completed on 2026-11-08\n")

            with patch.object(job, "ensure_space"), patch.object(
                job.subprocess, "check_output", return_value="\n".join(job.ACCOUNT_TABLES)
            ), patch.object(job, "write_snapshot", side_effect=snapshot):
                with self.assertRaisesRegex(RuntimeError, "Redis failed"):
                    job.backup(root)
            self.assertEqual([p.name for p in root.iterdir() if p.is_dir()], [old.name])
            self.assertEqual((old / "mysql.sql.gz").read_bytes(), b"original archive")
            self.assertEqual((old / "redis.rdb").read_bytes(), b"original account state")


if __name__ == "__main__":
    unittest.main()
