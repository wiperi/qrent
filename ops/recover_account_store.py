"""Repair only a stopped/exited existing Redis process; preserve its container and data."""
from datetime import datetime, timezone
import ctypes
import fcntl
import gzip
import hashlib
import ipaddress
import json
from pathlib import Path
import os
import re
import shutil
import subprocess
import sys
import tarfile
import time


def command(*args):
    return subprocess.check_output(args, text=True, timeout=10).strip()


def container_rows():
    ids=command('docker','ps','-aq','--no-trunc').splitlines()
    if len(ids)<3: raise RuntimeError('Existing production containers are required')
    template='[{{json .Id}},{{json .Image}},{{.State.Pid}},{{json .State.StartedAt}},{{json .Mounts}}]'
    rows=[json.loads(line) for line in command('docker','inspect','--format',template,*ids).splitlines()]
    for row in rows: row[4].sort(key=lambda m:json.dumps(m,sort_keys=True))
    return sorted(rows,key=lambda row:row[0])


def redis_state(proc_root=Path('/proc')):
    template='[{{json .Id}},{{json .Config.Image}},{{.State.Pid}},{{json .State.Health.Status}},{{json .Mounts}},{{.State.Running}},{{json .State.Status}},{{.State.ExitCode}},{{json .HostConfig.PortBindings}}]'
    identity,image,pid,health,mounts,running,status,exit_code,ports=json.loads(command('docker','inspect','--format',template,'qrent-redis-1'))
    if image!='redis:7.4.2-alpine': raise RuntimeError('Unexpected account-store image')
    try:
        proc_status=(proc_root/str(pid)/'status').read_text()
        state=next(line.split()[1] for line in proc_status.splitlines() if line.startswith('State:'))
    except (OSError,StopIteration): state='unknown'
    data=[m for m in mounts if m.get('Destination')=='/data' and m.get('Type')=='volume']
    if len(data)!=1: raise RuntimeError('The existing Redis data volume is required')
    source=Path(data[0]['Source'])
    if (not source.is_dir() or source.is_symlink() or source.resolve()!=source
            or command('docker','volume','inspect','--format','{{.Mountpoint}}',data[0]['Name'])!=str(source)):
        raise RuntimeError('Unexpected account-store volume path')
    return {'id':identity,'pid':pid,'process_state':state,'health':health,'data_source':str(source),
            'running':running,'status':status,'exit_code':exit_code,'ports':ports or {}}


def eligible(state):
    return state['health']=='unhealthy' and state['process_state'] in ('T','Z','X')


def eligible_start(state):
    return state['running'] is False and state['status']=='exited' and state['pid']==0 and state['exit_code']==0


def eligible_resume(state):
    return state['running'] is False and state['status']=='exited' and state['pid']==0 and state['exit_code']==128


def runtime_reconciled(root,state,proc_root=Path('/proc')):
    paths=sorted((root/'.deploy/receipts').glob('account-orphan-*.json'),key=lambda path:path.stat().st_mtime_ns,reverse=True)
    if not paths:raise RuntimeError('A verified orphan recovery receipt is required')
    recovery=json.loads(paths[0].read_text())
    if (recovery.get('original_store_id')!=state['id'] or recovery.get('status')!='signal_sent_requires_service_verification'
            or recovery.get('shim_frozen_before_termination') is not True
            or recovery.get('business_processes_preserved_before_signal') is not True):
        raise RuntimeError('Original orphan recovery is not verified')
    for name in ('init','shim'):
        previous=recovery[name];path=proc_root/str(previous['pid'])/'stat'
        if path.exists() and path.read_text().rpartition(')')[2].split()[19]==previous['started']:
            raise RuntimeError('The old orphan process is still present')
    tasks=command('ctr','--address','/run/containerd/containerd.sock','--namespace','moby','tasks','list')
    ids=set()
    for line in tasks.splitlines():
        values=line.split()
        if values and values[0]=='TASK':continue
        if len(values)!=3 or not re.fullmatch('[a-f0-9]{64}',values[0]) or not values[1].isdigit() or values[2]!='RUNNING':
            raise RuntimeError('Runtime task inventory is uncertain')
        identity=values[0];ids.add(identity)
        if identity not in recovery['business_processes']:raise RuntimeError('Unexpected runtime task after orphan recovery')
        previous=recovery['business_processes'][identity]['init']
        fields=(proc_root/values[1]/'stat').read_text().rpartition(')')[2].split()
        if (int(values[1])!=previous['pid'] or int(fields[1])!=previous['parent']
                or fields[19]!=previous['started'] or fields[0] not in ('S','R','D','I')):
            raise RuntimeError('A business process changed since orphan recovery')
    if ids!=set(recovery['business_processes']):raise RuntimeError('Runtime tasks have not fully reconciled')
    service=dict(line.partition('=')[::2] for line in command('systemctl','show','qrent-account-store.service',
        '-p','ActiveState','-p','SubState','-p','MainPID','-p','Job').splitlines() if '=' in line)
    if (service.get('ActiveState') not in ('inactive','failed') or service.get('SubState') not in ('dead','failed')
            or service.get('MainPID')!='0' or service.get('Job') not in ('','0')):
        raise RuntimeError('An existing account-store start producer is not quiescent')
    return recovery,paths[0]


