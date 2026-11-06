import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouteProgress } from './route-progress.js';

test('route progress identifies the selected travel mode', () => {
  assert.equal(getRouteProgress('walk'), 'Finding walking route...');
  assert.equal(getRouteProgress('drive'), 'Finding driving route...');
  assert.equal(getRouteProgress('bus'), 'Finding bus directions...');
});
