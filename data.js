// ============================================================
// DATA — defaultData, load, save, normalize, cloud sync
// ============================================================
function defaultData() {
  const now   = new Date();
  const pad   = n => String(n).padStart(2,'0');
  const today = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
  const examD = '2026-09-01';
  const defaultTicks = {};
  const defaultPlans = {};
  SUBJECTS.forEach(s => { defaultTicks[s] = false; defaultPlans[s] = ''; });
  return {
    settings: { examDate: examD, plannerStartDate: today, theme: (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark', userName:'', alwaysFullscreen: false },
    subjects: SUBJECTS.map(id => ({ id, name:SUBJECT_LABELS[id], chapters:[] })),
    planner: [],
    tests: [],
    reminders: [],
    reminderHistory: [],
    schedules: { allDaysExceptSundays:{slots:[]}, sundays:{slots:[]} }
  };
}

function normalizeData() {
  const def = defaultData();
  if (!data.settings) data.settings = def.settings;
  if (!data.settings.plannerStartDate) data.settings.plannerStartDate = def.settings.plannerStartDate;
  if (!data.settings.examDate)         data.settings.examDate         = def.settings.examDate;
  if (!data.settings.theme)            data.settings.theme            = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  if (data.settings.userName === undefined) data.settings.userName = '';
  if (data.settings.alwaysFullscreen === undefined) data.settings.alwaysFullscreen = false;
  if (data.settings.plannerStartDate >= data.settings.examDate) {
    data.settings.plannerStartDate = def.settings.plannerStartDate;
    data.settings.examDate         = def.settings.examDate;
  }
  if (data.settings.examDate < toDateStrSimple(new Date())) {
    data.settings.examDate = def.settings.examDate;
  }
  if (!data.subjects) data.subjects = def.subjects;
  if (!data.planner)  data.planner  = [];
  if (!data.tests)    data.tests    = [];
  if (!data.reminders) data.reminders = [];
  if (!data.reminderHistory) data.reminderHistory = [];
  if (!data.schedules) data.schedules = def.schedules;
  SCHED_KEYS.forEach(k => { if (!data.schedules[k]) data.schedules[k] = {slots:[]}; });

  // === MIGRATION: 6 subjects → 8 subjects ===
  const hasOldTaxation  = data.subjects.some(s => s.id === 'taxation');
  const hasOldFmsm      = data.subjects.some(s => s.id === 'fmsm');
  const hasNewIncomeTax = data.subjects.some(s => s.id === 'incometax');

  if ((hasOldTaxation || hasOldFmsm) && !hasNewIncomeTax) {
    const newSubjects = [];
    data.subjects.forEach(s => {
      if (s.id === 'taxation') {
        newSubjects.push({ id: 'incometax', name: SUBJECT_LABELS['incometax'], chapters: s.chapters || [] });
        newSubjects.push({ id: 'gst', name: SUBJECT_LABELS['gst'], chapters: [] });
      } else if (s.id === 'fmsm') {
        newSubjects.push({ id: 'fm', name: SUBJECT_LABELS['fm'], chapters: s.chapters || [] });
        newSubjects.push({ id: 'sm', name: SUBJECT_LABELS['sm'], chapters: [] });
      } else {
        newSubjects.push(s);
      }
    });
    data.subjects = newSubjects;
    data.planner.forEach(row => {
      if (row.ticks) {
        if (row.ticks.taxation !== undefined) { row.ticks.incometax = row.ticks.taxation; delete row.ticks.taxation; }
        if (row.ticks.fmsm !== undefined)     { row.ticks.fm = row.ticks.fmsm; delete row.ticks.fmsm; }
        if (row.ticks.gst === undefined)      row.ticks.gst = false;
        if (row.ticks.sm === undefined)       row.ticks.sm = false;
      }
      if (row.plans) {
        if (row.plans.taxation !== undefined) { row.plans.incometax = row.plans.taxation; delete row.plans.taxation; }
        if (row.plans.fmsm !== undefined)     { row.plans.fm = row.plans.fmsm; delete row.plans.fmsm; }
        if (row.plans.gst === undefined)      row.plans.gst = '';
        if (row.plans.sm === undefined)       row.plans.sm = '';
      }
    });
    data.tests.forEach(t => {
      if (t.subject === 'taxation') t.subject = 'incometax';
      if (t.subject === 'fmsm')     t.subject = 'fm';
    });
    if (data.reminders) {
      data.reminders.forEach(r => {
        if (r.subject === 'taxation') r.subject = 'incometax';
        if (r.subject === 'fmsm')     r.subject = 'fm';
      });
    }
  }

  SUBJECTS.forEach(id => {
    if (!data.subjects.some(s => s.id === id)) {
      data.subjects.push({ id, name: SUBJECT_LABELS[id], chapters: [] });
    }
  });
  data.subjects.sort((a, b) => SUBJECTS.indexOf(a.id) - SUBJECTS.indexOf(b.id));
  data.subjects = data.subjects.filter(s => SUBJECTS.includes(s.id));

  data.planner.forEach(row => {
    if (!row.ticks) row.ticks = {};
    if (!row.plans) row.plans = {};
    SUBJECTS.forEach(s => {
      if (row.ticks[s] === undefined) row.ticks[s] = false;
      if (row.plans[s] === undefined) row.plans[s] = '';
    });
  });
}

async function loadData() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    data = raw ? JSON.parse(raw) : defaultData();
    normalizeData();
  } catch(e) { data = defaultData(); }

  if (window._fbDb && window._doc && window._getDoc && currentUser) {
    try {
      setConnStatus('syncing');
      const ref  = window._doc(window._fbDb, 'users', currentUser.uid, 'data', 'appdata');
      const snap = await window._getDoc(ref);
      if (snap.exists()) {
        const cloud = snap.data().appdata;
        if (cloud) {
          data = JSON.parse(cloud);
          normalizeData();
          localStorage.setItem(getStorageKey(), JSON.stringify(data));
        }
      }
      setConnStatus('online');
    } catch(e) {
      setConnStatus(navigator.onLine ? 'online' : 'offline');
    }
  }
}

