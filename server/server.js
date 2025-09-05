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
import { seedQuestTemplates } from './utils/seed.js';
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

async function boot() {
  await runMigrations(pool);
  await seedQuestTemplates(pool);

  // ... тут ваши остальные роуты / логика ...

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[srv] listening on :${PORT} (UTC day ${utcDayKey()})`);
  });
}

boot().catch((e) => {
  console.error('[srv] startup failed:', e);
  process.exit(1);
});

// Глобальные ловушки, чтобы видеть причину падения в Render
process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException',  (e) => { console.error('[uncaughtException]', e); process.exit(1); });
