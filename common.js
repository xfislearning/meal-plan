/* ===== Constants ===== */
const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri'];
const WEEKEND_DAYS = ['Sat','Sun'];
const FULL_DAY = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};

const DEFAULT_BREAKFAST = ['Oatmeal','Eggs & Toast','Yogurt & Granola','Smoothie','Pancakes','Cereal','Breakfast Burrito','Fruit & Toast'];
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
  if(m.includes('oatmeal') || m.includes('cereal') || m.includes('granola') || m.includes('yogurt')) return '🥣';
  if(m.includes('smoothie')) return '🥤';
  if(m.includes('pancake') || m.includes('waffle')) return '🥞';
  if(m.includes('toast')) return '🍞';
  if(m.includes('fruit')) return '🍓';
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

/* ===== Install to home screen (PWA) =====
   Chrome/Edge/Android show a native one-tap prompt via beforeinstallprompt.
   iOS Safari never fires that event, so the button falls back to showing
   the manual "Share → Add to Home Screen" steps instead. Either way, once
   installed it opens full-screen from the home screen icon like a normal
   app — no App Store/Play Store submission involved. */
(function initInstallPrompt(){
  const btn = document.getElementById('installBtn');
  if(!btn) return;
  let deferredPrompt = null;
  const isStandalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
                        || window.navigator.standalone === true;
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
  });
  if(!isStandalone) btn.hidden = false;

  btn.addEventListener('click', async ()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{ await deferredPrompt.userChoice; }catch(e){}
      deferredPrompt = null;
      btn.hidden = true;
      return;
    }
    if(isIOS){
      alert('To add this to your iPhone or iPad home screen:\n\n1. Open this page in Safari\n2. Tap the Share button (square with an arrow)\n3. Scroll down and tap "Add to Home Screen"\n4. Tap Add\n\nIt then opens full-screen from your home screen, just like an installed app.');
    } else {
      alert('To install this app:\n\n• Android (Chrome): menu (⋮) → "Add to Home screen" / "Install app"\n• Desktop Chrome or Edge: click the install icon in the address bar, or menu → "Install Family Meal Plan"\n• Mac Safari: File → Add to Dock\n\nAlready installed? Find it on your home screen or in your apps.');
    }
  });
  window.addEventListener('appinstalled', ()=>{ btn.hidden = true; });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
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
function defaultEntry(day){
  return WEEKEND_DAYS.includes(day)
    ? {prep:[], breakfast:'', lunch:'', dinner:''}
    : {breakfast:'', lunch:'', dinner:''};
}
/* Read-only, always-safe view of a day's plan — never mutates `plan` */
function entryFor(plan, day){
  const e = plan[day] || {};
  return {
    breakfast: e.breakfast || '',
    lunch: e.lunch || '',
    dinner: e.dinner || '',
    prep: Array.isArray(e.prep) ? e.prep : []
  };
}
/* Ensures plan[day] exists with every field it needs (breakfast/lunch/dinner
   for every day, plus prep for Sat/Sun) before mutating it — a Sat/Sun entry
   can now be created by either the weekend-prep table or the breakfast/
   lunch/dinner table, so both fields must always be present. */
function ensureDayEntry(plan, day){
  if(!plan[day]){ plan[day] = defaultEntry(day); return plan[day]; }
  const e = plan[day];
  if(e.breakfast === undefined) e.breakfast = '';
  if(e.lunch === undefined) e.lunch = '';
  if(e.dinner === undefined) e.dinner = '';
  if(WEEKEND_DAYS.includes(day) && !Array.isArray(e.prep)) e.prep = [];
  return e;
}

async function loadBank(key, fallbackKey, defaults){
  const raw = await storageGet(key);
  if(raw){ try{ return JSON.parse(raw); }catch(e){} }
  if(fallbackKey){
    const rawFb = await storageGet(fallbackKey);
    if(rawFb){ try{ return JSON.parse(rawFb); }catch(e){} }
  }
  return defaults.slice();
}
async function saveBank(key, list){ await storageSet(key, JSON.stringify(list)); await touchUpdated(key); }

