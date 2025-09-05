import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/api/diag', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const roundsTotalRes = await client.query('SELECT COUNT(*)::int AS cnt FROM rounds');
      const currentRoundRes = await client.query("SELECT id, state, ends_at FROM rounds WHERE state='OPEN' ORDER BY id DESC LIMIT 1");
      const currentRound = currentRoundRes.rows[0] || null;
      const priceTicksRes = await client.query("SELECT COUNT(*)::int AS cnt FROM price_ticks WHERE created_at > now() - interval '5 minutes'");
      let betsCurrent = 0;
      let bankCurrent = 0;
      if (currentRound) {
        const betsRes = await client.query('SELECT COUNT(*)::int AS cnt, COALESCE(SUM(bet),0) AS bank FROM arena_user_round WHERE round_id=$1', [currentRound.id]);
        betsCurrent = betsRes.rows[0].cnt;
        bankCurrent = Number(betsRes.rows[0].bank || 0);
      }
      const env = req.app.locals.env || {};
      res.json({
        ok: true,
        env: {
          publicUrl: req.baseUrlExt,
          botUsername: env.BOT_USERNAME,
          nodeEnv: env.NODE_ENV,
        },
        db: {
          roundsTotal: roundsTotalRes.rows[0].cnt,
          currentRound: currentRound ? { id: currentRound.id, state: currentRound.state, endsAt: currentRound.ends_at } : null,
          priceTicks5m: priceTicksRes.rows[0].cnt,
          betsCurrent,
          bankCurrent,
        }
      });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('[diag] error', e);
    res.status(500).json({ ok: false });
  }
});

export default router;
