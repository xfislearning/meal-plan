/* ===== Constants ===== */
const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri'];
const WEEKEND_DAYS = ['Sat','Sun'];
const FULL_DAY = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};

const DEFAULT_LUNCH = ['Premade Pizza','Chicken Salad','Frozen Chicken','Leftovers','Sandwiches','Soup','Salad Bar','Eat Out'];
const DEFAULT_DINNER = ['Tacos','Stir Fry','Pasta Bake','Grilled Chicken','Sheet Pan Veggies','Soup','Breakfast for Dinner','Eat Out'];
const DEFAULT_PREP = ['Cook Chicken Batch','Chop Vegetables','Cook Rice or Grains','Prep Sauces','Marinate Meat','Wash & Prep Produce','Grocery Shopping','Bake Bread'];

function iconFor(meal){
  const m = meal.toLowerCase();
  if(m.includes('pizza')) return '🍕';
  if(m.includes('chicken')) return '🍗';
  if(m.includes('salad')) return '🥗';
  if(m.includes('soup')) return '🍲';
  if(m.includes('sandwich')) return '🥪';
  if(m.includes('leftover')) return '♻️';
  if(m.includes('eat out') || m.includes('restaurant') || m.includes('takeout')) return '🍽️';
  if(m.includes('pasta') || m.includes('noodle')) return '🍝';
  if(m.includes('rice') || m.includes('grain')) return '🍚';
  if(m.includes('taco') || m.includes('burrito')) return '🌮';
  if(m.includes('stir fry') || m.includes('stir-fry')) return '🥘';
  if(m.includes('chop') || m.includes('veg') || m.includes('produce')) return '🥦';
  if(m.includes('breakfast') || m.includes('egg')) return '🍳';
  if(m.includes('grocery')) return '🛒';
  if(m.includes('sauce')) return '🧂';
  if(m.includes('bread')) return '🍞';
  if(m.includes('marinate')) return '🥩';
  return '🍴';
}

/* ===== Date utils ===== */
function getMonday(d){
  d = new Date(d); const day = d.getDay();
  const diff = (day===0?-6:1)-day;
  d.setDate(d.getDate()+diff); d.setHours(0,0,0,0);
  return d;
}
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function fmtISO(d){ return d.toISOString().slice(0,10); }
function fmtShort(d){ return d.toLocaleDateString(undefined,{month:'short', day:'numeric'}); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function sameDay(a,b){ return fmtISO(a)===fmtISO(b); }

const TODAY = new Date(); TODAY.setHours(0,0,0,0);
const THIS_MONDAY = getMonday(TODAY);
const NEXT_MONDAY = addDays(THIS_MONDAY, 7);

/* ===== Mobile nav dropdown (top-right hamburger) ===== */
(function initNavToggle(){
  const toggle = document.getElementById('navToggle');
  const dropdown = document.getElementById('navDropdown');
  if(!toggle || !dropdown) return;
  toggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  dropdown.addEventListener('click', e=> e.stopPropagation());
  document.addEventListener('click', ()=> dropdown.classList.remove('open'));
})();

/* ===== Storage: uses window.storage when previewed inside Claude,
   falls back to localStorage when opened/hosted as a normal page ===== */
async function storageGet(key){
  if(window.storage){
    try{ const r = await window.storage.get(key); return (r && r.value != null) ? r.value : null; }
    catch(e){ return null; }
  }
  try{ return localStorage.getItem(key); }catch(e){ return null; }
}
async function storageSet(key, value){
  if(window.storage){
    try{ await window.storage.set(key, value); return true; }catch(e){ return false; }
  }
  try{ localStorage.setItem(key, value); return true; }catch(e){ return false; }
}
async function storageList(prefix){
  if(window.storage){
    try{ const r = await window.storage.list(prefix); return (r && r.keys) ? r.keys : []; }
    catch(e){ return []; }
  }
  try{ return Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix)); }
  catch(e){ return []; }
}

/* ===== Data helpers ===== */
function weekKeyFor(monday){ return 'week:' + fmtISO(monday); }
function defaultEntry(day){ return WEEKEND_DAYS.includes(day) ? {prep:[]} : {lunch:'', dinner:''}; }

