#!/usr/bin/env bash
# Metadata and aggregate sizes only: never print environment or log contents.
set -euo pipefail
qrent_root="$HOME/qrent"
qrent_docker_root=$(docker info --format '{{.DockerRootDir}}')
printf 'Read-only deployment host capacity check.\n'
df -h "$qrent_root" "$qrent_docker_root" /var/run
df -i "$qrent_root" "$qrent_docker_root" /var/run
free -m
swapon --show --bytes
docker system df
docker ps -a --format 'table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}'
if [[ "${1:-}" != preflight ]]; then
  docker image ls --no-trunc --format 'Image inventory: {{.ID}} {{.Repository}}:{{.Tag}}'
  docker image inspect --format 'Image size: {{.Id}} {{.Size}} {{.Created}}' $(docker image ls -q)
  docker inspect --format '{{.Name}} {{json .Mounts}}' $(docker ps -q)
  qrent_redis=$(docker ps -q --filter name='^qrent-redis-1$')
  if [[ -n "$qrent_redis" ]]; then
    docker inspect --format 'Account-store process: running={{.State.Running}} oom_killed={{.State.OOMKilled}} restarts={{.RestartCount}} health={{.State.Health.Status}}' "$qrent_redis"
    python3 - "$qrent_redis" <<'PY'
import json, pathlib, subprocess, sys
state=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .State}}',sys.argv[1]],text=True))
pid=int(state['Pid']); root=pathlib.Path('/proc')/str(pid)
status={k:v.strip() for line in (root/'status').read_text().splitlines() if ':' in line for k,v in [line.split(':',1)]}
ports=[]
for version in ['tcp','tcp6']:
    try: lines=(root/'net'/version).read_text().splitlines()[1:]
    except FileNotFoundError: continue  # Exited/zombie tasks have no network namespace.
    for line in lines:
        cols=line.split()
        if cols[3]=='0A':ports.append(int(cols[1].split(':')[-1],16))
health=[]
for item in state.get('Health',{}).get('Log',[])[-3:]:
    output=item.get('Output','').lower()
    kind=('timeout' if 'timeout' in output or 'timed out' in output else
          'connection_refused' if 'connection refused' in output else
          'auth_required' if 'noauth' in output else
          'exec_unavailable' if 'exec' in output or 'runc' in output else 'other')
    health.append({'exit_code':item['ExitCode'],'kind':kind})
print('Account-store runtime: '+json.dumps({'pid':pid,'state':status.get('State','').split()[0],
    'threads':status.get('Threads'),'rss':status.get('VmRSS'),'swap':status.get('VmSwap'),
    'listen_ports':sorted(set(ports)),'recent_health':health}))
PY
    qrent_ping_exit=0
    qrent_ping=$(docker exec "$qrent_redis" timeout 5 redis-cli --raw PING 2>&1) || qrent_ping_exit=$?
    printf 'Account-store local PING exit: %s\n' "$qrent_ping_exit"
    case "$qrent_ping" in
      PONG) printf 'Account-store local PING: PONG\n' ;;
      NOAUTH*) printf 'Account-store local PING: NOAUTH\n' ;;
      DENIED*) printf 'Account-store local PING: DENIED\n' ;;
      ERR*) printf 'Account-store local PING: ERR\n' ;;
      *) printf 'Account-store local PING: unavailable\n' ;;
    esac
  fi
  qrent_backend=$(docker ps -q --filter name='^qrent-backend-1$')
  if [[ -n "$qrent_backend" ]]; then
    # Read-only PING probes; credentials remain inside the existing container.
    docker exec -i "$qrent_backend" node --input-type=module <<'JS'
