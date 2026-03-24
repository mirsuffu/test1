// ============================================================
// TESTS — Render table/cards, Add/Edit/Delete modals
// ============================================================

function updateTestStars(val){
  testConfidenceVal=val;
  const current=getRatingLabel(val);
  document.querySelectorAll('#tf-confidence-stars .rating-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.id===current);
  });
}

function openTestModal(){
  document.getElementById('test-modal-title') && (document.getElementById('test-modal-title').textContent='Log New Test');
  document.getElementById('tf-date').value=toDateStrSimple(new Date());
  document.getElementById('tf-subject').value='advacc';
  document.getElementById('tf-type').value='Chapter';
  document.getElementById('tf-coverage').value='';
  document.getElementById('tf-score').value='';
  document.getElementById('tf-comment').value='';
  const pctEl=document.getElementById('tf-score-pct');
  if(pctEl) pctEl.textContent='';
  updateTestStars(3);
  document.getElementById('test-modal').classList.add('show');
  playSound('pop');
  // Live score %
  const scoreInput=document.getElementById('tf-score');
  scoreInput.oninput=function(){
    const val=parseFloat(scoreInput.value);
    if(pctEl){ if(isNaN(val)) pctEl.textContent=''; else pctEl.textContent=val>=0&&val<=100?` (${val}%)`:''; }
  };
}

function closeTestModal(){ document.getElementById('test-modal').classList.remove('show'); }

function saveTestRecord(){
  const date=document.getElementById('tf-date').value;
  const subject=document.getElementById('tf-subject').value;
  const type=document.getElementById('tf-type').value;
  const coverage=document.getElementById('tf-coverage').value.trim();
  const score=document.getElementById('tf-score').value.trim();
  const comment=document.getElementById('tf-comment').value.trim();
  if(!date||!subject){ showToast('Date and subject are required! 📝','error'); return; }
  const record={
    id:'test_'+Date.now(), date, subject, type, coverage, score,
    confidence:testConfidenceVal, comment
  };
  data.tests.push(record);
  saveData(); closeTestModal(); renderTestTable();
  showToast('Test logged! Progress tracked 📊','success');
}

function deleteTestRecord(id){
  showConfirmAction(
    '🗑 Delete Test?',
    'This test record will be permanently removed.',
    ()=>{
      data.tests=data.tests.filter(t=>t.id!==id);
      saveData(); renderTestTable();
      showToast('Deleted. Gone but not forgotten 🗑','info');
    }
  );
}

function openEditTestModal(id){
  const t=data.tests.find(x=>x.id===id); if(!t) return;
  testEditId=id;
  document.getElementById('te-date').value=t.date;
  document.getElementById('te-subject').value=t.subject;
  document.getElementById('te-type').value=t.type||'Chapter';
  document.getElementById('te-coverage').value=t.coverage||'';
  document.getElementById('te-score').value=t.score||'';
  document.getElementById('te-comment').value=t.comment||'';

  // Live score % in edit modal
  const pctEl=document.getElementById('te-score-pct');
  const scoreInp=document.getElementById('te-score');
  if(pctEl&&scoreInp){
    const updatePct=()=>{
      const val=parseFloat(scoreInp.value);
      pctEl.textContent=isNaN(val)?'':(val>=0&&val<=100?` (${val}%)`:'');
    };
    updatePct();
    scoreInp.oninput=updatePct;
  }

  updateTestEditStars(t.confidence||3);
  document.getElementById('test-edit-modal').classList.add('show');
  playSound('pop');
}

function closeTestEditModal(){ document.getElementById('test-edit-modal').classList.remove('show'); testEditId=null; }

function updateTestEditStars(val){
  testEditConfidenceVal=val;
  const current=getRatingLabel(val);
  document.querySelectorAll('#te-confidence-stars .rating-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.id===current);
  });
}

function saveTestEdit(){
  if(!testEditId) return;
  const t=data.tests.find(x=>x.id===testEditId); if(!t) return;
  t.date=document.getElementById('te-date').value;
  t.subject=document.getElementById('te-subject').value;
  t.coverage=document.getElementById('te-coverage').value.trim();
  t.type=document.getElementById('te-type').value;
  t.score=document.getElementById('te-score').value.trim();
  t.confidence=testEditConfidenceVal;
  t.comment=document.getElementById('te-comment').value.trim();
  saveData(); closeTestEditModal(); renderTestTable();
  showToast('Updated! Glow-up applied ✨','success');
}

