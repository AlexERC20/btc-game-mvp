// server/server.js
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
const BINANCE_WS =
  process.env.BINANCE_WS ||
  'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';

const BOT_TOKEN = process.env.BOT_TOKEN; // нужен для createInvoiceLink

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ========= DB bootstrap / миграции ========= */
await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    balance BIGINT NOT NULL DEFAULT 10000,
    channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
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
    round_id INT,
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

  CREATE TABLE IF NOT EXISTS referrals(
    id SERIAL PRIMARY KEY,
    referrer_user_id INT REFERENCES users(id),
    referred_telegram_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

/* добиваем безопасные ALTER-ы (если раньше были старые схемы) */
await pool.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS round_id INT`);
await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bets_round_fk') THEN
      ALTER TABLE bets ADD CONSTRAINT bets_round_fk
      FOREIGN KEY (round_id) REFERENCES rounds(id);
    END IF;
  END$$;
`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE`);

/* ========= Состояние раунда ========= */
let state = {
  price: null,
  startPrice: null,

  phase: 'idle',            // idle | betting | locked | pause
  secsLeft: 0,

  roundLen: 60,
  betWindow: 10,
  pauseLen: 10,

  bankBuy: 0,
  bankSell: 0,
  betsBuy: [],
  betsSell: [],

  history: [],              // [{ side, start, end, pct, win }]
  lastSettlement: null,
  currentRoundId: null,
};
const MAX_HIST = 10;

/* ========= Цена (Binance WS) ========= */
let ws = null;
function connectPrice() {
  ws = new WebSocket(BINANCE_WS);
  ws.on('message', (raw) => {
    try {
      const d = JSON.parse(raw);
      state.price = Number(d.c ?? d.lastPrice ?? d.p ?? d.k?.c);
      if (!state.startPrice && state.phase !== 'idle') state.startPrice = state.price;
    } catch {}
  });
  ws.on('close', () => setTimeout(connectPrice, 1000));
  ws.on('error', () => ws.close());
}
connectPrice();

/* ========= Утилиты ========= */
async function ensureUser(telegramId, username) {
  await pool.query(
    `INSERT INTO users(telegram_id, username, balance)
     VALUES ($1, $2, 10000)
     ON CONFLICT (telegram_id) DO NOTHING`,
    [telegramId, username || null]
  );
  if (username) {
    await pool.query(`UPDATE users SET username=$2 WHERE telegram_id=$1 AND (username IS NULL OR username='')`,
      [telegramId, username]);
  }
  const r = await pool.query('SELECT id, balance, username FROM users WHERE telegram_id=$1', [telegramId]);
  return r.rows[0];
}

async function startRound() {
  if (!state.price) return;
  state.phase = 'betting';
  state.secsLeft = state.roundLen;
  state.startPrice = state.price;
  state.bankBuy = 0; state.bankSell = 0;
  state.betsBuy = []; state.betsSell = [];
  const r = await pool.query('INSERT INTO rounds(start_price) VALUES ($1) RETURNING id', [state.startPrice]);
  state.currentRoundId = r.rows[0].id;
}

/* ========= Цикл раунда (фикс) ========= */
function tick() {
  (async () => {
    if (state.phase === 'idle') {
      if (!state.price) return;
      await startRound();
      return;
    }

    state.secsLeft--;

    if (state.phase === 'betting' &&
        state.secsLeft === state.roundLen - state.betWindow) {
      state.phase = 'locked';
    }

    if (state.phase === 'locked' && state.secsLeft <= 0) {
      await settle();
      return;
    }

    if (state.phase === 'pause' && state.secsLeft <= 0) {
      state.phase = 'idle';
      state.currentRoundId = null;
    }
  })().catch(console.error);
}
setInterval(tick, 1000);

/* ========= Расчёт ========= */
async function settle() {
  const up = state.price > state.startPrice;
  const side = up ? 'BUY' : 'SELL';

  const winners = up ? state.betsBuy : state.betsSell;
  const losers  = up ? state.betsSell : state.betsBuy;

  const totalWin  = winners.reduce((s, x) => s + x.amount, 0);
  const totalLose = losers.reduce((s, x) => s + x.amount, 0);
  const bank = totalWin + totalLose;

  const fee = Math.floor(totalLose * 0.10);          // 10% только с проигравших
  const distributable = bank - fee;

  const pct = ((state.price - state.startPrice) / state.startPrice) * 100;

// Пакеты Stars (точно совпадают с сервером)
const STARS_PACKS = {
  '100':   { credit: 3_000 },
  '500':   { credit: 16_000 },
  '1000':  { credit: 35_000 },
  '10000': { credit: 400_000 },
  '30000': { credit: 1_500_000 },
};

  await pool.query(
    `UPDATE rounds SET end_price=$1, winner_side=$2, fee=$3, distributable=$4 WHERE id=$5`,
    [state.price, side, fee, distributable, state.currentRoundId]
  );

  if (totalWin > 0 && winners.length) {
    for (const w of winners) {
      const share = Math.round((w.amount / totalWin) * distributable);
      if (share > 0) {
        await pool.query('INSERT INTO payouts(user_id, round_id, amount) VALUES ($1,$2,$3)',
          [w.user_id, state.currentRoundId, share]);
        await pool.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [share, w.user_id]);
      }
    }
  }

  state.history.unshift({ side, start: state.startPrice, end: state.price, pct, win: distributable });
  while (state.history.length > MAX_HIST) state.history.pop();

  state.lastSettlement = {
    side, totalBank: bank, fee, distributable,
    payouts: winners.map(w => ({
      user: w.user,
      amount: totalWin ? Math.round((w.amount / totalWin) * distributable) : 0,
    })),
  };

  state.phase = 'pause';
  state.secsLeft = state.pauseLen;
}

/* ========= API ========= */

// Регистрация/пинг (сохранение username)
app.post('/api/auth', async (req, res) => {
  try {
    const { uid, username } = req.body || {};
    if (!uid) return res.status(400).json({ ok: false, error: 'NO_UID' });
    const u = await ensureUser(uid, username);
    res.json({ ok: true, user: { id: u.id, telegram_id: uid, username: u.username, balance: Number(u.balance) } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

// Ставка
app.post('/api/bet', async (req, res) => {
  try {
    if (state.phase !== 'betting') return res.status(400).json({ ok:false, error:'BETTING_CLOSED' });
    const { uid, side, amount } = req.body || {};
    if (!uid || !side) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });
    const amt = Math.max(1, Math.floor(Number(amount)||0));
    const u = await ensureUser(uid);
    if (Number(u.balance) < amt) return res.status(400).json({ ok:false, error:'INSUFFICIENT_BALANCE' });

    await pool.query('UPDATE users SET balance=balance-$1 WHERE id=$2', [amt, u.id]);
    await pool.query('INSERT INTO bets(user_id, round_id, side, amount) VALUES ($1,$2,$3,$4)',
      [u.id, state.currentRoundId, side, amt]);

    const bet = { user_id: u.id, user: String(uid), amount: amt, ts: Date.now() };
    if (side === 'BUY') { state.betsBuy.push(bet); state.bankBuy += amt; }
    else if (side === 'SELL') { state.betsSell.push(bet); state.bankSell += amt; }
    else return res.status(400).json({ ok:false, error:'BAD_SIDE' });

    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// Состояние/история/топ
app.get('/api/round', (req, res) => {
  res.json({
    price: state.price, startPrice: state.startPrice,
    phase: state.phase, secsLeft: state.secsLeft,
    roundLen: state.roundLen, betWindow: state.betWindow, pauseLen: state.pauseLen,
    bank: state.bankBuy + state.bankSell, bankBuy: state.bankBuy, bankSell: state.bankSell,
    betsBuy: state.betsBuy, betsSell: state.betsSell, lastSettlement: state.lastSettlement
  });
});
app.get('/api/history', (req, res) => res.json({ history: state.history }));
app.get('/api/leaderboard', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT COALESCE(NULLIF(u.username,''), CONCAT('@', u.telegram_id::text)) AS name,
             COALESCE(SUM(p.amount),0)::BIGINT AS won
      FROM payouts p
      JOIN users u ON u.id = p.user_id
      WHERE p.created_at::date = CURRENT_DATE
      GROUP BY name
      ORDER BY won DESC
      LIMIT 10
    `);
    res.json({ ok: true, top: q.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
  }
});

