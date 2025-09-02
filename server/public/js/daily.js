let _cache = null;

export async function loadDailySummary(force = false) {
  if (!force && _cache) return _cache;
  try {
    const r = await fetch('/v1/daily/summary');
    const data = await r.json();
    _cache = data;
    return data;
  } catch (e) {
    console.error('loadDailySummary failed', e);
    return { tasks: [], tasks_available: false, limits: {} };
  }
}

setInterval(() => { _cache = null; }, 60000);
