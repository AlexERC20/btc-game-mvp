import { Router } from 'express';

const router = Router();

router.get('/tg/debug/webhook', async (req, res) => {
  const env = req.app.locals.env || {};
  if (!env.TELEGRAM_BOT_TOKEN) {
    return res.status(400).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });
  }
  try {
    const infoUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
    const info = await fetch(infoUrl).then(r => r.json());
    const hook = `${req.baseUrlExt}/tg/webhook`;
    const setWebhook = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(hook)}&secret_token=${env.TG_WEBHOOK_SECRET}`;
    res.json({ ok: true, info, recommended: setWebhook });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

export default router;
