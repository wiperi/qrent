import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('production startup starts only the backend and cannot push the database schema', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qrent-startup-'));
  try {
    mkdirSync(join(directory, 'packages/shared'), { recursive: true });
    const log = join(directory, 'commands.log');
    const fakePnpm = join(directory, 'pnpm');
    writeFileSync(fakePnpm, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$QRENT_STARTUP_LOG"\n', {
      mode: 0o700,
    });
    const result = spawnSync('/bin/sh', [resolve(__dirname, '../startup.sh')], {
      cwd: directory,
      env: { PATH: directory, QRENT_STARTUP_LOG: log },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual(['--filter @qrent/backend start']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
