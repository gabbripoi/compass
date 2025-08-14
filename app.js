// Data model
const VALUES = ["Amour","Primitivité","Humilité","Frugalité","Intégrité","Courage","Exploration","Équilibre","Liberté","Présence"];
const DIRECTIONS = ["M'attacher","Protéger","Me dépasser","Transcender"];
const SENSE = ["Soi","Clan","Autres","Nature"];
const PURPOSE = "Vivre pleinement et préserver la vie";

const $ = (sel)=>document.querySelector(sel);
const $$= (sel)=>Array.from(document.querySelectorAll(sel));

const DB_KEY = 'compassDB.v1';
let db = JSON.parse(localStorage.getItem(DB_KEY) || '{"logs":[],"challenges":[]}'); // {logs:[{ts, values[], directions[], sense[], note, actions:[], honor:int}]}

// Utils
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); render(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function sum(a){ return a.reduce((x,y)=>x+y,0); }
function uniq(arr){ return Array.from(new Set(arr)); }

// Integrity score simple heuristic: weight of values/directions/sense selected + honor self-score (0-5)
function computeDailyScore(log){
  if(!log) return 0;
  const base = (log.values?.length||0) + (log.directions?.length||0) + (log.sense?.length||0);
  const honor = Number(log.honor||0);
  // Normalize roughly to 0-100
  const raw = base*8 + honor*12;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// Navigation
let TAB = 'home';
function setTab(t){ TAB=t; render(); }

// Render
function renderHeader(){
  const last = db.logs.filter(l=>l.date===todayISO()).slice(-1)[0];
  const score = computeDailyScore(last);
  $('.score').textContent = isNaN(score)?'—':score;
}

function renderHome(){
  const home = $('#home'); home.innerHTML='';
  home.append(sectionPyramid());

  home.append(sectionQuickCheckIn());
  
  // KPIs
  const k = document.createElement('div'); k.className='card';
  k.innerHTML = `<div class="section-title">Aperçu</div>
    <div class="kpis">
      <div class="kpi"><div class="label">Jours alignés (30j)</div><div class="value">${daysAligned(30)}</div></div>
      <div class="kpi"><div class="label">Valeur la + vécue</div><div class="value">${topValue()||'—'}</div></div>
      <div class="kpi"><div class="label">Direction la + active</div><div class="value">${topDirection()||'—'}</div></div>
    </div>`;
  home.append(k);
}

function sectionPyramid(){
  const c = document.createElement('div'); c.className='card';
  c.innerHTML = `<div class="section-title">Ta boussole</div>
    <div class="pyramid">
      <div class="row">☀️ ${PURPOSE}</div>
      <div class="row">SENS — ${SENSE.join(' | ')}</div>
      <div class="row">DIRECTIONS — ${DIRECTIONS.join(' | ')}</div>
      <div class="row">ACTIONS — ${VALUES.join(' | ')}</div>
      <div class="row">VALEURS</div>
    </div>
    <div class="small">Tape la carte ci-dessus pour te rappeler l'intention du jour.</div>`;
  return c;
}

function sectionQuickCheckIn(){
  const c = document.createElement('div'); c.className='card';
  c.innerHTML = `<div class="section-title">Check-in du jour</div>
    <div class="small">Sélectionne ce que tu as vécu aujourd'hui. Ajoute une note si tu veux.</div>
    <div class="tags" id="v-tags"></div>
    <div class="tags" id="d-tags"></div>
    <div class="tags" id="s-tags"></div>
    <textarea id="note" rows="3" placeholder="Notes brèves…"></textarea>
    <label class="small">Score d'honneur (0-5)</label>
    <input id="honor" type="number" min="0" max="5" value="3"/>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn primary" id="save-log">Enregistrer</button>
      <button class="btn ghost" id="today-logs">Voir les entrées</button>
    </div>`;
  // build tags
  const v = c.querySelector('#v-tags'); v.append(tagGroup("Valeurs", VALUES));
  const d = c.querySelector('#d-tags'); d.append(tagGroup("Directions", DIRECTIONS));
  const s = c.querySelector('#s-tags'); s.append(tagGroup("Sens", SENSE));
  // handlers
  c.querySelector('#save-log').onclick = ()=>{
    const selected = $$('.tag.active').map(t=>t.dataset.name);
    const chosenValues = selected.filter(x=>VALUES.includes(x));
    const chosenDirections = selected.filter(x=>DIRECTIONS.includes(x));
    const chosenSense = selected.filter(x=>SENSE.includes(x));
    const note = c.querySelector('#note').value.trim();
    const honor = Number(c.querySelector('#honor').value||0);
    db.logs.push({date: todayISO(), ts: Date.now(), values:chosenValues, directions:chosenDirections, sense:chosenSense, note, honor});
    save();
  };
  c.querySelector('#today-logs').onclick = ()=>{ setTab('logs'); };
  return c;
}

function tagGroup(title, arr){
  const wrap = document.createElement('div');
  wrap.className='list';
  const row = document.createElement('div');
  row.className='tags';
  arr.forEach(name=>{
    const el = document.createElement('button');
    el.className='tag'; el.textContent = name; el.dataset.name=name;
    el.onclick = ()=> el.classList.toggle('active');
    row.appendChild(el);
  });
  const label = document.createElement('div'); label.className='small'; label.textContent = title;
  wrap.append(row, label);
  return wrap;
}

function renderLogs(){
  const box = $('#logs'); box.innerHTML='';
  const list = document.createElement('div'); list.className='list';
  db.logs.slice().reverse().forEach(l=>{
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `
      <div class="date">${new Date(l.ts).toLocaleString()}</div>
      <div><b>Valeurs:</b> ${l.values.join(', ')||'—'}</div>
      <div><b>Directions:</b> ${l.directions.join(', ')||'—'}</div>
      <div><b>Sens:</b> ${l.sense.join(', ')||'—'}</div>
      <div><b>Honneur:</b> ${l.honor??0}/5</div>
      ${l.note?`<div class="small">${l.note}</div>`:''}
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn ghost" data-del="${l.ts}">Supprimer</button>
      </div>`;
    list.append(item);
  });
  box.append(list);
  $$('#logs [data-del]').forEach(btn=> btn.onclick = ()=>{
    db.logs = db.logs.filter(x=> String(x.ts) !== String(btn.dataset.del));
    save();
  });
}

function renderStats(){
  const box = $('#stats'); box.innerHTML='';
  const valuesCount = Object.fromEntries(VALUES.map(v=>[v,0]));
  const directionsCount = Object.fromEntries(DIRECTIONS.map(v=>[v,0]));
  const senseCount = Object.fromEntries(SENSE.map(v=>[v,0]));
  db.logs.forEach(l=>{
    l.values?.forEach(v=> valuesCount[v]++);
    l.directions?.forEach(v=> directionsCount[v]++);
    l.sense?.forEach(v=> senseCount[v]++);
  });
  const card = (title, obj)=>{
    const c=document.createElement('div'); c.className='card';
    c.innerHTML = `<div class="section-title">${title}</div>`;
    const wrap = document.createElement('div'); wrap.className='tags';
    Object.entries(obj).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
      const span=document.createElement('span'); span.className='badge'; span.textContent=`${k} · ${v}`;
      wrap.append(span);
    });
    c.append(wrap);
    return c;
  };
  box.append(card("Fréquence des valeurs", valuesCount));
  box.append(card("Fréquence des directions", directionsCount));
  box.append(card("Fréquence des sens", senseCount));

  // Integrity streak
  const aligned = daysAligned(30);
  const c = document.createElement('div'); c.className='card';
  c.innerHTML = `<div class="section-title">Cohérence</div>
    <div class="kpis">
      <div class="kpi"><div class="label">Jours alignés (30j)</div><div class="value">${aligned}</div></div>
      <div class="kpi"><div class="label">Score moyen (7j)</div><div class="value">${avgScore(7)}</div></div>
    </div>`;
  box.append(c);
}

