import { grantXp } from './lib/accounting.js';

export const XP = {
  BET: 50,
  WIN_PER_DOLLAR: 1,
  CHAT: 300,
  STARS: 1000,
  INSURANCE: 1000,
};

export const LEVEL = {
  BASE: 5000,
  GROWTH: 1.25,
};

export function calcLevelFromXp(totalXp) {
  let lvl = 1;
  let need = LEVEL.BASE;
  let remaining = Number(totalXp) || 0;
  while (remaining >= need) {
    remaining -= need;
    lvl += 1;
    need = Math.floor(need * LEVEL.GROWTH);
  }
  return lvl;
}

export function levelThreshold(level) {
  let need = LEVEL.BASE;
  for (let i = 1; i < level; i++) {
    need = Math.floor(need * LEVEL.GROWTH);
  }
  return need;
}

export function xpSpentBeforeLevel(level) {
  let spent = 0;
  let need = LEVEL.BASE;
  for (let i = 1; i < level; i++) {
    spent += need;
    need = Math.floor(need * LEVEL.GROWTH);
  }
  return spent;
}

export async function grantXpOnce(pool, userId, source, sourceId, amount) {
  if (!amount || amount <= 0) return;
  try {
    await pool.query(
      `INSERT INTO xp_log(user_id, source, source_id, amount)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [userId, source, sourceId || null, amount]
    );
    await grantXp(pool, userId, amount);
  } catch (e) {
    console.error('grantXpOnce', e);
  }
}