async function loadBank(key, fallbackKey, defaults){
  const raw = await storageGet(key);
  if(raw){ try{ return JSON.parse(raw); }catch(e){} }
  if(fallbackKey){
    const rawFb = await storageGet(fallbackKey);
    if(rawFb){ try{ return JSON.parse(rawFb); }catch(e){} }
  }
  return defaults.slice();
}
async function saveBank(key, list){ await storageSet(key, JSON.stringify(list)); await touchUpdated(); }

async function loadPlan(monday){
  const raw = await storageGet(weekKeyFor(monday));
  if(!raw) return {};
  let parsed;
  try{ parsed = JSON.parse(raw); }catch(e){ return {}; }
  const migrated = {};
  Object.keys(parsed).forEach(day=>{
    const r = parsed[day];
    if(WEEKEND_DAYS.includes(day)){
      migrated[day] = (r && Array.isArray(r.prep)) ? {prep:r.prep.slice()} : {prep:[]};
    } else {
      migrated[day] = (typeof r === 'string')
        ? {lunch:r, dinner:''}
        : {lunch:(r&&r.lunch)||'', dinner:(r&&r.dinner)||''};
    }
  });
  return migrated;
}
async function savePlan(monday, plan){ await storageSet(weekKeyFor(monday), JSON.stringify(plan)); await touchUpdated(); }

/* Currently-selected week, shared across Meal Plan and Board View pages */
async function loadSelectedMonday(){
  const raw = await storageGet('selected-monday');
  if(raw){
    const d = new Date(raw + 'T00:00:00');
    if(!isNaN(d)) return getMonday(d);
  }
  return NEXT_MONDAY; // default: plan for next week
}
async function saveSelectedMonday(monday){ await storageSet('selected-monday', fmtISO(monday)); }

/* ===== Shared cell renderers (Meal Plan + Board View) ===== */
function slotCellHtml(meal, emptyText){
  if(!meal) return `<div class="empty-slot">${emptyText || 'tap to add'}</div>`;
  return `<div class="slot-fill"><span class="name-wrap"><span>${iconFor(meal)}</span><span>${escapeHtml(meal)}</span></span><button class="slot-x">✕</button></div>`;
}
function prepCellHtml(prepList, emptyText){
  if(!prepList || prepList.length===0) return `<div class="empty-slot">${emptyText || 'tap to add a prep task'}</div>`;
  return `<div class="chips">${prepList.map((t,i)=>`<span class="chip">${iconFor(t)} ${escapeHtml(t)} <button class="slot-x" data-idx="${i}">✕</button></span>`).join('')}</div>`;
}

/* ===== Reusable week switcher (Meal Plan + Board View) =====
   Expects these elements in the page: #prevWeek #nextWeek #weekLabelBtn
   #weekLabelText #weekTag #calendarPopover #calGrid #calMonthLabel
   #calPrevMonth #calNextMonth #quickThis #quickNext */
