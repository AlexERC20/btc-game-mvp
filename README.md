# ETH Game — Final (Telegram WebApp + Bot)

- Реальная цена ETH (Binance WS)
- Раунды: 60c, окно ставок 10c, пауза 10c
- Комиссия 10% только с проигравших
- Регистрация через бота → сразу $10 000
- Баланс ограничен: списание при ставке, пополнение только выигрышем
- История последних исходов
- Лидерборд победителей за сегодня (footer)

## Deploy на Render
Web Service (server):
- Root Directory: src/server
- Start: node src/server/server.js
- Env: DATABASE_URL, ASSET, BINANCE_WS, BOTS_ENABLED (optional bot settings in .env)

Background Worker/Web Service (bot):
- Root Directory: bot
- Start: node bot.js
- Env: BOT_TOKEN, WEBAPP_URL, DATABASE_URL
