"""Send a private summary of new Qrent beta signups to the site owner."""

import base64
import json
import os
import re
import smtplib
import ssl
import subprocess
import sys
from email.message import EmailMessage
from email.utils import formatdate
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4


OPS = Path(__file__).resolve().parent
SENDER = "support@markovo.net"
SMTP_HOST = "smtpdm.aliyun.com"
SMTP_PORT = 465


class NotificationError(Exception):
    pass


class RemoteStore:
    def __init__(self, directory):
        host = os.environ.get("DEPLOY_SERVER_HOST", "")
        user = os.environ.get("DEPLOY_SERVER_USERNAME", "")
        password = os.environ.get("DEPLOY_SERVER_PASSWORD", "")
        if not (
            re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.:-]*", host)
            and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", user)
            and password
        ):
            raise NotificationError("production SSH configuration unavailable")
        directory = Path(directory)
        pins = re.findall(
            r"^qrent-deploy-server ssh-ed25519 [A-Za-z0-9+/=]+$",
            (OPS / "release_backend.sh").read_text(),
            re.MULTILINE,
        )
        if len(pins) != 1:
            raise NotificationError("production SSH identity unavailable")
        known_hosts = directory / "known_hosts"
        known_hosts.write_text(pins[0] + "\n")
        askpass = directory / "askpass"
        askpass.write_text('#!/bin/sh\nprintf "%s\\n" "$DEPLOY_SERVER_PASSWORD"\n')
        askpass.chmod(0o700)
        self.command = [
            "ssh", "-T", "-F", "/dev/null",
            "-o", "HostKeyAlgorithms=ssh-ed25519",
            "-o", "HostKeyAlias=qrent-deploy-server",
            "-o", "StrictHostKeyChecking=yes",
            "-o", f"UserKnownHostsFile={known_hosts}",
            "-o", "GlobalKnownHostsFile=/dev/null",
            "-o", "UpdateHostKeys=no",
            "-o", "CheckHostIP=no",
            "-o", "PreferredAuthentications=password,keyboard-interactive",
            "-o", "PubkeyAuthentication=no",
            "-o", "NumberOfPasswordPrompts=1",
            "-o", "ForwardAgent=no",
            "-o", "ClearAllForwardings=yes",
            "-o", "ConnectTimeout=15",
            "-o", "ServerAliveInterval=10",
            "-o", "ServerAliveCountMax=3",
            "-o", "LogLevel=ERROR",
            "-l", user, host,
        ]
        self.environment = {
            "PATH": os.environ["PATH"],
            "DISPLAY": "qrent-mail",
            "SSH_ASKPASS": str(askpass),
            "SSH_ASKPASS_REQUIRE": "force",
            "DEPLOY_SERVER_PASSWORD": password,
        }
        self.source = (OPS / "rental_alert_notification_store.py").read_bytes()

    def __call__(self, operation, **parameters):
        request = json.dumps({"operation": operation, **parameters}).encode()
        encoded = base64.urlsafe_b64encode(request).decode("ascii")
        try:
            response = subprocess.run(
                [*self.command, "python3", "-", encoded],
                input=self.source,
                capture_output=True,
                env=self.environment,
                check=True,
                timeout=160,
            )
            return json.loads(response.stdout)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            raise NotificationError(f"signup store {operation} unavailable") from error


def mail_config():
    owner = os.environ.get("QRENT_ALERT_OWNER_EMAIL", "").strip()
    password = os.environ.get("QRENT_ALERT_SMTP_PASSWORD", "")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.+_-]*@gmail\.com", owner, re.IGNORECASE):
        raise NotificationError("owner Gmail configuration unavailable")
    if not password:
        raise NotificationError("Markovo SMTP configuration unavailable")
    return owner, password


