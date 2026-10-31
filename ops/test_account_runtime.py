"""Kernel-only recovery boundaries, using fake proc files and fake pidfds."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('runtime_recovery',Path(__file__).with_name('recover_account_runtime.py'))
runtime=importlib.util.module_from_spec(spec);spec.loader.exec_module(runtime)


class RuntimeRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve();self.proc=self.root/'proc'
        quiet=patch('builtins.print');quiet.start();self.addCleanup(quiet.stop)
        self.identity='a'*64
        backups=self.root/'.deploy/backups';backups.mkdir(parents=True)
        self.backup=backups/'redis.tar.gz';self.backup.write_bytes(b'previously-verified-private-backup')
        receipts=self.root/'.deploy/receipts';receipts.mkdir()
        self.receipt=receipts/'account-store-20261031.json'
        self.receipt.write_text(json.dumps({'candidate':{'id':self.identity,'pid':123},'backup_path':str(self.backup),
            'backup_sha256':hashlib.sha256(self.backup.read_bytes()).hexdigest()}))
        self.write_process(123,'Z',100,'init-start')
        self.write_process(100,'S',1,'shim-start')
        (self.proc/'100/exe').symlink_to('/usr/bin/containerd-shim-runc-v2')
        (self.proc/'100/cmdline').write_bytes(b'containerd-shim-runc-v2\0-namespace\0moby\0-id\0'+self.identity.encode()+b'\0')

    def write_process(self,pid,state,parent,started):
        root=self.proc/str(pid);root.mkdir(parents=True,exist_ok=True)
        fields=[state,str(parent)]+['0']*18;fields[19]=started
        (root/'stat').write_text(str(pid)+' (redis or shim) '+' '.join(fields))

    def tearDown(self):self.temp.cleanup()

    def test_plan_matches_exact_redis_shim_and_verifies_existing_backup(self):
        result=runtime.main('plan',self.root,self.proc)
        self.assertEqual(result['status'],'planned');self.assertEqual(result['shim']['pid'],100)
        self.assertEqual(result['signal'],'CHLD');self.assertTrue(result['backup_verified'])

    def test_running_init_or_unrelated_parent_never_qualifies(self):
        self.write_process(123,'S',100,'init-start')
        with self.assertRaisesRegex(RuntimeError,'zombie'):runtime.plan(self.root,self.proc)
        self.write_process(123,'Z',100,'init-start')
        (self.proc/'100/cmdline').write_bytes(b'containerd-shim-runc-v2\0-id\0'+b'b'*64+b'\0')
        with self.assertRaisesRegex(RuntimeError,'exact Redis-owned'):runtime.plan(self.root,self.proc)

    def test_backup_drift_blocks_every_signal(self):
        self.backup.write_bytes(b'changed-backup')
        with self.assertRaisesRegex(RuntimeError,'checksum'):runtime.plan(self.root,self.proc)

    def test_different_namespace_or_untrusted_executable_is_rejected(self):
        parent=self.proc/'100'
        (parent/'cmdline').write_bytes(b'shim\0-namespace\0other\0-id\0'+self.identity.encode()+b'\0')
        with self.assertRaisesRegex(RuntimeError,'exact Redis-owned'):runtime.plan(self.root,self.proc)
        (parent/'cmdline').write_bytes(b'shim\0-namespace\0moby\0-id\0'+self.identity.encode()+b'\0')
        (parent/'exe').unlink();(parent/'exe').symlink_to('/tmp/containerd-shim-runc-v2')
        with self.assertRaisesRegex(RuntimeError,'exact Redis-owned'):runtime.plan(self.root,self.proc)

    def test_stopped_parent_is_only_resumed(self):
        self.write_process(100,'T',1,'shim-start')
        self.assertEqual(runtime.plan(self.root,self.proc)['signal'],'CONT')

    def test_pidfd_signal_targets_one_verified_runtime_and_requires_later_health_check(self):
        with patch.object(runtime.os,'pidfd_open',return_value=999,create=True) as opened,patch.object(runtime.os,'close') as closed,patch.object(runtime.signal,'pidfd_send_signal',create=True) as send:
            result=runtime.main('apply',self.root,self.proc)
            opened.assert_called_once_with(100);send.assert_called_once_with(999,signal.SIGCHLD)
            closed.assert_called_once_with(999)
        self.assertEqual(result['status'],'signal_sent_requires_service_verification')

    def test_pid_reuse_after_descriptor_open_blocks_signal(self):
        before=runtime.plan(self.root,self.proc);after=copy.deepcopy(before);after['shim']['started']='different-start'
        with patch.object(runtime,'plan',side_effect=[before,after]),patch.object(runtime.os,'pidfd_open',return_value=999,create=True),patch.object(runtime.os,'close'),patch.object(runtime.signal,'pidfd_send_signal',create=True) as send:
            with self.assertRaisesRegex(RuntimeError,'changed'):runtime.main('apply',self.root,self.proc)
            send.assert_not_called()


class OrphanRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve()
        self.proc=self.root/'proc';self.data=self.root/'containers';self.identity='a'*64
        deploy=self.root/'.deploy';(deploy/'receipts').mkdir(parents=True);(deploy/'backups').mkdir()
        backup=deploy/'backups/redis.tar.gz';backup.write_bytes(b'verified-backup')
        (deploy/'receipts/account-store-20261031.json').write_text(json.dumps({
            'candidate':{'id':self.identity,'pid':0,'ports':{'6379/tcp':[{'HostIp':'','HostPort':'6379'}]}},'backup_path':str(backup),
            'backup_sha256':hashlib.sha256(backup.read_bytes()).hexdigest(),
            'public_port_guard':{'supervisor':'qrent-account-store.service','persistent':True}}))
        self.rules=[['iptables','INPUT','-p','tcp','-d','203.0.113.10','--dport','6379','-m','comment','--comment','qrent-redis-private','-j','DROP']]
        (deploy/'redis-port-guard.json').write_text(json.dumps({'container':self.identity,'rules':self.rules}))
        tasks=[]
        names=('qrent-redis-1','qrent-backend-1','qrent-db-1','n8n-n8n-1')
        for index,name in enumerate(names):
            identity=chr(ord('a')+index)*64;pid=123+index;parent=100+index
            directory=self.data/identity;directory.mkdir(parents=True)
            (directory/'config.v2.json').write_text(json.dumps({'ID':identity,'Name':'/'+name,'Image':'same',
                'State':{'Running':index>0,'Pid':pid if index else 0},'MountPoints':{}}))
            (directory/'hostconfig.json').write_text(json.dumps({'RestartPolicy':{'Name':'no'},'PortBindings':{'6379/tcp':[{'HostIp':'','HostPort':'6379'}]}}))
            self.write_process(pid,'Z' if index==0 else 'S',parent,'init-'+str(index))
            self.write_process(parent,'S',1,'shim-'+str(index))
            (self.proc/str(parent)/'exe').symlink_to('/usr/bin/containerd-shim-runc-v2')
            (self.proc/str(parent)/'cmdline').write_bytes(b'shim\0-namespace\0moby\0-id\0'+identity.encode()+b'\0')
            children=self.proc/str(parent)/'task'/str(parent);children.mkdir(parents=True);(children/'children').write_text(str(pid))
            tasks.append(identity+' '+str(pid)+' RUNNING')
        self.tasks='TASK PID STATUS\n'+'\n'.join(tasks)
        self.runner=patch.object(runtime.subprocess,'run',side_effect=lambda args,**kw:subprocess.CompletedProcess(args,0,stdout=self.tasks if args[0]=='ctr' else ''))
        self.runner.start();self.addCleanup(self.runner.stop)
        quiet=patch('builtins.print');quiet.start();self.addCleanup(quiet.stop)

    def write_process(self,pid,state,parent,started):
        directory=self.proc/str(pid);directory.mkdir(parents=True,exist_ok=True)
        fields=[state,str(parent)]+['0']*18;fields[19]=started
        (directory/'stat').write_text(str(pid)+' (runtime) '+' '.join(fields))

    def tearDown(self):self.temp.cleanup()

    def test_single_zombie_ownership_has_three_preserved_business_processes(self):
        result=runtime.orphan_plan(self.root,self.proc,self.data)
        self.assertEqual(result['signal'],'TERM');self.assertEqual(len(result['business_processes']),3)
        self.assertTrue(result['one_task_per_shim_verified']);self.assertFalse(result['running_tasks_stopped'])

    def test_live_init_or_additional_children_in_any_thread_block_termination(self):
        self.write_process(123,'S',100,'init-0')
        with self.assertRaisesRegex(RuntimeError,'zombie'):runtime.orphan_plan(self.root,self.proc,self.data)
        self.write_process(123,'Z',100,'init-0')
        extra=self.proc/'100/task/1000';extra.mkdir();(extra/'children').write_text('9999')
        with self.assertRaisesRegex(RuntimeError,'other or uncertain children'):runtime.orphan_plan(self.root,self.proc,self.data)

    def test_shared_or_missing_task_ownership_blocks_termination(self):
        self.write_process(124,'S',100,'init-1')
        with self.assertRaisesRegex(RuntimeError,'owner identity'):runtime.orphan_plan(self.root,self.proc,self.data)
        self.write_process(124,'S',101,'init-1');self.tasks+='\n'+'e'*64+' 999 RUNNING'
        with self.assertRaisesRegex(RuntimeError,'incomplete'):runtime.orphan_plan(self.root,self.proc,self.data)

    def test_missing_guard_or_previous_attempt_is_not_retried(self):
        marker=self.root/'.deploy/receipts/account-orphan-100-shim-0.json';marker.write_text('{}')
        with self.assertRaisesRegex(RuntimeError,'already has an attempt'):runtime.orphan_plan(self.root,self.proc,self.data)
        marker.unlink();(self.root/'.deploy/redis-port-guard.json').write_text(json.dumps({'container':self.identity,'rules':[]}))
        with self.assertRaisesRegex(RuntimeError,'port-guard rules'):runtime.orphan_plan(self.root,self.proc,self.data)

    def test_apply_signals_only_verified_shim_once_and_leaves_business_processes_alone(self):
        result=runtime.orphan_plan(self.root,self.proc,self.data)
        with patch.object(runtime,'orphan_plan',return_value=result),patch.object(runtime.os,'pidfd_open',return_value=999,create=True),patch.object(runtime.os,'close'),patch.object(runtime.signal,'pidfd_send_signal',create=True) as send:
            report=runtime.main('orphan-apply',self.root,self.proc)
        send.assert_called_once_with(999,signal.SIGTERM)
        self.assertEqual(report['status'],'signal_sent_requires_service_verification')
        self.assertTrue((self.root/'.deploy/receipts/account-orphan-100-shim-0.json').exists())


if __name__=='__main__':unittest.main()
