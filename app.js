const STORAGE_KEY = 'lifeStatsV2';
const OLD_STORAGE_KEY = 'lifeStatsV1';
const todayKey = () => new Date().toISOString().slice(0,10);

const defaultState = {
  playerName: 'Mumen', xp: 0,
  stats: {
    strength: { name:'Strength', value:15, icon:'⚔' },
    charisma: { name:'Charisma', value:15, icon:'✦' },
    discipline: { name:'Discipline', value:15, icon:'◆' },
    intelligence: { name:'Knowledge', value:15, icon:'⌘' },
    health: { name:'Health', value:20, icon:'♥' },
    energy: { name:'Energy', value:20, icon:'⚡' }
  },
  tasks: [
    { id: crypto.randomUUID(), name:'Complete your workout', stat:'strength', points:5, xp:15 },
    { id: crypto.randomUUID(), name:'Start one conversation', stat:'charisma', points:4, xp:10 },
    { id: crypto.randomUUID(), name:'Finish your top priority', stat:'discipline', points:5, xp:15 },
    { id: crypto.randomUUID(), name:'Read or learn for 20 minutes', stat:'intelligence', points:4, xp:10 },
    { id: crypto.randomUUID(), name:'Eat a high-protein meal', stat:'health', points:3, xp:8 }
  ],
  daily: {}, sleep: {}, history: {}, intimacy: []
};

let state = loadState();
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY));
    if(!saved) return structuredClone(defaultState);
    saved.intimacy ||= [];
    saved.stats ||= structuredClone(defaultState.stats);
    return saved;
  } catch { return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getToday(){
  const key=todayKey();
  if(!state.daily[key]) state.daily[key]={completed:[], points:0};
  return state.daily[key];
}
function addHistory(points){
  const key=todayKey();
  state.history[key]=(state.history[key]||0)+points;
}

function render(){
  const today=getToday();
  document.getElementById('playerName').textContent=state.playerName;
  document.querySelector('.avatar').textContent=(state.playerName[0]||'P').toUpperCase();
  document.getElementById('todayDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const level=Math.floor(state.xp/100)+1, current=state.xp%100;
  document.getElementById('levelValue').textContent=level;
  document.getElementById('xpText').textContent=`${current} / 100 XP`;
  document.getElementById('xpBar').style.width=`${current}%`;

  const grid=document.getElementById('statsGrid'); grid.innerHTML='';
  Object.entries(state.stats).forEach(([key,s])=>{
    const card=document.createElement('article'); card.className='stat-card';
    card.innerHTML=`<div class="stat-top"><span class="stat-name">${s.icon} ${s.name}</span><span class="stat-value">${s.value}</span></div><div class="progress"><span style="width:${Math.min(s.value,100)}%"></span></div>`;
    grid.appendChild(card);
  });

  const list=document.getElementById('tasksList'); list.innerHTML='';
  state.tasks.forEach(task=>{
    const done=today.completed.includes(task.id), stat=state.stats[task.stat];
    const row=document.createElement('div'); row.className=`task ${done?'done':''}`;
    row.innerHTML=`<button class="check-btn" aria-label="Complete task">${done?'✓':''}</button><div><div class="task-title">${task.name}</div><div class="task-reward">+${task.points} ${stat.name} • +${task.xp} XP</div></div><button class="delete-task" aria-label="Delete task">✕</button>`;
    row.querySelector('.check-btn').onclick=()=>toggleTask(task);
    row.querySelector('.delete-task').onclick=()=>deleteTask(task.id);
    list.appendChild(row);
  });
  renderSleep(); renderIntimacy(); renderHistory(); saveState();
}

function toggleTask(task){
  const today=getToday(), i=today.completed.indexOf(task.id);
  if(i===-1){
    today.completed.push(task.id); state.stats[task.stat].value=Math.min(100,state.stats[task.stat].value+task.points); state.xp+=task.xp; today.points+=task.xp; addHistory(task.xp);
  } else {
    today.completed.splice(i,1); state.stats[task.stat].value=Math.max(0,state.stats[task.stat].value-task.points); state.xp=Math.max(0,state.xp-task.xp); today.points=Math.max(0,today.points-task.xp); addHistory(-task.xp);
  }
  render();
}
function deleteTask(id){ state.tasks=state.tasks.filter(t=>t.id!==id); render(); }

function renderSleep(){
  const s=state.sleep[todayKey()]; let score=0, msg="Log last night's sleep.";
  if(s){ score=Math.round(Math.min(100,(s.hours/8)*75+s.quality*6.25)); msg=`${s.hours} hours • ${['','Poor','Okay','Good','Great'][s.quality]} quality`; }
  document.getElementById('sleepScore').textContent=`${score}%`;
  document.getElementById('sleepBar').style.width=`${score}%`;
  document.getElementById('sleepMessage').textContent=msg;
}

document.getElementById('saveSleepBtn').onclick=()=>{
  const hours=Number(document.getElementById('sleepHours').value), quality=Number(document.getElementById('sleepQuality').value);
  if(!hours || hours<0 || hours>14) return alert('Enter valid sleep hours.');
  const old=state.sleep[todayKey()];
  if(!old){ const reward=Math.round(Math.min(8,hours)); state.stats.energy.value=Math.min(100,state.stats.energy.value+reward); state.stats.health.value=Math.min(100,state.stats.health.value+Math.round(reward/2)); state.xp+=5; addHistory(5); }
  state.sleep[todayKey()]={hours,quality}; render();
};

function renderHistory(){
  const chart=document.getElementById('historyChart'); chart.innerHTML=''; let active=0;
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10), value=Math.max(0,state.history[key]||0); if(value>0) active++;
    const col=document.createElement('div'); col.className='day-column';
    col.innerHTML=`<div class="day-bar-wrap"><div class="day-bar" style="height:${Math.min(100,Math.max(4,value*2))}%" title="${value} XP"></div></div><div class="day-label">${d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)}</div>`;
    chart.appendChild(col);
  }
  document.getElementById('streakText').textContent=`${calculateStreak()} day streak`;
}
function calculateStreak(){ let streak=0; for(let i=0;i<365;i++){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); if((state.history[key]||0)>0) streak++; else if(i>0) break; } return streak; }



