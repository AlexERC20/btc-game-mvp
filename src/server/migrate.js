import './env.js';
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
    // Diagnostic queries after migrations
    const scopeVals = await client.query(`SELECT DISTINCT scope, COUNT(*) FROM quest_templates GROUP BY scope ORDER BY 2 DESC`);
    console.log('[migrations] quest_templates scope:', scopeVals.rows);
    const scopeCon = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'quest_templates' AND conname LIKE '%scope%';
    `);
    console.log('[migrations] scope constraints:', scopeCon.rows);

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

