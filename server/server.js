import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';
import pg from 'pg';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
const BINANCE_WS = process.env.BINANCE_WS || 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// --- DB bootstrap ---
await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    balance BIGINT NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS rounds(
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    start_price NUMERIC,
    end_price NUMERIC,
    winner_side TEXT,
    fee BIGINT DEFAULT 0,
    distributable BIGINT DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bets(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    round_id INT REFERENCES rounds(id),
    side TEXT NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS payouts(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    round_id INT REFERENCES rounds(id),
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

// --- State ---
let state = {
  price: null, startPrice: null,
  phase: 'idle', secsLeft: 0,
  roundLen: 60, betWindow: 10, pauseLen: 10,
  bankBuy: 0, bankSell: 0, betsBuy: [], betsSell: [],
  history: [], lastSettlement: null, currentRoundId: null
};
const MAX_HIST = 10;

// --- Price feed ---
let ws=null;
function connectPrice(){
  ws = new WebSocket(BINANCE_WS);
  ws.on('message', (m)=>{
    try{
      const d = JSON.parse(m);
      state.price = Number(d.c);
      if (!state.startPrice && state.phase!=='idle') state.startPrice = state.price;
    }catch(e){}
  });
  ws.on('close', ()=> setTimeout(connectPrice, 1000));
  ws.on('error', ()=> ws.close());
}
connectPrice();

async function startRound(){
  if (!state.price) return;
  state.phase='betting'; state.secsLeft=state.roundLen;
  state.startPrice=state.price; state.bankBuy=0; state.bankSell=0;
  state.betsBuy=[]; state.betsSell=[];
  const r = await pool.query('INSERT INTO rounds(start_price) VALUES ($1) RETURNING id', [state.startPrice]);
  state.currentRoundId = r.rows[0].id;
}

async function settle(){
  const up = state.price > state.startPrice;
  const side = up ? 'BUY' : 'SELL';
  const winners = up ? state.betsBuy : state.betsSell;
  const losers  = up ? state.betsSell : state.betsBuy;
  const totalWin = winners.reduce((s,x)=>s+x.amount,0);
  const totalLose= losers.reduce((s,x)=>s+x.amount,0);
  const bank = totalWin + totalLose;
  const fee = Math.floor(totalLose*0.10);
  const distributable = bank - fee;
  const pct = ((state.price - state.startPrice)/state.startPrice)*100;

  await pool.query(
    'UPDATE rounds SET end_price=$1, winner_side=$2, fee=$3, distributable=$4 WHERE id=$5',
    [state.price, side, fee, distributable, state.currentRoundId]
  );

  if (totalWin>0 && winners.length){
    for (const w of winners){
      const share = Math.round((w.amount/totalWin)*distributable);
      if (share>0){
        await pool.query('INSERT INTO payouts(user_id, round_id, amount) VALUES ($1,$2,$3)', [w.user_id, state.currentRoundId, share]);
        await pool.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [share, w.user_id]);
      }
    }
  }

  state.history.unshift({side, start:state.startPrice, end:state.price, pct, win: distributable});
  while(state.history.length>MAX_HIST) state.history.pop();
  state.lastSettlement = { side, totalBank: bank, fee, distributable,
    payouts: winners.map(w=>({user:w.user, amount: totalWin?Math.round((w.amount/totalWin)*distributable):0})) };

  state.phase='pause'; state.secsLeft=state.pauseLen;
  setTimeout(()=>{ state.phase='idle'; state.currentRoundId=null; }, state.pauseLen*1000);
}

function tick(){
  (async ()=>{
    if (state.phase==='idle'){ await startRound(); return; }
    state.secsLeft--;
    if (state.phase==='betting' && state.secsLeft===state.roundLen-state.betWindow) state.phase='locked';
    if (state.secsLeft<=0) await settle();
  })().catch(console.error);
}
setInterval(tick,1000);

// helpers
async function ensureUser(telegramId){
  await pool.query(`INSERT INTO users(telegram_id, balance) VALUES($1,10000) ON CONFLICT (telegram_id) DO NOTHING`, [telegramId]);
  const r = await pool.query('SELECT id,balance FROM users WHERE telegram_id=$1',[telegramId]);
  return r.rows[0];
}

// API
app.post('/api/auth', async (req,res)=>{
  try{
    const { uid } = req.body||{}; if(!uid) return res.status(400).json({ok:false,error:'NO_UID'});
    const u = await ensureUser(uid);
    res.json({ ok:true, user:{ id:u.id, telegram_id:uid, balance:Number(u.balance) } });
  }catch(e){ console.error(e); res.status(500).json({ok:false});}
});

app.get('/api/round', (req,res)=>{
  res.json({
    price: state.price, startPrice: state.startPrice,
    phase: state.phase, secsLeft: state.secsLeft,
    roundLen: state.roundLen, betWindow: state.betWindow, pauseLen: state.pauseLen,
    bank: state.bankBuy+state.bankSell, bankBuy: state.bankBuy, bankSell: state.bankSell,
    betsBuy: state.betsBuy, betsSell: state.betsSell, lastSettlement: state.lastSettlement
  });
});

app.post('/api/bet', async (req,res)=>{
  try{
    if (state.phase!=='betting') return res.status(400).json({ok:false,error:'BETTING_CLOSED'});
    const { uid, side, amount } = req.body||{}; if(!uid||!side) return res.status(400).json({ok:false,error:'BAD_REQUEST'});
    const amt = Math.max(1, Math.floor(Number(amount)||0));
    const u = await ensureUser(uid);
    if (Number(u.balance) < amt) return res.status(400).json({ok:false,error:'INSUFFICIENT_BALANCE'});
    await pool.query('UPDATE users SET balance=balance-$1 WHERE id=$2', [amt, u.id]);
    await pool.query('INSERT INTO bets(user_id,round_id,side,amount) VALUES ($1,$2,$3,$4)', [u.id, state.currentRoundId, side, amt]);
    const bet={user_id:u.id,user:String(uid),amount:amt,ts:Date.now()};
    if (side==='BUY'){ state.betsBuy.push(bet); state.bankBuy+=amt; }
    else if (side==='SELL'){ state.betsSell.push(bet); state.bankSell+=amt; }
    res.json({ok:true});
  }catch(e){ console.error(e); res.status(500).json({ok:false,error:'SERVER'});}
});

app.get('/api/history', (req,res)=> res.json({history:state.history}) );
app.get('/api/leaderboard', async (req,res)=>{
  try{
    const q = await pool.query(`
      SELECT u.telegram_id, COALESCE(SUM(p.amount),0)::BIGINT AS won
      FROM payouts p JOIN users u ON u.id=p.user_id
      WHERE p.created_at::date=CURRENT_DATE
      GROUP BY u.telegram_id
      ORDER BY won DESC
      LIMIT 5
    `);
    res.json({ok:true, top:q.rows});
  }catch(e){ console.error(e); res.status(500).json({ok:false});}
});

app.listen(PORT, ()=> console.log('Server listening on', PORT));
