// bot/bot.js — финал
// Регистрация: $1000, Реферал: +$500, Подписка: +$5000 (разово), Ежедневный вход: +$1000/день

import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import pg from 'pg';
import { grantXP } from '../xp.mjs';

const { BOT_TOKEN, WEBAPP_URL, DATABASE_URL, PORT = 8081 } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL missing');
if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

// Боту нужен доступ к участникам канала (лучше — админ)
const CHANNEL = '@erc20coin';

// суммы (единая точка настройки)
const AMOUNTS = {
  REGISTER: 1000,
  REFERRAL: 500,    // рефереру
  SUBSCRIBE: 5000,  // разовый бонус за подписку
  DAILY: 1000,      // ежедневный вход
};

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Пакеты Stars (мэппинг «звёздный пакет → долларовый кредит»)
const STARS_PACKS = {
  '100':   { credit: 3_000 },
  '500':   { credit: 16_000 },
  '1000':  { credit: 35_000 },
  '10000': { credit: 400_000 },
  '30000': { credit: 1_500_000 },
};

await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    balance BIGINT NOT NULL DEFAULT ${AMOUNTS.REGISTER},
    insurance_count BIGINT NOT NULL DEFAULT 0,
    channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    last_daily_bonus DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    level INT NOT NULL DEFAULT 1,
    xp BIGINT NOT NULL DEFAULT 0,
    next_xp BIGINT NOT NULL DEFAULT 5000,
    last_chat_xp_at TIMESTAMPTZ,
    streak_wins INT NOT NULL DEFAULT 0,
    last_result_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS referrals(
    id SERIAL PRIMARY KEY,
    referrer_user_id INT REFERENCES users(id),
    referred_telegram_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS xp_events(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    source TEXT NOT NULL,
    amount BIGINT NOT NULL,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_bonus DATE;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_count BIGINT NOT NULL DEFAULT 0;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp BIGINT NOT NULL DEFAULT 0;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS next_xp BIGINT NOT NULL DEFAULT 5000;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_xp_at TIMESTAMPTZ;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_wins INT NOT NULL DEFAULT 0;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_result_at TIMESTAMPTZ;`);

const bot = new Telegraf(BOT_TOKEN);

// получим username бота для реф-ссылок
let BOT_USERNAME = 'realpricebtc_bot';
try { BOT_USERNAME = (await bot.telegram.getMe()).username; } catch { /* no-op */ }

// ===== Утилиты
async function ensureUser(telegramId, username) {
  await pool.query(
    `INSERT INTO users(telegram_id, username, balance)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO NOTHING`,
    [telegramId, username || null, AMOUNTS.REGISTER]
  );
  if (username) {
    await pool.query(
      `UPDATE users SET username=$2
       WHERE telegram_id=$1 AND (username IS NULL OR username='')`,
      [telegramId, username]
    );
  }
  const r = await pool.query(
    'SELECT id, balance, username, channel_bonus_claimed, last_daily_bonus FROM users WHERE telegram_id=$1',
    [telegramId]
  );
  return r.rows[0];
}

async function grantReferral(referrerTgId, referredTgId) {
  if (String(referrerTgId) === String(referredTgId)) return;

  // найдём/создадим реферера
  let refUserId;
  const r1 = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [referrerTgId]);
  if (r1.rowCount === 0) {
    const ins = await pool.query(
      'INSERT INTO users(telegram_id, balance) VALUES($1, $2) RETURNING id',
      [referrerTgId, AMOUNTS.REGISTER]
    );
    refUserId = ins.rows[0].id;
  } else {
    refUserId = r1.rows[0].id;
  }

  // зачесть приглашение только один раз на приглашённого
  const exists = await pool.query('SELECT 1 FROM referrals WHERE referred_telegram_id=$1', [referredTgId]);
  if (exists.rowCount === 0) {
    await pool.query(
      'INSERT INTO referrals(referrer_user_id, referred_telegram_id) VALUES($1,$2)',
      [refUserId, referredTgId]
    );
    await pool.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [AMOUNTS.REFERRAL, refUserId]);
    try {
      await bot.telegram.sendMessage(
        referrerTgId,
        `🎉 По твоей ссылке присоединился друг! Начислено +$${AMOUNTS.REFERRAL}.`
      );
    } catch {}
  }
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
      [AMOUNTS.DAILY, today.toISOString().slice(0, 10), telegramId]
    );
    return true;
  }
  return false;
}

async function checkAndGrantChannelBonus(ctx) {
  const uid = ctx.from.id;
  const uname = ctx.from.username ? '@' + ctx.from.username : null;
  const user = await ensureUser(uid, uname);

  // проверка подписки
  let isMember = false;
  try {
    const m = await ctx.telegram.getChatMember(CHANNEL, uid);
    isMember = m && m.status && m.status !== 'left';
  } catch (err) {
    console.error('getChatMember error:', err.description || err.message);
    await ctx.reply('Не удалось проверить подписку. Дай боту право видеть участников канала и попробуй ещё раз.');
    return;
  }

  if (!isMember) {
    await ctx.reply(`Сначала подпишись на ${CHANNEL}, затем вернись и нажми «Проверить».`);
    return;
  }

  // разовый бонус за канал
  if (!user.channel_bonus_claimed) {
    await pool.query(
      'UPDATE users SET balance=balance+$1, channel_bonus_claimed=TRUE WHERE telegram_id=$2',
      [AMOUNTS.SUBSCRIBE, uid]
    );
    await ctx.reply(`✅ Подписка подтверждена! Бонус $${AMOUNTS.SUBSCRIBE} начислён.`);
  } else {
    await ctx.reply('Бонус за подписку уже начислялся ранее ✅');
  }

  // ежедневный бонус (чтобы «Проверить» обновляла всё сразу)
  const dailyGiven = await grantDailyIfNeeded(uid);
  if (dailyGiven) await ctx.reply(`🎁 Ежедневный бонус +$${AMOUNTS.DAILY} начислён.`);

  // баланс
  const r2 = await pool.query('SELECT balance FROM users WHERE telegram_id=$1', [uid]);
  const bal = r2.rows[0]?.balance ?? 0;
  await ctx.reply(`Твой баланс: $${Number(bal).toLocaleString()}`);
}

function mainMenu(urlWithUid) {
  return Markup.keyboard([
    [Markup.button.webApp('Открыть BTC Game', urlWithUid)],
    [{ text: 'Рефералы' }, { text: 'Проверить' }],
  ]).resize();
}

// ===== /start (поддерживает: /start <refId>, /start check)
bot.start(async (ctx) => {
  const uid = ctx.from.id;
  const uname = ctx.from.username ? '@' + ctx.from.username : null;
  await ensureUser(uid, uname);

  const payload = ctx.startPayload; // '123456', 'check', ...
  if (payload && /^\d+$/.test(payload)) {
    await grantReferral(payload, uid);
  } else if (payload && payload === 'check') {
    await checkAndGrantChannelBonus(ctx);
    return;
  }

  // ежедневный бонус при входе
  const dailyGiven = await grantDailyIfNeeded(uid);

  const url = WEBAPP_URL + `?uid=${uid}`;
  await ctx.reply(
    `Добро пожаловать! Тебе начислено $${AMOUNTS.REGISTER} на старт.\n` +
      (dailyGiven ? `Ежедневный бонус +$${AMOUNTS.DAILY} уже начислён сегодня.\n` : '') +
      `За подписку на канал ${CHANNEL} — +$${AMOUNTS.SUBSCRIBE} (разово).\n` +
      `За каждого друга — +$${AMOUNTS.REFERRAL}.`,
    { ...mainMenu(url) }
  );
});

// ===== /check и /bonus — одинаково: подписка + ежедневный
bot.command(['check', 'bonus'], async (ctx) => {
  await checkAndGrantChannelBonus(ctx);
});

// ===== Кнопки меню
bot.hears('Рефералы', async (ctx) => {
  const uid = ctx.from.id;
  const link = `https://t.me/${BOT_USERNAME}?start=${uid}`;
  await ctx.reply(
    `👥 Приглашай друзей по ссылке:\n${link}\n\nЗа каждого друга — +$${AMOUNTS.REFERRAL} после его первого входа.`
  );
});

