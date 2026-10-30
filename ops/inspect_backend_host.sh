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
  for path in / "$HOME" /var/log; do
    du -x -h --max-depth=1 "$path" 2>/dev/null | sort -h || true
  done
  du -x --inodes --max-depth=3 /run 2>/dev/null | sort -n | tail -20 || true
fi

if [[ "${1:-}" == preflight ]]; then
  python3 - "$qrent_root" "$qrent_docker_root" /run <<'PY'
import os,sys
for path in sys.argv[1:]:
    info=os.statvfs(path)
    free=info.f_bavail*info.f_frsize
    minimum=16*1024**2 if path=='/run' else max(3*1024**3,int(os.environ.get('QRENT_REQUIRED_DISK_BYTES','0')))
    if free<minimum or info.f_favail<4096:
        print('Insufficient deployment headroom; existing backend kept.',file=sys.stderr)
        sys.exit(70)
PY
fi