async function loadPlan(monday){
  const raw = await storageGet(weekKeyFor(monday));
  if(!raw) return {};
  let parsed;
  try{ parsed = JSON.parse(raw); }catch(e){ return {}; }
  const migrated = {};
  Object.keys(parsed).forEach(day=>{
    const r = parsed[day];
    const entry = {
      breakfast: (r && typeof r === 'object' && r.breakfast) || '',
      lunch: (typeof r === 'string') ? r : ((r && r.lunch) || ''),
      dinner: (r && typeof r === 'object' && r.dinner) || ''
    };
    if(WEEKEND_DAYS.includes(day)){
      entry.prep = (r && Array.isArray(r.prep)) ? r.prep.slice() : [];
    }
    migrated[day] = entry;
  });
  return migrated;
}
async function savePlan(monday, plan){
  const key = weekKeyFor(monday);
  await storageSet(key, JSON.stringify(plan));
  await touchUpdated(key);
}

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
   Google Drive auto-sync — supports two people sharing one plan
   ---------------------------------------------------------------------
   One-time setup, done once by whoever owns the Google account this
   should sync to:
     1. Google Cloud Console → OAuth consent screen → add BOTH people's
        Google emails as test users (Audience tab) — the app stays in
        Testing mode, which requires no Google review, but only listed
        test users can sign in.
     2. Data access tab → add scope https://www.googleapis.com/auth/drive
        (full Drive access — needed so a file shared with the second
        person is actually visible to them; the narrower "drive.file"
        scope only shows files an account created itself).
     3. Enable the "Google Drive API" (APIs & Services → Library).
     4. Create a Web application OAuth Client ID, add your hosting URL
        under "Authorized JavaScript origins", and paste the Client ID
        below.
   Until GSYNC_CLIENT_ID is filled in, the app just runs in local-only
   mode — everything else on the site works exactly the same.

   Once configured: person A signs in, edits normally, then clicks
   "Share" in their user chip and enters person B's email — this grants
   B edit access to the one Drive file behind the scenes. B then signs
   in from their own device and sees the same plan.

   Sync is per-key, not whole-file: each meal bank and each week's plan
   carries its own timestamp, so if A edits Monday's lunch and B edits
   Tuesday's dinner around the same time, both changes are kept. Only if
   the exact same item is edited by both at nearly the same moment does
   the later save win for that one item.
   ===================================================================== */
const GSYNC_CLIENT_ID = "946510553805-8km4e31fnhmlom9ko57075n0ed38cdog.apps.googleusercontent.com";
const GSYNC_FILE = "family-meal-plan-data.json";
const GSYNC_SCOPES = "openid email profile https://www.googleapis.com/auth/drive";

function gsyncConfigured(){ return GSYNC_CLIENT_ID.indexOf("PASTE_") !== 0; }

let gUser = null, tokenClient = null, accessToken = null, tokenExp = 0,
    driveFileId = null, saveTimer = null, pendingPush = false, onRemoteRefreshed = null;

/* Per-key timestamps so sync can merge instead of overwrite */
async function getLocalTimestamps(){
  const raw = await storageGet('key-timestamps');
  if(!raw) return {};
  try{ return JSON.parse(raw); }catch(e){ return {}; }
}
async function setLocalTimestamp(key, ts){
  const map = await getLocalTimestamps();
  map[key] = ts;
  await storageSet('key-timestamps', JSON.stringify(map));
}
async function touchUpdated(key){
  await setLocalTimestamp(key, Date.now());
  queuePush();
}

async function collectAllData(){
  const ts = await getLocalTimestamps();
  const weekKeys = await storageList('week:');
  const tracked = new Set(['meal-bank-lunch','meal-bank-dinner','meal-bank-prep', ...weekKeys]);
  const keys = {};
  for(const k of tracked){
    const v = await storageGet(k);
    if(v != null) keys[k] = { value: v, updatedAt: ts[k] || 0 };
  }
  return { keys };
}
/* Pulls in any remote key that's newer than the local copy of that same
   key. Returns true if anything local changed (so the page can re-render). */
