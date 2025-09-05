import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUsdShort } from './money.mjs';

test('formatUsdShort examples', () => {
  assert.equal(formatUsdShort(987), '$987');
  assert.equal(formatUsdShort(12345), '$12.3K');
  assert.equal(formatUsdShort(4360914), '$4.36M');
  assert.equal(formatUsdShort(1200000000), '$1.2B');
});
