// server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';
import pg from 'pg';
import crypto from 'crypto';
import { grantXpOnce, levelThreshold, xpSpentBeforeLevel, XP } from '../xp.mjs';
import { PRICE_BUMP_STEP, calcPrice } from './shopMath.js';
import {
  BASE_USD_LIMIT,
  BONUS_PER_ACTIVE_FRIEND_USD,
  dayString,
  dailyUsdLimit,
} from './farmUtils.js';
import { runMigrations } from './migrate.js';

function verifyInitData(initData, botToken) {
  try {
    if (!initData || !botToken) return { ok:false };

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok:false };

    // check_string = join(sorted key=value excluding hash)
    const data = [];
    for (const [k, v] of params.entries()) if (k !== 'hash') data.push(`${k}=${v}`);
    data.sort();
    const checkString = data.join('\n');

    // secret_key = HMAC_SHA256(botToken, key="WebAppData")
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    const calc = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    const ok = crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash));

    if (!ok) return { ok:false };

    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate || Math.abs(Date.now()/1000 - authDate) > 3600) return { ok:false };

    const userJson = params.get('user');
    const user = userJson ? JSON.parse(userJson) : null;
    return { ok:true, uid: user?.id, username: user?.username || null, user };
  } catch {
    return { ok:false };
  }
}

// middleware
function requireTgAuth(req, res, next) {
  const initData = req.body?.initData || '';
  const v = verifyInitData(initData, process.env.BOT_TOKEN);
  if (!v.ok || !v.uid) return res.status(401).json({ ok:false, error:'UNAUTHORIZED' });
  req.tgUser = { id: v.uid, username: v.username, raw: v.user };
  // обновляем таймштамп активности пользователя
  pool.query('UPDATE users SET last_active_at=now() WHERE telegram_id=$1', [v.uid]).catch(()=>{});
  next();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
const ASSET = process.env.ASSET || 'ETH';
const BINANCE_WS =
  process.env.BINANCE_WS ||
  'wss://stream.binance.com:9443/ws/ethusdt@miniTicker';

const BOT_TOKEN = process.env.BOT_TOKEN; // нужен для createInvoiceLink
const BOT_USERNAME = process.env.BOT_USERNAME || 'realpricebtc_bot';
const MIN_BET = 50; // ✅ минимальная ставка ($)

// shout auction defaults
const SHOUT_STEP = 100;        // шаг изменения цены
const SHOUT_MIN_PRICE = 100;   // минимальная цена чата
const ONLINE_WINDOW_SEC = 60;  // окно (секунд) для подсчёта онлайн игроков

// бонусы и канал для проверки подписки
const CHANNEL = process.env.CHANNEL || '@erc20coin';
const SUBSCRIBE_BONUS_USD = 30_000; // разовый за подписку
const DAILY_BONUS = 1000;     // ежедневный бонус

// ==== FARM $ ====
const USD_RATE_PER_FP_PER_HOUR = 0.5;     // $/час за 1 FP
const USD_OFFLINE_CAP_HOURS     = 12;      // максимум часов, которые накапливаются оффлайн
const USD_ACTIVE_MIN_BET        = 50;      // фарм $ активен, если есть ставка >= $50 за последние 24 часа

// ==== FARM VOP ====
const VOP_RATE_PER_FP_PER_HOUR  = 0.02;    // VOP/час за 1 FP
const VOP_DAILY_CAP             = 150;     // максимум VOP в сутки с фарма
const VOP_OFFLINE_CAP_HOURS     = 12;
const VOP_MIN_LEVEL             = 25;      // фарм VOP открывается с 25 уровня (level >= 25)

// ==== Магазин бустов и экстракторов ====
const BOOSTERS_USD = [
  { tier:1, id:'usd_booster_1', title:'Booster I',  base:  500,  fp:1, level:1 },
  { tier:2, id:'usd_booster_2', title:'Booster II', base: 1350, fp:3, level:5 },
  { tier:3, id:'usd_booster_3', title:'Booster III',base: 3400, fp:8, level:12 },
];

const EXTRACTORS_VOP = [
  { tier:1, id:'vop_extractor_1', title:'Extractor I',  base:  2500, fp:1, level:25 },
  { tier:2, id:'vop_extractor_2', title:'Extractor II', base:  6750, fp:3, level:28 },
  { tier:3, id:'vop_extractor_3', title:'Extractor III',base: 17000, fp:8, level:32 },
];

// Arena configuration
const ARENA_FEE_PCT = Number(process.env.ARENA_FEE_PCT || 0.10);
const ARENA_FEE_TO_BOTS_PCT = Number(process.env.ARENA_FEE_TO_BOTS_PCT || 1);
const ROUND_FEE_TO_BOTS_PCT = Number(process.env.ROUND_FEE_TO_BOTS_PCT || 1);
const BOT_ARENA_DISTRIBUTION = process.env.BOT_ARENA_DISTRIBUTION || 'equal';
const MIN_BOT_SHARE_CENTS = Number(process.env.MIN_BOT_SHARE_CENTS || 1);
const BOT_ARENA_REMAINDER = process.env.BOT_ARENA_REMAINDER || 'first_bot';

const ARENA = {
  startBank: 10_000,
  minBid: 50,
  step: 10,
  pauseLen: 2,
  rakePct: ARENA_FEE_PCT,
};

const ARENA_TIMER = {
  FIRST_BID_START: 180,      // 3 минуты
  THRESHOLD_LONG: 120,       // 2:00
  THRESHOLD_SHORT: 30,       // 0:30
  EXTENSION_LONG: 20,        // +20s
  EXTENSION_MEDIUM: 10,      // +10s
  OVERTIME_FLOOR: 15,        // не меньше 15s
  MAX_CAP: 180,              // верхняя «крыша» (3 мин)
};

const ARENA_MAX_BETS_PER_ROUND = 20;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await runMigrations(pool);
  console.log('migrations applied');
} catch (e) {
  console.error('migrations failed', e);
}

async function seedQuestTemplates(pool){
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM quest_templates');
  if (rows[0].c) return;
  const data = [
    { qkey:'daily_bets_3', scope:'day',  title:'Сделай 3 ставки',  descr:'Любые исходы', goal:3,  reward_type:'USD', reward_value:300, min_level:0 },
    { qkey:'daily_win_1',  scope:'day',  title:'Выиграй 1 раунд',  descr:'Главная игра',  goal:1,  reward_type:'XP',  reward_value:500, min_level:0 },
    { qkey:'arena_bids_5', scope:'day',  title:'5 ставок на арене',descr:'Любые ставки',   goal:5,  reward_type:'USD', reward_value:500, min_level:0 },
    { qkey:'week_wins_10', scope:'week', title:'10 побед за неделю',descr:'Суммарно',      goal:10, reward_type:'USD', reward_value:2000, min_level:0 },
  ];
  for (const t of data){
    await pool.query(
      `INSERT INTO quest_templates (qkey,scope,title,descr,goal,reward_type,reward_value,min_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [t.qkey,t.scope,t.title,t.descr,t.goal,t.reward_type,t.reward_value,t.min_level]
    );
  }
}

function nextMidnightUTC(){ const d=new Date(); d.setUTCHours(24,0,0,0); return d; }
function nextWeekUTC(){ const d=new Date(); const w=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+(8-w)); d.setUTCHours(0,0,0,0); return d; }
function nextMonthUTC(){ const n=new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth()+1, 1, 0,0,0)); }

async function ensureUserQuests(pool, userId, userLevel = 0) {
  const tmpl = await pool.query(`SELECT * FROM quest_templates ORDER BY id`);
  for (const t of tmpl.rows) {
    if (userLevel < t.min_level) continue;
    let expires = null;
    if (t.scope === 'day') expires = nextMidnightUTC();
    if (t.scope === 'week') expires = nextWeekUTC();
    if (t.scope === 'season') expires = nextMonthUTC();
    const exists = await pool.query(
      `SELECT 1 FROM user_quests
       WHERE user_id=$1 AND template_id=$2
         AND (expires_at IS NOT DISTINCT FROM $3)`,
      [userId, t.id, expires]
    );
    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO user_quests(user_id, template_id, expires_at)
         VALUES ($1,$2,$3)`,
        [userId, t.id, expires]
      );
    }
  }
}

async function addQuestProgress(userId, qkey, delta = 1) {
  const t = await pool.query(`SELECT id, scope FROM quest_templates WHERE qkey=$1`, [qkey]);
  if (t.rowCount === 0) return;
  const tmpl = t.rows[0];
  let expires = null;
  if (tmpl.scope === 'day') expires = nextMidnightUTC();
  if (tmpl.scope === 'week') expires = nextWeekUTC();
  if (tmpl.scope === 'season') expires = nextMonthUTC();
  const uq = await pool.query(
    `SELECT id, progress, is_claimed FROM user_quests
     WHERE user_id=$1 AND template_id=$2
       AND (expires_at IS NOT DISTINCT FROM $3)
     LIMIT 1`,
    [userId, tmpl.id, expires]
  );
  if (uq.rowCount === 0) {
    await pool.query(
      `INSERT INTO user_quests(user_id, template_id, expires_at, progress)
       VALUES ($1,$2,$3,$4)`,
      [userId, tmpl.id, expires, delta]
    );
  } else {
    const row = uq.rows[0];
    if (!row.is_claimed) {
      await pool.query(`UPDATE user_quests SET progress=progress+$2 WHERE id=$1`, [row.id, delta]);
    }
  }
}

const questClaimRate = new Map();

