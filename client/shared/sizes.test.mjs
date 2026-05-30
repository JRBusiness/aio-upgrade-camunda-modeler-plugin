import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, getDefault, getMin, belowMin, clampToMin, KEYS } from './sizes.mjs';

test('every key has default and min, with min <= default', () => {
  for (const key of KEYS) {
    const def = getDefault(key);
    const min = getMin(key);
    assert.ok(def && def.width > 0 && def.height > 0, `default for ${key}`);
    assert.ok(min && min.width > 0 && min.height > 0, `min for ${key}`);
    assert.ok(min.width <= def.width && min.height <= def.height, `min<=default for ${key}`);
  }
});

test('belowMin true when either dimension under minimum', () => {
  assert.equal(belowMin('task', { width: 59, height: 80 }), true);
  assert.equal(belowMin('task', { width: 100, height: 49 }), true);
  assert.equal(belowMin('task', { width: 60, height: 50 }), false);
});

test('clampToMin raises sub-minimum dimensions and preserves position', () => {
  const out = clampToMin('task', { x: 10, y: 20, width: 10, height: 10 });
  assert.deepEqual(out, { x: 10, y: 20, width: 60, height: 50 });
});

test('unknown key throws', () => {
  assert.throws(() => getDefault('nope'));
});
