import { Router } from 'express';
import { env } from '../env.js';

const router = Router();

router.get('/tg/debug/webhook', async (_req, res) => {
  if (!env.TG_BOT_TOKEN) {
    return res.status(400).json({ ok: false, error: 'TG_BOT_TOKEN not set' });
  }
  try {
    const infoUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getWebhookInfo`;
    const info = await fetch(infoUrl).then(r => r.json());
    const hook = `${env.PUBLIC_URL}/tg/webhook`;
    const setWebhook = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(hook)}&secret_token=${env.WEBHOOK_SECRET}`;
    res.json({ ok: true, info, recommended: setWebhook });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

export default router;
