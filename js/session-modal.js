/* ============================================================
   session-modal.js — Session detail modal (view + log session)
   ============================================================ */

// Shared helpers used by both this file and workout-modal.js
function saveSessionField(dateStr, field, value) {
  const all   = Store.getAllCheckIns();
  const entry = all[dateStr] || { date: dateStr };
  entry[field] = value;
  all[dateStr] = entry;
  Store.saveAllCheckIns(all);
}

// Toggle a value in a multi-select array field and persist
function toggleSessionMultiSelect(dateStr, field, value) {
  const all   = Store.getAllCheckIns();
  const entry = all[dateStr] || { date: dateStr };
  let arr = Array.isArray(entry[field]) ? [...entry[field]] : [];
  arr = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
  entry[field] = arr;
  all[dateStr] = entry;
  Store.saveAllCheckIns(all);
  return arr;
}

// Bind a multi-select type button group
// dataAttr: the dataset attribute name on each button (e.g. 'type', 'gtype', 'ctype')
// field: the checkin field to save to (e.g. 'bjjTypes')
// selColor: the selected color for text (e.g. '#007AFF')
// selBg: the selected background (e.g. 'rgba(0,122,255,0.12)')
function bindMultiSelect(selectorId, dataAttr, dateStr, field, selColor, selBg) {
  const container = document.getElementById(selectorId);
  if (!container) return;
  container.querySelectorAll('.session-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = toggleSessionMultiSelect(dateStr, field, btn.dataset[dataAttr]);
      container.querySelectorAll('.session-type-btn').forEach(b => {
        const on = selected.includes(b.dataset[dataAttr]);
        b.style.background = on ? selBg    : '#F9F9F9';
        b.style.fontWeight = on ? '600'    : '400';
        b.style.color      = on ? selColor : '#000';
      });
    });
  });
}