export async function listTelegramIds() {
  const { rows } = await pool.query(
    'SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL'
  );
  return rows.map((r) => Number(r.telegram_id));
}

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
    last_active_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    level INT NOT NULL DEFAULT 1,
    xp BIGINT NOT NULL DEFAULT 0,
    last_chat_xp_at TIMESTAMPTZ,
    streak_wins INT NOT NULL DEFAULT 0,
    last_result_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_bot BOOLEAN NOT NULL DEFAULT FALSE
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

  CREATE TABLE IF NOT EXISTS xp_log(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    source TEXT NOT NULL,
    source_id BIGINT,
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, source, source_id)
  );

  CREATE TABLE IF NOT EXISTS ledger(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    type TEXT NOT NULL,
    amount BIGINT NOT NULL,
    meta JSONB,
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
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now()`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now()`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp BIGINT NOT NULL DEFAULT 0`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_xp_at TIMESTAMPTZ`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_wins INT NOT NULL DEFAULT 0`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_result_at TIMESTAMPTZ`);
await pool.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS insured BOOLEAN NOT NULL DEFAULT FALSE`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_spent BIGINT NOT NULL DEFAULT 0`);

await pool.query(`ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fp_usd       INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fp_vop       INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vop_balance  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_usd TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_claim_vop TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_usd_today BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_vop_today BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_usd_date DATE,
  ADD COLUMN IF NOT EXISTS claimed_vop_date DATE,
  ADD COLUMN IF NOT EXISTS boost_t1 INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_t2 INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_t3 INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extract_t1 INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extract_t2 INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extract_t3 INT NOT NULL DEFAULT 0;
`);

await pool.query(`CREATE TABLE IF NOT EXISTS farm_history(
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)`);

