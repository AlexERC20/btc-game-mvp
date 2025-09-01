(function(){
const params = new URLSearchParams(location.search);
const uid = params.get('uid');

function formatMoney(n){return '$'+Number(n).toLocaleString('ru-RU');}
function formatVop(n){return Number(n).toLocaleString('ru-RU')+' 💎';}
function toast(msg){const t=document.createElement('div');t.textContent=msg;t.style.position='fixed';t.style.left='50%';t.style.bottom='20px';t.style.transform='translateX(-50%)';t.style.background='#333';t.style.padding='8px 12px';t.style.borderRadius='8px';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}
function haptic(kind){try{const h=window.Telegram?.WebApp?.HapticFeedback;if(!h)return;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light');}catch(e){}}

async function loadFarmState(type){return await fetch(`/api/farm/${type}/state?uid=${uid}`).then(r=>r.json()).catch(()=>({ok:false}));}

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
    loadCurrent();
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
      loadCurrent();
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

    if(type==='usd'){
      claimAmount.textContent=formatMoney(s.claimable);
      btnClaim.disabled=!(s.active&&s.claimable>0);
      btnClaim.classList.add('btn-success');
      btnClaim.classList.remove('btn-secondary');
      claimNote.textContent='';
      rate.textContent=formatMoney(s.ratePerHour).slice(1)+' $/ч';
      capText.textContent=`${formatMoney(s.claimedToday)} / ${formatMoney(s.dailyCap)}`;
      inactive.hidden=s.active;
      footer.hidden=true;
      offlineLimit.textContent='Оффлайн-лимит: до 12 ч';
      fp.textContent=s.fp;
      const pct = s.dailyCap?Math.min(100,s.claimedToday/s.dailyCap*100):0;
      capBar.style.width=pct+'%';
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
async function loadCurrent(){const s=await loadFarmState(currentType);renderState(currentType,s);}

function switchTab(type){currentType=type;document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.type===type){b.classList.remove('btn-ghost');b.classList.add('btn-primary');}else{b.classList.remove('btn-primary');b.classList.add('btn-ghost');}});loadCurrent();}

window.initFarmPage=function(){document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.type)));document.getElementById('btnClaim').addEventListener('click',()=>claim(currentType));document.getElementById('goPlay').addEventListener('click',()=>{location.href=uid?`/?uid=${encodeURIComponent(uid)}`:'/';});switchTab('usd');setInterval(loadCurrent,15000);};
})();

