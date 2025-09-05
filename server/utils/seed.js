export async function seedQuestTemplates(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /** минимальный пул шаблонов */
    const templates = [
      {
        qkey: 'daily:arena_10_wins',
        title: 'Выиграй 10 раз на арене',
        description: 'Победи 10 раз за сутки на арене',
        type: 'daily',
        reward_usd: 1000,
        reward_vop: 0,
        limit_usd_delta: 500,
      },
      {
        qkey: 'daily:place_100_bets',
        title: 'Сделай 100 ставок',
        description: 'Любые ставки в любом режиме за сутки',
        type: 'daily',
        reward_usd: 800,
        reward_vop: 0,
        limit_usd_delta: 500,
      },
      {
        qkey: 'oneoff:subscribe_channel',
        title: 'Подписка на канал',
        description: 'Подпишись на @erc20coin',
        type: 'oneoff',
        reward_usd: 30000,      // по вашим последним правилам
        reward_vop: 0,
        limit_usd_delta: 0,
      },
      {
        qkey: 'daily:invite_1_friend',
        title: 'Пригласи 1 друга',
        description: 'Друг должен зайти в игру',
        type: 'daily',
        reward_usd: 500,
        reward_vop: 0,
        limit_usd_delta: 500,   // +$ к дневному лимиту
      },
    ];

    const upsert = `
      INSERT INTO quest_templates
        (qkey, title, description, type, reward_usd, reward_vop, limit_usd_delta, code)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$1)
      ON CONFLICT (qkey) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        reward_usd = EXCLUDED.reward_usd,
        reward_vop = EXCLUDED.reward_vop,
        limit_usd_delta = EXCLUDED.limit_usd_delta,
        code = EXCLUDED.code;
    `;

    for (const t of templates) {
      // защита от случайных undefined
      await client.query(upsert, [
        t.qkey,
        t.title,
        t.description ?? '',
        t.type ?? 'daily',
        t.reward_usd ?? 0,
        t.reward_vop ?? 0,
        t.limit_usd_delta ?? 0,
      ]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
