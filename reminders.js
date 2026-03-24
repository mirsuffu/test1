// ============================================================
// REMINDERS — Active, History, Archive, Notifications
// ============================================================

function switchReminderTab(tab){
  reminderTab=tab;
  const filterBar=document.getElementById('reminder-filter-bar');
  if(filterBar) filterBar.style.display=tab==='active'?'flex':'none';
  renderReminders();
}

function archiveDoneReminders(){
  if(!data.reminders) return;
  if(!data.reminderHistory) data.reminderHistory=[];
  const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const toArchive=data.reminders.filter(r=>r.done&&r.doneAt&&new Date(r.doneAt)<todayStart);
  if(toArchive.length){
    toArchive.forEach(r=>{ data.reminderHistory.push(Object.assign({},r,{archivedAt:toDateStrSimple(new Date()),archiveType:'completed'})); });
    data.reminders=data.reminders.filter(r=>!(r.done&&r.doneAt&&new Date(r.doneAt)<todayStart));
  }
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
  const cutoffStr=toDateStrSimple(cutoff);
  data.reminderHistory=data.reminderHistory.filter(h=>(h.archivedAt||'')>=cutoffStr);
  if(toArchive.length) saveData();
}

function renderReminders(){
  const activeTabEl=document.getElementById('rem-tab-active');
  const historyTabEl=document.getElementById('rem-tab-history');
  const activeWrap=document.getElementById('reminders-list-wrap');
  const historyWrap=document.getElementById('reminder-history-wrap');
  const filterBar=document.getElementById('reminder-filter-bar');
  if(!activeWrap||!historyWrap) return;
  if(reminderTab==='history'){
    if(activeTabEl)  activeTabEl.classList.remove('rem-tab-on');
    if(historyTabEl) historyTabEl.classList.add('rem-tab-on');
    activeWrap.style.display='none'; historyWrap.style.display='flex';
    if(filterBar) filterBar.style.display='none';
    renderReminderHistory(); return;
  }
  if(activeTabEl)  activeTabEl.classList.add('rem-tab-on');
  if(historyTabEl) historyTabEl.classList.remove('rem-tab-on');
  activeWrap.style.display='flex'; historyWrap.style.display='none';
  if(filterBar) filterBar.style.display='flex';
  activeWrap.innerHTML='';
  const catFilter=document.getElementById('rf-category').value;
  const statFilter=document.getElementById('rf-status').value;
  let reminders=[].concat(data.reminders||[]).sort((a,b)=>a.datetime.localeCompare(b.datetime));
  if(catFilter!=='all') reminders=reminders.filter(r=>r.category===catFilter);
  if(statFilter==='pending') reminders=reminders.filter(r=>!r.done);
  if(statFilter==='done')    reminders=reminders.filter(r=>r.done);
  if(reminders.length===0){
    activeWrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2);font-size:14px;">No reminders found. Add one to stay on track! 🚀</div>'; return;
  }
  reminders.forEach(r=>{
    const card=document.createElement('div');
    card.className='rcard glass-card'+(r.done?' done':'');
    const dt=new Date(r.datetime);
    const timeStr=dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const dateStr=dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
    const doneHint=r.done?' <span class="rcard-done-hint">✓ Done · moves to History at midnight</span>':'';
    const subjHtml=r.subject?'<span class="rcard-subject">📚 '+(SUBJECT_LABELS[r.subject]||r.subject)+'</span>':'';
    card.innerHTML=
      '<div class="rcard-check'+(r.done?' rcard-checked':'')+'" onclick="toggleReminderDone(\''+r.id+'\')">✓</div>'+
      '<div class="rcard-body">'+
        '<div class="rcard-title">'+r.title+doneHint+'</div>'+
        '<div class="rcard-meta">'+
          '<span class="rcard-time">⏰ '+dateStr+', '+timeStr+'</span>'+
          '<span class="rcard-category '+r.category.toLowerCase()+'">'+r.category+'</span>'+
          subjHtml+
        '</div>'+
      '</div>'+
      '<div class="rcard-del" onclick="deleteReminderToHistory(\''+r.id+'\')">🗑</div>';
    activeWrap.appendChild(card);
  });
}

