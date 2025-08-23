export async function creditBalance(client, userId, delta, req) {
  const r = await client.query(
    'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
    [delta, userId]
  );
  if (req) req._deltaBalance = (req._deltaBalance || 0) + Number(delta);
  return Number(r.rows[0].balance);
}

export async function grantXp(client, userId, xpDelta, req) {
  const r1 = await client.query(
    'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp, level',
    [xpDelta, userId]
  );
  const { xp, level } = r1.rows[0];
  const xpForLevel = (l) => 5000 * Math.pow(1.15, (l - 1));
  let curLevel = Number(level), curXp = Number(xp);
  let leveledUp = 0;
  while (curXp >= xpForLevel(curLevel + 1)) { curLevel++; leveledUp++; }
  if (leveledUp) {
    await client.query('UPDATE users SET level=$1 WHERE id=$2', [curLevel, userId]);
  }
  if (req) req._deltaXp = (req._deltaXp || 0) + Number(xpDelta);
  return { xp: curXp, level: curLevel, leveledUp };
}
