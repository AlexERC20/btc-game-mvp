const MS_PER_DAY = 86_400_000;

export function utcDayKey(ts = Date.now()) {
  return Math.floor(ts / MS_PER_DAY);
}

export function startOfUtcDay(ts = Date.now()) {
  return utcDayKey(ts) * MS_PER_DAY;
}

export function nextUtcMidnight(ts = Date.now()) {
  return startOfUtcDay(ts) + MS_PER_DAY;
}