// === Telegram Stars: пакеты и создание инвойса ===
// 1⭐ = 1000 "миллизвёзд" (millis)
const STARS_PACKS = {
  '100':   { millis: 100_000,    credit: 3_000 },
  '500':   { millis: 500_000,    credit: 16_000 },
  '1000':  { millis: 1_000_000,  credit: 35_000 },
  '10000': { millis: 10_000_000, credit: 400_000 },
  '30000': { millis: 30_000_000, credit: 1_500_000 },
};

app.post('/api/stars/create', express.json(), async (req, res) => {
  try {
    const { uid, pack } = req.body || {};
    const p = STARS_PACKS[pack];
    if (!uid || !p) return res.json({ ok:false, error:'BAD_REQUEST' });

    const payload = `${uid}:pack_${pack}`; // вернётся в successful_payment

    // createInvoiceLink (валюта XTR, без provider_token)
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        title:       `${pack}⭐`,
        description: `Пакет на ${pack} звёзд`,
        payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: `${pack}⭐`, amount: p.millis }],
      })
    }).then(r=>r.json());

    if (!r.ok) return res.json({ ok:false, error:'TG_API', details:r });

    res.json({ ok:true, link: r.result });
  } catch (e) {
    console.error('stars/create', e);
    res.json({ ok:false, error:'SERVER' });
  }
});

