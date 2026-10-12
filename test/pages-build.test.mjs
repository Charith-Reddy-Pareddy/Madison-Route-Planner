import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Pages output keeps app assets and real CSVs under the repository path', () => {
  const temp = mkdtempSync(join(tmpdir(), 'madison-pages-'));
  const output = join(temp, 'site');
  try {
    execFileSync('sh', [join(root, 'scripts/build-pages.sh'), output], { cwd: temp });

    const html = readFileSync(join(output, 'index.html'), 'utf8');
    assert.match(html, /href="frontend\/styles\.css"/);
    assert.match(html, /src="frontend\/app\.mjs"/);
    assert.equal(existsSync(join(output, 'frontend', 'app.mjs')), true);
    assert.equal(existsSync(join(output, 'frontend', 'route-planner.mjs')), true);
    assert.equal(existsSync(join(output, 'frontend', 'app.test.mjs')), false);
    assert.match(readFileSync(join(output, 'data', 'locations.csv'), 'utf8'), /^id,name,lat,lon,/);
    assert.match(readFileSync(join(output, 'data', 'roads.csv'), 'utf8'), /^from,to,walkMiles,/);

    const appUrl = new URL('https://example.github.io/madison-route-planning/frontend/app.mjs');
    assert.equal(new URL('../data/locations.csv', appUrl).pathname,
      '/madison-route-planning/data/locations.csv');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('Pages builder refuses to overwrite an existing output directory', () => {
  const temp = mkdtempSync(join(tmpdir(), 'madison-pages-'));
  try {
    const result = (() => {
      try {
        execFileSync('sh', [join(root, 'scripts/build-pages.sh'), temp], {
          cwd: root,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        return null;
      } catch (error) {
        return error;
      }
    })();
    assert.equal(result?.status, 2);
    assert.match(result.stderr.toString(), /Output path already exists/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
