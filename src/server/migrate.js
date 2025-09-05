import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dir = path.join(process.cwd(), 'src', 'server', 'migrations');

export async function runMigrations(direction = 'up') {
  const files = fs.readdirSync(dir)
    .filter(f => /^\d+_.+\.sql$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));

  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`[migrate] applying ${f}`);
    await pool.query(sql);
  }
  await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === 'down') {
    console.error('[migrate] down direction not implemented');
    process.exit(1);
  } else {
    runMigrations('up').catch(e => {
      console.error('[migrate] failed', e);
      process.exit(1);
    });
  }
}
