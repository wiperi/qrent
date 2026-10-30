"""Exercise account-store repair against private temporary files, never Docker/network."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('store_recovery',Path(__file__).with_name('recover_account_store.py'))
store=importlib.util.module_from_spec(spec);spec.loader.exec_module(store)


class StoreRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve()
        quiet=patch('builtins.print');quiet.start();self.addCleanup(quiet.stop)
        (self.root/'.env').write_text('PRIVATE_CONFIG=retained\n')
        (self.root/'docker-compose.yml').write_text('services: {}\n')
        self.volume=self.root/'volume';self.volume.mkdir();(self.volume/'dump.rdb').write_bytes(b'original-redis-state')
        mounts=[{'Type':'volume','Name':'existing','Source':str(self.volume),'Destination':'/data'}]
        self.state={'id':'redis-original','pid':123,'process_state':'Z','health':'unhealthy','data_source':str(self.volume)}
        self.before=[['backend','app-image',1,'old',[]],['db','db-image',2,'old',[]],
                     ['redis-original','redis-image',123,'old',mounts]]
        self.after=copy.deepcopy(self.before);self.after[-1][2:4]=[456,'new']

    def tearDown(self): self.temp.cleanup()

    def test_only_confirmed_unhealthy_stopped_or_exited_process_is_eligible(self):
        for state in ('Z','T','X'):
            self.assertTrue(store.eligible({**self.state,'process_state':state}))
        for state in ('S','R','D','unknown'):
            self.assertFalse(store.eligible({**self.state,'process_state':state}))
        self.assertFalse(store.eligible({**self.state,'health':'healthy'}))

    def test_process_probe_preserves_exited_state_without_network_namespace(self):
        proc=self.root/'proc/123';proc.mkdir(parents=True);(proc/'status').write_text('State:\tZ (zombie)\n')
        row=['redis-original','redis:7.4.2-alpine',123,'unhealthy',self.before[-1][4]]
        with patch.object(store,'command',side_effect=[json.dumps(row),str(self.volume)]):
            self.assertEqual(store.redis_state(self.root/'proc'),self.state)

    def test_different_image_or_volume_does_not_qualify(self):
        row=['redis-original','different-project',123,'unhealthy',self.before[-1][4]]
        with patch.object(store,'command',return_value=json.dumps(row)):
            with self.assertRaisesRegex(RuntimeError,'image'): store.redis_state()

    def test_repair_is_scoped_to_existing_container_and_never_recreates_it(self):
        with patch.object(store.subprocess,'run',return_value=subprocess.CompletedProcess([],0)) as run:
            store.repair_process(self.state)
            self.assertEqual(run.call_args.args[0],['docker','container','restart','--time','10','redis-original'])
            store.repair_process({**self.state,'process_state':'T'})
            self.assertEqual(run.call_args.args[0],['docker','kill','--signal','CONT','redis-original'])

    def test_unknown_process_and_uncertain_timeout_never_retry(self):
        with patch.object(store.subprocess,'run') as run:
            with self.assertRaises(RuntimeError): store.repair_process({**self.state,'process_state':'S'})
            run.assert_not_called()
        with patch.object(store.subprocess,'run',side_effect=subprocess.TimeoutExpired('docker',60)) as run:
            with self.assertRaisesRegex(RuntimeError,'no automatic retry'): store.repair_process(self.state)
            self.assertEqual(run.call_count,1)

    def test_plan_makes_no_backup_or_process_change(self):
        with patch.object(store,'container_rows',return_value=self.before),patch.object(store,'redis_state',return_value=self.state),patch.object(store,'repair_process') as repair:
            result=store.main('plan',self.root)
            self.assertEqual(result['status'],'planned');repair.assert_not_called()
            self.assertFalse((self.root/'.deploy').exists())

    def test_backup_precedes_repair_and_preserves_source_environment_and_other_containers(self):
        def repair(state):
            backups=list((self.root/'.deploy/backups').glob('*.tar.gz'))
            self.assertEqual(len(backups),1)
            with tarfile.open(backups[0]) as archive:
                self.assertEqual(archive.extractfile('redis-data/dump.rdb').read(),b'original-redis-state')
        with patch.object(store,'container_rows',side_effect=[self.before,self.after]),patch.object(store,'redis_state',return_value=self.state),patch.object(store,'repair_process',side_effect=repair),patch.object(store,'local_ping',return_value=True):
            result=store.main('apply',self.root)
        self.assertEqual(result['status'],'verified')
        self.assertEqual((self.volume/'dump.rdb').read_bytes(),b'original-redis-state')
        self.assertEqual((self.root/'.env').read_text(),'PRIVATE_CONFIG=retained\n')
        self.assertEqual(Path(result['backup_path']).stat().st_mode&0o777,0o600)

    def test_mount_image_or_other_process_changes_are_detected(self):
        self.assertTrue(store.preserve_rows(self.before,self.after,'redis-original'))
        for index,field,value in [(0,2,999),(1,1,'new-db-image'),(2,4,[])]:
            rows=copy.deepcopy(self.after);rows[index][field]=value
            self.assertFalse(store.preserve_rows(self.before,rows,'redis-original'))

    def test_failed_repair_keeps_backup_and_never_retries(self):
        with patch.object(store,'container_rows',return_value=self.before),patch.object(store,'redis_state',return_value=self.state),patch.object(store,'repair_process',side_effect=RuntimeError('fixed-safe-message')) as repair:
            with self.assertRaises(RuntimeError): store.main('apply',self.root)
            self.assertEqual(repair.call_count,1)
        self.assertEqual(len(list((self.root/'.deploy/backups').glob('*.tar.gz'))),1)
        receipt=json.loads(next((self.root/'.deploy/receipts').glob('*.json')).read_text())
        self.assertEqual(receipt['status'],'requires_attention')
        self.assertEqual((self.volume/'dump.rdb').read_bytes(),b'original-redis-state')

    def test_volume_change_during_backup_blocks_any_process_change(self):
        with patch.object(store,'container_rows',return_value=self.before),patch.object(store,'redis_state',return_value=self.state),patch.object(store,'volume_signature',side_effect=[{'dump.rdb':(20,1,1,1)},{'dump.rdb':(21,2,2,1)}]),patch.object(store,'repair_process') as repair:
            with self.assertRaisesRegex(RuntimeError,'changed while backing up'): store.main('apply',self.root)
            repair.assert_not_called()


if __name__=='__main__': unittest.main()
