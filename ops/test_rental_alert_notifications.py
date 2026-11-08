"""Exercise durable signup notification state without sending real mail."""

import contextlib
import io
import json
import os
import smtplib
import stat
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from unittest.mock import Mock, patch

import notify_rental_alerts as notifier
import rental_alert_notification_store as ledger
import install_rental_alert_cron as installer


class RentalAlertNotificationsTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "mail" / "receipts.sqlite3"
        self.entries = []
        self.messages = []
        self.smtp_failure = None
        self.calls = []
        self.environment = patch.dict(os.environ, {
            "QRENT_ALERT_OWNER_EMAIL": "qrent.owner.test@gmail.com",
            "QRENT_ALERT_SMTP_PASSWORD": "local-test-password",
            "GITHUB_RUN_ID": "1234",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def add_signup(self, email):
        self.entries.append({
            "field": sha256(email.encode()).hexdigest(),
            "value": json.dumps({
                "email": email, "locale": "zh", "registeredAt": "2026-11-08T12:34:56.789Z"
            }),
        })

    def redis(self, mode, cursor="0"):
        if mode == "count":
            return len(self.entries)
        return {"entries": self.entries, "cursor": "0"}

    def store(self, operation, **params):
        self.calls.append(operation)
        if operation == "inspect":
            return ledger.inspect(self.path, self.redis)
        if operation == "pending":
            return ledger.pending(self.path, self.redis)
        return ledger.record_delivery(self.path, operation, params["batch"], params.get("digests", ()))

    def smtp_factory(self, host, port, **kwargs):
        self.assertEqual((host, port), ("smtpdm.aliyun.com", 465))
        test = self

        class SMTP:
            def login(self, sender, password):
                test.assertEqual((sender, password), ("support@markovo.net", "local-test-password"))

            def send_message(self, message, from_addr, to_addrs):
                test.assertEqual(from_addr, "support@markovo.net")
                test.assertEqual(to_addrs, ["qrent.owner.test@gmail.com"])
                test.messages.append(message)
                if test.smtp_failure:
                    raise test.smtp_failure
                return {}

            def close(self):
                pass

        return SMTP()

    def run_notification(self, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            notifier.send_notifications(self.store, smtp_factory=self.smtp_factory, **kwargs)
        return json.loads(output.getvalue())

    def test_combines_new_signups_and_never_resends_the_batch(self):
        self.add_signup("renter-one@example.test")
        self.add_signup("renter-two@example.test")
        result = self.run_notification()
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["message_id"], self.messages[0]["Message-ID"])
        self.assertIn("renter-two@example.test", self.messages[0].get_content())
        self.assertNotIn("renter-two@example.test", json.dumps(result))
        self.assertEqual(self.run_notification(), {"status": "no_new_signups"})
        self.assertEqual(len(self.messages), 1)
        self.assertEqual(self.store("inspect")["sent"], 2)

    def test_smtp_rejection_releases_the_signups_for_retry(self):
        self.add_signup("renter@example.test")
        self.smtp_failure = smtplib.SMTPDataError(451, b"temporary error")
        with self.assertRaisesRegex(notifier.NotificationError, "SMTP rejected"):
            self.run_notification()
        self.assertEqual(self.store("inspect")["reserved"], 0)
        self.smtp_failure = None
        self.assertEqual(self.run_notification()["status"], "smtp_accepted")

    def test_uncertain_smtp_result_does_not_repeat_or_block_new_signups(self):
        self.add_signup("reserved@example.test")
        self.smtp_failure = smtplib.SMTPServerDisconnected("connection dropped")
        with self.assertRaisesRegex(notifier.NotificationError, "could not be confirmed"):
            self.run_notification()
        report = self.store("inspect")
        self.assertEqual(report["reserved"], 1)
        self.assertEqual(
            self.messages[0]["Message-ID"],
            f'<qrent-rental-alerts-{report["pending_batches"][0]}@markovo.net>',
        )
        self.smtp_failure = None
        self.add_signup("new@example.test")
        self.assertEqual(self.run_notification()["count"], 1)
        self.assertIn("new@example.test", self.messages[-1].get_content())
        self.assertNotIn("reserved@example.test", self.messages[-1].get_content())

    def test_smoke_and_inspect_leave_signups_and_receipts_untouched(self):
        self.add_signup("renter@example.test")
        self.assertEqual(self.store("inspect")["registered"], 1)
        self.assertFalse(self.path.exists())
        result = self.run_notification(smoke=True)
        self.assertEqual(result["status"], "smtp_accepted")
        self.assertEqual(result["count"], 0)
        self.assertTrue(result["smoke"])
        self.assertEqual(self.calls, ["inspect", "inspect"])
        self.assertNotIn("renter@example.test", self.messages[0].get_content())
        self.assertFalse(self.path.exists())

    def test_host_install_check_defers_real_pending_signups(self):
        self.add_signup("renter@example.test")
        result = self.run_notification(empty_only=True)
        self.assertEqual(result, {"status": "install_check_pending_signups"})
        self.assertEqual(self.calls, ["pending"])
        self.assertEqual(self.messages, [])
        self.assertFalse(self.path.exists())

    def test_staged_host_check_authenticates_and_closes_without_sending(self):
        directory = self.path.parent
        directory.mkdir()
        (directory / "smtp.json").write_text(json.dumps({
            "QRENT_ALERT_OWNER_EMAIL": "qrent.owner.test@gmail.com",
            "QRENT_ALERT_SMTP_PASSWORD": "local-test-password",
        }))
        connection = Mock()
        with patch.object(notifier, "OPS", directory), patch.object(
            notifier, "smtp_login", return_value=connection
        ) as login, patch.object(ledger, "dispatch", return_value={"records": []}):
            with contextlib.redirect_stdout(io.StringIO()) as output:
                notifier.local_run(empty_only=True, state_directory=directory)
        login.assert_called_once_with("local-test-password")
        connection.close.assert_called_once_with()
        for operation in ("mail", "rcpt", "data", "send_message"):
            getattr(connection, operation).assert_not_called()
        report = json.loads(output.getvalue())
        self.assertEqual(report["status"], "no_new_signups")
        self.assertEqual(report["smtp_login"], "verified")

    def test_staged_smtp_failure_reports_only_the_phase_code(self):
        directory = self.path.parent
        directory.mkdir()
        completed = subprocess.CompletedProcess(
            ["local-check"], 1, b'{"status":"smtp_auth_failed"}', b"private smtp diagnostic"
        )
        with patch.object(installer.subprocess, "run", return_value=completed):
            with self.assertRaisesRegex(installer.InstallCheckError, "^smtp_auth_failed$"):
                installer.validated_files({"notifier": "pass", "store": "pass", "config": {}}, directory)

    def test_inspect_requires_verified_cron_and_recent_success_receipt(self):
        self.path.parent.mkdir()
        line = "7,22,37,52 * * * * /usr/bin/example local # qrent-rental-alert-mail"
        (self.path.parent / "installed.json").write_text(json.dumps({
            "cron_line_sha256": sha256(line.encode()).hexdigest(),
        }))
        with patch.object(ledger.subprocess, "check_output", return_value=line + "\n"):
            self.assertTrue(self.store("inspect")["local_cron"]["installed"])
            self.assertFalse(self.store("inspect")["local_cron"]["healthy"])
            receipt = self.path.parent / "last-run.json"
            receipt.write_text(json.dumps({
                "status": "no_new_signups", "finished_at": datetime.now(timezone.utc).isoformat(),
            }))
            self.assertTrue(self.store("inspect")["local_cron"]["healthy"])
            receipt.write_text(json.dumps({
                "status": "no_new_signups",
                "finished_at": (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat(),
            }))
            self.assertFalse(self.store("inspect")["local_cron"]["healthy"])
        with patch.object(ledger.subprocess, "check_output", return_value=""):
            self.assertFalse(self.store("inspect")["local_cron"]["installed"])

    def test_host_installer_preserves_other_cron_tasks_and_is_idempotent(self):
        deploy = self.path.parent
        deploy.mkdir()
        unrelated = (
            b"# existing comments\n\n"
            b"# documented # qrent-rental-alert-mail\n"
            b"15 3 * * * /private/backup # qrent-database-backup\n"
        )
        observed = unrelated + b"5 * * * * /old/notifier # qrent-rental-alert-mail\n"
        writes = []
        fixture_config = {
            "QRENT_ALERT_OWNER_EMAIL": "qrent.owner.test@gmail.com",
            "QRENT_ALERT_SMTP_PASSWORD": "local-test-password",
        }

        def run(command, **kwargs):
            nonlocal observed
            if command[0] == "systemctl":
                return subprocess.CompletedProcess(command, 0, b"", b"")
            if command == ["crontab", "-l"]:
                return subprocess.CompletedProcess(command, 0, observed, b"")
            if command == ["crontab", "-"]:
                observed = kwargs["input"]
                writes.append(observed)
                return subprocess.CompletedProcess(command, 0, b"", b"")
            self.assertEqual(command[-2], "local-check")
            self.assertEqual(Path(command[-1]), deploy / "rental-alert-mail")
            config = Path(command[1]).parent / "smtp.json"
            self.assertEqual(stat.S_IMODE(config.stat().st_mode), 0o600)
            self.assertEqual(json.loads(config.read_text()), fixture_config)
            return subprocess.CompletedProcess(
                command, 0, b'{"status":"no_new_signups","smtp_login":"verified"}', b""
            )

        payload = {"notifier": "pass", "store": "pass", "config": fixture_config}
        with patch.object(installer.subprocess, "run", side_effect=run):
            for _ in range(2):
                receipt = installer.configure(payload, deploy)
                self.assertTrue(receipt["unmanaged_entries_preserved"])
                self.assertEqual(receipt["initial_check"], "no_new_signups")
                self.assertEqual(receipt["smtp_login"], "verified")
        self.assertEqual(len(writes), 1)
        self.assertEqual(installer.unmanaged_entries(observed), unrelated)
        self.assertNotIn(b"local-test-password", observed)
        backups = list((deploy / "rental-alert-mail").glob("crontab-before-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(stat.S_IMODE(backups[0].stat().st_mode), 0o600)
        self.assertEqual(backups[0].read_bytes(), unrelated + b"5 * * * * /old/notifier # qrent-rental-alert-mail\n")

    def test_no_crontab_is_distinct_from_unreadable_crontab(self):
        with patch.object(installer.subprocess, "run", return_value=subprocess.CompletedProcess(
            ["crontab", "-l"], 1, b"", b"no crontab for qrent\n",
        )):
            self.assertIsNone(installer.current_crontab())
        with patch.object(installer.subprocess, "run", return_value=subprocess.CompletedProcess(
            ["crontab", "-l"], 1, b"", b"permission denied",
        )):
            with self.assertRaisesRegex(RuntimeError, "could not be read"):
                installer.current_crontab()

    def test_failed_staging_does_not_replace_installed_worker_files(self):
        deploy = self.path.parent
        directory = deploy / "rental-alert-mail"
        directory.mkdir(parents=True)
        old = {installer.WORKER: b"old worker", installer.STORE: b"old store", installer.CONFIG: b"old config"}
        for name, data in old.items():
            (directory / name).write_bytes(data)

        def run(command, **kwargs):
            if command[0] == "systemctl":
                return subprocess.CompletedProcess(command, 0, b"", b"")
            if command == ["crontab", "-l"]:
                return subprocess.CompletedProcess(command, 0, b"# existing cron\n", b"")
            self.assertEqual(command[-2], "local-check")
            raise subprocess.CalledProcessError(1, command)

        with patch.object(installer.subprocess, "run", side_effect=run):
            with self.assertRaises(subprocess.CalledProcessError):
                installer.configure({"notifier": "pass", "store": "pass", "config": {}}, deploy)
        self.assertEqual({name: (directory / name).read_bytes() for name in old}, old)
        self.assertEqual(list(directory.glob("crontab-before-*")), [])

    def test_mismatch_only_restores_when_managed_line_and_other_entries_match(self):
        previous = b"4 * * * * /old/notifier # qrent-rental-alert-mail\n5 * * * * /private/backup\n"
        retained = b"5 * * * * /private/backup\n"
        line = b"7,22,37,52 * * * * /new/notifier # qrent-rental-alert-mail"
        reordered = line + b"\n" + retained
        with patch.object(installer, "current_crontab", side_effect=[reordered, previous]):
            with patch.object(installer, "write_crontab") as write:
                self.assertEqual(
                    installer.restore_after_mismatch(previous, reordered, retained, line),
                    "readback_mismatch_restored_previous",
                )
                write.assert_called_once_with(previous)
        with patch.object(installer, "write_crontab") as write:
            self.assertEqual(
                installer.restore_after_mismatch(previous, reordered + b"# concurrent edit\n", retained, line),
                "readback_mismatch_preserved_unmanaged_change",
            )
            write.assert_not_called()


if __name__ == "__main__":
    unittest.main()
