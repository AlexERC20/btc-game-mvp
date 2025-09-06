// Migrations are applied separately via migrate.js

async function sql(db, text, params) {
  console.log('[bootstrap.sql]', text, params);
  try {
    return await db.query(text, params);
  } catch (err) {
    console.error('[bootstrap.sql] failed', { text, params, error: err });
    throw err;
  }
}

export async function ensureBootstrap(db, envConfig) {
  const client = await db.connect();
  let current;
  try {
    await sql(client, 'BEGIN');

    const { rows: roundRows } = await sql(client, 'SELECT id, state, ends_at FROM rounds ORDER BY id DESC LIMIT 1 FOR UPDATE');
    const nowRes = await sql(client, 'SELECT now() AS now');
    const now = nowRes.rows[0].now;
    current = roundRows[0];
    if (!current) {
      const ins = await sql(
        client,
        `INSERT INTO rounds(state, starts_at, ends_at)
         VALUES('OPEN', $1, $1 + ($2 || ' seconds')::interval) RETURNING id, state, ends_at`,
        [now, envConfig.ROUND_LENGTH_SEC]
      );
      current = ins.rows[0];
      console.log(`[bootstrap] created initial round id=${current.id}`);
    } else if (current.state === 'OPEN' && current.ends_at < now) {
      await sql(client, 'UPDATE rounds SET state=\'CLOSED\' WHERE id=$1', [current.id]);
      console.log(`[bootstrap] recovered stuck round id=${current.id} -> CLOSED`);
      const ins = await sql(
        client,
        `INSERT INTO rounds(state, starts_at, ends_at)
         VALUES('OPEN', $1, $1 + ($2 || ' seconds')::interval) RETURNING id, state, ends_at`,
        [now, envConfig.ROUND_LENGTH_SEC]
      );
      current = ins.rows[0];
      console.log(`[bootstrap] created initial round id=${current.id}`);
    }
    await sql(client, 'COMMIT');
  } catch (e) {
    await sql(client, 'ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // Seed quest_templates if empty
  const { rows: qtCount } = await sql(db, 'SELECT COUNT(*)::int AS cnt FROM quest_templates');
  if (qtCount[0].cnt === 0) {
    await sql(db, `INSERT INTO quest_templates(code, scope, metric, goal, title, description)
                    VALUES('demo','global','demo',0,'Demo quest','') ON CONFLICT DO NOTHING`);
    console.log('[bootstrap] seeded quest_templates default');
  }
  await sql(db, `
    INSERT INTO service_state (skey, state)
    VALUES ('bootstrap', 'ready')
    ON CONFLICT (skey)
    DO UPDATE SET state = EXCLUDED.state, updated_at = now();
  `);
  // ensure service_status table and baseline record
  await sql(db, `CREATE TABLE IF NOT EXISTS service_status (
    name       TEXT PRIMARY KEY,
    state      TEXT NOT NULL DEFAULT 'booting',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  await sql(db, `ALTER TABLE service_status
    DROP CONSTRAINT IF EXISTS service_status_state_chk`);

  await sql(db, `ALTER TABLE service_status
    ADD CONSTRAINT service_status_state_chk
    CHECK (state IN ('booting','ready','error'))`);

  await sql(db, `INSERT INTO service_status (name, state)
                VALUES ('srv', 'booting')
                ON CONFLICT (name)
                DO UPDATE SET state='booting', updated_at=now()`);
  return current;
}

export function startServices(envConfig, services) {
  if (envConfig.ENABLE_PRICE_FEED) { services.startPriceFeed?.(); console.log('[svc] priceFeed started'); }
  if (envConfig.ENABLE_GAME_LOOP)  { services.startGameLoop?.();  console.log('[svc] gameLoop started'); }
  if (envConfig.ENABLE_BOTS)       { services.startBots?.();      console.log('[svc] bots started'); }
}
