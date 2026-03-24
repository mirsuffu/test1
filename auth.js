// ============================================================
// AUTH — Login, Logout, Session, Welcome & Name modals
// ============================================================

function hideLoader() {
  const loader=document.getElementById('app-loader');
  if(loader){ loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',400); }
}

function showLoginScreen() {
  localStorage.removeItem('jgsuffu_logged_in');
  localStorage.removeItem(getStorageKey());
  document.documentElement.classList.remove('auth-hint-logged-in');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').style.display='none';
  hideLoader();
  setTimeout(()=>document.getElementById('login-email').focus(),120);
}

function hideLoginScreen() {
  localStorage.setItem('jgsuffu_logged_in','true');
  document.documentElement.classList.add('auth-hint-logged-in');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').style.display='';
  hideLoader();
}

function showLoginError(msg) {
  document.getElementById('login-error').textContent=msg;
  const inp=document.getElementById('login-password');
  inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),400);
}

var loginAttempts=0;
function handleLogin() {
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  document.getElementById('login-error').textContent='';
  if(!email||!password){ showLoginError('Bhai, fields are empty. Try harder. 😐'); return; }
  const btn=document.getElementById('login-btn');
  btn.disabled=true; btn.textContent='Signing in...';
  window._signInWithEmailAndPassword(window._fbAuth,email,password)
    .then(()=>{
      loginAttempts=0;
      document.getElementById('login-help').style.display='none';
      btn.disabled=false; btn.textContent='Sign In';
    })
    .catch(err=>{
      btn.disabled=false; btn.textContent='Sign In';
      loginAttempts++;
      const msg=(err.code==='auth/wrong-password'||err.code==='auth/user-not-found'||err.code==='auth/invalid-credential')
        ?'Nah nah, you can\'t bypass Suffu 😉':'Login error: '+(err.message||err.code);
      showLoginError(msg);
      if(loginAttempts>=2) document.getElementById('login-help').style.display='block';
    });
}

function openLogoutModal()  { document.getElementById('logout-modal').classList.add('show'); playSound('pop'); }
function closeLogoutModal() { document.getElementById('logout-modal').classList.remove('show'); }

function confirmLogout() {
  localStorage.removeItem('jgsuffu_logged_in');
  localStorage.removeItem(getStorageKey());
  document.documentElement.classList.remove('auth-hint-logged-in');
  if(window._fbAuth) window._signOut(window._fbAuth).catch(()=>{});
  currentUser=null;
  stopBatchSync();
  closeLogoutModal();
  document.getElementById('login-email').value='';
  document.getElementById('login-password').value='';
  document.getElementById('login-error').textContent='';
  showLoginScreen();
}

function setupLoginEvents() {
  document.getElementById('login-btn').addEventListener('click',handleLogin);
  document.getElementById('login-email').addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('login-password').focus();
  });
  document.getElementById('login-password').addEventListener('keydown',e=>{
    if(e.key==='Enter') handleLogin();
  });
  document.getElementById('logout-btn').addEventListener('click',openLogoutModal);
  document.getElementById('logout-cancel-btn').addEventListener('click',closeLogoutModal);
  document.getElementById('logout-confirm-btn').addEventListener('click',confirmLogout);
  document.getElementById('logout-modal').addEventListener('click',e=>{
    if(e.target===document.getElementById('logout-modal')) closeLogoutModal();
  });
}

// ---- Welcome & Daily Modals ----
function getDisplayName() {
  const n=(data.settings&&data.settings.userName||'').trim();
  if(n) return n;
  return new Date().getDate()%2===0?'Champ':'Dear';
}

function getFirstLaunchBody() {
  const n=getDisplayName();
  return [
    n+", this is your personal CA Intermediate study companion — built around your schedule, your subjects, and your pace.\n\n",
    "Here's what you can do here:\n",
    "  📅  Planner — Plan and tick off what you finish\n",
    "  📝  Test — Track every test you appear in with score and confidence\n",
    "  🕐  Schedule — Set and see your timetable for different day types\n",
    "  📚  Subjects — Add chapters, rate difficulty and confidence\n",
    "  📊  Metrics — Watch your progress build over time\n\n",
    "🔒 Most editing is behind Editor Mode — password-locked so you never cross Suffu's Mind [Ahh, Who can cross Suffu 😏].\n\n",
    "May/November 2026 is the target. Every day counts.\n\n",
    "Not to mention, but someone genuinely wants your success.\n",
    "— JG. SUFFU"
  ].join('');
}

