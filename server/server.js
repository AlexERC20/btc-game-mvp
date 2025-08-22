// server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';
import pg from 'pg';
export { verifyInitData } from './verifyInitData.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
const BINANCE_WS =
  process.env.BINANCE_WS ||
  'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';

const BOT_TOKEN = process.env.BOT_TOKEN; // нужен для createInvoiceLink
const MIN_BET = 50; // ✅ минимальная ставка ($)

// shout auction defaults
const SHOUT_BASE = 100;
const SHOUT_STEP = 100;
const SHOUT_HOLD_SEC = 60;

// бонусы и канал для проверки подписки
const CHANNEL = process.env.CHANNEL || '@erc20coin';
const SUBSCRIBE_BONUS = 5000; // разовый за подписку
const DAILY_BONUS = 1000;     // ежедневный бонус

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
    balance BIGINT NOT NULL DEFAULT 1000,  -- старт теперь 1000
    insurance_count BIGINT NOT NULL DEFAULT 0,
    channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    last_daily_bonus DATE,
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
    insured BOOLEAN NOT NULL DEFAULT FALSE,
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
      ALTER TABLE bets
      ADD CONSTRAINT bets_round_fk
      FOREIGN KEY (round_id) REFERENCES rounds(id);
    END IF;
  END$$;
`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_bonus DATE`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_count BIGINT NOT NULL DEFAULT 0`);
await pool.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS insured BOOLEAN NOT NULL DEFAULT FALSE`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_spent BIGINT NOT NULL DEFAULT 0`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shout_state (
    id           SMALLINT PRIMARY KEY DEFAULT 1,
    winner_user  INT REFERENCES users(id),
    winner_tid   BIGINT,
    winner_name  TEXT,
    msg          TEXT,
    price        BIGINT NOT NULL,
    locked       BIGINT NOT NULL,
    step         BIGINT NOT NULL DEFAULT ${SHOUT_STEP},
    base_price   BIGINT NOT NULL DEFAULT ${SHOUT_BASE},
    expires_at   TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shout_history (
    id SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    tid         BIGINT,
    name        TEXT,
    msg         TEXT,
    price       BIGINT,
    created_at  TIMESTAMPTZ DEFAULT now()
  );
`);

await pool.query(`
  INSERT INTO shout_state(id, price, locked, base_price, step, expires_at)
  VALUES (1, ${SHOUT_BASE}, 0, ${SHOUT_BASE}, ${SHOUT_STEP}, now() + interval '60 seconds')
  ON CONFLICT (id) DO NOTHING;
`);

// ✅ Пакеты Stars: amount = число звёзд
const STARS_PACKS = {
  '100':   { stars: 100,    credit: 3_000 },
  '500':   { stars: 500,    credit: 16_000 },
  '1000':  { stars: 1000,   credit: 35_000 },
  '10000': { stars: 10000,  credit: 400_000 },
  '30000': { stars: 30000,  credit: 1_500_000 },
};

const INSURANCE_PACK = { count: 100, stars: 1000 };

// Создание инвойса Stars (XTR)
app.post('/api/stars/create', async (req, res) => {
  try {
    const { uid, pack } = req.body || {};
    const key = String(pack || '').trim();
    const p = STARS_PACKS[key];
    if (!uid || !p) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });

    const payload = `${uid}:pack_${key}`;

    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Stars pack ${key}`,
        description: `Telegram Stars pack ${key}`,
        payload,
        provider_token: '',        // для Stars пусто
        currency: 'XTR',
        prices: [{ label: `Pack ${key}`, amount: p.stars }], // ← число звёзд, НЕ *1000
      })
    }).then(r => r.json());

    if (!tgResp?.ok) {
      console.error('TG createInvoiceLink error:', tgResp);
      return res.status(400).json({ ok:false, error:'TG_API', details: tgResp });
    }
    res.json({ ok:true, link: tgResp.result });
  } catch (e) {
    console.error('stars/create exception:', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// Покупка страховок за Stars
app.post('/api/insurance/create', async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });

    const payload = `${uid}:ins_${INSURANCE_PACK.count}`;

    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Insurance ${INSURANCE_PACK.count}`,
        description: `Insurance ${INSURANCE_PACK.count} bets`,
        payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: `Insurance`, amount: INSURANCE_PACK.stars }],
      })
    }).then(r => r.json());

    if (!tgResp?.ok) {
      console.error('TG createInvoiceLink error:', tgResp);
      return res.status(400).json({ ok:false, error:'TG_API', details: tgResp });
    }
    res.json({ ok:true, link: tgResp.result });
  } catch (e) {
    console.error('insurance/create exception:', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});


