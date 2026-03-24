// ============================================================
// UI HANDLERS — Editor, Theme, Nav, Modals, Subjects, Schedule,
//               Settings, Import/Export, Clear Data, Fullscreen,
//               Mobile Tabs
// ============================================================

// ---- Theme ----
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme',theme);
  const track=document.getElementById('theme-track'), txt=document.getElementById('theme-toggle-text');
  if(track&&txt){
    if(theme==='dark'){ track.classList.remove('on'); txt.textContent='Dark Mode'; }
    else { track.classList.add('on'); txt.textContent='Light Mode'; }
  }
  data.settings.theme=theme;
}
function toggleTheme(){ const t=data.settings.theme==='dark'?'light':'dark'; applyTheme(t); saveData(); }

// ---- Editor Mode ----
function setEditorMode(unlocked) {
  editorUnlocked=unlocked;
  const badge=document.getElementById('editor-badge');
  if(unlocked){ badge.className='unlocked'; badge.textContent='🔓 UNLOCKED'; document.body.classList.remove('editor-locked'); showToast('Editor Mode Unlocked ✓','success'); }
  else { badge.className='locked'; badge.textContent='🔒 LOCKED'; document.body.classList.add('editor-locked'); showToast('Editor Mode Locked 🔒','info'); }
  renderSettings(); renderSchedule(); renderSubjectsInternal();
}
function handleEditorToggle(){ editorUnlocked?setEditorMode(false):openEditorModal(); }
function openEditorModal(){
  document.getElementById('editor-modal').classList.add('show');
  document.getElementById('editor-pw-input').value='';
  document.getElementById('editor-pw-error').textContent='';
  setTimeout(()=>document.getElementById('editor-pw-input').focus(),50);
}
function closeEditorModal(){ document.getElementById('editor-modal').classList.remove('show'); }
function confirmEditorPassword(){
  const pw=document.getElementById('editor-pw-input').value;
  if(pw===EDITOR_PASSWORD){ closeEditorModal(); setEditorMode(true); }
  else {
    const inp=document.getElementById('editor-pw-input');
    document.getElementById('editor-pw-error').textContent='Nice try. Wrong password though 🙃';
    inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),400);
  }
}

// ---- Navigation ----
function switchSection(id){
  currentSection=id;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id+'-section').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===id));
  document.querySelectorAll('.mobile-tab').forEach(t=>t.classList.toggle('active',t.dataset.section===id));
  if(id==='metrics') renderMetrics();
  if(id==='test') renderTestTable();
  if(id==='reminders'){ archiveDoneReminders(); renderReminders(); }
}

// ---- Fullscreen ----
function toggleFullscreen(){
  const btn=document.getElementById('fullscreen-btn');
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
    btn.textContent='✕'; btn.title='Exit Fullscreen';
  } else {
    document.exitFullscreen().catch(()=>{});
    btn.textContent='⛶'; btn.title='Toggle Fullscreen';
  }
}
document.addEventListener('fullscreenchange',()=>{
  const btn=document.getElementById('fullscreen-btn');
  if(!document.fullscreenElement){ btn.textContent='⛶'; btn.title='Toggle Fullscreen'; }
  else { btn.textContent='✕'; btn.title='Exit Fullscreen'; }
});

// ---- Settings ----
function renderSettings(){
  document.getElementById('setting-exam-date').value=data.settings.examDate||'';
  document.getElementById('setting-start-date').value=data.settings.plannerStartDate||'';
  (function(){ const nf=document.getElementById('setting-user-name'); if(nf) nf.value=data.settings.userName||''; })();
  const isLight=data.settings.theme==='light';
  document.getElementById('theme-track').classList.toggle('on',isLight);
  document.getElementById('theme-toggle-text').textContent=isLight?'Light Mode':'Dark Mode';
  const fsOn=!!data.settings.alwaysFullscreen;
  document.getElementById('fullscreen-track').classList.toggle('on',fsOn);
  document.getElementById('fullscreen-toggle-text').textContent=fsOn?'On':'Off';
  const etrack=document.getElementById('editor-track'), etext=document.getElementById('editor-toggle-text');
  if(etrack&&etext){ etrack.classList.toggle('on',editorUnlocked); etext.textContent=editorUnlocked?'Unlocked':'Locked'; }
  const helpWrap=document.getElementById('settings-notif-help');
  if(helpWrap){
    helpWrap.innerHTML=`
      <div style="margin-top:20px;padding:12px;border-radius:8px;background:rgba(124,111,205,0.05);border:1px dashed var(--border);">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px;">💡 Notification Reliability</div>
        <div style="font-size:11px;color:var(--text2);line-height:1.4;">
          Android/iOS may kill background apps to save battery. For best results, 
          <strong>Disable Battery Optimization</strong> for this PWA in your device settings.
          ${'showTrigger' in Notification.prototype?'<br><span style="color:var(--success)">✓ OS Triggers supported on this device.</span>':''}
        </div>
      </div>`;
  }
}

