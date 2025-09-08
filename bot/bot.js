const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL;

bot.start((ctx) => {
  return ctx.reply(
    'Собери карусель из текста и фото:',
    Markup.inlineKeyboard([Markup.button.webApp('Открыть конструктор', WEBAPP_URL)])
  );
});

bot.launch();
console.log('Bot started');
