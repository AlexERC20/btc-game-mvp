import { pool } from '../server/db.js';
import quests from './quests.definitions.json' with { type: 'json' };

(async () => {
  const client = await pool.connect();
  try {
    for (const q of quests) {
      await client.query(
        `INSERT INTO quest_templates
         (qkey, title, description, goal, metric, scope, reward_usd, weight, enabled, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (qkey) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           goal = EXCLUDED.goal,
           metric = EXCLUDED.metric,
           scope = EXCLUDED.scope,
           reward_usd = EXCLUDED.reward_usd,
           weight = EXCLUDED.weight,
           enabled = EXCLUDED.enabled,
           meta = EXCLUDED.meta`,
        [
          q.qkey,
          q.title,
          q.description,
          q.goal,
          q.metric,
          q.scope,
          q.reward_usd,
          q.weight,
          q.enabled,
          q.meta ?? {}
        ]
      );
    }
    console.log('Seed quests: OK');
  } catch (e) {
    console.error('Seed quests failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
