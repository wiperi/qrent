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

def command(*args):
    return subprocess.check_output(args, text=True).strip()


def cache_paths(home, mounts):
    paths = [home/'.npm/_cacache', home/'.local/share/pnpm/store', home/'.cache/pnpm',
             home/'.npm/_npx', home/'.nvm/.cache']
    return [p for p in paths if p.is_dir() and not p.is_symlink() and p.resolve() == p
            and not any(p == m or p in m.parents or m in p.parents for m in mounts)
            and (p != home/'.npm/_npx' or not process_uses(p))]


def process_uses(path, proc_root=Path('/proc')):
    """npx may contain executing tools: unknown process access also blocks removal."""
    if not proc_root.is_dir(): return True
    prefix = str(path).encode()
    try: processes = [p for p in proc_root.iterdir() if p.name.isdigit()]
    except OSError: return True
    if not processes: return True
    for proc in processes:
        try:
            fields = (proc/'stat').read_text().rpartition(')')[2].split()
            # Linux PF_KTHREAD: include/linux/sched.h. Kernel threads do not run npx tools.
            if int(fields[6]) & 0x00200000: continue
            tasks = [p for p in (proc/'task').iterdir() if p.name.isdigit()]
            if not tasks: return True
            for task in tasks:
                try:
                    task_fields = (task/'stat').read_text().rpartition(')')[2].split()
                    # A dead leader does not imply its other threads have exited.
                    if task_fields[0] == 'Z': continue
                    cmdline = (task/'cmdline').read_bytes()
                    if prefix in cmdline or prefix in (task/'maps').read_bytes() or prefix in (task/'environ').read_bytes(): return True
                    for link in [task/'cwd', task/'exe', *list((task/'fd').iterdir())]:
                        try: target = Path(os.readlink(link))
                        except FileNotFoundError:
                            if link.parent == task/'fd': continue  # This descriptor was closed.
                            raise
                        if target == path or path in target.parents: return True
                except (FileNotFoundError, ProcessLookupError):
                    if task.exists(): return True
            if {p.name for p in (proc/'task').iterdir() if p.name.isdigit()} != {p.name for p in tasks}: return True
        except (FileNotFoundError, ProcessLookupError):
            if proc.exists(): return True
        except (OSError, ValueError, IndexError): return True
    return False


def protected_mounts():
    result = []
    def visit(rows):
        for row in rows:
            target = Path(row['target']).resolve()
            if target != Path('/'): result.append(target)
            visit(row.get('children', []))
    visit(json.loads(command('findmnt', '--json', '--output', 'TARGET'))['filesystems'])
    ids = command('docker', 'ps', '-aq', '--no-trunc').splitlines()
    if ids:
        for row in command('docker', 'inspect', '--format', '{{json .Mounts}}', *ids).splitlines():
            result.extend(Path(m['Source']).resolve() for m in json.loads(row))
    return result


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


def main(action, min_gib=3):
    assert action in ('plan', 'apply')
    assert min_gib in range(2,9)
    min_disk = min_gib * 1024**3
    os.umask(0o077)
    home = Path.home().resolve(); root = home/'qrent'
    assert (root/'.env').is_file() and (root/'docker-compose.yml').is_file()
    before = containers()
    protected = {p: hashlib.sha256(p.read_bytes()).digest() for p in (root/'.env', root/'docker-compose.yml')}
    caches = cache_paths(home, protected_mounts())
    report = {'action': action, 'started_at': datetime.now(timezone.utc).isoformat(),
              'before': resources(root), 'caches': [], 'runtime_state_deleted': False,
              'images_or_volumes_deleted': False, 'containers_restarted': False,
              'required_system_free_bytes': min_disk}
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
                if resources(root)['system']['free_bytes'] >= min_disk: break
                # Recheck mount protection immediately before removing a named cache.
                assert path in cache_paths(home, protected_mounts())
                shutil.rmtree(path)
            if resources(root)['system']['free_bytes'] < min_disk:
                output = command('docker', 'builder', 'prune', '-f', '--filter', 'until=168h')
                report['old_build_cache_result'] = output.splitlines()[-1:] if output else []
            report['after'] = resources(root)
            report['existing_container_identity_preserved'] = containers() == before
            report['environment_and_compose_preserved'] = all(hashlib.sha256(p.read_bytes()).digest() == h
                for p,h in protected.items())
            assert report['existing_container_identity_preserved']
            assert report['environment_and_compose_preserved']
            assert report['after']['system']['free_bytes'] >= min_disk, 'More host capacity is required; original services kept'
            assert report['after']['runtime']['free_bytes'] >= 16*1024**2
            assert report['after']['runtime']['free_inodes'] >= 4096
            report['status'] = 'verified'
        finally:
            report.setdefault('status', 'incomplete_original_services_kept')
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            path = root/'.deploy/receipts'/('capacity-'+stamp+'.json')
            path.write_text(json.dumps(report, indent=2))
            print(json.dumps(report))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'plan', int(sys.argv[2]) if len(sys.argv) > 2 else 3)
