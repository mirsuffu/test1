// ============================================================
// PLANNER — Dual-row Group 1 / Group 2 layout
// ============================================================

function initPlannerScrollIndicator() {
  const wrap  = document.getElementById('planner-table-wrap');
  const thumb = document.getElementById('planner-scroll-thumb');
  const label = document.getElementById('planner-scroll-label');
  if (!wrap || !thumb || !label) return;
  if (_plannerScrollHandler) wrap.removeEventListener('scroll', _plannerScrollHandler);
  let hideTimer;
  function updateThumb() {
    const scrollTop = wrap.scrollTop, scrollHeight = wrap.scrollHeight - wrap.clientHeight;
    if (scrollHeight <= 0) return;
    const pct    = scrollTop / scrollHeight;
    const trackH = wrap.clientHeight;
    const thumbH = Math.max(30, trackH * (wrap.clientHeight / wrap.scrollHeight));
    thumb.style.height = thumbH + 'px';
    thumb.style.top    = (pct * (trackH - thumbH)) + 'px';
    const rows = wrap.querySelectorAll('tr[data-date], div[data-date]');
    let closest = null, closestDist = Infinity;
    rows.forEach(r => {
      const top = r.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
      if (top >= 0 && top < closestDist) { closestDist = top; closest = r; }
    });
    if (closest && closest.dataset.date) {
      const parts  = closest.dataset.date.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      label.textContent = parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1];
      const labelTop = parseFloat(thumb.style.top) + thumbH / 2 - 10;
      label.style.top = Math.max(0, labelTop) + 'px';
    }
    thumb.classList.add('visible'); label.classList.add('visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      thumb.classList.remove('visible'); label.classList.remove('visible');
    }, 1500);
  }
  _plannerScrollHandler = updateThumb;
  wrap.addEventListener('scroll', updateThumb, { passive: true });
}