await pool.query(`CREATE TABLE IF NOT EXISTS xp_log(
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  source TEXT NOT NULL,
  source_id BIGINT,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, source, source_id)
)`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS quest_templates (
    id SERIAL PRIMARY KEY,
    qkey TEXT UNIQUE NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('day','week','season','achv')),
    title TEXT NOT NULL,
    descr TEXT NOT NULL,
    goal INT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('USD','VOP','XP')),
    reward_value INT NOT NULL,
    min_level INT NOT NULL DEFAULT 0
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS user_quests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INT NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
    progress INT NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE (user_id, template_id, started_at)
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS quest_claims (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INT NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,
    reward_value INT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS arena_rounds(
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    winner_user_id INT REFERENCES users(id),
    bank BIGINT NOT NULL DEFAULT 0,
    rake BIGINT NOT NULL DEFAULT 0,
    paid BIGINT NOT NULL DEFAULT 0,
    winner_tid BIGINT,
    won_amount BIGINT,
    settled_at TIMESTAMPTZ
  );
`);

await pool.query(`ALTER TABLE arena_rounds ADD COLUMN IF NOT EXISTS winner_tid BIGINT`);
await pool.query(`ALTER TABLE arena_rounds ADD COLUMN IF NOT EXISTS won_amount BIGINT`);
await pool.query(`ALTER TABLE arena_rounds ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS arena_bids(
    id SERIAL PRIMARY KEY,
    round_id INT REFERENCES arena_rounds(id),
    user_id INT REFERENCES users(id),
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS arena_user_round (
    round_id   INT NOT NULL,
    user_id    INT NOT NULL REFERENCES users(id),
    bets_used  INT NOT NULL DEFAULT 0,
    refreshed  BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (round_id, user_id)
  );
`);

await pool.query(`DROP TABLE IF EXISTS shout_state; DROP TABLE IF EXISTS shout_history;`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shout_state (
    id               SMALLINT PRIMARY KEY DEFAULT 1,
    holder_user_id   INT REFERENCES users(id),
    holder_tid       BIGINT,
    holder_name      TEXT,
    message          TEXT,
    current_price    BIGINT NOT NULL DEFAULT 0,
    current_step     BIGINT NOT NULL DEFAULT 100,
    last_change_at   TIMESTAMPTZ DEFAULT now(),
    last_decay_round_id INT
  );
`);
await pool.query(`ALTER TABLE shout_state ADD COLUMN IF NOT EXISTS last_decay_round_id INT`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shout_bids (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id),
    telegram_id BIGINT,
    username    TEXT,
    message     TEXT,
    paid        BIGINT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shout_messages (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    username TEXT,
    text TEXT NOT NULL,
    price BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

await pool.query(`
  INSERT INTO shout_state(id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;
`);

await seedQuestTemplates(pool);


// === BOTS MODULE START ===========================================
const BOTS_ENABLED = String(process.env.BOTS_ENABLED || 'true') === 'true';
const BOTS_COUNT = Number(process.env.BOTS_COUNT || 3);
const BOTS_START_BALANCE = Number(process.env.BOTS_START_BALANCE || 100000);
const BOTS_MAX_STAKE_PCT = Number(process.env.BOTS_MAX_STAKE_PCT || 0.20); // ≤20% за раунд
const BOTS_MAX_BETS_PER_ROUND = Number(process.env.BOTS_MAX_BETS_PER_ROUND || 3);
const BOTS_IMBALANCE_BIAS = Number(process.env.BOTS_IMBALANCE_BIAS || 0.70); // 70% — в меньший банк
const MIN_BET_SAFE = typeof MIN_BET === 'number' ? MIN_BET : 50; // подстраховка
const DEBUG_BOTS = String(process.env.DEBUG_BOTS || 'true') === 'true';

await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;`);
await pool.query(`ALTER TABLE bets  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS bot_round_spend(
    round_id INT PRIMARY KEY,
    spent_by_user JSONB NOT NULL DEFAULT '{}'  -- {"userId": amount}
  );
`);

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

let botList = [];                  // [{id, telegram_id, username}]
let botSpent = {};                 // in-memory { userId: spentThisRound }
let botBetsLeft = {};              // { userId: howManyBetsLeft }
let botPlannedSec = {};            // { userId: [seconds...] } — простое расписание

async function ensureBots() {
  if (!BOTS_ENABLED) return;
  for (let i = 1; i <= BOTS_COUNT; i++) {
    const tgId = 100000000000 + i; // синтетический TG id
    await pool.query(`
      INSERT INTO users(telegram_id, username, balance, is_bot)
      VALUES ($1,$2,$3, TRUE)
      ON CONFLICT (telegram_id) DO UPDATE SET is_bot=TRUE
    `, [tgId, `@dealer${i}`, BOTS_START_BALANCE]);
  }
  const r = await pool.query(`SELECT id, telegram_id, username FROM users WHERE is_bot=TRUE ORDER BY id`);
  botList = r.rows;
  if (DEBUG_BOTS) console.log('[bots] ready:', botList.map(b=>b.username||b.telegram_id).join(', '));
}

function chooseSideWithBias(bankBuy, bankSell) {
  const weaker = bankBuy <= bankSell ? 'BUY' : 'SELL';
  if (Math.random() < BOTS_IMBALANCE_BIAS) return weaker;
  return Math.random() < 0.5 ? weaker : (weaker === 'BUY' ? 'SELL' : 'BUY');
}

function pickAmount(balance, allowed, bankBuy, bankSell) {
  const total = bankBuy + bankSell;
  const skew = total > 0 ? Math.min(0.5, Math.abs(bankBuy - bankSell) / total) : 0; // 0..0.5
  const mult = 1 + skew; // 1..1.5 — чутка больше при сильном перекосе
  const max = Math.max(MIN_BET_SAFE, Math.floor(allowed * mult));
  const raw = MIN_BET_SAFE + Math.floor(Math.random() * Math.max(1, (max - MIN_BET_SAFE)));
  return clamp(raw, MIN_BET_SAFE, allowed);
}

// вызываем в начале каждого раунда
async function botsRoundStart(roundId, betWindow) {
  if (!BOTS_ENABLED || !botList.length) return;
  botSpent = {};
  botBetsLeft = {};
  botPlannedSec = {};

  // мягко сбросим в БД
  await pool.query(`
    INSERT INTO bot_round_spend(round_id, spent_by_user)
    VALUES ($1, '{}'::jsonb)
    ON CONFLICT (round_id) DO UPDATE SET spent_by_user='{}'::jsonb
  `, [roundId]);

  // очень простой план: 1..BOTS_MAX_BETS_PER_ROUND рандомных секунд в [0..betWindow-2]
  for (const b of botList) {
    const cnt = 1 + Math.floor(Math.random() * Math.max(1, BOTS_MAX_BETS_PER_ROUND));
    botBetsLeft[b.id] = cnt;
    const s = new Set();
    const last = Math.max(0, (betWindow||10) - 2);
    while (s.size < cnt) s.add(Math.floor(Math.random() * Math.max(1, last+1)));
    botPlannedSec[b.id] = Array.from(s).sort((a,b)=>a-b);
  }
  if (DEBUG_BOTS) console.log('[bots] planned secs:', botPlannedSec);
}

async function tryBotBet(botUserId) {
  if (state.phase !== 'betting' || !state.currentRoundId) return;

  // баланс и лимит раунда
  const { rows:[u] } = await pool.query(
    `SELECT id, balance FROM users WHERE id=$1 AND is_bot=TRUE`,
    [botUserId]
  );
  if (!u) { if (DEBUG_BOTS) console.log('[bots] skip: no such bot', botUserId); return; }
  if (u.balance < MIN_BET_SAFE) { if (DEBUG_BOTS) console.log('[bots] skip: low balance', botUserId, u.balance); return; }

  const maxRound = Math.floor(u.balance * BOTS_MAX_STAKE_PCT);
  const spent = botSpent[botUserId] || 0;
  const allowed = Math.max(0, maxRound - spent);
  if (allowed < MIN_BET_SAFE) { if (DEBUG_BOTS) console.log('[bots] skip: limit reached', botUserId, spent, '/', maxRound); return; }

  const side = chooseSideWithBias(state.bankBuy, state.bankSell);
  const amount = pickAmount(u.balance, allowed, state.bankBuy, state.bankSell);

  // атомарное списание, чтобы не уйти в минус
  const upd = await pool.query(
    `UPDATE users SET balance=balance-$1 WHERE id=$2 AND balance >= $1 RETURNING id`,
    [amount, u.id]
  );
  if (upd.rowCount === 0) { if (DEBUG_BOTS) console.log('[bots] fail debit', botUserId, amount); return; }

  await pool.query(
    `INSERT INTO bets(user_id, round_id, side, amount, is_bot) VALUES ($1,$2,$3,$4,TRUE)`,
    [u.id, state.currentRoundId, side, amount]
  );

  // обновим память/банк для расчёта перекоса
  const bet = { user_id: u.id, user: `bot:${u.id}`, amount, ts: Date.now(), is_bot:true };
  if (side === 'BUY') { state.betsBuy.push(bet); state.bankBuy += amount; }
  else               { state.betsSell.push(bet); state.bankSell += amount; }

  botSpent[botUserId] = spent + amount;
  await pool.query(`
    INSERT INTO bot_round_spend(round_id, spent_by_user)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (round_id) DO UPDATE SET spent_by_user=EXCLUDED.spent_by_user
  `, [state.currentRoundId, JSON.stringify(botSpent)]);

  if (DEBUG_BOTS) console.log('[bots] bet', { botUserId, side, amount });
}

// вызываем каждую секунду во время betting
async function botsOnTick() {
  if (!BOTS_ENABLED || state.phase !== 'betting' || !state.currentRoundId) return;

  // пройдем по ботам и проверим, у кого запланирована ставка на эту секунду окна
  const elapsed = state.roundLen - state.secsLeft; // 0..roundLen-1
  const inBetWindow = elapsed < (state.betWindow || 10);
  if (!inBetWindow) return;

  for (const b of botList) {
    const plan = botPlannedSec[b.id] || [];
    if (!plan.length) continue;
    if (plan[0] === elapsed) {
      plan.shift();
      if ((botBetsLeft[b.id]||0) > 0) {
        botBetsLeft[b.id] -= 1;
        await tryBotBet(b.id).catch(console.error);
      }
    }
  }
}
// === BOTS MODULE END =============================================

await ensureBots();

// ✅ Пакеты Stars: amount = число звёзд
const STARS_PACKS = {
  '100':   { stars: 100,    credit: 30_000 },
  '500':   { stars: 500,    credit: 160_000 },
  '1000':  { stars: 1000,   credit: 350_000 },
  '10000': { stars: 10000,  credit: 4_000_000 },
  '30000': { stars: 30000,  credit: 15_000_000 },
};

const INSURANCE_PACK = { count: 100, stars: 1000 };

// Создание инвойса Stars (XTR)
app.post('/api/stars/create', requireTgAuth, async (req, res) => {
  try {
    const { pack } = req.body || {};
    const key = String(pack || '').trim();
    const p = STARS_PACKS[key];
    if (!p) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });

    const uid = req.tgUser.id;
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
app.post('/api/insurance/create', requireTgAuth, async (req, res) => {
  try {
    const uid = req.tgUser.id;

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
    'SELECT id, balance, vop_balance, username, insurance_count, level, xp, streak_wins FROM users WHERE telegram_id=$1',
    [telegramId]
  );
  const u = r.rows[0];
  if (u) await ensureUserQuests(pool, u.id, Number(u.level || 0));
  return u;
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

// farming helpers
function ensureDayBuckets(kind, u, today) {
  const dateField = kind === 'usd' ? 'claimed_usd_date' : 'claimed_vop_date';
  const todayField = kind === 'usd' ? 'claimed_usd_today' : 'claimed_vop_today';
  const day = today.toISOString().slice(0,10);
  if (u[dateField]?.toISOString?.().slice(0,10) !== day) {
    u[dateField] = day;
    u[todayField] = 0;
    return true;
  }
  return false;
}

function ensureFriendBonus(u, today) {
  const day = today.toISOString().slice(0,10);
  if (u.friend_bonus_date?.toISOString?.().slice(0,10) !== day) {
    u.friend_bonus_date = day;
    u.friend_bonus_usd_today = 0;
    return true;
  }
  return false;
}

async function checkUsdActive(userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM bets WHERE user_id=$1 AND amount>=$2 AND created_at>now()-interval \'24 hours\' LIMIT 1',
    [userId, USD_ACTIVE_MIN_BET]
  );
  return rows.length > 0;
}

function computeAccrual(kind, u, now, dailyCapOverride = null) {
  const cfg = kind === 'usd'
    ? {
        fp: u.fp_usd,
        rate: USD_RATE_PER_FP_PER_HOUR,
        last: u.last_claim_usd,
        offline: USD_OFFLINE_CAP_HOURS,
        dailyCap: dailyCapOverride ?? BASE_USD_LIMIT,
        claimed: u.claimed_usd_today,
      }
    : {
        fp: u.fp_vop,
        rate: VOP_RATE_PER_FP_PER_HOUR,
        last: u.last_claim_vop,
        offline: VOP_OFFLINE_CAP_HOURS,
        dailyCap: VOP_DAILY_CAP,
        claimed: u.claimed_vop_today,
      };
  const ratePerHour = cfg.fp * cfg.rate;
  if (!cfg.last) return { ratePerHour, claimable: 0 };
  const elapsed = Math.min((now - new Date(cfg.last)) / 3600000, cfg.offline);
  let acc = Math.floor(ratePerHour * elapsed);
  const capLeft = cfg.dailyCap - cfg.claimed;
  if (acc > capLeft) acc = Math.max(0, capLeft);
  return { ratePerHour, claimable: acc };
}

async function getActiveFriendsToday(userId) {
  try {
    const { rows:[{ cnt }] } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM referral_activity
       WHERE referrer_id=$1 AND last_active_at >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
      [userId]
    );
    return cnt || 0;
  } catch (e) {
    if (e.message?.includes('relation') && e.message.includes('referral_activity')) {
      console.warn('getActiveFriendsToday: referral_activity missing');
      return 0;
    }
    throw e;
  }
}

async function markFriendActivityOnBet(friendUserId, friendTid) {
  try {
    const { rows } = await pool.query(
      'SELECT referrer_user_id FROM referrals WHERE referred_telegram_id=$1',
      [friendTid]
    );
    const refId = rows[0]?.referrer_user_id;
    if (!refId || refId === friendUserId) return;
    const { rows:ex } = await pool.query(
      'SELECT last_active_at FROM referral_activity WHERE referrer_id=$1 AND friend_id=$2',
      [refId, friendUserId]
    );
    let shouldLog = false;
    const startOfDayUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    if (!ex[0] || ex[0].last_active_at < startOfDayUtc) shouldLog = true;
    await pool.query(
      `INSERT INTO referral_activity (referrer_id, friend_id, last_active_at)
       VALUES ($1,$2,now())
       ON CONFLICT (referrer_id, friend_id)
       DO UPDATE SET last_active_at = EXCLUDED.last_active_at`,
      [refId, friendUserId]
    );
    if (shouldLog) console.log('trackFriendActive', { referrerId: refId, friendId: friendUserId, ts: new Date().toISOString() });
  } catch (e) {
    if (e.message?.includes('relation') && e.message.includes('referral_activity')) {
      console.warn('markFriendActivityOnBet: referral_activity missing');
      return;
    }
    console.error('markFriendActivityOnBet', e);
    throw e;
  }
}

async function upsertDailyCap(userId, day, baseCap, bonusCap, usedUsd) {
  const dayStr = day.toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO daily_caps(user_id, day_utc, cap_usd_base, cap_usd_bonus, used_usd)
       VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, day_utc) DO UPDATE
       SET cap_usd_base=$3, cap_usd_bonus=$4, used_usd=$5`,
    [userId, dayStr, baseCap, bonusCap, usedUsd]
  );
}

async function getFarmUsdState(uid) {
  await ensureUser(uid, null);
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];
  const now = new Date();
  const today = todayUTC();
  const dayStr = today.toISOString().slice(0, 10);
  if (ensureDayBuckets('usd', u, today)) {
    await pool.query('UPDATE users SET claimed_usd_today=0, claimed_usd_date=$2 WHERE id=$1', [u.id, dayStr]);
  }
  if (!u.last_claim_usd) {
    await pool.query('UPDATE users SET last_claim_usd=now() WHERE id=$1', [u.id]);
    u.last_claim_usd = new Date();
  }
  const active = await checkUsdActive(u.id);
  if (ensureFriendBonus(u, today)) {
    await pool.query('UPDATE users SET friend_bonus_usd_today=0, friend_bonus_date=$2 WHERE id=$1', [u.id, dayStr]);
  }
  const activeFriends = await getActiveFriendsToday(u.id);
  const maxCap = dailyUsdLimit(activeFriends);
  await upsertDailyCap(u.id, today, BASE_USD_LIMIT, activeFriends * BONUS_PER_ACTIVE_FRIEND_USD, u.claimed_usd_today);
  const accr = computeAccrual('usd', u, now, maxCap);
  const upgrades = BOOSTERS_USD.map(up => {
    const purchases = Number(u[`boost_t${up.tier}`] || 0);
    const price = calcPrice(up.base, purchases);
    const pricePerFp = Math.round(price / up.fp);
    const mod = purchases % PRICE_BUMP_STEP;
    const next = mod === 0 && purchases > 0 ? 0 : PRICE_BUMP_STEP - mod;
    let canBuy = true, reason = null;
    if (u.level < up.level) { canBuy = false; reason = 'LEVEL'; }
    else if (u.balance < price) { canBuy = false; reason = 'BALANCE'; }
    return {
      id: up.id,
      title: up.title,
      fp: up.fp,
      reqLevel: up.level,
      price,
      pricePerFp,
      purchases_mod: mod,
      next_bump_in: next,
      canBuy,
      reason
    };
  });
  const hist = await pool.query("SELECT type, amount, meta, created_at FROM farm_history WHERE user_id=$1 AND type LIKE '%usd' ORDER BY id DESC LIMIT 10", [u.id]);
  return {
    ok: true,
    active,
    speed_usd_per_hour: accr.ratePerHour,
    fp: u.fp_usd,
    claimable: accr.claimable,
    used_usd_today: u.claimed_usd_today,
    cap_usd_base: BASE_USD_LIMIT,
    cap_usd_bonus: activeFriends * BONUS_PER_ACTIVE_FRIEND_USD,
    cap_usd_effective: maxCap,
    active_friends_today: activeFriends,
    friend_bonus_per_friend_usd: BONUS_PER_ACTIVE_FRIEND_USD,
    offline_cap_hours: USD_OFFLINE_CAP_HOURS,
    lastClaimAt: u.last_claim_usd,
    upgrades,
    history: hist.rows.map(r => ({ type: r.type, amount: Number(r.amount), ts: r.created_at, meta: r.meta })),
    limitToday: { base: BASE_USD_LIMIT, max: maxCap, used: u.claimed_usd_today, friends: activeFriends },
    // backward compatibility
    available_to_claim: accr.claimable,
    speed_per_hour: accr.ratePerHour,
    limit_today_used: u.claimed_usd_today,
    limit_today_total: maxCap,
    bonus_per_friend: BONUS_PER_ACTIVE_FRIEND_USD,
  };
}

