/* ============================================================
   workout-modal.js — Add / Edit smart workout bottom sheet
   ============================================================ */

function openAddWorkoutModal(dateStr, existingWorkout) {
  const isEdit = !!existingWorkout;
  let selectedType = isEdit ? existingWorkout.sessionType : null;
  let currentPage  = isEdit ? 2 : 1;

  let savedP2 = null;

  const oldBd = document.getElementById('add-workout-backdrop');
  if (oldBd) oldBd.remove();

  const d     = TrainingPage.parseLocalDate(dateStr);
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const backdrop = document.createElement('div');
  backdrop.id    = 'add-workout-backdrop';
  backdrop.style.cssText = `
    position:absolute;inset:0;z-index:1500;
    pointer-events:none;
  `;

  const sheet = document.createElement('div');
  sheet.id    = 'add-workout-sheet';
  sheet.style.cssText = `
    position:absolute;bottom:0;left:0;right:0;
    height:90%;
    background:var(--bg-modal,#fff);
    border-radius:20px 20px 0 0;
    box-shadow:0 -2px 20px rgba(0,0,0,0.15);
    display:flex;flex-direction:column;overflow:hidden;
    transform:translateY(100%);
    transition:transform 540ms cubic-bezier(0.32,0.72,0,1);
    pointer-events:auto;
  `;

  const handle = document.createElement('div');
  handle.className = 'modal-handle';
  sheet.appendChild(handle);

  const viewport = document.createElement('div');
  viewport.style.cssText = 'position:relative;flex:1;overflow:hidden;';
  sheet.appendChild(viewport);

  backdrop.appendChild(sheet);
  const container = document.getElementById('app') || document.body;
  container.appendChild(backdrop);

  requestAnimationFrame(() => {
    backdrop.style.pointerEvents = 'auto';
    sheet.style.transform = 'translateY(0)';
  });

  let dragStartY = 0, dragLastY = 0, dragging = false;
  handle.addEventListener('touchstart', e => {
    dragStartY = dragLastY = e.touches[0].clientY;
    dragging   = true;
    sheet.style.transition = 'none';
    e.preventDefault();
  }, { passive: false });
  handle.addEventListener('touchmove', e => {
    if (!dragging) return;
    dragLastY = e.touches[0].clientY;
    const delta = Math.max(0, dragLastY - dragStartY);
    sheet.style.transform = `translateY(${delta}px)`;
    e.preventDefault();
  }, { passive: false });
  handle.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    if (Math.max(0, dragLastY - dragStartY) > 120) closeAddWorkout();
    else sheet.style.transform = 'translateY(0)';
  });

  function renderPage(page, dir) {
    const old  = viewport.querySelector('.add-workout-page');
    const next = document.createElement('div');
    next.className = 'add-workout-page';
    next.style.cssText = `
      display:flex;flex-direction:column;
      position:absolute;inset:0;
      background:var(--bg-modal,#fff);
      overflow-y:auto;-webkit-overflow-scrolling:touch;
      transform:translateX(${dir > 0 ? '100%' : '-100%'});
      transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);
    `;
    next.innerHTML = buildAddPageHTML(page);
    viewport.appendChild(next);
    requestAnimationFrame(() => {
      next.style.transform = 'translateX(0)';
      if (old) {
        old.style.transform = `translateX(${dir > 0 ? '-100%' : '100%'})`;
        setTimeout(() => old.remove(), 300);
      }
    });
    wireAddPageListeners(next, page);
  }

  function buildHeader(page) {
    const titles = ['', 'Session Type', 'Workout Details', 'Details'];
    const title  = isEdit && page === 2 ? 'Edit Workout' : titles[page] || '';
    const leftBtn = page > 1
      ? `<button id="add-wkt-back" style="background:none;border:none;font-size:17px;color:var(--colour-blue);font-family:-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;padding:0 4px;white-space:nowrap;">‹ Back</button>`
      : `<span></span>`;
    return `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 16px 8px;">
        <div style="display:flex;justify-content:flex-start;">${leftBtn}</div>
        <span style="font-size:17px;font-weight:600;text-align:center;">${title}</span>
        <div style="display:flex;justify-content:flex-end;">
          <button id="add-wkt-close" style="background:rgba(120,120,128,0.16);border:none;border-radius:50%;
            width:30px;height:30px;font-size:15px;color:#000;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;">✕</button>
        </div>
      </div>
      <div style="font-size:13px;color:var(--label-tertiary);text-align:center;margin:0 0 12px;">${label}</div>
    `;
  }

  function buildAddPageHTML(page) {
    const header = buildHeader(page);

    if (page === 1) {
      const types = [
        { key: 'sports', icon: '🥋', label: 'Sports' },
        { key: 'gym',    icon: '🏋️', label: 'Gym'   },
        { key: 'cardio', icon: '🚴', label: 'Cardio' },
        { key: 'other',  icon: '⚡️', label: 'Other'  },
      ];
      return header + `
        <div style="padding:0 16px;flex:1;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            ${types.map(t => `
              <button class="add-type-btn" data-stype="${t.key}"
                style="padding:20px 8px;border-radius:14px;border:none;
                box-shadow:0 2px 8px rgba(0,0,0,0.08);background:#F9F9F9;
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:15px;font-weight:500;color:#000;cursor:pointer;
                display:flex;flex-direction:column;align-items:center;gap:8px;">
                <span style="font-size:32px;">${t.icon}</span>
                <span>${t.label}</span>
              </button>`).join('')}
          </div>
        </div>`;
    }

    if (page === 2) {
      const src       = savedP2 || existingWorkout || {};
      const name      = src.name     || '';
      const sub       = src.subtitle || '';
      const tagVal    = src.tag      || (selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : '');
      const rec       = src.recurrence          || 'none';
      const every     = src.recurrenceEveryDays || 7;
      const startVal  = isEdit && existingWorkout ? existingWorkout.startDate : dateStr;
      const typePlaceholder = selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : 'Tag';
      return header + `
        <div style="padding:0 16px;flex:1;">
          <div style="margin-top:0;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Workout Name</div>
            <input id="add-wkt-name" type="text" placeholder="e.g. Morning Run" value="${name}"
              style="width:100%;padding:12px 16px;background:#F9F9F9;border:none;
              border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#000;outline:none;-webkit-appearance:none;box-sizing:border-box;"/>
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Tag <span style="font-weight:400;text-transform:none;letter-spacing:0;">(shown on tile)</span></div>
            <input id="add-wkt-tag" type="text" placeholder="${typePlaceholder}" value="${tagVal}"
              style="width:100%;padding:12px 16px;background:#F9F9F9;border:none;
              border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#000;outline:none;-webkit-appearance:none;box-sizing:border-box;"/>
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Subtitle <span style="font-weight:400;text-transform:none;letter-spacing:0;">(optional)</span></div>
            <input id="add-wkt-subtitle" type="text" placeholder="e.g. Upper Body Focus" value="${sub}"
              style="width:100%;padding:12px 16px;background:#F9F9F9;border:none;
              border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#000;outline:none;-webkit-appearance:none;box-sizing:border-box;"/>
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Start Date</div>
            <input id="add-wkt-date" type="date" value="${startVal}"
              style="width:100%;padding:12px 16px;background:#F9F9F9;border:none;
              border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#000;outline:none;-webkit-appearance:none;box-sizing:border-box;"/>
          </div>
          <div style="margin-top:12px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Repeat</div>
            <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              ${[
                { val: 'none',   label: 'None'         },
                { val: 'weekly', label: 'Every Week'   },
                { val: 'custom', label: 'Every X Days' },
              ].map((opt, i, arr) => `
                <label style="display:flex;align-items:center;justify-content:space-between;
                  padding:12px 16px;cursor:pointer;
                  ${i < arr.length - 1 ? 'border-bottom:0.5px solid #E5E5EA;' : ''}">
                  <span style="font-size:15px;color:#000;">${opt.label}</span>
                  <input type="radio" name="add-wkt-rec" value="${opt.val}"
                    ${rec === opt.val ? 'checked' : ''}
                    style="width:18px;height:18px;accent-color:var(--colour-blue);"/>
                </label>`).join('')}
            </div>
            <div id="add-wkt-custom-row" style="margin-top:8px;display:${rec === 'custom' ? 'flex' : 'none'};
              align-items:center;gap:10px;padding:12px 16px;background:#F9F9F9;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <span style="font-size:15px;color:#000;">Every</span>
              <input id="add-wkt-every" type="number" inputmode="numeric" min="1" value="${every}"
                style="width:60px;padding:6px 10px;background:#fff;border:none;border-radius:8px;
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:15px;color:#000;outline:none;box-shadow:0 1px 4px rgba(0,0,0,0.08);text-align:center;"/>
              <span style="font-size:15px;color:#000;">days</span>
            </div>
          </div>
          ${isEdit ? `
            <div style="margin-top:20px;">
              <button id="add-wkt-delete" style="width:100%;padding:14px;background:rgba(255,59,48,0.08);border:none;border-radius:12px;
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:17px;font-weight:600;color:#FF3B30;cursor:pointer;">
                Delete Workout
              </button>
            </div>` : ''}
        </div>
        <div style="padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);">
          <button id="add-wkt-continue" style="width:100%;min-height:52px;background:var(--colour-blue);border:none;border-radius:12px;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:17px;font-weight:600;color:#fff;cursor:pointer;">
            Continue
          </button>
        </div>`;
    }

    if (page === 3) {
      const det = (existingWorkout && existingWorkout.details) ? existingWorkout.details : {};
      let detailsHTML = '';

      if (selectedType === 'gym') {
        const exercises = (det.exercises && det.exercises.length) ? det.exercises : [{ name: '', sets: '' }];
        detailsHTML = `
          <div style="margin-top:0;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Exercises</div>
            <div id="add-wkt-exercises" style="display:flex;flex-direction:column;gap:8px;">
              ${exercises.map((ex, idx) => exerciseRowHTML(idx, ex.name, ex.sets)).join('')}
            </div>
            <button id="add-wkt-add-exercise" style="margin-top:8px;width:100%;padding:12px;background:#F9F9F9;border:none;border-radius:12px;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:var(--colour-blue);font-weight:500;cursor:pointer;">
              + Add Exercise
            </button>
          </div>`;
      } else if (selectedType === 'cardio') {
        detailsHTML = `
          <div style="margin-top:0;">
            <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:0.5px solid #E5E5EA;">
                <span style="font-size:15px;color:#000;">Duration</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="add-det-duration" type="number" inputmode="decimal" value="${det.duration || ''}" placeholder="60"
                    style="width:50px;text-align:right;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#8E8E93;outline:none;"/>
                  <span style="font-size:15px;color:#8E8E93;">mins</span>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:0.5px solid #E5E5EA;">
                <span style="font-size:15px;color:#000;">Distance</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="add-det-distance" type="number" inputmode="decimal" placeholder="0" value="${det.distance || ''}"
                    style="width:60px;text-align:right;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#8E8E93;outline:none;"/>
                  <span style="font-size:15px;color:#8E8E93;">${Units.distanceUnit()}</span>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
                <span style="font-size:15px;color:#000;">Speed</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="add-det-pace" type="number" inputmode="decimal" placeholder="0" value="${det.pace || ''}"
                    style="width:60px;text-align:right;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#8E8E93;outline:none;"/>
                  <span style="font-size:15px;color:#8E8E93;">${Units.speedUnit()}</span>
                </div>
              </div>
            </div>
          </div>`;
      } else {
        detailsHTML = `
          <div style="margin-top:0;">
            <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
                <span style="font-size:15px;color:#000;">Duration</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="add-det-duration" type="number" inputmode="decimal" value="${det.duration || ''}" placeholder="60"
                    style="width:50px;text-align:right;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#8E8E93;outline:none;"/>
                  <span style="font-size:15px;color:#8E8E93;">mins</span>
                </div>
              </div>
            </div>
          </div>`;
      }

      return header + `
        <div style="padding:0 16px;flex:1;">
          ${detailsHTML}
          <div style="margin-top:16px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Notes</div>
            <textarea id="add-det-notes" placeholder="Any notes about this workout..."
              style="width:100%;min-height:80px;padding:12px 16px;background:#F9F9F9;border:none;border-radius:12px;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#000;resize:none;outline:none;-webkit-appearance:none;box-sizing:border-box;"
            >${(existingWorkout && existingWorkout.details && existingWorkout.details.notes) || ''}</textarea>
          </div>
        </div>
        <div style="padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);">
          <button id="add-wkt-save" style="width:100%;min-height:52px;background:var(--colour-blue);border:none;border-radius:12px;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:17px;font-weight:600;color:#fff;cursor:pointer;">
            Save Workout
          </button>
        </div>`;
    }

    return buildHeader(page);
  }

  function exerciseRowHTML(idx, name, sets) {
    return `
      <div class="add-ex-row" data-idx="${idx}" style="display:flex;gap:8px;align-items:center;">
        <input class="add-ex-name" type="text" placeholder="Exercise name" value="${name}"
          style="flex:1;padding:12px 14px;background:#F9F9F9;border:none;border-radius:10px;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);font-family:-apple-system,BlinkMacSystemFont,sans-serif;
          font-size:15px;color:#000;outline:none;box-sizing:border-box;"/>
        <input class="add-ex-sets" type="text" placeholder="Sets" value="${sets}"
          style="width:72px;padding:12px 10px;background:#F9F9F9;border:none;border-radius:10px;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);font-family:-apple-system,BlinkMacSystemFont,sans-serif;
          font-size:15px;color:#000;outline:none;text-align:center;box-sizing:border-box;"/>
        <button class="add-ex-remove" style="background:none;border:none;font-size:20px;color:#FF3B30;cursor:pointer;padding:0 4px;line-height:1;">−</button>
      </div>`;
  }

  function collectPage2Data() {
    const nameEl  = viewport.querySelector('#add-wkt-name');
    const tagEl   = viewport.querySelector('#add-wkt-tag');
    const subEl   = viewport.querySelector('#add-wkt-subtitle');
    const dateEl  = viewport.querySelector('#add-wkt-date');
    const recEl   = viewport.querySelector('input[name="add-wkt-rec"]:checked');
    const everyEl = viewport.querySelector('#add-wkt-every');
    return {
      name:                nameEl  ? nameEl.value.trim()          : (savedP2 ? savedP2.name     : ''),
      tag:                 tagEl   ? tagEl.value.trim()           : (savedP2 ? savedP2.tag      : ''),
      subtitle:            subEl   ? subEl.value.trim()           : (savedP2 ? savedP2.subtitle : ''),
      startDate:           dateEl  ? dateEl.value                 : (savedP2 ? savedP2.startDate : dateStr),
      recurrence:          recEl   ? recEl.value                  : (savedP2 ? savedP2.recurrence : 'none'),
      recurrenceEveryDays: everyEl ? parseInt(everyEl.value) || 7 : (savedP2 ? savedP2.recurrenceEveryDays : 7),
    };
  }

  function collectPage3Details() {
    if (selectedType === 'gym') {
      const rows = viewport.querySelectorAll('.add-ex-row');
      const exercises = [];
      rows.forEach(row => {
        const n = row.querySelector('.add-ex-name')?.value.trim() || '';
        const s = row.querySelector('.add-ex-sets')?.value.trim() || '';
        if (n) exercises.push({ name: n, sets: s });
      });
      return { exercises, notes: viewport.querySelector('#add-det-notes')?.value.trim() || '' };
    }
    if (selectedType === 'cardio') {
      const dur  = parseFloat(viewport.querySelector('#add-det-duration')?.value) || 0;
      const dist = parseFloat(viewport.querySelector('#add-det-distance')?.value) || 0;
      const spd  = parseFloat(viewport.querySelector('#add-det-pace')?.value)     || 0;
      return {
        duration: dur  || undefined,
        distance: dist || undefined,
        pace:     spd  || undefined,
        notes:    viewport.querySelector('#add-det-notes')?.value.trim() || '',
      };
    }
    return {
      duration: parseFloat(viewport.querySelector('#add-det-duration')?.value) || undefined,
      notes:    viewport.querySelector('#add-det-notes')?.value.trim() || '',
    };
  }

  function commitSave(p2, det, mode) {
    if (!isEdit || mode === 'all') {
      const workout = {
        id:                  (existingWorkout && existingWorkout.id) || `sw_${Date.now()}`,
        sessionType:         selectedType,
        name:                p2.name,
        tag:                 p2.tag,
        subtitle:            p2.subtitle,
        startDate:           p2.startDate,
        recurrence:          p2.recurrence,
        recurrenceEveryDays: p2.recurrenceEveryDays,
        details:             det,
        exceptions:          (existingWorkout && existingWorkout.exceptions) || [],
        endDate:             (existingWorkout && existingWorkout.endDate)    || null,
      };
      Store.saveSmartWorkout(workout);
    } else if (mode === 'this') {
      Store.deleteSmartWorkoutOnDate(existingWorkout.id, dateStr, 'this');
      Store.saveSmartWorkout({
        id:          `sw_${Date.now()}`,
        sessionType: selectedType,
        name:        p2.name,
        tag:         p2.tag,
        subtitle:    p2.subtitle,
        startDate:   dateStr,
        recurrence:  'none',
        details:     det,
        exceptions:  [],
        endDate:     null,
      });
    } else if (mode === 'forward') {
      Store.deleteSmartWorkoutOnDate(existingWorkout.id, dateStr, 'forward');
      Store.saveSmartWorkout({
        id:                  `sw_${Date.now()}`,
        sessionType:         selectedType,
        name:                p2.name,
        tag:                 p2.tag,
        subtitle:            p2.subtitle,
        startDate:           dateStr,
        recurrence:          p2.recurrence,
        recurrenceEveryDays: p2.recurrenceEveryDays,
        details:             det,
        exceptions:          [],
        endDate:             null,
      });
    }
    TrainingPage.renderList();
    if (typeof HomePage !== 'undefined') HomePage.render();
    if (typeof InsightsPage !== 'undefined') InsightsPage.render();
    closeAddWorkout();
    setTimeout(() => openSessionModal(dateStr), 50);
  }

  function saveAndClose() {
    const p2  = collectPage2Data();
    const det = collectPage3Details();

    const isRecurring = isEdit && existingWorkout && existingWorkout.recurrence && existingWorkout.recurrence !== 'none';
    if (!isRecurring) {
      commitSave(p2, det, 'all');
      return;
    }

    const choice = window.confirm('Edit this occurrence only?\n\nOK = this date only\nCancel = this and all future occurrences');
    commitSave(p2, det, choice ? 'this' : 'forward');
  }

  function closeAddWorkout() {
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { backdrop.remove(); TrainingPage.renderList(); }, 400);
  }

  function wireAddPageListeners(pageEl, page) {
    pageEl.querySelector('#add-wkt-close')?.addEventListener('click', closeAddWorkout);

    pageEl.querySelector('#add-wkt-back')?.addEventListener('click', () => {
      currentPage--;
      renderPage(currentPage, -1);
    });

    if (page === 1) {
      pageEl.querySelectorAll('.add-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedType = btn.dataset.stype;
          currentPage  = 2;
          renderPage(2, 1);
        });
      });
    }

    if (page === 2) {
      pageEl.querySelectorAll('input[name="add-wkt-rec"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const customRow = pageEl.querySelector('#add-wkt-custom-row');
          if (customRow) customRow.style.display = radio.value === 'custom' ? 'flex' : 'none';
        });
      });

      pageEl.querySelector('#add-wkt-continue')?.addEventListener('click', () => {
        savedP2     = collectPage2Data();
        currentPage = 3;
        renderPage(3, 1);
      });

      pageEl.querySelector('#add-wkt-delete')?.addEventListener('click', () => {
        const choice = window.confirm(
          'Delete this workout?\n\nOK = delete all occurrences\nCancel to keep'
        );
        if (!choice) return;
        const mode = window.confirm('Delete only from this date forward?\n\nOK = forward only\nCancel = all occurrences')
          ? 'forward' : 'all';
        Store.deleteSmartWorkoutOnDate(existingWorkout.id, dateStr, mode);
        TrainingPage.renderList();
        if (typeof HomePage !== 'undefined') HomePage.render();
        if (typeof InsightsPage !== 'undefined') InsightsPage.render();
        closeAddWorkout();
        setTimeout(() => openSessionModal(dateStr), 50);
      });
    }

    if (page === 3) {
      if (selectedType === 'cardio') {
        const autoCalc = () => {
          const durEl  = pageEl.querySelector('#add-det-duration');
          const distEl = pageEl.querySelector('#add-det-distance');
          const spdEl  = pageEl.querySelector('#add-det-pace');
          const dur    = parseFloat(durEl?.value)  || 0;
          const dist   = parseFloat(distEl?.value) || 0;
          const spd    = parseFloat(spdEl?.value)  || 0;
          const filled = [dur > 0, dist > 0, spd > 0].filter(Boolean).length;
          if (filled !== 2) return;
          if (!dur  && dist && spd)  { durEl.value  = (dist / spd * 60).toFixed(1); }
          if (!dist && dur  && spd)  { distEl.value = (spd * dur / 60).toFixed(2);  }
          if (!spd  && dur  && dist) { spdEl.value  = (dist / (dur / 60)).toFixed(1); }
        };
        pageEl.querySelector('#add-det-duration')?.addEventListener('blur', autoCalc);
        pageEl.querySelector('#add-det-distance')?.addEventListener('blur', autoCalc);
        pageEl.querySelector('#add-det-pace')?.addEventListener('blur', autoCalc);
      }

      pageEl.querySelector('#add-wkt-add-exercise')?.addEventListener('click', () => {
        const list = pageEl.querySelector('#add-wkt-exercises');
        if (!list) return;
        const div = document.createElement('div');
        div.innerHTML = exerciseRowHTML(list.querySelectorAll('.add-ex-row').length, '', '');
        const row = div.firstElementChild;
        list.appendChild(row);
        row.querySelector('.add-ex-remove')?.addEventListener('click', () => row.remove());
      });

      pageEl.querySelectorAll('.add-ex-remove').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.add-ex-row')?.remove());
      });

      pageEl.querySelector('#add-wkt-save')?.addEventListener('click', saveAndClose);
    }
  }

  renderPage(currentPage, 1);
}
