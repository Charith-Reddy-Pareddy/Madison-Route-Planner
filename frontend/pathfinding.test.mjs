import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRoute } from './src/pathfinding.js';

const network = {
  nodes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  edges: [{ from: 'a', to: 'b', walkMiles: 1, driveMiles: 2, accessibleMiles: null }],
};

test('rejects unknown modes instead of returning walking directions', () => {
  assert.throws(() => computeRoute(network, 'a', 'b', 'transit'), /unsupported route mode/);
});
