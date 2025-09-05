import '../src/server/env.js';
import quests from './quests.definitions.json' with { type: 'json' };

// Normalize scope to whitelist
export function normalizeScope(scope) {
  const s = String(scope || '').toLowerCase();
  switch (s) {
    case 'd':
    case 'day':
    case 'daily':
      return 'daily';
    case 'w':
    case 'week':
    case 'weekly':
      return 'weekly';
    case 'arena':
      return 'arena';
    case 'farm':
    case '$':
    case 'money':
      return 'farm';
    case 'classic':
    case 'game':
      return 'classic';
    case 'ref':
    case 'referral':
    case 'invite':
      return 'ref';
    default:
      return 'system';
  }
}

// Seed quest_templates table with normalized scopes
export async function seedQuests(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const q of quests) {
      const scope = normalizeScope(q.scope);
      const code = q.code || q.qkey;
      await client.query(
        `INSERT INTO quest_templates
         (code, qkey, title, description, goal, metric, scope, reward_usd, weight, enabled, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (code, scope) DO UPDATE SET
           qkey = EXCLUDED.qkey,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           goal = EXCLUDED.goal,
           metric = EXCLUDED.metric,
           reward_usd = EXCLUDED.reward_usd,
           weight = EXCLUDED.weight,
           enabled = EXCLUDED.enabled,
           meta = EXCLUDED.meta`,
        [
          code,
          q.qkey || code,
          q.title || '',
          q.description || '',
          q.goal ?? 1,
          q.metric || 'count',
          scope,
          q.reward_usd ?? 0,
          q.weight ?? 100,
          q.enabled ?? true,
          q.meta ?? {},
        ]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const { pool } = await import('../src/server/db.js');
  seedQuests(pool)
    .then(() => {
      console.log('Seed quests: OK');
    })
    .catch((e) => {
      console.error('Seed quests failed:', e);
      process.exit(1);
    })
    .finally(() => pool.end());
}
