"""Check the CI SSH boundary with local fake credentials and no network."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
SHA = 'b' * 40
PASSWORD = 'fake-only-$(touch SHOULD_NOT_EXIST)-`echo no`-password'
FAKE_SSH = r'''
import json,os,subprocess,sys
from pathlib import Path
root=Path(os.environ['TEST_ROOT']);log=root/'ssh.jsonl'
args=sys.argv[1:]
assert 'HostKeyAlgorithms=ssh-ed25519' in args
assert 'StrictHostKeyChecking=yes' in args
assert 'HostKeyAlias=qrent-deploy-server' in args
known=next(x.split('=',1)[1] for x in args if x.startswith('UserKnownHostsFile='))
assert Path(known).read_text().startswith('qrent-deploy-server ssh-ed25519 ')
assert os.environ['SSH_ASKPASS_REQUIRE']=='force'
answer=subprocess.check_output([os.environ['SSH_ASKPASS']],text=True).rstrip('\n')
assert answer==os.environ['DEPLOY_SERVER_PASSWORD']
assert answer not in ' '.join(args)
calls=len(log.read_text().splitlines()) if log.exists() else 0
with log.open('a') as f:f.write(json.dumps({'args':args,'stdin':sys.stdin.read()})+'\n')
if calls==0 and os.environ.get('TEST_REJECT_HOST'):
 print('Host key verification failed.',file=sys.stderr);sys.exit(255)
if calls==1 and os.environ.get('TEST_REJECT_DEPLOY'):sys.exit(37)
'''


class ReleaseTransportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bin = self.root/'bin'; self.bin.mkdir()
        ssh = self.bin/'ssh'
        ssh.write_text('#!'+sys.executable+'\n'+FAKE_SSH); ssh.chmod(0o700)
        (self.root/f'backend-{SHA}.tgz').write_text('fake-source-archive')
        self.env = dict(os.environ, PATH=str(self.bin)+os.pathsep+os.environ['PATH'],
                        TEST_ROOT=str(self.root), RUNNER_TEMP=str(self.root), GITHUB_SHA=SHA,
                        DEPLOY_SERVER_HOST='deployment.invalid', DEPLOY_SERVER_USERNAME='qrent',
                        DEPLOY_SERVER_PASSWORD=PASSWORD)

    def tearDown(self): self.temp.cleanup()

    def run_release(self, *args):
        result = subprocess.run(['bash', str(REPO/'ops/release_backend.sh'), *args], cwd=self.root,
                                env=self.env, capture_output=True, text=True, timeout=10)
        log = self.root/'ssh.jsonl'
        self.calls = [json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
        self.assertNotIn(PASSWORD, result.stdout+result.stderr)
        self.assertEqual(list(self.root.glob('qrent-ssh.*')), [])
        self.assertFalse((self.root/'SHOULD_NOT_EXIST').exists())
        return result

    def test_upload_and_deployment_use_the_pinned_algorithm_and_private_askpass(self):
        result = self.run_release()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(self.calls[0]['stdin'], 'fake-source-archive')
        self.assertIn('ops/deploy_backend.sh', self.calls[1]['stdin'])
        self.assertIn(SHA, self.calls[1]['args'])

    def test_host_verification_failure_prevents_deployment(self):
        self.env['TEST_REJECT_HOST'] = '1'
        result = self.run_release()
        self.assertEqual(result.returncode, 255)
        self.assertEqual(len(self.calls), 1)

    def test_remote_failure_is_not_reported_as_a_success(self):
        self.env['TEST_REJECT_DEPLOY'] = '1'
        result = self.run_release()
        self.assertEqual(result.returncode, 37)
        self.assertEqual(len(self.calls), 2)

    def test_invalid_sha_is_rejected_before_connecting(self):
        self.env['GITHUB_SHA'] = 'bad;untrusted'
        result = self.run_release()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls, [])

    def test_empty_credentials_are_rejected_before_connecting(self):
        self.env['DEPLOY_SERVER_PASSWORD'] = ''
        result = self.run_release()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls, [])

    def test_inspection_does_not_require_an_archive_or_start_deployment(self):
        (self.root/f'backend-{SHA}.tgz').unlink()
        result = self.run_release('inspect')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls), 1)
        self.assertIn('docker system df', self.calls[0]['stdin'])
        self.assertNotIn('deploy_backend.sh', self.calls[0]['stdin'])
        self.assertNotIn('docker build', self.calls[0]['stdin'])


if __name__ == '__main__': unittest.main()
