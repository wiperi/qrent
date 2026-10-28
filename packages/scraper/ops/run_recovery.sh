#!/usr/bin/env bash
# Installed as /root/qrent-scraper/run_scraper.sh on the recovered deployment.
set -euo pipefail
umask 077

qrent_root="${QRENT_ROOT:-/root/qrent-scraper}"
qrent_release="${QRENT_RELEASE:-$qrent_root/releases/recovery-20261027}"
mkdir -p "$qrent_root/logs" "$qrent_root/output"
exec 9>"$qrent_root/.capture.lock"
if ! flock -n 9; then
    printf '%s\n' 'Another Qrent capture is running; skipped.' >&2
    exit 75
fi

cd "$qrent_release"
export SCRAPER_ENV_FILE="$qrent_release/.env"
qrent_day="$(date +%Y%m%d)"
qrent_log="$qrent_root/logs/recovery_$(date +%Y%m%d_%H%M%S).log"
timeout --signal=TERM --kill-after=30s 2h xvfb-run -a .venv/bin/python -u recovery_runner.py \
    --cities sydney melbourne --pages 1 --limit 100 --detail-limit 30 \
    --retries 1 --max-requests 5000 --proxy-bytes 30000000 \
    --score --score-limit 5 --db "$qrent_root/properties.db" \
    --output "$qrent_root/output/$qrent_day" "$@" 2>&1 | tee "$qrent_log"
