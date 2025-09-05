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
import { seedQuests } from '../scripts/seed-quests.js';

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
      if (process.env.SKIP_QUEST_SEED === 'true') {
        console.log('[seed] quest_templates skipped via SKIP_QUEST_SEED');
      } else {
        console.log('[seed] quest_templates start');
        await seedQuests(pool);
        console.log('[seed] quest_templates done');
      }
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