/* ========= Auction subsystem ========= */
let arena = {
  phase: 'idle',            // 'idle' | 'betting' | 'pause'
  secsLeft: 0,
  bank: ARENA.startBank,
  currentBid: 0,
  nextBid: ARENA.minBid,
  leaderUserId: null,
  leaderTid: null,
  leaderName: null,
  roundId: null,
};

async function settleArenaRound() {
  // если лидера нет — просто уходим в idle
  if (!arena.leaderUserId) return toIdle();
  const fee = Math.floor(arena.bank * ARENA.rakePct);
  const botsShare = Math.floor(fee * ARENA_FEE_TO_BOTS_PCT);
  const paid = arena.bank - fee;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET balance = balance + $1, xp = xp + $1 WHERE id = $2', [paid, arena.leaderUserId]);
    await client.query(`
        UPDATE arena_rounds
        SET ended_at = now(), winner_user_id = $1, bank = $2, rake = $3, paid = $4,
            winner_tid = $5, won_amount = $4, settled_at = now()
        WHERE id = $6
    `, [arena.leaderUserId, arena.bank, fee, paid, arena.leaderTid, arena.roundId]);

    if (botsShare > 0) {
      await distributeArenaFeeToBots(client, arena.roundId, botsShare, fee);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // в паузу
  arena.phase = 'pause';
  arena.secsLeft = ARENA.pauseLen;
}

async function distributeArenaFeeToBots(client, roundId, amount, totalFee) {
  if (BOT_ARENA_DISTRIBUTION !== 'equal') return;
  const res = await client.query('SELECT id FROM users WHERE is_bot=TRUE');
  const bots = res.rows;
  if (!bots.length) return;

  const per = Math.floor((amount / bots.length) / MIN_BOT_SHARE_CENTS) * MIN_BOT_SHARE_CENTS;
  let remainder = amount - per * bots.length;

  for (let i = 0; i < bots.length; i++) {
    let add = per;
    if (BOT_ARENA_REMAINDER === 'first_bot' && i === 0) add += remainder;
    if (add <= 0) continue;
    const botId = bots[i].id;
    await client.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [add, botId]);
    await client.query(
      'INSERT INTO ledger(user_id,type,amount,meta) VALUES($1,$2,$3,$4)',
      [botId, 'arena_fee_share', add, JSON.stringify({ round_id: roundId, amount: add, total_fee: totalFee })]
    );
  }

  if (globalThis.metrics?.arena?.bot_fee_distributed) {
    globalThis.metrics.arena.bot_fee_distributed(amount, bots.length, roundId);
  }
}

async function distributeRoundFeeToBots(roundId, amount, totalFee) {
  if (BOT_ARENA_DISTRIBUTION !== 'equal') return;
  const res = await pool.query('SELECT id FROM users WHERE is_bot=TRUE');
  const bots = res.rows;
  if (!bots.length) return;

  const per = Math.floor((amount / bots.length) / MIN_BOT_SHARE_CENTS) * MIN_BOT_SHARE_CENTS;
  let remainder = amount - per * bots.length;

  for (let i = 0; i < bots.length; i++) {
    let add = per;
    if (BOT_ARENA_REMAINDER === 'first_bot' && i === 0) add += remainder;
    if (add <= 0) continue;
    const botId = bots[i].id;
    await pool.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [add, botId]);
    await pool.query(
      'INSERT INTO ledger(user_id,type,amount,meta) VALUES($1,$2,$3,$4)',
      [botId, 'round_fee_share', add, JSON.stringify({ round_id: roundId, amount: add, total_fee: totalFee })]
    );
  }
}

function toIdle() {
  arena.phase = 'idle';
  arena.secsLeft = 0;
  arena.bank = ARENA.startBank;
  arena.currentBid = 0;
  arena.nextBid = ARENA.minBid;
  arena.leaderUserId = arena.leaderTid = arena.leaderName = null;
  arena.roundId = null;
}

setInterval(async () => {
  if (arena.phase === 'betting') {
    arena.secsLeft = Math.max(0, arena.secsLeft - 1);
    if (arena.secsLeft === 0) await settleArenaRound();
  } else if (arena.phase === 'pause') {
    arena.secsLeft = Math.max(0, arena.secsLeft - 1);
    if (arena.secsLeft === 0) toIdle();
  }
}, 1000);

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
  if (BOTS_ENABLED) await botsRoundStart(state.currentRoundId, state.betWindow);
}

