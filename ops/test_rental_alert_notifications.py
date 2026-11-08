"""Exercise durable signup notification state without sending real mail."""

import contextlib
import io
import json
import os
import smtplib
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch

import notify_rental_alerts as notifier
import rental_alert_notification_store as ledger


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


if __name__ == "__main__":
    unittest.main()
