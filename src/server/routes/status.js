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
      const svcRes = await client.query("SELECT state FROM service_status WHERE name='srv'");
      const svcRow = svcRes.rows[0] || { state: 'booting' };
      const qtRes = await client.query('SELECT active, COUNT(*)::int AS cnt FROM quest_templates GROUP BY active');
      const quests = { enabled: 0, disabled: 0 };
      for (const r of qtRes.rows) {
        if (r.active) quests.enabled = r.cnt; else quests.disabled = r.cnt;
      }
      const integrityRes = await Promise.all([
        client.query("SELECT COUNT(*)::int AS bad_frequency FROM quest_templates WHERE frequency NOT IN ('once','daily','weekly')"),
        client.query("SELECT COUNT(*)::int AS bad_reward_type FROM quest_templates WHERE reward_type NOT IN ('USD','VOP','XP')"),
        client.query("SELECT COUNT(*)::int AS has_nulls FROM quest_templates WHERE code IS NULL OR scope IS NULL OR metric IS NULL OR goal IS NULL OR title IS NULL OR description IS NULL OR frequency IS NULL OR active IS NULL OR reward_type IS NULL OR reward_value IS NULL"),
      ]);
      const result = {
        service: { state: svcRow.state },
        round: round ? { id: round.id, state: round.state, endsAt: round.ends_at } : null,
        bank,
        lastPrice,
        quests,
        integrity: {
          badFrequency: integrityRes[0].rows[0].bad_frequency,
          badRewardType: integrityRes[1].rows[0].bad_reward_type,
          hasNulls: integrityRes[2].rows[0].has_nulls,
        },
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
