import { pool } from '../server/db.js';
import quests from './quests.definitions.json' with { type: 'json' };

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE quest_templates_staging');

    const ins = `
      INSERT INTO quest_templates_staging
      (qkey, title, description, goal, metric, scope, reward_usd, weight, enabled, meta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;
    for (const q of quests) {
      await client.query(ins, [
        q.qkey, q.title, q.description, q.goal, q.metric, q.scope,
        q.reward_usd, q.weight, q.enabled, q.meta ?? {}
      ]);
    }

    await client.query('SELECT merge_quest_templates_from_staging()');
    await client.query('COMMIT');
    console.log('Seed quests: OK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed quests failed:', e);
    process.exit(1);
  } finally {
    client.release();
  }
})();
