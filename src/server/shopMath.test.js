import test from 'node:test';
import assert from 'node:assert/strict';
import { calcPrice } from './shopMath.js';

test('price bump multiples', () => {
  const base = 100;
  assert.equal(calcPrice(base,0),100);
  assert.equal(calcPrice(base,5),108);
  assert.equal(calcPrice(base,10),116);
  assert.equal(calcPrice(base,15),124);
});
