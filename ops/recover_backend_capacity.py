"""Recover rebuildable host caches and tmpfs headroom; never remove runtime state."""
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

MIN_DISK = 3 * 1024**3


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def cache_paths(home, mounts):
    paths = [home/'.npm/_cacache', home/'.local/share/pnpm/store', home/'.cache/pnpm']
    return [p for p in paths if p.is_dir() and not p.is_symlink() and p.resolve() == p
            and not any(p == m or p in m.parents or m in p.parents for m in mounts)]


def resize_options(original):
    keep = [x for x in original.split(',') if not x.startswith(('size=', 'nr_inodes='))]
    return ','.join(['remount', *keep, 'size=192M', 'nr_inodes=262144'])


def resources(root):
    result = {}
    for label, path in [('system', root), ('runtime', Path('/run'))]:
        data = os.statvfs(path)
        result[label] = {'free_bytes': data.f_bavail*data.f_frsize,
                         'total_bytes': data.f_blocks*data.f_frsize, 'free_inodes': data.f_favail}
    return result


def containers():
    ids = command('docker', 'ps', '-q', '--no-trunc').splitlines()
    if len(ids) < 3:
        raise RuntimeError('Expected existing production containers; no maintenance performed')
    template = '[{{json .Id}},{{json .Image}},{{.State.Pid}},{{json .State.StartedAt}},{{json .Mounts}}]'
    return [json.loads(row) for row in command('docker', 'inspect', '--format', template, *ids).splitlines()]


def main(action):
    assert action in ('plan', 'apply')
    os.umask(0o077)
    home = Path.home().resolve(); root = home/'qrent'
    assert (root/'.env').is_file() and (root/'docker-compose.yml').is_file()
    before = containers()
    protected = {p: hashlib.sha256(p.read_bytes()).digest() for p in (root/'.env', root/'docker-compose.yml')}
    mounts = [Path(m['Source']).resolve() for row in before for m in row[4]]
    caches = cache_paths(home, mounts)
    report = {'action': action, 'started_at': datetime.now(timezone.utc).isoformat(),
              'before': resources(root), 'caches': [], 'runtime_state_deleted': False,
              'images_or_volumes_deleted': False, 'containers_restarted': False}
    for path in caches:
        size = int(command('du', '-sx', '-B1', str(path)).split()[0])
        report['caches'].append({'path': str(path), 'bytes': size})
    if action == 'plan':
        print(json.dumps(report)); return
    (root/'.deploy/receipts').mkdir(parents=True, exist_ok=True)
    with (root/'.deploy/backend.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            runtime = report['before']['runtime']
            if runtime['free_bytes'] < 16*1024**2 or runtime['free_inodes'] < 4096:
                assert command('findmnt', '-n', '-o', 'TARGET', '-T', '/run') == '/run'
                assert command('findmnt', '-n', '-o', 'FSTYPE', '-T', '/run') == 'tmpfs'
                assert runtime['total_bytes'] < 192*1024**2
                options = command('findmnt', '-n', '-o', 'OPTIONS', '-T', '/run')
                report['previous_run_mount_options'] = options
                command('mount', '-o', resize_options(options), '/run')
                report['runtime_limit_temporarily_raised'] = True
            for path in caches:
                if resources(root)['system']['free_bytes'] >= MIN_DISK: break
                # Recheck mount protection immediately before removing a named cache.
                now_mounts = [Path(m['Source']).resolve() for row in containers() for m in row[4]]
                assert path in cache_paths(home, now_mounts)
                shutil.rmtree(path)
            if resources(root)['system']['free_bytes'] < MIN_DISK:
                output = command('docker', 'builder', 'prune', '-f', '--filter', 'until=168h')
                report['old_build_cache_result'] = output.splitlines()[-1:] if output else []
            report['after'] = resources(root)
            report['existing_container_identity_preserved'] = containers() == before
            report['environment_and_compose_preserved'] = all(hashlib.sha256(p.read_bytes()).digest() == h
                for p,h in protected.items())
            assert report['existing_container_identity_preserved']
            assert report['environment_and_compose_preserved']
            assert report['after']['system']['free_bytes'] >= MIN_DISK, 'More host capacity is required; original services kept'
            assert report['after']['runtime']['free_bytes'] >= 16*1024**2
            assert report['after']['runtime']['free_inodes'] >= 4096
            report['status'] = 'verified'
        finally:
            report.setdefault('status', 'incomplete_original_services_kept')
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            path = root/'.deploy/receipts'/('capacity-'+stamp+'.json')
            path.write_text(json.dumps(report, indent=2))
            print(json.dumps(report))


if __name__ == '__main__': main(sys.argv[1] if len(sys.argv) > 1 else 'plan')
