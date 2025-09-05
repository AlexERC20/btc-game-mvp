export const utcDayKey = (d = new Date()) => d.toISOString().slice(0, 10); // 'YYYY-MM-DD'

export const startOfUtcDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
