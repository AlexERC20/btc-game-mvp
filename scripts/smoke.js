import { loadEnv } from '../src/server/env.js';
loadEnv('migrate');
import { pool } from '../src/server/db.js';

(async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    const { rows: [row] = [] } = await client.query('SELECT COUNT(*)::int AS cnt FROM quest_templates');
    console.log('[smoke] ok', { quests: row?.cnt ?? 0 });
  } catch (e) {
    console.error('[smoke] fail', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
