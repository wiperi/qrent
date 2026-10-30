"""Execute deployment against local fake Docker, never a daemon or real secrets."""
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
SHA = 'a' * 40
FAKE_DOCKER = r'''
import json,os,sys
from pathlib import Path
args=sys.argv[1:];root=Path(os.environ['TEST_ROOT']);p=root/'state.json'
s=json.loads(p.read_text())
with (root/'docker.log').open('a') as f:f.write(json.dumps(args)+'\n')
def save():p.write_text(json.dumps(s))
if 'down' in args or 'prune' in args or 'rm' in args:
 print('Unsafe dependency mutation intercepted',file=sys.stderr);sys.exit(64)
if args[0]=='compose':
 if 'config' in args:sys.exit(0)
 if 'ps' in args:
  name=args[-1];print(s.get(name,'healthy'));sys.exit(0)
 if 'up' in args:
  assert '--no-deps' in args and '--no-build' in args and args[-1]=='backend'
  files=[args[i+1] for i,x in enumerate(args) if x=='-f']
  override=Path(files[-1]).read_text()
  if 'rollback-' in override:s.update(backend='backend-restored',image='old-image')
  else:
   s.update(backend='backend-new',image='new-image')
   if s.get('change_db'):s['db']='externally-restarted-db'
  save();sys.exit(0)
if args[0]=='inspect':
 fmt=args[2];name=args[3]
 if fmt=='{{.Image}}':print(s['image'])
 elif fmt=='{{.State.Running}}':print('true')
 elif fmt=='{{json .Mounts}}':print('[{"Type":"volume","Name":"qrent_db_data"}]')
 else:raise AssertionError(fmt)
 sys.exit(0)
if args[0]=='tag':sys.exit(0)
if args[0]=='build':sys.exit(17 if s.get('build_fail') else 0)
if args[0]=='run':
 assert '--network' in args and args[args.index('--network')+1]=='none'
 sys.exit(0)
if args[0]=='exec':
 sys.stdin.read()
 if s.get('rollback_db_fail') and 'backend-restored' in args and 'QRENT_VERIFY_MODE=rollback' in args:sys.exit(19)
 sys.exit(18 if s.get('health_fail') and 'backend-new' in args else 0)
raise AssertionError(args)
'''


class BackendDeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.root = self.home/'qrent'; self.root.mkdir()
        self.bin = self.home/'bin';self.bin.mkdir()
        (self.root/'.env').write_text('DATABASE_URL=local-test-placeholder\nKEEP_ORIGINAL=yes\n')
        (self.root/'docker-compose.yml').write_text('services: {}\n')
        self.state = {'db':'db-original','redis':'redis-original','backend':'backend-original','image':'old-image'}
        for name,body in {'docker':FAKE_DOCKER,'flock':
                'import fcntl,sys\ntry:fcntl.flock(int(sys.argv[-1]),fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError:sys.exit(1)\n'}.items():
            p=self.bin/name;p.write_text('#!'+sys.executable+'\n'+body);p.chmod(0o700)
        self.env=dict(os.environ,HOME=str(self.home),PATH=str(self.bin)+os.pathsep+os.environ['PATH'],
                      TEST_ROOT=str(self.root),QRENT_DEPLOY_ROOT=str(self.root),QRENT_RELEASE_SHA=SHA,
                      QRENT_HEALTH_RETRY_SECONDS='0')

    def tearDown(self):self.temp.cleanup()

    def run_deploy(self):
        (self.root/'state.json').write_text(json.dumps(self.state))
        script=REPO/'ops/deploy_backend.sh'
        if script.exists():command=['bash',str(script)]
        else:
            # Characterize the original inline production script before replacing it.
            text=(REPO/'.github/workflows/cd.yml').read_text().split('          script: |\n',1)[1]
            lines=[]
            for line in text.splitlines():
                if line and not line.startswith('            '):break
                lines.append(line[12:] if line else '')
            body=re.sub(r'\$\{\{[^}]+\}\}','placeholder','\n'.join(lines))
            command=['bash','-ec',body]
        result=subprocess.run(command,env=self.env,capture_output=True,text=True,timeout=10)
        self.after=json.loads((self.root/'state.json').read_text())
        log=self.root/'docker.log';self.commands=[json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
        return result

    def assert_no_dependency_mutations(self):
        self.assertFalse([a for a in self.commands if any(x in a for x in ('down','prune','rm'))])
        for a in self.commands:
            if 'up' in a:self.assertTrue('--no-deps' in a and a[-1]=='backend')

    def test_success_preserves_environment_and_database_containers(self):
        before=(self.root/'.env').read_bytes()
        result=self.run_deploy()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.after['image'],'new-image')
        self.assertEqual(self.after['db'],'db-original')
        self.assertEqual(self.after['redis'],'redis-original')
        self.assertEqual((self.root/'.env').read_bytes(),before)
        self.assert_no_dependency_mutations()
        receipt=json.loads((self.root/'.deploy/receipts'/f'{SHA}.json').read_text())
        self.assertEqual(receipt['status'],'deployed')
        self.assertNotIn('DATABASE_URL',json.dumps(receipt))

    def test_build_failure_keeps_original_backend(self):
        self.state['build_fail']=True
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.after['backend'],'backend-original')
        self.assertTrue(any(a[0]=='build' for a in self.commands))
        self.assert_no_dependency_mutations()

    def test_failed_health_restores_image_without_legacy_schema_push(self):
        self.state['health_fail']=True
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.after['backend'],'backend-restored')
        self.assertEqual(self.after['image'],'old-image')
        self.assert_no_dependency_mutations()
        override=(self.root/'.deploy'/f'rollback-{SHA}.yml').read_text()
        self.assertIn('db:generate',override)
        self.assertNotIn('db push',override)

    def test_missing_environment_fails_before_any_docker_command(self):
        (self.root/'.env').unlink()
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.commands,[])
        self.assertFalse((self.root/'.env').exists())

    def test_rollback_database_failure_does_not_claim_restoration(self):
        self.state.update(health_fail=True,rollback_db_fail=True)
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        receipt=json.loads((self.root/'.deploy/receipts'/f'{SHA}.json').read_text())
        self.assertEqual(receipt['status'],'failed_rollback_requires_attention')

    def test_parallel_deploy_is_rejected_before_docker(self):
        (self.root/'.deploy').mkdir()
        with (self.root/'.deploy/backend.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            result=self.run_deploy()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.commands,[])

    def test_invalid_release_identity_fails_before_docker(self):
        self.env['QRENT_RELEASE_SHA']='untrusted/value'
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.commands,[])

    def test_changed_database_identity_fails_and_restores_only_backend(self):
        self.state['change_db']=True
        result=self.run_deploy();self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.after['backend'],'backend-restored')
        self.assert_no_dependency_mutations()


if __name__=='__main__':unittest.main()
