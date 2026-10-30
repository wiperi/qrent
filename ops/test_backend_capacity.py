"""Safety checks for the narrowly scoped host-cache recovery policy."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import json

spec = importlib.util.spec_from_file_location('capacity', Path(__file__).with_name('recover_backend_capacity.py'))
capacity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capacity)


class CapacitySafetyTests(unittest.TestCase):
    def test_only_named_caches_are_candidates(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            allowed = home/'.npm/_cacache'; allowed.mkdir(parents=True)
            (home/'qrent').mkdir()
            self.assertEqual(capacity.cache_paths(home, []), [allowed])

    def test_bind_mounted_cache_is_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            cache = home/'.npm/_cacache'; (cache/'in-use').mkdir(parents=True)
            self.assertEqual(capacity.cache_paths(home, [cache/'in-use']), [])

    def test_symlink_cache_is_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            (home/'.npm').mkdir(); (home/'private').mkdir()
            (home/'.npm/_cacache').symlink_to(home/'private', target_is_directory=True)
            self.assertEqual(capacity.cache_paths(home, []), [])

    def test_resize_keeps_existing_security_options_and_has_fixed_limits(self):
        options = capacity.resize_options('rw,nosuid,nodev,noexec,relatime,size=97733k,nr_inodes=122333')
        self.assertIn('nosuid', options); self.assertIn('nodev', options); self.assertIn('noexec', options)
        self.assertIn('size=192M', options); self.assertIn('nr_inodes=262144', options)
        self.assertNotIn('size=97733k', options)

    def test_host_and_stopped_container_mounts_are_both_protected(self):
        results = [json.dumps({'filesystems':[{'target':'/','children':[{'target':'/host-bind'}]}]}),
                   'running\nstopped', '[{"Source":"/active-cache"}]\n[{"Source":"/stopped-cache"}]']
        with patch.object(capacity, 'command', side_effect=results) as run:
            mounts = capacity.protected_mounts()
        self.assertEqual(set(mounts), {Path('/host-bind'),Path('/active-cache'),Path('/stopped-cache')})
        self.assertIn(('docker','ps','-aq','--no-trunc'), [c.args for c in run.call_args_list])


if __name__ == '__main__': unittest.main()
