export async function seedQuestTemplates(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tpl = ({ qkey, title, type, reward_usd, limit_usd_delta = 0, scope = 'user', description = '' }) => ({
      qkey: qkey.toLowerCase(),
      title,
      type,
      reward_usd,
      limit_usd_delta,
      scope,
      description,
    });

    const templates = [
      tpl({
        qkey: 'daily:arena_10_wins',
        title: 'Выиграй 10 раз на арене',
        description: 'Победи 10 раз за сутки на арене',
        type: 'daily',
        reward_usd: 1000,
        limit_usd_delta: 500,
      }),
      tpl({
        qkey: 'daily:place_100_bets',
        title: 'Сделай 100 ставок',
        description: 'Любые ставки в любом режиме за сутки',
        type: 'daily',
        reward_usd: 800,
        limit_usd_delta: 500,
      }),
      tpl({
        qkey: 'oneoff:subscribe_channel',
        title: 'Подписка на канал',
        description: 'Подпишись на @erc20coin',
        type: 'oneoff',
        reward_usd: 30000,
        limit_usd_delta: 0,
      }),
      tpl({
        qkey: 'daily:invite_1_friend',
        title: 'Пригласи 1 друга',
        description: 'Друг должен зайти в игру',
        type: 'daily',
        reward_usd: 500,
        limit_usd_delta: 500,
      }),
    ];

    const UPSERT = `
INSERT INTO quest_templates (qkey, title, type, reward_usd, limit_usd_delta, scope, description)
VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (qkey) DO UPDATE
SET title=EXCLUDED.title,
    type=EXCLUDED.type,
    reward_usd=EXCLUDED.reward_usd,
    limit_usd_delta=EXCLUDED.limit_usd_delta,
    scope=EXCLUDED.scope,
    description=EXCLUDED.description;`;

    let count = 0;
    for (const t of templates) {
      await client.query(UPSERT, [
        t.qkey,
        t.title,
        t.type,
        t.reward_usd | 0,
        t.limit_usd_delta | 0,
        t.scope,
        t.description,
      ]);
      count++;
    }

    await client.query('COMMIT');
    console.log(`[seed] quest_templates upserted: ${count}`);
    return count;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
