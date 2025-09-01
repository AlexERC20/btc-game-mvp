(function(){
const params = new URLSearchParams(location.search);
const uid = params.get('uid');

const sheetBg=document.getElementById('sheetBg');
const sheetShare=document.getElementById('sheetShare');
const sheetFinding=document.getElementById('sheetFinding');
const shareStart=document.getElementById('shareStart');
const shareClose=document.getElementById('shareClose');
const findingClose=document.getElementById('findingClose');
let pollTimer=null;let stopPolling=false;
function openSheet(el){if(!el)return;sheetBg.classList.add('show');el.classList.add('open');}
function closeAllSheets(){document.querySelectorAll('.sheet.open').forEach(s=>s.classList.remove('open'));sheetBg.classList.remove('show');}
function showFindingFriendSheet(){stopPolling=false;openSheet(sheetFinding);}
function hideFindingFriendSheet(){stopPolling=true;if(pollTimer)clearTimeout(pollTimer);closeAllSheets();}
shareClose&& (shareClose.onclick=closeAllSheets);
findingClose&& (findingClose.onclick=hideFindingFriendSheet);
shareStart&& (shareStart.onclick=onIncreaseLimitClick);

function formatMoney(n){return '$'+Number(n).toLocaleString('ru-RU');}
function formatVop(n){return Number(n).toLocaleString('ru-RU')+' 💎';}
function toast(msg){const t=document.createElement('div');t.textContent=msg;t.style.position='fixed';t.style.left='50%';t.style.bottom='20px';t.style.transform='translateX(-50%)';t.style.background='#333';t.style.padding='8px 12px';t.style.borderRadius='8px';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}
function haptic(kind){try{const h=window.Telegram?.WebApp?.HapticFeedback;if(!h)return;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light');}catch(e){}}

async function loadFarmState(type){
  const url = type==='usd'
    ? `/api/farm/usd?uid=${uid}`
    : `/api/farm/${type}/state?uid=${uid}`;
  return await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-store'}}).then(r=>r.json()).catch(()=>({ok:false}));
}

let currentState=null;

async function claim(type){
  haptic('impact');
  if(type==='vop'){
    if(!currentState?.claimEligible){toast('Нужно 30 приглашённых, чтобы клеймить VOP');haptic('error');return;}
    if((currentState?.available||0)<=0){toast('Пока нечего клеймить');haptic('error');return;}
  }
  const url = type==='vop'?'/api/farm/claim_vop':`/api/farm/${type}/claim`;
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})}).then(r=>r.json()).catch(()=>({error:true}));
  if(r && r.ok){
    if(r.claimed!==undefined){
        const msg = type==='usd'?formatMoney(r.claimed):formatVop(r.claimed);
        toast('Получено: +'+msg);
      }
    haptic('success');
    localStorage.setItem('stateUpdated', Date.now());
    refreshFarmCard();
  }else if(r && r.code==='NOT_ENOUGH_REFERRALS'){
    toast('Нужно 30 приглашённых');
    haptic('error');
  }else if(r && r.code==='NOTHING_TO_CLAIM'){
    toast('Пока нечего клеймить');
    haptic('error');
  }else{
    toast('Ошибка');
    haptic('error');
  }
}

  async function buyUpgrade(type,up){
    haptic('impact');
    const r=await fetch(`/api/farm/${type}/upgrade`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({uid,upgradeId:up.id})
    }).then(r=>r.json()).catch(()=>({ok:false}));
    if(r.ok){
      toast(`Скорость +${up.fp} FP. Баланс: ${formatMoney(r.newBalance)}`);
      haptic('success');
      refreshFarmCard();
    }else if(r.error==='BALANCE'){
      toast('Не хватает денег');
      haptic('error');
    }else if(r.error==='LEVEL'){
      toast('Недостаточный уровень');
      haptic('error');
    }else{
      toast('Ошибка');
      haptic('error');
    }
  }

