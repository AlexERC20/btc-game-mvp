import { runMigrations } from '../server/migrate.js';
import { seedQuests } from './seed-quests.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[db:test-migrations] Missing DATABASE_URL or TEST_DATABASE_URL');
  process.exit(1);
}
process.env.DATABASE_URL = DATABASE_URL;
const { pool } = await import('../server/db.js');

try {
  await runMigrations(pool);
  await seedQuests(pool);
  const res = await pool.query(`
    SELECT array_agg(DISTINCT scope ORDER BY scope) AS scopes,
           COUNT(*) AS cnt
    FROM quest_templates;
  `);
  console.log('[db:test-migrations] scopes:', res.rows[0]?.scopes);
  console.log('[db:test-migrations] count:', res.rows[0]?.cnt);
  const expected = ['arena','classic','daily','farm','ref','system','weekly'];
  const scopes = res.rows[0]?.scopes || [];
  if (expected.some((s, i) => scopes[i] !== s)) {
    console.error('[db:test-migrations] unexpected scopes set');
    process.exit(1);
  }
  if ((res.rows[0]?.cnt ?? 0) <= 0) {
    console.error('[db:test-migrations] empty quest_templates');
    process.exit(1);
  }
  console.log('[db:test-migrations] OK');
} catch (e) {
  console.error('[db:test-migrations] failed', e);
  process.exit(1);
} finally {
  await pool.end();
}
