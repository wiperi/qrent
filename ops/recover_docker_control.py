"""Bounded Docker-control recovery; never restart a business container."""
from datetime import datetime,timezone
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import time


def command(*args):
    return subprocess.check_output(args,text=True,timeout=10).strip()


class LocalDocker(http.client.HTTPConnection):
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(3);self.sock.connect('/var/run/docker.sock')


def api(path):
    connection=LocalDocker('localhost',timeout=3)
    try:
        connection.request('GET',path);response=connection.getresponse()
        if response.status!=200: return None
        return json.loads(response.read())
    except (OSError,ValueError,http.client.HTTPException): return None
    finally: connection.close()


def kernel_identity(pid,proc_root=Path('/proc')):
    fields=(proc_root/str(pid)/'stat').read_text().rpartition(')')[2].split()
    if fields[0] not in ('S','R','D','I','T'): raise RuntimeError('A business process is unavailable')
    return {'pid':int(pid),'started':fields[19]}


def disk_snapshot(data_root=Path('/var/lib/docker/containers'),proc_root=Path('/proc')):
    rows={};redis=None;names=set()
    for path in data_root.glob('*/config.v2.json'):
        row=json.loads(path.read_text());state=row.get('State',{})
        name=row.get('Name','').lstrip('/')
        if name=='qrent-redis-1':
            host=json.loads((path.parent/'hostconfig.json').read_text())
            redis={'id':row.get('ID'),'running':state.get('Running'),
                   'manually_stopped':row.get('HasBeenManuallyStopped'),
                   'restart_policy':host.get('RestartPolicy',{}).get('Name')}
            continue
        if state.get('Running'):
            identity=kernel_identity(state['Pid'],proc_root)
            names.add(name)
            mounts=[(key,value.get('Type'),value.get('Name'),value.get('Source'),value.get('Destination'),value.get('RW'))
                    for key,value in row.get('MountPoints',{}).items()]
            rows[row['ID']]={'process':identity,'image':row['Image'],
                'mounts_sha256':hashlib.sha256(json.dumps(sorted(mounts),sort_keys=True).encode()).hexdigest()}
    if not {'qrent-backend-1','qrent-db-1','n8n-n8n-1'}.issubset(names) or not redis:
        raise RuntimeError('The existing backend, database, n8n and Redis records are required')
    return rows,redis


def restart_allowed(info,redis):
    return bool(info and info.get('LiveRestoreEnabled') is True and redis.get('running') is False
                and redis.get('manually_stopped') is True and redis.get('restart_policy')=='unless-stopped')


def controller():
    pid=int(command('systemctl','show','docker.service','-p','MainPID','--value'))
    exe=os.readlink('/proc/'+str(pid)+'/exe').removesuffix(' (deleted)')
    if exe not in ('/usr/bin/dockerd','/usr/local/bin/dockerd'): raise RuntimeError('Unexpected Docker controller executable')
    args=Path('/proc',str(pid),'cmdline').read_bytes().split(b'\0')
    config=Path('/etc/docker/daemon.json')
    for index,arg in enumerate(args):
        if arg.startswith(b'--config-file='): config=Path(arg.split(b'=',1)[1].decode())
        elif arg==b'--config-file' and index+1<len(args): config=Path(args[index+1].decode())
    return pid,Path(exe),config,args


def verify_controller_unit(binary,args):
    """Reject hooks and stop propagation before touching the controller."""
    for property_name in ('ExecCondition','ExecStartPre','ExecStartPost','ExecStop','ExecStopPost'):
        if command('systemctl','show','docker.service','-p',property_name,'--value'):
            raise RuntimeError('Custom Docker start or stop hooks require separate review')
    start=command('systemctl','show','docker.service','-p','ExecStart','--value')
    matched=re.fullmatch(r'\{ path=([^ ;]+) ; argv\[\]=(.+?) ; ignore_errors=no ; [^{}]+ \}',start)
    current=' '.join(arg.decode() for arg in args if arg)
    if not matched or matched.group(1)!=str(binary) or matched.group(2)!=current:
        raise RuntimeError('Systemd must start the verified Docker binary with unchanged arguments')
    if command('systemctl','show','docker.service','-p','KillMode','--value')!='process':
        raise RuntimeError('Docker process-only stop behavior is required')
    for property_name in ('ConsistsOf','RequiredBy','BoundBy','RequisiteOf','PropagatesStopTo','Upholds','OnFailure','OnSuccess'):
        allowed={'docker.socket'} if property_name in ('ConsistsOf','RequiredBy','BoundBy') else set()
        if set(command('systemctl','show','docker.service','-p',property_name,'--value').split())-allowed:
            raise RuntimeError('Other service restart propagation requires separate review')
    if 'docker.service' in command('systemctl','show','containerd.service','-p','PartOf','--value').split():
        raise RuntimeError('Containerd must remain independent of the controller restart')