import { createRequire } from 'node:module';
const require = createRequire('/app/packages/backend/package.json');
const { createClient } = require('redis');
let configured;
try { configured = process.env.REDIS_URL ? new URL(process.env.REDIS_URL) : undefined; } catch {}
const report = {
  url_present: !!process.env.REDIS_URL,
  url_valid: !!configured,
  protocol: ['redis:', 'rediss:'].includes(configured?.protocol) ? configured.protocol : 'unset_or_unsupported',
  host_kind: !configured ? 'unset_or_invalid' :
    ['127.0.0.1', 'localhost', '[::1]'].includes(configured.hostname) ? 'loopback' :
    configured.hostname === 'redis' ? 'compose_service' : 'other',
  port: configured?.port || '6379',
  username_present: !!configured?.username,
  password_present: !!configured?.password,
};
function safeCode(error) {
  const allowed = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET',
    'EAI_AGAIN', 'NOAUTH', 'WRONGPASS', 'NOPERM', 'DENIED', 'LOADING', 'ERR', 'MISCONF', 'READONLY'];
  return allowed.find(code => error?.code === code || String(error?.message).startsWith(code)) || 'connection_unavailable';
}
async function probe(url) {
  let client, timer;
  try {
    client = createClient({url, socket: {connectTimeout: 3000, reconnectStrategy: false}});
    client.on('error', () => {});
    const answer = await Promise.race([
      (async () => { await client.connect(); return await client.ping(); })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject({code: 'ETIMEDOUT'}), 5000); }),
    ]);
    return {ping: answer === 'PONG'};
  } catch (error) {
    const classes = ['Error', 'TypeError', 'SimpleError', 'SocketClosedUnexpectedlyError',
      'ConnectionTimeoutError', 'AggregateError'];
    return {ping: false, code: safeCode(error),
      error_class: classes.includes(error?.constructor?.name) ? error.constructor.name : 'other',
      nested_codes: Array.isArray(error?.errors) ? error.errors.map(safeCode) : []};
  }
  finally { clearTimeout(timer); try { if (client?.isOpen) client.destroy(); } catch {} }
}
report.configured = await probe(process.env.REDIS_URL);
if (!configured || configured.hostname !== 'redis') {
  const internal = configured ? new URL(configured) : new URL('redis://redis:6379');
  internal.hostname = 'redis'; internal.port = '6379';
  report.compose_same_credentials = await probe(internal.toString());
}
console.log('Account-store connectivity: ' + JSON.stringify(report));
JS
  fi
  # Summarize backup schedules and archive metadata without printing commands or file contents.
  python3 - "$qrent_root" "$qrent_redis" <<'PY'
import hashlib
import json
import re
import stat
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
redis_container = sys.argv[2]
backup_action = re.compile(r"backup|snapshot|dump|bgsave|\bsave\b", re.I)
backup_targets = {
    "mysql": re.compile(r"mysql|mariadb|db[-_]backup|backup[-_]db", re.I),
    "redis": re.compile(r"redis", re.I),
    "qrent": re.compile(r"qrent", re.I),
}


