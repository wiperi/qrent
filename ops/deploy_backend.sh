#!/usr/bin/env bash
# Existing Compose project and .env stay in place; only backend is replaced.
set -euo pipefail
umask 077
release=${QRENT_RELEASE_SHA:?QRENT_RELEASE_SHA is required}
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || exit 64
root=${QRENT_DEPLOY_ROOT:-$HOME/qrent}
source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
[[ -s "$root/.env" && -s "$root/docker-compose.yml" ]] || {
    echo 'Existing server environment and Compose configuration are required' >&2
    exit 65
}
command -v python3 >/dev/null
mkdir -p "$root/.deploy/receipts"
exec 9>"$root/.deploy/backend.lock"
flock -n 9 || exit 75

compose=(docker compose --project-directory "$root" -f "$root/docker-compose.yml")
"${compose[@]}" config --quiet
db=$("${compose[@]}" ps -q db)
redis=$("${compose[@]}" ps -q redis)
backend=$("${compose[@]}" ps -q backend)
[[ -n "$db" && -n "$redis" && -n "$backend" ]] || exit 66
for container in "$db" "$redis" "$backend"; do
    [[ $(docker inspect --format '{{.State.Running}}' "$container") == true ]] || exit 66
done
old_image=$(docker inspect --format '{{.Image}}' "$backend")
db_mounts=$(docker inspect --format '{{json .Mounts}}' "$db")
file_hash() { python3 -c 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"; }
env_hash=$(file_hash "$root/.env")
compose_hash=$(file_hash "$root/docker-compose.yml")
image="qrent-backend:release-$release"
rollback_image="qrent-backend:rollback-$release"
candidate="$root/.deploy/candidate-$release.yml"
rollback="$root/.deploy/rollback-$release.yml"
switched=0

receipt() {
    python3 - "$root/.deploy/receipts/$release.json" "$1" "$release" "$old_image" "$image" "$db" "$redis" <<'PY'
from datetime import datetime, timezone
import json, pathlib, sys
path,status,release,old,new,db,redis=sys.argv[1:]
data={'status':status,'release':release,'previous_backend_image':old,'new_backend_image':new,
      'database_container':db,'redis_container':redis,'schema_commands_allowed':False,
      'written_at':datetime.now(timezone.utc).isoformat()}
p=pathlib.Path(path);temporary=p.with_suffix('.tmp');temporary.write_text(json.dumps(data,indent=2));temporary.replace(p)
PY
}

unchanged_dependencies() {
    [[ $("${compose[@]}" ps -q db) == "$db" && $("${compose[@]}" ps -q redis) == "$redis" ]] &&
    [[ $(docker inspect --format '{{json .Mounts}}' "$db") == "$db_mounts" ]] &&
    [[ $(file_hash "$root/.env") == "$env_hash" && $(file_hash "$root/docker-compose.yml") == "$compose_hash" ]]
}

fail() {
    code=${1:-$?}
    trap - ERR INT TERM HUP
    if [[ "$switched" == 1 ]]; then
        # Old images used a schema-push startup. Bypass it on rollback too.
        cat > "$rollback" <<YAML
services:
  backend:
    image: $rollback_image
    command: ["sh", "-c", "pnpm --filter @qrent/shared db:generate && exec pnpm --filter @qrent/backend start"]
YAML
        if "${compose[@]}" -f "$rollback" up -d --no-deps --no-build backend; then
            cp "$rollback" "$root/.deploy/backend-current.yml"
            restored=$("${compose[@]}" ps -q backend)
            rollback_healthy=0
            for attempt in {1..5}; do
                if docker exec -i -e QRENT_VERIFY_MODE=rollback "$restored" node --input-type=module \
                    < "$source_dir/ops/verify_backend.mjs"; then
                    rollback_healthy=1
                    break
                fi
                sleep "${QRENT_HEALTH_RETRY_SECONDS:-3}"
            done
            if [[ "$rollback_healthy" == 1 ]]; then receipt failed_backend_restored
            else receipt failed_rollback_requires_attention; fi
        else
            receipt failed_rollback_requires_attention
        fi
    else
        receipt failed_original_backend_kept
    fi
    exit "$code"
}
trap fail ERR
trap 'fail 130' INT
trap 'fail 143' TERM
trap 'fail 129' HUP

docker tag "$old_image" "$rollback_image"
# Check that the old image can regenerate its client without any DB/network.
docker run --rm --network none --entrypoint sh \
    -e DATABASE_URL=mysql://build:build@127.0.0.1:3306/qrent "$rollback_image" \
    -c 'pnpm --filter @qrent/shared db:generate'
docker build -t "$image" -f "$source_dir/packages/backend/Dockerfile" "$source_dir"
docker run --rm --network none --entrypoint node \
    -e DATABASE_URL=mysql://build:build@127.0.0.1:3306/qrent "$image" \
    -e "require(require.resolve('@prisma/client', {paths:['/app/packages/shared']}))"
cat > "$candidate" <<YAML
services:
  backend:
    image: $image
YAML
switched=1
"${compose[@]}" -f "$candidate" up -d --no-deps --no-build backend
backend=$("${compose[@]}" ps -q backend)
healthy=0
for attempt in {1..10}; do
    if docker exec -i "$backend" node --input-type=module < "$source_dir/ops/verify_backend.mjs"; then
        healthy=1
        break
    fi
    sleep "${QRENT_HEALTH_RETRY_SECONDS:-3}"
done
if [[ "$healthy" != 1 ]]; then fail 1; fi
if ! unchanged_dependencies; then fail 1; fi
cp "$candidate" "$root/.deploy/backend-current.yml"
receipt deployed
trap - ERR INT TERM HUP
echo "Backend release $release verified; database, Redis and environment preserved"
