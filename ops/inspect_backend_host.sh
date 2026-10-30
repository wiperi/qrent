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
  docker inspect --format '{{.Name}} {{json .Mounts}}' $(docker ps -q)
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