function saveSettings(){
  if(!editorUnlocked) return;
  const ed=document.getElementById('setting-exam-date').value;
  const sd=document.getElementById('setting-start-date').value;
  if(!ed||!sd){ showToast('Both dates please — can\'t build a planner from thin air 📅','error'); return; }
  if(sd>=ed){ showToast('Bro, you can\'t study after the exam 💀 Fix those dates.','error'); return; }
  data.settings.examDate=ed; data.settings.plannerStartDate=sd;
  saveData(); updateTopBar(); plannerScrolledToToday=false; renderPlanner();
  showToast('Done! Settings locked in 🔧','success');
}

// ---- Import / Export ----
function exportData(){
  const today=toDateStrSimple(new Date());
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='jgsuffu-backup-'+today+'.json'; a.click();
  URL.revokeObjectURL(url); showToast('Backed up! Smart move 💾','success');
}
function handleImportFile(e){
  const file=e.target.files[0]; if(!file) return;
  pendingImportFile=file; document.getElementById('import-modal').classList.add('show'); e.target.value='';
}
function confirmImport(){
  if(!pendingImportFile) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try {
      const imported=JSON.parse(e.target.result);
      if(!imported.tests&&!imported.subjects) throw new Error('Invalid format');
      data=imported; normalizeData(); saveData(); renderAll();
      showToast('Data imported! Welcome back to the grind 💪','success');
    } catch { showToast('That file is cooked 🤌 Not valid JSON.','error'); }
    pendingImportFile=null; document.getElementById('import-modal').classList.remove('show');
  };
  reader.readAsText(pendingImportFile);
}

// ---- Schedule ----
function renderSchedule(){
  SCHED_KEYS.forEach((key,i)=>{
    const body=document.getElementById('sched-body-'+i); body.innerHTML='';
    const slots=data.schedules[key].slots;
    if(slots.length===0&&!editorUnlocked){ body.innerHTML='<div class="empty-schedule">No slots added yet.</div>'; }
    else {
      slots.forEach((slot,si)=>{
        const row=document.createElement('div'); row.className='slot-row';
        if(editorUnlocked){
          const st=document.createElement('input'); st.type='time'; st.className='slot-time-input'; st.value=slot.start||'';
          st.addEventListener('change',()=>{ slot.start=st.value; saveData(); rescheduleAllNotifications(); });
          const et=document.createElement('input'); et.type='time'; et.className='slot-time-input'; et.value=slot.end||'';
          et.addEventListener('change',()=>{ slot.end=et.value; saveData(); });
          const nbtn=document.createElement('span'); nbtn.className='slot-notify-btn'+(slot.notify?' active':'');
          nbtn.textContent='🔔'; nbtn.title='Notify 10m before';
          nbtn.addEventListener('click',()=>{
            slot.notify=!slot.notify; nbtn.classList.toggle('active',slot.notify);
            saveData(); rescheduleAllNotifications();
            showToast(slot.notify?'Suffu will nudge you 10 mins early! 😉':'Notification off.','info');
          });
          const lb=document.createElement('input'); lb.type='text'; lb.className='slot-label-input'; lb.value=slot.label||''; lb.placeholder='Subject / Activity';
          lb.addEventListener('change',()=>{ slot.label=lb.value; saveData(); });
          lb.addEventListener('keydown',e=>{ if(e.key==='Enter'){ slot.label=lb.value; saveData(); lb.blur(); } });
          const del=document.createElement('span'); del.className='slot-del'; del.textContent='✕';
          del.addEventListener('click',()=>{ data.schedules[key].slots.splice(si,1); saveData(); renderSchedule(); rescheduleAllNotifications(); });
          row.append(st,et,nbtn,lb,del);
        } else {
          const t=document.createElement('span'); t.className='slot-time'; t.textContent=(slot.start||'--:--')+' – '+(slot.end||'--:--');
          const l=document.createElement('span'); l.className='slot-label'; l.textContent=slot.label||'—';
          row.append(t,l);
          if(slot.notify){ const nb=document.createElement('span'); nb.textContent='🔔'; nb.style.fontSize='12px'; nb.style.opacity='0.6'; row.appendChild(nb); }
        }
        body.appendChild(row);
      });
    }
    if(editorUnlocked){
      const ab=document.createElement('button'); ab.className='add-slot-btn'; ab.textContent='+ Add Slot';
      ab.addEventListener('click',()=>{ data.schedules[key].slots.push({start:'',end:'',label:''}); saveData(); renderSchedule(); });
      body.appendChild(ab);
    }
  });
}

