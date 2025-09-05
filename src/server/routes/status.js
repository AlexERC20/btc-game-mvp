import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/api/status', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const roundRes = await client.query("SELECT id, state, ends_at FROM rounds WHERE state='OPEN' ORDER BY id DESC LIMIT 1");
      const round = roundRes.rows[0] || null;
      let bank = 0;
      if (round) {
        const bankRes = await client.query('SELECT COALESCE(SUM(bet),0) AS bank FROM arena_user_round WHERE round_id=$1', [round.id]);
        bank = Number(bankRes.rows[0].bank || 0);
      }
      const priceRes = await client.query('SELECT price FROM price_ticks ORDER BY id DESC LIMIT 1');
      const lastPrice = priceRes.rows[0]?.price || null;
      const result = {
        round: round ? { id: round.id, state: round.state, endsAt: round.ends_at } : null,
        bank,
        lastPrice,
      };
      console.log('[status] ok');
      res.json(result);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[status] error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;