function initWeekSwitcher(selectedMonday, onChange){
  let calendarViewMonth = new Date(selectedMonday.getFullYear(), selectedMonday.getMonth(), 1);

  function renderLabel(){
    document.getElementById('weekLabelText').textContent =
      `Week of ${fmtShort(selectedMonday)} – ${fmtShort(addDays(selectedMonday,6))}`;
    const tag = document.getElementById('weekTag');
    if(sameDay(selectedMonday, THIS_MONDAY)){ tag.textContent = 'This week'; tag.style.display='inline-block'; }
    else if(sameDay(selectedMonday, NEXT_MONDAY)){ tag.textContent = 'Next week'; tag.style.display='inline-block'; }
    else { tag.style.display='none'; }
  }
  function renderCalendar(){
    document.getElementById('calMonthLabel').textContent =
      calendarViewMonth.toLocaleDateString(undefined,{month:'long', year:'numeric'});
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d=>{
      const el = document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el);
    });
    const firstOfMonth = new Date(calendarViewMonth.getFullYear(), calendarViewMonth.getMonth(), 1);
    const gridStart = getMonday(firstOfMonth);
    const weekEnd = addDays(selectedMonday, 6);
    for(let i=0;i<42;i++){
      const cellDate = addDays(gridStart, i);
      const btn = document.createElement('button');
      btn.className = 'cal-cell';
      if(cellDate.getMonth() !== calendarViewMonth.getMonth()) btn.classList.add('dim');
      if(cellDate >= selectedMonday && cellDate <= weekEnd) btn.classList.add('in-week');
      if(sameDay(cellDate, TODAY)) btn.classList.add('today');
      btn.textContent = cellDate.getDate();
      btn.onclick = ()=> switchTo(getMonday(cellDate));
      grid.appendChild(btn);
    }
    document.getElementById('quickThis').classList.toggle('current', sameDay(selectedMonday, THIS_MONDAY));
    document.getElementById('quickNext').classList.toggle('current', sameDay(selectedMonday, NEXT_MONDAY));
  }
  function openCal(){ document.getElementById('calendarPopover').classList.add('open'); renderCalendar(); }
  function closeCal(){ document.getElementById('calendarPopover').classList.remove('open'); }

  async function switchTo(newMonday){
    selectedMonday = newMonday;
    calendarViewMonth = new Date(selectedMonday.getFullYear(), selectedMonday.getMonth(), 1);
    await saveSelectedMonday(selectedMonday);
    closeCal();
    renderLabel();
    await onChange(selectedMonday);
  }

  document.getElementById('weekLabelBtn').onclick = (e)=>{
    e.stopPropagation();
    document.getElementById('calendarPopover').classList.contains('open') ? closeCal() : openCal();
  };
  document.getElementById('prevWeek').onclick = ()=> switchTo(addDays(selectedMonday, -7));
  document.getElementById('nextWeek').onclick = ()=> switchTo(addDays(selectedMonday, 7));
  document.getElementById('quickThis').onclick = ()=> switchTo(THIS_MONDAY);
  document.getElementById('quickNext').onclick = ()=> switchTo(NEXT_MONDAY);
  document.getElementById('calPrevMonth').onclick = ()=>{
    calendarViewMonth = new Date(calendarViewMonth.getFullYear(), calendarViewMonth.getMonth()-1, 1);
    renderCalendar();
  };
  document.getElementById('calNextMonth').onclick = ()=>{
    calendarViewMonth = new Date(calendarViewMonth.getFullYear(), calendarViewMonth.getMonth()+1, 1);
    renderCalendar();
  };
  document.getElementById('calendarPopover').addEventListener('click', e=> e.stopPropagation());
  document.addEventListener('click', closeCal);

  renderLabel();

  return { getSelectedMonday: ()=> selectedMonday };
}

/* =====================================================================
   Google Drive auto-sync (optional)
   ---------------------------------------------------------------------
   One-time setup, done once by whoever owns the Google account this
   should sync to:
     1. Google Cloud Console → APIs & Services → Credentials →
        "Create Credentials" → OAuth client ID → Application type "Web
        application". Add the URL(s) you host this site at (e.g. your
        GitHub Pages URL) under "Authorized JavaScript origins".
     2. In the same project, enable the "Google Drive API"
        (APIs & Services → Library).
     3. Paste the Client ID below.
   Until GSYNC_CLIENT_ID is filled in, the app just runs in local-only
   mode — everything else on the site works exactly the same.

   Once configured: sign in ONE time via the button in the top bar. After
   that, the browser's Google session is reused silently on every future
   visit (prompt:"" below = no popup, no re-login) — edits auto-push to
   Drive ~1.5s after you stop typing/clicking, and opening any page pulls
   down anything newer that was saved from another device.
   ===================================================================== */
const GSYNC_CLIENT_ID = "PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com";
const GSYNC_FILE = "family-meal-plan-data.json";
const GSYNC_SCOPES = "openid email profile https://www.googleapis.com/auth/drive.file";

function gsyncConfigured(){ return GSYNC_CLIENT_ID.indexOf("PASTE_") !== 0; }

let gUser = null, tokenClient = null, accessToken = null, tokenExp = 0,
    driveFileId = null, saveTimer = null, pendingPush = false, onRemoteRefreshed = null;

