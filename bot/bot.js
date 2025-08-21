// bot/bot.js
import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import pg from 'pg';

const { BOT_TOKEN, WEBAPP_URL, DATABASE_URL, PORT=8081 } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL missing');
if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

const CHANNEL = '@erc20coin'; // канал для проверки

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// БД (на всякий случай)
await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    balance BIGINT NOT NULL DEFAULT 10000,
    channel_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS referrals(
    id SERIAL PRIMARY KEY,
    referrer_user_id INT REFERENCES users(id),
    referred_telegram_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

const bot = new Telegraf(BOT_TOKEN);

async function ensureUser(tgId, username){
  await pool.query(
    `INSERT INTO users(telegram_id, username, balance)
     VALUES($1,$2,10000) ON CONFLICT (telegram_id) DO NOTHING`,
    [tgId, username || null]
  );
  if (username){
    await pool.query(`UPDATE users SET username=$2 WHERE telegram_id=$1 AND (username IS NULL OR username='')`,
      [tgId, username]);
  }
  const r = await pool.query('SELECT id, balance, channel_bonus_claimed FROM users WHERE telegram_id=$1', [tgId]);
  return r.rows[0];
}

// единая функция проверки и начисления бонуса за канал
async function checkAndGrantChannelBonus(ctx){
  const uid = ctx.from.id;
  const uname = ctx.from.username ? '@'+ctx.from.username : null;
  const user = await ensureUser(uid, uname);

  // проверка подписки
  let isMember = false;
  try{
    const m = await ctx.telegram.getChatMember(CHANNEL, uid);
    isMember = m && m.status && m.status !== 'left';
  }catch(err){
    console.error('getChatMember error:', err.description || err.message);
    await ctx.reply('Не удалось проверить подписку. Убедись, что бот имеет доступ к участникам канала и попробуй ещё раз.');
    return;
  }

  if (!isMember){
    await ctx.reply(`Сначала подпишись на ${CHANNEL}, потом нажми «Проверить» ещё раз.`);
    return;
  }

  if (!user.channel_bonus_claimed){
    await pool.query('UPDATE users SET balance=balance+1000, channel_bonus_claimed=TRUE WHERE telegram_id=$1', [uid]);
    await ctx.reply('Бонус $1000 за подписку начислён ✅');
  } else {
    await ctx.reply('Бонус за подписку уже начислялся ранее ✅');
  }

  // Покажем актуальный баланс
  const r = await pool.query('SELECT balance FROM users WHERE telegram_id=$1', [uid]);
  const bal = r.rows[0]?.balance ?? 0;
  await ctx.reply(`Твой баланс: $${Number(bal).toLocaleString()}`);
}

/* /start (включая рефералку и start=check) */
bot.start(async (ctx)=>{
  const uid = ctx.from.id;
  const uname = ctx.from.username ? '@'+ctx.from.username : null;
  await ensureUser(uid, uname);

  const payload = ctx.startPayload; // refId или 'check' или 'bonus'
  if (payload && /^\d+$/.test(payload) && Number(payload)!==uid){
    try{
      // найдём/создадим реферера
      const r1 = await pool.query('SELECT id FROM users WHERE telegram_id=$1', [payload]);
      let refUserId = r1.rows[0]?.id;
      if (!refUserId){
        const ins = await pool.query('INSERT INTO users(telegram_id, balance) VALUES($1,10000) RETURNING id', [payload]);
        refUserId = ins.rows[0].id;
      }
      // зачесть, если ещё не было
      const exists = await pool.query('SELECT 1 FROM referrals WHERE referred_telegram_id=$1', [uid]);
      if (exists.rowCount === 0){
        await pool.query('INSERT INTO referrals(referrer_user_id, referred_telegram_id) VALUES($1,$2)', [refUserId, uid]);
        await pool.query('UPDATE users SET balance=balance+100 WHERE id=$1', [refUserId]);
      }
    }catch(e){ console.error('ref error', e.message); }
  } else if (payload && (payload === 'check' || payload === 'bonus')){
    // глубокая ссылка "Проверить" из мини-аппа
    await checkAndGrantChannelBonus(ctx);
    return;
  }

  const url = WEBAPP_URL + `?uid=${uid}`;
  const kb = Markup.keyboard([[Markup.button.webApp('Открыть BTC Game', url)]]).resize();
  await ctx.reply('Добро пожаловать! На баланс начислено $10 000. Жми кнопку 👇', kb);
});

/* /check и /bonus — оба делают одно и то же */
bot.command(['check', 'bonus'], async (ctx)=> {
  await checkAndGrantChannelBonus(ctx);
});

/* мини-HTTP, если бот как Web Service */
const app = express();
app.get('/', (_,res)=> res.send('BTC Game Bot is running'));
app.listen(PORT, ()=> console.log('Bot HTTP on', PORT));

bot.launch().then(()=> console.log('Bot started ✅'));