bot.hears('Проверить', async (ctx) => {
  await checkAndGrantChannelBonus(ctx);
});

// ===== мини-HTTP (если бот как Web Service)
const app = express();
app.get('/', (_, res) => res.send('BTC Game Bot is running'));
app.listen(PORT, () => console.log('Bot HTTP on', PORT));

// Обязателен для Telegram платежей
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

// ===== Успешная оплата Stars -> зачисляем внутр. валюту
bot.on('message', async (ctx) => {
  const sp = ctx.message?.successful_payment;
  if (!sp) return;

  try {
    const payload = sp.invoice_payload || '';
    const [uidStr, token] = payload.split(':');
    const uid = Number(uidStr);

    if (token?.startsWith('pack_')) {
      const pack = token.replace('pack_', '');
      if (uid && STARS_PACKS[pack]) {
        const credit = STARS_PACKS[pack].credit;
        await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credit, uid]);
        const { rows:[u] } = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
        if (u) await grantXP(pool, u.id, 1000, 'STARS', { stars: sp.total_amount });
        await ctx.reply(`💫 Платёж принят: пакет ${pack}⭐ → +$${credit.toLocaleString()} на баланс.`);
        return;
      }
    } else if (token?.startsWith('ins_')) {
      const cnt = Number(token.replace('ins_', '')) || 0;
      if (uid && cnt > 0) {
        await pool.query('UPDATE users SET insurance_count = insurance_count + $1 WHERE telegram_id=$2', [cnt, uid]);
        const { rows:[u] } = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [uid]);
        if (u) await grantXP(pool, u.id, 1000, 'INSURANCE', { pack: cnt });
        await ctx.reply(`🛡️ Страховки зачислены: +${cnt}.`);
        return;
      }
    }

    // Фоллбек: total_amount в XTR = точное число звёзд
    const stars = Number(sp.total_amount) || 0;     // НИКАКОГО /1000!
    const creditPerStar = 30;                       // линейная оценка (подстраховка)
    const credited = Math.round(stars * creditPerStar);

    await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credited, ctx.from.id]);
    const { rows:[u] } = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [ctx.from.id]);
    if (u) await grantXP(pool, u.id, 1000, 'STARS', { stars });
    await ctx.reply(`💫 Платёж принят: ${stars}⭐ → +$${credited.toLocaleString()}`);
  } catch (e) {
    console.error('successful_payment handler:', e);
  }
});

bot.launch().then(() => console.log('Bot started ✅'));