/* ========= Состояние раунда ========= */
let state = {
  price: null,
  startPrice: null,

  phase: 'idle',             // idle | betting | locked | pause
  secsLeft: 0,

  roundLen: 60,
  betWindow: 20,
  pauseLen: 10,

  bankBuy: 0,
  bankSell: 0,
  betsBuy: [],
  betsSell: [],

  history: [],               // [{ side, start, end, pct, win }]
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
     VALUES ($1, $2, 1000)             -- старт 1000
     ON CONFLICT (telegram_id) DO NOTHING`,
    [telegramId, username || null]
  );
  if (username) {
    await pool.query(
      `UPDATE users SET username=$2
       WHERE telegram_id=$1 AND (username IS NULL OR username='')`,
      [telegramId, username]
    );
  }
  const r = await pool.query(
    'SELECT id, balance, username, insurance_count FROM users WHERE telegram_id=$1',
    [telegramId]
  );
  return r.rows[0];
}

function todayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function grantDailyIfNeeded(telegramId) {
  const r = await pool.query('SELECT last_daily_bonus FROM users WHERE telegram_id=$1', [telegramId]);
  const last = r.rows[0]?.last_daily_bonus ? new Date(r.rows[0].last_daily_bonus) : null;
  const today = todayUTC();
  const isSameDay =
    last &&
    last.getUTCFullYear() === today.getUTCFullYear() &&
    last.getUTCMonth() === today.getUTCMonth() &&
    last.getUTCDate() === today.getUTCDate();

  if (!isSameDay) {
    await pool.query(
      'UPDATE users SET balance=balance+$1, last_daily_bonus=$2 WHERE telegram_id=$3',
      [DAILY_BONUS, today.toISOString().slice(0, 10), telegramId]
    );
    return DAILY_BONUS;
  }
  return 0;
}

/* ========= Цикл раунда ========= */
async function startRound() {
  if (!state.price) return;
  state.phase = 'betting';
  state.secsLeft = state.roundLen;
  state.startPrice = state.price;
  state.bankBuy = 0; state.bankSell = 0;
  state.betsBuy = []; state.betsSell = [];
  const r = await pool.query(
    'INSERT INTO rounds(start_price) VALUES ($1) RETURNING id',
    [state.startPrice]
  );
  state.currentRoundId = r.rows[0].id;
}

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
  const totalLose = losers.reduce((s, x) => s + (x.insured ? Math.floor(x.amount/2) : x.amount), 0);
  const bank = totalWin + totalLose;

  const fee = Math.floor(totalLose * 0.10); // 10% только с проигравших
  const distributable = bank - fee;

  const pct = ((state.price - state.startPrice) / state.startPrice) * 100;

  await pool.query(
    `UPDATE rounds
     SET end_price=$1, winner_side=$2, fee=$3, distributable=$4
     WHERE id=$5`,
    [state.price, side, fee, distributable, state.currentRoundId]
  );

  if (totalWin > 0 && winners.length) {
    for (const w of winners) {
      const share = Math.round((w.amount / totalWin) * distributable);
      if (share > 0) {
        await pool.query(
          'INSERT INTO payouts(user_id, round_id, amount) VALUES ($1,$2,$3)',
          [w.user_id, state.currentRoundId, share]
        );
        await pool.query(
          'UPDATE users SET balance=balance+$1 WHERE id=$2',
          [share, w.user_id]
        );
        if (w.insured) {
          await pool.query('UPDATE users SET insurance_count=insurance_count+1 WHERE id=$1', [w.user_id]);
        }
      }
    }
  }

  for (const l of losers) {
    if (l.insured) {
      const refund = Math.floor(l.amount / 2);
      if (refund > 0) {
        await pool.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [refund, l.user_id]);
      }
    }
  }

  state.history.unshift({
    side, start: state.startPrice, end: state.price, pct, win: distributable
  });
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
    res.json({
      ok: true,
      user: {
        id: u.id, telegram_id: uid, username: u.username,
        balance: Number(u.balance),
        insurance: Number(u.insurance_count)
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

// Ставка (с MIN_BET=50)
app.post('/api/bet', async (req, res) => {
  try {
    if (state.phase !== 'betting') {
      return res.status(400).json({ ok:false, error:'BETTING_CLOSED' });
    }
    const { uid, side, amount } = req.body || {};
    if (!uid || !side) {
      return res.status(400).json({ ok:false, error:'BAD_REQUEST' });
    }

    const amt = Math.floor(Number(amount) || 0);
    if (!Number.isFinite(amt) || amt < MIN_BET) {
      return res.status(400).json({ ok:false, error:`MIN_BET_${MIN_BET}` });
    }

    const u = await ensureUser(uid);
    if (Number(u.balance) < amt) {
      return res.status(400).json({ ok:false, error:'INSUFFICIENT_BALANCE' });
    }

    let insured = false;
    if (Number(u.insurance_count) > 0) {
      insured = true;
      await pool.query('UPDATE users SET insurance_count=insurance_count-1 WHERE id=$1', [u.id]);
    }

    await pool.query('UPDATE users SET balance=balance-$1 WHERE id=$2', [amt, u.id]);
    await pool.query(
      'INSERT INTO bets(user_id, round_id, side, amount, insured) VALUES ($1,$2,$3,$4,$5)',
      [u.id, state.currentRoundId, side, amt, insured]
    );

    const bet = { user_id: u.id, user: String(uid), amount: amt, ts: Date.now(), insured };
    if (side === 'BUY')      { state.betsBuy.push(bet);  state.bankBuy  += amt; }
    else if (side === 'SELL'){ state.betsSell.push(bet); state.bankSell += amt; }
    else return res.status(400).json({ ok:false, error:'BAD_SIDE' });

    res.json({ ok:true, placed: amt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// Состояние
app.get('/api/round', (req, res) => {
  res.json({
    price: state.price, startPrice: state.startPrice,
    phase: state.phase, secsLeft: state.secsLeft,
    roundLen: state.roundLen, betWindow: state.betWindow, pauseLen: state.pauseLen,
    bank: state.bankBuy + state.bankSell,
    bankBuy: state.bankBuy, bankSell: state.bankSell,
    betsBuy: state.betsBuy, betsSell: state.betsSell,
    lastSettlement: state.lastSettlement
  });
});
app.get('/api/history', (req, res) => res.json({ history: state.history }));

// Статистика пользователя: последние ставки и агрегаты
app.get('/api/stats', async (req, res) => {
  try {
    const { uid } = req.query || {};
    if (!uid) return res.status(400).json({ ok:false, error:'NO_UID' });

    const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
    const userId = u.rows[0]?.id;
    if (!userId) return res.status(400).json({ ok:false, error:'NO_USER' });

    const LIMIT = 10;
    const q = `
      SELECT b.round_id, b.side, b.amount AS bet_amount,
             COALESCE(p.amount, 0) AS payout
      FROM bets b
      LEFT JOIN payouts p
        ON p.user_id = b.user_id AND p.round_id = b.round_id
      WHERE b.user_id = $1
      ORDER BY b.id DESC
      LIMIT $2
    `;
    const r = await pool.query(q, [userId, LIMIT]);

    const recent = r.rows.map(row => ({
      round: row.round_id,
      side: row.side,
      bet: Number(row.bet_amount),
      outcome: Number(row.payout) > 0 ? 'WIN' : 'LOSE',
      amount: Number(row.payout) > 0 ? Number(row.payout) : Number(row.bet_amount),
    }));

    const totalWon = recent
      .filter(r => r.outcome === 'WIN')
      .reduce((s, x) => s + x.amount, 0);
    const totalLost = recent
      .filter(r => r.outcome === 'LOSE')
      .reduce((s, x) => s + x.amount, 0);

    res.json({ ok:true, totalWon, totalLost, recent });
  } catch (e) {
    console.error('/api/stats', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// -------- Shout auction endpoints --------
app.get('/api/shout/state', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let r = await client.query('SELECT * FROM shout_state WHERE id=1 FOR UPDATE');
    let row = r.rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      r = await client.query(`UPDATE shout_state SET winner_user=NULL, winner_tid=NULL, winner_name=NULL, msg=NULL, price=base_price, locked=0, expires_at=now()+interval '60 seconds', updated_at=now() WHERE id=1 RETURNING *`);
      row = r.rows[0];
    }
    await client.query('COMMIT');
    const expiresIn = row.expires_at ? Math.max(0, Math.floor((new Date(row.expires_at) - Date.now())/1000)) : 0;
    res.json({ ok:true, state:{ name: row.winner_name, msg: row.msg || '', price: Number(row.price), step: Number(row.step), expiresIn } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('/api/shout/state', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  } finally {
    client.release();
  }
});

app.post('/api/shout/post', async (req, res) => {
  const { uid, msg } = req.body || {};
  const text = String(msg||'').replace(/\n/g,' ').trim();
  if (!uid || text.length < 1 || text.length > 80) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });

  await ensureUser(uid, null);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let sres = await client.query('SELECT * FROM shout_state WHERE id=1 FOR UPDATE');
    let st = sres.rows[0];
    if (st.expires_at && new Date(st.expires_at) < new Date()) {
      sres = await client.query(`UPDATE shout_state SET winner_user=NULL, winner_tid=NULL, winner_name=NULL, msg=NULL, price=base_price, locked=0, expires_at=now()+interval '60 seconds', updated_at=now() WHERE id=1 RETURNING *`);
      st = sres.rows[0];
    }

    const ures = await client.query('SELECT id, balance, username FROM users WHERE telegram_id=$1 FOR UPDATE', [uid]);
    const user = ures.rows[0];
    if (!user) throw new Error('NO_USER');

    const newPrice = Math.max(Number(st.price) + Number(st.step), Number(st.base_price));
    const isSame = String(st.winner_tid) === String(uid);
    const delta = isSame ? newPrice - Number(st.locked) : newPrice;
    if (delta > Number(user.balance)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok:false, error:'INSUFFICIENT_BALANCE' });
    }

    if (st.winner_user && st.winner_user !== user.id) {
      await client.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [st.locked, st.winner_user]);
    }

    await client.query('UPDATE users SET balance=balance-$1 WHERE id=$2', [delta, user.id]);

    const name = user.username ? '@' + String(user.username).replace(/^@+/, '') : '@' + uid;
    const expiresAt = new Date(Date.now() + SHOUT_HOLD_SEC*1000);
    await client.query('UPDATE shout_state SET winner_user=$1, winner_tid=$2, winner_name=$3, msg=$4, price=$5, locked=$5, expires_at=$6, updated_at=now() WHERE id=1', [user.id, uid, name, text, newPrice, expiresAt.toISOString()]);
    await client.query('INSERT INTO shout_history(user_id, tid, name, msg, price) VALUES ($1,$2,$3,$4,$5)', [user.id, uid, name, text, newPrice]);
    await client.query('COMMIT');

    const expiresIn = Math.max(0, Math.floor((expiresAt.getTime() - Date.now())/1000));
    res.json({ ok:true, state:{ name, msg:text, price:newPrice, step:Number(st.step), expiresIn }, charged: delta, refunded: st.locked });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('/api/shout/post', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  } finally {
    client.release();
  }
});

// Лидерборд за ЧАС
app.get('/api/leaderboard', async (req, res) => {
  try {
    const q = `
      SELECT
        COALESCE(NULLIF(u.username,''), '@' || u.telegram_id::text) AS name,
        SUM(p.amount)::bigint AS won
      FROM payouts p
      JOIN users u ON u.id = p.user_id
      WHERE p.created_at >= now() - interval '1 hour'
        AND p.amount > 0
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


/* ========= Проверка бонусов (подписка + ежедневка) ========= */
// Вызывается фронтом из шита «Пополнение» — без редиректа в бота
app.post('/api/bonus/check', async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return res.json({ ok:false, msg:'NO_UID' });

    // убедимся, что пользователь есть
    await ensureUser(uid, null);

    // проверка подписки на канал (бот должен видеть участников канала)
    let isMember = false;
    try {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ chat_id: CHANNEL, user_id: uid })
      }).then(r=>r.json());
      const status = r?.result?.status;
      isMember = !!status && status !== 'left';
    } catch (e) {
      console.error('getChatMember error', e);
    }

    let added = 0;

    // разовый бонус за подписку
    if (isMember) {
      const q = await pool.query('SELECT channel_bonus_claimed FROM users WHERE telegram_id=$1', [uid]);
      const claimed = q.rows[0]?.channel_bonus_claimed;
      if (!claimed) {
        await pool.query(
          'UPDATE users SET balance=balance+$1, channel_bonus_claimed=TRUE WHERE telegram_id=$2',
          [SUBSCRIBE_BONUS, uid]
        );
        added += SUBSCRIBE_BONUS;
      }
    }

    // ежедневный бонус
    added += await grantDailyIfNeeded(uid);

    // баланс после начислений
    const r2 = await pool.query('SELECT balance FROM users WHERE telegram_id=$1', [uid]);
    const balance = Number(r2.rows[0]?.balance || 0);

    res.json({ ok:true, added, balance, isMember, msg: added>0 ? 'BONUS_APPLIED' : 'NO_CHANGE' });
  } catch (e) {
    console.error('/api/bonus/check', e);
    res.json({ ok:false, msg:'SERVER' });
  }
});

app.listen(PORT, () => console.log('Server listening on', PORT));
