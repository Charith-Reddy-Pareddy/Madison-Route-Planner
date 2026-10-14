import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('frontend route modules parse before the Pages build', () => {
  for (const file of ['api.js', 'transit-routing.js']) {
    execFileSync(process.execPath, ['--check', join(root, 'frontend/src', file)]);
  }
});