function daysAligned(days){
  const cutoff = Date.now()-days*24*3600*1000;
  return db.logs.filter(l=> l.ts>=cutoff && computeDailyScore(l)>=50).length;
}
function avgScore(days){
  const cutoff = Date.now()-days*24*3600*1000;
  const scores = db.logs.filter(l=> l.ts>=cutoff).map(computeDailyScore);
  if(!scores.length) return '—';
  return Math.round(sum(scores)/scores.length);
}

function topValue(){
  const counter={}; VALUES.forEach(v=>counter[v]=0);
  db.logs.forEach(l=> l.values?.forEach(v=>counter[v]++));
  const top = Object.entries(counter).sort((a,b)=>b[1]-a[1])[0];
  return top && top[1]>0 ? top[0] : null;
}
function topDirection(){
  const counter={}; DIRECTIONS.forEach(v=>counter[v]=0);
  db.logs.forEach(l=> l.directions?.forEach(v=>counter[v]++));
  const top = Object.entries(counter).sort((a,b)=>b[1]-a[1])[0];
  return top && top[1]>0 ? top[0] : null;
}

function renderChallenges(){
  const box = $('#challenges'); box.innerHTML='';
  // Create suggested challenges for low-frequency items
  const counts = {}; VALUES.concat(DIRECTIONS).forEach(x=>counts[x]=0);
  db.logs.forEach(l=>{ l.values?.forEach(v=>counts[v]++); l.directions?.forEach(v=>counts[v]++); });
  const low = Object.entries(counts).sort((a,b)=>a[1]-b[1]).slice(0,3).map(x=>x[0]);
  const suggestions = low.map(x=> makeChallengeFor(x));

  const list = document.createElement('div'); list.className='list';
  suggestions.forEach(ch=>{
    const item=document.createElement('div'); item.className='item';
    item.innerHTML = `<b>${ch.title}</b><div class="small">${ch.desc}</div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn primary">Ajouter</button>
    </div>`;
    item.querySelector('button').onclick = ()=>{ db.challenges.push({...ch, created: Date.now(), done:false}); save(); };
    list.append(item);
  });
  box.append(list);

  // Active challenges
  if(db.challenges.length){
    const act = document.createElement('div'); act.className='card';
    act.innerHTML = `<div class="section-title">Défis actifs</div>`;
    const l = document.createElement('div'); l.className='list';
    db.challenges.slice().reverse().forEach((c,i)=>{
      const it=document.createElement('div'); it.className='item';
      it.innerHTML = `<b>${c.title}</b> <span class="small">(${new Date(c.created).toLocaleDateString()})</span>
      <div class="small">${c.desc}</div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" data-done="${i}">${c.done?'Terminé':'Marquer terminé'}</button>
        <button class="btn ghost" data-del="${i}">Supprimer</button>
      </div>`;
      l.append(it);
    });
    act.append(l);
    box.append(act);
    $$('#challenges [data-done]').forEach(b=> b.onclick=()=>{ const i=Number(b.dataset.done); db.challenges[i].done=!db.challenges[i].done; save(); });
    $$('#challenges [data-del]').forEach(b=> b.onclick=()=>{ const i=Number(b.dataset.del); db.challenges.splice(i,1); save(); });
  }
}

