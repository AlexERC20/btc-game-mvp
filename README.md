# ETH Game — Final (Telegram WebApp + Bot)

- Реальная цена ETH (Binance WS)
- Раунды: 60c, окно ставок 10c, пауза 10c
- Комиссия 10% только с проигравших
- Регистрация через бота → сразу $10 000
- Баланс ограничен: списание при ставке, пополнение только выигрышем
- История последних исходов
- Лидерборд победителей за сегодня (footer)

## Deploy на Render
### Web Service (server)
- Build: `npm ci`
- Pre-deploy: `node src/server/migrate.js`
- Start: `node src/server/server.js`
- Required env vars:
  - `NODE_ENV=production`
  - `DATABASE_URL=postgres://...`
  - `TELEGRAM_BOT_TOKEN=xxxxxxxxx`
  - `TG_WEBHOOK_SECRET=any-secret`
  - `PUBLIC_URL=https://btc-game-mvp.onrender.com` (optional)
  - `ENABLE_GAME_LOOP=1`
  - `ENABLE_PRICE_FEED=1`
  - `ENABLE_BOTS=1`
  - `ROUND_LENGTH_SEC=60`

### Background Worker/Web Service (bot)
- Root Directory: `bot`
- Start: `node bot.js`
- Env: `BOT_TOKEN`, `WEBAPP_URL`, `DATABASE_URL`
