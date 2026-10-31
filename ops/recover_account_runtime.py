"""Inspect Redis liveness; separately recover a fully proven orphaned shim."""
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
import time


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


def verify_orphan_guard(root,identity,ports,row):
    config=json.loads((root/'.deploy/redis-port-guard.json').read_text())
    if config.get('container')!=identity:raise RuntimeError('Redis port guard identity differs')
    interfaces=json.loads(subprocess.run(['ip','-j','addr'],capture_output=True,text=True,timeout=10,check=True).stdout)
    addresses=[]
    for interface in interfaces:
        if interface['ifname']=='lo' or interface['ifname'].startswith(('docker','br-','veth')):continue
        for value in interface.get('addr_info',[]):
            address=ipaddress.ip_address(value['local'])
            if value.get('scope')=='global' and not address.is_loopback and not address.is_link_local:
                addresses.append(address)
    expected=set()
    for binding in ports['6379/tcp']:
        bound=ipaddress.ip_address(binding['HostIp']) if binding.get('HostIp') else None
        if bound and bound.is_loopback:continue
        candidates=[a for a in addresses if not bound or (bound.is_unspecified and bound.version==a.version) or a==bound]
        if not candidates:raise RuntimeError('A published interface cannot be guarded')
        for address in candidates:
            binary='iptables' if address.version==4 else 'ip6tables'
            suffix=['-m','comment','--comment','qrent-redis-private','-j','DROP']
            expected.add(tuple([binary,'INPUT','-p','tcp','-d',str(address),'--dport','6379',*suffix]))
            expected.add(tuple([binary,'DOCKER-USER','-p','tcp','-m','conntrack','--ctorigdst',str(address),'--ctorigdstport','6379',*suffix]))
    rules=config.get('rules',[])
    if not expected or len(rules)!=len(expected) or {tuple(rule) for rule in rules}!=expected:
        raise RuntimeError('Complete current IPv4/IPv6 port-guard coverage is required')
    for rule in sorted(expected):
        subprocess.run([rule[0],'-w','5','-C',*rule[1:]],check=True,capture_output=True,timeout=10)
    families={rule[0] for rule in expected}
    for binary in families:
        hook=subprocess.run([binary,'-w','5','-C','FORWARD','-j','DOCKER-USER'],capture_output=True,timeout=10)
        if hook.returncode:
            networks=row.get('NetworkSettings',{}).get('Networks',{})
            if binary!='ip6tables' or 'iptables' not in families or not networks:
                raise RuntimeError('A Docker forwarding guard hook is missing')
            for name in networks:
                if not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9_.-]*',name):raise RuntimeError('Unexpected bridge identity')
                answer=subprocess.run(['docker','network','inspect','--format','{{.Driver}} {{.EnableIPv6}}',name],capture_output=True,text=True,timeout=10,check=True)
                if answer.stdout.strip()!='bridge false':raise RuntimeError('Native IPv6 forwarding is not guarded')


def thread_snapshot(pid,proc_root=Path('/proc'),frozen=False):
    directory=proc_root/str(pid)/'task';before=sorted(path.name for path in directory.iterdir())
    children=set()
    for name in before:
        thread=directory/name
        if frozen and (thread/'stat').read_text().rpartition(')')[2].split()[0]!='T':
            raise RuntimeError('All orphan-shim threads must be frozen')
        children.update(int(child) for child in (thread/'children').read_text().split())
    if before!=sorted(path.name for path in directory.iterdir()):
        raise RuntimeError('The runtime thread inventory changed')
    return {'threads':before,'children':sorted(children)}


def orphan_plan(root,proc_root=Path('/proc'),data_root=Path('/var/lib/docker/containers'),volume_root=Path('/var/lib/docker/volumes')):
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
    records={}
    for path in data_root.glob('*/config.v2.json'):
        value=json.loads(path.read_text());records[value['ID']]=value
    row=records.get(identity,{})
    host=json.loads((data_root/identity/'hostconfig.json').read_text())
    if (row.get('Name')!='/qrent-redis-1' or row.get('State',{}).get('Running') is not False
            or row.get('State',{}).get('Pid')!=0 or host.get('RestartPolicy',{}).get('Name')!='no'
            or host.get('AutoRemove') is not False or row.get('Config',{}).get('Image')!='redis:7.4.2-alpine'):
        raise RuntimeError('Only the already stopped and guarded original Redis qualifies')
    mount=row.get('MountPoints',{}).get('/data',{});source=Path(previous['candidate'].get('data_source',''))
    if (mount.get('Type')!='volume' or mount.get('Destination')!='/data'
            or not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9_.-]*',mount.get('Name',''))
            or source!=volume_root/mount['Name']/'_data' or not source.is_dir()
            or source.is_symlink() or source.resolve()!=source or mount.get('Source') not in (None,'',str(source))):
        raise RuntimeError('Original Redis volume identity differs from its backup')
    ports=host.get('PortBindings',{})
    if (ports!=previous['candidate'].get('ports') or set(ports)!={'6379/tcp'}
            or any(binding.get('HostPort')!='6379' for binding in ports['6379/tcp'])):
        raise RuntimeError('Published Redis ports changed since the guarded backup')
    verify_orphan_guard(root,identity,ports,row)
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
    children=thread_snapshot(selected['pid'],proc_root)
    if children['children']!=[zombie['pid']]:raise RuntimeError('The Redis shim has other or uncertain children')
    marker=root/'.deploy/receipts'/('account-orphan-'+str(selected['pid'])+'-'+selected['started']+'.json')
    if marker.exists():raise RuntimeError('This orphan already has an attempt receipt; inspect rather than repeat')
    return {'original_store_id':identity,'init':zombie,'shim':selected,'backup_verified':True,
        'backup_sha256':previous['backup_sha256'],'signal':'FREEZE_THEN_KILL','business_processes':business,
        'known_container_ids':sorted(records),'target_image':row['Image'],
        'target_mounts_sha256':hashlib.sha256(json.dumps(row.get('MountPoints',{}),sort_keys=True).encode()).hexdigest(),
        'one_task_per_shim_verified':True,'only_child_is_zombie':True,
        'container_processes_signaled':False,'running_tasks_stopped':False,'data_deleted':False}


