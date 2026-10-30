"""Kernel-only recovery boundaries, using fake proc files and fake pidfds."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import signal
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


if __name__=='__main__':unittest.main()