// ---- Subjects ----
function getPriorityFlag(d,c){
  if(d>=4&&c<=2) return '<span style="color:var(--danger)" title="High Priority">⚑</span>';
  if(d>=3&&c<=2) return '<span style="color:var(--warning)" title="Medium Priority">⚑</span>';
  return '';
}
function getRatingLabel(val){ if(val<=2) return 'low'; if(val<=4) return 'med'; return 'hard'; }

function makeRatingGroup(container,initVal,onChangeFn){
  container.innerHTML='';
  const current=getRatingLabel(initVal);
  const levels=[{id:'low',val:1,label:'Low'},{id:'med',val:3,label:'Med'},{id:'hard',val:5,label:'Hard'}];
  const group=document.createElement('div'); group.className='rating-group-mini';
  levels.forEach(lvl=>{
    const btn=document.createElement('div');
    btn.className='rating-mini-btn '+lvl.id+(current===lvl.id?' active':'');
    btn.textContent=lvl.label;
    btn.addEventListener('click',()=>{
      group.querySelectorAll('.rating-mini-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); playClick('star'); onChangeFn(lvl.val);
    });
    group.appendChild(btn);
  });
  container.appendChild(group);
}

function refreshSubjectMeta(subj,header){
  const avgConf=subj.chapters.length?(subj.chapters.reduce((a,c)=>a+c.confidence,0)/subj.chapters.length).toFixed(1):'—';
  const flags=subj.chapters.filter(c=>c.difficulty>=3&&c.confidence<=2).length;
  const meta=header.querySelector('.subject-meta');
  if(meta) meta.innerHTML=`<span>📖 ${subj.chapters.length} chapters</span><span>⭐ Avg Conf: ${avgConf}</span>${flags?`<span style="color:var(--warning)">⚑ ${flags} flagged</span>`:''}`;
}

function renderSubjectsInternal(){
  const body=document.getElementById('subjects-body'); body.innerHTML='';
  const mobile=isMobile();
  data.subjects.forEach(subj=>{
    const isOpen=openSubjects.has(subj.id);
    const block=document.createElement('div');
    block.className='subject-block glass-card'+(isOpen?' open':'');
    block.dataset.subjid=subj.id;
    const avgConf=subj.chapters.length?(subj.chapters.reduce((a,c)=>a+c.confidence,0)/subj.chapters.length).toFixed(1):'—';
    const flags=subj.chapters.filter(c=>c.difficulty>=3&&c.confidence<=2).length;
    const header=document.createElement('div'); header.className='subject-header';
    header.innerHTML='<span class="subject-name">'+subj.name+'</span>'
      +'<div class="subject-meta"><span>📖 '+subj.chapters.length+' chapters</span>'
      +'<span>⭐ Avg Conf: '+avgConf+'</span>'
      +(flags?'<span style="color:var(--warning)">⚑ '+flags+' flagged</span>':'')+'</div>'
      +'<span class="subject-chevron">▶</span>';
    header.addEventListener('click',()=>{ const n=block.classList.toggle('open'); if(n) openSubjects.add(subj.id); else openSubjects.delete(subj.id); });
    const bodyEl=document.createElement('div'); bodyEl.className='subject-body';
    const chapterList=document.createElement('div'); chapterList.className='chapter-list';
    if(subj.chapters.length===0&&!editorUnlocked){ chapterList.innerHTML='<div class="empty-chapters">No chapters yet. Unlock Editor Mode to add chapters.</div>'; }
    subj.chapters.forEach((ch,ci)=>{
      const row=document.createElement('div'); row.className='chapter-row';
      if(editorUnlocked){
        const inp=document.createElement('input'); inp.type='text'; inp.className='chapter-name-input'; inp.value=ch.name;
        inp.addEventListener('change',()=>{ ch.name=inp.value; saveData(); });
        inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ ch.name=inp.value; saveData(); inp.blur(); } });
        row.appendChild(inp);
      } else {
        const nm=document.createElement('span'); nm.className='chapter-name'; nm.textContent=ch.name; row.appendChild(nm);
      }
      const flag=document.createElement('span'); flag.className='priority-flag'; flag.innerHTML=getPriorityFlag(ch.difficulty,ch.confidence);
      const dl=document.createElement('span'); dl.className='rating-label'; dl.textContent='Difficulty';
      const ds=document.createElement('span'); ds.className='rating-container';
      (function(ch,flag){ makeRatingGroup(ds,ch.difficulty,v=>{ ch.difficulty=v; saveData(); flag.innerHTML=getPriorityFlag(ch.difficulty,ch.confidence); refreshSubjectMeta(subj,header); }); })(ch,flag);
      const cl=document.createElement('span'); cl.className='rating-label'; cl.textContent='Confidence';
      const cs=document.createElement('span'); cs.className='rating-container';
      (function(ch,flag){ makeRatingGroup(cs,ch.confidence,v=>{ ch.confidence=v; saveData(); flag.innerHTML=getPriorityFlag(ch.difficulty,ch.confidence); refreshSubjectMeta(subj,header); }); })(ch,flag);
      if(mobile){
        const rrow=document.createElement('div'); rrow.className='chapter-ratings-mobile';
        rrow.append(dl,ds,cl,cs,flag);
        if(editorUnlocked){
          const del=document.createElement('span'); del.className='chapter-del'; del.textContent='✕'; del.title='Delete';
          (function(ci){ del.addEventListener('click',()=>{ subj.chapters.splice(ci,1); saveData(); renderSubjectsInternal(); }); })(ci);
          const up=document.createElement('span'); up.className='chapter-move'; up.textContent='▲'; up.style.cssText='cursor:pointer;font-size:10px;color:var(--text2);padding:0 2px;';
          (function(ci){ up.addEventListener('click',()=>{ if(ci>0){ const t=subj.chapters[ci-1]; subj.chapters[ci-1]=subj.chapters[ci]; subj.chapters[ci]=t; saveData(); renderSubjectsInternal(); } }); })(ci);
          const dn=document.createElement('span'); dn.className='chapter-move'; dn.textContent='▼'; dn.style.cssText='cursor:pointer;font-size:10px;color:var(--text2);padding:0 2px;';
          (function(ci){ dn.addEventListener('click',()=>{ if(ci<subj.chapters.length-1){ const t=subj.chapters[ci+1]; subj.chapters[ci+1]=subj.chapters[ci]; subj.chapters[ci]=t; saveData(); renderSubjectsInternal(); } }); })(ci);
          rrow.append(up,dn,del);
        }
        row.appendChild(rrow);
      } else {
        cl.style.marginLeft='10px';
        row.append(flag,dl,ds,cl,cs);
        if(editorUnlocked){
          const del=document.createElement('span'); del.className='chapter-del'; del.textContent='✕'; del.title='Delete';
          (function(ci){ del.addEventListener('click',()=>{ subj.chapters.splice(ci,1); saveData(); renderSubjectsInternal(); }); })(ci);
          const up=document.createElement('span'); up.className='chapter-move'; up.textContent='▲'; up.style.cssText='cursor:pointer;font-size:10px;color:var(--text2);padding:0 2px;';
          (function(ci){ up.addEventListener('click',()=>{ if(ci>0){ const t=subj.chapters[ci-1]; subj.chapters[ci-1]=subj.chapters[ci]; subj.chapters[ci]=t; saveData(); renderSubjectsInternal(); } }); })(ci);
          const dn=document.createElement('span'); dn.className='chapter-move'; dn.textContent='▼'; dn.style.cssText='cursor:pointer;font-size:10px;color:var(--text2);padding:0 2px;';
          (function(ci){ dn.addEventListener('click',()=>{ if(ci<subj.chapters.length-1){ const t=subj.chapters[ci+1]; subj.chapters[ci+1]=subj.chapters[ci]; subj.chapters[ci]=t; saveData(); renderSubjectsInternal(); } }); })(ci);
          row.append(up,dn,del);
        }
      }
      chapterList.appendChild(row);
    });
    bodyEl.appendChild(chapterList);
    if(editorUnlocked){
      const ab=document.createElement('button'); ab.className='subject-add-btn'; ab.textContent='+ Add Chapter';
      (function(subj){ ab.addEventListener('click',()=>{ openSubjects.add(subj.id); subj.chapters.push({id:'ch'+Date.now(),name:'New Chapter',difficulty:3,confidence:3}); saveData(); renderSubjectsInternal(); }); })(subj);
      bodyEl.appendChild(ab);
    }
    block.append(header,bodyEl); body.appendChild(block);
  });
}

