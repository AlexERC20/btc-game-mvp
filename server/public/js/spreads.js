function go(url){ location.href = url; }
const exchangeSel = document.getElementById('exchange');
const symbolInput = document.getElementById('symbol');
const dexInput = document.getElementById('dex');
const startBtn = document.getElementById('startBtn');
const addError = document.getElementById('addError');
const trackList = document.getElementById('trackList');
const spreadRewards = document.getElementById('spreadRewards');
const convRewards = document.getElementById('convRewards');
const refreshBalance = document.getElementById('refreshBalance');
const backBtn = document.getElementById('backBtn');

backBtn?.addEventListener('click', ()=>go('/'));

function statusText(st){
  return { idle:'нет спреда', spread_open:'спред активен', cooldown:'конвергенция' }[st] || st;
}

function renderTrack(tr){
  const el = document.createElement('div');
  el.className = 'card track';
  el.id = 'track-'+tr.id;
  el.innerHTML = `<div><b>${tr.symbol}</b> — ${tr.exchange.toUpperCase()}</div>
<div>CEX: <span class="cex">${tr.cexPrice?.toFixed?.(6)||''}</span> DEX: <span class="dex">${tr.dexPrice?.toFixed?.(6)||''}</span></div>
<div>Спред: <span class="bps">${tr.bps?Math.round(tr.bps):''}</span> bps (<span class="pct">${tr.bps?(tr.bps/100).toFixed(2):''}</span>%)</div>
<div class="status">Статус: ${statusText(tr.status)}</div>
<div class="badge">Вы первый трекер</div>`;
  trackList.appendChild(el);
  const es = new EventSource(`/stream/spread?trackId=${tr.id}`);
  es.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.cexPrice) el.querySelector('.cex').textContent = Number(d.cexPrice).toFixed(6);
    if (d.dexPrice) el.querySelector('.dex').textContent = Number(d.dexPrice).toFixed(6);
    if (typeof d.bps === 'number'){
      el.querySelector('.bps').textContent = Math.round(d.bps);
      el.querySelector('.pct').textContent = (d.bps/100).toFixed(2);
    }
    if (d.status) el.querySelector('.status').textContent = 'Статус: '+statusText(d.status);
  };
}

async function loadTracks(){
  trackList.innerHTML = '';
  try{
    const r = await fetch('/api/spread/list').then(r=>r.json());
    if(r.ok){
      r.tracks.forEach(renderTrack);
    }
  }catch{}
}

async function loadRewards(){
  try{
    const r = await fetch('/api/spread/rewards').then(r=>r.json());
    if(r.ok){
      spreadRewards.textContent = `Спреды найдены: ${r.spread} → $${r.spread*1000}`;
      convRewards.textContent = `Конвергенции: ${r.convergence} → $${r.convergence*1000}`;
    }
  }catch{}
}

startBtn.addEventListener('click', async ()=>{
  addError.textContent = '';
  const body = {
    exchange: exchangeSel.value,
    symbol: symbolInput.value.trim(),
    dexUrlOrPair: dexInput.value.trim()
  };
  try {
    const r = await fetch('/api/spread/track', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).then(r=>r.json());
    if(!r.ok){
      const map = { BAD_EXCHANGE:'Укажи биржу', BAD_SYMBOL:'Неверный символ', BAD_DEX:'Дай ссылку на конкретную пару или адрес', TRACK_LIMIT:'Лимит треков'};
      addError.textContent = map[r.error] || 'Ошибка';
      return;
    }
    if(r.creator){
      addError.textContent = `Уже отслеживается (@${r.creator})`;
      return;
    }
    symbolInput.value=''; dexInput.value='';
    await loadTracks();
    await loadRewards();
  } catch {
    addError.textContent = 'Ошибка сети';
  }
});

refreshBalance.addEventListener('click', async ()=>{
  try{ await fetch('/api/auth'); }catch{}
  loadRewards();
});

loadTracks();
loadRewards();
