import test from 'node:test';
import assert from 'node:assert/strict';
import { createPriceFeed } from './index.js';
import EventEmitter from 'events';

function stubProvider(name, prices, interval, endSilentMs = 1000){
  return {
    name,
    symbol: name,
    connect(onPrice){
      const emitter = new EventEmitter();
      let i = 0;
      const timer = setInterval(() => {
        if(i < prices.length){
          onPrice(prices[i++], name, 'ws');
        }
      }, interval);
      setTimeout(() => clearInterval(timer), endSilentMs);
      return () => clearInterval(timer);
    },
    fetchRest: async () => null
  };
}

test('failover switches to next provider after silence', async () => {
  const p1 = stubProvider('p1', [1], 50, 100); // emit once then silent
  const p2 = stubProvider('p2', [2,3,4], 50, 1000);
  const feed = createPriceFeed({ providers:[p1,p2], primary:'p1', pollMs:50, failoverMs:150, checkMs:50 });
  const seen = [];
  feed.on('price', (p, prov) => seen.push({ p, prov }));
  await new Promise(r => setTimeout(r, 500));
  assert.ok(seen.some(x => x.prov === 'p1')); // initial provider
  assert.ok(seen.some(x => x.prov === 'p2')); // after failover
  feed.close();
});
