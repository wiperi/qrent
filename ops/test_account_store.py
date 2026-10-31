"""Exercise account-store repair against private temporary files, never Docker/network."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile
import io
import sys
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
        self.state={'id':'redis-original','pid':123,'process_state':'Z','health':'unhealthy','data_source':str(self.volume),
                    'running':True,'status':'running','exit_code':0,'ports':{}}
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
        row=['redis-original','redis:7.4.2-alpine',123,'unhealthy',self.before[-1][4],True,'running',0,{}]
        with patch.object(store,'command',side_effect=[json.dumps(row),str(self.volume)]):
            self.assertEqual(store.redis_state(self.root/'proc'),self.state)

    def test_different_image_or_volume_does_not_qualify(self):
        row=['redis-original','different-project',123,'unhealthy',self.before[-1][4],True,'running',0,{}]
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

    def test_recovery_during_backup_blocks_a_second_process_action(self):
        recovered={**self.state,'pid':456,'process_state':'S','health':'healthy'}
        with patch.object(store,'container_rows',return_value=self.before),patch.object(store,'redis_state',side_effect=[self.state,self.state,recovered]),patch.object(store,'repair_process') as repair:
            with self.assertRaisesRegex(RuntimeError,'state changed during backup'): store.main('apply',self.root)
            repair.assert_not_called()

    def test_start_requires_a_known_clean_exit_and_uses_the_same_container(self):
        stopped={**self.state,'running':False,'status':'exited','pid':0,'process_state':'unknown'}
        self.assertTrue(store.eligible_start(stopped));self.assertFalse(store.eligible_start(self.state))
        self.assertFalse(store.eligible_start({**stopped,'exit_code':137}))
        with patch.object(store.subprocess,'run',return_value=subprocess.CompletedProcess([],0)) as run:
            store.repair_process(stopped,start=True)
            self.assertEqual(run.call_args.args[0],['systemctl','start','qrent-account-store.service'])

    def setup_reconciled_orphan(self):
        deploy=self.root/'.deploy';(deploy/'receipts').mkdir(parents=True);(deploy/'backups').mkdir()
        identity='a'*64;backup=deploy/'backups/original.tar.gz';backup.write_bytes(b'original private backup')
        digest=hashlib.sha256(backup.read_bytes()).hexdigest();proc=self.root/'proc';business={};tasks=[]
        for index in range(3):
            key=chr(ord('b')+index)*64;pid=11+index;parent=501+index;started=str(100+index)
            directory=proc/str(pid);directory.mkdir(parents=True);fields=['S',str(parent)]+['0']*18;fields[19]=started
            (directory/'stat').write_text(str(pid)+' (business) '+' '.join(fields))
            business[key]={'init':{'pid':pid,'parent':parent,'started':started}};tasks.append(key+' '+str(pid)+' RUNNING')
        (deploy/'receipts/account-store-20261031.json').write_text(json.dumps({'candidate':{'id':identity,'data_source':str(self.volume)},'backup_path':str(backup),'backup_sha256':digest}))
        (deploy/'receipts/account-orphan-100-1000.json').write_text(json.dumps({'original_store_id':identity,
            'status':'signal_sent_requires_service_verification','shim_frozen_before_termination':True,
            'business_processes_preserved_before_signal':True,'shim':{'pid':100,'started':'1000'},
            'init':{'pid':123,'started':'1230'},'business_processes':business,'backup_sha256':digest}))
        state={**self.state,'id':identity,'running':False,'status':'exited','pid':0,'exit_code':128,'process_state':'unknown'}
        return state,proc,'TASK PID STATUS\n'+'\n'.join(tasks)

    def test_exit_128_resume_requires_orphan_absence_and_preserved_business_tasks(self):
        state,proc,tasks=self.setup_reconciled_orphan()
        self.assertFalse(store.eligible_start(state));self.assertTrue(store.eligible_resume(state))
        with patch.object(store,'command',return_value=tasks):
            proof=store.orphan_cleared(self.root,state,proc)
        self.assertTrue(proof['runtime_task_absent'])
        with patch.object(store,'command',return_value=tasks+'\n'+state['id']+' 123 RUNNING'):
            with self.assertRaisesRegex(RuntimeError,'Unexpected runtime'):store.orphan_cleared(self.root,state,proc)

    def test_uncertain_old_process_or_prior_resume_marker_blocks_replay(self):
        state,proc,tasks=self.setup_reconciled_orphan();directory=proc/'100';directory.mkdir()
        fields=['S','1']+['0']*18;fields[19]='1000';(directory/'stat').write_text('100 (old shim) '+' '.join(fields))
        with patch.object(store,'command',return_value=tasks):
            with self.assertRaisesRegex(RuntimeError,'still present'):store.orphan_cleared(self.root,state,proc)
            (directory/'stat').unlink();proof=store.orphan_cleared(self.root,state,proc)
            Path(proof['attempt_marker']).write_text('{}')
            with self.assertRaisesRegex(RuntimeError,'do not repeat'):store.orphan_cleared(self.root,state,proc)

    def test_resume_applies_once_with_a_new_backup_and_same_guarded_service(self):
        state,proc,tasks=self.setup_reconciled_orphan()
        with patch.object(store,'command',return_value=tasks):proof=store.orphan_cleared(self.root,state,proc)
        before=copy.deepcopy(self.before);before[-1][0]=state['id'];before[-1][2]=0
        after=copy.deepcopy(before);after[-1][2:4]=[456,'new']
        with patch.object(store,'container_rows',side_effect=[before,after]),patch.object(store,'redis_state',return_value=state),patch.object(store,'orphan_cleared',return_value=proof),patch.object(store,'guard_public_ports',return_value={'persistent':True}),patch.object(store,'repair_process') as repair,patch.object(store,'local_ping',return_value=True):
            report=store.main('resume-apply',self.root,proc)
        repair.assert_called_once_with(state,start=True,resume=True)
        self.assertEqual(report['status'],'verified');self.assertTrue(Path(proof['attempt_marker']).exists())
        self.assertEqual((self.volume/'dump.rdb').read_bytes(),b'original-redis-state')

    def test_start_guards_public_ports_before_any_container_start(self):
        stopped={**self.state,'running':False,'status':'exited','pid':0,'process_state':'unknown'}
        guarded=[]
        def guard(root,state):guarded.append(True);return {'rules':2,'persistent':True}
        def repair(state,start=False):self.assertTrue(start);self.assertEqual(guarded,[True])
        with patch.object(store,'container_rows',side_effect=[self.before,self.after]),patch.object(store,'redis_state',return_value=stopped),patch.object(store,'guard_public_ports',side_effect=guard),patch.object(store,'repair_process',side_effect=repair),patch.object(store,'local_ping',return_value=True):
            self.assertEqual(store.main('start-apply',self.root)['status'],'verified')

    def test_firewall_rules_match_only_redis_host_ports_and_never_docker_internal_ips(self):
        interfaces=[{'ifname':'eth0','addr_info':[{'local':'198.51.100.78','scope':'global'},
                    {'local':'2001:db8::1','scope':'global'}]},
                    {'ifname':'br-private','addr_info':[{'local':'172.18.0.1','scope':'global'}]}]
        rules=store.public_port_rules({'6379/tcp':[{'HostIp':'0.0.0.0','HostPort':'6379'}]},interfaces)
        self.assertEqual(len(rules),2)
        for rule in rules:
            self.assertEqual(rule[0],'iptables');self.assertIn('198.51.100.78',rule)
            self.assertNotIn('172.18.0.1',rule);self.assertNotIn('3306',rule)
            self.assertEqual(rule[-2:],['-j','DROP'])
        self.assertEqual(store.public_port_rules({'6379/tcp':[{'HostIp':'127.0.0.1','HostPort':'6379'}]},interfaces),[])
        v6=store.public_port_rules({'6379/tcp':[{'HostIp':'::','HostPort':'6379'}]},interfaces)
        self.assertEqual(len(v6),2);self.assertTrue(all(row[0]=='ip6tables' for row in v6))

    def test_unrecognized_port_or_interface_blocks_start(self):
        for ports in ({'3306/tcp':[{'HostPort':'3306'}]}, {'6379/tcp':[{'HostPort':'22'}]},
                      {'6379/tcp':[{'HostPort':'6379','HostIp':'0.0.0.0'}]}):
            with self.assertRaises(RuntimeError):store.public_port_rules(ports,[])

    def test_persistent_guard_rejects_native_ipv6_without_a_forward_hook(self):
        rules=[['iptables','DOCKER-USER','-p','tcp','-j','DROP'],
               ['ip6tables','INPUT','-p','tcp','-j','DROP']]
        data=json.dumps({'rules':rules,'container':'a'*64})
        def run(args,**kwargs):
            return subprocess.CompletedProcess(args,1 if args[0]=='ip6tables' and 'FORWARD' in args else 0)
        def output(args,**kwargs):return json.dumps({'qrent-network':{}}) if args[1]=='inspect' else 'true'
        with patch('builtins.open',return_value=io.StringIO(data)),patch.object(sys,'argv',['guard.py','rules.json']),patch.object(store.subprocess,'run',side_effect=run),patch.object(store.subprocess,'check_output',side_effect=output):
            with self.assertRaisesRegex(SystemExit,'Native IPv6'):exec(store.PORT_GUARD,{})
        def proxy(args,**kwargs):return json.dumps({'qrent-network':{}}) if args[1]=='inspect' else 'false'
        with patch('builtins.open',return_value=io.StringIO(data)),patch.object(sys,'argv',['guard.py','rules.json']),patch.object(store.subprocess,'run',side_effect=run),patch.object(store.subprocess,'check_output',side_effect=proxy):
            exec(store.PORT_GUARD,{})

    def test_only_redis_startup_depends_on_successful_guard(self):
        (self.root/'.deploy').mkdir();units=self.root/'units';units.mkdir()
        state={**self.state,'id':'a'*64,'ports':{'6379/tcp':[{'HostIp':'0.0.0.0','HostPort':'6379'}]}}
        interfaces=[{'ifname':'eth0','addr_info':[{'local':'198.51.100.78','scope':'global'}]}]
        def command(*args):return json.dumps(interfaces) if args[:3]==('ip','-j','addr') else ''
        with patch.object(store,'command',side_effect=command) as commands,patch.object(store.os,'geteuid',return_value=0):
            store.guard_public_ports(self.root,state,units)
        text=(units/'qrent-account-store.service').read_text()
        self.assertIn('ExecStartPre=',text);self.assertIn('docker start --attach '+'a'*64,text)
        self.assertIn('After=docker.service',text);self.assertNotIn('Before=docker.service',text)
        self.assertIn(('docker','update','--restart=no','a'*64),[call.args for call in commands.call_args_list])
        self.assertFalse(any('restart' in call.args for call in commands.call_args_list))


if __name__=='__main__': unittest.main()
