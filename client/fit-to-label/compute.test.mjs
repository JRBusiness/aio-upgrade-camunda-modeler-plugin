import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFitBounds } from './compute.mjs';

const min = { width: 60, height: 50 };

test('grows height to fit tall text plus padding, keeps x/y/width', () => {
  const out = computeFitBounds(
    { x: 10, y: 20, width: 100, height: 80 },
    { width: 90, height: 120 },
    { top: 5, right: 5, bottom: 5, left: 5 },
    min
  );
  assert.equal(out.x, 10);
  assert.equal(out.y, 20);
  assert.equal(out.width, 100);
  assert.equal(out.height, 130); // 120 + 5 + 5
});

test('never shrinks below minimum height', () => {
  const out = computeFitBounds(
    { x: 0, y: 0, width: 100, height: 80 },
    { width: 10, height: 10 },
    { top: 5, right: 5, bottom: 5, left: 5 },
    min
  );
  assert.equal(out.height, 50);
});

test('returns null when text dimensions are not usable', () => {
  assert.equal(
    computeFitBounds({ x: 0, y: 0, width: 100, height: 80 }, { width: 0, height: 0 }, {}, min),
    null
  );
  assert.equal(
    computeFitBounds({ x: 0, y: 0, width: 100, height: 80 }, { width: NaN, height: 10 }, {}, min),
    null
  );
});