// ---- Clear Data ----
let clearScope='user';
function openClearModal(){
  showClearStep(1);
  document.getElementById('scope-user').checked=true;
  document.getElementById('clear-confirm-text').value='';
  document.getElementById('clear-step2-error').textContent='';
  document.getElementById('clear-editor-pw').value='';
  document.getElementById('clear-step3b-error').textContent='';
  document.getElementById('clear-modal').classList.add('show');
}
function closeClearModal(){ document.getElementById('clear-modal').classList.remove('show'); }
function showClearStep(n){
  ['clear-step-1','clear-step-2','clear-step-3a','clear-step-3b'].forEach(id=>{ document.getElementById(id).style.display='none'; });
  const map={1:'clear-step-1',2:'clear-step-2','3a':'clear-step-3a','3b':'clear-step-3b'};
  document.getElementById(map[n]).style.display='';
}
function doClearUserData(){
  data.planner=[]; data.tests=[];
  data.subjects.forEach(subj=>subj.chapters.forEach(ch=>{ ch.difficulty=3; ch.confidence=3; }));
  saveData(true); openSubjects.clear(); renderAll();
  if(currentUser){ localStorage.removeItem('jgsuffu_launched_'+currentUser.uid); localStorage.removeItem('jgsuffu_daily_seen_'+currentUser.uid); }
  showToast('Poof! User data gone. Fresh slate 🧹','info');
}
function doClearAllData(){
  data=defaultData(); saveData(true); openSubjects.clear(); editorUnlocked=false;
  document.body.classList.add('editor-locked');
  const badge=document.getElementById('editor-badge');
  if(badge){ badge.className='locked'; badge.textContent='🔒 LOCKED'; }
  if(currentUser){ localStorage.removeItem('jgsuffu_launched_'+currentUser.uid); localStorage.removeItem('jgsuffu_daily_seen_'+currentUser.uid); }
  renderAll(); showToast('Everything wiped. Time to rebuild, king 👑','info');
}
function setStep2Sub(){
  document.getElementById('clear-step2-sub').innerHTML=clearScope==='both'
    ?'You are about to erase <strong>ALL data</strong> including subjects, chapters, schedules &amp; settings. Type <strong style="color:var(--danger)">DELETE</strong> to proceed.'
    :'You are about to erase your planner, test records &amp; chapter ratings. Type <strong style="color:var(--danger)">DELETE</strong> to proceed.';
}
function advanceClearStep2(){
  const val=document.getElementById('clear-confirm-text').value.trim().toUpperCase();
  if(val!=='DELETE'){
    document.getElementById('clear-step2-error').textContent='It\'s DELETE in caps, genius. Focus. 🔡';
    const inp=document.getElementById('clear-confirm-text');
    inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),400); return;
  }
  document.getElementById('clear-step2-error').textContent='';
  if(clearScope==='user'){ showClearStep('3a'); }
  else {
    document.getElementById('clear-editor-pw').value='';
    document.getElementById('clear-step3b-error').textContent='';
    showClearStep('3b');
    setTimeout(()=>document.getElementById('clear-editor-pw').focus(),80);
  }
}
function advanceClearStep3b(){
  const pw=document.getElementById('clear-editor-pw').value;
  if(pw!==EDITOR_PASSWORD){
    document.getElementById('clear-step3b-error').textContent='That\'s not the password, smarty 🔐';
    const inp=document.getElementById('clear-editor-pw');
    inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),400); return;
  }
  closeClearModal(); doClearAllData();
}
function setupClearDataEvents(){
  document.getElementById('clear-data-btn').addEventListener('click',openClearModal);
  document.getElementById('clear-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('clear-modal')) closeClearModal(); });
  document.getElementById('clear-cancel-1').addEventListener('click',closeClearModal);
  document.getElementById('clear-export-then-next').addEventListener('click',()=>{
    exportData();
    setTimeout(()=>{
      clearScope=document.querySelector('input[name="clear-scope"]:checked').value;
      setStep2Sub(); document.getElementById('clear-confirm-text').value=''; document.getElementById('clear-step2-error').textContent='';
      showClearStep(2); setTimeout(()=>document.getElementById('clear-confirm-text').focus(),80);
    },400);
  });
  document.getElementById('clear-next-1').addEventListener('click',()=>{
    clearScope=document.querySelector('input[name="clear-scope"]:checked').value;
    setStep2Sub(); document.getElementById('clear-confirm-text').value=''; document.getElementById('clear-step2-error').textContent='';
    showClearStep(2); setTimeout(()=>document.getElementById('clear-confirm-text').focus(),80);
  });
  document.getElementById('clear-back-2').addEventListener('click',()=>showClearStep(1));
  document.getElementById('clear-next-2').addEventListener('click',advanceClearStep2);
  document.getElementById('clear-confirm-text').addEventListener('keydown',e=>{ if(e.key==='Enter') advanceClearStep2(); });
  document.getElementById('clear-cancel-3a').addEventListener('click',closeClearModal);
  document.getElementById('clear-confirm-3a').addEventListener('click',()=>{ closeClearModal(); doClearUserData(); });
  document.getElementById('clear-cancel-3b').addEventListener('click',closeClearModal);
  document.getElementById('clear-confirm-3b').addEventListener('click',advanceClearStep3b);
  document.getElementById('clear-editor-pw').addEventListener('keydown',e=>{ if(e.key==='Enter') advanceClearStep3b(); });
}

// ---- Mobile Tabs ----
function setupMobileTabs(){
  const bar=document.getElementById('mobile-tabs');
  if(window.innerWidth<=768) bar.style.display='flex';
  window.addEventListener('resize',()=>{ bar.style.display=window.innerWidth<=768?'flex':'none'; });
  bar.querySelectorAll('.mobile-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      switchSection(tab.dataset.section);
      bar.querySelectorAll('.mobile-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ---- Right-Click Disable ----
function setupRightClickDisable(){ document.addEventListener('contextmenu',e=>e.preventDefault()); }

// ---- Check App Update ----
async function checkAppUpdate(){
  showToast('Suffu is scanning the horizon for updates... 📡','info');
  try {
    const reg=await navigator.serviceWorker.getRegistration();
    if(reg){
      await reg.update();
      if(reg.waiting||reg.installing){
        showToast('Suffu found a fresh update! Applying the glow-up now... Stay tuned! ✨','success');
        setTimeout(()=>window.location.reload(),2000);
      } else {
        showToast('Suffu checked everywhere... you\'re already on the peak. No updates needed! 😎','info');
      }
    } else { showToast('No tracker found to update! Are you even real? 👤','warning'); }
  } catch(e){ showToast('Suffu\'s radar is acting up... try again later! ⛈️','error'); }
}
