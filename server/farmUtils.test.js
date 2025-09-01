import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyUsdLimit, BASE_USD_LIMIT, BONUS_PER_ACTIVE_FRIEND_USD } from './farmUtils.js';

test('dailyUsdLimit with various friend counts', () => {
  assert.equal(dailyUsdLimit(0), BASE_USD_LIMIT);
  assert.equal(dailyUsdLimit(1), BASE_USD_LIMIT + BONUS_PER_ACTIVE_FRIEND_USD);
  assert.equal(dailyUsdLimit(5), BASE_USD_LIMIT + 5 * BONUS_PER_ACTIVE_FRIEND_USD);
  assert.equal(dailyUsdLimit(50), BASE_USD_LIMIT + 50 * BONUS_PER_ACTIVE_FRIEND_USD);
});
