import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Pages build serves the app assets and real location data', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'madison-pages-'));
  const output = join(temp, 'site');
  let server;

  try {
    execFileSync('sh', [join(root, 'scripts/build-pages.sh'), output], { cwd: temp });
    const html = readFileSync(join(output, 'index.html'), 'utf8');
    const js = html.match(/src="\.\/assets\/([^"]+\.js)"/)?.[1];
    const css = html.match(/href="\.\/assets\/([^"]+\.css)"/)?.[1];
    assert.ok(js, 'built page should reference its JavaScript bundle');
    assert.ok(css, 'built page should reference its stylesheet');

    const probe = createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', resolve);
    });
    const port = probe.address().port;
    await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
    server = spawn('python3', [
      '-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', output,
    ], { stdio: 'ignore' });

    const origin = `http://127.0.0.1:${port}`;
    let page;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (server.exitCode !== null) throw new Error('Local Pages server exited before becoming ready.');
      try {
        page = await fetch(origin);
        break;
      } catch {
        await delay(50);
      }
    }
    assert.equal(page?.status, 200);
    assert.match(await page.text(), new RegExp(`src="\\./assets/${js}"`));
    assert.equal((await fetch(`${origin}/assets/${js}`)).status, 200);
    assert.equal((await fetch(`${origin}/assets/${css}`)).status, 200);
    const locations = await fetch(`${origin}/data/locations.csv`);
    assert.equal(locations.status, 200);
    assert.match(await locations.text(), /^id,name,lat,lon,/);
  } finally {
    if (server) {
      server.kill();
      if (server.exitCode === null) await once(server, 'exit');
    }
    rmSync(temp, { recursive: true, force: true });
  }
});
