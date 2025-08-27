(function(){
const params = new URLSearchParams(location.search);
const uid = params.get('uid');

function formatMoney(n){return '$'+Number(n).toLocaleString('ru-RU');}
function formatVop(n){return Number(n).toLocaleString('ru-RU')+' 💎';}
function toast(msg){const t=document.createElement('div');t.textContent=msg;t.style.position='fixed';t.style.left='50%';t.style.bottom='20px';t.style.transform='translateX(-50%)';t.style.background='#333';t.style.padding='8px 12px';t.style.borderRadius='8px';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}
function haptic(kind){try{const h=window.Telegram?.WebApp?.HapticFeedback;if(!h)return;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light');}catch(e){}}

async function loadFarmState(type){return await fetch(`/api/farm/${type}/state?uid=${uid}`).then(r=>r.json()).catch(()=>({ok:false}));}

async function claim(type){
  haptic('impact');
  const r=await fetch(`/api/farm/${type}/claim`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})}).then(r=>r.json()).catch(()=>({error:true}));
  if(r && r.claimed!==undefined){
    toast('Получено: '+formatVop(r.claimed));
    haptic('success');
    loadCurrent();
  }else if(r && r.code==='NOT_ENOUGH_REFERRALS'){
    toast('Нужно 30 приглашённых');
    haptic('error');
  }else if(r && r.code==='NOTHING_TO_CLAIM'){
    toast('Пока нечего забирать');
    haptic('error');
  }else{
    toast('Ошибка');
    haptic('error');
  }
}

async function buyUpgrade(type,id){haptic('impact');const r=await fetch(`/api/farm/${type}/upgrade`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,upgradeId:id})}).then(r=>r.json()).catch(()=>({ok:false}));if(r.ok){toast('OK');haptic('success');loadCurrent();}else{toast('Ошибка');haptic('error');}}

function renderUpgrades(type,list){const box=document.getElementById('upgrades');box.innerHTML='';if(!list||!list.length){box.innerHTML='<div class="muted">Нет апгрейдов</div>';return;}list.forEach(u=>{const card=document.createElement('div');card.className='upgrade card card-compact';card.innerHTML=`<div class="title">${u.title}</div><div class="row"><span class="chip">+${u.fp} FP</span><span class="price">${formatMoney(u.cost)}</span></div><div class="muted">Треб. уровень: ${u.reqLevel}</div>`;const btn=document.createElement('button');btn.className='btn btn-primary';btn.textContent='Купить';btn.disabled=!u.canBuy;btn.addEventListener('click',()=>buyUpgrade(type,u.id));card.appendChild(btn);box.appendChild(card);});}

function renderHistory(type,items){const box=document.getElementById('history');box.innerHTML='';if(!items||!items.length){box.innerHTML='<li class="muted">Пока пусто.</li>';return;}items.forEach(it=>{const li=document.createElement('li');if(it.type==='claim_'+type){li.innerHTML=`<span class="muted">${it.time||''}</span><span style="color:var(--success)">+${type==='usd'?formatMoney(it.amount):formatVop(it.amount)}</span>`;}else{li.innerHTML=`<span>${it.title||it.type}</span><span class="muted">-${type==='usd'?formatMoney(it.amount):formatVop(it.amount)}</span>`;}box.appendChild(li);});}

  function renderState(type,s){
    if(!s.ok)return;
    const claimAmount=document.getElementById('claimAmount');
    const btnClaim=document.getElementById('btnClaim');
    const rate=document.getElementById('rate');
    const fp=document.getElementById('fp');
    const capText=document.getElementById('capText');
    const capBar=document.getElementById('capBar');
    const inactive=document.getElementById('inactiveBanner');
    if(type==='usd'){
      claimAmount.textContent=formatMoney(s.claimable);
      btnClaim.disabled=!(s.active&&s.claimable>0);
      rate.textContent=formatMoney(s.ratePerHour).slice(1)+' $/ч';
      capText.textContent=`${formatMoney(s.claimedToday)} / ${formatMoney(s.dailyCap)}`;
      inactive.hidden=s.active;
    }else{
      claimAmount.textContent=formatVop(s.available);
      btnClaim.disabled=!(s.can_claim&&s.available>0);
      rate.textContent=s.speed_per_hour+' VOP/ч';
      capText.textContent=`${s.daily_progress} / ${s.daily_limit}`;
      inactive.hidden=true;
    }
    fp.textContent=s.fp;
    const pct = type==='usd'
      ? (s.dailyCap?Math.min(100,s.claimedToday/s.dailyCap*100):0)
      : (s.daily_limit?Math.min(100,s.daily_progress/s.daily_limit*100):0);
    capBar.style.width=pct+'%';
    renderUpgrades(type,s.upgrades);
    renderHistory(type,s.history);
  }

let currentType='usd';
async function loadCurrent(){const s=await loadFarmState(currentType);renderState(currentType,s);}

function switchTab(type){currentType=type;document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.type===type){b.classList.remove('btn-ghost');b.classList.add('btn-primary');}else{b.classList.remove('btn-primary');b.classList.add('btn-ghost');}});loadCurrent();}

window.initFarmPage=function(){document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.type)));document.getElementById('btnClaim').addEventListener('click',()=>claim(currentType));document.getElementById('goPlay').addEventListener('click',()=>{location.href=`/index.html?uid=${encodeURIComponent(uid)}`});switchTab('usd');setInterval(loadCurrent,15000);};
})();