function saveData() {
  localStorage.setItem(getStorageKey(), JSON.stringify(data));
  _syncDirty = true;
}

async function _flushToCloud() {
  if (!_syncDirty || !window._fbDb || !window._doc || !window._setDoc || !currentUser) return;
  setConnStatus('syncing');
  try {
    const ref = window._doc(window._fbDb, 'users', currentUser.uid, 'data', 'appdata');
    await window._setDoc(ref, { appdata: JSON.stringify(data) }, { merge: true });
    _syncDirty = false;
    _lastSyncTime = Date.now();
    setConnStatus('online');
  } catch(e) {
    setConnStatus(navigator.onLine ? 'online' : 'offline');
  }
}

function startBatchSync() {
  if (_syncInterval) clearInterval(_syncInterval);
  _syncInterval = setInterval(() => _flushToCloud(), 30000);
  window.addEventListener('beforeunload', () => {
    if (_syncDirty && window._fbDb && currentUser) {
      const ref = window._doc(window._fbDb, 'users', currentUser.uid, 'data', 'appdata');
      try { window._setDoc(ref, { appdata: JSON.stringify(data) }, { merge: true }); } catch(e) {}
    }
  });
}

function stopBatchSync() {
  if (_syncInterval) { clearInterval(_syncInterval); _syncInterval = null; }
}

// ---- Planner helpers ----
function getOrCreatePlannerRow(date) {
  let row = data.planner.find(r => r.date === date);
  if (!row) {
    row = { date, ticks:{}, plans:{} };
    SUBJECTS.forEach(s => { row.ticks[s] = false; row.plans[s] = ''; });
    data.planner.push(row);
  }
  if (!row.plans) row.plans = {};
  return row;
}

function getAllPlannerDates() {
  const { plannerStartDate, examDate } = data.settings;
  if (!plannerStartDate || !examDate) return [];
  return getDaysBetween(plannerStartDate, examDate);
}
