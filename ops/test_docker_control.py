"""Control-plane recovery tests: fake API, temporary config and no real services."""
import importlib.util
import json
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('control',Path(__file__).with_name('recover_docker_control.py'))
control=importlib.util.module_from_spec(spec);spec.loader.exec_module(control)


class ControlRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve()
        quiet=patch('builtins.print');quiet.start();self.addCleanup(quiet.stop)
        self.redis={'id':'redis','running':False,'manually_stopped':True,'restart_policy':'unless-stopped'}
        self.before={'db':{'process':{'pid':111,'state':'S','started':'100'},'image':'same','mounts_sha256':'same'}}

    def tearDown(self):self.temp.cleanup()

    def test_restart_requires_verified_active_live_restore_and_manually_stopped_redis(self):
        self.assertTrue(control.restart_allowed({'LiveRestoreEnabled':True},self.redis))
        for info in (None,{}, {'LiveRestoreEnabled':False}):self.assertFalse(control.restart_allowed(info,self.redis))
        for changes in ({'running':True},{'manually_stopped':False},{'restart_policy':'always'}):
            self.assertFalse(control.restart_allowed({'LiveRestoreEnabled':True},{**self.redis,**changes}))

    def test_enable_preserves_all_other_daemon_options_and_sends_only_hup(self):
        config=self.root/'daemon.json';config.write_text(json.dumps({'log-driver':'json-file','unrelated':'retained'}))
        with patch.object(control,'controller',return_value=(123,Path('/usr/bin/dockerd'),config,[])),patch.object(control,'kernel_identity',return_value={'pid':123,'started':'same'}),patch.object(control.subprocess,'run',return_value=subprocess.CompletedProcess([],0)),patch.object(control.os,'pidfd_open',return_value=999,create=True),patch.object(control.os,'close'),patch.object(control.signal,'pidfd_send_signal',create=True) as send,patch.object(control,'api',return_value={'LiveRestoreEnabled':True}):
            self.assertTrue(control.enable_live_restore(self.root));send.assert_called_once_with(999,signal.SIGHUP)
        self.assertEqual(json.loads(config.read_text()),{'log-driver':'json-file','unrelated':'retained','live-restore':True})
        self.assertTrue(list((self.root/'.deploy/docker-control').glob('daemon-before-*')))

    def test_cli_conflict_does_not_change_configuration(self):
        config=self.root/'daemon.json';config.write_text('{}')
        with patch.object(control,'controller',return_value=(123,Path('/usr/bin/dockerd'),config,[b'--live-restore=false'])),patch.object(control,'kernel_identity',return_value={'pid':123,'started':'same'}):
            with self.assertRaisesRegex(RuntimeError,'command-line'):control.enable_live_restore(self.root)
        self.assertEqual(config.read_text(),'{}')

    def test_restart_refuses_unknown_live_restore_without_any_service_command(self):
        with patch.object(control,'disk_snapshot',return_value=(self.before,self.redis)),patch.object(control,'api',return_value={}),patch.object(control.subprocess,'run') as run:
            with self.assertRaisesRegex(RuntimeError,'not verified'):control.main('restart-controller',self.root)
            run.assert_not_called()

    def test_controller_restart_preserves_business_process_fingerprints(self):
        def api(path):return {'LiveRestoreEnabled':True} if path=='/info' else {'Version':'28.5.0'}
        def command(*args):return 'process' if 'KillMode' in args else ''
        answers=[subprocess.CompletedProcess([],0,stdout='Docker version 28.5.2, build local'),subprocess.CompletedProcess([],0)]
        with patch.object(control,'disk_snapshot',return_value=(self.before,self.redis)),patch.object(control,'api',side_effect=api),patch.object(control,'controller',return_value=(123,Path('/usr/bin/dockerd'),self.root/'daemon.json',[])),patch.object(control,'command',side_effect=command),patch.object(control.subprocess,'run',side_effect=answers) as run:
            result=control.main('restart-controller',self.root)
            self.assertTrue(result['business_process_identity_preserved'])
            self.assertEqual(run.call_args.args[0],['systemctl','restart','docker.service'])

    def test_stop_hook_prevents_controller_restart(self):
        def api(path):return {'LiveRestoreEnabled':True} if path=='/info' else {'Version':'28.5.0'}
        with patch.object(control,'disk_snapshot',return_value=(self.before,self.redis)),patch.object(control,'api',side_effect=api),patch.object(control,'controller',return_value=(123,Path('/usr/bin/dockerd'),self.root/'daemon.json',[])),patch.object(control,'command',return_value='custom stop hook'),patch.object(control.subprocess,'run',return_value=subprocess.CompletedProcess([],0,stdout='Docker version 28.5.2')) as run:
            with self.assertRaisesRegex(RuntimeError,'stop hooks'):control.main('restart-controller',self.root)
            self.assertEqual(run.call_count,1)

    def test_disk_snapshot_keeps_running_business_processes_and_stopped_redis_separate(self):
        data=self.root/'containers';proc=self.root/'proc'
        for index,name in enumerate(('qrent-backend-1','qrent-db-1','n8n-n8n-1','qrent-redis-1'),1):
            folder=data/str(index);folder.mkdir(parents=True)
            row={'ID':str(index),'Name':'/'+name,'State':{'Running':index<4,'Pid':100+index},
                 'Image':'same','MountPoints':{},'HasBeenManuallyStopped':True}
            (folder/'config.v2.json').write_text(json.dumps(row))
            if index==4:(folder/'hostconfig.json').write_text(json.dumps({'RestartPolicy':{'Name':'unless-stopped'}}))
            else:
                task=proc/str(100+index);task.mkdir(parents=True);fields=['S','1']+['0']*18;fields[19]='123'
                (task/'stat').write_text(str(100+index)+' (business) '+' '.join(fields))
        rows,redis=control.disk_snapshot(data,proc)
        self.assertEqual(len(rows),3);self.assertFalse(redis['running']);self.assertTrue(redis['manually_stopped'])
        self.assertEqual(rows['1']['process'],{'pid':101,'started':'123'})


if __name__=='__main__':unittest.main()