function renderTestTable(){
  const mobile=isMobile();
  const table=document.getElementById('test-table');
  const cards=document.getElementById('test-cards');
  const tbody=document.getElementById('test-tbody');
  table.style.display=mobile?'none':'';
  cards.style.display=mobile?'flex':'none';
  tbody.innerHTML=''; cards.innerHTML='';
  const empty='No test records yet. Hit + Add Test to log one.';
  if(!data.tests||data.tests.length===0){
    if(mobile) cards.innerHTML='<div id="test-cards-empty">'+empty+'</div>';
    else tbody.innerHTML='<tr><td colspan="8" class="empty-test">'+empty+'</td></tr>';
    return;
  }
  const fSubj=document.getElementById('test-filter-subj').value;
  const fType=document.getElementById('test-filter-type').value;
  let filteredTests=data.tests.filter(t=>{
    let matchSubj=(fSubj==='ALL')||(t.subject===fSubj);
    let matchType=(fType==='ALL')||(t.type===fType);
    return matchSubj&&matchType;
  });
  if(filteredTests.length===0){
    const noMatch='No tests match these filters. Try clearing them.';
    if(mobile) cards.innerHTML='<div id="test-cards-empty">'+noMatch+'</div>';
    else tbody.innerHTML='<tr><td colspan="8" class="empty-test">'+noMatch+'</td></tr>';
    return;
  }
  const sorted=[].concat(filteredTests).sort((a,b)=>b.date.localeCompare(a.date));
  const getBadgeHtml=v=>{ const lbl=getRatingLabel(v); return `<span class="rating-badge ${lbl}">${lbl.toUpperCase()}</span>`; };
  if(mobile){
    sorted.forEach(t=>{
      const subjLabel=t.subject==='all'?'All Subjects':getSubjectLabel(t.subject);
      const badgeHtml=getBadgeHtml(t.confidence||3);
      const card=document.createElement('div'); card.className='tcard';
      const r1=document.createElement('div'); r1.className='tcard-row1';
      const de=document.createElement('span'); de.className='tcard-date'; de.textContent=formatDateShort(t.date);
      const se=document.createElement('span'); se.className='tcard-subj'; se.textContent=subjLabel;
      const bg=document.createElement('span'); bg.className='test-type-badge test-type-'+t.type; bg.textContent=t.type;
      r1.append(de,se,bg); card.appendChild(r1);
      const r2=document.createElement('div'); r2.className='tcard-row2';
      const co=document.createElement('span'); co.className='tcard-coverage'; co.textContent=t.coverage||'—';
      const sc=document.createElement('span'); sc.className='tcard-score'; sc.textContent=t.score?'🎯 '+t.score:'';
      const st2=document.createElement('span'); st2.className='tcard-stars'; st2.innerHTML=badgeHtml;
      r2.append(co,sc,st2); card.appendChild(r2);
      if(t.comment){ const cm=document.createElement('div'); cm.className='tcard-comment'; cm.textContent=t.comment; card.appendChild(cm); }
      const acts=document.createElement('div'); acts.className='tcard-actions';
      const eb=document.createElement('button'); eb.className='tcard-edit'; eb.textContent='✎ Edit';
      const db=document.createElement('button'); db.className='tcard-del';  db.textContent='✕ Delete';
      (function(id){ eb.addEventListener('click',()=>openEditTestModal(id)); db.addEventListener('click',()=>deleteTestRecord(id)); })(t.id);
      acts.append(eb,db); card.appendChild(acts);
      cards.appendChild(card);
    });
  } else {
    sorted.forEach(t=>{
      const tr=document.createElement('tr'); tr.className='test-row';
      const badgeHtml=getBadgeHtml(t.confidence||3);
      const subjLabel=t.subject==='all'?'All Subjects':(SUBJECT_LABELS[t.subject]||t.subject);
      function makeTd(text,style,cls){
        const td=document.createElement('td');
        if(style) td.style.cssText=style;
        if(cls) td.className=cls;
        td.textContent=text; return td;
      }
      tr.appendChild(makeTd(formatDateShort(t.date),'font-family:var(--mono);font-size:12px;'));
      tr.appendChild(makeTd(subjLabel,'font-weight:600;'));
      tr.appendChild(makeTd(t.coverage||'—','font-size:12px;color:var(--text2);'));
      const typeTd=document.createElement('td');
      const typeBadge=document.createElement('span'); typeBadge.className='test-type-badge test-type-'+t.type; typeBadge.textContent=t.type;
      typeTd.appendChild(typeBadge); tr.appendChild(typeTd);
      tr.appendChild(makeTd(t.score||'—','','score-cell'));
      const badgeTd=document.createElement('td'); badgeTd.innerHTML=badgeHtml; tr.appendChild(badgeTd);
      const commentTd=document.createElement('td'); commentTd.className='comment-cell'; commentTd.title=t.comment||''; commentTd.textContent=t.comment||'—'; tr.appendChild(commentTd);
      const actTd=document.createElement('td'); actTd.style.cssText='display:flex;gap:6px;align-items:center;';
      const editBtn=document.createElement('span'); editBtn.className='test-edit-btn'; editBtn.title='Edit';
      editBtn.style.cssText='color:var(--accent);opacity:0;cursor:pointer;font-size:13px;'; editBtn.textContent='✎';
      const delBtn=document.createElement('span'); delBtn.className='test-del'; delBtn.title='Delete'; delBtn.textContent='✕';
      actTd.append(editBtn,delBtn); tr.appendChild(actTd);
      (function(id){ delBtn.addEventListener('click',()=>deleteTestRecord(id)); editBtn.addEventListener('click',()=>openEditTestModal(id)); })(t.id);
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.test-row').forEach(row=>{
      row.addEventListener('mouseenter',()=>row.querySelectorAll('.test-edit-btn,.test-del').forEach(b=>b.style.opacity='1'));
      row.addEventListener('mouseleave',()=>row.querySelectorAll('.test-edit-btn,.test-del').forEach(b=>b.style.opacity='0'));
    });
  }
}