// ---- Desktop: one <td> = plan input + tick button side by side ----
function _makeSubjCell(row, subj) {
  const td   = document.createElement('td');
  td.className = 'subj-cell';

  const inp  = document.createElement('input');
  inp.type = 'text'; inp.className = 'plan-input';
  inp.value = row.plans[subj] || ''; inp.placeholder = 'Plan…';
  inp.addEventListener('change', () => { row.plans[subj] = inp.value; saveData(); });
  inp.addEventListener('blur',   () => { row.plans[subj] = inp.value; saveData(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { row.plans[subj] = inp.value; saveData(); inp.blur(); }
  });

  const btn  = document.createElement('button');
  const hasPlanD = () => inp.value.trim().length > 0;
  const getDCls  = () => 'tick-btn'
    + (row.ticks[subj] ? ' ticked' : '')
    + (!hasPlanD() && !row.ticks[subj] ? ' tick-disabled' : '');
  btn.className = getDCls();
  btn.textContent = row.ticks[subj] ? '✓' : '';
  btn.title = (row.ticks[subj] ? 'Untick' : 'Tick') + ' ' + SUBJECT_LABELS[subj];
  btn.disabled = !hasPlanD() && !row.ticks[subj];

  btn.addEventListener('click', () => {
    if (!hasPlanD() && !row.ticks[subj]) return;
    triggerHaptic(40);
    row.ticks[subj] = !row.ticks[subj]; saveData();
    btn.disabled  = !hasPlanD() && !row.ticks[subj];
    btn.className = getDCls();
    btn.textContent = row.ticks[subj] ? '✓' : '';
    if (currentSection === 'metrics') renderMetrics();
  });
  inp.addEventListener('input', () => {
    btn.disabled  = !hasPlanD() && !row.ticks[subj];
    btn.className = getDCls();
  });

  td.append(inp, btn);
  return td;
}

// ---- Mobile: subject row inside pcard ----
function _makeMobileSubjRow(row, subj) {
  const wrap = document.createElement('div'); wrap.className = 'pcard-subj-row';
  const lbl  = document.createElement('span'); lbl.className = 'pcard-subj-label';
  lbl.textContent = getSubjectLabel(subj);

  const inp  = document.createElement('input');
  inp.type = 'text'; inp.className = 'pcard-plan-input';
  inp.value = row.plans[subj] || ''; inp.placeholder = 'Plan…';
  inp.addEventListener('change', () => { row.plans[subj] = inp.value; saveData(); });
  inp.addEventListener('blur',   () => { row.plans[subj] = inp.value; saveData(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { row.plans[subj] = inp.value; saveData(); inp.blur(); }
  });

  const tick = document.createElement('button');
  const hasPlan = () => inp.value.trim().length > 0;
  const getMCls = () => 'pcard-tick'
    + (row.ticks[subj] ? ' ticked' : '')
    + (!hasPlan() && !row.ticks[subj] ? ' tick-disabled' : '');
  tick.className = getMCls();
  tick.textContent = row.ticks[subj] ? '✓' : '';
  tick.disabled  = !hasPlan() && !row.ticks[subj];

  tick.addEventListener('click', () => {
    if (!hasPlan() && !row.ticks[subj]) return;
    playClick('tick');
    row.ticks[subj] = !row.ticks[subj]; saveData();
    tick.disabled  = !hasPlan() && !row.ticks[subj];
    tick.className = getMCls();
    tick.textContent = row.ticks[subj] ? '✓' : '';
    if (currentSection === 'metrics') renderMetrics();
  });
  inp.addEventListener('input', () => {
    tick.disabled  = !hasPlan() && !row.ticks[subj];
    tick.className = getMCls();
  });

  wrap.append(lbl, inp, tick);
  return wrap;
}

// ---- Main render ----
function renderPlanner() {
  setTimeout(initPlannerScrollIndicator, 100);
  const mobile = isMobile();
  const tbody  = document.getElementById('planner-tbody');
  const cards  = document.getElementById('planner-cards');
  const table  = document.getElementById('planner-table');

  table.style.display = mobile ? 'none' : '';
  cards.style.display = mobile ? 'flex'  : 'none';
  tbody.innerHTML = ''; cards.innerHTML = '';

  const dates    = getAllPlannerDates();
  const today    = getTodayStr();
  const emptyMsg = "Nothing here yet! Set your dates in Settings and let's get to work 📅";

  if (dates.length === 0) {
    if (mobile) {
      cards.innerHTML = '<div id="planner-cards-empty">' + emptyMsg + '</div>';
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text2);">' + emptyMsg + '</td></tr>';
    }
    return;
  }

  dates.forEach(date => {
    const row     = getOrCreatePlannerRow(date);
    const isSun   = isSunday(date);
    const isToday = date === today;
    const rowCls  = (isSun ? ' is-sunday' : '') + (isToday ? ' is-today' : '');

    if (mobile) {
      // ---- MOBILE CARD ----
      const card = document.createElement('div');
      card.dataset.date = date;
      card.className = 'pcard' + rowCls;

      const hdr  = document.createElement('div'); hdr.className = 'pcard-header';
      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:8px;';
      const ds = document.createElement('span'); ds.className = 'pcard-date'; ds.textContent = formatDateShort(date);
      const dy = document.createElement('span'); dy.className = 'pcard-day';  dy.textContent = getDayNameShort(date);
      left.append(ds, dy);

      const bulk = document.createElement('button'); bulk.className = 'pcard-bulk'; bulk.textContent = 'All ✓';
      bulk.addEventListener('click', () => {
        const tickable = SUBJECTS.filter(s => (row.plans[s] || '').trim().length > 0);
        if (tickable.length === 0) { showToast('Add plans first before bulk-ticking 📝', 'info'); return; }
        const allT = tickable.every(s => row.ticks[s]);
        tickable.forEach(s => { row.ticks[s] = !allT; });
        saveData(); renderPlanner();
        if (currentSection === 'metrics') renderMetrics();
      });
      hdr.append(left, bulk);
      card.appendChild(hdr);

      ['group1', 'group2'].forEach(grp => {
        const grpBar = document.createElement('div'); grpBar.className = 'pcard-group-bar';
        grpBar.textContent = GROUP_LABELS[grp];
        card.appendChild(grpBar);
        GROUPS[grp].forEach(subj => card.appendChild(_makeMobileSubjRow(row, subj)));
      });

      cards.appendChild(card);

    } else {
      // ---- DESKTOP: 2 rows per date ----

      // Row A — Group 1
      const trA = document.createElement('tr');
      trA.dataset.date = date;
      trA.className = 'planner-row planner-row-g1' + rowCls;

      // Date — rowspan 2, vertically centered
      const dateTd = document.createElement('td');
      dateTd.rowSpan = 2; dateTd.className = 'date-cell';
      dateTd.textContent = formatDateShort(date);
      trA.appendChild(dateTd);

      // Day — rowspan 2
      const dayTd = document.createElement('td');
      dayTd.rowSpan = 2; dayTd.className = 'day-cell';
      dayTd.textContent = getDayNameShort(date);
      trA.appendChild(dayTd);

      // Group 1 label
      const g1td = document.createElement('td'); g1td.className = 'group-label-cell g1';
      g1td.textContent = 'Group 1'; trA.appendChild(g1td);

      // Group 1 — 4 subject cells
      GROUPS.group1.forEach(subj => trA.appendChild(_makeSubjCell(row, subj)));

      // All ✓ — rowspan 2
      const allTd  = document.createElement('td'); allTd.rowSpan = 2; allTd.className = 'bulk-cell';
      const allBtn = document.createElement('button'); allBtn.className = 'bulk-btn'; allBtn.textContent = 'All ✓';
      allBtn.addEventListener('click', () => {
        triggerHaptic(60);
        const tickable = SUBJECTS.filter(s => (row.plans[s] || '').trim().length > 0);
        if (tickable.length === 0) { showToast('Add plans first before bulk-ticking 📝', 'info'); return; }
        const allT = tickable.every(s => row.ticks[s]);
        tickable.forEach(s => { row.ticks[s] = !allT; });
        saveData(); renderPlanner();
        if (currentSection === 'metrics') renderMetrics();
      });
      allTd.appendChild(allBtn);
      trA.appendChild(allTd);
      tbody.appendChild(trA);

      // Row B — Group 2
      const trB = document.createElement('tr');
      trB.className = 'planner-row planner-row-g2' + rowCls;

      const g2td = document.createElement('td'); g2td.className = 'group-label-cell g2';
      g2td.textContent = 'Group 2'; trB.appendChild(g2td);

      GROUPS.group2.forEach(subj => trB.appendChild(_makeSubjCell(row, subj)));

      tbody.appendChild(trB);
    }
  });

  // Auto-scroll to today
  if (!plannerScrolledToToday) {
    const todayEl = mobile
      ? cards.querySelector('.pcard.is-today')
      : tbody.querySelector('.is-today');
    if (todayEl) {
      setTimeout(() => todayEl.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
      plannerScrolledToToday = true;
    }
  }
}

function scrollToToday() {
  const today = getTodayStr();
  const el = document.querySelector('[data-date="' + today + '"]');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  else showToast('Today is not in planner range 🤔', 'info');
}
