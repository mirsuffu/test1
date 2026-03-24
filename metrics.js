// ============================================================
// METRICS — Render, Donut chart, Streak, Score Trend
// ============================================================

function renderMetrics(){
  const today=getTodayStr();
  const datesUpToday=getAllPlannerDates().filter(d=>d<=today);
  const total=datesUpToday.length*SUBJECTS.length; let totalTicked=0;
  const st={}; SUBJECTS.forEach(s=>{ st[s]=0; });
  datesUpToday.forEach(date=>{
    const row=data.planner.find(r=>r.date===date);
    SUBJECTS.forEach(s=>{ if(row&&row.ticks[s]){ st[s]++; totalTicked++; } });
  });
  const pct=total>0?Math.round((totalTicked/total)*100):0;
  document.getElementById('donut-pct').textContent=pct+'%';
  document.getElementById('donut-ticks').textContent=total>0?(totalTicked+' / '+total+' ticks'):'No data yet — go tick something! 🎯';
  drawDonut(pct);

  const barsEl=document.getElementById('subj-bars'); barsEl.innerHTML='';
  const hasChapters=data.subjects.some(s=>s.chapters.length>0);
  if(!hasChapters){
    barsEl.innerHTML='<div class="empty-nudge"><span class="empty-icon">📚</span>Add chapters in <strong>Subjects</strong> to track per-subject progress.</div>';
  } else {
    SUBJECTS.forEach(s=>{
      const p=datesUpToday.length>0?Math.round((st[s]/datesUpToday.length)*100):0;
      barsEl.innerHTML+=`<div class="subj-bar-row"><span class="subj-bar-label">${getSubjectLabel(s)}</span><div class="subj-bar-track"><div class="subj-bar-fill" style="width:${p}%;background:${SUBJECT_COLORS[s]};"></div></div><span class="subj-bar-pct">${p}%</span></div>`;
    });
  }

  const confGrid=document.getElementById('conf-grid'); confGrid.innerHTML='';
  data.subjects.forEach(subj=>{
    const ac=subj.chapters.length?subj.chapters.reduce((a,c)=>a+c.confidence,0)/subj.chapters.length:0;
    const ad=subj.chapters.length?subj.chapters.reduce((a,c)=>a+c.difficulty,0)/subj.chapters.length:0;
    const fl=subj.chapters.filter(c=>c.difficulty>=3&&c.confidence<=2).length;
    const badge=v=>{ const lbl=getRatingLabel(v); return `<span class="rating-badge ${lbl}">${lbl.toUpperCase()}</span>`; };
    confGrid.innerHTML+=`<div class="conf-item"><div class="conf-item-name">${subj.name}</div><div class="conf-item-body"><div class="conf-mini-row"><span class="conf-mini-label">Confidence</span><span class="conf-mini-stars">${badge(ac)}</span></div><div class="conf-mini-row"><span class="conf-mini-label">Difficulty</span><span class="conf-mini-stars">${badge(ad)}</span></div>${fl?`<div class="flag-count">⚑ ${fl} flagged</div>`:''}</div></div>`;
  });

  // Score Trend Chart
  const scoreCanvas=document.getElementById('score-trend-canvas');
  if(scoreCanvas&&scoreCanvas.parentElement){
    const rect=scoreCanvas.parentElement.getBoundingClientRect();
    scoreCanvas.width=rect.width; scoreCanvas.height=rect.height;
    const ctx=scoreCanvas.getContext('2d');
    ctx.clearRect(0,0,scoreCanvas.width,scoreCanvas.height);
    const scoredTests=[].concat(data.tests||[])
      .sort((a,b)=>a.date.localeCompare(b.date))
      .filter(t=>t.score&&!isNaN(parseFloat(t.score)))
      .map(t=>parseFloat(t.score));
    if(scoredTests.length>0){
      const pad=20, w=scoreCanvas.width-pad*2, h=scoreCanvas.height-pad*2;
      const maxScore=Math.max(100,...scoredTests);
      const accentColor=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const bgColor=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      ctx.strokeStyle='rgba(128,128,128,0.12)'; ctx.lineWidth=1; ctx.beginPath();
      for(let i=0;i<=4;i++){ let y=pad+(h/4)*i; ctx.moveTo(pad,y); ctx.lineTo(pad+w,y); }
      ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle=accentColor; ctx.lineWidth=3; ctx.lineJoin='round';
      const stepX=scoredTests.length>1?w/(scoredTests.length-1):w;
      scoredTests.forEach((score,i)=>{
        let px=pad+i*stepX, py=pad+h-(score/maxScore)*h;
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      });
      ctx.stroke();
      ctx.fillStyle=bgColor; ctx.strokeStyle=accentColor; ctx.lineWidth=2;
      scoredTests.forEach((score,i)=>{
        let px=pad+i*stepX, py=pad+h-(score/maxScore)*h;
        ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      });
    } else {
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='12px "DM Mono", monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('No scores logged yet.',scoreCanvas.width/2,scoreCanvas.height/2);
    }
  }

  const {current,longest}=calcStreak();
  document.getElementById('streak-num').textContent=current;
  document.getElementById('streak-longest').textContent=longest;
  const daysLeft=daysUntil(data.settings.examDate);
  const tc=data.subjects.reduce((a,s)=>a+s.chapters.length,0);
  const fl=data.subjects.reduce((a,s)=>a+s.chapters.filter(c=>c.difficulty>=3&&c.confidence<=2).length,0);
  document.getElementById('days-stats').innerHTML=`<div class="stat-pill"><div class="stat-pill-num accent">${Math.max(0,daysLeft)}</div><div class="stat-pill-label">Days Left</div></div><div class="stat-pill"><div class="stat-pill-num">${tc}</div><div class="stat-pill-label">Total Chapters</div></div><div class="stat-pill"><div class="stat-pill-num success">${tc-fl}</div><div class="stat-pill-label">Clear Chapters</div></div><div class="stat-pill"><div class="stat-pill-num danger">${fl}</div><div class="stat-pill-label">Flagged</div></div>`;
}

function calcStreak(){
  const today=getTodayStr();
  const dates=getAllPlannerDates().filter(d=>d<=today).reverse();
  let cs=0, longest=0, temp=0, foundBreak=false;
  for(const d of dates){
    const row=data.planner.find(r=>r.date===d);
    const has=row&&SUBJECTS.filter(s=>row.ticks[s]).length>0;
    if(has){ temp++; if(temp>longest) longest=temp; if(!foundBreak) cs=temp; }
    else { foundBreak=true; if(cs===0) cs=0; temp=0; }
  }
  return{current:cs,longest};
}

function drawDonut(pct){
  const canvas=document.getElementById('donut-canvas'), ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,100,100);
  ctx.beginPath(); ctx.arc(50,50,38,0,Math.PI*2);
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface-el').trim();
  ctx.lineWidth=13; ctx.stroke();
  if(pct>0){
    const a=(pct/100)*Math.PI*2;
    ctx.beginPath(); ctx.arc(50,50,38,-Math.PI/2,-Math.PI/2+a);
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    ctx.lineWidth=13; ctx.lineCap='round'; ctx.stroke();
  }
}