def make_message(owner, batch, records, smoke=False):
    message = EmailMessage()
    message["From"] = f"Markovo <{SENDER}>"
    message["To"] = owner
    message["Reply-To"] = SENDER
    message["Date"] = formatdate(usegmt=True)
    message["Message-ID"] = f"<qrent-rental-alerts-{batch}@markovo.net>"
    if smoke:
        message["Subject"] = "Qrent 租房订阅提醒联调"
        message.set_content("这是一封 Qrent 报名提醒的发信测试，未创建报名记录。")
        return message
    count = len(records)
    message["Subject"] = f"Qrent 有 {count} 个新的租房订阅内测报名"
    lines = ["以下报名已保存到 Qrent，可按需要联系报名者。", ""]
    for record in records:
        locale = "中文" if record["locale"] == "zh" else "英文"
        lines.append(f'{record["email"]}  {locale}  {record["registered"]}')
    message.set_content("\n".join(lines))
    return message


def emit(status, **details):
    print(json.dumps({"status": status, **details}), flush=True)


def send_notifications(store, smoke=False, smtp_factory=smtplib.SMTP_SSL):
    if smoke:
        store("inspect")
        batch = sha256(("smoke:" + os.environ.get("GITHUB_RUN_ID", uuid4().hex)).encode()).hexdigest()[:32]
        records = []
    else:
        records = store("pending")["records"]
        if not records:
            emit("no_new_signups")
            return
        batch = uuid4().hex

    owner, password = mail_config()
    try:
        smtp = smtp_factory(SMTP_HOST, SMTP_PORT, timeout=20, context=ssl.create_default_context())
    except (smtplib.SMTPException, OSError):
        raise NotificationError("Markovo SMTP connection unavailable") from None
    try:
        # Connect and authenticate before reserving a batch.
        try:
            smtp.login(SENDER, password)
        except (smtplib.SMTPException, OSError):
            raise NotificationError("Markovo SMTP authentication unavailable") from None
        if not smoke:
            try:
                claimed = set(store(
                    "reserve", batch=batch, digests=[record["digest"] for record in records]
                )["claimed"])
            except NotificationError:
                # No SMTP message has been attempted, even if the store committed.
                store("release", batch=batch)
                raise
            records = [record for record in records if record["digest"] in claimed]
            if not records:
                emit("no_new_signups")
                return
        message = make_message(owner, batch, records, smoke=smoke)
        try:
            if smtp.send_message(message, from_addr=SENDER, to_addrs=[owner]):
                raise NotificationError("SMTP rejected the owner recipient")
        except (smtplib.SMTPException, OSError, NotificationError) as error:
            rejected = (
                isinstance(error, (smtplib.SMTPRecipientsRefused, NotificationError))
                or (isinstance(error, smtplib.SMTPResponseException) and 400 <= error.smtp_code <= 599)
            )
            if rejected:
                if not smoke:
                    store("release", batch=batch)
                raise NotificationError("SMTP rejected the notification") from None
            # A disconnect after DATA is ambiguous. Preserve reservations for inbox reconciliation.
            emit("smtp_outcome_unconfirmed", message_id=message["Message-ID"], count=len(records))
            raise NotificationError("SMTP acceptance could not be confirmed") from None
        if not smoke:
            try:
                result = store("sent", batch=batch)
                if result["count"] != len(records):
                    raise NotificationError("incomplete delivery receipt")
            except NotificationError:
                emit("smtp_accepted_receipt_unconfirmed", message_id=message["Message-ID"], count=len(records))
                raise
        emit("smtp_accepted", message_id=message["Message-ID"], count=len(records), smoke=smoke)
    finally:
        smtp.close()


def main():
    os.umask(0o077)
    mode = sys.argv[1]
    if mode not in ("inspect", "smoke", "send"):
        raise NotificationError("unsupported notification mode")
    with TemporaryDirectory(prefix="qrent-mail-") as directory:
        store = RemoteStore(directory)
        if mode == "inspect":
            try:
                mail_config()
                configured = True
            except NotificationError:
                configured = False
            emit("inspected", **store("inspect"), mail_configured=configured)
        else:
            send_notifications(store, smoke=mode == "smoke")


if __name__ == "__main__":
    try:
        main()
    except NotificationError as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Raw SMTP errors and SSH output can contain credentials or email addresses.
        print("::error::Signup notification could not be processed", file=sys.stderr)
        sys.exit(1)
