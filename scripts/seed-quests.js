import { pool } from '../server/db.js';
import { QUESTS } from './quests.definitions.js';

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Чистим staging (на всякий, но функция тоже чистит)
    await client.query('TRUNCATE quest_templates_staging');

    const text = `
      INSERT INTO quest_templates_staging
      (qkey, title, description, goal, metric, scope, reward_usd, weight, enabled, meta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;

    const existing = await client.query('SELECT qkey FROM quest_templates');
    const existingSet = new Set(existing.rows.map(r => r.qkey));

    let stagingCount = 0;
    let insertCount = 0;
    let updateCount = 0;

    for (const q of QUESTS) {
      await client.query(text, [
        q.qkey, q.title, q.description ?? '', q.goal, q.metric, q.scope,
        q.reward_usd, q.weight, q.enabled, q.meta ?? {}
      ]);
      stagingCount++;
      if (existingSet.has(q.qkey)) {
        updateCount++;
      } else {
        insertCount++;
      }
    }

    // Мердж + нормализация внутри БД
    await client.query('SELECT merge_quest_templates_from_staging()');

    await client.query('COMMIT');
    console.log(`[seed] inserted ${stagingCount} to staging, merged ${insertCount}, updated ${updateCount}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[seed] failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