def orphan_cleared(root,state,proc_root=Path('/proc'),own_marker=None):
    recovery,path=runtime_reconciled(root,state,proc_root)
    backups=sorted((root/'.deploy/receipts').glob('account-store-*.json'),reverse=True)
    previous=json.loads(backups[0].read_text());backup=Path(previous.get('backup_path',''))
    if (previous['candidate']['id']!=state['id'] or previous['candidate'].get('data_source')!=state['data_source']
            or backup.is_symlink() or root/'.deploy/backups' not in backup.resolve().parents
            or hashlib.sha256(backup.read_bytes()).hexdigest()!=recovery.get('backup_sha256')):
        raise RuntimeError('Original pre-orphan backup differs')
    marker=root/'.deploy/receipts'/('account-resume-'+str(recovery['shim']['pid'])+'-'+recovery['shim']['started']+'.json')
    if marker.exists():
        value=json.loads(marker.read_text())
        if (own_marker!=marker or value.get('status')!='resume_attempt_started'
                or value.get('original_store_id')!=state['id'] or value.get('orphan_receipt')!=path.name):
            raise RuntimeError('This reconciled orphan already has a resume attempt; do not repeat')
    elif own_marker is not None:raise RuntimeError('The current resume marker disappeared')
    return {'orphan_receipt':path.name,'attempt_marker':str(marker),'runtime_task_absent':True}


def bundle_mounts(bundle,mountinfo=Path('/proc/self/mountinfo')):
    mounts=[]
    for line in mountinfo.read_text().splitlines():
        values=line.split();path=Path(re.sub(r'\\([0-7]{3})',lambda match:chr(int(match[1],8)),values[4]))
        if path==bundle or bundle in path.parents:
            if any(value.startswith(('shared:','master:','propagate_from:')) for value in values[6:values.index('-')]):
                raise RuntimeError('A shared or propagated Redis runtime mount is unsafe')
            mounts.append(path)
    rootfs=bundle/'rootfs'
    if any(path!=rootfs and rootfs not in path.parents for path in mounts):
        raise RuntimeError('Unexpected mount outside the stopped Redis rootfs')
    return sorted(mounts,key=str)


def host_mount_namespace(proc_root=Path('/proc')):
    current=os.readlink(proc_root/'self/ns/mnt');host=os.readlink(proc_root/'1/ns/mnt')
    if current!=host:raise RuntimeError('Runtime recovery must use the host mount namespace')
    daemons={}
    for unit,binary in (('docker.service','dockerd'),('containerd.service','containerd')):
        pid=int(command('systemctl','show',unit,'-p','MainPID','--value'))
        executable=os.readlink(proc_root/str(pid)/'exe').removesuffix(' (deleted)')
        if pid<2 or executable not in ('/usr/bin/'+binary,'/usr/local/bin/'+binary):
            raise RuntimeError('The trusted runtime daemon identity is unavailable')
        namespace=os.readlink(proc_root/str(pid)/'ns/mnt')
        if namespace!=current:raise RuntimeError('A runtime daemon uses another mount namespace')
        fields=(proc_root/str(pid)/'stat').read_text().rpartition(')')[2].split()
        daemons[unit]={'pid':pid,'started':fields[19],'namespace':namespace}
    return {'namespace':current,'daemons':daemons}