async function touchUpdated(){
  await storageSet('local-updated-at', String(Date.now()));
  queuePush();
}
async function collectAllData(){
  const weekKeys = await storageList('week:');
  const weeks = {};
  for(const k of weekKeys){ const v = await storageGet(k); if(v!=null) weeks[k]=v; }
  const updatedAt = parseInt((await storageGet('local-updated-at'))||'0', 10);
  return {
    updatedAt,
    banks:{
      lunch: await storageGet('meal-bank-lunch'),
      dinner: await storageGet('meal-bank-dinner'),
      prep: await storageGet('meal-bank-prep')
    },
    weeks
  };
}
async function applyAllData(remote){
  if(remote.banks){
    if(remote.banks.lunch != null) await storageSet('meal-bank-lunch', remote.banks.lunch);
    if(remote.banks.dinner != null) await storageSet('meal-bank-dinner', remote.banks.dinner);
    if(remote.banks.prep != null) await storageSet('meal-bank-prep', remote.banks.prep);
  }
  if(remote.weeks) for(const k in remote.weeks) await storageSet(k, remote.weeks[k]);
  await storageSet('local-updated-at', String(remote.updatedAt || Date.now()));
}

function gsyncSetState(state, msg){
  const el = document.getElementById('syncState');
  if(!el) return;
  el.dataset.state = state;
  el.textContent = msg;
}
function gsyncRenderUser(){
  const on = !!gUser;
  const signinBtn = document.getElementById('signinBtn');
  const userChip = document.getElementById('userChip');
  if(signinBtn) signinBtn.hidden = on;
  if(userChip) userChip.hidden = !on;
  if(on){
    const nameEl = document.getElementById('userName');
    const picEl = document.getElementById('userPic');
    if(nameEl) nameEl.textContent = gUser.name;
    if(picEl) picEl.src = gUser.pic || '';
  }
}
async function gfetch(url, opts={}){
  const r = await fetch(url, {...opts, headers:{...(opts.headers||{}), Authorization:'Bearer '+accessToken}});
  if(!r.ok){
    let msg = 'HTTP '+r.status;
    try{ const j = await r.json(); if(j.error && j.error.message) msg += ' — '+j.error.message; }catch(e){}
    throw new Error(msg);
  }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('json') ? r.json() : r.text();
}
function gsyncFail(e){
  console.error('Drive sync error:', e);
  gsyncSetState('err', 'Sync error');
}

function initGIS(){
  if(typeof google === 'undefined' || !google.accounts || !gsyncConfigured()) return;
  if(tokenClient) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GSYNC_CLIENT_ID, scope: GSYNC_SCOPES, callback: onToken,
    error_callback: ()=>{ if(gUser) gsyncSetState('err','Sync paused'); }
  });
  if(gUser){
    gsyncSetState('sync','Connecting…');
    try{ tokenClient.requestAccessToken({prompt:''}); }catch(e){ gsyncSetState('err','Sync paused'); }
  }
}
let gisRetries = 0;
function loadGIS(){
  if(typeof google !== 'undefined' && google.accounts){ initGIS(); return; }
  if(gisRetries >= 6) return;
  gisRetries++;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true; s.defer = true;
  s.onload = initGIS;
  s.onerror = ()=> setTimeout(loadGIS, Math.min(3000*gisRetries, 20000));
  document.head.appendChild(s);
}

async function onToken(resp){
  if(resp.error){ if(gUser) gsyncSetState('err','Sync paused'); return; }
  accessToken = resp.access_token;
  tokenExp = Date.now() + ((resp.expires_in||3600)-60)*1000;
  if(google.accounts.oauth2.hasGrantedAllScopes &&
     !google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/drive.file')){
    gsyncSetState('err','Drive permission needed');
    return;
  }
  try{
    if(!gUser){
      const u = await gfetch('https://www.googleapis.com/oauth2/v3/userinfo');
      gUser = { name: u.name || u.email, email: u.email, pic: u.picture || '' };
      localStorage.setItem('gsync.user', JSON.stringify(gUser));
    }
    gsyncRenderUser();
    if(pendingPush){ pendingPush = false; await drivePush(); }
    else await driveSync();
  }catch(e){ gsyncFail(e); }
}

