import binance from './providers/binance.js';
import coinbase from './providers/coinbase.js';
import bitstamp from './providers/bitstamp.js';

const providers = { binance, coinbase, bitstamp };

export function startPriceFeed({ db, intervalMs = 60000 }) {
  const primary = process.env.PRICE_PRIMARY || 'binance';
  const provider = providers[primary] || binance;
  console.log(`[PriceLoop] provider=${provider.name} intervalMs=${intervalMs}`);

  const tick = async () => {
    try {
      const price = await provider.fetchRest();
      if (price != null) {
        await db.query('INSERT INTO price_ticks (price_usd) VALUES ($1)', [price]);
      }
    } catch (e) {
      console.error('[PriceLoop] tick failed', e);
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
