// ============================================================
// CONFIG — Constants, State, Labels
// ============================================================
const getStorageKey = () => currentUser ? `jgsuffu_inter_data_${currentUser.uid}` : 'jgsuffu_inter_data';

const SUBJECTS = ['advacc', 'law', 'incometax', 'gst', 'audit', 'costing', 'fm', 'sm'];
const GROUPS = {
  group1: ['advacc', 'law', 'incometax', 'gst'],
  group2: ['audit', 'costing', 'fm', 'sm']
};
const GROUP_LABELS = { group1: 'Group 1', group2: 'Group 2' };
const SUBJECT_LABELS = {
  advacc: 'Adv. Accounting', law: 'Corporate & Other Laws',
  incometax: 'Income Tax', gst: 'GST',
  audit: 'Auditing & Ethics', costing: 'Cost & MA',
  fm: 'Financial Mgmt', sm: 'Strategic Mgmt'
};
const MOBILE_SUBJECT_LABELS = {
  advacc: 'Acc', law: 'Law',
  incometax: 'I.Tax', gst: 'GST',
  audit: 'Audit', costing: 'Cost',
  fm: 'FM', sm: 'SM'
};
const SUBJECT_COLORS = {
  advacc: '#7B8CDE', law: '#56C596',
  incometax: '#F4A261', gst: '#E8C547',
  audit: '#60B4D8', costing: '#E07BAC',
  fm: '#A78BFA', sm: '#FF8A80'
};
const EDITOR_PASSWORD = 'JG. SUFFU@2005';
const SCHED_KEYS = ['allDaysExceptSundays', 'sundays'];

// ---- Mutable global state ----
let data = {};
let editorUnlocked = false;
let pendingImportFile = null;
let testConfidenceVal = 3;
let currentSection = 'planner';
let openSubjects = new Set();
let currentUser = null;

// Batch sync state
let _syncDirty = false;
let _syncInterval = null;
let _lastSyncTime = null;

// Notification timers
let notificationTimers = {};
let midnightTimer = null;

// Reminder subtab state
let reminderTab = 'active';

// Planner scroll state
let plannerScrolledToToday = false;
let _plannerScrollHandler = null;

// Test edit state
let testEditId = null;
let testEditConfidenceVal = 3;

// Welcome modal timers
let welcomeAutoTimer = null;
let welcomeCountdownInterval = null;

const FIRST_LAUNCH_TITLE = "Welcome to Suffu's World 👋";

function isMobile() { return window.innerWidth <= 768; }
function getSubjectLabel(id) {
  if (isMobile()) return MOBILE_SUBJECT_LABELS[id] || id;
  return SUBJECT_LABELS[id] || id;
}
function triggerHaptic(duration = 40) {
  if (navigator.vibrate) { try { navigator.vibrate(duration); } catch(e) {} }
}