def capture(*args):
    try:
        return subprocess.check_output(args, stderr=subprocess.DEVNULL, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None


def matches(entries):
    return {
        target: sum(bool(backup_action.search(entry) and pattern.search(entry)) for entry in entries)
        for target, pattern in backup_targets.items()
    }


def scheduled_lines(content):
    return [line for line in content.splitlines() if re.match(r"^\s*(?:@\w+|[0-9*/,-]+)\s", line)]


def files(directory):
    try:
        return [path for path in directory.iterdir() if not path.is_symlink() and path.is_file()]
    except OSError:
        return []


user_cron = capture("crontab", "-l")
system_cron = []
system_cron_read = 0
for path in [Path("/etc/crontab"), *files(Path("/etc/cron.d"))]:
    try:
        system_cron.extend(scheduled_lines(path.read_text(errors="replace")))
        system_cron_read += 1
    except OSError:
        continue
periodic_scripts = [
    path.name
    for period in ("hourly", "daily", "weekly", "monthly")
    for path in files(Path("/etc/cron." + period))
    if re.fullmatch(r"[A-Za-z0-9_-]+", path.name)
]


def timers(*scope):
    listing = capture("systemctl", *scope, "list-timers", "--no-legend", "--no-pager")
    if listing is None:
        return None
    return matches([line for line in listing.splitlines() if "dpkg-db-backup.timer" not in line])


def utc_timestamp(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat(timespec="seconds")


def archives(directory, name_pattern):
    try:
        candidates = list(directory.iterdir())
    except FileNotFoundError:
        return {"present": False, "count": 0}
    except OSError:
        return {"present": None, "count": None}
    metadata = []
    for path in candidates:
        if not name_pattern.fullmatch(path.name):
            continue
        try:
            info = path.lstat()
            if stat.S_ISREG(info.st_mode):
                metadata.append(info)
        except OSError:
            continue
    result = {"present": True, "count": len(metadata), "total_bytes": sum(info.st_size for info in metadata)}
    if metadata:
        latest = max(metadata, key=lambda info: info.st_mtime)
        result.update(latest_mtime_utc=utc_timestamp(latest.st_mtime), latest_bytes=latest.st_size)
    return result


def daily_backups(directory):
    try:
        backups = sorted(
            entry for entry in directory.iterdir()
            if re.fullmatch(r"qrent-\d{8}T\d{12}Z", entry.name)
            and not entry.is_symlink() and entry.is_dir()
        )
        if not backups:
            return {"count": 0}
        latest = backups[-1]
        result = {"count": len(backups), "archive": latest.name}
        receipt_file = latest / "receipt.json"
        if receipt_file.is_symlink() or not receipt_file.is_file():
            return result
        receipt = json.loads(receipt_file.read_text())
        for key, filename in (("mysql", "mysql.sql.gz"), ("redis", "redis.rdb")):
            artifact = latest / filename
            digest = hashlib.sha256()
            if artifact.is_symlink() or not artifact.is_file():
                return result
            with artifact.open("rb") as stream:
                while chunk := stream.read(1024 * 1024):
                    digest.update(chunk)
            if digest.hexdigest() != receipt[key]["sha256"] or artifact.stat().st_size != receipt[key]["bytes"]:
                return result
        result["verified"] = receipt.get("status") == "verified"
        result["mysql_tables"] = int(receipt["mysql"]["tables"])
        return result
    except FileNotFoundError:
        return {"count": 0}
    except (OSError, ValueError, KeyError, TypeError):
        return {"verified": False}


persistence = None
rdb_file = None
if redis_container:
    info = capture("docker", "exec", redis_container, "redis-cli", "--raw", "INFO", "persistence")
    numeric = {
        "loading", "rdb_bgsave_in_progress", "rdb_last_save_time", "rdb_changes_since_last_save",
        "rdb_saves", "aof_enabled", "aof_rewrite_in_progress", "aof_current_size",
    }
    status = {"rdb_last_bgsave_status", "aof_last_bgrewrite_status", "aof_last_write_status"}
    if info:
        allowed = {}
        for line in info.splitlines():
            key, _, value = line.partition(":")
            if key in numeric and value.isdecimal():
                allowed[key] = int(value)
            elif key in status and value in {"ok", "err"}:
                allowed[key] = value
        persistence = allowed or None
    snapshot = capture("docker", "exec", redis_container, "stat", "-c", "%Y %s", "/data/dump.rdb")
    if snapshot and re.fullmatch(r"[0-9]+ [0-9]+\s*", snapshot):
        modified, size = map(int, snapshot.split())
        rdb_file = {"mtime_utc": utc_timestamp(modified), "bytes": size}

print("Backup metadata: " + json.dumps({
    "schedules": {
        "user_crontab": matches(scheduled_lines(user_cron)) if user_cron is not None else None,
        "system_crontabs": {"read": system_cron_read, "matching": matches(system_cron)},
        "periodic_script_names": matches(periodic_scripts),
        "system_timers": timers(),
        "user_timers": timers("--user"),
    },
    "archives": {
        "daily": daily_backups(root / ".deploy" / "backups" / "daily"),
        "mysql": archives(root.parent / "qrent-db-backup", re.compile(r"qrent_[\w-]+\.sql(?:\.gz)?")),
        "redis": archives(root / ".deploy" / "backups", re.compile(r"redis[-_][\w-]+\.(?:tar\.gz|rdb)")),
    },
    "redis_persistence": persistence,
    "live_redis_rdb": rdb_file,
}, sort_keys=True))
PY
  for path in / "$HOME" /var/log "$HOME/.cache" "$HOME/.nvm" "$qrent_root/.deploy"; do
    [[ -d "$path" ]] || continue
    du -x -h --max-depth=1 "$path" 2>/dev/null | sort -h || true
  done
  # Aggregate archived-journal sizes by age; never print journal contents.
  python3 - <<'PY'
import json, pathlib, time
now = time.time()
totals = {'archived_bytes': 0, 'archived_older_than_30_days_bytes': 0,
          'active_bytes': 0}
for path in pathlib.Path('/var/log/journal').glob('*/*.journal'):
    if path.is_symlink() or not path.is_file(): continue
    size = path.stat().st_blocks * 512
    if '@' in path.name:
        totals['archived_bytes'] += size
        if path.stat().st_mtime < now - 30*86400:
            totals['archived_older_than_30_days_bytes'] += size
    else:
        totals['active_bytes'] += size
print('Journal metadata: ' + json.dumps(totals))
PY
  du -x --inodes --max-depth=3 /run 2>/dev/null | sort -n | tail -20 || true
fi

if [[ "${1:-}" == preflight ]]; then
  python3 - "$qrent_root" "$qrent_docker_root" /run <<'PY'
import os,sys
for path in sys.argv[1:]:
    info=os.statvfs(path)
    free=info.f_bavail*info.f_frsize
    minimum=16*1024**2 if path=='/run' else max(2*1024**3,int(os.environ.get('QRENT_REQUIRED_DISK_BYTES','0')))
    if free<minimum or info.f_favail<4096:
        print('Insufficient deployment headroom; existing backend kept.',file=sys.stderr)
        sys.exit(70)
PY
fi
