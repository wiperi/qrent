"""Repair only a stopped/exited existing Redis process; preserve its container and data."""
from datetime import datetime, timezone
import fcntl
import gzip
import hashlib
import json
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tarfile
import time


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def container_rows():
    ids=command('docker','ps','-q','--no-trunc').splitlines()
    if len(ids)<3: raise RuntimeError('Existing production containers are required')
    template='[{{json .Id}},{{json .Image}},{{.State.Pid}},{{json .State.StartedAt}},{{json .Mounts}}]'
    rows=[json.loads(line) for line in command('docker','inspect','--format',template,*ids).splitlines()]
    for row in rows: row[4].sort(key=lambda m:json.dumps(m,sort_keys=True))
    return sorted(rows,key=lambda row:row[0])


def redis_state(proc_root=Path('/proc')):
    template='[{{json .Id}},{{json .Config.Image}},{{.State.Pid}},{{json .State.Health.Status}},{{json .Mounts}}]'
    identity,image,pid,health,mounts=json.loads(command('docker','inspect','--format',template,'qrent-redis-1'))
    if image!='redis:7.4.2-alpine': raise RuntimeError('Unexpected account-store image')
    try:
        status=(proc_root/str(pid)/'status').read_text()
        state=next(line.split()[1] for line in status.splitlines() if line.startswith('State:'))
    except (OSError,StopIteration): state='unknown'
    data=[m for m in mounts if m.get('Destination')=='/data' and m.get('Type')=='volume']
    if len(data)!=1: raise RuntimeError('The existing Redis data volume is required')
    source=Path(data[0]['Source'])
    if (not source.is_dir() or source.is_symlink() or source.resolve()!=source
            or command('docker','volume','inspect','--format','{{.Mountpoint}}',data[0]['Name'])!=str(source)):
        raise RuntimeError('Unexpected account-store volume path')
    return {'id':identity,'pid':pid,'process_state':state,'health':health,'data_source':str(source)}


def eligible(state):
    return state['health']=='unhealthy' and state['process_state'] in ('T','Z','X')


def preserve_rows(before,after,identity):
    def normalized(rows):
        return [[r[0],r[1],None if r[0]==identity else r[2],
                 None if r[0]==identity else r[3],r[4]] for r in rows]
    return normalized(before)==normalized(after)


def repair_process(state):
    if not eligible(state): raise RuntimeError('Only a confirmed stopped/exited Redis process is eligible')
    args=(['docker','kill','--signal','CONT',state['id']] if state['process_state']=='T'
          else ['docker','container','restart','--time','10',state['id']])
    try:
        result=subprocess.run(args,capture_output=True,text=True,timeout=60)
    except subprocess.TimeoutExpired:
        raise RuntimeError('Redis repair timed out; no automatic retry') from None
    if result.returncode: raise RuntimeError('Redis repair did not complete; original data volume retained')


def local_ping(identity):
    try: return command('docker','exec',identity,'timeout','5','redis-cli','--raw','PING')=='PONG'
    except subprocess.CalledProcessError: return False


def volume_signature(source):
    files={}
    for path in source.rglob('*'):
        if path.is_symlink() or not (path.is_dir() or path.is_file()):
            raise RuntimeError('Volume links or special files require separate inspection')
        if path.is_file():
            info=path.stat()
            files[str(path.relative_to(source))]=(info.st_size,info.st_mtime_ns,info.st_ctime_ns,info.st_ino)
    return files


def main(action='plan',root=None,proc_root=Path('/proc')):
    if action not in ('plan','apply'): raise ValueError('Invalid account-store recovery action')
    os.umask(0o077)
    root=root or Path.home()/'qrent'
    protected={p:hashlib.sha256(p.read_bytes()).digest() for p in (root/'.env',root/'docker-compose.yml')}
    before=container_rows(); state=redis_state(proc_root)
    report={'action':action,'status':'planned','candidate':state,'eligible':eligible(state),
            'database_schema_changed':False,'data_deleted':False,'other_containers_restarted':False}
    if action=='plan': print(json.dumps(report)); return report
    if not eligible(state): raise RuntimeError('Redis process does not meet the bounded repair condition')
    (root/'.deploy/receipts').mkdir(parents=True,exist_ok=True)
    with (root/'.deploy/backend.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if redis_state(proc_root)!=state: raise RuntimeError('Account-store state changed; inspect again')
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        receipt=root/'.deploy/receipts'/('account-store-'+stamp+'.json')
        try:
            source=Path(state['data_source'])
            signature=volume_signature(source)
            size=sum(info[0] for info in signature.values())
            if size>256*1024**2 or shutil.disk_usage(root).free<2*size+512*1024**2:
                raise RuntimeError('Insufficient headroom for a private Redis-volume backup')
            backup=root/'.deploy/backups'/('redis-before-repair-'+stamp+'.tar.gz')
            backup.parent.mkdir(parents=True,exist_ok=True)
            with tarfile.open(backup,'w:gz') as archive: archive.add(source,arcname='redis-data')
            with gzip.open(backup,'rb') as archive:
                while archive.read(1024**2): pass  # Validate gzip CRC before changing process state.
            if volume_signature(source)!=signature:
                raise RuntimeError('Redis volume changed while backing up; no repair attempted')
            digest=hashlib.sha256()
            with backup.open('rb') as stream:
                while chunk:=stream.read(1024**2): digest.update(chunk)
            if redis_state(proc_root)!=state:
                raise RuntimeError('Account-store state changed during backup; no repair attempted')
            report.update(backup_path=str(backup),backup_sha256=digest.hexdigest(),
                          status='repair_attempt_started')
            receipt.write_text(json.dumps(report,indent=2))
            repair_process(state)  # Exactly one scoped signal/restart; never recreate the container.
            for attempt in range(6):
                if local_ping(state['id']): break
                time.sleep(1)
            else: raise RuntimeError('Redis did not respond after one repair attempt; no automatic retry')
            report['container_image_and_mounts_preserved']=preserve_rows(before,container_rows(),state['id'])
            report['environment_and_compose_preserved']=all(hashlib.sha256(p.read_bytes()).digest()==h for p,h in protected.items())
            if not report['container_image_and_mounts_preserved'] or not report['environment_and_compose_preserved']:
                raise RuntimeError('Recovery identity protection requires attention')
            report.update(status='verified',local_ping=True,container_id_preserved=True)
        except Exception as error:
            report.update(status='requires_attention',error=type(error).__name__)
            raise
        finally:
            report['finished_at']=datetime.now(timezone.utc).isoformat()
            receipt.write_text(json.dumps(report,indent=2)); print(json.dumps(report))
    return report


if __name__=='__main__': main(sys.argv[1] if len(sys.argv)>1 else 'plan')
