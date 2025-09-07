import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/api/diag', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const priceTicksRes = await client.query(
        "SELECT count(*)::int AS c FROM price_ticks WHERE created_at > now() - interval '5 minutes'"
      );
      const priceTicks5m = priceTicksRes.rows[0].c;
      const ok = priceTicks5m > 0;
      res.json({ priceTicks5m, ok });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[diag] error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;
