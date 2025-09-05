// ===== Bootstrap (UTC + env) =====
import 'dotenv/config';

// Гарантируем единый UTC-день на бэке
process.env.TZ = 'UTC';

// ===== Imports =====
import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;

import { utcDayKey } from './utils/time.js';
import { runMigrations } from './migrate.js';

// ===== Config =====
const PORT = Number(process.env.PORT || 10000);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[ENV] Missing DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
});

// ===== App =====
const app = express();
app.use(cors());
app.use(express.json());

// health
app.get('/healthz', (_req, res) => res.json({ ok: true, utcDayKey: utcDayKey() }));

// Debug time (для проверки TZ/UTC)
app.get('/v1/debug/time', async (_req, res) => {
  const { rows } = await pool.query(`SELECT (now() AT TIME ZONE 'UTC')::date AS utc_date`);
  res.json({
    serverLocal: new Date().toString(),
    serverUTC: new Date().toISOString(),
    utcDayKey: utcDayKey(),
    sqlUtcDate: rows[0]?.utc_date
  });
});

// Admin DB health endpoint
app.get('/admin/db/health', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ ok: false });
  }
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT
        to_regclass('quest_templates') IS NOT NULL AS quest_templates,
        to_regclass('quest_templates_staging') IS NOT NULL AS quest_templates_staging,
        to_regclass('quest_scopes') IS NOT NULL AS quest_scopes
    `);
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'quest_templates';
    `);
      const scopes = await client.query(`SELECT DISTINCT scope FROM quest_templates ORDER BY scope`);
      res.json({ tables: tables.rows[0], constraints: constraints.rows, scopes: scopes.rows.map(r => r.scope) });
  } finally {
    client.release();
  }
});

async function start() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[srv] listening on :${PORT} (UTC day ${utcDayKey()})`);
  });
}

async function boot() {
  try {
    if (process.env.SKIP_MIGRATIONS === 'true') {
      console.log('[migrations] skipped via SKIP_MIGRATIONS');
    } else {
      console.log('[migrations] start');
      await runMigrations();
      console.log('[migrations] done');
    }
  } catch (e) {
    console.error('[migrations] failed', e);
    process.exit(1);
  }

  await start();
}

boot().catch((e) => {
  console.error('[srv] startup failed:', e);
  process.exit(1);
});

// Глобальные ловушки, чтобы видеть причину падения в Render
process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException',  (e) => { console.error('[uncaughtException]', e); process.exit(1); });
