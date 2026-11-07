import assert from 'node:assert/strict';
import test from 'node:test';
import { canSwapPlaces } from './route-selection.js';

const nodes = [{ id: 'bascom' }, { id: 'capitol' }];

test('places can be swapped only when both endpoint ids are valid', () => {
  assert.equal(canSwapPlaces(nodes, '', 'capitol'), false);
  assert.equal(canSwapPlaces(nodes, 'bascom', 'missing'), false);
  assert.equal(canSwapPlaces(nodes, 'bascom', 'capitol'), true);
});
