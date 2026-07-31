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
async function saveBank(key, list){ await storageSet(key, JSON.stringify(list)); }

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
async function savePlan(monday, plan){ await storageSet(weekKeyFor(monday), JSON.stringify(plan)); }

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

/* Currently "picked up" meal, shared across pages so a selection made on
   Meal Menu survives navigating to Meal Plan */
async function loadActiveMeal(){ return await storageGet('active-selection'); }
async function saveActiveMeal(meal){
  if(meal) await storageSet('active-selection', meal);
  else await storageSet('active-selection', '');
}

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
