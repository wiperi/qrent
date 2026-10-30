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
    def test_default_retirement_does_not_inspect_or_remove_images(self):
        with patch.object(capacity, 'command') as run:
            self.assertIsNone(capacity.retirement_candidate(Path('/unused'), 'none', set()))
            run.assert_not_called()

    def retirement_fixture(self, root):
        ref='qrent-backend:release-'+'a'*40
        receipts=root/'.deploy/receipts'; receipts.mkdir(parents=True)
        receipt={'status':'deployed','release':'a'*40,'new_backend_image':ref,
                 'previous_backend_image':'sha256:'+'b'*64}
        (receipts/('a'*40+'.json')).write_text(json.dumps(receipt))
        return ref,receipt

    def protected_images(self):
        return {('sha256:'+'a'*64,'qrent-backend','release-'+'a'*40),
                ('sha256:'+'b'*64,'qrent-backend','rollback-'+'a'*40)}

    def test_retirement_preserves_current_previous_and_all_stopped_container_images(self):
        for image in ('a'*64, 'b'*64, 'f'*64):
            with self.subTest(image=image), tempfile.TemporaryDirectory() as temp:
                root=Path(temp);ref,_=self.retirement_fixture(root)
                candidate=('sha256:'+image,'qrent-backend','release-'+'d'*40)
                replies=[json.dumps(['sha256:'+'a'*64,ref]),'current\nstopped',
                         'sha256:'+'a'*64+'\nsha256:'+'f'*64]
                with patch.object(capacity,'command',side_effect=replies):
                    with self.assertRaisesRegex(ValueError,'must be preserved|aliases'):
                        capacity.retirement_candidate(root,'d'*40,{candidate,*self.protected_images()})

    def test_only_an_unreferenced_exact_release_with_verified_rollback_is_eligible(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);ref,_=self.retirement_fixture(root)
            candidate=('sha256:'+'c'*64,'qrent-backend','release-'+'d'*40)
            replies=[json.dumps(['sha256:'+'a'*64,ref]),'current', 'sha256:'+'a'*64]
            with patch.object(capacity,'command',side_effect=replies) as run:
                self.assertEqual(capacity.retirement_candidate(root,'d'*40,{candidate,*self.protected_images()}),candidate)
                self.assertFalse(any('rm' in call.args for call in run.call_args_list))
            with patch.object(capacity,'command',return_value=replies[0]):
                with self.assertRaisesRegex(ValueError,'aliases'):
                    capacity.retirement_candidate(root,'d'*40,
                        {candidate,(candidate[0],'another-project','latest'),*self.protected_images()})
                with self.assertRaisesRegex(ValueError,'must already exist'):
                    capacity.retirement_candidate(root,'d'*40,{candidate})
            path=root/'.deploy/receipts'/('a'*40+'.json')
            data=json.loads(path.read_text());data['status']='failed_original_backend_kept';path.write_text(json.dumps(data))
            with patch.object(capacity,'command',return_value=replies[0]):
                with self.assertRaisesRegex(ValueError,'rollback receipt'):
                    capacity.retirement_candidate(root,'d'*40,{candidate})

    def test_invalid_retirement_identity_stops_before_host_inspection(self):
        with patch.object(capacity,'command') as run:
            with self.assertRaises(AssertionError): capacity.main('apply',2,'168h','bad;command')
            run.assert_not_called()

    def test_build_cache_age_is_bounded_and_never_prunes_runtime_images_or_volumes(self):
        for age in ('168h', '24h', '1h'):
            with self.subTest(age=age), patch.object(capacity, 'command', return_value='Total: 1MB') as run:
                capacity.prune_build_cache(age)
                run.assert_called_once_with('docker', 'builder', 'prune', '--all', '-f', '--filter', 'until='+age)
        for age in ('0h', '--all', '1h; rm -rf /', ''):
            with self.subTest(age=age), patch.object(capacity, 'command') as run:
                with self.assertRaises(ValueError): capacity.prune_build_cache(age)
                run.assert_not_called()

    def test_invalid_cache_age_stops_before_host_inspection_or_cleanup(self):
        with patch.object(capacity, 'command') as run:
            with self.assertRaises(AssertionError): capacity.main('apply', 2, '0h')
            run.assert_not_called()

    def test_snapshot_retains_image_identity_and_rollback_tags(self):
        rows='["sha256:one","qrent-backend","release-previous"]\n["sha256:one","qrent-backend","rollback-current"]\n["sha256:two","mysql","8.0"]'
        with patch.object(capacity, 'command', return_value=rows) as run:
            snapshot=capacity.image_inventory()
            self.assertIn(('sha256:one','qrent-backend','rollback-current'),snapshot)
            self.assertIn(('sha256:two','mysql','8.0'),snapshot)
            self.assertEqual(len(snapshot),3)
            self.assertEqual(run.call_args[0][:3],('docker','image','ls'))

    def test_only_named_caches_are_candidates(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            allowed = home/'.npm/_cacache'; allowed.mkdir(parents=True)
            (home/'qrent').mkdir()
            self.assertEqual(capacity.cache_paths(home, []), [allowed])

    def test_build_tool_caches_require_no_live_process_and_preserve_other_tools(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            for name in ('node-gyp', 'typescript', 'n8n'):
                (home/'.cache'/name).mkdir(parents=True)
            (home/'.nvm/versions/node').mkdir(parents=True)
            with patch.object(capacity, 'process_uses', return_value=True):
                self.assertEqual(capacity.cache_paths(home, []), [])
            with patch.object(capacity, 'process_uses', return_value=False):
                self.assertEqual(set(capacity.cache_paths(home, [])),
                                 {home/'.cache/node-gyp', home/'.cache/typescript'})
                self.assertEqual(capacity.cache_paths(home, [home/'.cache/node-gyp/include',
                                                         home/'.cache/typescript']), [])

    def test_apt_download_cache_requires_a_real_unmounted_directory_and_apt(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp).resolve()/'archives'; path.mkdir()
            with patch.object(capacity.shutil, 'which', return_value='/usr/bin/apt-get'):
                self.assertEqual(capacity.apt_cache_path([], path), path)
                self.assertIsNone(capacity.apt_cache_path([path/'partial'], path))
                self.assertIsNone(capacity.apt_cache_path([path.parent], path))
                link = path.parent/'link'; link.symlink_to(path, target_is_directory=True)
                self.assertIsNone(capacity.apt_cache_path([], link))
            with patch.object(capacity.shutil, 'which', return_value=None):
                self.assertIsNone(capacity.apt_cache_path([], path))

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

    def test_npx_is_kept_when_a_process_may_use_it(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve(); cache = home/'.npm/_npx'; cache.mkdir(parents=True)
            with patch.object(capacity, 'process_uses', return_value=True):
                self.assertEqual(capacity.cache_paths(home, []), [])
            with patch.object(capacity, 'process_uses', return_value=False):
                self.assertEqual(capacity.cache_paths(home, []), [cache])

    def test_process_command_reference_blocks_npx_removal(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); proc = root/'123'; proc.mkdir()
            (proc/'cmdline').write_bytes(b'node\x00/cache/npx/tool.js\x00')
            self.assertTrue(capacity.process_uses(Path('/cache/npx'), root))

    def test_missing_process_inventory_blocks_npx_removal(self):
        self.assertTrue(capacity.process_uses(Path('/cache/npx'), Path('/path-that-does-not-exist')))

    def test_empty_process_inventory_blocks_npx_removal(self):
        with tempfile.TemporaryDirectory() as temp:
            self.assertTrue(capacity.process_uses(Path('/cache/npx'), Path(temp)))

    def test_empty_cmdline_does_not_hide_an_open_cache_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); proc = root/'123'; (proc/'fd').mkdir(parents=True)
            (proc/'cmdline').write_bytes(b'')
            (proc/'fd/3').symlink_to('/cache/npx/tool.js')
            self.assertTrue(capacity.process_uses(Path('/cache/npx'), root))

    def test_missing_metadata_for_existing_pid_blocks_removal(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); proc = root/'123'; proc.mkdir()
            (proc/'cmdline').write_bytes(b'node\x00')
            self.assertTrue(capacity.process_uses(Path('/cache/npx'), root))

    def test_fully_inspected_unrelated_process_does_not_block(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); proc = root/'123'; task = proc/'task/123'; (task/'fd').mkdir(parents=True)
            (proc/'stat').write_text('123 (node) S 1 1 1 0 -1 0')
            (task/'stat').write_text('123 (node) S 1 1 1 0 -1 0')
            (task/'cmdline').write_bytes(b'node\x00/app.js\x00')
            (task/'maps').write_bytes(b''); (task/'environ').write_bytes(b'')
            (task/'cwd').symlink_to('/srv/app'); (task/'exe').symlink_to('/usr/bin/node')
            self.assertFalse(capacity.process_uses(Path('/cache/npx'), root))

    def test_verified_kernel_thread_does_not_block(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); proc = root/'2'; proc.mkdir()
            (proc/'stat').write_text('2 (kthreadd) S 0 0 0 0 -1 2097152')
            self.assertFalse(capacity.process_uses(Path('/cache/npx'), root))

    def test_zombie_leader_does_not_hide_a_live_worker_reference(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); proc = root/'123'; (proc/'fd').mkdir(parents=True)
            (proc/'stat').write_text('123 (node) Z 1 1 1 0 -1 0')
            for tid,state in [('123','Z'),('124','S')]:
                task = proc/'task'/tid; (task/'fd').mkdir(parents=True)
                (task/'stat').write_text(tid+' (node) '+state+' 1 1 1 0 -1 0')
                (task/'cmdline').write_bytes(b'node\x00/cache/npx/tool.js\x00')
            self.assertTrue(capacity.process_uses(Path('/cache/npx'), root))

    def test_container_snapshot_does_not_depend_on_mount_order(self):
        mounts=[{'Source':'/test/data','Destination':'/var/lib/mysql'},
                {'Source':'/test/init','Destination':'/docker-entrypoint-initdb.d'}]
        first=json.dumps(['db','image',123,'unchanged',mounts])
        second=json.dumps(['db','image',123,'unchanged',list(reversed(mounts))])
        other=json.dumps(['redis','image',456,'unchanged',[]])
        third=json.dumps(['backend','image',789,'unchanged',[]])
        with patch.object(capacity,'command',side_effect=['db\nredis\nbackend',first+'\n'+other+'\n'+third,
                                                         'redis\ndb\nbackend',other+'\n'+second+'\n'+third]):
            self.assertEqual(capacity.containers(),capacity.containers())


if __name__ == '__main__': unittest.main()
