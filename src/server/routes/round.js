import { pool } from '../db.js';

export async function roundHandler(_req, res) {
  try {
    const client = await pool.connect();
    try {
      const roundRes = await client.query(
        'SELECT id, state, ends_at AS "endsAt", bank FROM rounds ORDER BY id DESC LIMIT 1'
      );
      const round = roundRes.rows[0];
      if (!round) {
        res.status(404).json({ ok: false });
        return;
      }
      const priceRes = await client.query(
        'SELECT price_usd AS "lastPrice" FROM price_ticks ORDER BY id DESC LIMIT 1'
      );
      const lastPrice = priceRes.rows[0]?.lastPrice ?? null;
      res.json({ ...round, lastPrice });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[round] error', e);
    res.status(500).json({ ok: false });
  }
}

export default roundHandler;

