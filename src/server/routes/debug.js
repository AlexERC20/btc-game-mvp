import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.use('/api/debug', (req, res, next) => {
  const env = req.app.locals.env || {};
  const secret = req.get('X-Admin-Secret') || '';
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false });
  }
  next();
});

router.post('/api/debug/price', async (req, res) => {
  const price = Number(req.body?.price);
  if (!Number.isFinite(price)) {
    return res.status(400).json({ ok: false, error: 'invalid price' });
  }
  try {
    await pool.query(
      'INSERT INTO price_ticks (price) OVERRIDING SYSTEM VALUE VALUES ($1)',
      [price]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[debug/price] error', e);
    res.status(500).json({ ok: false });
  }
});

router.post('/api/debug/round/start', async (_req, res) => {
  try {
    const { rows: priceRows } = await pool.query(
      'SELECT price FROM price_ticks ORDER BY created_at DESC LIMIT 1'
    );
    const lastPrice = priceRows[0]?.price;
    if (lastPrice == null) {
      return res.status(400).json({ ok: false, error: 'no price' });
    }
    const { rows } = await pool.query(
      `INSERT INTO rounds(state, starts_at, ends_at, start_price)
       VALUES('OPEN', now(), now() + interval '60 seconds', $1)
       RETURNING id, state, ends_at`,
      [lastPrice]
    );
    const round = rows[0];
    res.json({ ok: true, round });
  } catch (e) {
    console.error('[debug/round/start] error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;
