let _dailyCache = null;

async function fetchDaily() {
  if (_dailyCache) return _dailyCache;
  try {
    const r = await fetch('/api/quests?scope=day');
    const data = await r.json();
    _dailyCache = data;
    if (!data.ok) console.error('Quests API error', data);
    return data;
  } catch (e) {
    console.error('Quests fetch failed', e);
    return { ok: false, items: [], claimable: 0 };
  }
}

export async function renderDailyStrip() {
  const el = document.getElementById('dailyQuestStrip');
  if (!el) return;
  const data = await fetchDaily();
  if (!data.items || !data.items.length) {
    console.error('No quests received', data);
    el.innerHTML = '<div class="left">Сегодня без заданий</div>';
    return;
  }
  const quest = data.items.find(q => !q.is_claimed && q.progress < q.goal) || data.items[0];
  const reward = quest.reward.type === 'USD'
    ? `$${quest.reward.value}`
    : `${quest.reward.value} ${quest.reward.type}`;
  let action = `<span style="color:var(--muted)">В прогрессе</span>`;
  if (!quest.is_claimed && quest.progress >= quest.goal) {
    action = `<button class="chipbtn" id="dqClaim">CLAIM</button>`;
  }
  const badge = data.claimable > 1 ? `<span class="badge">+${data.claimable}</span>` : '';
  el.innerHTML = `<div class="left">Ежедневка: ${quest.title} — ${quest.progress}/${quest.goal} • Награда: ${reward}</div><div class="right">${action} ${badge}</div>`;
  if (!quest.is_claimed && quest.progress >= quest.goal) {
    document.getElementById('dqClaim').onclick = async () => {
      try {
        await fetch('/api/quests/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: quest.id })
        });
      } catch {}
      _dailyCache = null;
      renderDailyStrip();
    };
  }
}

renderDailyStrip();
