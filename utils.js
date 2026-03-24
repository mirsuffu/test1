// ============================================================
// UTILS — Date helpers, Toast, Sound, Haptic, Conn, TopBar
// ============================================================

// ---- Date utils ----
function toDateStrSimple(d) {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dy=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+dy;
}
function parseDate(s) { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function formatDateShort(s) { return parseDate(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); }
function getDayName(s) { return parseDate(s).toLocaleDateString('en-IN',{weekday:'long'}); }
function getDayNameShort(s) { return parseDate(s).toLocaleDateString('en-IN',{weekday:'short'}); }
function getDaysBetween(a,b) {
  const r=[],s=parseDate(a),e=parseDate(b),c=new Date(s);
  while(c<=e){ r.push(toDateStrSimple(c)); c.setDate(c.getDate()+1); }
  return r;
}
function daysUntil(s) {
  const t=new Date(); t.setHours(0,0,0,0);
  return Math.ceil((parseDate(s)-t)/86400000);
}
function isSunday(s) { return parseDate(s).getDay()===0; }
function getTodayStr() { return toDateStrSimple(new Date()); }

// ---- Toast ----
function showToast(msg, type='info') {
  // Pop always dominates — suppress any pending click sound
  playSound('pop');
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  el.style.borderLeftColor=type==='success'?'var(--success)':type==='error'?'var(--danger)':'var(--accent)';
  el.style.borderLeftWidth='3px';
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>{ el.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>el.remove(),300); },2500);
}

// ---- Audio Feedback ----
// Pop dominates: any pop fired suppresses click for 400ms
let _popPlaying = false;
let _popSuppressTimer = null;

function playSound(type) {
  try {
    if (type === 'pop' || type === 'both') {
      // Cancel any running suppression timer and restart
      clearTimeout(_popSuppressTimer);
      _popPlaying = true;
      const pop = document.getElementById('audio-pop');
      if (pop) { pop.currentTime = 0; pop.play().catch(()=>{}); }
      _popSuppressTimer = setTimeout(() => { _popPlaying = false; }, 400);
    } else if (type === 'click') {
      if (_popPlaying) return; // pop dominates
      const click = document.getElementById('audio-click');
      if (click) { click.currentTime = 0; click.play().catch(()=>{}); }
    }
  } catch(e) {}
}
function playClick(type) {
  try { if (navigator.vibrate) navigator.vibrate(type==='tick'?8:type==='nav'?4:5); } catch(e){}
  playSound('click');
}

// ---- Top Bar ----
function updateTopBar() {
  const days=daysUntil(data.settings.examDate), el=document.getElementById('days-remaining');
  if(days>0) el.textContent=days+' Days Remaining';
  else if(days===0) el.textContent='Exam Day Today! You\'ve got this 💪';
  else el.textContent='Exam\'s done! Results await 🤞';
  el.style.color=days<=30?'var(--danger)':days<=90?'var(--warning)':'var(--text)';
  document.getElementById('topbar-date').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  (function(){
    var un=data.settings&&data.settings.userName, bl=document.getElementById('topbar-brand-name');
    if(bl) bl.textContent=un||'JG. SUFFU';
  })();
}

// ---- Connection Status ----
function setConnStatus(state) {
  const el=document.getElementById('conn-status'), lbl=document.getElementById('conn-label');
  if(!el||!lbl) return;
  el.classList.remove('online','offline','syncing');
  el.classList.add(state);
  if(state==='offline') lbl.textContent='Offline';
  else if(state==='syncing') lbl.textContent='Syncing…';
  else {
    if(_lastSyncTime) {
      const secs=Math.floor((Date.now()-_lastSyncTime)/1000);
      lbl.textContent=`Synced ${secs}s ago`;
    } else { lbl.textContent='Online'; }
  }
}
function updateConnStatusTimer() {
  if(document.getElementById('conn-status')?.classList.contains('online') && _lastSyncTime) {
    const secs=Math.floor((Date.now()-_lastSyncTime)/1000);
    const lbl=document.getElementById('conn-label');
    if(lbl) lbl.textContent=secs>60?`Synced ${Math.floor(secs/60)}m ago`:`Synced ${secs}s ago`;
  }
}
setInterval(updateConnStatusTimer, 5000);

function initConnStatus() {
  setConnStatus(navigator.onLine?'online':'offline');
  window.addEventListener('online',  ()=>setConnStatus('online'));
  window.addEventListener('offline', ()=>setConnStatus('offline'));
}

// ---- Reusable Confirm Dialog ----
let _confirmActionCb = null;
function showConfirmAction(title, msg, onConfirm, confirmLabel='Yes, Delete') {
  document.getElementById('confirm-action-title').textContent = title;
  document.getElementById('confirm-action-msg').textContent   = msg;
  document.getElementById('confirm-action-yes').textContent   = confirmLabel;
  _confirmActionCb = onConfirm;
  document.getElementById('confirm-action-modal').classList.add('show');
  playSound('pop');
}
function _setupConfirmActionModal() {
  document.getElementById('confirm-action-cancel').addEventListener('click', ()=>{
    document.getElementById('confirm-action-modal').classList.remove('show');
    _confirmActionCb = null;
  });
  document.getElementById('confirm-action-yes').addEventListener('click', ()=>{
    document.getElementById('confirm-action-modal').classList.remove('show');
    if (_confirmActionCb) { _confirmActionCb(); _confirmActionCb = null; }
  });
  document.getElementById('confirm-action-modal').addEventListener('click', e=>{
    if (e.target === document.getElementById('confirm-action-modal')) {
      document.getElementById('confirm-action-modal').classList.remove('show');
      _confirmActionCb = null;
    }
  });
}
function checkWeeklyBackupNudge() {
  const last=localStorage.getItem('jgsuffu_last_backup_nudge');
  const today=getTodayStr();
  if(!last){ localStorage.setItem('jgsuffu_last_backup_nudge',today); return; }
  const daysSince=Math.floor((parseDate(today)-parseDate(last))/86400000);
  if(daysSince>=7) {
    localStorage.setItem('jgsuffu_last_backup_nudge',today);
    setTimeout(()=>showToast('💾 A week gone by — maybe back up your data? Just saying 👀','info'),3000);
  }
}