async function mergeRemote(remote){
  if(!remote || !remote.keys) return false;
  const localTs = await getLocalTimestamps();
  let changed = false;
  for(const key in remote.keys){
    const entry = remote.keys[key];
    const lts = localTs[key] || 0;
    if((entry.updatedAt||0) > lts){
      await storageSet(key, entry.value);
      localTs[key] = entry.updatedAt;
      changed = true;
    }
  }
  await storageSet('key-timestamps', JSON.stringify(localTs));
  return changed;
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
    // FedCM keeps silent renewal working now that browsers are phasing out
    // the third-party cookies/iframes GIS used to rely on for prompt:''.
    // Without it, silent renewal starts failing (often permanently, not
    // just transiently) a while after sign-in — the exact "sync paused"
    // symptom — with no way to recover short of signing out and back in.
    use_fedcm_for_prompt: true,
    error_callback: ()=>{ if(gUser) gsyncSetState('err','Sync paused — tap to reconnect'); }
  });
  if(gUser){
    gsyncSetState('sync','Connecting…');
    try{ tokenClient.requestAccessToken({prompt:''}); }catch(e){ gsyncSetState('err','Sync paused — tap to reconnect'); }
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
  if(resp.error){ if(gUser) gsyncSetState('err','Sync paused — tap to reconnect'); return; }
  accessToken = resp.access_token;
  tokenExp = Date.now() + ((resp.expires_in||3600)-60)*1000;
  if(google.accounts.oauth2.hasGrantedAllScopes &&
     !google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/drive')){
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
    if(pendingBackup){ pendingBackup = false; await performBackupAndReport(); }
    else if(pendingPush){ pendingPush = false; await drivePush(); }
    else await driveSync();
  }catch(e){ gsyncFail(e); }
}

async function driveFind(){
  const q = encodeURIComponent("name='"+GSYNC_FILE+"' and trashed=false");
  const d = await gfetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,modifiedTime,ownedByMe)&orderBy=modifiedTime desc');
  const files = d.files || [];
  if(!files.length) return null;
  // If two people each signed in before sharing was set up, each ends up
  // owning their own same-named file. Once shared, always prefer a file
  // someone else owns (i.e. one shared with us) over our own — otherwise
  // we'd keep syncing to our private copy forever and never converge on
  // the one true shared file.
  const shared = files.find(f => f.ownedByMe === false);
  return (shared || files[0]).id;
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
  const raw = await gfetch('https://www.googleapis.com/drive/v3/files/'+driveFileId+'?alt=media');
  let rem = null;
  try{ rem = (typeof raw === 'string') ? JSON.parse(raw) : raw; }catch(e){}
  const changed = await mergeRemote(rem);
  await drivePush(); // push the merged union back so Drive reflects both sides
  if(changed && onRemoteRefreshed) await onRemoteRefreshed();
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

async function shareWithEmail(email){
  if(!gUser){ alert('Sign in first, then share.'); return; }
  if(!driveFileId){
    gsyncSetState('sync','Preparing…');
    try{ await driveSync(); }catch(e){ gsyncFail(e); }
  }
  if(!driveFileId){ alert('Could not reach Drive yet — try again in a moment.'); return; }
  try{
    await gfetch('https://www.googleapis.com/drive/v3/files/'+driveFileId+'/permissions', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'writer', type:'user', emailAddress: email })
    });
    alert(email + ' can now sign in on their own device and see/edit this same plan.');
  }catch(e){
    alert('Could not share this: ' + e.message);
  }
}

