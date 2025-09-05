import EventEmitter from 'events';
import { grantXpOnce } from '../xp.mjs';

const SPREAD_THRESHOLD_BPS = Number(process.env.SPREAD_THRESHOLD_BPS || 30);
const CONVERGENCE_THRESHOLD_BPS = Number(process.env.CONVERGENCE_THRESHOLD_BPS || 10);
const SPREAD_COOLDOWN_SEC = Number(process.env.SPREAD_COOLDOWN_SEC || 60);
const SPREAD_REWARD = Number(process.env.SPREAD_REWARD || 1000);
const CONVERGENCE_REWARD = Number(process.env.CONVERGENCE_REWARD || 1000);
const SPREAD_POLL_MS = Number(process.env.SPREAD_POLL_MS || 1500);
const USER_TRACK_LIMIT = Number(process.env.USER_TRACK_LIMIT || 5);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export function parseDexInput(input){
  if (!input) return null;
  input = input.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return { pair: input.toLowerCase(), chain: null };
  try {
    const url = new URL(input);
    if (url.hostname.includes('dexscreener.com')) {
      const parts = url.pathname.split('/').filter(Boolean); // [chain, pair]
      if (parts.length >= 2) return { chain: parts[0].toLowerCase(), pair: parts[1].toLowerCase() };
    }
    if (url.hostname.includes('dextools.io')) {
      const parts = url.pathname.split('/').filter(Boolean);
      // example: app/en/ether/pair-explorer/0x...
      const idx = parts.indexOf('pair-explorer');
      if (idx >= 0 && parts[idx+1]) {
        const chain = parts[idx-1];
        const pair = parts[idx+1];
        const map = { ether:'eth', ethereum:'eth', bsc:'bsc', polygon:'polygon', avax:'avax', arb:'arbitrum', base:'base', op:'optimism' };
        return { chain: map[chain] || chain, pair: pair.toLowerCase() };
      }
    }
  } catch {}
  return null;
}

async function fetchCexPrice(exchange, symbol){
  const urls = {
    binance: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
    mexc: `https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`
  };
  const url = urls[exchange];
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  return Number(j.price);
}

async function fetchDexPrice(chain, pair){
  if (!chain || !pair) return null;
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pair}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const price = j.pair?.priceUsd || j.pairs?.[0]?.priceUsd || j.priceUsd;
  return price ? Number(price) : null;
}

export function startSpreadTracker(pool){
  const emitter = new EventEmitter();
  const state = new Map(); // trackId -> { cexPrice, dexPrice, bps, status }

  async function processTrack(track){
    try {
      const [cexPrice, dexPrice] = await Promise.all([
        fetchCexPrice(track.exchange, track.symbol),
        fetchDexPrice(track.chain, track.dex_pair)
      ]);
      if (!Number.isFinite(cexPrice) || !Number.isFinite(dexPrice)) return;
      const bps = Math.abs(cexPrice - dexPrice) / ((cexPrice + dexPrice)/2) * 10000;
      let status = track.status;
      const now = new Date();
      if (status === 'cooldown') {
        if (track.cooldown_until && now > track.cooldown_until && bps < SPREAD_THRESHOLD_BPS) {
          status = 'idle';
          await pool.query(`UPDATE spread_tracks SET status='idle' WHERE id=$1`, [track.id]);
        }
      } else if (status === 'idle' && bps >= SPREAD_THRESHOLD_BPS) {
        status = 'spread_open';
        await pool.query(`UPDATE spread_tracks SET status='spread_open', last_spread_at=now() WHERE id=$1`, [track.id]);
        await pool.query(`INSERT INTO spread_events(track_id,kind,cex_price,dex_price,spread_bps) VALUES ($1,'spread_open',$2,$3,$4)`, [track.id, cexPrice, dexPrice, Math.round(bps)]);
        await pool.query(`INSERT INTO spread_rewards(track_id,user_id,reward_type,amount) VALUES ($1,$2,'spread',$3)`, [track.id, track.user_id, SPREAD_REWARD]);
        await pool.query(`UPDATE users SET balance=balance+$1 WHERE id=$2`, [SPREAD_REWARD, track.user_id]);
        await grantXpOnce(pool, track.user_id, 'spread_open', track.id, 300);
      } else if (status === 'spread_open' && bps <= CONVERGENCE_THRESHOLD_BPS) {
        status = 'cooldown';
        await pool.query(`UPDATE spread_tracks SET status='cooldown', last_converged_at=now(), cooldown_until=now()+$2::interval WHERE id=$1`, [track.id, `${SPREAD_COOLDOWN_SEC} seconds`]);
        await pool.query(`INSERT INTO spread_events(track_id,kind,cex_price,dex_price,spread_bps) VALUES ($1,'converged',$2,$3,$4)`, [track.id, cexPrice, dexPrice, Math.round(bps)]);
        await pool.query(`INSERT INTO spread_rewards(track_id,user_id,reward_type,amount) VALUES ($1,$2,'convergence',$3)`, [track.id, track.user_id, CONVERGENCE_REWARD]);
        await pool.query(`UPDATE users SET balance=balance+$1 WHERE id=$2`, [CONVERGENCE_REWARD, track.user_id]);
        await grantXpOnce(pool, track.user_id, 'spread_converged', track.id, 300);
      }
      state.set(track.id, { cexPrice, dexPrice, bps, status });
      emitter.emit('update', { trackId: track.id, cexPrice, dexPrice, bps, status });
    } catch (e) {
      console.error('spread processTrack', e);
    }
  }

  async function loop(){
    while(true){
      try {
        const { rows } = await pool.query(`SELECT * FROM spread_tracks`);
        for (const tr of rows) await processTrack(tr);
      } catch (e){ console.error('spread loop', e); }
      await sleep(SPREAD_POLL_MS);
    }
  }
  loop();

  return { on: (...a)=>emitter.on(...a), off: (...a)=>emitter.off?.(...a), state, parseDexInput, USER_TRACK_LIMIT };
}

export { SPREAD_THRESHOLD_BPS, CONVERGENCE_THRESHOLD_BPS, SPREAD_POLL_MS, USER_TRACK_LIMIT };
