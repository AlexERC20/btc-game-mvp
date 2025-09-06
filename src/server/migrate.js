import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

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
    await client.query('BEGIN');
    await client.query('SET search_path TO public');
    await client.query(sql);
    await client.query('COMMIT');
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

