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
      const svcRes = await client.query("SELECT ok, details FROM service_status WHERE name='server'");
      const svcRow = svcRes.rows[0] || {};
      const qtRes = await client.query('SELECT active, COUNT(*)::int AS cnt FROM quest_templates GROUP BY active');
      const quests = { enabled: 0, disabled: 0 };
      for (const r of qtRes.rows) {
        if (r.active) quests.enabled = r.cnt; else quests.disabled = r.cnt;
      }
      const result = {
        service: { ok: svcRow.ok ?? true, details: svcRow.details || {} },
        round: round ? { id: round.id, state: round.state, endsAt: round.ends_at } : null,
        bank,
        lastPrice,
        quests,
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