def verify_frozen_orphan(result,proc_root=Path('/proc'),data_root=Path('/var/lib/docker/containers')):
    shim=result['shim'];identity=result['original_store_id']
    current=process(shim['pid'],proc_root)
    if current!={**shim,'state':'T'} or process(result['init']['pid'],proc_root)!=result['init']:
        raise RuntimeError('Frozen orphan identity differs')
    first=thread_snapshot(shim['pid'],proc_root,True);time.sleep(0.05)
    if first!=thread_snapshot(shim['pid'],proc_root,True) or first['children']!=[result['init']['pid']]:
        raise RuntimeError('Frozen orphan still has changing or additional children')
    records={}
    for path in data_root.glob('*/config.v2.json'):
        value=json.loads(path.read_text());records[value['ID']]=value
    if sorted(records)!=result['known_container_ids']:raise RuntimeError('Container inventory changed while freezing')
    target=records[identity]
    if (target.get('State',{}).get('Running') is not False or target.get('State',{}).get('Pid')!=0
            or target['Image']!=result['target_image']
            or hashlib.sha256(json.dumps(target.get('MountPoints',{}),sort_keys=True).encode()).hexdigest()!=result['target_mounts_sha256']):
        raise RuntimeError('The stopped original store changed while freezing')
    for key,before in result['business_processes'].items():
        row=records[key];init=process(before['init']['pid'],proc_root);parent=process(before['shim']['pid'],proc_root)
        if (row.get('State',{}).get('Running') is not True or row['State']['Pid']!=init['pid']
                or {**init,'state':before['init']['state']}!=before['init'] or init['state'] not in ('S','R','D','I')
                or {**parent,'state':before['shim']['state']}!=before['shim'] or parent['state'] not in ('S','R','D','I')
                or row['Image']!=before['image']
                or hashlib.sha256(json.dumps(row.get('MountPoints',{}),sort_keys=True).encode()).hexdigest()!=before['mounts_sha256']):
            raise RuntimeError('A business process changed during the orphan freeze')
    # No other controller, network call or mutable runtime operation occurs after this check.
    if first!=thread_snapshot(shim['pid'],proc_root,True):raise RuntimeError('Frozen thread inventory changed')
    return True


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
        if orphan and not hasattr(signal,'pthread_sigmask'):raise RuntimeError('Bounded orphan signaling is unavailable')
        descriptor=os.pidfd_open(result['shim']['pid']);receipt=None;receipt_created=False;freeze_requested=False;killed=False;handlers={}
        try:
            if planner(root,proc_root)!=result: raise RuntimeError('Redis runtime changed; no signal sent')
            stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            receipt=root/'.deploy/receipts'/('account-orphan-'+str(result['shim']['pid'])+'-'+result['shim']['started']+'.json' if orphan else 'account-runtime-'+stamp+'.json')
            report['status']='freeze_attempt_started' if orphan else 'signal_attempt_started'
            with receipt.open('x') as stream:
                receipt_created=True
                json.dump(report,stream,indent=2);stream.flush();os.fsync(stream.fileno())
            if orphan:
                directory=os.open(receipt.parent,os.O_RDONLY|os.O_DIRECTORY)
                try:os.fsync(directory)
                finally:os.close(directory)
                def interrupted(number,frame):raise RuntimeError('Orphan recovery interrupted')
                for number in (signal.SIGHUP,signal.SIGTERM,signal.SIGINT):
                    handlers[number]=signal.signal(number,interrupted)
                freeze_requested=True;signal.pidfd_send_signal(descriptor,signal.SIGSTOP)
                for attempt in range(20):
                    try:
                        if process(result['shim']['pid'],proc_root)['state']=='T':
                            thread_snapshot(result['shim']['pid'],proc_root,True);break
                    except RuntimeError:pass
                    time.sleep(0.02)
                else:raise RuntimeError('The orphan runtime did not fully freeze')
                verify_frozen_orphan(result,proc_root)
                report.update(shim_frozen_before_termination=True,business_processes_preserved_before_signal=True)
                blocked=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGHUP,signal.SIGTERM,signal.SIGINT})
                try:
                    signal.pidfd_send_signal(descriptor,signal.SIGKILL);killed=True
                finally:signal.pthread_sigmask(signal.SIG_SETMASK,blocked)
            else:
                signal.pidfd_send_signal(descriptor,signal.SIGCONT if result['signal']=='CONT' else signal.SIGCHLD)
            report.update(status='signal_sent_requires_service_verification',finished_at=datetime.now(timezone.utc).isoformat())
            return report
        except Exception as error:
            report.update(status='requires_attention',error=type(error).__name__);raise
        finally:
            if freeze_requested and not killed:
                try:signal.pidfd_send_signal(descriptor,signal.SIGCONT);report['orphan_freeze_released']=True
                except OSError:report['orphan_freeze_release_requires_attention']=True
            for number,handler in handlers.items():signal.signal(number,handler)
            os.close(descriptor)
            if receipt_created:receipt.write_text(json.dumps(report,indent=2))
            print(json.dumps(report))


if __name__=='__main__':main(sys.argv[1] if len(sys.argv)>1 else 'plan')
