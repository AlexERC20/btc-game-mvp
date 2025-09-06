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
      const integrityRes = await Promise.all([
        client.query("SELECT COUNT(*)::int AS bad_frequency FROM quest_templates WHERE frequency NOT IN ('once','daily','weekly')"),
        client.query("SELECT COUNT(*)::int AS bad_reward_type FROM quest_templates WHERE reward_type NOT IN ('USD','VOP','XP')"),
        client.query("SELECT COUNT(*)::int AS has_nulls FROM quest_templates WHERE code IS NULL OR scope IS NULL OR metric IS NULL OR goal IS NULL OR title IS NULL OR descr IS NULL OR frequency IS NULL OR active IS NULL OR reward_type IS NULL OR reward_value IS NULL"),
      ]);
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
        },
        integrity: {
          badFrequency: integrityRes[0].rows[0].bad_frequency,
          badRewardType: integrityRes[1].rows[0].bad_reward_type,
          hasNulls: integrityRes[2].rows[0].has_nulls,
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
