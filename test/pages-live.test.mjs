import assert from 'node:assert/strict';
import test from 'node:test';

const siteUrl = process.env.PAGES_URL;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (response.ok) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries - 1) await sleep(5_000);
  }
  throw lastError;
}

test('deployed Pages site serves the app bundles and route data', { timeout: 90_000 }, async () => {
  assert.ok(siteUrl, 'PAGES_URL is set by the deploy job');
  const base = new URL(siteUrl);
  const page = await get(base, 6);
  const html = await page.text();
  assert.match(html, /<title>Madison Route Planner<\/title>/);

  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)]
    .map((match) => new URL(match[1], base));
  assert.ok(assets.some((url) => url.pathname.endsWith('.js')), 'JavaScript bundle is linked');
  assert.ok(assets.some((url) => url.pathname.endsWith('.css')), 'stylesheet is linked');
  for (const asset of assets) {
    const response = await get(asset);
    assert.ok((await response.text()).length > 0, `${asset.pathname} has content`);
  }

  const feed = await (await get(new URL('metro-gtfs.json', base))).json();
  assert.ok(feed.routes?.length, 'transit routes are published');
  assert.ok(feed.stops?.length, 'transit stops are published');
  for (const file of ['data/locations.csv', 'data/roads.csv']) {
    const response = await get(new URL(file, base));
    assert.ok((await response.text()).length > 0, `${file} is published`);
  }
});