// Build expandable exercise rows with load/reps inputs (shared by hypertrophy + smart-gym)
function buildGymExerciseRowsHTML(exercises, savedSets, prevSets, rag, containerId) {
  const ragReduce = rag === 'red' ? 2 : rag === 'amber' ? 1 : 0;
  return `
    <div id="${containerId}" style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${exercises.map((e, exIdx) => {
        const numSets   = Math.max(1, parseInt(e.sets) - ragReduce) || 3;
        const exKey     = e.name;
        const savedRows = (savedSets[exKey] && savedSets[exKey].length) ? savedSets[exKey] : Array.from({ length: numSets }, () => ({ reps: '', load: '' }));
        const prevRows  = (prevSets[exKey]  && prevSets[exKey].length)  ? prevSets[exKey]  : [];
        const setRowsHTML = Array.from({ length: numSets }, (_, s) => {
          const row     = savedRows[s] || { reps: '', load: '' };
          const prevRow = prevRows[s]  || { reps: '', load: '' };
          const loadPH  = row.load ? '' : (prevRow.load || '—');
          const repsPH  = row.reps ? '' : (prevRow.reps || '—');
          return `
            <div style="display:grid;grid-template-columns:28px minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;padding:8px 12px;border-top:0.5px solid #E5E5EA;box-sizing:border-box;">
              <span style="font-size:13px;color:#AEAEB2;font-weight:600;text-align:center;">${s + 1}</span>
              <div style="display:flex;align-items:center;background:#fff;border-radius:8px;padding:6px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);min-width:0;">
                <input class="gym-set-load" type="number" inputmode="decimal" placeholder="${loadPH}" value="${row.load}"
                  data-ex="${exIdx}" data-set="${s}"
                  style="flex:1;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#000;outline:none;text-align:center;min-width:0;width:0;"/>
                <span style="font-size:11px;color:#AEAEB2;flex-shrink:0;margin-left:2px;">${Units.weightUnit()}</span>
              </div>
              <div style="display:flex;align-items:center;background:#fff;border-radius:8px;padding:6px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);min-width:0;">
                <input class="gym-set-reps" type="number" inputmode="numeric" placeholder="${repsPH}" value="${row.reps}"
                  data-ex="${exIdx}" data-set="${s}"
                  style="flex:1;border:none;background:transparent;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#000;outline:none;text-align:center;min-width:0;width:0;"/>
                <span style="font-size:11px;color:#AEAEB2;flex-shrink:0;margin-left:2px;">reps</span>
              </div>
            </div>`;
        }).join('');
        const notLast = exIdx < exercises.length - 1;
        return `
          <div ${notLast ? 'style="border-bottom:0.5px solid #E5E5EA;"' : ''}>
            <div class="gym-ex-header" data-ex-idx="${exIdx}"
              style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;">
              <span style="font-size:15px;color:#000;font-weight:500;">${e.name}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:13px;color:#8E8E93;">${numSets} set${numSets !== 1 ? 's' : ''}${ragReduce > 0 ? ' ↓' : ''}</span>
                <span class="gym-ex-chevron" style="font-size:16px;color:#C7C7CC;transition:transform 0.2s;">›</span>
              </div>
            </div>
            <div class="gym-ex-sets" style="display:none;">
              <div style="display:grid;grid-template-columns:28px minmax(0,1fr) minmax(0,1fr);gap:6px;padding:6px 12px 0;border-top:0.5px solid #E5E5EA;box-sizing:border-box;">
                <span></span>
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.3px;text-align:center;padding:4px 0;">Load</span>
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.3px;text-align:center;padding:4px 0;">Reps</span>
              </div>
              ${setRowsHTML}
              <div style="height:8px;"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// Format saved gym sets as plain text for clipboard (skips empty sets)
function formatGymSetsForClipboard(exercises, savedSets) {
  return exercises.map(e => {
    const rows = savedSets[e.name] || [];
    const setParts = rows
      .filter(r => r.load || r.reps)
      .map(r => `${r.load || '?'}x${r.reps || '?'}`);
    if (!setParts.length) return null;
    return `${e.name}: ${setParts.join(', ')}`;
  }).filter(Boolean).join('\n');
}

function detailRow(label, value) {
  return `
    <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;color:#000;">${label}</span>
      <span style="font-size:15px;color:#8E8E93;font-weight:500;">${value}</span>
    </div>`;
}

function closeSessionModal() {
  const backdrop = document.getElementById('session-modal-backdrop');
  const modal    = document.getElementById('session-modal');
  if (!backdrop) return;
  if (modal) {
    modal.style.transition = '';
    modal.style.transform  = 'translateY(100%)';
  }
  backdrop.classList.remove('open');
  unlockBodyScroll();
  setTimeout(() => backdrop.remove(), 400);
}

function buildModalBody(session, dateStr) {
  const ci    = Store.getCheckIn(dateStr) || {};
  const notes = ci.sessionNotes || '';

  if (session.type === 'rest' || session.type === 'none') {
    const rag = ci.rag || 'green';
    const restMessages = {
      red:   { headline: 'Your body needs this one.', body: 'Your readiness is low — prioritise sleep, hydration, and full rest. Skip any extra activity today.' },
      amber: { headline: 'Take it easy today.', body: 'A lighter day. Light walking, stretching or mobility work is fine, but avoid anything that adds fatigue.' },
      green: { headline: 'Rest & recover.', body: 'Active recovery day — a short walk or mobility session is plenty. Let your body absorb the recent training.' },
    };
    const msg = restMessages[rag] || restMessages.green;

    return `
      <div style="margin-top:16px;background:#F9F9F9;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="font-size:15px;font-weight:600;color:#000;margin-bottom:6px;">${msg.headline}</div>
        <div style="font-size:14px;color:#8E8E93;line-height:1.5;">${msg.body}</div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Notes</div>
        <textarea
          id="session-notes-input"
          placeholder="How are you feeling today?"
          autocapitalize="sentences"
          style="
            width:100%;min-height:90px;padding:12px 16px;
            background:#F9F9F9;border:none;
            border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            box-shadow:0 2px 8px rgba(0,0,0,0.08);
            font-size:15px;color:#000;resize:none;outline:none;
            -webkit-appearance:none;box-sizing:border-box;
          "
        >${notes}</textarea>
      </div>`;
  }
  if (session.type === 'race') {
    return `<p style="color:#8E8E93;font-size:15px;margin-top:8px;">Cycling event — Fri to Sun, ~130 miles per day.</p>`;
  }

  let html = '';

  if (session.type === 'hypertrophy') {
    const vol         = session.volume || 'green';
    const labels      = { green: 'Green Volume', amber: 'Amber Volume', red: 'Red Volume' };
    const gymTypes    = Array.isArray(ci.gymTypes) ? ci.gymTypes : [];
    const gymDuration = ci.gymDuration ?? 60;
    const savedSets   = ci.gymSets || {};

    // Look back up to 12 weeks for the same workout subtype (push/legs/pull)
    let prevSets = {};
    const allCIs = Store.getAllCheckIns();
    const profile = Store.getProfile();
    const target  = new Date(dateStr + 'T00:00:00');
    for (let i = 1; i <= 84; i++) {
      const prev    = new Date(target);
      prev.setDate(target.getDate() - i);
      const prevStr = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
      const prevCI  = allCIs[prevStr];
      if (prevCI?.gymSets) {
        const prevSess = TrainingData.getSessionForDate(prevStr, profile.programmeStart, prevCI.rag || 'green', profile.programme, profile.programmeLengthWeeks);
        if (prevSess.type === 'hypertrophy' && prevSess.subtype === session.subtype) {
          prevSets = prevCI.gymSets;
          break;
        }
      }
    }

    html += `
      <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;color:#000;">Duration</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input id="gym-duration" type="number" inputmode="decimal"
            value="${gymDuration}"
            style="width:50px;text-align:right;border:none;background:transparent;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            font-size:15px;color:#8E8E93;outline:none;"/>
          <span style="font-size:15px;color:#8E8E93;">mins</span>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="gym-type-selector">
          ${['Strength','Hypertrophy'].map(t => `
            <button class="session-type-btn" data-gtype="${t}"
              style="padding:12px 8px;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${gymTypes.includes(t) ? 'rgba(0,122,255,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;font-weight:${gymTypes.includes(t) ? '600' : '400'};
              color:${gymTypes.includes(t) ? '#007AFF' : '#000'};cursor:pointer;">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${labels[vol]}</div>
        ${buildGymExerciseRowsHTML(session.exercises, savedSets, prevSets, vol, 'hypertrophy-exercises')}
        <div style="margin-top:8px;text-align:right;">
          <button id="gym-copy-btn"
            style="background:none;border:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            font-size:13px;color:#8E8E93;cursor:pointer;padding:4px 0;">
            Copy to Bevel
          </button>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
        <div style="display:flex;gap:8px;" id="gym-rating-selector">
          ${[1,2,3,4,5].map(n => `
            <button class="session-rating-btn" data-rating="${n}"
              style="flex:1;padding:12px 0;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${(ci.gymRating||0) >= n ? 'rgba(255,149,0,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:20px;cursor:pointer;
              color:${(ci.gymRating||0) >= n ? '#FF9500' : '#D1D1D6'};">★</button>`).join('')}
        </div>
      </div>`;
  }

  if (session.type === 'bjj') {
    const profile  = Store.getProfile();
    const belt     = ci.beltSnapshot    || profile.bjjBelt    || null;
    const stripes  = ci.stripesSnapshot !== undefined ? ci.stripesSnapshot : (profile.bjjStripes || null);
    const beltHTML = belt ? detailRow('Belt', `${belt}${stripes !== null && stripes !== '' ? ` · ${stripes} stripe${stripes == 1 ? '' : 's'}` : ''}`) : '';
    const bjjTypes = Array.isArray(ci.bjjTypes) ? ci.bjjTypes : [];
    const bjjDuration = ci.bjjDuration ?? session.duration ?? 60;
    html += `
      <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;color:#000;">Duration</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input id="bjj-duration" type="number" inputmode="decimal"
            value="${bjjDuration}"
            style="width:50px;text-align:right;border:none;background:transparent;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            font-size:15px;color:#8E8E93;outline:none;"/>
          <span style="font-size:15px;color:#8E8E93;">mins</span>
        </div>
      </div>`;
    html += beltHTML;
    html += `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="bjj-type-selector">
          ${['Regular Class','Competition Class','Open Mat','Competition'].map(t => `
            <button class="session-type-btn" data-type="${t}"
              style="padding:12px 8px;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${bjjTypes.includes(t) ? 'rgba(0,122,255,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;font-weight:${bjjTypes.includes(t) ? '600' : '400'};
              color:${bjjTypes.includes(t) ? '#007AFF' : '#000'};cursor:pointer;">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
        <div style="display:flex;gap:8px;" id="bjj-rating-selector">
          ${[1,2,3,4,5].map(n => `
            <button class="session-rating-btn" data-rating="${n}"
              style="flex:1;padding:12px 0;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${(ci.bjjRating||0) >= n ? 'rgba(255,149,0,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:20px;cursor:pointer;
              color:${(ci.bjjRating||0) >= n ? '#FF9500' : '#D1D1D6'};">★</button>`).join('')}
        </div>
      </div>`;
  }

  if (session.type === 'cycle') {
    const cycleTypes = Array.isArray(ci.cycleTypes) ? ci.cycleTypes : [];
    const cycleDur   = ci.cycleDuration ?? 60;
    html += `
      <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;color:#000;">Duration</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input id="cycle-duration" type="number" inputmode="decimal"
            value="${cycleDur}"
            style="width:50px;text-align:right;border:none;background:transparent;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            font-size:15px;color:#8E8E93;outline:none;"/>
          <span style="font-size:15px;color:#8E8E93;">mins</span>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="cycle-type-selector">
          ${['Indoor','Outdoor'].map(t => `
            <button class="session-type-btn" data-ctype="${t}"
              style="padding:12px 8px;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${cycleTypes.includes(t) ? 'rgba(255,149,0,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;font-weight:${cycleTypes.includes(t) ? '600' : '400'};
              color:${cycleTypes.includes(t) ? '#FF9500' : '#000'};cursor:pointer;">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Workout</div>
        <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid #E5E5EA;">
            <span style="font-size:15px;color:#000;">Target Distance</span>
            <span style="font-size:15px;color:#8E8E93;font-weight:500;">${Units.displayDistance(session.distance)}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
            <span style="font-size:15px;color:#000;">Target Pace</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <input id="cycle-pace" type="tel" placeholder="e.g. 15"
                value="${ci.cyclePace || ''}"
                style="width:60px;text-align:right;border:none;background:transparent;
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:15px;color:#8E8E93;outline:none;"/>
              <span style="font-size:15px;color:#8E8E93;">${Units.speedUnit()}</span>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
        <div style="display:flex;gap:8px;" id="cycle-rating-selector">
          ${[1,2,3,4,5].map(n => `
            <button class="session-rating-btn" data-rating="${n}"
              style="flex:1;padding:12px 0;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${(ci.cycleRating||0) >= n ? 'rgba(255,149,0,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:20px;cursor:pointer;
              color:${(ci.cycleRating||0) >= n ? '#FF9500' : '#D1D1D6'};">★</button>`).join('')}
        </div>
      </div>`;
  }

  if (session.type === 'smart-gym' || session.type === 'smart-sports' ||
      session.type === 'smart-cardio' || session.type === 'smart-other') {
    const det      = session.details || {};
    const smartDur = ci.smartDuration ?? '';

    // Previous occurrence lookup (used for placeholders across all smart types)
    let prevSmartCI = null;
    if (session.recurrence && session.recurrence !== 'none') {
      const allCIs_       = Store.getAllCheckIns();
      const intervalDays_ = session.recurrence === 'weekly' ? 7 : (parseInt(session.recurrenceEveryDays) || 7);
      const target_       = new Date(dateStr + 'T00:00:00');
      for (let i = 1; i <= 52; i++) {
        const prev_ = new Date(target_);
        prev_.setDate(target_.getDate() - intervalDays_ * i);
        const prevStr_ = `${prev_.getFullYear()}-${String(prev_.getMonth()+1).padStart(2,'0')}-${String(prev_.getDate()).padStart(2,'0')}`;
        const prevCI_  = allCIs_[prevStr_];
        if (prevCI_ && (prevCI_.smartDuration || prevCI_.smartCardioDuration || prevCI_.smartCardioDistance || prevCI_.smartCardioSpeed || prevCI_.smartGymSets)) {
          prevSmartCI = prevCI_;
          break;
        }
      }
    }
    const prevDur = prevSmartCI?.smartDuration || '';

    // Duration input (non-cardio smart types — cardio includes it in its own card)
    if (session.type !== 'smart-cardio') {
      html += `
        <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;color:#000;">Duration</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <input id="smart-duration" type="number" inputmode="decimal"
              value="${smartDur}" placeholder="${smartDur ? '60' : (prevDur || '60')}"
              style="width:50px;text-align:right;border:none;background:transparent;
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#8E8E93;outline:none;"/>
            <span style="font-size:15px;color:#8E8E93;">mins</span>
          </div>
        </div>`;
    }

    // Type-specific content
    if (session.type === 'smart-gym') {
      if (det.exercises && det.exercises.length) {
        const savedSets = ci.smartGymSets || {};
        const prevSets  = prevSmartCI?.smartGymSets || {};
        html += `
          <div style="margin-top:16px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Exercises</div>
            ${buildGymExerciseRowsHTML(det.exercises, savedSets, prevSets, ci.rag || 'green', 'smart-gym-exercises')}
            <div style="margin-top:8px;text-align:right;">
              <button id="gym-copy-btn"
                style="background:none;border:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:13px;color:#8E8E93;cursor:pointer;padding:4px 0;">
                Copy to Bevel
              </button>
            </div>
          </div>`;
      }
    }

    if (session.type === 'smart-cardio') {
      const det       = session.details || {};
      const curDur    = ci.smartCardioDuration || '';
      const curDist   = ci.smartCardioDistance || '';
      const curSpeed  = ci.smartCardioSpeed    || '';
      const prevDur   = prevSmartCI?.smartCardioDuration  || '';
      const prevDist  = prevSmartCI?.smartCardioDistance  || '';
      const prevSpeed = prevSmartCI?.smartCardioSpeed     || '';

      // Build rows only for fields that were planned or have a previous actual
      const allRows = [
        { label: 'Duration', id: 'smart-cardio-duration', val: curDur,   unit: 'mins',                planned: det.duration, prev: prevDur   },
        { label: 'Distance', id: 'smart-cardio-distance', val: curDist,  unit: Units.distanceUnit(),   planned: det.distance, prev: prevDist  },
        { label: 'Speed',    id: 'smart-cardio-speed',    val: curSpeed, unit: Units.speedUnit(),      planned: det.pace,     prev: prevSpeed },
      ];
      // Show row if a planned value was set, or if there's a recorded actual/previous
      const cardioRows = allRows.filter(r => r.planned || r.val || r.prev);
      // If nothing planned at all, show all three
      const rows = cardioRows.length ? cardioRows : allRows;

      html += `
        <div style="margin-top:16px;">
          <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            ${rows.map((r, i) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;${i < rows.length - 1 ? 'border-bottom:0.5px solid #E5E5EA;' : ''}">
                <span style="font-size:15px;color:#000;">${r.label}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="${r.id}" type="number" inputmode="decimal" value="${r.val}"
                    placeholder="${r.val ? '' : (r.planned || r.prev || '—')}"
                    style="width:60px;text-align:right;border:none;background:transparent;
                    font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#8E8E93;outline:none;"/>
                  <span style="font-size:15px;color:#8E8E93;">${r.unit}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // Session Rating (all smart types)
    const smartRating = ci.smartRating || 0;
    html += `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
        <div style="display:flex;gap:8px;" id="smart-rating-selector">
          ${[1,2,3,4,5].map(n => `
            <button class="session-rating-btn" data-rating="${n}"
              style="flex:1;padding:12px 0;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${smartRating >= n ? 'rgba(255,149,0,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:20px;cursor:pointer;
              color:${smartRating >= n ? '#FF9500' : '#D1D1D6'};">★</button>`).join('')}
        </div>
      </div>`;

    // Session Notes (editable)
    const smartNotes = ci.smartNotes || det.notes || '';
    html += `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Notes</div>
        <textarea id="smart-notes-input" placeholder="How did it go? Any notes..."
          autocapitalize="sentences"
          style="width:100%;min-height:90px;padding:12px 16px;background:#F9F9F9;border:none;
          border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);
          font-family:-apple-system,BlinkMacSystemFont,sans-serif;
          font-size:15px;color:#000;resize:none;outline:none;
          -webkit-appearance:none;box-sizing:border-box;"
        >${smartNotes}</textarea>
      </div>`;

    if (session.recurrence && session.recurrence !== 'none') {
      const recLabel = session.recurrence === 'weekly' ? 'Every week' : `Every ${session.recurrenceEveryDays || ''} days`;
      html += detailRow('Repeat', recLabel);
    }
    return html;
  }

  if (session.type === 'golf') {
    const profile      = Store.getProfile();
    const handicap     = ci.handicapSnapshot || profile.golfHandicap || null;
    const golfTypes    = Array.isArray(ci.golfTypes) ? ci.golfTypes : [];
    const golfDuration = ci.golfDuration ?? 60;
    html += `
      <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;color:#000;">Duration</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <input id="golf-duration" type="number" inputmode="decimal"
            value="${golfDuration}"
            style="width:50px;text-align:right;border:none;background:transparent;
            font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            font-size:15px;color:#8E8E93;outline:none;"/>
          <span style="font-size:15px;color:#8E8E93;">mins</span>
        </div>
      </div>`;
    if (handicap) html += detailRow('Current Handicap', handicap);
    html += `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="golf-type-selector">
          ${['Range','Short Game','Full Round','Lesson'].map(t => `
            <button class="session-type-btn" data-gtype="${t}"
              style="padding:12px 8px;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${golfTypes.includes(t) ? 'rgba(52,199,89,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;font-weight:${golfTypes.includes(t) ? '600' : '400'};
              color:${golfTypes.includes(t) ? '#34C759' : '#000'};cursor:pointer;">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
        <div style="display:flex;gap:8px;" id="golf-rating-selector">
          ${[1,2,3,4,5].map(n => `
            <button class="session-rating-btn" data-rating="${n}"
              style="flex:1;padding:12px 0;border-radius:10px;border:none;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);
              background:${(ci.golfRating||0) >= n ? 'rgba(52,199,89,0.12)' : '#F9F9F9'};
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:20px;cursor:pointer;
              color:${(ci.golfRating||0) >= n ? '#34C759' : '#D1D1D6'};">★</button>`).join('')}
        </div>
      </div>`;
  }

  html += `
    <div style="margin-top:16px;">
      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Notes</div>
      <textarea
        id="session-notes-input"
        placeholder="How did it go? Any notes..."
        autocapitalize="sentences"
        style="
          width:100%;min-height:90px;padding:12px 16px;
          background:#F9F9F9;border:none;
          border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);
          font-size:15px;color:#000;resize:none;outline:none;
          -webkit-appearance:none;box-sizing:border-box;
        "
      >${notes}</textarea>
    </div>`;

  return html;
}

function openSessionModal(dateStr) {
  const existing = document.getElementById('session-modal-backdrop');
  if (existing) existing.remove();

  const profile   = Store.getProfile();
  const ci        = Store.getCheckIn(dateStr) || {};
  const rag       = ci.rag || 'green';
  const session   = TrainingData.getSessionForDate(dateStr, profile.programmeStart, rag, profile.programme, profile.programmeLengthWeeks);
  const completed = TrainingPage.isCompleted(dateStr);
  const isFuture  = dateStr > TrainingPage.todayStr();

  // Snapshot belt and handicap into the check-in when modal opens
  if (!isFuture && session.type === 'bjj' && profile.bjjBelt) {
    saveSessionField(dateStr, 'beltSnapshot',    profile.bjjBelt);
    saveSessionField(dateStr, 'stripesSnapshot', profile.bjjStripes);
  }
  if (!isFuture && session.type === 'golf' && profile.golfHandicap) {
    saveSessionField(dateStr, 'handicapSnapshot', profile.golfHandicap);
  }

  const title    = TrainingPage.sessionTitle(session);
  const bodyHTML = buildModalBody(session, dateStr);
  const btnText  = completed ? 'Completed ✓' : 'Mark as Complete';

  const d     = TrainingPage.parseLocalDate(dateStr);
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // Readiness pill for this day
  const RAG_COLOUR_MAP = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' };
  const readinessPill = (ci.score !== undefined && ci.score !== null)
    ? `<div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;
         background:${RAG_COLOUR_MAP[ci.rag] || '#30D158'}1A;
         border-radius:20px;padding:7px 14px;">
         <span style="width:8px;height:8px;border-radius:50%;background:${RAG_COLOUR_MAP[ci.rag] || '#30D158'};flex-shrink:0;display:inline-block;"></span>
         <span style="font-size:13px;font-weight:600;color:${RAG_COLOUR_MAP[ci.rag] || '#30D158'};">Readiness ${ci.score}%</span>
       </div>`
    : '';

  const backdrop = document.createElement('div');
  backdrop.id    = 'session-modal-backdrop';

  backdrop.innerHTML = `
    <div id="session-modal">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div>
          <span class="modal-header-title">${title}</span>
          ${session.subtitle ? `<div style="font-size:13px;color:var(--label-secondary);margin-top:1px;font-weight:500;">${session.subtitle}</div>` : ''}
          <div style="font-size:13px;color:var(--label-tertiary);margin-top:2px;">${label}</div>
          ${readinessPill}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${profile.programme === 'smart' ? (session.type === 'rest'
            ? `<button class="modal-close-btn" id="session-modal-add-btn" style="width:auto;padding:0 12px;font-size:13px;font-weight:600;color:var(--colour-blue);background:rgba(0,122,255,0.1);">+ Add</button>`
            : `<button class="modal-close-btn" id="session-modal-edit-btn" style="width:auto;padding:0 12px;font-size:13px;font-weight:600;color:var(--colour-blue);background:rgba(0,122,255,0.1);">Edit</button>`
          ) : ''}
          <button class="modal-close-btn" id="session-modal-close">✕</button>
        </div>
      </div>
      <div class="modal-scroll-body" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 var(--space-md) 0;overscroll-behavior:contain;">
        ${bodyHTML}
        ${!isFuture && session.type !== 'rest' ? `
        <div style="padding:var(--space-md) 0 calc(var(--nav-inner-height) + env(safe-area-inset-bottom, 0px) + var(--space-lg) + 12px);">
          <button class="btn ${completed ? 'btn-secondary' : 'btn-primary'}"
            id="session-modal-complete-btn"
            data-date="${dateStr}"
            data-completed="${completed}"
            style="min-height:52px;font-size:17px;opacity:${completed ? '0.6' : '1'};"
          >${btnText}</button>
        </div>` : `<div style="padding-bottom:calc(var(--nav-inner-height) + env(safe-area-inset-bottom, 0px) + var(--space-lg) + 12px);"></div>`}
      </div>
    </div>
  `;

  const container = document.getElementById('app') || document.body;
  container.appendChild(backdrop);

  requestAnimationFrame(() => { backdrop.classList.add('open'); });
  lockBodyScroll();

  // Close handlers
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeSessionModal();
  });
  document.getElementById('session-modal-close').addEventListener('click', closeSessionModal);

  // Drag to dismiss
  const sessionModal = document.getElementById('session-modal');
  const scrollBody   = sessionModal?.querySelector('.modal-scroll-body');
  if (sessionModal) attachModalDrag(sessionModal, scrollBody, closeSessionModal);

  // Auto-save notes
  document.getElementById('session-notes-input')?.addEventListener('input', e => {
    saveSessionField(dateStr, 'sessionNotes', e.target.value);
  });

  // BJJ type — multi-select
  bindMultiSelect('bjj-type-selector', 'type', dateStr, 'bjjTypes', '#007AFF', 'rgba(0,122,255,0.12)');

  // BJJ rating
  let bjjRatingCurrent = (Store.getCheckIn(dateStr) || {}).bjjRating || 0;
  document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapped = parseInt(btn.dataset.rating);
      bjjRatingCurrent = bjjRatingCurrent === tapped ? 0 : tapped;
      saveSessionField(dateStr, 'bjjRating', bjjRatingCurrent);
      document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        const active = bjjRatingCurrent >= parseInt(b.dataset.rating);
        b.style.background = active ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
        b.style.color = active ? '#FF9500' : '#D1D1D6';
      });
    });
  });

  // Gym type — multi-select
  bindMultiSelect('gym-type-selector', 'gtype', dateStr, 'gymTypes', '#007AFF', 'rgba(0,122,255,0.12)');

  // Gym rating
  let gymRatingCurrent = (Store.getCheckIn(dateStr) || {}).gymRating || 0;
  document.getElementById('gym-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapped = parseInt(btn.dataset.rating);
      gymRatingCurrent = gymRatingCurrent === tapped ? 0 : tapped;
      saveSessionField(dateStr, 'gymRating', gymRatingCurrent);
      document.getElementById('gym-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        const active = gymRatingCurrent >= parseInt(b.dataset.rating);
        b.style.background = active ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
        b.style.color = active ? '#FF9500' : '#D1D1D6';
      });
    });
  });

  // Cycle type — multi-select
  bindMultiSelect('cycle-type-selector', 'ctype', dateStr, 'cycleTypes', '#FF9500', 'rgba(255,149,0,0.12)');

  // Cycle rating
  let cycleRatingCurrent = (Store.getCheckIn(dateStr) || {}).cycleRating || 0;
  document.getElementById('cycle-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapped = parseInt(btn.dataset.rating);
      cycleRatingCurrent = cycleRatingCurrent === tapped ? 0 : tapped;
      saveSessionField(dateStr, 'cycleRating', cycleRatingCurrent);
      document.getElementById('cycle-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        const active = cycleRatingCurrent >= parseInt(b.dataset.rating);
        b.style.background = active ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
        b.style.color = active ? '#FF9500' : '#D1D1D6';
      });
    });
  });

  // Duration inputs
  ['bjj-duration','gym-duration','cycle-duration','golf-duration'].forEach(id => {
    const fieldMap = { 'bjj-duration': 'bjjDuration', 'gym-duration': 'gymDuration', 'cycle-duration': 'cycleDuration', 'golf-duration': 'golfDuration' };
    document.getElementById(id)?.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) saveSessionField(dateStr, fieldMap[id], v);
    });
  });
  document.getElementById('cycle-pace')?.addEventListener('input', e => {
    if (e.target.value !== '') saveSessionField(dateStr, 'cyclePace', e.target.value);
  });

  // Golf rating
  let golfRatingCurrent = (Store.getCheckIn(dateStr) || {}).golfRating || 0;
  document.getElementById('golf-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapped = parseInt(btn.dataset.rating);
      golfRatingCurrent = golfRatingCurrent === tapped ? 0 : tapped;
      saveSessionField(dateStr, 'golfRating', golfRatingCurrent);
      document.getElementById('golf-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        const active = golfRatingCurrent >= parseInt(b.dataset.rating);
        b.style.background = active ? 'rgba(52,199,89,0.12)' : '#F9F9F9';
        b.style.color = active ? '#34C759' : '#D1D1D6';
      });
    });
  });

  // Golf type — multi-select
  bindMultiSelect('golf-type-selector', 'gtype', dateStr, 'golfTypes', '#34C759', 'rgba(52,199,89,0.12)');

  // Smart session elements
  document.getElementById('smart-duration')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) saveSessionField(dateStr, 'smartDuration', v);
  });
  document.getElementById('smart-notes-input')?.addEventListener('input', () => saveSessionField(dateStr, 'smartNotes', document.getElementById('smart-notes-input')?.value || ''));

  let smartRatingCurrent = (Store.getCheckIn(dateStr) || {}).smartRating || 0;
  document.getElementById('smart-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapped = parseInt(btn.dataset.rating);
      smartRatingCurrent = smartRatingCurrent === tapped ? 0 : tapped;
      saveSessionField(dateStr, 'smartRating', smartRatingCurrent);
      document.getElementById('smart-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        const active = smartRatingCurrent >= parseInt(b.dataset.rating);
        b.style.background = active ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
        b.style.color = active ? '#FF9500' : '#D1D1D6';
      });
    });
  });

  // Gym exercise expand/collapse — works for both hypertrophy and smart-gym containers
  ['hypertrophy-exercises', 'smart-gym-exercises'].forEach(containerId => {
    document.getElementById(containerId)?.querySelectorAll('.gym-ex-header').forEach(header => {
      header.addEventListener('click', () => {
        const setPane = header.parentElement.querySelector('.gym-ex-sets');
        const chevron = header.querySelector('.gym-ex-chevron');
        const open    = setPane.style.display !== 'none';
        setPane.style.display = open ? 'none' : 'block';
        if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
      });
    });
  });

  // Generic gym sets save — reads all rendered load/reps inputs for a given container
  function saveGymSetsFromContainer(containerId, storeField, exerciseNames) {
    const saved = {};
    exerciseNames.forEach((name, exIdx) => {
      const loadInputs = document.querySelectorAll(`#${containerId} .gym-set-load[data-ex="${exIdx}"]`);
      const rows = [];
      loadInputs.forEach((loadEl, s) => {
        const repsEl = document.querySelector(`#${containerId} .gym-set-reps[data-ex="${exIdx}"][data-set="${s}"]`);
        rows.push({ load: loadEl.value || '', reps: repsEl?.value || '' });
      });
      saved[name] = rows;
    });
    saveSessionField(dateStr, storeField, saved);
  }

  // Hypertrophy sets auto-save
  if (session.type === 'hypertrophy') {
    const exNames = session.exercises.map(e => e.name);
    document.getElementById('hypertrophy-exercises')?.addEventListener('input', e => {
      if (e.target.classList.contains('gym-set-reps') || e.target.classList.contains('gym-set-load')) {
        saveGymSetsFromContainer('hypertrophy-exercises', 'gymSets', exNames);
      }
    });
  }

  // Smart-gym sets auto-save
  if (session.type === 'smart-gym') {
    const prof    = Store.getProfile();
    const sess    = TrainingData.getSessionForDate(dateStr, prof.programmeStart, Store.getCheckIn(dateStr)?.rag || 'green', prof.programme, prof.programmeLengthWeeks);
    const exNames = (sess.details?.exercises || []).map(e => e.name);
    document.getElementById('smart-gym-exercises')?.addEventListener('input', e => {
      if (e.target.classList.contains('gym-set-reps') || e.target.classList.contains('gym-set-load')) {
        saveGymSetsFromContainer('smart-gym-exercises', 'smartGymSets', exNames);
      }
    });
  }

  // Copy for Bevel button — works for both session types
  document.getElementById('gym-copy-btn')?.addEventListener('click', () => {
    const isHypertrophy = session.type === 'hypertrophy';
    const exercises     = isHypertrophy ? session.exercises : (session.details?.exercises || []);
    const savedSets     = isHypertrophy ? (Store.getCheckIn(dateStr)?.gymSets || {}) : (Store.getCheckIn(dateStr)?.smartGymSets || {});
    const text          = formatGymSetsForClipboard(exercises, savedSets);
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('gym-copy-btn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy to Bevel'; }, 2000); }
    });
  });

  document.getElementById('smart-cardio-duration')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) saveSessionField(dateStr, 'smartCardioDuration', v);
  });
  document.getElementById('smart-cardio-distance')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) saveSessionField(dateStr, 'smartCardioDistance', v);
  });
  document.getElementById('smart-cardio-speed')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) saveSessionField(dateStr, 'smartCardioSpeed', v);
  });

  // Add / Edit buttons (smart programme only)
  document.getElementById('session-modal-add-btn')?.addEventListener('click', () => openAddWorkoutModal(dateStr, null));
  document.getElementById('session-modal-edit-btn')?.addEventListener('click', () => {
    openAddWorkoutModal(dateStr, Store.getSmartWorkoutForDate(dateStr));
  });

  // Complete button
  const btn = document.getElementById('session-modal-complete-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const gymDur    = document.getElementById('gym-duration');
      const cycleDur  = document.getElementById('cycle-duration');
      const golfDur   = document.getElementById('golf-duration');
      const bjjDur    = document.getElementById('bjj-duration');
      const smartDur  = document.getElementById('smart-duration');
      const smartNote = document.getElementById('smart-notes-input');
      if (gymDur)    saveSessionField(dateStr, 'gymDuration',   parseFloat(gymDur.value)   || 60);
      if (cycleDur)  saveSessionField(dateStr, 'cycleDuration', parseFloat(cycleDur.value) || 60);
      if (golfDur)   saveSessionField(dateStr, 'golfDuration',  parseFloat(golfDur.value)  || 60);
      if (bjjDur)    saveSessionField(dateStr, 'bjjDuration',   parseFloat(bjjDur.value)   || 60);
      if (smartDur)  saveSessionField(dateStr, 'smartDuration', parseFloat(smartDur.value) || null);
      if (smartNote) saveSessionField(dateStr, 'smartNotes',    smartNote.value);
      const wasCompleted = TrainingPage.isCompleted(dateStr);
      TrainingPage.toggleComplete(dateStr);
      if (!wasCompleted) closeSessionModal();
    });
  }
}
