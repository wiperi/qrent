#!/usr/bin/env bash
# Credentials remain in the GitHub runner. Pin the already verified ED25519 key.
set +x
set -euo pipefail
umask 077

: "${DEPLOY_SERVER_HOST:?Missing deployment host}"
: "${DEPLOY_SERVER_USERNAME:?Missing deployment user}"
: "${DEPLOY_SERVER_PASSWORD:?Missing deployment password}"
: "${GITHUB_SHA:?Missing release identity}"
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 64
[[ "$DEPLOY_SERVER_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.:-]*$ ]] || exit 64
[[ "$DEPLOY_SERVER_USERNAME" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || exit 64
archive="backend-$GITHUB_SHA.tgz"
test -s "$archive"

ssh_tmp=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/qrent-ssh.XXXXXXXX")
trap 'rm -rf -- "$ssh_tmp"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

# SHA256:yFb8C5MaAlip/092pxEXeqWMWRWouUg6mXMMmOeFako
# The Go SSH action may choose a different host-key algorithm for this server.
cat > "$ssh_tmp/known_hosts" <<'HOST_KEY'
qrent-deploy-server ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG39JekYz+JD8BWWx5xWC2fKwG+4RrD6EdSBWK6zFdjb
HOST_KEY
cat > "$ssh_tmp/askpass" <<'ASKPASS'
#!/bin/sh
printf '%s\n' "$DEPLOY_SERVER_PASSWORD"
ASKPASS
chmod 700 "$ssh_tmp/askpass"
export SSH_ASKPASS="$ssh_tmp/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=qrent-ci

ssh_options=(
  -T -F /dev/null
  -o HostKeyAlgorithms=ssh-ed25519
  -o HostKeyAlias=qrent-deploy-server
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$ssh_tmp/known_hosts"
  -o GlobalKnownHostsFile=/dev/null
  -o UpdateHostKeys=no
  -o CheckHostIP=no
  -o PreferredAuthentications=password,keyboard-interactive
  -o PubkeyAuthentication=no
  -o NumberOfPasswordPrompts=1
  -o ForwardAgent=no
  -o ClearAllForwardings=yes
  -o ConnectTimeout=20
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
  -o LogLevel=ERROR
  -l "$DEPLOY_SERVER_USERNAME"
)

printf 'Uploading tracked release sources with the pinned ED25519 host key.\n'
ssh "${ssh_options[@]}" "$DEPLOY_SERVER_HOST" \
  "umask 077; set -eu; mkdir -p \"\$HOME/qrent/.deploy/uploads\"; cat > \"\$HOME/qrent/.deploy/uploads/$archive.part\"; mv \"\$HOME/qrent/.deploy/uploads/$archive.part\" \"\$HOME/qrent/.deploy/uploads/$archive\"" \
  < "$archive"

printf 'Building and replacing only the backend in the existing Compose project.\n'
ssh "${ssh_options[@]}" "$DEPLOY_SERVER_HOST" bash -s -- "$GITHUB_SHA" <<'REMOTE'
set -eu
umask 077
qrent_root="$HOME/qrent"
qrent_sha="$1"
qrent_source="$qrent_root/.deploy/releases/$qrent_sha"
test -s "$qrent_root/.env"
test -s "$qrent_root/docker-compose.yml"
printf 'Read-only deployment host capacity check.\n'
qrent_docker_root=$(docker info --format '{{.DockerRootDir}}')
df -h "$qrent_root" "$qrent_docker_root" /var/run
df -i "$qrent_root" "$qrent_docker_root" /var/run
docker system df
docker ps -a --format 'table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}'
du -x -h --max-depth=1 "$qrent_docker_root" /var/log 2>/dev/null || true
mkdir -p "$qrent_source"
tar -xzf "$qrent_root/.deploy/uploads/backend-$qrent_sha.tgz" -C "$qrent_source"
QRENT_DEPLOY_ROOT="$qrent_root" QRENT_RELEASE_SHA="$qrent_sha" \
  bash "$qrent_source/ops/deploy_backend.sh"
cat "$qrent_root/.deploy/receipts/$qrent_sha.json"
REMOTE
