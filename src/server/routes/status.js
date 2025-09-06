import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/api/status', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const priceRes = await client.query(
        'SELECT price FROM price_ticks ORDER BY created_at DESC LIMIT 1'
      );
      const lastPrice = priceRes.rows[0]?.price ?? 60000;
      const roundRes = await client.query(
        'SELECT id, state, ends_at FROM rounds ORDER BY id DESC LIMIT 1'
      );
      const r = roundRes.rows[0] || null;
      const round = r
        ? { id: r.id, state: r.state, endsAt: r.ends_at }
        : null;
      res.json({ lastPrice, round });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[status] error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;
