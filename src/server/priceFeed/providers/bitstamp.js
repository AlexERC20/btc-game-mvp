import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let WebSocket = globalThis.WebSocket;
try {
  if (!WebSocket) WebSocket = require('ws');
} catch {}

export const name = 'bitstamp';
export const symbol = process.env.PRICE_SYMBOL_BITSTAMP || 'btcusd';
const wsUrl = 'wss://ws.bitstamp.net';
const restUrl = `https://www.bitstamp.net/api/v2/ticker/${symbol}/`;

export function parseWs(raw){
  try{
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if(msg.event === 'trade' && msg.data){
      const p = Number(msg.data.price);
      return Number.isFinite(p) ? p : null;
    }
    return null;
  }catch{
    return null;
  }
}

export async function fetchRest(){
  const r = await fetch(restUrl, { timeout:5000 }).then(r=>r.json());
  const p = Number(r.last);
  return Number.isFinite(p) ? p : null;
}

export function connect(onPrice, onStatus){
  let ws; let retry=0; let closed=false;
  const open = () => {
    ws = new WebSocket(wsUrl);
    onStatus?.({ provider:name, transport:'ws', state:'connecting' });
    ws.on('open', () => {
      retry = 0;
      onStatus?.({ provider:name, transport:'ws', state:'open' });
      ws.send(JSON.stringify({ event:'bts:subscribe', data:{ channel:`live_trades_${symbol}` } }));
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
