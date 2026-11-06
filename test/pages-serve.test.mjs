import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
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

    server = createServer(async (req, res) => {
      const path = new URL(req.url, 'http://127.0.0.1').pathname;
      const file = resolve(output, `.${path === '/' ? '/index.html' : path}`);
      if (file !== output && !file.startsWith(`${output}${sep}`)) {
        res.writeHead(403).end();
        return;
      }
      try {
        const body = await readFile(file);
        res.writeHead(200).end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(origin);
    const pageText = await page.text();
    assert.equal(page.status, 200, pageText);
    assert.match(pageText, new RegExp(`src="\\./assets/${js}"`));
    assert.equal((await fetch(`${origin}/assets/${js}`)).status, 200);
    assert.equal((await fetch(`${origin}/assets/${css}`)).status, 200);
    const locations = await fetch(`${origin}/data/locations.csv`);
    assert.equal(locations.status, 200);
    assert.match(await locations.text(), /^id,name,lat,lon,/);
  } finally {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    rmSync(temp, { recursive: true, force: true });
  }
});
