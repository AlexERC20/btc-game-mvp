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
- Env vars:
  - required:
    - `DATABASE_URL=postgres://...`
    - `TELEGRAM_BOT_TOKEN=xxxxxxxxx`
  - optional (have defaults):
    - `PUBLIC_URL` — fallback `RENDER_EXTERNAL_URL` or empty
    - `TG_WEBHOOK_SECRET` — empty string
    - `ROUND_LENGTH_SEC=60`
    - `ENABLE_GAME_LOOP=1` (off by default)
    - `ENABLE_PRICE_FEED=1` (off by default)
    - `ENABLE_BOTS=1` (off by default)

### Background Worker/Web Service (bot)
- Root Directory: `bot`
- Start: `node bot.js`
- Env: `BOT_TOKEN`, `WEBAPP_URL`, `DATABASE_URL`
