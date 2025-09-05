const TEMPLATES = [
  { qkey: 'arena_bets_20', title: 'Сделай 20 ставок на Арене', goal: 20 },
  { qkey: 'classic_buys_100', title: 'Сделай 100 покупок в Классике', goal: 100 },
  { qkey: 'classic_sells_100', title: 'Сделай 100 продаж в Классике', goal: 100 },
  { qkey: 'arena_wins_10', title: 'Выиграй 10 раз на Арене', goal: 10 },
  { qkey: 'invite_3_friends', title: 'Пригласи 3 друзей', goal: 3 },
  { qkey: 'refresh_round_by_1_friend', title: 'Обнови раунд другом', goal: 1 },
  { qkey: 'daily_login', title: 'Зайди в игру', goal: 1 },
  { qkey: 'subscribe_channel', title: 'Подпишись на канал', goal: 1 },
];

function normalizeTemplate(t) {
  return {
    qkey: String(t.qkey || '').toLowerCase(),
    title: t.title || '',
    description: t.description ?? '',
    scope: t.scope || 'user',
    goal: Number.isFinite(t.goal) ? t.goal : 1,
    metric: t.metric || 'count',
    reward_usd: t.reward_usd ?? 0,
    reward_vop: t.reward_vop ?? 0,
    frequency: t.frequency || 'daily',
    is_enabled: t.is_enabled ?? true,
    expires_at: t.expires_at ?? null,
  };
}

export async function seedQuestTemplates(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const UPSERT = `
INSERT INTO quest_templates (qkey, title, description, scope, goal, metric, reward_usd, reward_vop, frequency, is_enabled, expires_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (qkey) DO UPDATE
SET title=EXCLUDED.title,
    description=EXCLUDED.description,
    scope=EXCLUDED.scope,
    goal=EXCLUDED.goal,
    metric=EXCLUDED.metric,
    reward_usd=EXCLUDED.reward_usd,
    reward_vop=EXCLUDED.reward_vop,
    frequency=EXCLUDED.frequency,
    is_enabled=EXCLUDED.is_enabled,
    expires_at=EXCLUDED.expires_at;`;

    let count = 0;
    for (const raw of TEMPLATES) {
      const tpl = normalizeTemplate(raw);
      if (!tpl.qkey) {
        console.error('[seed][quest_templates] skip: empty qkey', raw);
        continue;
      }
      await client.query(UPSERT, [
        tpl.qkey,
        tpl.title,
        tpl.description,
        tpl.scope,
        tpl.goal,
        tpl.metric,
        tpl.reward_usd,
        tpl.reward_vop,
        tpl.frequency,
        tpl.is_enabled,
        tpl.expires_at,
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
