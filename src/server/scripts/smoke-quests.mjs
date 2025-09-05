import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const countRes = await client.query('SELECT COUNT(*)::int AS cnt FROM quest_templates');
    console.log('[smoke] quest_templates count:', countRes.rows[0]?.cnt);

      const dupRes = await client.query(`SELECT code, COUNT(*) AS c FROM quest_templates GROUP BY code HAVING COUNT(*) > 1`);
      if (dupRes.rows.length > 0) {
        throw new Error('duplicate code: ' + JSON.stringify(dupRes.rows));
      }

      const nullRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM quest_templates WHERE description IS NULL OR frequency IS NULL`);
      if (nullRes.rows[0]?.cnt > 0) {
        throw new Error('NULL description/frequency rows: ' + nullRes.rows[0].cnt);
      }

    console.log('[smoke] ok');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[smoke] failed', e);
  process.exit(1);
});
