import { Router } from 'express';
import { pool } from '../db.js';
import { env } from '../env.js';

const router = Router();

router.get('/api/diag', async (_req, res) => {
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
      res.json({
        ok: true,
        env: {
          publicUrl: env.PUBLIC_URL,
          enableGameLoop: env.ENABLE_GAME_LOOP,
          enablePriceFeed: env.ENABLE_PRICE_FEED,
          enableBots: env.ENABLE_BOTS,
          roundLengthSec: env.ROUND_LENGTH_SEC,
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
