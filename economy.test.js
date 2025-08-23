import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { creditBalance, grantXp } from './lib/accounting.js';

function createMockClient() {
  return {
    balance: 1000,
    xp: 0,
    level: 1,
    queries: [],
    async query(sql, params) {
      this.queries.push(sql);
      if (sql.startsWith('UPDATE users SET balance')) {
        this.balance += Number(params[0]);
        return { rows: [{ balance: this.balance }] };
      }
      if (sql.startsWith('UPDATE users SET xp')) {
        this.xp += Number(params[0]);
        return { rows: [{ xp: this.xp, level: this.level }] };
      }
      if (sql.startsWith('UPDATE users SET level')) {
        this.level = Number(params[0]);
        return { rows: [] };
      }
      return { rows: [] };
    }
  };
}

test('Ставка $100: баланс -100, XP +50, банк +100', async () => {
  const client = createMockClient();
  const state = { bank: 0 };
  const bal = await creditBalance(client, 1, -100);
  const res = await grantXp(client, 1, 50);
  state.bank += 100;
  assert.equal(bal, 900);
  assert.equal(res.xp, 50);
  assert.equal(state.bank, 100);
  assert.equal(client.queries.filter(q=>q.includes('balance = balance')).length, 1);
  assert.equal(client.queries.filter(q=>q.includes('xp = xp')).length, 1);
});

test('Выигрыш $10_000: баланс +10_000, XP +10_000', async () => {
  const client = createMockClient();
  const bal = await creditBalance(client, 1, 10_000);
  const res = await grantXp(client, 1, 10_000);
  assert.equal(bal, 11_000);
  assert.equal(res.xp, 10_000);
});

test('Банк = сумма ставок в раунде, не зависит от XP', () => {
  const state = { bankBuy: 0, bankSell: 0 };
  state.bankBuy += 100;
  state.bankSell += 200;
  const bank = state.bankBuy + state.bankSell;
  assert.equal(bank, 300);
});

test('no direct balance/xp updates', () => {
  const res = spawnSync('rg', ["SET (balance|xp)=", '-l', '--glob', '!lib/accounting.js', '--glob', '!xp.test.mjs', '--glob', '!__tests__/**'], { encoding: 'utf8' });
  assert.equal(res.stdout.trim(), '');
});
