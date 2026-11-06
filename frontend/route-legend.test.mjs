import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouteLegend } from './route-legend.js';

test('map legend matches walking, driving, and bus route display', () => {
  assert.deepEqual(getRouteLegend('walk'), { showRoadRoute: true, label: 'Shortest route' });
  assert.deepEqual(getRouteLegend('drive'), { showRoadRoute: true, label: 'Driving route' });
  assert.deepEqual(getRouteLegend('bus'), { showRoadRoute: false, label: '' });
});
