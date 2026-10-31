"""Inspect/wake the verified runtime reaper for a zombie Redis init task."""
from datetime import datetime,timezone
import fcntl
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import signal
import subprocess
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


def orphan_plan(root,proc_root=Path('/proc'),data_root=Path('/var/lib/docker/containers')):
    """Prove a stopped Redis owns one shim and its only child is a zombie."""
    receipts=sorted((root/'.deploy/receipts').glob('account-store-*.json'),reverse=True)
    if not receipts:raise RuntimeError('A private store backup is required')
    previous=json.loads(receipts[0].read_text());identity=previous['candidate']['id']
    if not re.fullmatch('[a-f0-9]{64}',identity):raise RuntimeError('Invalid existing store identity')
    backup=Path(previous.get('backup_path',''))
    if backup.is_symlink() or root/'.deploy/backups' not in backup.resolve().parents:
        raise RuntimeError('Unexpected private backup path')
    if hashlib.sha256(backup.read_bytes()).hexdigest()!=previous.get('backup_sha256'):
        raise RuntimeError('Store backup checksum differs')
    guard=previous.get('public_port_guard',{})
    if guard.get('supervisor')!='qrent-account-store.service' or guard.get('persistent') is not True:
        raise RuntimeError('The existing guarded Redis supervisor is required')
    config=json.loads((root/'.deploy/redis-port-guard.json').read_text())
    if config.get('container')!=identity:raise RuntimeError('Redis port guard identity differs')
    for row in config.get('rules',[]):
        if not isinstance(row,list) or len(row) not in (14,16) or row[0] not in ('iptables','ip6tables'):
            raise RuntimeError('Unexpected port-guard check arguments')
        address=ipaddress.ip_address(row[5] if len(row)==14 else row[7])
        if row[0]!=('iptables' if address.version==4 else 'ip6tables'):
            raise RuntimeError('Port-guard address family differs')
        expected=([row[0],'INPUT','-p','tcp','-d',str(address),'--dport','6379'] if len(row)==14 else
            [row[0],'DOCKER-USER','-p','tcp','-m','conntrack','--ctorigdst',str(address),'--ctorigdstport','6379'])
        expected+=['-m','comment','--comment','qrent-redis-private','-j','DROP']
        if row!=expected:raise RuntimeError('Unexpected port-guard check arguments')
        subprocess.run([row[0],'-w','5','-C',*row[1:]],check=True,capture_output=True,timeout=10)
    if not config.get('rules'):raise RuntimeError('Verified Redis port-guard rules are required')
    records={}
    for path in data_root.glob('*/config.v2.json'):
        value=json.loads(path.read_text());records[value['ID']]=value
    row=records.get(identity,{})
    host=json.loads((data_root/identity/'hostconfig.json').read_text())
    if (row.get('Name')!='/qrent-redis-1' or row.get('State',{}).get('Running') is not False
            or row.get('State',{}).get('Pid')!=0 or host.get('RestartPolicy',{}).get('Name')!='no'):
        raise RuntimeError('Only the already stopped and guarded original Redis qualifies')
    ports=host.get('PortBindings',{})
    if (ports!=previous['candidate'].get('ports') or set(ports)!={'6379/tcp'}
            or any(binding.get('HostPort')!='6379' for binding in ports['6379/tcp'])):
        raise RuntimeError('Published Redis ports changed since the guarded backup')
    raw=subprocess.run(['ctr','--address','/run/containerd/containerd.sock','--namespace','moby','tasks','list'],capture_output=True,text=True,timeout=10,check=True).stdout
    tasks={}
    for line in raw.splitlines():
        parts=line.split()
        if parts and parts[0]=='TASK':continue
        if len(parts)!=3 or not re.fullmatch('[a-f0-9]{64}',parts[0]) or not parts[1].isdigit():
            raise RuntimeError('Unrecognized runtime task inventory')
        if parts[0] in tasks:raise RuntimeError('Duplicate runtime identity')
        tasks[parts[0]]={'pid':int(parts[1]),'state':parts[2]}
    expected={key for key,value in records.items() if value.get('State',{}).get('Running')}|{identity}
    if set(tasks)!=expected:raise RuntimeError('Runtime task ownership is incomplete')
    business={};parents={};names=set()
    for key,task in tasks.items():
        init=process(task['pid'],proc_root);parent=process(init['parent'],proc_root)
        parent_root=proc_root/str(parent['pid']);args=(parent_root/'cmdline').read_bytes().split(b'\0')
        executable=os.readlink(parent_root/'exe').removesuffix(' (deleted)')
        if (executable not in ('/usr/bin/containerd-shim-runc-v2','/usr/local/bin/containerd-shim-runc-v2')
                or not any(args[i] in (b'-id',b'--id') and args[i+1].decode()==key for i in range(len(args)-1))
                or not any(args[i] in (b'-namespace',b'--namespace') and args[i+1]==b'moby' for i in range(len(args)-1))):
            raise RuntimeError('Runtime owner identity differs')
        parents[key]=parent
        if key==identity:
            if init['state']!='Z' or parent['state'] not in ('S','R'):
                raise RuntimeError('Only an orphaned zombie init qualifies')
            zombie=init
        else:
            if init['state'] not in ('S','R','D','I') or init['pid']!=records[key]['State']['Pid'] or task['state']!='RUNNING':
                raise RuntimeError('A business process is not verified running')
            names.add(records[key].get('Name'))
            business[key]={'init':init,'shim':parent,'image':records[key]['Image'],
                'mounts_sha256':hashlib.sha256(json.dumps(records[key].get('MountPoints',{}),sort_keys=True).encode()).hexdigest()}
    if not {'/qrent-backend-1','/qrent-db-1','/n8n-n8n-1'}.issubset(names):
        raise RuntimeError('Existing business containers are required')
    selected=parents[identity]
    if any(value['pid']==selected['pid'] for key,value in parents.items() if key!=identity):
        raise RuntimeError('A shared shim cannot be terminated')
    children=set()
    for thread in (proc_root/str(selected['pid'])/'task').iterdir():
        children.update(int(pid) for pid in (thread/'children').read_text().split())
    if children!={zombie['pid']}:raise RuntimeError('The Redis shim has other or uncertain children')
    marker=root/'.deploy/receipts'/('account-orphan-'+str(selected['pid'])+'-'+selected['started']+'.json')
    if marker.exists():raise RuntimeError('This orphan already has an attempt receipt; inspect rather than repeat')
    return {'original_store_id':identity,'init':zombie,'shim':selected,'backup_verified':True,
        'backup_sha256':previous['backup_sha256'],'signal':'TERM','business_processes':business,
        'one_task_per_shim_verified':True,'only_child_is_zombie':True,
        'container_processes_signaled':False,'running_tasks_stopped':False,'data_deleted':False}


