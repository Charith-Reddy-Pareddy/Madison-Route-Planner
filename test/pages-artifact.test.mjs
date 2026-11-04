import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import test from 'node:test';

const site = resolve(process.env.PAGES_DIR ?? '_site');

test('built Pages site serves its app bundles and route data', async () => {
  const html = await readFile(resolve(site, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(assets.some((path) => path.endsWith('.js')), 'built JavaScript bundle is linked');
  assert.ok(assets.some((path) => path.endsWith('.css')), 'built stylesheet is linked');

  const feed = JSON.parse(await readFile(resolve(site, 'metro-gtfs.json'), 'utf8'));
  assert.ok(feed.routes?.length > 0, 'transit route data is present');
  assert.ok(feed.stops?.length > 0, 'transit stop data is present');

  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = resolve(site, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (file !== site && !file.startsWith(`${site}${sep}`)) {
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

  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ['/', ...assets, '/metro-gtfs.json', '/data/locations.csv', '/data/roads.csv']) {
      const response = await fetch(new URL(path, base));
      assert.equal(response.status, 200, `${path} is served`);
    }
  } finally {
    await new Promise((resolveClose, reject) => server.close((err) => err ? reject(err) : resolveClose()));
  }
});
