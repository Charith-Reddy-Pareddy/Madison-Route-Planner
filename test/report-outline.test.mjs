import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCsv } from '../frontend/csv.mjs';

const locations = parseCsv(readFileSync(new URL('../data/locations.csv', import.meta.url), 'utf8'));
const roads = parseCsv(readFileSync(new URL('../data/roads.csv', import.meta.url), 'utf8'));
const report = readFileSync(new URL('../docs/report-outline.md', import.meta.url), 'utf8');
const paper = readFileSync(new URL('../docs/report.md', import.meta.url), 'utf8');
const scaleResults = parseCsv(readFileSync(new URL('../benchmarks/osm-scale-results.csv', import.meta.url), 'utf8'));

test('report network counts match the real project CSV data', () => {
  const connections = new Set(roads.map(road => [road.from, road.to].sort().join('\0')));
  const steps = roads.filter(road => road.hasSteps.trim().toLowerCase() === 'true').length;
  const accessible = roads.filter(road => road.accessibleMiles.trim() !== '').length;

  assert.match(report, new RegExp(`${locations.length} mapped locations`));
  assert.match(report, new RegExp(`${roads.length} directed road records`));
  assert.match(report, new RegExp(`${connections.size} grouped location connections`));
  assert.match(report, new RegExp(`${steps} include stairs`));
  assert.match(report, new RegExp(`${accessible} include accessible mileage`));
});

test('report includes reproducible real-network measurements at each scale', () => {
  const searches = locations.length * (locations.length - 1);

  assert.match(report, new RegExp(`${searches.toLocaleString('en-US')} ordered pairs`));
  assert.match(report, /not a reliable cross-size performance comparison/);
  assert.match(report, /Wisconsin OpenStreetMap snapshot dated 2026-10-09/);
  assert.match(report, /1,000,000 nodes and 2,191,516 distinct directed edges/);
  assert.match(report, /five targets spaced across the node order/);
  assert.deepEqual(scaleResults.map(row => Number(row.nodes)), [100, 1_000, 10_000, 100_000, 1_000_000]);
  assert.ok(scaleResults.every(row => Number(row.directed_edges) > 0));
  assert.ok(scaleResults.every(row => Number(row.median_us_per_search) > 0));
});


test('research questions match the measurements and their limits', () => {
  assert.match(report, /## Research question\nAcross nested Madison-centered OpenStreetMap walking graphs/);
  assert.match(report, /## Intended audience and scope/);
  assert.match(report, /graph-build time and median search time change at each network size/);
  assert.match(report, /mean target-route distance change alongside search time/);
  assert.match(report, /single Madison-centered seed, five targets per size, one OSM snapshot, and one machine/);
});


test('research evidence maps claims to sources and limitations', () => {
  const evidence = readFileSync(new URL('../docs/research-evidence.md', import.meta.url), 'utf8');
  assert.match(report, /research evidence review.*research-evidence\.md/);
  assert.match(evidence, /locations\.csv.*roads\.csv.*data\/sources\.md/);
  assert.match(evidence, /Geofabrik Wisconsin OSM extract/);
  assert.match(evidence, /osm-scale-results\.csv/);
  assert.match(evidence, /one machine, one Madison-centered seed, and five targets per size/);
  assert.match(evidence, /Open Database License/);
});


test('PDF outline follows the report and its evidence', () => {
  assert.match(paper, /^# Walking graph scale and route measurements in Madison/m);
  for (const heading of ['Question and scope', 'Data and provenance', 'Measurement method', 'Results', 'Discussion and limitations', 'Sources and reproduction']) {
    assert.ok(report.includes(`**${heading}**`), `outline includes ${heading}`);
  }
  for (const heading of ['## Research question', '## Study scope', '## Data sources', '## Measurement method', '## Results', '## Discussion and limitations', '## Sources']) {
    assert.ok(paper.includes(heading), `report includes ${heading}`);
  }
  assert.match(report, /research evidence review.*research-evidence\.md/);
  assert.match(report, /osm-scale-results\.csv/);
});