function makeChallengeFor(tag){
  const bank = {
    "Frugalité":"Passe une journée sans achat non essentiel. Note ce que tu ressens.",
    "Primitivité":"Fais une marche pieds nus (si sécuritaire) et cuisine un repas très simple.",
    "Présence":"Fais 15 minutes de respiration + marche sans téléphone.",
    "Intégrité":"Choisis une petite promesse aujourd'hui et tiens-la (ex: envoyer un message prévu).",
    "Humilité":"Demande un feedback honnête à quelqu'un et remercie-le.",
    "Courage":"Fais une action que tu évites par peur depuis 1 semaine.",
    "Exploration":"Découvre un nouveau lieu de nature à 30 minutes de chez toi.",
    "Équilibre":"Bloque 30 minutes de pause sans écran.",
    "Liberté":"Désactive une notification non essentielle pour 48h.",
    "Amour":"Fais un geste gratuit pour quelqu'un de ton clan.",
    "M'attacher":"Planifie un moment de qualité avec le clan.",
    "Protéger":"Identifie et élimine un micro-gaspillage d'énergie ou d'argent.",
    "Me dépasser":"Choisis une micro-habitude de 5 minutes et fais-la 5 jours.",
    "Transcender":"Médite 10 minutes sur l'unité et écris 3 lignes de gratitude."
  };
  return { title: `Activer: ${tag}`, desc: bank[tag] || "Crée une action concrète pour vivre ce principe aujourd'hui." };
}

// Init UI
function render(){
  renderHeader();
  if(TAB==='home'){ $('#home').style.display='block'; $('#logs').style.display='none'; $('#stats').style.display='none'; $('#challenges').style.display='none'; renderHome(); }
  if(TAB==='logs'){ $('#home').style.display='none'; $('#logs').style.display='block'; $('#stats').style.display='none'; $('#challenges').style.display='none'; renderLogs(); }
  if(TAB==='stats'){ $('#home').style.display='none'; $('#logs').style.display='none'; $('#stats').style.display='block'; $('#challenges').style.display='none'; renderStats(); }
  if(TAB==='challenges'){ $('#home').style.display='none'; $('#logs').style.display='none'; $('#stats').style.display='none'; $('#challenges').style.display='block'; renderChallenges(); }
}
window.addEventListener('load', ()=>{
  // PWA registration
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }
  render();
  $$('#nav button').forEach(btn=> btn.onclick = ()=>{
    $$('#nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    setTab(btn.dataset.tab);
  });
});