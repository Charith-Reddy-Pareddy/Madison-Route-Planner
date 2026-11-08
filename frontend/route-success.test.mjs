import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouteSuccessMessage } from './route-success.js';

test('same-place routes report that no directions are needed in every mode', () => {
  for (const mode of ['walk', 'drive', 'bus']) {
    assert.equal(getRouteSuccessMessage({ mode, path: [{ id: 'bascom' }] }),
      'Start and destination are the same place.');
  }
});