async function driveFind(){
  const q = encodeURIComponent("name='"+GSYNC_FILE+"' and trashed=false");
  const d = await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,modifiedTime)&orderBy=modifiedTime desc');
  return (d.files && d.files[0]) ? d.files[0].id : null;
}
async function driveSync(){
  gsyncSetState('sync','Syncing…');
  driveFileId = await driveFind();
  if(!driveFileId){
    const meta = await gfetch('https://www.googleapis.com/drive/v3/files', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name:GSYNC_FILE, mimeType:'application/json'})
    });
    driveFileId = meta.id;
    await drivePush();
    return;
  }
  const local = await collectAllData();
  const raw = await gfetch('https://www.googleapis.com/drive/v3/files/'+driveFileId+'?alt=media');
  let rem = null;
  try{ rem = (typeof raw === 'string') ? JSON.parse(raw) : raw; }catch(e){}
  if(rem && (rem.updatedAt||0) > (local.updatedAt||0)){
    await applyAllData(rem);
    gsyncSetState('ok','Synced');
    if(onRemoteRefreshed) await onRemoteRefreshed();
  } else if((local.updatedAt||0) > ((rem && rem.updatedAt) || 0)){
    await drivePush();
  } else {
    gsyncSetState('ok','Synced');
  }
}
async function drivePush(){
  if(!gUser || !driveFileId) return;
  gsyncSetState('sync','Syncing…');
  const data = await collectAllData();
  await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+driveFileId+'?uploadType=media', {
    method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)
  });
  gsyncSetState('ok','Synced');
}
function queuePush(){
  if(!gUser || !gsyncConfigured()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    try{
      if(!accessToken || Date.now() >= tokenExp){
        pendingPush = true;
        if(tokenClient) tokenClient.requestAccessToken({prompt:''});
        return;
      }
      if(!driveFileId) await driveSync(); else await drivePush();
    }catch(e){ gsyncFail(e); }
  }, 1500);
}

function attemptSync(){
  if(!gUser || !gsyncConfigured()) return;
  if(typeof google === 'undefined' || !google.accounts){ loadGIS(); return; }
  if(!tokenClient) initGIS();
  if(!accessToken || Date.now() >= tokenExp){
    gsyncSetState('sync','Connecting…');
    try{ tokenClient.requestAccessToken({prompt:''}); }catch(e){ gsyncSetState('err','Sync paused'); }
  } else {
    driveSync().catch(gsyncFail);
  }
}
window.addEventListener('online', attemptSync);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') attemptSync(); });

/* Call once per page (after your own initial render). `onRefresh` should
   reload data from storage and re-render — it runs automatically if a
   newer copy was found on Drive, e.g. saved from another device. */
function initGoogleSync(onRefresh){
  onRemoteRefreshed = onRefresh;
  const signinBtn = document.getElementById('signinBtn');
  const signoutBtn = document.getElementById('signoutBtn');
  if(!signinBtn) return; // this page has no auth UI

  try{
    const cached = localStorage.getItem('gsync.user');
    if(cached) gUser = JSON.parse(cached);
  }catch(e){}
  gsyncRenderUser();
  gsyncSetState(gUser ? 'sync' : 'off', gUser ? 'Connecting…' : 'Local only');

  signinBtn.addEventListener('click', ()=>{
    if(!gsyncConfigured()){
      alert('Google sign-in isn\'t set up yet.\n\nCreate a free Google OAuth Client ID (Google Cloud Console → Credentials), enable the Drive API on that project, and paste the Client ID into common.js (GSYNC_CLIENT_ID). Until then this runs in local-only mode.');
      return;
    }
    initGIS();
    if(tokenClient) tokenClient.requestAccessToken({prompt: gUser ? '' : 'consent'});
  });
  if(signoutBtn){
    signoutBtn.addEventListener('click', ()=>{
      if(!confirm('Sign out? Your data stays in Google Drive and on this device.')) return;
      try{ if(accessToken && typeof google !== 'undefined') google.accounts.oauth2.revoke(accessToken, ()=>{}); }catch(e){}
      clearTimeout(saveTimer); pendingPush = false;
      gUser = null; accessToken = null; tokenExp = 0; driveFileId = null;
      localStorage.removeItem('gsync.user');
      gsyncRenderUser();
      gsyncSetState('off','Local only');
    });
  }

  // Previously signed in on this device/browser? Reconnect silently — no popup.
  if(gUser && gsyncConfigured()) loadGIS();
}
