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
    for line in (root/'net'/version).read_text().splitlines()[1:]:
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
