(()=>{
  const A = {};
  window.Arena = A;

  const tg = window.Telegram?.WebApp;
  const $ = id => document.getElementById(id);

  const bankEl = $('arenaBank');
  const timerEl = $('arenaTimer');
  const phaseEl = $('arenaPhase');
  const leaderEl = $('arenaLeader');
  const bidBtn = $('arenaBidBtn');

  const infoBtn = $('arenaInfoBtn');
  const infoBg = $('sheetArenaInfoBg');
  const infoSheet = $('sheetArenaInfo');
  const infoOk = $('arenaInfoOk');

  const shoutBtn = $('arenaShoutBtn');
  const chatBtn = $('arenaChatBtn');
  const shoutBg = $('sheetArenaShoutBg');
  const shoutSheet = $('sheetArenaShout');
  const shoutInput = $('arenaShoutInput');
  const shoutSend = $('arenaShoutSend');
  const shoutCount = $('arenaShoutCount');
  const shoutHistory = $('arenaShoutHistory');
  const chatPrice = $('arenaChatPrice');

  function fmtTime(sec){
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return m+':'+s;
  }

  function openArenaInfo(){
    if(infoBg) infoBg.style.display='block';
    if(infoSheet) infoSheet.style.display='block';
    if(navigator.vibrate) navigator.vibrate(5);
  }
  function closeArenaInfo(){
    if(infoBg) infoBg.style.display='none';
    if(infoSheet) infoSheet.style.display='none';
  }
  if(infoBtn) infoBtn.addEventListener('click', openArenaInfo);
  if(infoOk) infoOk.addEventListener('click', closeArenaInfo);
  if(infoBg) infoBg.addEventListener('click', closeArenaInfo);
  if(localStorage.getItem('arena_info_seen_v1')!=='1'){
    openArenaInfo();
    localStorage.setItem('arena_info_seen_v1','1');
  }

  function openArenaShoutSheet(){
    if(shoutBg) shoutBg.style.display='block';
    if(shoutSheet) shoutSheet.style.display='block';
    refreshArenaShoutState();
    if(navigator.vibrate) navigator.vibrate(5);
  }
  function closeArenaShoutSheet(){
    if(shoutBg) shoutBg.style.display='none';
    if(shoutSheet) shoutSheet.style.display='none';
  }
  if(shoutBtn) shoutBtn.addEventListener('click', openArenaShoutSheet);
  if(chatBtn) chatBtn.addEventListener('click', openArenaShoutSheet);
  if(shoutBg) shoutBg.addEventListener('click', closeArenaShoutSheet);

  if(shoutInput) shoutInput.addEventListener('input', ()=>{
    if(shoutCount) shoutCount.textContent = `${shoutInput.value.length}/50`;
  });

  async function sendArenaShout(){
    const text = shoutInput?.value.trim();
    if(!text) return;
    if(shoutSend) shoutSend.disabled=true;
    const r = await fetch('/api/shout/bid',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({ initData: tg?.initData || '', text })}).then(r=>r.json()).catch(()=>({ok:false}));
    if(shoutSend) shoutSend.disabled=false;
    if(r.ok){
      if(shoutInput) shoutInput.value='';
      if(shoutCount) shoutCount.textContent='0/50';
      refreshArenaShoutState();
      if(navigator.vibrate) navigator.vibrate([30,60]);
    } else {
      alert('Не удалось отправить сообщение');
    }
  }
  if(shoutSend) shoutSend.addEventListener('click', sendArenaShout);
  A.sendArenaShout = sendArenaShout;

  async function refreshArenaShoutState(){
    const s = await fetch('/api/shout/state').then(r=>r.json()).catch(()=>null);
    if(s?.ok && chatPrice) chatPrice.textContent = `Цена: $${Number(s.price||0)}`;
    const h = await fetch('/api/shout/history?limit=20').then(r=>r.json()).catch(()=>null);
    if(h?.ok && shoutHistory){
      shoutHistory.innerHTML = h.items.map(it=>`<div class="msg"><div class="meta">@${(it.username||'anon').replace(/^@+/,'@')} · $${it.price}</div><div class="text">${escapeHtml(it.text||'')}</div></div>`).join('');
    }
  }
  A.refreshArenaShoutState = refreshArenaShoutState;

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;" }[m]));
  }

  let lastRound = null;
  let smokeCount = 0;
  async function pollArena(){
    const r = await fetch('/api/arena/state').then(r=>r.json()).catch(()=>null);
    if(!r?.ok) return;
    bankEl && (bankEl.textContent = '$'+Number(r.bank||0).toLocaleString());
    timerEl && (timerEl.textContent = fmtTime(r.timer));
    phaseEl && (phaseEl.textContent = r.phase||'');
    leaderEl && (leaderEl.textContent = r.leader ? `Лидер: ${r.leader}` : 'Лидер: —');
    bidBtn && (bidBtn.textContent = `Ставка $${r.nextBid}`);
    A.state = r;
    if(lastRound && lastRound !== r.roundId){
      if(navigator.vibrate) navigator.vibrate([40,80]);
    }
    lastRound = r.roundId;
    if(smokeCount<4){
      console.assert(bankEl && timerEl && bidBtn);
      smokeCount++;
    }
  }
  A.pollArena = pollArena;

  async function placeBid(){
    const amount = A.state?.nextBid || 0;
    const r = await fetch('/api/arena/bid',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({ uid: tg?.initDataUnsafe?.user?.id, amount })}).then(r=>r.json()).catch(()=>({ok:false}));
    if(r.ok){
      if(navigator.vibrate) navigator.vibrate(20);
      pollArena();
    } else {
      alert('Ставка не прошла');
    }
  }
  if(bidBtn) bidBtn.addEventListener('click', placeBid);
  A.placeBid = placeBid;

  setInterval(pollArena,1000);
  pollArena();
})();