def business_mounts(recovery,proc_root=Path('/proc')):
    return {identity:hashlib.sha256((proc_root/str(value['init']['pid'])/'mountinfo').read_bytes()).hexdigest()
            for identity,value in recovery['business_processes'].items()}


def empty_redis_cgroup(config,identity,cgroup_root=Path('/sys/fs/cgroup')):
    if not (cgroup_root/'cgroup.controllers').exists():raise RuntimeError('Unified cgroup identity is required')
    value=config.get('linux',{}).get('cgroupsPath','')
    if value=='system.slice:docker:'+identity:path=cgroup_root/'system.slice'/('docker-'+identity+'.scope')
    elif value in ('/docker/'+identity,'/system.slice/docker-'+identity+'.scope'):
        path=cgroup_root/value.lstrip('/')
    else:raise RuntimeError('Unrecognized original Redis cgroup identity')
    if path.resolve()!=path or path.is_symlink():raise RuntimeError('Unexpected cgroup path')
    if path.exists():
        directories=[path,*[child for child in path.rglob('*') if child.is_dir()]]
        if len(directories)>128:raise RuntimeError('Unexpected cgroup subtree size')
        for directory in directories:
            if directory.is_symlink():raise RuntimeError('Unexpected cgroup link')
            for name in ('cgroup.procs','cgroup.threads'):
                if (directory/name).read_text().strip():raise RuntimeError('The Redis cgroup still contains processes')
    return str(path)


def retained_oci_configuration(oci_root,identity,rootfs,requested_cgroup):
    path=oci_root/identity/'state.json'
    if path.is_symlink() or path.resolve()!=path:raise RuntimeError('Unexpected retained OCI configuration path')
    raw=path.read_bytes();state=json.loads(raw);config=state.get('config',{})
    if state.get('id')!=identity or Path(config.get('rootfs','')).resolve()!=rootfs:
        raise RuntimeError('Retained OCI rootfs or identity differs')
    hooks=config.get('Hooks',config.get('hooks',{})) or {}
    earlier={'prestart','createRuntime','createContainer','startContainer','poststart'}
    if not isinstance(hooks,dict) or any(value for key,value in hooks.items() if key not in earlier):
        raise RuntimeError('Retained OCI teardown or unknown hooks are not allowed')
    namespaces={value.get('type'):value.get('path','') for value in config.get('namespaces',[])}
    if namespaces.get('NEWPID')!='' or namespaces.get('NEWNS')!='' or config.get('intel_rdt'):
        raise RuntimeError('Private original PID/mount namespaces without external RDT cleanup are required')
    group=config.get('cgroups',{});value=group.get('path','')
    if not value and group.get('name')==identity and group.get('parent')=='system.slice' and group.get('scope_prefix')=='docker' and group.get('Systemd',group.get('systemd')) is True:
        value='system.slice:docker:'+identity
    actual=empty_redis_cgroup({'linux':{'cgroupsPath':value}},identity)
    if actual!=requested_cgroup or state.get('cgroup_paths')!={'':actual}:
        raise RuntimeError('Retained OCI cgroup ownership differs')
    return hashlib.sha256(raw).hexdigest()


def atomic_runtime_quarantine(source,destination):
    library=ctypes.CDLL(None,use_errno=True)
    if not hasattr(library,'renameat2'):raise RuntimeError('Atomic non-overwriting quarantine is unavailable')
    function=library.renameat2;function.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint];function.restype=ctypes.c_int
    if function(-100,os.fsencode(source),-100,os.fsencode(destination),1):
        raise OSError(ctypes.get_errno(),'Atomic runtime quarantine refused')


