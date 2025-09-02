export function dailyKeyUTC(now = new Date()) {
  return new Date(now.toISOString().slice(0, 10)).toISOString().slice(0, 10);
}

export function weeklyKeyUTC(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 0=Mon
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