/* =====================================================================
   Excel backup — a human-readable, restorable snapshot of everything
   saved (all meal-idea banks + every week ever planned), uploaded
   straight to the same Google Drive account as a new .xlsx file. This is
   separate from the JSON file Drive sync uses internally: that one is a
   live, machine-only sync copy; this is a dated backup you could open in
   Excel/Sheets and read or restore from by hand.
   ===================================================================== */
const XLSX_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let xlsxLibPromise = null;
function loadXLSXLib(){
  if(typeof XLSX !== 'undefined') return Promise.resolve();
  if(xlsxLibPromise) return xlsxLibPromise;
  xlsxLibPromise = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = XLSX_LIB_URL;
    s.onload = ()=> resolve();
    s.onerror = ()=>{ xlsxLibPromise = null; reject(new Error('Could not load the Excel library — check your connection and try again.')); };
    document.head.appendChild(s);
  });
  return xlsxLibPromise;
}

/* Reads every meal-idea bank plus every saved week's plan. Pure read —
   safe to call any time, doesn't touch what's currently on screen. */
async function gatherBackupData(){
  const [breakfast, lunch, dinner, prep] = await Promise.all([
    loadBank('meal-bank-breakfast', null, DEFAULT_BREAKFAST),
    loadBank('meal-bank-lunch', 'meal-bank', DEFAULT_LUNCH),
    loadBank('meal-bank-dinner', null, DEFAULT_DINNER),
    loadBank('meal-bank-prep', null, DEFAULT_PREP)
  ]);
  const weekKeys = (await storageList('week:')).slice().sort();
  const weeks = [];
  for(const key of weekKeys){
    const monday = new Date(key.slice('week:'.length) + 'T00:00:00');
    if(isNaN(monday)) continue;
    const plan = await loadPlan(monday);
    weeks.push({ monday, plan });
  }
  return { breakfast, lunch, dinner, prep, weeks };
}

/* ----- Pure row-builders: plain data in, a 2D array out. No DOM, no
   network — easy to unit-test and safe to reuse if the sheet layout
   ever needs to change. ----- */
function buildIdeasSheetRows(data){
  const cols = [
    ['Breakfast', ...data.breakfast],
    ['Lunch', ...data.lunch],
    ['Dinner', ...data.dinner],
    ['Meal Prep', ...data.prep]
  ];
  const maxLen = Math.max(0, ...cols.map(c => c.length - 1));
  const rows = [cols.map(c => c[0])];
  for(let i = 0; i < maxLen; i++){
    rows.push(cols.map(c => c[i+1] || ''));
  }
  return rows;
}
function buildPlanSheetRows(data){
  const rows = [['Week Of','Day','Date','Breakfast','Lunch','Dinner','Meal Prep']];
  data.weeks.forEach(({monday, plan})=>{
    ALL_DAYS.forEach(day=>{
      const idx = ALL_DAYS.indexOf(day);
      const date = addDays(monday, idx);
      const entry = entryFor(plan, day);
      rows.push([
        fmtISO(monday), FULL_DAY[day], fmtISO(date),
        entry.breakfast, entry.lunch, entry.dinner, entry.prep.join('; ')
      ]);
    });
  });
  return rows;
}
function buildBackupWorkbook(data){
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildIdeasSheetRows(data)), 'Meal Ideas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildPlanSheetRows(data)), 'Weekly Plan');
  const arr = XLSX.write(wb, { type:'array', bookType:'xlsx' });
  return new Blob([arr], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function driveUploadBackup(blob, filename){
  const meta = await gfetch('https://www.googleapis.com/drive/v3/files', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: filename })
  });
  await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+meta.id+'?uploadType=media', {
    method:'PATCH',
    headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},
    body: blob
  });
  return meta.id;
}

async function doBackupNow(){
  await loadXLSXLib();
  const data = await gatherBackupData();
  const blob = buildBackupWorkbook(data);
  const filename = `Family Meal Plan Backup - ${fmtISO(new Date())}.xlsx`;
  await driveUploadBackup(blob, filename);
  return filename;
}

let pendingBackup = false;

