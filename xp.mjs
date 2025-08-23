export function xpNeededFor(level) {
  return Math.round(5000 * Math.pow(1.40, level - 1));
}

export function levelUpReward(level) {
  const mul = 1 + Math.min(0.3, 0.1 * (level - 1));
  return Math.round(10000 * mul);
}

export function isHappyHour(now = new Date()) {
  if (process.env.XP_HAPPY_HOUR_ENABLED !== '1') return false;
  const [from, to] = (process.env.XP_HAPPY_HOUR || '').split('-');
  if (!from || !to) return false;
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (h) => `${pad(h.getUTCHours())}:${pad(h.getUTCMinutes())}`;
  const cur = hhmm(now);
  return cur >= from && cur < to;
}

export function streakMultiplier(s = 0) {
  if (s >= 15) return 1.5;
  if (s >= 12) return 1.4;
  if (s >= 8) return 1.3;
  if (s >= 5) return 1.2;
  if (s >= 3) return 1.1;
  return 1;
}

export function xpMultiplierFor(user = {}, source, now = new Date()) {
  let m = 1;
  if (source === 'WIN') {
    m *= streakMultiplier(user.streak_wins || 0);
  }
  if (isHappyHour(now)) m *= 2;
  return m;
}

export async function grantXP(pool, userId, xp, source, meta = {}) {
  if (xp <= 0) return;

  const userRow = await pool.query(
    'SELECT xp, level, next_xp, streak_wins FROM users WHERE id=$1',
    [userId]
  );
  if (!userRow.rowCount) return;
  const user = userRow.rows[0];
  const mult = xpMultiplierFor(user, source, new Date());
  const finalXp = Math.floor(xp * mult);

  await pool.query(
    'INSERT INTO xp_events(user_id, source, amount, meta) VALUES($1,$2,$3,$4)',
    [userId, source, finalXp, { ...meta, multiplier: mult }]
  );

  await pool.query('BEGIN');
  const r = await pool.query(
    'SELECT xp, level, next_xp FROM users WHERE id=$1 FOR UPDATE',
    [userId]
  );
  if (!r.rowCount) {
    await pool.query('ROLLBACK');
    return;
  }

  let { xp: cur, level, next_xp } = r.rows[0];
  cur += finalXp;

  const rewards = [];
  while (cur >= next_xp) {
    cur -= next_xp;
    level += 1;
    const rew = levelUpReward(level);
    rewards.push(rew);
    await pool.query('UPDATE users SET balance=balance+$1 WHERE id=$2', [rew, userId]);
    next_xp = xpNeededFor(level);
  }

  await pool.query(
    'UPDATE users SET xp=$1, level=$2, next_xp=$3 WHERE id=$4',
    [cur, level, next_xp, userId]
  );
  await pool.query('COMMIT');

  return { level, xp: cur, next_xp, rewards };
}
