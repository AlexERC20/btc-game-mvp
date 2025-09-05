import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// Run SQL migrations located in ./migrations
export async function runMigrations(externalPool) {
  const ownPool = !externalPool;
  const pool = externalPool || new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    // Drop scope constraint up front to keep older migrations idempotent
    await client.query(
      'ALTER TABLE IF EXISTS quest_templates DROP CONSTRAINT IF EXISTS quest_templates_scope_chk;'
    );

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`${file} applied`);
      } catch (e) {
        await client.query('ROLLBACK');
        if (e.message && /already exists/.test(e.message)) {
          console.log(`${file} skipped`);
        } else {
          console.error(`migration ${file} failed`, e);
          throw e;
        }
      }
    }
  } finally {
    client.release();
    if (ownPool) await pool.end();
  }
}

// Allow running as a standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('migrations applied');
      process.exit(0);
    })
    .catch(err => {
      console.error('migrations failed', err);
      process.exit(1);
    });
}

