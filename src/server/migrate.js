import { loadEnv } from './env.js';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const env = loadEnv('migrate');

const dir = path.join(process.cwd(), 'src', 'server', 'migrations');

export async function runMigrations(pool) {
  const ownPool = !pool;
  const db = pool || new Pool({ connectionString: env.DATABASE_URL });

  // Determine current schema version
  let schemaVersion = 0;
  const vClient = await db.connect();
  try {
    const tableRes = await vClient.query(
      `SELECT to_regclass('public.schema_revisions') IS NOT NULL AS exists`
    );
    if (tableRes.rows[0]?.exists) {
      const verRes = await vClient.query('SELECT MAX(version)::int AS v FROM schema_revisions');
      schemaVersion = verRes.rows[0]?.v || 0;
    }
  } finally {
    vClient.release();
  }

  let files = fs
    .readdirSync(dir)
    .filter(f => /^\d+_.+\.sql$/.test(f))
    .sort();

  // Skip old 020-039 migrations
  files = files.filter(f => {
    const n = parseInt(f.split('_')[0], 10);
    return !(n >= 20 && n <= 39);
  });

  // If schema already at version >=1 run only squashed migration
  if (schemaVersion >= 1) {
    files = files.filter(f => f === '040_squash_schema.sql');
  }

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
        const msg = e?.message || e;
        console.error(`[migrate] failed in ${f}: ${msg}`);
        if (e?.position) {
          console.error(`[migrate] error position ${e.position}`);
        }
        throw e;
      } finally {
        client.release();
      }
    }

    // Post checks for quest_templates integrity
    const checkQueries = [
      { sql: "SELECT COUNT(*) AS bad_frequency FROM quest_templates WHERE frequency NOT IN ('once','daily','weekly')", key: 'bad_frequency' },
      { sql: "SELECT COUNT(*) AS bad_reward_type FROM quest_templates WHERE reward_type NOT IN ('USD','VOP','XP')", key: 'bad_reward_type' },
      { sql: "SELECT COUNT(*) AS has_nulls FROM quest_templates WHERE code IS NULL OR scope IS NULL OR metric IS NULL OR goal IS NULL OR title IS NULL OR description IS NULL OR frequency IS NULL OR active IS NULL OR reward_type IS NULL OR reward_value IS NULL", key: 'has_nulls' },
    ];
    const c = await db.connect();
    try {
      const results = {};
      for (const q of checkQueries) {
        const r = await c.query(q.sql);
        results[q.key] = Number(r.rows[0]?.[q.key] || r.rows[0]?.count || 0);
      }
      console.log('[migrate] post-checks', results);
      if (Object.values(results).some(v => v > 0)) {
        console.error('[migrate] integrity check failed');
        throw new Error('integrity check failed');
      }
    } finally {
      c.release();
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
