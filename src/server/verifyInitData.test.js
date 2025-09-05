import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyInitData } from './verifyInitData.js';

test('rejects short hash', () => {
  const res = verifyInitData('user=1&hash=1234', 'token');
  assert.deepEqual(res, { ok: false, error: 'BAD_HASH' });
});
