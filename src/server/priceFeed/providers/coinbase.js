import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let WebSocket = globalThis.WebSocket;
try {
  if (!WebSocket) WebSocket = require('ws');
} catch {}

export const name = 'coinbase';
export const symbol = process.env.PRICE_SYMBOL_COINBASE || 'BTC-USD';
const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
const restUrl = `https://api.exchange.coinbase.com/products/${symbol}/ticker`;

export function parseWs(raw){
  try{
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if(msg.type === 'ticker'){
      const p = Number(msg.price);
      return Number.isFinite(p) ? p : null;
    }
    return null;
  }catch{
    return null;
  }
}

export async function fetchRest(){
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(restUrl, { signal: ctl.signal }).then(r=>r.json());
    const p = Number(r.price);
    return Number.isFinite(p) ? p : null;
  } finally {
    clearTimeout(timer);
  }
}

export function connect(onPrice, onStatus){
  let ws; let retry=0; let closed=false;
  const open = () => {
    ws = new WebSocket(wsUrl);
    onStatus?.({ provider:name, transport:'ws', state:'connecting' });
    ws.on('open', () => {
      retry = 0;
      onStatus?.({ provider:name, transport:'ws', state:'open' });
      ws.send(JSON.stringify({ type:'subscribe', channels:[{ name:'ticker', product_ids:[symbol] }] }));
    });
    ws.on('message', (buf) => {
      const price = parseWs(buf.toString());
      if(price!=null) onPrice(price, name, 'ws');
    });
    ws.on('close', () => schedule());
    ws.on('error', () => schedule());
  };
  const schedule = () => {
    if (closed) return;
    const wait = Math.min(30000, 1000 * Math.pow(2, retry++));
    onStatus?.({ provider:name, transport:'ws', state:'retry', wait });
    setTimeout(open, wait);
  };
  open();
  return () => { closed=true; try{ ws?.close(); }catch{} };
}

export default { name, symbol, connect, fetchRest, parseWs };
