(function(){
const params=new URLSearchParams(location.search);
const uid=params.get('uid');
function formatMoney(n){return '$'+Number(n).toLocaleString('ru-RU');}
function formatVop(n){return Number(n).toLocaleString('ru-RU')+' \uD83D\uDC8E';}
function toast(msg){const t=document.createElement('div');t.textContent=msg;t.style.position='fixed';t.style.left='50%';t.style.bottom='20px';t.style.transform='translateX(-50%)';t.style.background='#333';t.style.padding='8px 12px';t.style.borderRadius='8px';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}
function haptic(kind){try{const h=window.Telegram?.WebApp?.HapticFeedback;if(!h)return;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light');}catch(e){}}
async function fetchState(kind){return await fetch(`/api/farm/${kind}/state?uid=${uid}`).then(r=>r.json()).catch(()=>({ok:false}));}
function renderUsdState(s){if(!s.ok){return;}document.getElementById('claimAmountUsd').textContent=formatMoney(s.claimable);document.getElementById('btnClaimUsd').disabled=!(s.active&&s.claimable>0);document.getElementById('rateUsd').textContent=formatMoney(s.ratePerHour).slice(1)+' $/ч';document.getElementById('fpUsd').textContent=s.fp;const pct=s.dailyCap?Math.min(100,s.claimedToday/s.dailyCap*100):0;document.getElementById('capTextUsd').textContent=`${formatMoney(s.claimedToday)} / ${formatMoney(s.dailyCap)}`;document.getElementById('capBarUsd').style.width=pct+'%';document.getElementById('usdInactiveBanner').hidden=s.active;renderUpgrades('usd',s.upgrades,document.getElementById('usdUpgrades'));renderHistory('usd',s.history,document.getElementById('usdHistory'));}
function renderVopState(s){
  if(!s.ok){return;}
  if(s.locked){
    document.getElementById('vopLocked').hidden=false;
    document.getElementById('vopContent').hidden=true;
    document.getElementById('vopUpgCard').hidden=true;
    document.getElementById('vopHistCard').hidden=true;
    return;
  }
  document.getElementById('vopLocked').hidden=true;
  document.getElementById('vopContent').hidden=false;
  document.getElementById('vopUpgCard').hidden=false;
  document.getElementById('vopHistCard').hidden=false;
  document.getElementById('claimAmountVop').textContent=formatVop(s.claimable);
  document.getElementById('btnClaimVop').disabled=s.claimable<=0;
  document.getElementById('rateVop').textContent=s.ratePerHour+' VOP/ч';
  document.getElementById('fpVop').textContent=s.fp;
  const pct=s.dailyCap?Math.min(100,s.claimedToday/s.dailyCap*100):0;
  document.getElementById('capTextVop').textContent=`${s.claimedToday} / ${s.dailyCap}`;
  document.getElementById('capBarVop').style.width=pct+'%';
  renderUpgrades('vop',s.upgrades,document.getElementById('vopUpgrades'));
  renderHistory('vop',s.history,document.getElementById('vopHistory'));
}
async function claim(kind){haptic('impact');const r=await fetch(`/api/farm/${kind}/claim`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})}).then(r=>r.json()).catch(()=>({ok:false}));if(r.ok){toast('Получено');haptic('success');load(kind);}else{toast('Ошибка');haptic('error');}}
function bindClaim(kind){const id=kind==='usd'?'btnClaimUsd':'btnClaimVop';const b=document.getElementById(id);b&&b.addEventListener('click',()=>claim(kind));}
function renderUpgrades(kind,list,box){box.innerHTML='';if(!list||!list.length){box.innerHTML='<div class="muted">Нет апгрейдов</div>';return;}list.forEach(u=>{const card=document.createElement('div');card.className='upgrade card card-compact';card.innerHTML=`<div class="title">${u.title}</div><div class="row"><span class="chip">+${u.fp} FP</span><span class="price">${formatMoney(u.cost)}</span></div><div class="muted">Треб. уровень: ${u.level}</div>`;const btn=document.createElement('button');btn.className='btn btn-primary';btn.textContent='Купить';btn.disabled=!u.canBuy;btn.addEventListener('click',async()=>{haptic('impact');const resp=await fetch(`/api/farm/${kind}/upgrade`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,upgradeId:u.id})}).then(r=>r.json()).catch(()=>({ok:false}));if(resp.ok){toast('+FP '+u.fp);haptic('success');load(kind);}else{toast('Ошибка');haptic('error');}});card.appendChild(btn);box.appendChild(card);});}
function renderHistory(kind,items,box){box.innerHTML='';if(!items||!items.length){box.innerHTML='<li class="muted">Пока пусто.</li>';return;}items.forEach(it=>{const li=document.createElement('li');if(it.type==='claim_'+kind){li.innerHTML=`<span class="muted">${it.time||''}</span><span style="color:var(--success)">+${kind==='usd'?formatMoney(it.amount):formatVop(it.amount)}</span>`;}else{li.innerHTML=`<span>${it.title||it.type}</span><span class="muted">-${kind==='usd'?formatMoney(it.amount):formatVop(it.amount)}</span>`;}box.appendChild(li);});}
async function load(kind){const s=await fetchState(kind);kind==='usd'?renderUsdState(s):renderVopState(s);}
window.initFarm=function(kind){bindClaim(kind);load(kind);setInterval(()=>load(kind),15000);};
})();