// Обязателен для Telegram платежей
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

// Успешная оплата Stars -> зачисляем внутр. валюту
bot.on('message', async (ctx) => {
  const sp = ctx.message?.successful_payment;
  if (!sp) return;

  try {
    // payload формата "<uid>:pack_<N>"
    const payload = sp.invoice_payload || '';
    const [uidStr, packStr] = payload.split(':pack_');
    const uid = Number(uidStr);
    const pack = packStr?.trim();

    if (uid && STARS_PACKS[pack]) {
      const credit = STARS_PACKS[pack].credit;
      await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credit, uid]);
      await ctx.reply(`💫 Платёж принят: пакет ${pack}⭐ → +$${credit.toLocaleString()} на баланс.`);
      return;
    }

    // fallback: если payload неожиданно другой — конвертнём по факту
    const stars = sp.total_amount / 1000; // 1⭐ = 1000
    const credited = stars * 1000;
    await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credited, ctx.from.id]);
    await ctx.reply(`💫 Платёж принят: ${stars}⭐ → +$${credited.toLocaleString()}`);
  } catch (e) {
    console.error('successful_payment handler:', e);
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const q = `
      SELECT
        COALESCE(NULLIF(u.username,''), '@' || u.telegram_id::text) AS name,
        SUM(p.amount)::bigint AS won
      FROM payouts p
      JOIN users u ON u.id = p.user_id
      WHERE p.created_at >= now() - interval '1 hour'   -- окно 60 минут
        AND p.amount > 0                                 -- только выигрыши
      GROUP BY u.id, u.username, u.telegram_id
      ORDER BY won DESC
      LIMIT 20;
    `;
    const r = await pool.query(q);
    res.json({ ok: true, top: r.rows });
  } catch (e) {
    console.error('leaderboard hourly', e);
    res.json({ ok: false, error: 'SERVER' });
  }
});

app.listen(PORT, () => console.log('Server listening on', PORT));
