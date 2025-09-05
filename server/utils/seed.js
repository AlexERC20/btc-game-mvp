export async function seedQuestTemplates(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const templates = [
      {
        qkey: 'daily:arena_10_wins',
        title: 'Выиграй 10 раз на арене',
        description: 'Победи 10 раз за сутки на арене',
        type: 'daily',
        scope: 'user',
        reward_usd: 1000,
        reward_vop: 0,
        limit_usd_delta: 500,
        code: 'arena_10_wins',
      },
      {
        qkey: 'daily:place_100_bets',
        title: 'Сделай 100 ставок',
        description: 'Любые ставки в любом режиме за сутки',
        type: 'daily',
        scope: 'user',
        reward_usd: 800,
        reward_vop: 0,
        limit_usd_delta: 500,
        code: 'place_100_bets',
      },
      {
        qkey: 'oneoff:subscribe_channel',
        title: 'Подписка на канал',
        description: 'Подпишись на @erc20coin',
        type: 'oneoff',
        scope: 'user',
        reward_usd: 30000,
        reward_vop: 0,
        limit_usd_delta: 0,
        code: 'subscribe_channel',
      },
      {
        qkey: 'daily:invite_1_friend',
        title: 'Пригласи 1 друга',
        description: 'Друг должен зайти в игру',
        type: 'daily',
        scope: 'user',
        reward_usd: 500,
        reward_vop: 0,
        limit_usd_delta: 500,
        code: 'invite_1_friend',
      },
    ];

    const UPSERT = `
INSERT INTO quest_templates
(qkey, title, description, type, scope, reward_usd, reward_vop, limit_usd_delta, code)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
ON CONFLICT (qkey) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  scope = EXCLUDED.scope,
  reward_usd = EXCLUDED.reward_usd,
  reward_vop = EXCLUDED.reward_vop,
  limit_usd_delta = EXCLUDED.limit_usd_delta,
  code = EXCLUDED.code;
`;

    let count = 0;
    for (const t of templates) {
      const qkey = String(t.qkey || '').toLowerCase();
      const scope = t.scope || 'user';
      const desc = t.description || '';
      await client.query(UPSERT, [
        qkey, t.title, desc, t.type, scope,
        t.reward_usd|0, t.reward_vop|0, t.limit_usd_delta|0,
        t.code || qkey.split(':')[1] || null,
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
