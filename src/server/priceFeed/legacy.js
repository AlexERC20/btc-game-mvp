import { createRequire } from 'module';
import EventEmitter from 'events';

const require = createRequire(import.meta.url);
let WebSocket = globalThis.WebSocket;
try {
  if (!WebSocket) WebSocket = require('ws');
} catch {}

export function createLegacyFeed(){
  const emitter = new EventEmitter();
  const url = process.env.BINANCE_WS || 'wss://stream.binance.com:9443/ws/ethusdt@miniTicker';
  let lastPrice = null;
  let lastMessageAt = 0;
  let ws;
  function connect(){
    ws = new WebSocket(url);
    ws.on('message', (raw)=>{
      try{
        const d = JSON.parse(raw);
        const price = Number(d.c ?? d.lastPrice ?? d.p ?? d.k?.c);
        if(Number.isFinite(price)){
          lastPrice = price;
          lastMessageAt = Date.now();
          emitter.emit('price', price, 'legacy', 'ws');
        }
      }catch{}
    });
    ws.on('close', ()=>setTimeout(connect,1000));
    ws.on('error', ()=>ws.close());
  }
  connect();
  return {
    on: (...args)=>emitter.on(...args),
    off: (...args)=>emitter.off?.(...args) || emitter.removeListener(...args),
    getLastPrice:()=>lastPrice,
    getStatus:()=>({ provider:'legacy', transport:'ws', connected: !!ws && ws.readyState===1, lastMessageAt, failoverCount:0 })
  };
}