const intimacyMetricNames = {
  confidence: 'Confidence', connection: 'Connection', communication: 'Communication', satisfaction: 'Satisfaction'
};
const intimacyTypeInfo = {
  affection: ['Affection / closeness','♡'], date: ['Romantic date','✦'], sexual: ['Sexual activity','♥'], solo: ['Solo wellness','◉']
};

function intimacyAverages(){
  const entries=state.intimacy || [];
  const result={confidence:0,connection:0,communication:0,satisfaction:0};
  if(!entries.length) return result;
  Object.keys(result).forEach(k=> result[k]=entries.reduce((sum,e)=>sum+(Number(e[k])||0),0)/entries.length);
  return result;
}
function renderIntimacy(){
  state.intimacy ||= [];
  const av=intimacyAverages();
  const entries=state.intimacy;
  const overall=entries.length ? Math.round(Object.values(av).reduce((a,b)=>a+b,0)/4*20) : 0;
  document.getElementById('intimacyScore').textContent=`${overall}%`;
  document.getElementById('intimacyOrbValue').textContent=overall;
  document.querySelector('.intimacy-orb').style.setProperty('--score',overall);
  const status=overall>=85?'Thriving':overall>=70?'Strong':overall>=50?'Developing':entries.length?'Needs attention':'No entries yet';
  document.getElementById('intimacyStatus').textContent=status;
  document.getElementById('intimacyMessage').textContent=entries.length?`${entries.length} private entr${entries.length===1?'y':'ies'} shaping your current score.`:'Track confidence, communication, connection, and satisfaction.';
  const now=new Date(), monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('monthCount').textContent=entries.filter(e=>e.date.startsWith(monthKey)).length;
  document.getElementById('lastIntimacy').textContent=entries.length?relativeDate(entries[0].date):'—';
  const grid=document.getElementById('intimacyMetrics'); grid.innerHTML='';
  Object.entries(intimacyMetricNames).forEach(([key,name])=>{
    const pct=Math.round((av[key]||0)*20), card=document.createElement('div'); card.className='metric-card';
    card.innerHTML=`<div class="metric-label"><span>${name}</span><span>${entries.length?pct+'%':'—'}</span></div><div class="progress"><span style="width:${pct}%"></span></div>`;
    grid.appendChild(card);
  });
  const history=document.getElementById('intimacyHistory'); history.innerHTML='';
  if(!entries.length){ history.innerHTML='<p class="muted">Your recent private entries will appear here.</p>'; return; }
  entries.slice(0,5).forEach(e=>{
    const [title,icon]=intimacyTypeInfo[e.type]||['Intimate experience','♡'];
    const score=Math.round(([e.confidence,e.connection,e.communication,e.satisfaction].reduce((a,b)=>a+Number(b),0)/4)*20);
    const row=document.createElement('div'); row.className='intimacy-entry';
    row.innerHTML=`<div class="intimacy-entry-icon">${icon}</div><div><div class="intimacy-entry-title">${title}</div><div class="intimacy-entry-meta">${new Date(e.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</div>${e.note?`<div class="intimacy-entry-note">${escapeHtml(e.note)}</div>`:''}</div><div class="intimacy-entry-score">${score}</div>`;
    history.appendChild(row);
  });
}
function relativeDate(date){
  const then=new Date(date+'T12:00:00'), now=new Date();
  const days=Math.max(0,Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(then.getFullYear(),then.getMonth(),then.getDate()))/86400000));
  return days===0?'today':days===1?'yesterday':`${days}d ago`;
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
['Confidence','Connection','Communication','Satisfaction'].forEach(name=>{
  const input=document.getElementById(`intimacy${name}`), label=document.getElementById(`${name.toLowerCase()}Label`);
  input.addEventListener('input',()=>label.textContent=`${input.value}/5`);
});
document.getElementById('intimacyType').addEventListener('change',e=>{
  document.getElementById('protectedWrap').style.display=e.target.value==='sexual'?'flex':'none';
});
document.getElementById('protectedWrap').style.display='none';
document.getElementById('saveIntimacyBtn').onclick=()=>{
  const type=document.getElementById('intimacyType').value;
  const entry={
    id:crypto.randomUUID(), date:todayKey(), type,
    confidence:Number(document.getElementById('intimacyConfidence').value),
    connection:Number(document.getElementById('intimacyConnection').value),
    communication:Number(document.getElementById('intimacyCommunication').value),
    satisfaction:Number(document.getElementById('intimacySatisfaction').value),
    protected:type==='sexual'?document.getElementById('intimacyProtected').checked:null,
    note:document.getElementById('intimacyNote').value.trim()
  };
  state.intimacy.unshift(entry);
  state.xp+=8; addHistory(8);
  document.getElementById('intimacyNote').value='';
  document.getElementById('intimacyProtected').checked=false;
  document.querySelector('.log-details').open=false;
  render();
};
document.getElementById('clearIntimacyBtn').onclick=()=>{
  if(confirm('Erase every private intimacy entry? This cannot be undone.')){ state.intimacy=[]; render(); }
};

