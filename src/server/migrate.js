import './env.js';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const dir = path.join(process.cwd(), 'src', 'server', 'migrations');

export async function runMigrations(pool) {
  const ownPool = !pool;
  const db = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  const files = fs
    .readdirSync(dir)
    .filter(f => /^\d+_.+\.sql$/.test(f))
    .sort();

  let applied = 0;
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      const client = await db.connect();
      console.log(`[migrate] applying ${f}`);
      try {
        if (/^\s*BEGIN\b/i.test(sql)) {
          await client.query(sql);
        } else {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
        }
        console.log(`[migrate] applied ${f}`);
        applied++;
      } catch (e) {
        try {
          if (!/^\s*BEGIN\b/i.test(sql)) {
            await client.query('ROLLBACK');
          }
        } catch {}
        console.error(`[migrate] failed ${f}`, e);
        throw e;
      } finally {
        client.release();
      }
    }
  } finally {
    if (ownPool) await db.end();
  }
  return applied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(n => {
    console.log(`[migrate] applied ${n} files`);
  }).catch(e => {
    console.error('[migrate] failed', e);
    process.exit(1);
  });
}
