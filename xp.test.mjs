import test from 'node:test';
import assert from 'node:assert/strict';
import { grantXpOnce } from './xp.mjs';

// Ensure grantXpOnce updates xp without touching balance
// Mock pool collects executed SQL queries
const pool = {
  queries: [],
  async query(sql, params) {
    this.queries.push(sql);
    if (sql.startsWith('UPDATE users SET xp')) {
      // return xp and level to satisfy grantXpOnce
      return { rows: [{ xp: (params?.[0] || 0), level: 1 }] };
    }
    return { rows: [] };
  }
};

test('grantXpOnce only updates xp field', async () => {
  await grantXpOnce(pool, 1, 'src', 1, 5);
  const updateSql = pool.queries.find(q => q.startsWith('UPDATE users'));
  assert.equal(updateSql.trim(), 'UPDATE users SET xp = xp + $1 WHERE id=$2 RETURNING xp, level');
  // no query should modify balance
  assert.ok(!pool.queries.some(q => /balance\s*=\s*balance/.test(q)), 'balance should not be updated');
});
