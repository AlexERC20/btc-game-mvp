const TEMPLATES = [
  {
    qkey: 'arena_bets_20',
    title: 'Сделай 20 ставок на Арене',
    goal: 20,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'classic_buys_100',
    title: 'Сделай 100 покупок в Классике',
    goal: 100,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'classic_sells_100',
    title: 'Сделай 100 продаж в Классике',
    goal: 100,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'arena_wins_10',
    title: 'Выиграй 10 раз на Арене',
    goal: 10,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'invite_3_friends',
    title: 'Пригласи 3 друзей',
    goal: 3,
    scope: 'user',
    metric: 'count',
    frequency: 'once'
  },
  {
    qkey: 'refresh_round_by_1_friend',
    title: 'Обнови раунд другом',
    goal: 1,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'daily_login',
    title: 'Зайди в игру',
    goal: 1,
    scope: 'user',
    metric: 'count',
    frequency: 'daily'
  },
  {
    qkey: 'subscribe_channel',
    title: 'Подпишись на канал',
    goal: 1,
    scope: 'user',
    metric: 'count',
    frequency: 'once'
  }
];

const ALLOWED_SCOPE  = new Set(['user', 'global']);
const ALLOWED_METRIC = new Set(['count', 'usd', 'vop']);
const ALLOWED_FREQ   = new Set(['once', 'daily', 'weekly']);

function norm(t) {
  const rawScope = (t.scope || '').toLowerCase();
  if (rawScope && !ALLOWED_SCOPE.has(rawScope)) {
    console.warn(`[seed][quest_templates] dirty scope "${t.scope}" -> 'user'`);
  }
  const scope = ALLOWED_SCOPE.has(rawScope) ? rawScope : 'user';

  const metric = (t.metric || 'count').toLowerCase();
  const frequency = (t.frequency || 'daily').toLowerCase();

  return {
    qkey: String(t.qkey || '').toLowerCase(),
    title: t.title || '',
    description: t.description ?? '',
    scope,
    goal: Number.isFinite(t.goal) && t.goal > 0 ? Math.trunc(t.goal) : 1,
    metric: ALLOWED_METRIC.has(metric) ? metric : 'count',
    reward_usd: t.reward_usd ?? 0,
    reward_vop: t.reward_vop ?? 0,
    frequency: ALLOWED_FREQ.has(frequency) ? frequency : 'daily',
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

export async function seedQuestTemplates(pool, templates = TEMPLATES) {
  let count = 0;
  for (const raw of templates) {
    const t = norm(raw);
    if (!t.qkey) { console.error('[seed] skip empty qkey', raw); continue; }
    try {
      await upsertTemplate(pool, t);
      count++;
    } catch (e) {
      console.error('[seed][quest_templates] bad row:', t, e.message);
      throw e;
    }
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