async function performBackupAndReport(){
  const btn = document.getElementById('backupBtn');
  try{
    const filename = await doBackupNow();
    alert('Backup saved to your Google Drive as "' + filename + '".');
  }catch(e){
    console.error('Backup failed:', e);
    alert('Backup failed: ' + e.message);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = btn.dataset.originalText || '⬇ Backup'; }
  }
}

function backupToExcel(){
  if(!gUser){ alert('Sign in first, then back up.'); return; }
  const btn = document.getElementById('backupBtn');
  if(btn){
    if(!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Backing up…';
  }
  if(!accessToken || Date.now() >= tokenExp){
    pendingBackup = true;
    if(!tokenClient) initGIS();
    if(tokenClient){
      try{ tokenClient.requestAccessToken({prompt:''}); }
      catch(e){
        pendingBackup = false;
        if(btn){ btn.disabled = false; btn.textContent = btn.dataset.originalText; }
        alert('Could not reach Google — try again in a moment.');
      }
    }
    return;
  }
  performBackupAndReport();
}

function attemptSync(){
  if(!gUser || !gsyncConfigured()) return;
  if(typeof google === 'undefined' || !google.accounts){ loadGIS(); return; }
  if(!tokenClient) initGIS();
  if(!accessToken || Date.now() >= tokenExp){
    gsyncSetState('sync','Connecting…');
    try{ tokenClient.requestAccessToken({prompt:''}); }catch(e){ gsyncSetState('err','Sync paused — tap to reconnect'); }
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
  const shareBtn = document.getElementById('shareBtn');
  const backupBtn = document.getElementById('backupBtn');
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
    if(!tokenClient) initGIS();
    if(tokenClient){
      tokenClient.requestAccessToken({prompt: gUser ? '' : 'consent'});
    } else {
      // Google's sign-in script hasn't finished loading yet (slow network,
      // or this is the very first click right as the page opened) — make
      // sure it's on its way in, and ask for one more tap once it lands.
      // (We can't auto-continue this into the sign-in popup ourselves once
      // the script loads, since by then it's no longer inside this click's
      // gesture and browsers block popups that aren't.)
      loadGIS();
      const original = signinBtn.textContent;
      signinBtn.textContent = 'Loading… tap again in a moment';
      setTimeout(()=>{ signinBtn.textContent = original; }, 2500);
    }
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
  if(shareBtn){
    shareBtn.addEventListener('click', async ()=>{
      const email = prompt("Share this plan with (their Google email address):");
      if(!email) return;
      await shareWithEmail(email.trim());
    });
  }
  if(backupBtn){
    backupBtn.addEventListener('click', backupToExcel);
  }

  // Background token renewal is silent (prompt:'') and can fail for reasons
  // that don't clear up on their own (e.g. a browser blocking the 3rd-party
  // cookie/iframe it relies on) — that's what "Sync paused" means. Clicking
  // the status pill in that state does a real, user-gesture-driven prompt,
  // which works even when the silent path is permanently blocked.
  const syncStateEl = document.getElementById('syncState');
  if(syncStateEl){
    syncStateEl.style.cursor = 'pointer';
    syncStateEl.title = 'Tap to reconnect if sync gets stuck';
    syncStateEl.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(syncStateEl.dataset.state !== 'err') return;
      if(!tokenClient) initGIS();
      if(!tokenClient) return;
      gsyncSetState('sync','Connecting…');
      try{ tokenClient.requestAccessToken({prompt:'consent'}); }
      catch(err){ gsyncSetState('err','Sync paused — tap to reconnect'); }
    });
  }

  // Load Google's sign-in script proactively on every visit — not just when
  // someone was previously signed in — so the "Sign in" button already has
  // everything it needs the very first time it's clicked. (initGIS() only
  // auto-attempts a silent reconnect if gUser is already set, so this is
  // safe to do unconditionally — it won't pop up anything on its own.)
  if(gsyncConfigured()) loadGIS();
}