def trusted_runc():
    path=Path(shutil.which('runc') or '/missing-runc').resolve();info=path.stat()
    if str(path) not in ('/usr/bin/runc','/usr/sbin/runc','/usr/local/sbin/runc') or info.st_uid!=0 or info.st_mode&0o022:
        raise RuntimeError('A trusted root-owned OCI runtime is required')
    return str(path)


def bundle_plan(root,state,proc_root=Path('/proc'),runtime_root=Path('/run/containerd/io.containerd.runtime.v2.task/moby'),oci_root=Path('/run/docker/runtime-runc/moby'),mountinfo=Path('/proc/self/mountinfo'),data_root=Path('/var/lib/docker/containers'),own_marker=None):
    if not eligible_resume(state) or not re.fullmatch('[a-f0-9]{64}',state['id']):
        raise RuntimeError('Only the stopped original store with failed startup qualifies')
    recovery,orphan=runtime_reconciled(root,state,proc_root)
    receipts=sorted((root/'.deploy/receipts').glob('account-store-*.json'),reverse=True)
    previous=json.loads(receipts[0].read_text());backup=Path(previous.get('backup_path',''))
    if (previous.get('action')!='resume-apply' or previous.get('status')!='requires_attention'
            or previous['candidate']['id']!=state['id'] or previous['candidate'].get('data_source')!=state['data_source']
            or previous.get('reconciled_orphan',{}).get('orphan_receipt')!=orphan.name
            or backup.is_symlink() or root/'.deploy/backups' not in backup.resolve().parents
            or hashlib.sha256(backup.read_bytes()).hexdigest()!=previous.get('backup_sha256')):
        raise RuntimeError('The failed bounded resume and its private backup are required')
    bundle=runtime_root/state['id']
    if not bundle.is_dir() or bundle.is_symlink() or bundle.resolve()!=bundle:
        raise RuntimeError('Unexpected runtime bundle path')
    metadata=data_root/state['id']/'config.v2.json';original=json.loads(metadata.read_text())
    host=json.loads((metadata.parent/'hostconfig.json').read_text())
    if (host.get('AutoRemove') is not False or host.get('RestartPolicy',{}).get('Name')!='no'
            or original.get('Config',{}).get('Image')!='redis:7.4.2-alpine'
            or original.get('Image')!=recovery.get('target_image')):
        raise RuntimeError('Original Redis retention/image policy changed')
    error=original.get('State',{}).get('Error','')
    if 'mkdir '+str(bundle)+': file exists' not in error:
        raise RuntimeError('The exact stale-bundle startup error is required')
    binary=trusted_runc()
    answer=subprocess.run([binary,'--root',str(oci_root),'state',state['id']],capture_output=True,text=True,timeout=5,check=True)
    oci=json.loads(answer.stdout)
    if (oci.get('id')!=state['id'] or oci.get('status')!='stopped' or oci.get('pid')!=0
            or Path(oci.get('bundle','')).resolve()!=bundle):
        raise RuntimeError('Only the matching stopped PID-zero OCI instance qualifies')
    raw_config=(bundle/'config.json').read_bytes();config=json.loads(raw_config);rootfs=Path(config.get('root',{}).get('path',''))
    if not rootfs.is_absolute():rootfs=bundle/rootfs
    rootfs=rootfs.resolve()
    if rootfs!=bundle/'rootfs':
        graph=json.loads(command('docker','inspect','--format','{{json .GraphDriver}}',state['id']))
        merged=Path(graph.get('Data',{}).get('MergedDir',''))
        if (graph.get('Name')!='overlay2' or Path('/var/lib/docker/overlay2') not in merged.parents
                or merged.name!='merged' or merged.resolve()!=merged or rootfs!=merged):
            raise RuntimeError('Unexpected Redis runtime rootfs')
    cgroup=empty_redis_cgroup(config,state['id'])
    retained_hash=retained_oci_configuration(oci_root,state['id'],rootfs,cgroup)
    namespace=host_mount_namespace(proc_root);mount_hashes=business_mounts(recovery,proc_root)
    info=bundle.stat();mounts=bundle_mounts(bundle,mountinfo)
    marker=root/'.deploy/receipts'/('account-bundle-'+str(recovery['shim']['pid'])+'-'+recovery['shim']['started']+'.json')
    if marker.exists():
        value=json.loads(marker.read_text())
        if own_marker!=marker or value.get('status')!='bundle_repair_attempt_started' or value.get('candidate',{}).get('id')!=state['id']:
            raise RuntimeError('This runtime bundle already has a repair attempt; do not repeat')
    elif own_marker is not None:raise RuntimeError('The runtime repair marker disappeared')
    return {'bundle':str(bundle),'bundle_identity':[info.st_dev,info.st_ino],
        'rootfs_mount_count':len(mounts),'oci_root':str(oci_root),'orphan_receipt':orphan.name,
        'attempt_marker':str(marker),'previous_backup_sha256':previous['backup_sha256'],
        'host_mount_namespace':namespace,'business_mounts_sha256':mount_hashes,'runc_binary':binary,
        'retained_oci_sha256':retained_hash,'bundle_config_sha256':hashlib.sha256(raw_config).hexdigest()}


