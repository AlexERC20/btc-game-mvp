import EventEmitter from 'events';
import binance from './providers/binance.js';
import coinbase from './providers/coinbase.js';
import bitstamp from './providers/bitstamp.js';
import { createLegacyFeed } from './legacy.js';

export function createPriceFeed(opts = {}) {
  const {
    primary = process.env.PRICE_PRIMARY || 'binance',
    pollMs = Number(process.env.PRICE_POLL_MS || 1500),
    providers,
    failoverMs = 10000,
    checkMs = 1000,
  } = opts;

  if (primary === 'legacy') {
    return createLegacyFeed();
  }

  const available = providers || [binance, coinbase, bitstamp];
  available.sort((a, b) => (a.name === primary ? -1 : b.name === primary ? 1 : 0));

  const emitter = new EventEmitter();
  let lastPrice = null;
  let lastMessageAt = 0;
  let providerName = available[0]?.name || 'unknown';
  let transport = 'ws';
  let failoverCount = 0;
  let connected = false;
  let currentIdx = 0;
  let closer = null;
  const region = process.env.AWS_REGION || process.env.REGION || 'unknown';

  const handlePrice = (price, prov = providerName, tr = 'ws') => {
    if (!Number.isFinite(price)) return;
    lastPrice = Number(price);
    lastMessageAt = Date.now();
    providerName = prov;
    transport = tr;
    connected = true;
    emitter.emit('price', lastPrice, providerName, transport);
  };

  const handleStatus = (s) => {
    if (s.state === 'retry') connected = false;
  };

  const connect = (idx) => {
    closer?.();
    currentIdx = idx % available.length;
    const prov = available[currentIdx];
    providerName = prov.name;
    closer = prov.connect(handlePrice, handleStatus);
    console.log(`[PriceFeed] provider=${prov.name} transport=ws symbol=${prov.symbol} region=${region} polling=${pollMs}ms`);
  };

  const pollRest = async () => {
    const prov = available[currentIdx];
    if (!prov?.fetchRest) return;
    try {
      const price = await prov.fetchRest();
      if (price != null) handlePrice(price, prov.name, 'rest');
    } catch {}
  };

  connect(0);
  const restTimer = setInterval(pollRest, pollMs);
  const failTimer = setInterval(() => {
    if (Date.now() - lastMessageAt > failoverMs) {
      failoverCount++;
      connect((currentIdx + 1) % available.length);
    }
  }, checkMs);
  const primaryTimer = setInterval(() => {
    if (currentIdx !== 0) {
      connect(0);
    }
  }, 60000);
  const logTimer = setInterval(() => {
    if (lastPrice != null) {
      const age = Date.now() - lastMessageAt;
      console.log(`[PriceFeed] last=${lastPrice} provider=${providerName} transport=${transport} ageMs=${age}`);
    }
  }, 30000);

  return {
    on: (...a) => emitter.on(...a),
    off: (...a) => emitter.off?.(...a) || emitter.removeListener(...a),
    getLastPrice: () => lastPrice,
    getStatus: () => ({ provider: providerName, transport, connected, lastMessageAt, failoverCount }),
    close: () => {
      closer?.();
      clearInterval(restTimer);
      clearInterval(failTimer);
      clearInterval(primaryTimer);
      clearInterval(logTimer);
    }
  };
}

export default createPriceFeed;
