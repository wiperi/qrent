"""Inspect/wake the verified runtime reaper for a zombie Redis init task."""
from datetime import datetime,timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import sys


def process(pid,proc_root=Path('/proc')):
    root=proc_root/str(pid)
    fields=(root/'stat').read_text().rpartition(')')[2].split()
    return {'pid':int(pid),'state':fields[0],'parent':int(fields[1]),'started':fields[19]}


def plan(root,proc_root=Path('/proc')):
    receipts=sorted((root/'.deploy/receipts').glob('account-store-*.json'),reverse=True)
    if not receipts: raise RuntimeError('A verified pre-repair volume backup is required')
    previous=json.loads(receipts[0].read_text());candidate=previous['candidate'];identity=candidate['id']
    if not re.fullmatch(r'[a-f0-9]{64}',identity): raise RuntimeError('Invalid existing store identity')
    backup=Path(previous.get('backup_path',''))
    if backup.is_symlink() or root/'.deploy/backups' not in backup.resolve().parents:
        raise RuntimeError('Private Redis backup path does not match')
    digest=hashlib.sha256()
    with backup.open('rb') as stream:
        while chunk:=stream.read(1024**2): digest.update(chunk)
    if digest.hexdigest()!=previous.get('backup_sha256'): raise RuntimeError('Redis backup checksum differs')
    init=process(candidate['pid'],proc_root)
    if init['state']!='Z': raise RuntimeError('Only an already exited zombie init may qualify')
    parent=process(init['parent'],proc_root)
    parent_root=proc_root/str(parent['pid'])
    executable=os.readlink(parent_root/'exe').removesuffix(' (deleted)')
    args=(parent_root/'cmdline').read_bytes().split(b'\0')
    if (executable not in ('/usr/bin/containerd-shim-runc-v2','/usr/local/bin/containerd-shim-runc-v2')
            or not any(args[i] in (b'-id',b'--id') and args[i+1].decode()==identity for i in range(len(args)-1))
            or not any(args[i] in (b'-namespace',b'--namespace') and args[i+1]==b'moby' for i in range(len(args)-1))):
        raise RuntimeError('The exact Redis-owned shim could not be verified')
    if parent['state'] not in ('S','R','T'): raise RuntimeError('Unexpected shim state')
    return {'original_store_id':identity,'init':init,'shim':parent,'backup_verified':True,
            'signal':'CONT' if parent['state']=='T' else 'CHLD',
            'container_processes_signaled':False,'running_tasks_stopped':False,'data_deleted':False}


def main(action='plan',root=None,proc_root=Path('/proc')):
    if action not in ('plan','apply'): raise ValueError('Invalid runtime recovery action')
    os.umask(0o077);root=root or Path.home()/'qrent'
    result=plan(root,proc_root);report={'action':action,'status':'planned',**result}
    if action=='plan':print(json.dumps(report));return report
    # The Docker API may hold backend.lock while waiting on this stale shim.
    # A separate lock serializes this kernel-only liveness action, never a release.
    with (root/'.deploy/account-runtime.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if not hasattr(os,'pidfd_open') or not hasattr(signal,'pidfd_send_signal'):
            raise RuntimeError('Race-safe runtime signaling is unavailable; no signal sent')
        descriptor=os.pidfd_open(result['shim']['pid'])
        try:
            if plan(root,proc_root)!=result: raise RuntimeError('Redis runtime changed; no signal sent')
            stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            receipt=root/'.deploy/receipts'/('account-runtime-'+stamp+'.json')
            report['status']='signal_attempt_started';receipt.write_text(json.dumps(report,indent=2))
            signal.pidfd_send_signal(descriptor,signal.SIGCONT if result['signal']=='CONT' else signal.SIGCHLD)
            report.update(status='signal_sent_requires_service_verification',finished_at=datetime.now(timezone.utc).isoformat())
            receipt.write_text(json.dumps(report,indent=2));print(json.dumps(report));return report
        finally: os.close(descriptor)


if __name__=='__main__':main(sys.argv[1] if len(sys.argv)>1 else 'plan')
