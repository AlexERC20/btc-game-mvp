// bot/bot.js
import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import pg from 'pg';

const { BOT_TOKEN, WEBAPP_URL, DATABASE_URL, PORT = 8081 } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL missing');
if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

const CHANNEL = '@erc20coin';

const AMOUNTS = {
  REGISTER: 1000,
  REFERRAL: 500,
  SUBSCRIBE: 5000,
  DAILY: 1000,
};

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Внутриигровой кредит за баланс-пакеты
const STARS_PACKS_BALANCE = {
  '100':   { credit: 3_000 },
  '500':   { credit: 16_000 },
  '1000':  { credit: 35_000 },
  '10000': { credit: 400_000 },
  '30000': { credit: 1_500_000 },
};

// Страховки: 100 шт за 1000⭐
const STARS_PACKS_INS = {
  '100': { ins: 100 },
};

// миграции
await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    balance BIGINT NOT NULL DEFAULT ${AMOUNTS.REGISTER},
    insurance_count BIGINT NOT NULL DEFAULT 0,
    channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    last_daily_bonus DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS referrals(
    id SERIAL PRIMARY KEY,
    referrer_user_id INT REFERENCES users(id),
    referred_telegram_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_bonus DATE;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`);
await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_count BIGINT NOT NULL DEFAULT 0;`);

const bot = new Telegraf(BOT_TOKEN);

let BOT_USERNAME = 'realpricebtc_bot';
try { BOT_USERNAME = (await bot.telegram.getMe()).username; } catch {}

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

  if (!user.channel_bonus_claimed) {
    await pool.query(
      'UPDATE users SET balance=balance+$1, channel_bonus_claimed=TRUE WHERE telegram_id=$2',
      [AMOUNTS.SUBSCRIBE, uid]
    );
    await ctx.reply(`✅ Подписка подтверждена! Бонус $${AMOUNTS.SUBSCRIBE} начислён.`);
  } else {
    await ctx.reply('Бонус за подписку уже начислялся ранее ✅');
  }

  const dailyGiven = await grantDailyIfNeeded(uid);
  if (dailyGiven) await ctx.reply(`🎁 Ежедневный бонус +$${AMOUNTS.DAILY} начислён.`);

  const r2 = await pool.query('SELECT balance, insurance_count FROM users WHERE telegram_id=$1', [uid]);
  const bal = r2.rows[0]?.balance ?? 0;
  const ins = r2.rows[0]?.insurance_count ?? 0;
  await ctx.reply(`Твой баланс: $${Number(bal).toLocaleString()}\nСтраховки: ${ins}`);
}

function mainMenu(urlWithUid) {
  return Markup.keyboard([
    [Markup.button.webApp('Открыть BTC Game', urlWithUid)],
    [{ text: 'Рефералы' }, { text: 'Проверить' }],
  ]).resize();
}

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

bot.command(['check', 'bonus'], async (ctx) => {
  await checkAndGrantChannelBonus(ctx);
});

bot.hears('Рефералы', async (ctx) => {
  const uid = ctx.from.id;
  const link = `https://t.me/${BOT_USERNAME}?start=${uid}`;
  await ctx.reply(
    `👥 Приглашай друзей по ссылке:\n${link}\n\nЗа каждого друга — +$${AMOUNTS.REFERRAL} после его первого входа.`
  );
});

// мини-HTTP (если бот как Web Service)
const app = express();
app.get('/', (_, res) => res.send('BTC Game Bot is running'));
app.listen(PORT, () => console.log('Bot HTTP on', PORT));

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

// Успешная оплата Stars
bot.on('message', async (ctx) => {
  const sp = ctx.message?.successful_payment;
  if (!sp) return;

  try {
    const payload = sp.invoice_payload || '';
    // варианты: "<uid>:pack_100"  или  "<uid>:ins_100"
    const [uidStr, tail] = payload.split(':');
    const uid = Number(uidStr);
    if (!uid || !tail) return;

    if (tail.startsWith('pack_')) {
      const pack = tail.replace('pack_', '').trim();
      if (STARS_PACKS_BALANCE[pack]) {
        const credit = STARS_PACKS_BALANCE[pack].credit;
        await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credit, uid]);
        await ctx.reply(`💫 Пакет ${pack}⭐ → +$${credit.toLocaleString()} на баланс.`);
        return;
      }
    }

    if (tail.startsWith('ins_')) {
      const pack = tail.replace('ins_', '').trim();
      if (STARS_PACKS_INS[pack]) {
        const ins = STARS_PACKS_INS[pack].ins;
        await pool.query('UPDATE users SET insurance_count = insurance_count + $1 WHERE telegram_id=$2', [ins, uid]);
        await ctx.reply(`🛡️ Куплено страховок: ${ins} шт. Они применятся автоматически к проигранным ставкам (50% возврат).`);
        return;
      }
    }

    // fallback: нераспознанный payload
    const stars = sp.total_amount / 1000; // 1⭐ = 1000
    const credited = stars * 1000;
    await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id=$2', [credited, ctx.from.id]);
    await ctx.reply(`💫 Платёж принят: ${stars}⭐ → +$${credited.toLocaleString()}`);
  } catch (e) {
    console.error('successful_payment handler:', e);
  }
});

bot.launch().then(() => console.log('Bot started ✅'));
