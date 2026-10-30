#!/usr/bin/env bash
# stdin is the CI image, never a script. Clean this upload on every exit.
set -euo pipefail
umask 077
release=${1:?Release identity required}
expected=${2:?Image SHA256 required}
[[ "$release" =~ ^[a-f0-9]{40}$ && "$expected" =~ ^[a-f0-9]{64}$ ]] || exit 64
root=${QRENT_DEPLOY_ROOT:-$HOME/qrent}
test -s "$root/.env"
test -s "$root/docker-compose.yml"
image="$root/.deploy/uploads/backend-image-$release.tar.gz"
mkdir -p "$root/.deploy/uploads"
trap 'rm -f -- "$image.part" "$image"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
cat > "$image.part"
test -s "$image.part"
printf '%s  %s\n' "$expected" "$image.part" | sha256sum -c -
mv -- "$image.part" "$image"
QRENT_DEPLOY_ROOT="$root" QRENT_RELEASE_SHA="$release" QRENT_BACKEND_IMAGE_ARCHIVE="$image" \
  bash "$root/.deploy/releases/$release/ops/deploy_backend.sh"
cat "$root/.deploy/receipts/$release.json"
