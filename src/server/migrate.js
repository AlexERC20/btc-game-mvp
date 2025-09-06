import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

async function ensureServiceStatus(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS service_status (
    name       TEXT PRIMARY KEY,
    state      TEXT NOT NULL DEFAULT 'booting',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const { rows: [{ ok: hasState }] } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='service_status' AND column_name='state'
    ) AS ok`);

  if (!hasState) {
    const { rows: [{ ok: hasStatus }] } = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='service_status' AND column_name='status'
      ) AS ok`);
    if (hasStatus) {
      await client.query(`ALTER TABLE service_status RENAME COLUMN status TO state`);
    } else {
      await client.query(`ALTER TABLE service_status ADD COLUMN state TEXT NOT NULL DEFAULT 'booting'`);
    }
  }

  await client.query(`ALTER TABLE service_status DROP CONSTRAINT IF EXISTS service_status_state_chk`);
  await client.query(`ALTER TABLE service_status
            ADD CONSTRAINT service_status_state_chk
            CHECK (state IN ('booting','migrating','ready','error'))`);
}

async function setServiceState(client, state) {
  await ensureServiceStatus(client);
  await client.query(
    `INSERT INTO service_status (name, state)
     VALUES ('srv', $1)
     ON CONFLICT (name)
     DO UPDATE SET state=$1, updated_at=now()`,
    [state]
  );
}

async function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = path.dirname(__filename);
  const sqlPath = path.join(__dirname, 'migrations', '040_squash_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    await setServiceState(client, 'migrating');
    await client.query('BEGIN');
    await client.query('SET search_path TO public');
    await client.query(sql);
    await client.query('COMMIT');
    await setServiceState(client, 'ready');
    console.log('[migrate] schema is up-to-date');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[migrate] failed', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

