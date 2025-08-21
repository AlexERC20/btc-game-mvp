# BTC Game — Final (Telegram WebApp + Bot)

- Реальная цена BTC (Binance WS)
- Раунды: 60c, окно ставок 10c, пауза 10c
- Комиссия 10% только с проигравших
- Регистрация через бота → сразу $10 000
- Баланс ограничен: списание при ставке, пополнение только выигрышем
- История последних исходов
- Лидерборд победителей за сегодня (footer)

## Deploy на Render
Web Service (server):
- Root Directory: server
- Start: node server.js
- Env: DATABASE_URL, BINANCE_WS

Background Worker/Web Service (bot):
- Root Directory: bot
- Start: node bot.js
- Env: BOT_TOKEN, WEBAPP_URL, DATABASE_URL
