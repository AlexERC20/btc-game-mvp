// src/server/migrate.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFile = path.join(__dirname, 'migrations', '040_squash_schema.sql');

const { Client } = pg;

// НЕ тащим сюда весь env, чтобы не падать на PUBLIC_URL и пр.
// Берём только DATABASE_URL.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[migrate] Missing DATABASE_URL');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await client.query('SET search_path TO public;');
    await client.query(sql);
    console.log('[migrate] 040_squash_schema.sql applied ✅');
  } catch (err) {
    console.error('[migrate] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
