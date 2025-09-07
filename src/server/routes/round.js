export default function roundRoute(app, db) {
  app.get('/api/round', async (_req, res) => {
    try {
      // current round
      const r = await db.query(
        `SELECT id, state, ends_at AS "endsAt"
         FROM rounds
         ORDER BY id DESC
         LIMIT 1`
      );
      const round = r.rows[0] || null;

      // last price
      let lastPrice = null;
      const p = await db.query(
        `SELECT price_usd AS "lastPrice"
         FROM price_ticks
         ORDER BY id DESC
         LIMIT 1`
      );
      if (p.rows[0]) lastPrice = Number(p.rows[0].lastPrice);

      // bank: try to calculate from bets; if schema absent, keep 0
      let bank = 0;
      if (round) {
        try {
          const b = await db.query(
            `SELECT COALESCE(SUM(amount_usd), 0)::float AS bank
             FROM bets
             WHERE round_id = $1`,
            [round.id]
          );
          if (b.rows[0]) bank = Number(b.rows[0].bank);
        } catch (e) {
          // missing column/table -> ignore, bank stays 0
          if (e.code !== '42P01' && e.code !== '42703') throw e;
        }
      }

      if (!round)
        return res.json({ id: null, state: null, endsAt: null, bank, lastPrice });
      return res.json({ id: round.id, state: round.state, endsAt: round.endsAt, bank, lastPrice });
    } catch (err) {
      console.error('[round] error', err);
      return res.status(500).json({ ok: false });
    }
  });
}
