import { runMigrations } from './migrate.js';

export { runMigrations };

export async function ensureBootstrap(db, envConfig) {
  const client = await db.connect();
  let current;
  try {
    await client.query('BEGIN');
    const { rows: roundRows } = await client.query('SELECT id, state, ends_at FROM rounds ORDER BY id DESC LIMIT 1 FOR UPDATE');
    const nowRes = await client.query('SELECT now() AS now');
    const now = nowRes.rows[0].now;
    current = roundRows[0];
    if (!current) {
      const ins = await client.query(
        `INSERT INTO rounds(state, starts_at, ends_at)
         VALUES('OPEN', $1, $1 + ($2 || ' seconds')::interval) RETURNING id, state, ends_at`,
        [now, envConfig.ROUND_LENGTH_SEC]
      );
      current = ins.rows[0];
      console.log(`[bootstrap] created initial round id=${current.id}`);
    } else if (current.state === 'OPEN' && current.ends_at < now) {
      await client.query('UPDATE rounds SET state=\'CLOSED\' WHERE id=$1', [current.id]);
      console.log(`[bootstrap] recovered stuck round id=${current.id} -> CLOSED`);
      const ins = await client.query(
        `INSERT INTO rounds(state, starts_at, ends_at)
         VALUES('OPEN', $1, $1 + ($2 || ' seconds')::interval) RETURNING id, state, ends_at`,
        [now, envConfig.ROUND_LENGTH_SEC]
      );
      current = ins.rows[0];
      console.log(`[bootstrap] created initial round id=${current.id}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Seed quest_templates if empty
  const { rows: qtCount } = await db.query('SELECT COUNT(*)::int AS cnt FROM quest_templates');
  if (qtCount[0].cnt === 0) {
    await db.query(`INSERT INTO quest_templates(code, scope, metric, goal, title, description)
                    VALUES('demo','global','demo',0,'Demo quest','') ON CONFLICT DO NOTHING`);
    console.log('[bootstrap] seeded quest_templates default');
  }
  return current;
}

export function startServices(envConfig, services) {
  if (envConfig.ENABLE_PRICE_FEED) { services.startPriceFeed?.(); console.log('[svc] priceFeed started'); }
  if (envConfig.ENABLE_GAME_LOOP)  { services.startGameLoop?.();  console.log('[svc] gameLoop started'); }
  if (envConfig.ENABLE_BOTS)       { services.startBots?.();      console.log('[svc] bots started'); }
}
