import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import pg from 'pg';

const { BOT_TOKEN, WEBAPP_URL, DATABASE_URL, PORT=8081 } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL missing');
if (!DATABASE_URL) throw new Error('DATABASE_URL missing');

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }});
await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    balance BIGINT NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);

const bot = new Telegraf(BOT_TOKEN);
bot.start(async (ctx)=>{
  const uid = ctx.from.id;
  await pool.query(`INSERT INTO users(telegram_id,balance) VALUES($1,10000) ON CONFLICT (telegram_id) DO NOTHING`, [uid]);
  const url = WEBAPP_URL + `?uid=${uid}`;
  const kb = Markup.keyboard([[Markup.button.webApp('Открыть BTC Game', url)]]).resize();
  await ctx.reply('Добро пожаловать! На баланс начислено $10 000. Жми кнопку 👇', kb);
});
bot.command('balance', async (ctx)=>{
  const r = await pool.query('SELECT balance FROM users WHERE telegram_id=$1', [ctx.from.id]);
  const bal = r.rows[0]?.balance ?? 0;
  await ctx.reply(`Твой баланс: $${Number(bal).toLocaleString()}`);
});
bot.command('ref', async (ctx)=>{
  const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
  await ctx.reply(`Твоя реф-ссылка:\n${link}`);
});

const app = express();
app.get('/', (req,res)=> res.send('BTC Game Bot is running'));
app.listen(PORT, ()=> console.log('Bot HTTP on', PORT));

bot.launch().then(()=> console.log('Bot started ✅'));