def private_runtime_quarantine(device):
    path=Path('/run/qrent-private-runtime-quarantine');path.mkdir(mode=0o700,exist_ok=True)
    if path.is_symlink() or path.resolve()!=path or path.stat().st_dev!=device or path.stat().st_uid!=0:
        raise RuntimeError('A private same-filesystem quarantine is required')
    path.chmod(0o700);return path


def recover_bundle(action,root,proc_root=Path('/proc')):
    os.umask(0o077);before=container_rows();state=redis_state(proc_root)
    proof=bundle_plan(root,state,proc_root);report={'action':action,'status':'planned','candidate':state,**proof,
        'original_docker_container_deleted':False,'volume_or_schema_changed':False,'other_containers_restarted':False}
    if action=='bundle-plan':print(json.dumps(report));return report
    if os.geteuid()!=0:raise RuntimeError('Root-owned runtime recovery is required')
    protected={path:hashlib.sha256(path.read_bytes()).digest() for path in (root/'.env',root/'docker-compose.yml')}
    with (root/'.deploy/backend.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if bundle_plan(root,redis_state(proc_root),proc_root)!=proof:raise RuntimeError('Runtime bundle changed before repair')
        receipt=Path(proof['attempt_marker'])
        with receipt.open('x') as stream:
            json.dump({**report,'status':'bundle_repair_attempt_started'},stream);stream.flush();os.fsync(stream.fileno())
        directory=os.open(receipt.parent,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(directory)
        finally:os.close(directory)
        try:
            stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            source=Path(state['data_source']);signature=volume_signature(source);size=sum(value[0] for value in signature.values())
            if size>256*1024**2 or shutil.disk_usage(root).free<2*size+512*1024**2:
                raise RuntimeError('Insufficient capacity for a fresh private data backup')
            backup=root/'.deploy/backups'/('redis-before-bundle-'+stamp+'.tar.gz')
            with tarfile.open(backup,'w:gz') as archive:archive.add(source,arcname='redis-data')
            with gzip.open(backup,'rb') as archive:
                while archive.read(1024**2):pass
            if volume_signature(source)!=signature:raise RuntimeError('Redis data changed during backup')
            report.update(backup_path=str(backup),backup_sha256=hashlib.sha256(backup.read_bytes()).hexdigest())
            report['public_port_guard']=guard_public_ports(root,state)
            if bundle_plan(root,state,proc_root,own_marker=receipt)!=proof:
                raise RuntimeError('Runtime proof changed after backup or guard')
            if redis_state(proc_root)!=state:raise RuntimeError('Redis changed before OCI cleanup')
            bundle=Path(proof['bundle']);info=bundle.stat()
            if bundle.is_symlink() or bundle.resolve()!=bundle or [info.st_dev,info.st_ino]!=proof['bundle_identity']:
                raise RuntimeError('Runtime bundle identity changed')
            # Normal stopped-instance cleanup, without force/lazy deletion.
            subprocess.run([proof['runc_binary'],'--root',proof['oci_root'],'delete',state['id']],capture_output=True,timeout=15,check=True)
            recovery,_=runtime_reconciled(root,state,proc_root)
            if business_mounts(recovery,proc_root)!=proof['business_mounts_sha256'] or host_mount_namespace(proc_root)!=proof['host_mount_namespace']:
                raise RuntimeError('Business mount or namespace protection requires attention')
            if hashlib.sha256((bundle/'config.json').read_bytes()).hexdigest()!=proof['bundle_config_sha256']:
                raise RuntimeError('Runtime bundle configuration changed')
            empty_redis_cgroup(json.loads((bundle/'config.json').read_text()),state['id'])
            if bundle_mounts(bundle):
                subprocess.run(['/usr/bin/umount','--recursive','--',str(bundle/'rootfs')],capture_output=True,timeout=15,check=True)
            if bundle_mounts(bundle):raise RuntimeError('Redis runtime mounts remain; bundle kept')
            recovery,_=runtime_reconciled(root,state,proc_root)
            if business_mounts(recovery,proc_root)!=proof['business_mounts_sha256']:
                raise RuntimeError('Business mount identities changed after the scoped unmount')
            if redis_state(proc_root)!=state:raise RuntimeError('Redis changed before runtime quarantine')
            quarantine=private_runtime_quarantine(info.st_dev);destination=quarantine/(stamp+'-'+state['id'])
            if destination.exists():raise RuntimeError('Quarantine destination already exists')
            current=bundle.stat()
            if [current.st_dev,current.st_ino]!=proof['bundle_identity']:raise RuntimeError('Runtime bundle changed before quarantine')
            atomic_runtime_quarantine(bundle,destination);report['runtime_quarantine']=str(destination)
            report['public_port_guard']=guard_public_ports(root,state)
            recovery,_=runtime_reconciled(root,state,proc_root)
            if (business_mounts(recovery,proc_root)!=proof['business_mounts_sha256']
                    or host_mount_namespace(proc_root)!=proof['host_mount_namespace']):
                raise RuntimeError('Final business mount/namespace verification failed')
            repair_process(state,start=True,resume=True)
            for attempt in range(6):
                if local_ping(state['id']):break
                time.sleep(1)
            else:raise RuntimeError('Original Redis did not respond after bundle repair; no automatic retry')
            if (not preserve_rows(before,container_rows(),state['id'])
                    or not all(hashlib.sha256(path.read_bytes()).digest()==digest for path,digest in protected.items())
                    or business_mounts(recovery,proc_root)!=proof['business_mounts_sha256']):
                raise RuntimeError('Original business/image/mount/environment preservation requires attention')
            report.update(status='verified',local_ping=True,container_image_and_mounts_preserved=True,environment_and_compose_preserved=True)
        except Exception as error:
            report.update(status='requires_attention',error=type(error).__name__);raise
        finally:
            report['finished_at']=datetime.now(timezone.utc).isoformat();receipt.write_text(json.dumps(report,indent=2));print(json.dumps(report))
    return report


def public_port_rules(ports,interfaces):
    addresses=[]
    for interface in interfaces:
        if interface['ifname']=='lo' or interface['ifname'].startswith(('docker','br-','veth')): continue
        for value in interface.get('addr_info',[]):
            address=ipaddress.ip_address(value['local'])
            if value.get('scope')=='global' and not address.is_loopback and not address.is_link_local:
                addresses.append(address)
    rules=[]
    for key,bindings in ports.items():
        if key!='6379/tcp': raise RuntimeError('Unexpected Redis published port configuration')
        for binding in bindings or []:
            port=int(binding['HostPort']);host=binding.get('HostIp','')
            if port<1 or port>65535 or port in (22,80,443,3306): raise RuntimeError('Unexpected public Redis port')
            bound=ipaddress.ip_address(host) if host else None
            if bound and bound.is_loopback: continue
            candidates=[a for a in addresses if not bound or
                        (bound.is_unspecified and bound.version==a.version) or a==bound]
            if not candidates: raise RuntimeError('Published Redis interface could not be guarded')
            for address in candidates:
                binary='iptables' if address.version==4 else 'ip6tables'
                for chain,match in [('DOCKER-USER',['-m','conntrack','--ctorigdst',str(address),'--ctorigdstport',str(port)]),
                                    ('INPUT',['-d',str(address),'--dport',str(port)])]:
                    rule=[binary,chain,'-p','tcp',*match,'-m','comment','--comment','qrent-redis-private','-j','DROP']
                    if rule not in rules: rules.append(rule)
    return rules


PORT_GUARD = '''import json,subprocess,sys
data=json.load(open(sys.argv[1]));rules=data['rules']
for row in rules:
 binary,chain,*rule=row
 if chain=='DOCKER-USER' and subprocess.run([binary,'-w','5','-S',chain],capture_output=True).returncode:
  subprocess.run([binary,'-w','5','-N',chain],check=True,capture_output=True)
 result=subprocess.run([binary,'-w','5','-C',chain,*rule],capture_output=True)
 if result.returncode==1:
  subprocess.run([binary,'-w','5','-I',chain,'1',*rule],check=True,capture_output=True)
 elif result.returncode: raise SystemExit('Redis port guard could not be checked')
 subprocess.run([binary,'-w','5','-C',chain,*rule],check=True,capture_output=True)
families={row[0] for row in rules}
for binary in families:
 if subprocess.run([binary,'-w','5','-C','FORWARD','-j','DOCKER-USER'],capture_output=True).returncode:
  if binary!='ip6tables' or 'iptables' not in families: raise SystemExit('Docker forwarding guard is unavailable')
  networks=json.loads(subprocess.check_output(['docker','inspect','--format','{{json .NetworkSettings.Networks}}',data['container']],text=True))
  if not networks: raise SystemExit('Redis bridge identity is unavailable')
  for name in networks:
   if subprocess.check_output(['docker','network','inspect','--format','{{.EnableIPv6}}',name],text=True).strip()!='false':
    raise SystemExit('Native IPv6 forwarding guard is unavailable')
'''


def verify_guard_hooks(rules,state):
    families={row[0] for row in rules}
    for binary in families:
        try: command(binary,'-w','5','-C','FORWARD','-j','DOCKER-USER')
        except subprocess.CalledProcessError:
            if binary!='ip6tables' or 'iptables' not in families: raise
            # IPv6 may be published through a host proxy onto an IPv4-only bridge.
            networks=json.loads(command('docker','inspect','--format','{{json .NetworkSettings.Networks}}',state['id']))
            if not networks or any(command('docker','network','inspect','--format','{{.EnableIPv6}}',name)!='false'
                                   for name in networks): raise


def guard_public_ports(root,state,service_dir=Path('/etc/systemd/system')):
    rules=public_port_rules(state['ports'],json.loads(command('ip','-j','addr')))
    if os.geteuid()!=0: raise RuntimeError('A root-owned Redis port guard is required before start')
    if any(c.isspace() or c=='%' for c in str(root)):
        raise RuntimeError('Unexpected service path; no process start attempted')
    if not re.fullmatch(r'[a-f0-9]{64}',state['id']): raise RuntimeError('Unexpected account-store container identity')
    script=root/'.deploy/redis-port-guard.py';config=root/'.deploy/redis-port-guard.json'
    script.write_text(PORT_GUARD);config.write_text(json.dumps({'rules':rules,'container':state['id']}));script.chmod(0o600);config.chmod(0o600)
    unit=service_dir/'qrent-account-store.service'
    # Only Redis depends on its guard; Docker/MySQL/n8n startup stays independent.
    unit.write_text('[Unit]\nDescription=Qrent original account store\nRequires=docker.service\nAfter=docker.service\nPartOf=docker.service\n'
        'StartLimitIntervalSec=120\nStartLimitBurst=3\n[Service]\nType=simple\n'
        'ExecStartPre=/usr/bin/python3 '+str(script)+' '+str(config)+'\n'
        'ExecStart=/usr/bin/docker start --attach '+state['id']+'\n'
        'ExecStop=/usr/bin/docker stop --time 10 '+state['id']+'\n'
        'Restart=always\nRestartSec=5\nTimeoutStopSec=20\n'
        '[Install]\nWantedBy=multi-user.target\n')
    command('/usr/bin/python3',str(script),str(config))
    verify_guard_hooks(rules,state)
    command('docker','update','--restart=no',state['id'])
    command('systemctl','daemon-reload');command('systemctl','enable','qrent-account-store.service')
    return {'rules':len(rules),'persistent':True,'other_ports_changed':False,
            'supervisor':'qrent-account-store.service','docker_startup_independent':True,
            'address_scope':'current fixed host addresses'}


def preserve_rows(before,after,identity):
    def normalized(rows):
        return [[r[0],r[1],None if r[0]==identity else r[2],
                 None if r[0]==identity else r[3],r[4]] for r in rows]
    return normalized(before)==normalized(after)


def repair_process(state,start=False,resume=False):
    if not (eligible_resume(state) if resume else eligible_start(state) if start else eligible(state)):
        raise RuntimeError('Only a confirmed stopped/exited Redis process is eligible')
    args=(['systemctl','start','qrent-account-store.service'] if start else
          ['docker','kill','--signal','CONT',state['id']] if state['process_state']=='T'
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
    if action in ('bundle-plan','bundle-apply'):return recover_bundle(action,root or Path.home()/'qrent',proc_root)
    if action not in ('plan','apply','start-plan','start-apply','resume-plan','resume-apply'): raise ValueError('Invalid account-store recovery action')
    resume=action.startswith('resume-');start=action.startswith('start-') or resume
    os.umask(0o077)
    root=root or Path.home()/'qrent'
    protected={p:hashlib.sha256(p.read_bytes()).digest() for p in (root/'.env',root/'docker-compose.yml')}
    before=container_rows(); state=redis_state(proc_root)
    proof=orphan_cleared(root,state,proc_root) if resume else None
    qualified=eligible_resume(state) if resume else eligible_start(state) if start else eligible(state)
    report={'action':action,'status':'planned','candidate':state,'eligible':qualified,
            'database_schema_changed':False,'data_deleted':False,'other_containers_restarted':False}
    if resume:report['reconciled_orphan']=proof
    if action.endswith('plan'): print(json.dumps(report)); return report
    if not qualified: raise RuntimeError('Redis process does not meet the bounded repair condition')
    (root/'.deploy/receipts').mkdir(parents=True,exist_ok=True)
    with (root/'.deploy/backend.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if redis_state(proc_root)!=state: raise RuntimeError('Account-store state changed; inspect again')
        if resume:
            if orphan_cleared(root,state,proc_root)!=proof:raise RuntimeError('Orphan reconciliation changed before resume')
            with Path(proof['attempt_marker']).open('x') as stream:
                json.dump({'status':'resume_attempt_started','original_store_id':state['id'],**proof},stream)
                stream.flush();os.fsync(stream.fileno())
            directory=os.open(Path(proof['attempt_marker']).parent,os.O_RDONLY|os.O_DIRECTORY)
            try:os.fsync(directory)
            finally:os.close(directory)
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
            if start: report['public_port_guard']=guard_public_ports(root,state)
            if redis_state(proc_root)!=state:
                raise RuntimeError('Account-store state changed before process action')
            report.update(backup_path=str(backup),backup_sha256=digest.hexdigest())
            if resume and orphan_cleared(root,state,proc_root,own_marker=Path(proof['attempt_marker']))!=proof:
                raise RuntimeError('Orphan runtime changed after backup and guard; no start attempted')
            report['status']='repair_attempt_started'
            receipt.write_text(json.dumps(report,indent=2))
            if resume: repair_process(state,start=True,resume=True)
            elif start: repair_process(state,start=True)
            else: repair_process(state)  # Exactly one scoped action; never recreate the container.
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
