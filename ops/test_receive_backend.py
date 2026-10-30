"""Execute the real receiver's failure cleanup without Docker or network."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]
SHA = 'c'*40
BODY = b'local-fake-image-only'


class ImageReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root/'.env').write_text('DUMMY=keep\n')
        (self.root/'docker-compose.yml').write_text('services: {}\n')
        stage = self.root/'.deploy/releases'/SHA/'ops'; stage.mkdir(parents=True)
        (stage/'deploy_backend.sh').write_text('''set -eu
touch "$QRENT_DEPLOY_ROOT/invoked"
if [ "${TEST_REJECT_DEPLOY:-0}" = 1 ]; then exit 37; fi
mkdir -p "$QRENT_DEPLOY_ROOT/.deploy/receipts"
printf '{"status":"deployed"}' > "$QRENT_DEPLOY_ROOT/.deploy/receipts/$QRENT_RELEASE_SHA.json"
''')
        self.env = dict(os.environ, QRENT_DEPLOY_ROOT=str(self.root))
        if not shutil.which('sha256sum'):
            bin_dir = self.root/'bin'; bin_dir.mkdir()
            checker = bin_dir/'sha256sum'
            checker.write_text('#!'+sys.executable+'''\nimport hashlib,sys
from pathlib import Path
expected,path=sys.stdin.read().rstrip('\\n').split('  ',1)
sys.exit(0 if hashlib.sha256(Path(path).read_bytes()).hexdigest()==expected else 1)
'''); checker.chmod(0o700)
            self.env['PATH'] = str(bin_dir)+os.pathsep+os.environ['PATH']

    def tearDown(self): self.temp.cleanup()

    def receive(self, body=BODY):
        script = Path(os.environ.get('QRENT_TEST_RECEIVER', str(REPO/'ops/receive_backend_image.sh')))
        result = subprocess.run(['bash',str(script),SHA,hashlib.sha256(BODY).hexdigest()],
                                input=body,env=self.env,capture_output=True,timeout=10)
        uploads = self.root/'.deploy/uploads'
        self.assertEqual(list(uploads.iterdir()), [])
        self.assertEqual((self.root/'.env').read_text(), 'DUMMY=keep\n')
        return result

    def test_success_cleans_this_archive(self):
        result = self.receive()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.root/'invoked').exists())

    def test_failed_load_or_deployment_cleans_archive_and_keeps_error(self):
        self.env['TEST_REJECT_DEPLOY'] = '1'
        result = self.receive()
        self.assertEqual(result.returncode, 37, result.stderr)
        self.assertTrue((self.root/'invoked').exists())

    def test_truncated_upload_is_deleted_without_invoking_deployment(self):
        result = self.receive(b'cut')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root/'invoked').exists())

    def test_empty_upload_is_deleted_without_invoking_deployment(self):
        result = self.receive(b'')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root/'invoked').exists())


if __name__ == '__main__': unittest.main()
