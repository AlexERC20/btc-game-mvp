import { loadDailySummary } from './daily.js';

export async function renderDailyStrip() {
  const el = document.getElementById('dailyQuestStrip');
  if (!el) return;
  const data = await loadDailySummary();
  if (!data.tasks_available) {
    el.innerHTML = '<div class="left">Сегодня без заданий</div>';
    return;
  }
  const claimable = data.tasks.filter(q => !q.is_claimed && q.progress >= q.goal).length;
  const quest = data.tasks.find(q => !q.is_claimed && q.progress < q.goal) || data.tasks[0];
  const reward = quest.reward.type === 'USD'
    ? `$${quest.reward.value}`
    : `${quest.reward.value} ${quest.reward.type}`;
  let action = `<span style="color:var(--muted)">В прогрессе</span>`;
  if (!quest.is_claimed && quest.progress >= quest.goal) {
    action = `<button class="chipbtn" id="dqClaim">CLAIM</button>`;
  }
  const badge = claimable > 1 ? `<span class="badge">+${claimable - 1}</span>` : '';
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
      await loadDailySummary(true);
      renderDailyStrip();
    };
  }
}

renderDailyStrip();
