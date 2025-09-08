const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL is not set');

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  return ctx.reply(
    'Собери карусель из текста и фото:',
    Markup.inlineKeyboard([Markup.button.webApp('Открыть конструктор', WEBAPP_URL)])
  );
});

bot.launch();
console.log('Bot started');