const taskDialog=document.getElementById('taskDialog');
document.getElementById('addTaskBtn').onclick=()=>{
  const sel=document.getElementById('taskStat'); sel.innerHTML=''; Object.entries(state.stats).forEach(([k,v])=>sel.add(new Option(v.name,k))); taskDialog.showModal();
};
document.getElementById('taskForm').addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  const name=document.getElementById('taskName').value.trim(); if(!name) return;
  state.tasks.push({id:crypto.randomUUID(),name,stat:document.getElementById('taskStat').value,points:Number(document.getElementById('taskPoints').value),xp:Number(document.getElementById('taskXp').value)});
  document.getElementById('taskForm').reset(); render();
});

document.getElementById('resetDayBtn').onclick=()=>{
  if(!confirm("Reset today's completed quests?")) return;
  const today=getToday();
  [...today.completed].forEach(id=>{ const t=state.tasks.find(x=>x.id===id); if(t){ state.stats[t.stat].value=Math.max(0,state.stats[t.stat].value-t.points); state.xp=Math.max(0,state.xp-t.xp); addHistory(-t.xp); }});
  state.daily[todayKey()]={completed:[],points:0}; render();
};

const settings=document.getElementById('settingsDialog');
document.getElementById('settingsBtn').onclick=()=>{ document.getElementById('nameInput').value=state.playerName; settings.showModal(); };
document.getElementById('saveNameBtn').onclick=()=>{ const n=document.getElementById('nameInput').value.trim(); if(n) state.playerName=n; render(); };
document.getElementById('clearDataBtn').onclick=()=>{ if(confirm('Erase every stat, task, and log?')){ localStorage.removeItem(STORAGE_KEY); state=structuredClone(defaultState); settings.close(); render(); }};

if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
render();
