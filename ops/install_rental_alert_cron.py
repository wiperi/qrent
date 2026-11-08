"""Install the private signup notification worker from an authenticated SSH session."""

import base64
import fcntl
import json
import os
import shlex
import stat
import subprocess
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory


TAG = b"# qrent-rental-alert-mail"
SCHEDULE = "7,22,37,52 * * * *"
WORKER = "notify_rental_alerts.py"
STORE = "rental_alert_notification_store.py"
CONFIG = "smtp.json"
CRON_ENV = {**os.environ, "LC_ALL": "C"}
WORKER_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"


class InstallCheckError(RuntimeError):
    pass


def private_write(path, data):
    with NamedTemporaryFile(dir=path.parent, prefix=".install-", delete=False) as temporary:
        staged = Path(temporary.name)
        try:
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
            os.replace(staged, path)
        finally:
            staged.unlink(missing_ok=True)


def current_crontab():
    result = subprocess.run(
        ["crontab", "-l"], env=CRON_ENV, capture_output=True, timeout=10
    )
    if result.returncode == 0:
        return result.stdout
    if result.returncode == 1 and not result.stdout and result.stderr.startswith(b"no crontab for "):
        return None
    raise RuntimeError("user crontab could not be read")


def managed_line(line):
    return not line.lstrip().startswith(b"#") and line.rstrip().endswith(TAG)


def unmanaged_entries(crontab):
    return b"".join(line for line in crontab.splitlines(keepends=True) if not managed_line(line))


def worker_line(directory):
    command = shlex.join([sys.executable, str(directory / WORKER), "local"])
    return f"{SCHEDULE} PATH={WORKER_PATH} {command} >/dev/null 2>&1 {TAG.decode()}".encode()


def write_crontab(content):
    command = ["crontab", "-r" if content is None else "-"]
    subprocess.run(
        command, input=content, env=CRON_ENV, capture_output=True, check=True, timeout=10
    )


def restore_after_mismatch(previous, observed, retained, line):
    if observed is None or unmanaged_entries(observed) != retained:
        return "readback_mismatch_preserved_unmanaged_change"
    owned = [entry for entry in observed.splitlines() if managed_line(entry)]
    if owned != [line]:
        return "readback_mismatch_preserved_unverified_entry"
    try:
        if current_crontab() != observed:
            return "readback_mismatch_preserved_unmanaged_change"
        write_crontab(previous)
        if current_crontab() == previous:
            return "readback_mismatch_restored_previous"
    except (RuntimeError, OSError, subprocess.SubprocessError):
        pass
    return "readback_mismatch_restore_unverified"


def validated_files(payload, directory):
    files = {
        WORKER: payload["notifier"].encode(),
        STORE: payload["store"].encode(),
        CONFIG: json.dumps(payload["config"]).encode(),
    }
    with TemporaryDirectory(dir=directory, prefix=".staged-") as staging:
        stage = Path(staging)
        for name, data in files.items():
            private_write(stage / name, data)
        checked = subprocess.run(
            [sys.executable, str(stage / WORKER), "local-check", str(directory)],
            capture_output=True, timeout=200,
            env={**os.environ, "PATH": WORKER_PATH, "PYTHONDONTWRITEBYTECODE": "1"},
        )
    try:
        check = json.loads(checked.stdout)
        status = check["status"]
    except (TypeError, ValueError, KeyError):
        raise InstallCheckError("local_install_check_failed") from None
    if status in {"smtp_tls_connect_failed", "smtp_auth_failed"}:
        raise InstallCheckError(status)
    if (
        checked.returncode or check.get("smtp_login") != "verified"
        or status not in {"no_new_signups", "install_check_pending_signups"}
    ):
        raise InstallCheckError("local_install_check_failed")
    return files, status


def install_files(directory, files):
    with (directory / "worker.lock").open("a") as worker_lock:
        fcntl.flock(worker_lock, fcntl.LOCK_EX)
        previous = {}
        for name in files:
            path = directory / name
            if path.is_symlink():
                raise RuntimeError("unexpected notification file symlink")
            previous[name] = path.read_bytes() if path.exists() else None
        try:
            for name, data in files.items():
                private_write(directory / name, data)
            if stat.S_IMODE((directory / CONFIG).stat().st_mode) != 0o600:
                raise RuntimeError("notification configuration is not private")
        except Exception:
            for name, data in previous.items():
                path = directory / name
                if data is None:
                    path.unlink(missing_ok=True)
                else:
                    private_write(path, data)
            raise


def configure(payload, deploy):
    if not any(
        subprocess.run(
            ["systemctl", "is-active", "--quiet", unit],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5,
        ).returncode == 0
        for unit in ("cron.service", "crond.service")
    ):
        raise RuntimeError("cron service is not active")
    for name in ("notifier", "store"):
        compile(payload[name], name, "exec")
    directory = deploy / "rental-alert-mail"
    directory.mkdir(mode=0o700, exist_ok=True)
    if directory.is_symlink() or directory.stat().st_uid != os.getuid():
        raise RuntimeError("unexpected notification directory ownership")
    directory.chmod(0o700)
    with (deploy / "crontab.lock").open("a") as crontab_lock:
        fcntl.flock(crontab_lock, fcntl.LOCK_EX)
        previous = current_crontab()
        files, status = validated_files(payload, directory)
        retained = unmanaged_entries(previous or b"")
        if retained and not retained.endswith(b"\n"):
            retained += b"\n"
        line = worker_line(directory)
        desired = retained + line + b"\n"
        if current_crontab() != previous:
            raise RuntimeError("user crontab changed during installation")
        install_files(directory, files)
        rollback = None
        if desired != previous:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            rollback = "crontab-before-" + stamp
            private_write(directory / rollback, previous or b"")
            write_crontab(desired)
        try:
            observed = current_crontab()
        except (RuntimeError, OSError, subprocess.SubprocessError):
            return {"error": "readback_unavailable_crontab_preserved", "rollback_backup": rollback}
        if observed != desired:
            error = (
                restore_after_mismatch(previous, observed, retained, line)
                if rollback else "readback_mismatch_crontab_preserved"
            )
            return {"error": error, "rollback_backup": rollback}
        receipt = {
            "installed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "cron_line_sha256": sha256(line).hexdigest(),
            "unmanaged_entries_preserved": unmanaged_entries(observed) == retained,
            "config_mode": "0600",
            "initial_check": status,
            "smtp_login": "verified",
            "rollback_backup": rollback,
            "previous_crontab_present": previous is not None,
        }
        private_write(directory / "installed.json", json.dumps(receipt).encode())
        return receipt


def install(encoded):
    os.umask(0o077)
    try:
        payload = json.loads(base64.b64decode(encoded))
        print(json.dumps(configure(payload, Path.home() / "qrent/.deploy")))
    except InstallCheckError as error:
        print(json.dumps({"error": str(error)}))
    except Exception:
        print("Notification cron installation could not be verified", file=sys.stderr)
        sys.exit(1)