function tick() {
  (async () => {
    if (state.phase === 'idle') {
      if (!state.price) return;
      await startRound();
      return;
    }

    state.secsLeft--;

    if (state.phase === 'betting') {
      await botsOnTick();

      if (state.secsLeft === state.roundLen - 1) {
        try {
          await pool.query(
            `UPDATE shout_state
             SET current_price = GREATEST($1, current_price - $2), last_decay_round_id=$3
             WHERE id=1 AND (last_decay_round_id IS NULL OR last_decay_round_id <> $3)`,
            [SHOUT_MIN_PRICE, SHOUT_STEP, state.currentRoundId]
          );
        } catch (e) {
          console.error('shout decay', e);
        }
      }

      if (state.secsLeft === state.roundLen - state.betWindow) {
        state.phase = 'locked';
      }
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
  const botsShare = Math.floor(fee * ROUND_FEE_TO_BOTS_PCT);
  const distributable = bank - fee;

  const pct = ((state.price - state.startPrice) / state.startPrice) * 100;

  await pool.query(
    `UPDATE rounds
     SET end_price=$1, winner_side=$2, fee=$3, distributable=$4
     WHERE id=$5`,
    [state.price, side, fee, distributable, state.currentRoundId]
  );

  const byUser = new Map();
  for (const w of winners) {
    const cur = byUser.get(w.user_id) || { stake: 0, payout: 0 };
    cur.stake += w.amount;
    byUser.set(w.user_id, cur);
  }

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
        const cur = byUser.get(w.user_id);
        cur.payout += share;
        byUser.set(w.user_id, cur);
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

  if (botsShare > 0) {
    await distributeRoundFeeToBots(state.currentRoundId, botsShare, fee);
  }

  const winUsers = new Set(winners.map(w => w.user_id));
  const loseUsers = new Set(losers.map(l => l.user_id));
  for (const id of winUsers) {
    await pool.query('UPDATE users SET streak_wins=streak_wins+1, last_result_at=now() WHERE id=$1', [id]);
    loseUsers.delete(id);
  }
  for (const id of loseUsers) {
    await pool.query('UPDATE users SET streak_wins=0, last_result_at=now() WHERE id=$1', [id]);
  }

  for (const id of winUsers) {
    await addQuestProgress(id, 'daily_win_1', 1);
    await addQuestProgress(id, 'week_wins_10', 1);
  }

  for (const [userId, agg] of byUser.entries()) {
    const profit = Math.max(0, Math.floor(agg.payout - agg.stake));
    const xpGain = profit * XP.WIN_PER_DOLLAR;
    await grantXpOnce(pool, userId, 'win', state.currentRoundId, xpGain);
  }

  state.history.unshift({
    side, start: state.startPrice, end: state.price, pct, win: distributable
  });
  while (state.history.length > MAX_HIST) state.history.pop();

  state.lastSettlement = {
    side, totalBank: bank, fee, distributable, botsShare,
    payouts: winners.map(w => ({
      user: w.user,
      amount: totalWin ? Math.round((w.amount / totalWin) * distributable) : 0,
    })),
  };
  state.phase = 'pause';
  state.secsLeft = state.pauseLen;
}

/* ========= API ========= */

// Регистрация/пинг (сохранение username + кол-во рефералов)
app.post('/api/auth', async (req, res) => {
  try {
    const { uid, username } = req.body || {};
    if (!uid) return res.status(400).json({ ok: false, error: 'NO_UID' });

    const u = await ensureUser(uid, username);

    await pool.query('UPDATE users SET last_seen=now() WHERE telegram_id=$1', [uid]);

    // считаем рефералов
    const { rows: [ref] } = await pool.query(
      'SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_user_id=$1',
      [u.id]
    );

    const lvl = Number(u.level);
    const xp = Number(u.xp);
    res.json({
      ok: true,
      user: {
        id: u.id,
        telegram_id: uid,
        username: u.username,
        balance: Number(u.balance),
        vop_balance: Number(u.vop_balance || 0),
        ref_count: ref?.c ?? 0,
        insurance: Number(u.insurance_count || 0),
        level: lvl,
        xp,
        level_threshold: levelThreshold(lvl),
        level_progress: xp - xpSpentBeforeLevel(lvl),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER' });
  }
});

// Возвращает клейм-доступ и число VOP
app.post('/api/claim/info', async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return res.json({ ok:false, error:'NO_UID' });

    const u = await ensureUser(uid, null);
    // кол-во рефералов
    const { rows:[ref] } = await pool.query(
      'SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_user_id=$1',
      [u.id]
    );
    const refCount = ref?.c ?? 0;

    // что показывать в sheet
    const claimable_vop = Math.max(0, Math.floor(Number(u.balance) || 0));

    res.json({
      ok: true,
      eligible: refCount >= 30,
      claimable_vop
    });
  } catch (e) {
    console.error('claim/info', e);
    res.json({ ok:false, error:'SERVER' });
  }
});

// Ставка (с MIN_BET=50)
app.post('/api/bet', requireTgAuth, async (req, res) => {
  try {
    if (state.phase !== 'betting') {
      return res.status(400).json({ ok:false, error:'BETTING_CLOSED' });
    }
    const { side, amount } = req.body || {};
    if (!side) {
      return res.status(400).json({ ok:false, error:'BAD_REQUEST' });
    }

    const amt = Math.floor(Number(amount) || 0);
    if (!Number.isFinite(amt) || amt < MIN_BET) {
      return res.status(400).json({ ok:false, error:`MIN_BET_${MIN_BET}` });
    }

    const tgId = req.tgUser.id;
    const uname = req.tgUser.username ? '@' + req.tgUser.username : null;
    const u = await ensureUser(tgId, uname);
    if (Number(u.balance) < amt) {
      return res.status(400).json({ ok:false, error:'INSUFFICIENT_BALANCE' });
    }

    let insured = false;
    if (Number(u.insurance_count) > 0) {
      insured = true;
      await pool.query('UPDATE users SET insurance_count=insurance_count-1 WHERE id=$1', [u.id]);
    }

    await pool.query('UPDATE users SET balance=balance-$1 WHERE id=$2', [amt, u.id]);
    const ins = await pool.query(
      'INSERT INTO bets(user_id, round_id, side, amount, insured) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [u.id, state.currentRoundId, side, amt, insured]
    );

    const bet = { user_id: u.id, user: String(tgId), amount: amt, ts: Date.now(), insured };
    if (side === 'BUY')      { state.betsBuy.push(bet);  state.bankBuy  += amt; }
    else if (side === 'SELL'){ state.betsSell.push(bet); state.bankSell += amt; }
    else return res.status(400).json({ ok:false, error:'BAD_SIDE' });

    await grantXpOnce(pool, u.id, 'bet', ins.rows[0].id, XP.BET);
    await addQuestProgress(u.id, 'daily_bets_3', 1);
    await addQuestProgress(u.id, 'week_bets_50', 1);

    await markFriendActivityOnBet(u.id, tgId);

    res.json({ ok:true, placed: amt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// Состояние
app.get('/api/round', async (req, res) => {
  const initData = req.query?.initData || '';
  const v = verifyInitData(initData, process.env.BOT_TOKEN);
  let user = null;
  if (v.ok && v.uid) {
    pool.query('UPDATE users SET last_active_at=now() WHERE telegram_id=$1', [v.uid]).catch(()=>{});
    const ures = await pool.query('SELECT level, xp FROM users WHERE telegram_id=$1', [v.uid]);
    const u = ures.rows[0];
    if (u) {
      const lvl = Number(u.level);
      const xp = Number(u.xp);
      user = {
        level: lvl,
        xp,
        level_threshold: levelThreshold(lvl),
        level_progress: xp - xpSpentBeforeLevel(lvl),
      };
    }
  }
  res.json({
    price: state.price, startPrice: state.startPrice,
    phase: state.phase, secsLeft: state.secsLeft,
    roundLen: state.roundLen, betWindow: state.betWindow, pauseLen: state.pauseLen,
    bank: state.bankBuy + state.bankSell,
    bankBuy: state.bankBuy, bankSell: state.bankSell,
    betsBuy: state.betsBuy, betsSell: state.betsSell,
    lastSettlement: state.lastSettlement,
    asset: ASSET,
    user
  });
});
app.get('/api/history', (req, res) => res.json({ history: state.history }));

// Статистика пользователя: последние ставки и агрегаты
app.post('/api/stats', requireTgAuth, async (req, res) => {
  try {
    const tgId = req.tgUser.id;

    const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [tgId]);
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

    const wins = r.rows.filter(row => Number(row.payout) > 0).length;
    const losses = r.rows.filter(row => Number(row.payout) === 0).length;
    const list = r.rows.map(row => {
      const win = Number(row.payout) > 0;
      const amt = win ? Number(row.payout) : Number(row.bet_amount);
      const sign = win ? '+' : '-';
      return `${row.round_id}: ${row.side} ${sign}$${amt}`;
    });

    const onlineRes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE last_active_at > now() - interval '${ONLINE_WINDOW_SEC} seconds'`
    );
    const online_count = Number(onlineRes.rows[0]?.count || 0);

    res.json({ ok:true, wins, losses, list, online_count });
  } catch (e) {
    console.error('/api/stats', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

// GET /api/my/stats?uid=123
app.get('/api/my/stats', async (req, res) => {
  try {
    const uid = Number(req.query.uid);
    if (!uid) return res.json({ ok:false, error:'NO_UID' });

    const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
    if (u.rowCount === 0) return res.json({ ok:false, error:'NO_USER' });
    const userId = u.rows[0].id;

    // Победы = кол-во выплат > 0
    const wins = await pool.query(
      'SELECT COUNT(*)::int AS c FROM payouts WHERE user_id=$1 AND amount>0',
      [userId]
    );

    // Поражения = кол-во ставок без выплаты в том же раунде
    const losses = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM bets b
      WHERE b.user_id=$1
        AND NOT EXISTS (
          SELECT 1 FROM payouts p
          WHERE p.user_id=b.user_id AND p.round_id=b.round_id
        )
    `, [userId]);

    // Приглашений = рефералы, где он referrer_user_id
    const invites = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM referrals r
      WHERE r.referrer_user_id = $1
    `, [userId]);

    // Онлайн (за последние 60 сек)
    const online = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM users
      WHERE last_seen >= now() - interval '60 seconds'
    `);

    // Последние 10 исходов пользователя (+/-$)
    const recent = await pool.query(`
      WITH w AS (
        SELECT p.round_id, '+'||p.amount::text AS delta, r.winner_side AS side, r.id
        FROM payouts p
        JOIN rounds r ON r.id=p.round_id
        WHERE p.user_id=$1
      ),
      l AS (
        SELECT b.round_id, '-'||b.amount::text AS delta, r.winner_side AS side, r.id
        FROM bets b
        JOIN rounds r ON r.id=b.round_id
        WHERE b.user_id=$1
          AND NOT EXISTS (
            SELECT 1 FROM payouts p WHERE p.user_id=b.user_id AND p.round_id=b.round_id
          )
      )
      SELECT * FROM (
        SELECT round_id, side, delta, id FROM w
        UNION ALL
        SELECT round_id, side, delta, id FROM l
      ) t
      ORDER BY id DESC
      LIMIT 10
    `, [userId]);

    // последний победный раунд — для триггера салюта на фронте
    const lastWin = await pool.query(
      `SELECT MAX(round_id)::int AS last_win_round FROM payouts WHERE user_id=$1 AND amount>0`,
      [userId]
    );

    res.json({
      ok: true,
      stats: {
        wins: wins.rows[0].c,
        losses: losses.rows[0].c,
        invites: invites.rows[0].c,
        online: online.rows[0].c,
        recent: recent.rows,              // [{round_id, side, delta, id}]
        last_win_round: lastWin.rows[0].last_win_round || 0
      }
    });
  } catch (e) {
    console.error('/api/my/stats', e);
    res.json({ ok:false, error:'SERVER' });
  }
});

// -------- Shout auction endpoints --------
// ===== Shout auction endpoints =====
app.get('/api/shout', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shout_state WHERE id=1');
    const st = r.rows[0] || {};
    const nextPrice = Number(st.current_price || 0) + SHOUT_STEP;
    res.json({
      ok: true,
      state: {
        holder: st.holder_user_id ? { name: st.holder_name, telegram_id: Number(st.holder_tid), user_id: Number(st.holder_user_id) } : { name: '@anon', telegram_id: null, user_id: null },
        message: st.message || '',
        current_price: Number(st.current_price || 0),
        current_step: SHOUT_STEP,
        next_price: nextPrice
      }
    });
  } catch (e) {
    console.error('/api/shout', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.post('/api/shout/bid', requireTgAuth, async (req, res) => {
  const uid = req.tgUser.id;
  const rawMsg = String(req.body?.message || '').replace(/\n/g, ' ').trim();
  if (!rawMsg) return res.status(400).json({ ok:false, error:'BAD_REQUEST' });
  const text = rawMsg.slice(0,50);

  await ensureUser(uid, req.tgUser.username ? '@' + req.tgUser.username : null);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let sres = await client.query('SELECT * FROM shout_state WHERE id=1 FOR UPDATE');
    let st = sres.rows[0];
    const nextPrice = Number(st.current_price || 0) + SHOUT_STEP;

    const ures = await client.query('SELECT id, balance, username, last_chat_xp_at FROM users WHERE telegram_id=$1 FOR UPDATE', [uid]);
    const user = ures.rows[0];
    if (!user) throw new Error('NO_USER');
    if (Number(user.balance) < nextPrice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok:false, error:'INSUFFICIENT_BALANCE' });
    }

    await client.query('UPDATE users SET balance=balance-$1, banner_spent=banner_spent+$1 WHERE id=$2', [nextPrice, user.id]);

    const holderName = user.username ? '@' + String(user.username).replace(/^@+/, '') : '@anon';
    await client.query(
      'UPDATE shout_state SET holder_user_id=$1, holder_tid=$2, holder_name=$3, message=$4, current_price=$5, current_step=$6, last_change_at=now() WHERE id=1',
      [user.id, uid, holderName, text, nextPrice, SHOUT_STEP]
    );
    await client.query('INSERT INTO shout_bids(user_id, telegram_id, username, message, paid) VALUES ($1,$2,$3,$4,$5)', [user.id, uid, holderName, text, nextPrice]);
    const insMsg = await client.query('INSERT INTO shout_messages(user_id, username, text, price) VALUES ($1,$2,$3,$4) RETURNING id', [user.id, holderName, text, nextPrice]);

    await client.query('COMMIT');

    const now = Date.now();
    const last = user.last_chat_xp_at ? new Date(user.last_chat_xp_at).getTime() : 0;
    const cooldownOk = !last || now - last >= 10*60*1000;
    if (cooldownOk) {
      await grantXpOnce(pool, user.id, 'chat', insMsg.rows[0].id, XP.CHAT);
      await pool.query('UPDATE users SET last_chat_xp_at = now() WHERE id=$1', [user.id]);
    }
    await addQuestProgress(user.id, 'daily_chat_1', 1);

    res.json({ ok:true, paid: nextPrice });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('/api/shout/bid', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  } finally {
    client.release();
  }
});

app.get('/api/shout/history', async (req, res) => {
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
  try {
    const q = 'SELECT id, username, text, price, created_at FROM shout_messages ORDER BY created_at DESC LIMIT $1';
    const r = await pool.query(q, [limit]);
    res.json({ ok:true, items: r.rows });
  } catch (e) {
    console.error('/api/shout/history', e);
    res.status(500).json({ ok:false, items: [] });
  }
});

app.get('/api/quests', requireTgAuth, async (req, res) => {
  const scope = req.query.scope || 'day';
  try {
    const uid = req.tgUser.id;
    const u = await ensureUser(uid, req.tgUser.username ? '@' + req.tgUser.username : null);
    await ensureUserQuests(pool, u.id, Number(u.level || 0));

    const expiresAt =
      scope === 'day'    ? nextMidnightUTC() :
      scope === 'week'   ? nextWeekUTC()     :
      scope === 'season' ? nextMonthUTC()    : null;

    const tRes = await pool.query(
      `SELECT * FROM quest_templates WHERE scope=$1 AND min_level <= $2 ORDER BY id`,
      [scope, u.level]
    );

    const items = [];
    for (const t of tRes.rows){
      const uRes = await pool.query(
        `SELECT id,progress,is_claimed,expires_at
           FROM user_quests
          WHERE user_id=$1 AND template_id=$2
            AND (expires_at IS NOT DISTINCT FROM $3)
          LIMIT 1`,
        [u.id, t.id, expiresAt]
      );
      let uq = uRes.rows[0];
      if (!uq){
        const ins = await pool.query(
          `INSERT INTO user_quests(user_id,template_id,expires_at)
           VALUES ($1,$2,$3)
           RETURNING id,progress,is_claimed,expires_at`,
          [u.id, t.id, expiresAt]
        );
        uq = ins.rows[0];
      }
      items.push({
        id: uq.id, qkey: t.qkey, title: t.title, descr: t.descr,
        goal: Number(t.goal), progress: Number(uq.progress), is_claimed: uq.is_claimed,
        expires_at: uq.expires_at ? uq.expires_at.toISOString() : null,
        reward:{type:t.reward_type, value: Number(t.reward_value)},
        min_level: t.min_level
      });
    }

    if (!items.length){
      return res.json({ ok:true, items:[{ qkey:'stub', title:'Загляни позже', descr:'Скоро будут задания', goal:1, progress:0, is_claimed:false, reward:{type:'USD', value:0} }], claimable:0 });
    }

    const claimable = items.filter(i=>i.progress>=i.goal && !i.is_claimed).length;
    res.json({ ok:true, items, claimable });
  } catch (e) {
    console.error('/api/quests', e);
    res.status(500).json({ ok: false, items: [], claimable: 0 });
  }
});

app.post('/api/quests/claim', requireTgAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok:false, error:'NO_ID' });
  try {
    const uid = req.tgUser.id;
    const u = await ensureUser(uid, req.tgUser.username ? '@' + req.tgUser.username : null);
    const rl = questClaimRate.get(u.id) || { count:0, ts:0 };
    const now = Date.now();
    if (now - rl.ts > 1000) { rl.count = 0; rl.ts = now; }
    rl.count++;
    questClaimRate.set(u.id, rl);
    if (rl.count > 3) return res.status(429).json({ ok:false, error:'RATE_LIMIT' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(`
        SELECT uq.id, uq.user_id, uq.progress, uq.is_claimed, uq.expires_at,
               qt.id AS template_id, qt.reward_type, qt.reward_value, qt.goal
        FROM user_quests uq
        JOIN quest_templates qt ON qt.id=uq.template_id
        WHERE uq.id=$1 AND uq.user_id=$2 FOR UPDATE
      `, [id, u.id]);
      if (r.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok:false, error:'NOT_FOUND' }); }
      const q = r.rows[0];
      if (q.is_claimed) { await client.query('ROLLBACK'); return res.status(400).json({ ok:false, error:'ALREADY' }); }
      if (q.expires_at && new Date(q.expires_at) < new Date()) { await client.query('ROLLBACK'); return res.status(400).json({ ok:false, error:'EXPIRED' }); }
      if (q.progress < q.goal) { await client.query('ROLLBACK'); return res.status(400).json({ ok:false, error:'NOT_READY' }); }

      let newBalance;
      if (q.reward_type === 'USD') {
        const upd = await client.query('UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance', [q.reward_value, u.id]);
        newBalance = Number(upd.rows[0].balance);
      } else if (q.reward_type === 'XP') {
        await client.query('UPDATE users SET xp=xp+$1 WHERE id=$2', [q.reward_value, u.id]);
      } else if (q.reward_type === 'VOP') {
        await client.query('UPDATE users SET vop_balance=vop_balance+$1 WHERE id=$2', [q.reward_value, u.id]);
      }

      await client.query('UPDATE user_quests SET is_claimed=TRUE WHERE id=$1', [id]);
      await client.query('INSERT INTO quest_claims(user_id, template_id, reward_type, reward_value) VALUES($1,$2,$3,$4)', [u.id, q.template_id, q.reward_type, q.reward_value]);
      await client.query('COMMIT');
      res.json({ ok:true, reward:{ type:q.reward_type, value:Number(q.reward_value) }, newBalance });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('/api/quests/claim', e);
    res.status(500).json({ ok:false, error:'SERVER' });
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
        AND u.is_bot = FALSE
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

app.get('/api/leaderboard/xp', async (req, res) => {
  try {
    const q = `
      SELECT COALESCE(NULLIF(u.username,''), '@' || u.telegram_id::text) AS name,
             u.level, u.xp
      FROM users u
      ORDER BY u.level DESC, u.xp DESC
      LIMIT 50
    `;
    const r = await pool.query(q);
    res.json({ ok: true, top: r.rows });
  } catch (e) {
    console.error('/api/leaderboard/xp', e);
    res.json({ ok:false, error:'SERVER' });
  }
});

/* ========= Arena API ========= */
app.get('/api/arena/state', async (req, res) => {
  let userLimits = null;
  try {
    const uid = Number(req.query.uid);
    if (uid && arena.roundId) {
      const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
      const userId = u.rows[0]?.id;
      if (userId) {
        const r = await pool.query(
          'SELECT bets_used, refreshed FROM arena_user_round WHERE round_id=$1 AND user_id=$2',
          [arena.roundId, userId]
        );
        const used = r.rows[0]?.bets_used || 0;
        const refreshed = r.rows[0]?.refreshed || false;
        userLimits = {
          remainingBets: Math.max(0, ARENA_MAX_BETS_PER_ROUND - used),
          refreshed,
        };
      }
    }
  } catch (e) {
    console.error('/api/arena/state', e);
  }

  res.json({
    ok: true,
    phase: arena.phase,
    secsLeft: arena.secsLeft,
    bank: arena.bank,
    currentBid: arena.currentBid,
    nextBid: arena.nextBid,
    leader: arena.leaderName ? { name: arena.leaderName } : null,
    lastWinnerTid: arena.phase === 'pause' ? arena.leaderTid : null,
    userLimits,
  });
});

app.post('/api/arena/bid', requireTgAuth, async (req, res) => {
  try {
    const uid = req.tgUser.id;

    if (arena.phase === 'idle') {
      const r = await pool.query(
        'INSERT INTO arena_rounds(bank) VALUES($1) RETURNING id',
        [arena.bank]
      );
      arena.roundId = r.rows[0].id;
      arena.phase = 'betting';
      arena.secsLeft = ARENA_TIMER.FIRST_BID_START;
    }

    await pool.query('BEGIN');
    const u = await pool.query(
      'SELECT id, balance, username, is_bot FROM users WHERE telegram_id=$1 FOR UPDATE',
      [uid]
    );
    const userId = u.rows[0]?.id;
    if (u.rows[0]?.is_bot) {
      await pool.query('ROLLBACK');
      return res.status(403).json({ ok:false, error:'bots_forbidden_on_arena' });
    }
    if (!userId || u.rows[0].balance < arena.nextBid) {
      await pool.query('ROLLBACK');
      return res.json({ ok:false, error:'INSUFFICIENT' });
    }
    await pool.query(
      'INSERT INTO arena_user_round(round_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [arena.roundId, userId]
    );
    const lim = await pool.query(
      'SELECT bets_used FROM arena_user_round WHERE round_id=$1 AND user_id=$2 FOR UPDATE',
      [arena.roundId, userId]
    );
    const used = lim.rows[0]?.bets_used || 0;
    if (used >= ARENA_MAX_BETS_PER_ROUND) {
      await pool.query('ROLLBACK');
      return res.json({ ok:false, error:'ARENA_BETS_LIMIT' });
    }
    await pool.query('UPDATE users SET balance=balance-$1, xp=xp+50 WHERE id=$2',
                     [arena.nextBid, userId]);
    await pool.query('INSERT INTO arena_bids(round_id,user_id,amount) VALUES($1,$2,$3)',
                     [arena.roundId, userId, arena.nextBid]);
    await pool.query('UPDATE arena_user_round SET bets_used=bets_used+1 WHERE round_id=$1 AND user_id=$2',
                     [arena.roundId, userId]);
    await pool.query('COMMIT');

    arena.bank += arena.nextBid;
    arena.currentBid = arena.nextBid;
    arena.nextBid += ARENA.step;
    arena.leaderUserId = userId;
    arena.leaderTid = uid;
    arena.leaderName = u.rows[0].username || ('id' + userId);

    if (arena.secsLeft > ARENA_TIMER.THRESHOLD_LONG) {
      arena.secsLeft += ARENA_TIMER.EXTENSION_LONG;
    } else if (arena.secsLeft >= ARENA_TIMER.THRESHOLD_SHORT) {
      arena.secsLeft += ARENA_TIMER.EXTENSION_MEDIUM;
    } else {
      if (arena.secsLeft < ARENA_TIMER.OVERTIME_FLOOR) {
        arena.secsLeft = ARENA_TIMER.OVERTIME_FLOOR;
      }
    }

    // enforce maximum timer duration
    arena.secsLeft = Math.min(arena.secsLeft, ARENA_TIMER.MAX_CAP || Infinity);
    await markFriendActivityOnBet(userId, uid);

    return res.json({ ok:true, bank:arena.bank, nextBid:arena.nextBid, secsLeft:arena.secsLeft });
  } catch (e) {
    await pool.query('ROLLBACK').catch(()=>{});
    console.error('/api/arena/bid', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.post('/api/arena/refresh-check', async (req, res) => {
  try {
    const uid = Number(req.body?.uid);
    if (!uid || !arena.roundId) {
      return res.json({ ok:true, eligible:false, reason:'NO_REFERRAL', remaining:ARENA_MAX_BETS_PER_ROUND });
    }
    const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
    const userId = u.rows[0]?.id;
    if (!userId) return res.json({ ok:true, eligible:false, reason:'NO_REFERRAL', remaining:ARENA_MAX_BETS_PER_ROUND });

    await pool.query('INSERT INTO arena_user_round(round_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [arena.roundId, userId]);
    const aur = await pool.query('SELECT bets_used, refreshed FROM arena_user_round WHERE round_id=$1 AND user_id=$2', [arena.roundId, userId]);
    const used = aur.rows[0]?.bets_used || 0;
    const refreshed = aur.rows[0]?.refreshed || false;
    const remaining = Math.max(0, ARENA_MAX_BETS_PER_ROUND - used);
    if (refreshed) {
      return res.json({ ok:true, eligible:false, reason:'ALREADY_USED', remaining });
    }
    const ref = await pool.query(
      `SELECT 1 FROM referrals WHERE referrer_user_id=$1 AND created_at >= (SELECT started_at FROM arena_rounds WHERE id=$2) LIMIT 1`,
      [userId, arena.roundId]
    );
    if (ref.rowCount > 0) {
      return res.json({ ok:true, eligible:true, remaining });
    }
    return res.json({ ok:true, eligible:false, reason:'NO_REFERRAL', remaining });
  } catch (e) {
    console.error('/api/arena/refresh-check', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.post('/api/arena/refresh-apply', async (req, res) => {
  try {
    const uid = Number(req.body?.uid);
    if (!uid || !arena.roundId) return res.json({ ok:false, error:'NOT_ELIGIBLE' });
    await pool.query('BEGIN');
    const u = await pool.query('SELECT id FROM users WHERE telegram_id=$1 FOR UPDATE', [uid]);
    const userId = u.rows[0]?.id;
    if (!userId) { await pool.query('ROLLBACK'); return res.json({ ok:false, error:'NOT_ELIGIBLE' }); }
    await pool.query('INSERT INTO arena_user_round(round_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [arena.roundId, userId]);
    const aur = await pool.query('SELECT bets_used, refreshed FROM arena_user_round WHERE round_id=$1 AND user_id=$2 FOR UPDATE', [arena.roundId, userId]);
    const refreshed = aur.rows[0]?.refreshed || false;
    if (refreshed) { await pool.query('ROLLBACK'); return res.json({ ok:false, error:'NOT_ELIGIBLE' }); }
    const ref = await pool.query(
      `SELECT 1 FROM referrals WHERE referrer_user_id=$1 AND created_at >= (SELECT started_at FROM arena_rounds WHERE id=$2) LIMIT 1`,
      [userId, arena.roundId]
    );
    if (ref.rowCount === 0) { await pool.query('ROLLBACK'); return res.json({ ok:false, error:'NOT_ELIGIBLE' }); }
    await pool.query('UPDATE arena_user_round SET bets_used=0, refreshed=TRUE WHERE round_id=$1 AND user_id=$2', [arena.roundId, userId]);
    await pool.query('COMMIT');
    return res.json({ ok:true, remaining: ARENA_MAX_BETS_PER_ROUND });
  } catch (e) {
    await pool.query('ROLLBACK').catch(()=>{});
    console.error('/api/arena/refresh-apply', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.get('/api/arena/leaderboard', async (req, res) => {
  const window = req.query.window || '24h';
  try {
    const r = await pool.query(`
      SELECT u.username,
             ar.winner_tid AS tid,
             COUNT(*) AS wins_count,
             COALESCE(SUM(ar.won_amount),0) AS wins_sum,
             MAX(ar.settled_at) AS last_win_ts
      FROM arena_rounds ar
      JOIN users u ON u.id = ar.winner_user_id
      WHERE u.is_bot = FALSE
        AND ar.settled_at >= now() - $1::interval
      GROUP BY ar.winner_tid, u.username
      ORDER BY wins_count DESC, wins_sum DESC, last_win_ts DESC
      LIMIT 24
    `, [window]);
    res.json({ ok:true, items: r.rows.map(row => ({
      tid: row.tid ? Number(row.tid) : null,
      username: row.username ? '@'+row.username : null,
      wins_count: Number(row.wins_count || 0),
      wins_sum: Number(row.wins_sum || 0),
      last_win_ts: row.last_win_ts ? new Date(row.last_win_ts).getTime() : null
    })) });
  } catch (e) {
    res.json({ ok:false, error:'SERVER' });
  }
});


/* ========= Проверка бонусов (подписка + ежедневка) ========= */
// Вызывается фронтом из шита «Пополнение» — без редиректа в бота
app.post('/api/bonus/check', requireTgAuth, async (req, res) => {
  try {
    const uid = req.tgUser.id;

    // убедимся, что пользователь есть
    await ensureUser(uid, req.tgUser.username ? '@' + req.tgUser.username : null);

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
          [SUBSCRIBE_BONUS_USD, uid]
        );
        added += SUBSCRIBE_BONUS_USD;
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

/* ========= FARMING API ========= */
async function farmUsdHandler(req, res) {
  try {
    const uid = Number(req.query.uid);
    if (!uid) return res.json({ ok:false, error:'NO_UID' });
    const state = await getFarmUsdState(uid);
    if (state?.limitToday) {
      console.log('/api/farm/usd/state', {
        user_id: uid,
        friends: state.limitToday.friends,
        base: state.limitToday.base,
        max: state.limitToday.max,
        used: state.limitToday.used,
      });
    }
    res.json(state);
  } catch (e) {
    console.error('/api/farm/usd', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
}

app.get('/api/farm/usd', farmUsdHandler);
app.get('/api/farm/usd/state', farmUsdHandler);

app.post('/api/farm/usd/claim', async (req, res) => {
  const uid = Number(req.body.uid);
  if (!uid) return res.json({ ok:false, error:'NO_UID' });
  await ensureUser(uid, null);
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];
  const now = new Date();
  const today = todayUTC();
  if (ensureDayBuckets('usd', u, today)) {
    await pool.query('UPDATE users SET claimed_usd_today=0, claimed_usd_date=$2 WHERE id=$1', [u.id, today.toISOString().slice(0,10)]);
  }
  const active = await checkUsdActive(u.id);
  if (!active) return res.json({ ok:false, error:'INACTIVE' });
  if (!u.last_claim_usd) {
    await pool.query('UPDATE users SET last_claim_usd=now() WHERE id=$1', [u.id]);
    u.last_claim_usd = new Date();
  }
  if (ensureFriendBonus(u, today)) {
    await pool.query('UPDATE users SET friend_bonus_usd_today=0, friend_bonus_date=$2 WHERE id=$1', [u.id, today.toISOString().slice(0,10)]);
  }
  const activeFriends = await getActiveFriendsToday(u.id);
  const baseCap = u.base_daily_cap_usd ?? BASE_USD_LIMIT;
  const limitTodayTotal = baseCap + (u.friend_bonus_usd_today || 0);
  const accr = computeAccrual('usd', u, now, limitTodayTotal);
  const amt = accr.claimable;
  if (amt <= 0) return res.json({ ok:true, claimed:0, newBalance:Number(u.balance) });
  const day = today.toISOString().slice(0,10);
  await pool.query('UPDATE users SET balance=balance+$1, last_claim_usd=now(), claimed_usd_today=claimed_usd_today+$1, claimed_usd_date=$3 WHERE id=$2', [amt, u.id, day]);
  await pool.query('INSERT INTO farm_history(user_id,type,amount) VALUES($1,$2,$3)', [u.id, 'claim_usd', amt]);
  await upsertDailyCap(u.id, today, baseCap, u.friend_bonus_usd_today || 0, u.claimed_usd_today + amt);
  res.json({ ok:true, claimed:amt, newBalance: Number(u.balance)+amt });
});

app.post('/api/farm/usd/upgrade', async (req, res) => {
  const uid = Number(req.body.uid);
  const upgradeId = req.body.upgradeId;
  if (!uid || !upgradeId) return res.json({ ok:false, error:'BAD_REQ' });
  await ensureUser(uid, null);
  const up = BOOSTERS_USD.find(u=>u.id===upgradeId);
  if (!up) return res.json({ ok:false, error:'NO_UPGRADE' });
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];
  const purchases = Number(u[`boost_t${up.tier}`] || 0);
  const price = calcPrice(up.base, purchases);
  if (u.level < up.level) return res.json({ ok:false, error:'LEVEL' });
  if (u.balance < price) return res.json({ ok:false, error:'BALANCE' });
  await pool.query(`UPDATE users SET balance=balance-$1, fp_usd=fp_usd+$2, boost_t${up.tier}=boost_t${up.tier}+1 WHERE id=$3`, [price, up.fp, u.id]);
  await pool.query('INSERT INTO farm_history(user_id,type,amount,meta) VALUES($1,$2,$3,$4)', [u.id,'upgrade_usd',-price,{fpDelta:up.fp,title:up.title}]);
  res.json({ ok:true, fp: u.fp_usd + up.fp, newBalance: Number(u.balance) - price });
});

app.get('/api/farm/vop/state', async (req, res) => {
  const uid = Number(req.query.uid);
  if (!uid) return res.json({ ok:false, error:'NO_UID' });
  await ensureUser(uid, null);
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];

  const now = new Date();
  const today = todayUTC();

  // referrals count
  const { rows:[ref] } = await pool.query(
    'SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_user_id=$1',
    [u.id]
  );
  const referrals = ref?.c ?? 0;

  const isUnlocked = u.level >= VOP_MIN_LEVEL;
  let accr = { claimable:0, ratePerHour:0 };
  if (isUnlocked) {
    if (ensureDayBuckets('vop', u, today)) {
      await pool.query('UPDATE users SET claimed_vop_today=0, claimed_vop_date=$2 WHERE id=$1', [u.id, today.toISOString().slice(0,10)]);
    }
    if (!u.last_claim_vop) {
      await pool.query('UPDATE users SET last_claim_vop=now() WHERE id=$1', [u.id]);
      u.last_claim_vop = new Date();
    }
    accr = computeAccrual('vop', u, now);
  }

  const claimEligible = referrals >= 30;

  const upgrades = EXTRACTORS_VOP.map(up=>{
    const purchases = Number(u[`extract_t${up.tier}`] || 0);
    const price = calcPrice(up.base, purchases);
    const pricePerFp = Math.round(price / up.fp);
    const mod = purchases % PRICE_BUMP_STEP;
    const next = mod === 0 && purchases > 0 ? 0 : PRICE_BUMP_STEP - mod;
    let canBuy=true, reason=null;
    if (u.level < up.level) { canBuy=false; reason='LEVEL'; }
    else if (u.balance < price) { canBuy=false; reason='BALANCE'; }
    return {
      id: up.id,
      title: up.title,
      fp: up.fp,
      reqLevel: up.level,
      price,
      pricePerFp,
      purchases_mod: mod,
      next_bump_in: next,
      canBuy,
      reason
    };
  });
  const hist = await pool.query("SELECT type, amount, meta, created_at FROM farm_history WHERE user_id=$1 AND type LIKE '%vop' ORDER BY id DESC LIMIT 10", [u.id]);

  res.json({
    ok: true,
    level: u.level,
    isUnlocked,
    referrals,
    claimEligible,
    available: isUnlocked ? accr.claimable : 0,
    speedPerHour: isUnlocked ? accr.ratePerHour : 0,
    fp: isUnlocked ? u.fp_vop : 0,
    limitToday: {
      used: isUnlocked ? u.claimed_vop_today : 0,
      max: isUnlocked ? VOP_DAILY_CAP : 0
    },
    offlineLimit: VOP_OFFLINE_CAP_HOURS,
    vop_balance: u.vop_balance,
    upgrades,
    history: hist.rows.map(r=>({ type:r.type, amount:Number(r.amount), ts:r.created_at, meta:r.meta }))
  });
});

app.post('/api/farm/claim_vop', async (req, res) => {
  const uid = Number(req.body.uid);
  if (!uid) return res.json({ ok:false, error:'NO_UID' });
  await ensureUser(uid, null);
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];
  if (u.level < VOP_MIN_LEVEL) return res.json({ ok:false, error:'LOCKED' });
  const { rows:[ref] } = await pool.query(
    'SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_user_id=$1',
    [u.id]
  );
  const referrals = ref?.c ?? 0;
  if (referrals < 30) {
    return res.status(403).json({ code:'NOT_ENOUGH_REFERRALS', need:30, have:referrals });
  }
  const now = new Date();
  const today = todayUTC();
  if (ensureDayBuckets('vop', u, today)) {
    await pool.query('UPDATE users SET claimed_vop_today=0, claimed_vop_date=$2 WHERE id=$1', [u.id, today.toISOString().slice(0,10)]);
  }
  if (!u.last_claim_vop) {
    await pool.query('UPDATE users SET last_claim_vop=now() WHERE id=$1', [u.id]);
    u.last_claim_vop = new Date();
  }
  const accr = computeAccrual('vop', u, now);
  const amt = accr.claimable;
  if (amt <= 0) {
    return res.status(400).json({ code:'NOTHING_TO_CLAIM' });
  }
  const day = today.toISOString().slice(0,10);
  try {
    await pool.query('BEGIN');
    await pool.query('UPDATE users SET vop_balance=vop_balance+$1, last_claim_vop=now(), claimed_vop_today=claimed_vop_today+$1, claimed_vop_date=$3 WHERE id=$2', [amt, u.id, day]);
    await pool.query('INSERT INTO farm_history(user_id,type,amount) VALUES($1,$2,$3)', [u.id,'claim_vop',amt]);
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('/api/farm/claim_vop', e);
    return res.status(500).json({ ok:false, error:'SERVER' });
  }
  console.log('claim_vop', { user_id:u.id, amount:amt, referrals_count:referrals, ts: new Date().toISOString() });
  res.json({
    ok:true,
    claimed: amt,
    vop_balance: Number(u.vop_balance) + amt,
    vop_rate_per_hour: accr.ratePerHour,
    vop_available: 0,
    vop_today: Number(u.claimed_vop_today || 0) + amt,
    xp: Number(u.xp || 0),
    usd_balance: Number(u.balance || 0)
  });
});

app.post('/api/farm/vop/upgrade', async (req, res) => {
  const uid = Number(req.body.uid);
  const upgradeId = req.body.upgradeId;
  if (!uid || !upgradeId) return res.json({ ok:false, error:'BAD_REQ' });
  await ensureUser(uid, null);
  const up = EXTRACTORS_VOP.find(u=>u.id===upgradeId);
  if (!up) return res.json({ ok:false, error:'NO_UPGRADE' });
  const { rows } = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [uid]);
  const u = rows[0];
  const purchases = Number(u[`extract_t${up.tier}`] || 0);
  const price = calcPrice(up.base, purchases);
  if (u.level < up.level) return res.json({ ok:false, error:'LEVEL' });
  if (u.balance < price) return res.json({ ok:false, error:'BALANCE' });
  await pool.query(`UPDATE users SET balance=balance-$1, fp_vop=fp_vop+$2, extract_t${up.tier}=extract_t${up.tier}+1 WHERE id=$3`, [price, up.fp, u.id]);
  await pool.query('INSERT INTO farm_history(user_id,type,amount,meta) VALUES($1,$2,$3,$4)', [u.id,'upgrade_vop',-price,{fpDelta:up.fp,title:up.title}]);
  res.json({ ok:true, fp: u.fp_vop + up.fp, newBalance: Number(u.balance) - price });
});

app.get('/api/referral/share-info', async (req, res) => {
  try {
    const uid = Number(req.query.uid);
    if (!uid) return res.status(400).json({ ok:false, error:'NO_UID' });
    await ensureUser(uid, null);
    const text = 'Помоги мне на арене, хочу забрать банк!';
    const url = `https://t.me/${BOT_USERNAME}?start=${uid}`;
    res.json({ text, url });
  } catch (e) {
    console.error('/api/referral/share-info', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.post('/api/referral/check-new-active-friends', async (req, res) => {
  try {
    const uid = Number(req.body.uid);
    if (!uid) return res.json({ newActiveCount:0, addedUsd:0 });
    await ensureUser(uid, null);
    const { rows } = await pool.query(
      'SELECT id, friend_bonus_usd_today, friend_bonus_date FROM users WHERE telegram_id=$1',
      [uid]
    );
    const u = rows[0];
    const today = todayUTC();
    const dayStr = today.toISOString().slice(0,10);
    if (ensureFriendBonus(u, today)) {
      await pool.query('UPDATE users SET friend_bonus_usd_today=0, friend_bonus_date=$2 WHERE id=$1', [u.id, dayStr]);
    }
    const activeFriends = await getActiveFriendsToday(u.id);
    const already = Math.floor((u.friend_bonus_usd_today || 0) / BONUS_PER_ACTIVE_FRIEND_USD);
    const newActiveCount = Math.max(0, activeFriends - already);
    const addedUsd = newActiveCount * BONUS_PER_ACTIVE_FRIEND_USD;
    if (addedUsd > 0) {
      await pool.query('UPDATE users SET friend_bonus_usd_today=friend_bonus_usd_today+$1 WHERE id=$2', [addedUsd, u.id]);
      console.log('friend_cap_bonus_applied', { user_id: u.id, count: newActiveCount, addedUsd });
    }
    const state = await getFarmUsdState(uid);
    res.json({ newActiveCount, addedUsd, ...state });
  } catch (e) {
    console.error('/api/referral/check-new-active-friends', e);
    res.status(500).json({ newActiveCount:0, addedUsd:0, error:'SERVER' });
  }
});

app.get('/api/referrals/stats/today', async (req, res) => {
  try {
    const uid = Number(req.query.uid);
    if (!uid) return res.json({ ok:false, error:'NO_UID' });
    await ensureUser(uid, null);
    const { rows } = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
    const userId = rows[0]?.id;
    if (!userId) return res.json({ ok:false, error:'NO_USER' });
    const total = await pool.query('SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_user_id=$1', [userId]);
    let activeCount = 0;
    try {
      const active = await pool.query(
        `SELECT COUNT(*)::int AS c FROM referral_activity
         WHERE referrer_id=$1 AND last_active_at >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
        [userId]
      );
      activeCount = active.rows[0]?.c || 0;
    } catch (e) {
      if (e.message?.includes('relation') && e.message.includes('referral_activity')) {
        console.warn('/api/referrals/stats/today: referral_activity missing');
      } else {
        throw e;
      }
    }
    res.json({ ok:true, total_friends: total.rows[0].c, active_friends_today: activeCount });
  } catch (e) {
    console.error('/api/referrals/stats/today', e);
    res.status(500).json({ ok:false, error:'SERVER' });
  }
});

app.listen(PORT, () => console.log('Server listening on', PORT));
