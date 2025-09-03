import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWs as parseBinance } from './providers/binance.js';
import { parseWs as parseCoinbase } from './providers/coinbase.js';
import { parseWs as parseBitstamp } from './providers/bitstamp.js';

test('binance parser', () => {
  const msg = JSON.stringify({ p: '12345.67' });
  assert.equal(parseBinance(msg), 12345.67);
});

test('coinbase parser', () => {
  const msg = JSON.stringify({ type: 'ticker', price: '23456.78' });
  assert.equal(parseCoinbase(msg), 23456.78);
});

test('bitstamp parser', () => {
  const msg = JSON.stringify({ event: 'trade', data: { price: '34567.89' } });
  assert.equal(parseBitstamp(msg), 34567.89);
});