function renderReminderHistory(){
  const wrap=document.getElementById('reminder-history-wrap'); if(!wrap) return;
  wrap.innerHTML='';
  const history=[].concat(data.reminderHistory||[]).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||''));
  if(history.length===0){
    wrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text2);font-size:14px;">No history yet. Completed and deleted reminders from the last 30 days appear here. 📋</div>'; return;
  }
  history.forEach(h=>{
    const card=document.createElement('div'); card.className='rcard glass-card rcard-history';
    const dt=new Date(h.datetime);
    const timeStr=dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const dateStr=dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
    const isFuture=new Date(h.datetime)>new Date();
    const typeBadge='<span class="rcard-history-badge '+h.archiveType+'">'+(h.archiveType==='deleted'?'Deleted':'Completed')+'</span>';
    const restoreBtn=isFuture?'<button class="btn btn-surface rcard-restore-btn" onclick="restoreReminder(\''+h.id+'\')">↩ Restore</button>':'';
    const permDelBtn='<button class="btn btn-danger rcard-perm-del-btn" onclick="permanentlyDeleteReminder(\''+h.id+'\')">🗑</button>';
    const subjHtml=h.subject?'<span class="rcard-subject">📚 '+(SUBJECT_LABELS[h.subject]||h.subject)+'</span>':'';
    card.innerHTML=
      '<div class="rcard-body">'+
        '<div class="rcard-title" style="display:flex;align-items:center;gap:8px;">'+h.title+' '+typeBadge+'</div>'+
        '<div class="rcard-meta">'+
          '<span class="rcard-time">⏰ '+dateStr+', '+timeStr+'</span>'+
          '<span class="rcard-category '+h.category.toLowerCase()+'">'+h.category+'</span>'+
          subjHtml+
          '<span style="font-size:10px;color:var(--text2);">Archived '+(h.archivedAt||'—')+'</span>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">'+restoreBtn+permDelBtn+'</div>';
    wrap.appendChild(card);
  });
}

function openReminderModal(){
  const modal=document.getElementById('reminder-modal'); modal.classList.add('show');
  document.getElementById('rm-title').value='';
  document.getElementById('rm-datetime').value='';
  document.getElementById('rm-category').value='Study';
  const subSelect=document.getElementById('rm-subject');
  subSelect.innerHTML='<option value="">None</option>';
  SUBJECTS.forEach(id=>{ subSelect.innerHTML+='<option value="'+id+'">'+SUBJECT_LABELS[id]+'</option>'; });
  updateReminderSubjectVisibility();
}
function closeReminderModal(){ document.getElementById('reminder-modal').classList.remove('show'); }
function updateReminderSubjectVisibility(){
  const isStudy=document.getElementById('rm-category').value==='Study';
  document.getElementById('rm-subject-field').style.display=isStudy?'block':'none';
}

function saveReminder(){
  const title=document.getElementById('rm-title').value.trim();
  const datetime=document.getElementById('rm-datetime').value;
  const category=document.getElementById('rm-category').value;
  const subject=category==='Study'?document.getElementById('rm-subject').value:'';
  if(!title||!datetime){ showToast('Please enter title and date/time! ⏰','warning'); return; }
  if(new Date(datetime)<=new Date()){ showToast('That time has already passed! Pick a future time ⏰','warning'); return; }
  const id='rem_'+Date.now();
  const reminder={id,title,datetime,category,subject,done:false,notified:false,doneAt:null};
  data.reminders.push(reminder); saveData(); closeReminderModal(); renderReminders();
  scheduleNotification(reminder);
  showToast('Reminder set! I\'ll keep you posted 🔔','success');
}

function toggleReminderDone(id){
  const r=data.reminders.find(rem=>rem.id===id);
  if(r){
    r.done=!r.done; r.doneAt=r.done?new Date().toISOString():null;
    if(r.done&&notificationTimers[id]){ clearTimeout(notificationTimers[id]); delete notificationTimers[id]; }
    saveData(); renderReminders(); playClick('tick');
    if(r.done) showToast('Done! Moves to History at midnight 🌙','success');
  }
}

function deleteReminderToHistory(id){
  const r=data.reminders.find(rem=>rem.id===id); if(!r) return;
  if(!data.reminderHistory) data.reminderHistory=[];
  data.reminderHistory.push(Object.assign({},r,{archivedAt:toDateStrSimple(new Date()),archiveType:'deleted'}));
  data.reminders=data.reminders.filter(rem=>rem.id!==id);
  if(notificationTimers[id]){ clearTimeout(notificationTimers[id]); delete notificationTimers[id]; }
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
  data.reminderHistory=data.reminderHistory.filter(h=>(h.archivedAt||'')>=toDateStrSimple(cutoff));
  saveData(); renderReminders();
  showToast('Moved to History. Restore anytime if needed 📋','info');
}