def main(action='plan',root=None,proc_root=Path('/proc')):
    if action not in ('plan','apply','orphan-plan','orphan-apply'): raise ValueError('Invalid runtime recovery action')
    os.umask(0o077);root=root or Path.home()/'qrent'
    orphan=action.startswith('orphan-');planner=orphan_plan if orphan else plan
    result=planner(root,proc_root);report={'action':action,'status':'planned',**result}
    if action.endswith('plan'):print(json.dumps(report));return report
    # The Docker API may hold backend.lock while waiting on this stale shim.
    # A separate lock serializes this kernel-only liveness action, never a release.
    with (root/'.deploy/account-runtime.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if not hasattr(os,'pidfd_open') or not hasattr(signal,'pidfd_send_signal'):
            raise RuntimeError('Race-safe runtime signaling is unavailable; no signal sent')
        descriptor=os.pidfd_open(result['shim']['pid'])
        try:
            if planner(root,proc_root)!=result: raise RuntimeError('Redis runtime changed; no signal sent')
            stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            receipt=root/'.deploy/receipts'/('account-orphan-'+str(result['shim']['pid'])+'-'+result['shim']['started']+'.json' if orphan else 'account-runtime-'+stamp+'.json')
            report['status']='signal_attempt_started';receipt.write_text(json.dumps(report,indent=2))
            selected_signal={'CONT':signal.SIGCONT,'CHLD':signal.SIGCHLD,'TERM':signal.SIGTERM}[result['signal']]
            signal.pidfd_send_signal(descriptor,selected_signal)
            report.update(status='signal_sent_requires_service_verification',finished_at=datetime.now(timezone.utc).isoformat())
            receipt.write_text(json.dumps(report,indent=2));print(json.dumps(report));return report
        finally: os.close(descriptor)


if __name__=='__main__':main(sys.argv[1] if len(sys.argv)>1 else 'plan')
