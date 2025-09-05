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
    scope: t.scope || 'user', // 'user' | 'global'
    goal: Number.isFinite(t.goal) ? t.goal : 1,
    metric: t.metric || 'count', // 'count' | 'usd' | 'vop'
    reward_usd: t.reward_usd ?? 0,
    reward_vop: t.reward_vop ?? 0,
    frequency: t.frequency || 'daily', // 'once' | 'daily' | 'weekly'
    is_enabled: t.is_enabled ?? true,
    expires_at: t.expires_at ?? null,
  };
}

async function upsertTemplate(pool, tpl) {
  const cols = [
    'qkey','title','description','scope','goal','metric',
    'reward_usd','reward_vop','frequency','is_enabled','expires_at'
  ];
  const vals = cols.map((_, i) => `$${i+1}`).join(',');
  await pool.query(
    `
    INSERT INTO quest_templates (${cols.join(',')})
    VALUES (${vals})
    ON CONFLICT (qkey) DO UPDATE SET
      title=EXCLUDED.title,
      description=EXCLUDED.description,
      scope=EXCLUDED.scope,
      goal=EXCLUDED.goal,
      metric=EXCLUDED.metric,
      reward_usd=EXCLUDED.reward_usd,
      reward_vop=EXCLUDED.reward_vop,
      frequency=EXCLUDED.frequency,
      is_enabled=EXCLUDED.is_enabled,
      expires_at=EXCLUDED.expires_at
    `,
    cols.map(c => tpl[c])
  );
}

export async function seedQuestTemplates(pool) {
  let count = 0;
  for (const raw of TEMPLATES) {
    const tpl = normalizeTemplate(raw);
    if (!tpl.qkey) { console.error('[seed] skip empty qkey', raw); continue; }
    await upsertTemplate(pool, tpl);
    count++;
  }
  console.log(`[seed] quest_templates upserted: ${count}`);
  return count;
}

export async function assertQuestTemplateShape(pool) {
  const need = new Set(['qkey','title','description','scope','goal','metric','reward_usd','reward_vop','frequency','is_enabled','expires_at']);
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='quest_templates'
  `);
  const have = new Set(rows.map(r => r.column_name));
  const missing = [...need].filter(c => !have.has(c));
  if (missing.length) {
    throw new Error(`[schema] quest_templates missing columns: ${missing.join(', ')}`);
  }
}
