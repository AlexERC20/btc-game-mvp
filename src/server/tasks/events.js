import { pool } from '../db.js';
import { dailyKeyUTC, weeklyKeyUTC } from './utils.js';

const bindings = [
  { event: 'arena_bid',     code: 'd_arena_bids_20',   period: 'daily' },
  { event: 'classic_any',   code: 'd_classic_any_100', period: 'daily' },
  { event: 'friend_active', code: 'd_invite_1',        period: 'daily' },
  { event: 'arena_win',     code: 'w_arena_wins_10',   period: 'weekly' },
  { event: 'friend_active', code: 'w_ref_5',           period: 'weekly' },
];

export async function addTaskProgress(userId, event, value = 1, at = new Date()) {
  const related = bindings.filter(b => b.event === event);
  if (!related.length) return;
  const codes = related.map(b => b.code);
  const { rows } = await pool.query(
    'SELECT code, period, goal, reward_usd, reward_vop, reward_limit_delta FROM tasks WHERE code = ANY($1) AND is_active',
    [codes]
  );
  for (const task of rows) {
    const periodKey = task.period === 'daily' ? dailyKeyUTC(at) : weeklyKeyUTC(at);
    await pool.query(
      `INSERT INTO user_task_progress (user_id, task_code, period, period_key, progress, goal, reward_usd, reward_vop, reward_limit_delta)
       VALUES ($1,$2,$3,$4,LEAST($5,$6),$6,$7,$8,$9)
       ON CONFLICT (user_id, task_code, period_key) DO UPDATE
         SET progress=LEAST(user_task_progress.progress+$5,user_task_progress.goal)`,
      [
        userId,
        task.code,
        task.period,
        periodKey,
        value,
        task.goal,
        task.reward_usd,
        task.reward_vop,
        task.reward_limit_delta,
      ]
    );
  }
}
