import pg from 'pg';

const TASKS = [
  { code: 'd_arena_bids_20',   title: 'Сделай 20 ставок на Арене',                description: '', period: 'daily',  goal: 20, reward_usd: 5000, reward_limit_delta: 500 },
  { code: 'd_classic_any_100', title: 'Сделай 100 ставок в Классике',             description: '', period: 'daily',  goal: 100, reward_usd: 3000 },
  { code: 'd_invite_1',        title: 'Позови 1 друга (активного сегодня)',       description: '', period: 'daily',  goal: 1, reward_usd: 2000, reward_limit_delta: 500 },
  { code: 'w_arena_wins_10',   title: 'Выиграй 10 раундов Арены за неделю',        description: '', period: 'weekly', goal: 10, reward_usd: 25000 },
  { code: 'w_ref_5',           title: '5 активных друзей за неделю',              description: '', period: 'weekly', goal: 5, reward_usd: 15000, reward_limit_delta: 2500 }
];

export async function seedTasks(pool) {
  for (const t of TASKS) {
    await pool.query(
      `INSERT INTO tasks(code, title, description, period, goal, reward_usd, reward_vop, reward_limit_delta, min_level, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,true)
       ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, goal=EXCLUDED.goal, reward_usd=EXCLUDED.reward_usd, reward_vop=EXCLUDED.reward_vop, reward_limit_delta=EXCLUDED.reward_limit_delta, is_active=true`,
      [t.code, t.title, t.description, t.period, t.goal, t.reward_usd || 0, t.reward_vop || 0, t.reward_limit_delta || 0]
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  seedTasks(pool)
    .then(() => { console.log('tasks seeded'); pool.end(); })
    .catch((e) => { console.error('seed error', e); pool.end(); });
}