def enable_live_restore(root):
    pid,binary,path,args=controller()
    identity=kernel_identity(pid)
    if any(arg.startswith(b'--live-restore') for arg in args):
        raise RuntimeError('A command-line live-restore option needs separate reconciliation')
    if path.is_symlink() or path.resolve()!=path: raise RuntimeError('Unexpected Docker configuration path')
    original=path.read_bytes() if path.exists() else None
    config=json.loads(original) if original else {}
    candidate={**config,'live-restore':True}
    directory=root/'.deploy/docker-control';directory.mkdir(parents=True,exist_ok=True)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    if original is not None: (directory/('daemon-before-'+stamp+'.json')).write_bytes(original)
    temporary=directory/('daemon-candidate-'+stamp+'.json');temporary.write_text(json.dumps(candidate,indent=2))
    result=subprocess.run([str(binary),'--validate','--config-file',str(temporary)],capture_output=True,timeout=10)
    if result.returncode: raise RuntimeError('Docker configuration validation failed; original configuration kept')
    path.parent.mkdir(parents=True,exist_ok=True)
    replacement=path.with_name(path.name+'.qrent.tmp');replacement.write_bytes(temporary.read_bytes());replacement.chmod(0o600);replacement.replace(path)
    descriptor=os.pidfd_open(pid)
    try:
        if controller()[0]!=pid or kernel_identity(pid)!=identity:
            raise RuntimeError('Docker controller changed; no reload signal sent')
        signal.pidfd_send_signal(descriptor,signal.SIGHUP)
    finally: os.close(descriptor)
    for attempt in range(5):
        info=api('/info')
        if info and info.get('LiveRestoreEnabled') is True: return True
        time.sleep(1)
    raise RuntimeError('Live restore is not verified active; no controller restart performed')


def main(action='plan',root=None,data_root=Path('/var/lib/docker/containers'),proc_root=Path('/proc')):
    if action not in ('plan','enable-live-restore','restart-controller'): raise ValueError('Invalid controller action')
    os.umask(0o077);root=root or Path.home()/'qrent'
    before,redis=disk_snapshot(data_root,proc_root);info=api('/info');version=api('/version')
    report={'action':action,'status':'planned','business_processes':before,'redis':redis,
            'live_restore_active':info.get('LiveRestoreEnabled') if info else None,
            'restart_allowed':restart_allowed(info,redis),'running_containers_stopped':False,
            'volumes_or_schema_changed':False}
    report['runtime_version']=(version or {}).get('Version')
    if action=='plan':
        try:
            _,binary,_,args=controller();verify_controller_unit(binary,args)
            report['unit_restart_eligible']=True
        except (OSError,RuntimeError,subprocess.SubprocessError) as error:
            report['unit_restart_eligible']=False
            report['unit_gate_reason']=str(error) if isinstance(error,RuntimeError) else type(error).__name__
        print(json.dumps(report));return report
    directory=root/'.deploy/docker-control';directory.mkdir(parents=True,exist_ok=True)
    with (directory/'control.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');receipt=directory/('receipt-'+stamp+'.json')
        try:
            if action=='enable-live-restore':
                if not (info and info.get('LiveRestoreEnabled') is True): enable_live_restore(root)
                report['status']='live_restore_verified'
            else:
                fresh=api('/info');now,current_redis=disk_snapshot(data_root,proc_root)
                if now!=before or current_redis!=redis or not restart_allowed(fresh,current_redis):
                    raise RuntimeError('Live-restore and stopped-Redis prerequisites are not verified')
                _,binary,_,args=controller()
                installed=subprocess.run([str(binary),'--version'],capture_output=True,text=True,timeout=10)
                runtime_version=(version or {}).get('Version','')
                if installed.returncode or not re.search(r'\b'+re.escape('.'.join(runtime_version.split('.')[:2]))+r'\.',installed.stdout) or not runtime_version:
                    raise RuntimeError('Controller version compatibility could not be verified')
                verify_controller_unit(binary,args)
                report['status']='controller_restart_attempt_started';receipt.write_text(json.dumps(report,indent=2))
                result=subprocess.run(['systemctl','restart','docker.service'],capture_output=True,timeout=60)
                if result.returncode: raise RuntimeError('Controller restart did not complete; no automatic retry')
                for attempt in range(5):
                    if api('/version'): break
                    time.sleep(1)
                else: raise RuntimeError('Controller API remains unavailable; no automatic retry')
                report['status']='controller_restarted_requires_api_acceptance'
            after,_=disk_snapshot(data_root,proc_root)
            if after!=before: raise RuntimeError('Business-process identity protection requires attention')
            report['business_process_identity_preserved']=True
        except Exception as error:
            report.update(status='requires_attention',error=type(error).__name__);raise
        finally:
            report['finished_at']=datetime.now(timezone.utc).isoformat();receipt.write_text(json.dumps(report,indent=2));print(json.dumps(report))
    return report


if __name__=='__main__':main(sys.argv[1] if len(sys.argv)>1 else 'plan')
