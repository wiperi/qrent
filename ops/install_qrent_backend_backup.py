"""Install the verified backup job on the existing backend host through CI."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from notify_rental_alerts import RemoteStore


INSTALL = """
import fcntl
import json
import os
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

os.umask(0o077)
deploy = Path.home() / "qrent/.deploy"
if not deploy.is_dir():
    raise RuntimeError("missing backend deployment directory")
jobs = deploy / "backend-backup"
jobs.mkdir(mode=0o700, exist_ok=True)
version = jobs / ("backup-" + source_hash + ".py")
if not version.exists():
    with NamedTemporaryFile(mode="w", prefix=".backup-script-", dir=jobs, delete=False) as output:
        candidate = Path(output.name)
        output.write(source)
        output.flush()
        os.fsync(output.fileno())
    try:
        candidate.replace(version)
    finally:
        candidate.unlink(missing_ok=True)
elif version.read_text() != source:
    raise RuntimeError("backup source mismatch")
cron_active = any(
    subprocess.run(
        ["systemctl", "is-active", "--quiet", name],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5,
    ).returncode == 0
    for name in ("cron", "crond")
)
if not cron_active:
    raise RuntimeError("system cron is not active")
result = subprocess.run(
    ["/usr/bin/python3", str(version)], capture_output=True, text=True, timeout=410, check=True
)
receipt = json.loads(result.stdout)
if receipt.get("status") != "verified":
    raise RuntimeError("first backup did not verify")

(jobs / "backup.log").touch(mode=0o600, exist_ok=True)
marker = "# qrent-managed-backend-backup-v1"
line = (
    "23 21 * * * /usr/bin/python3 " + shlex.quote(str(version))
    + " >> " + shlex.quote(str(jobs / "backup.log")) + " 2>&1 " + marker + "\\n"
)
cron_env = {**os.environ, "LC_ALL": "C"}


def crontab():
    current = subprocess.run(["crontab", "-l"], capture_output=True, text=True, env=cron_env)
    if current.returncode == 0:
        return current.stdout
    if current.returncode == 1 and "no crontab for" in current.stderr:
        return ""
    raise RuntimeError("existing crontab could not be read")


with (deploy / "crontab.lock").open("a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    original = crontab()
    updated = "".join(item for item in original.splitlines(keepends=True) if not item.rstrip().endswith(marker))
    if updated and not updated.endswith("\\n"):
        updated += "\\n"
    updated += line
    if updated != original:
        original_path = jobs / datetime.now(timezone.utc).strftime("cron-before-%Y%m%dT%H%M%S%fZ")
        with original_path.open("x") as output:
            output.write(original)
        subprocess.run(["crontab", "-"], input=updated, text=True, check=True, env=cron_env)
        if crontab() != updated:
            subprocess.run(["crontab", "-"], input=original, text=True, check=True, env=cron_env)
            raise RuntimeError("cron verification did not match")
print(json.dumps({"status": "installed", "backup": receipt, "cron": "23 21 * * *",
                  "host_timezone": datetime.now().astimezone().tzname()}), flush=True)
"""


def install():
    source = Path(__file__).with_name("backup_qrent_backend.py").read_text()
    digest = hashlib.sha256(source.encode()).hexdigest()
    payload = f"source = {source!r}\nsource_hash = {digest!r}\n{INSTALL}"
    with TemporaryDirectory(prefix="qrent-backup-install-") as directory:
        remote = RemoteStore(directory)
        response = subprocess.run(
            [*remote.command, "python3", "-"],
            input=payload.encode(),
            env=remote.environment,
            capture_output=True,
            timeout=480,
            check=True,
        )
        result = json.loads(response.stdout)
        if result.get("status") != "installed":
            raise RuntimeError("backup installation receipt missing")
        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    try:
        install()
    except Exception:
        print("::error::Verified QRent backup installation did not complete", file=sys.stderr)
        sys.exit(1)
