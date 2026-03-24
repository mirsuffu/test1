// ============================================================
// API-SYNC / INIT — renderAll, setupEvents, init
// ============================================================

function renderAll(){
  applyTheme(data.settings.theme||'dark');
  updateTopBar(); renderPlanner(); renderSchedule();
  renderSubjectsInternal(); renderSettings(); renderTestTable();
  if(currentSection==='metrics') renderMetrics();
}

function setupEvents(){
  document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>switchSection(item.dataset.section)));
  document.getElementById('theme-toggle-label').addEventListener('click',toggleTheme);
  document.getElementById('fullscreen-btn').addEventListener('click',toggleFullscreen);
  document.getElementById('fullscreen-toggle-label').addEventListener('click',()=>{
    data.settings.alwaysFullscreen=!data.settings.alwaysFullscreen; saveData(); renderSettings();
    if(data.settings.alwaysFullscreen&&!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else if(!data.settings.alwaysFullscreen&&document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    showToast(data.settings.alwaysFullscreen?'Fullscreen on every load 🖥️':'Fullscreen preference off','info');
  });
  document.getElementById('editor-toggle-label').addEventListener('click',handleEditorToggle);
  document.getElementById('editor-cancel-btn').addEventListener('click',closeEditorModal);
  document.getElementById('editor-confirm-btn').addEventListener('click',confirmEditorPassword);
  document.getElementById('editor-pw-input').addEventListener('keydown',e=>{ if(e.key==='Enter') confirmEditorPassword(); if(e.key==='Escape') closeEditorModal(); });
  document.getElementById('editor-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('editor-modal')) closeEditorModal(); });
  document.addEventListener('keydown',e=>{ if(e.ctrlKey&&e.shiftKey&&e.key==='E'){ e.preventDefault(); handleEditorToggle(); } });
  document.getElementById('save-settings-btn').addEventListener('click',saveSettings);
  document.getElementById('scroll-today-btn').addEventListener('click',scrollToToday);

  // Global click feedback sound
  document.addEventListener('click',function(e){
    if(e.target.matches('.btn,.icon-btn,.login-btn,.mtm-item,.pcard-bulk')) playClick('btn');
  },true);

  // Save name from settings
  (function(){
    const snb=document.getElementById('save-name-btn'), sni=document.getElementById('setting-user-name');
    if(snb) snb.addEventListener('click',()=>{
      const n=(sni?sni.value:'').trim(); data.settings.userName=n; saveData(); updateTopBar();
      showToast(n?'Hey '+n+'! Name updated 👋':'Name cleared.','success');
    });
    if(sni) sni.addEventListener('keydown',e=>{ if(e.key==='Enter'&&snb) snb.click(); });
  })();

  document.getElementById('check-update-btn').addEventListener('click',checkAppUpdate);
  document.getElementById('export-btn').addEventListener('click',exportData);
  document.getElementById('import-input').addEventListener('change',handleImportFile);

  // Reminders
  document.getElementById('add-reminder-btn').addEventListener('click',openReminderModal);
  document.getElementById('reminder-cancel-btn').addEventListener('click',closeReminderModal);
  document.getElementById('reminder-save-btn').addEventListener('click',saveReminder);
  document.getElementById('rm-category').addEventListener('change',updateReminderSubjectVisibility);
  document.getElementById('rf-category').addEventListener('change',renderReminders);
  document.getElementById('rf-status').addEventListener('change',renderReminders);
  document.getElementById('reminder-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('reminder-modal')) closeReminderModal(); });

  document.getElementById('import-cancel-btn').addEventListener('click',()=>{ pendingImportFile=null; document.getElementById('import-modal').classList.remove('show'); });
  document.getElementById('import-confirm-btn').addEventListener('click',confirmImport);
  document.getElementById('import-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('import-modal')){ pendingImportFile=null; document.getElementById('import-modal').classList.remove('show'); } });

  // Test modal
  ['tf-coverage','tf-score'].forEach(id=>{ document.getElementById(id).addEventListener('keydown',e=>{ if(e.key==='Enter') saveTestRecord(); }); });
  document.getElementById('add-test-btn').addEventListener('click',openTestModal);
  document.getElementById('test-cancel-btn').addEventListener('click',closeTestModal);
  document.getElementById('test-save-btn').addEventListener('click',saveTestRecord);
  document.getElementById('test-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('test-modal')) closeTestModal(); });
  document.querySelectorAll('#tf-confidence-stars .rating-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ playClick('star'); updateTestStars(parseInt(btn.dataset.val)); });
  });

  // Test edit modal
  document.getElementById('test-edit-cancel-btn').addEventListener('click',closeTestEditModal);
  document.getElementById('test-edit-save-btn').addEventListener('click',saveTestEdit);
  document.getElementById('test-edit-modal').addEventListener('click',e=>{ if(e.target===document.getElementById('test-edit-modal')) closeTestEditModal(); });
  document.querySelectorAll('#te-confidence-stars .rating-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ playClick('star'); updateTestEditStars(parseInt(btn.dataset.val)); });
  });
  ['te-coverage','te-score'].forEach(id=>{ document.getElementById(id).addEventListener('keydown',e=>{ if(e.key==='Enter') saveTestEdit(); }); });

  // Test filters
  document.getElementById('test-filter-subj')?.addEventListener('change',()=>{ triggerHaptic(30); renderTestTable(); });
  document.getElementById('test-filter-type')?.addEventListener('change',()=>{ triggerHaptic(30); renderTestTable(); });

  // Welcome close
  document.getElementById('welcome-dive-btn').addEventListener('click',closeWelcome);

  // Re-draw donut on theme change
  new MutationObserver(()=>{ if(currentSection==='metrics') setTimeout(renderMetrics,50); })
    .observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}

function init(){
  setupEvents();
  setupClearDataEvents();
  setupRightClickDisable();
  setupMobileTabs();
  setupLoginEvents();
  initConnStatus();
  _setupConfirmActionModal();

  let _lastMobile=window.innerWidth<=768;
  window.addEventListener('resize',()=>{
    if(!currentUser) return;
    const nowMobile=window.innerWidth<=768;
    if(nowMobile!==_lastMobile){
      _lastMobile=nowMobile;
      if(currentSection==='planner')   renderPlanner();
      if(currentSection==='test')      renderTestTable();
      if(currentSection==='subjects')  renderSubjectsInternal();
    }
  });
}

// ---- Zoom blocking ----
document.addEventListener('wheel',(e)=>{ if(e.ctrlKey) e.preventDefault(); },{passive:false});
document.addEventListener('keydown',(e)=>{ if(e.ctrlKey&&(e.key==='+'||e.key==='='||e.key==='-')) e.preventDefault(); });
document.addEventListener('gesturestart',(e)=>{ e.preventDefault(); });
