import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const { rows: [row] = [] } = await pool.query("SELECT state FROM service_status WHERE name='srv'");
    const ok = row?.state === 'ready';
    if (ok) res.json({ ok: true });
    else res.status(503).json({ ok: false });
  } catch (e) {
    console.error('[health] error', e);
    res.status(503).json({ ok: false });
  }
});

export default router;