function restoreReminder(id){
  const h=(data.reminderHistory||[]).find(x=>x.id===id); if(!h) return;
  const restored={id:h.id,title:h.title,datetime:h.datetime,category:h.category,subject:h.subject,done:false,notified:false,doneAt:null};
  data.reminders.push(restored);
  data.reminderHistory=data.reminderHistory.filter(x=>x.id!==id);
  saveData(); scheduleNotification(restored); renderReminderHistory();
  showToast('Reminder restored! 🔔','success');
}

function permanentlyDeleteReminder(id){
  data.reminderHistory=(data.reminderHistory||[]).filter(x=>x.id!==id);
  saveData(); renderReminderHistory();
  showToast('Permanently deleted.','info');
}

// ---- Notifications ----
async function initNotifications(){
  if(!('Notification' in window)) return;
  if('serviceWorker' in navigator){ try { await navigator.serviceWorker.register('sw.js'); } catch(e){} }
  rescheduleAllNotifications();
}

async function requestNotificationPermission(){
  if(!('Notification' in window)) return false;
  if(Notification.permission==='default'){
    const perm=await Notification.requestPermission();
    if(perm==='granted') rescheduleAllNotifications();
    return perm==='granted';
  }
  return Notification.permission==='granted';
}

function scheduleNotification(reminder){
  if(!reminder||reminder.done||reminder.notified) return;
  const target=new Date(reminder.datetime).getTime();
  const now=Date.now();
  if(target>now){
    notificationTimers[reminder.id]=setTimeout(()=>{
      showSuffuNotification('Suffu Says...',reminder.title);
      reminder.notified=true; saveData();
      if(currentSection==='reminders') renderReminders();
      delete notificationTimers[reminder.id];
    },target-now);
  }
}

function rescheduleAllNotifications(){
  Object.keys(notificationTimers).forEach(id=>clearTimeout(notificationTimers[id]));
  notificationTimers={};
  const now=Date.now(), today=new Date();
  data.reminders.forEach(r=>{
    if(!r.done&&!r.notified){
      const target=new Date(r.datetime).getTime();
      if(target>now){
        notificationTimers[r.id]=setTimeout(()=>{
          showSuffuNotification('Suffu Says...',r.title);
          r.notified=true; saveData();
          if(currentSection==='reminders') renderReminders();
          delete notificationTimers[r.id];
        },target-now);
      }
    }
  });
  const scheduleLookahead=(dateObj,isTomorrow=false)=>{
    const isSun=dateObj.getDay()===0;
    const key=isSun?'sundays':'allDaysExceptSundays';
    const slots=data.schedules[key]?.slots||[];
    slots.forEach((s,idx)=>{
      if(s.notify&&s.start){
        const [h,m]=s.start.split(':').map(Number);
        const target=new Date(dateObj); target.setHours(h,m,0,0);
        const notifyTime=target.getTime()-(10*60*1000);
        if(notifyTime>now){
          const id=`slot_${key}_${idx}_${isTomorrow?'next':'curr'}`;
          notificationTimers[id]=setTimeout(()=>{
            showSuffuNotification('Suffu Says...',`Time for: ${s.label}`);
            delete notificationTimers[id];
          },notifyTime-now);
        }
      }
    });
  };
  scheduleLookahead(today);
  const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  scheduleLookahead(tomorrow,true);
  if(midnightTimer) clearTimeout(midnightTimer);
  const nextMidnight=new Date(today); nextMidnight.setHours(24,0,1,0);
  midnightTimer=setTimeout(()=>{
    archiveDoneReminders(); rescheduleAllNotifications(); checkDailyExamNudge();
  },nextMidnight.getTime()-now);
}

function checkDailyExamNudge(){
  const days=daysUntil(data.settings.examDate);
  if([30,15,7,3,1].includes(days)){
    const target=new Date(); target.setHours(6,0,0,0);
    if(target.getTime()>Date.now()){
      setTimeout(()=>{ showSuffuNotification('Suffu Says...',`${days} days until the exam. Keep pushing!`); },target.getTime()-Date.now());
    }
  }
}

async function showSuffuNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  const options={body,icon:'logo.png',badge:'logo.png',vibrate:[200,100,200],data:{url:window.location.href}};
  if('serviceWorker' in navigator){
    const reg=await navigator.serviceWorker.ready;
    reg.showNotification(title,options);
  } else { new Notification(title,options); }
}
