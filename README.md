# Carousel MVP

Telegram WebApp for creating image carousels from text and photos.

## Apps

- `apps/webapp` – Vite + React frontend.
- `apps/bot` – minimal aiogram bot that links to the WebApp.

## Development

### WebApp

```bash
cd apps/webapp
npm install
npm run dev
```

### Bot

```bash
cd apps/bot
pip install -r requirements.txt
BOT_TOKEN=... WEBAPP_URL=https://<org>.github.io/carousel/ python main.py
```

## Archive

The code for the previous BTC game is preserved under the tag [`btc-game-last`](../../tree/btc-game-last).

## License

MIT

Font files (Inter, Montserrat) are licensed under the [Open Font License](https://scripts.sil.org/OFL).