function getDailyBody() {
  const now=new Date(), h=now.getHours();
  const greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const dayName=now.toLocaleDateString('en-IN',{weekday:'long'});
  const dateStr=now.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const days=daysUntil(data.settings.examDate);
  const daysText=days>0?`${days} days`:days===0?'Exam Day Today 🎓':'Exam has passed';
  const name=getDisplayName();
  return `${greeting}, ${name}! 🌤️\n\nToday is ${dayName}, ${dateStr}.\nYou have ${daysText} left until the exam.\n\nMake today count. Open your Planner, see what's on the table today, get to work.`;
}

function typewriterEffect(text,el,speed,onDone) {
  el.textContent=''; let i=0;
  function tick() {
    if(i<text.length){ el.textContent+=text[i++]; setTimeout(tick,speed); }
    else { if(onDone) onDone(); }
  }
  tick();
}

function startWelcomeCountdown(seconds) {
  const timerEl=document.getElementById('welcome-timer');
  let remaining=seconds;
  timerEl.textContent=`Auto-closing in ${remaining}s`;
  welcomeCountdownInterval=setInterval(()=>{
    remaining--;
    timerEl.textContent=remaining>0?`Auto-closing in ${remaining}s`:'';
    if(remaining<=0) clearInterval(welcomeCountdownInterval);
  },1000);
  welcomeAutoTimer=setTimeout(()=>closeWelcome(),seconds*1000);
}

function closeWelcome() {
  clearTimeout(welcomeAutoTimer);
  clearInterval(welcomeCountdownInterval);
  document.getElementById('welcome-overlay').classList.remove('show');
}

function showWelcomeModal(title,bodyText,typeSpeed) {
  document.getElementById('welcome-title').textContent=title;
  document.getElementById('welcome-body').textContent='';
  document.getElementById('welcome-timer').textContent='';
  document.getElementById('welcome-overlay').classList.add('show');
  typewriterEffect(bodyText,document.getElementById('welcome-body'),typeSpeed,()=>{
    startWelcomeCountdown(120);
  });
}

function showNamePrompt() {
  const modal=document.getElementById('name-modal'); if(!modal) return;
  modal.classList.add('show');
  setTimeout(()=>{ const i=document.getElementById('name-input'); if(i) i.focus(); },300);
  function doSave() {
    const n=(document.getElementById('name-input').value||'').trim();
    data.settings.userName=n; saveData(); updateTopBar();
    modal.classList.remove('show');
    setTimeout(()=>{ checkAndShowWelcome(true); },350);
  }
  document.getElementById('name-save-btn').onclick=doSave;
  document.getElementById('name-input').onkeydown=function(e){ if(e.key==='Enter') doSave(); };
}

function checkAndShowWelcome(afterNameSave) {
  if(!currentUser) return;
  const launchKey='jgsuffu_launched_'+currentUser.uid;
  const seenKey='jgsuffu_daily_seen_'+currentUser.uid;
  const hasLaunched=localStorage.getItem(launchKey);
  const lastSeen=localStorage.getItem(seenKey);
  const today=getTodayStr();
  if(!hasLaunched) {
    localStorage.setItem(launchKey,'1');
    if(!data.settings.userName&&!afterNameSave){ showNamePrompt(); return; }
    localStorage.setItem(seenKey,today);
    showWelcomeModal('Welcome, '+getDisplayName()+'! 👋',getFirstLaunchBody(),22);
  } else if(lastSeen!==today) {
    localStorage.setItem(seenKey,today);
    showWelcomeModal('👋 Hey, '+getDisplayName()+'!',getDailyBody(),28);
  }
}