async function onIncreaseLimitClick(){
  try{
    const res=await fetch(`/api/referral/share-info?uid=${uid}`).then(r=>r.json());
    const{ text,url }=res;
    const shareUrl=`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    try{Telegram?.WebApp?.openTelegramLink(shareUrl);}catch(e){}
    closeAllSheets();
    showFindingFriendSheet();
    const startedAt=Date.now();
    const poll=async()=>{
      try{
        const r=await fetch('/api/referral/check-new-active-friends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})});
        const{ newActiveCount,addedUsd }=await r.json();
        if(newActiveCount>0){hideFindingFriendSheet();toast(`Лимит увеличен на $${addedUsd}`);await refreshFarmCard();return;}
        if(Date.now()-startedAt<120000 && !stopPolling){pollTimer=setTimeout(poll,3000);}else{hideFindingFriendSheet();toast('Похоже, друг ещё не зашёл. Попробуй позже.');}
      }catch(e){hideFindingFriendSheet();toast('Сеть недоступна, повтори позже.');}
    };
    pollTimer=setTimeout(poll,3000);
  }catch(e){toast('Не удалось подготовить приглашение.');}
}

  function renderUpgrades(type,list,locked=false){
    const box=document.getElementById('upgrades');
    box.innerHTML='';
    if(!list||!list.length){
      box.innerHTML='<div class="muted">Нет апгрейдов</div>';
      return;
    }
    list.forEach(u=>{
      const card=document.createElement('div');
      card.className='card upgrade-card';
      card.innerHTML=`<h3>${u.title}</h3>
        <div class="upgrade-badge chip">+${u.fp} FP</div>
        <div class="upgrade-price">${formatMoney(u.price)}</div>
        <div class="upgrade-req">Треб. уровень: ${u.reqLevel}</div>`;
      const btn=document.createElement('button');
      if(locked){
        card.style.opacity='0.6';
        card.style.pointerEvents='none';
        btn.className='btn btn-secondary';
        btn.textContent='🔒';
        btn.disabled=true;
      }else{
        btn.className='btn btn-primary';
        btn.textContent='Купить';
        btn.disabled=!u.canBuy;
        btn.addEventListener('click',()=>buyUpgrade(type,u));
      }
      card.appendChild(btn);
      box.appendChild(card);
    });
  }

    function renderState(type,s){
    if(!s.ok)return;
    currentState=s;
    const claimAmount=document.getElementById('claimAmount');
    const btnClaim=document.getElementById('btnClaim');
    const rate=document.getElementById('rate');
    const fp=document.getElementById('fp');
    const capText=document.getElementById('capText');
    const capBar=document.getElementById('capBar');
    const inactive=document.getElementById('inactiveBanner');
    const claimNote=document.getElementById('claimNote');
    const footer=document.getElementById('lockedFooter');
    const offlineLimit=document.getElementById('offlineLimit');
    const friendsBonus=document.getElementById('friendsBonus');
    const incLimitBtn=document.getElementById('incLimitBtn');

    if(type==='usd'){
      const claimable = s.available_to_claim ?? s.claimable;
      const ratePerHour = s.speed_usd_per_hour ?? s.speed_per_hour ?? s.ratePerHour;
      const used = s.used_usd_today ?? s.limit_today_used ?? s.claimedToday;
      const total = s.cap_usd_effective ?? s.limit_today_total ?? s.dailyCap;
      claimAmount.textContent=formatMoney(claimable);
      btnClaim.disabled=!(s.active&&claimable>0);
      btnClaim.classList.add('btn-success');
      btnClaim.classList.remove('btn-secondary');
      claimNote.textContent='';
      rate.textContent=formatMoney(ratePerHour).slice(1)+' $/ч';
      capText.textContent=`${formatMoney(used)} / ${formatMoney(total)}`;
      inactive.hidden=s.active;
      footer.hidden=true;
      offlineLimit.textContent='Оффлайн-лимит: до 12 ч';
      fp.textContent=s.fp;
      const pct = total?Math.min(100,used/total*100):0;
      capBar.style.width=pct+'%';
      const n = s.active_friends_today||0;
      const bpf = s.friend_bonus_per_friend_usd || s.bonus_per_friend || 0;
      const bonus = bpf*n;
      let bonusText = `Активные друзья сегодня: ${n}  •  +$${bpf} за каждого`;
      if(n>0) bonusText += `  <span style="color:var(--success)">+$${bonus} к лимиту</span>`;
      friendsBonus.innerHTML = bonusText;
      incLimitBtn.onclick=(e)=>{e.preventDefault();openSheet(sheetShare);};
      renderUpgrades(type,s.upgrades);
      return;
    }

    // VOP
    const unlocked = s.isUnlocked;
    claimAmount.textContent=formatVop(unlocked?s.available:0);
    btnClaim.disabled=!unlocked || !s.claimEligible || (s.available||0)<=0;
    btnClaim.classList.toggle('btn-success', unlocked);
    btnClaim.classList.toggle('btn-secondary', !unlocked);
    btnClaim.title='';
    rate.textContent=unlocked?(s.speedPerHour+' VOP/ч'):'— VOP/ч';
    fp.textContent=unlocked? s.fp : '—';
    capText.textContent=unlocked?`${s.limitToday.used} / ${s.limitToday.max}`:'0 / 0';
    inactive.hidden=true;
    offlineLimit.textContent=`Оффлайн-лимит: до ${s.offlineLimit||0} ч`;
    const pct = unlocked && s.limitToday.max?Math.min(100,s.limitToday.used/s.limitToday.max*100):0;
    capBar.style.width=pct+'%';
    renderUpgrades(type,s.upgrades,!unlocked);

    if(!unlocked){
      claimNote.textContent='';
      footer.hidden=false;
      footer.textContent=`Доступ к фарму VOP откроется с 25 уровня. Ваш уровень: ${s.level}. Прокачивайте уровень, чтобы открыть доступ.`;
    }else{
      footer.hidden=true;
      if(!s.claimEligible){
        claimNote.textContent=`Нужно 30 приглашённых для CLAIM (сейчас: ${s.referrals}/30)`;
      }else{
        claimNote.textContent='';
      }
    }
  }

let currentType='usd';
async function refreshFarmCard(){const s=await loadFarmState(currentType);renderState(currentType,s);}

function switchTab(type){currentType=type;document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.type===type){b.classList.remove('btn-ghost');b.classList.add('btn-primary');}else{b.classList.remove('btn-primary');b.classList.add('btn-ghost');}});refreshFarmCard();}

window.initFarmPage=function(){document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.type)));document.getElementById('btnClaim').addEventListener('click',()=>claim(currentType));document.getElementById('goPlay').addEventListener('click',()=>{location.href=uid?`/?uid=${encodeURIComponent(uid)}`:'/';});switchTab('usd');setInterval(refreshFarmCard,15000);};
})();

