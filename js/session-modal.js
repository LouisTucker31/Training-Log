/* ============================================================
   session-modal.js — Session detail modal (view + log session)
   ============================================================ */

// Shared helpers used by both this file and workout-modal.js
function saveSessionField(dateStr, field, value) {
  const all   = Store.getAllCheckIns();
  const entry = all[dateStr] || { date: dateStr };
  entry[field] = value;
  all[dateStr] = entry;
  try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
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
  setTimeout(() => backdrop.remove(), 400);
}

function buildModalBody(session, dateStr) {
  const ci    = Store.getCheckIn(dateStr) || {};
  const notes = ci.sessionNotes || '';

  if (session.type === 'rest' || session.type === 'none') {
    return `<p style="color:#8E8E93;font-size:15px;margin-top:8px;">Rest day — take it easy.</p>`;
  }
  if (session.type === 'race') {
    return `<p style="color:#8E8E93;font-size:15px;margin-top:8px;">Cycling event — Fri to Sun, ~130 miles per day.</p>`;
  }

  let html = '';

  if (session.type === 'hypertrophy') {
    const vol      = session.volume || 'green';
    const labels   = { green: 'Green Volume', amber: 'Amber Volume', red: 'Red Volume' };
    const gymTypes = Array.isArray(ci.gymTypes) ? ci.gymTypes : [];
    const gymDuration = ci.gymDuration ?? 60;
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
        <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${session.exercises.map((e, i) => `
            <div style="
              display:flex;justify-content:space-between;align-items:center;
              padding:12px 16px;
              ${i < session.exercises.length - 1 ? 'border-bottom:0.5px solid #E5E5EA;' : ''}
            ">
              <span style="font-size:15px;color:#000;">${e.name}</span>
              <span style="font-size:15px;color:#8E8E93;font-weight:500;">${e.sets} sets</span>
            </div>`).join('')}
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
              font-size:20px;cursor:pointer;">★</button>`).join('')}
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
              font-size:20px;cursor:pointer;">★</button>`).join('')}
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
              font-size:20px;cursor:pointer;">★</button>`).join('')}
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
        if (prevCI_ && (prevCI_.smartDuration || prevCI_.smartCardioDistance || prevCI_.smartCardioSpeed || prevCI_.smartGymSets)) {
          prevSmartCI = prevCI_;
          break;
        }
      }
    }
    const prevDur = prevSmartCI?.smartDuration || '';

    // Duration input (all smart types)
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

    // Type-specific content
    if (session.type === 'smart-gym') {
      if (det.exercises && det.exercises.length) {
        const savedSets = ci.smartGymSets || {};
        const prevSets  = prevSmartCI?.smartGymSets || {};
        html += `
          <div style="margin-top:16px;">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Exercises</div>
            <div id="smart-gym-exercises" style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              ${det.exercises.map((e, exIdx) => {
                const baseSets  = parseInt(e.sets) || 3;
                const ragReduce = ci.rag === 'red' ? 2 : ci.rag === 'amber' ? 1 : 0;
                const numSets   = prevSmartCI ? Math.max(1, baseSets - ragReduce) : baseSets;
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
                const notLast = exIdx < det.exercises.length - 1;
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
            </div>
          </div>`;
      }
    }

    if (session.type === 'smart-cardio') {
      const curDist   = ci.smartCardioDistance || '';
      const curSpeed  = ci.smartCardioSpeed    || '';
      const prevDist  = prevSmartCI?.smartCardioDistance || '';
      const prevSpeed = prevSmartCI?.smartCardioSpeed    || '';
      const cardioRows = [
        { label: 'Distance', id: 'smart-cardio-distance', val: curDist,  unit: Units.distanceUnit(), placeholder: curDist  ? '0' : (prevDist  || '0') },
        { label: 'Speed',    id: 'smart-cardio-speed',    val: curSpeed, unit: Units.speedUnit(),    placeholder: curSpeed ? '0' : (prevSpeed || '0') },
      ];
      html += `
        <div style="margin-top:16px;">
          <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            ${cardioRows.map((r, i) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;${i < cardioRows.length - 1 ? 'border-bottom:0.5px solid #E5E5EA;' : ''}">
                <span style="font-size:15px;color:#000;">${r.label}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input id="${r.id}" type="number" inputmode="decimal" value="${r.val}" placeholder="${r.placeholder}"
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
              font-size:20px;cursor:pointer;">★</button>`).join('')}
        </div>
      </div>`;

    // Session Notes (editable)
    const smartNotes = ci.smartNotes || det.notes || '';
    html += `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Notes</div>
        <textarea id="smart-notes-input" placeholder="How did it go? Any notes..."
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
              font-size:20px;cursor:pointer;">★</button>`).join('')}
        </div>
      </div>`;
  }

  html += `
    <div style="margin-top:16px;">
      <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Notes</div>
      <textarea
        id="session-notes-input"
        placeholder="How did it go? Any notes..."
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
      <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 var(--space-md) 0;">
        ${bodyHTML}
        ${!isFuture && session.type !== 'rest' ? `
        <div style="padding:var(--space-md) 0 100px;">
          <button class="btn ${completed ? 'btn-secondary' : 'btn-primary'}"
            id="session-modal-complete-btn"
            data-date="${dateStr}"
            data-completed="${completed}"
            style="min-height:52px;font-size:17px;opacity:${completed ? '0.6' : '1'};"
          >${btnText}</button>
        </div>` : ''}
      </div>
    </div>
  `;

  const container = document.getElementById('app') || document.body;
  container.appendChild(backdrop);

  requestAnimationFrame(() => { backdrop.classList.add('open'); });

  // Close handlers
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeSessionModal();
  });
  document.getElementById('session-modal-close').addEventListener('click', closeSessionModal);

  // Drag to dismiss
  const sessionModal  = document.getElementById('session-modal');
  const sessionHandle = sessionModal?.querySelector('.modal-handle');
  if (sessionModal && sessionHandle) {
    let startY = 0, lastY = 0, dragging = false;
    sessionHandle.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY; lastY = startY; dragging = true;
      sessionModal.style.transition = 'none';
      e.preventDefault();
    }, { passive: false });
    sessionHandle.addEventListener('touchmove', e => {
      if (!dragging) return;
      lastY = e.touches[0].clientY;
      sessionModal.style.transform = `translateY(${Math.max(0, lastY - startY)}px)`;
      e.preventDefault();
    }, { passive: false });
    sessionHandle.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      sessionModal.style.transition = '';
      if (Math.max(0, lastY - startY) > 120) closeSessionModal();
      else sessionModal.style.transform = 'translateY(0)';
    });
  }

  // Auto-save notes
  document.getElementById('session-notes-input')?.addEventListener('input', () => {
    const input = document.getElementById('session-notes-input');
    if (!input) return;
    const all   = Store.getAllCheckIns();
    const entry = all[dateStr] || { date: dateStr };
    entry.sessionNotes = input.value;
    all[dateStr] = entry;
    try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
  });

  // BJJ type — multi-select
  document.getElementById('bjj-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const all   = Store.getAllCheckIns();
      const entry = all[dateStr] || { date: dateStr };
      let types   = Array.isArray(entry.bjjTypes) ? [...entry.bjjTypes] : [];
      const t     = btn.dataset.type;
      types = types.includes(t) ? types.filter(x => x !== t) : [...types, t];
      entry.bjjTypes = types; all[dateStr] = entry;
      try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
      document.getElementById('bjj-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
        const sel = types.includes(b.dataset.type);
        b.style.background = sel ? 'rgba(0,122,255,0.12)' : '#F9F9F9';
        b.style.fontWeight = sel ? '600' : '400';
        b.style.color      = sel ? '#007AFF' : '#000';
      });
    });
  });

  // BJJ rating
  document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      saveSessionField(dateStr, 'bjjRating', rating);
      document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        b.style.background = rating >= parseInt(b.dataset.rating) ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
      });
    });
  });

  // Gym type — multi-select
  document.getElementById('gym-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const all   = Store.getAllCheckIns();
      const entry = all[dateStr] || { date: dateStr };
      let types   = Array.isArray(entry.gymTypes) ? [...entry.gymTypes] : [];
      const t     = btn.dataset.gtype;
      types = types.includes(t) ? types.filter(x => x !== t) : [...types, t];
      entry.gymTypes = types; all[dateStr] = entry;
      try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
      document.getElementById('gym-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
        const sel = types.includes(b.dataset.gtype);
        b.style.background = sel ? 'rgba(0,122,255,0.12)' : '#F9F9F9';
        b.style.fontWeight = sel ? '600' : '400';
        b.style.color      = sel ? '#007AFF' : '#000';
      });
    });
  });

  // Gym rating
  document.getElementById('gym-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      saveSessionField(dateStr, 'gymRating', rating);
      document.getElementById('gym-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        b.style.background = rating >= parseInt(b.dataset.rating) ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
      });
    });
  });

  // Cycle type — multi-select
  document.getElementById('cycle-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const all   = Store.getAllCheckIns();
      const entry = all[dateStr] || { date: dateStr };
      let types   = Array.isArray(entry.cycleTypes) ? [...entry.cycleTypes] : [];
      const t     = btn.dataset.ctype;
      types = types.includes(t) ? types.filter(x => x !== t) : [...types, t];
      entry.cycleTypes = types; all[dateStr] = entry;
      try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
      document.getElementById('cycle-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
        const sel = types.includes(b.dataset.ctype);
        b.style.background = sel ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
        b.style.fontWeight = sel ? '600' : '400';
        b.style.color      = sel ? '#FF9500' : '#000';
      });
    });
  });

  // Cycle rating
  document.getElementById('cycle-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      saveSessionField(dateStr, 'cycleRating', rating);
      document.getElementById('cycle-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        b.style.background = rating >= parseInt(b.dataset.rating) ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
      });
    });
  });

  // Duration inputs
  document.getElementById('bjj-duration')?.addEventListener('input',   e => saveSessionField(dateStr, 'bjjDuration',   parseFloat(e.target.value) || 60));
  document.getElementById('gym-duration')?.addEventListener('input',   e => saveSessionField(dateStr, 'gymDuration',   parseFloat(e.target.value) || 60));
  document.getElementById('cycle-duration')?.addEventListener('input', e => saveSessionField(dateStr, 'cycleDuration', parseFloat(e.target.value) || 60));
  document.getElementById('golf-duration')?.addEventListener('input',  e => saveSessionField(dateStr, 'golfDuration',  parseFloat(e.target.value) || 60));
  document.getElementById('cycle-pace')?.addEventListener('input',     e => saveSessionField(dateStr, 'cyclePace', e.target.value));

  // Golf rating
  document.getElementById('golf-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      saveSessionField(dateStr, 'golfRating', rating);
      document.getElementById('golf-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        b.style.background = rating >= parseInt(b.dataset.rating) ? 'rgba(52,199,89,0.12)' : '#F9F9F9';
      });
    });
  });

  // Golf type — multi-select
  document.getElementById('golf-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const all   = Store.getAllCheckIns();
      const entry = all[dateStr] || { date: dateStr };
      let types   = Array.isArray(entry.golfTypes) ? [...entry.golfTypes] : [];
      const t     = btn.dataset.gtype;
      types = types.includes(t) ? types.filter(x => x !== t) : [...types, t];
      entry.golfTypes = types; all[dateStr] = entry;
      try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
      document.getElementById('golf-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
        const sel = types.includes(b.dataset.gtype);
        b.style.background = sel ? 'rgba(52,199,89,0.12)' : '#F9F9F9';
        b.style.fontWeight = sel ? '600' : '400';
        b.style.color      = sel ? '#34C759' : '#000';
      });
    });
  });

  // Smart session elements
  document.getElementById('smart-duration')?.addEventListener('input', e => saveSessionField(dateStr, 'smartDuration', parseFloat(e.target.value) || null));
  document.getElementById('smart-notes-input')?.addEventListener('input', () => saveSessionField(dateStr, 'smartNotes', document.getElementById('smart-notes-input')?.value || ''));

  document.getElementById('smart-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      saveSessionField(dateStr, 'smartRating', rating);
      document.getElementById('smart-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
        b.style.background = rating >= parseInt(b.dataset.rating) ? 'rgba(255,149,0,0.12)' : '#F9F9F9';
      });
    });
  });

  // Gym exercise expand/collapse
  document.getElementById('smart-gym-exercises')?.querySelectorAll('.gym-ex-header').forEach(header => {
    header.addEventListener('click', () => {
      const setPane = header.parentElement.querySelector('.gym-ex-sets');
      const chevron = header.querySelector('.gym-ex-chevron');
      const open    = setPane.style.display !== 'none';
      setPane.style.display = open ? 'none' : 'block';
      if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
    });
  });

  // Gym set data auto-save
  function saveSmartGymSets() {
    const prof    = Store.getProfile();
    const sess    = TrainingData.getSessionForDate(dateStr, prof.programmeStart, Store.getCheckIn(dateStr)?.rag || 'green', prof.programme, prof.programmeLengthWeeks);
    const det     = sess.details || {};
    if (!det.exercises) return;
    const saved = {};
    document.getElementById('smart-gym-exercises')?.querySelectorAll('.gym-ex-header').forEach((header, exIdx) => {
      const exName  = det.exercises[exIdx]?.name;
      if (!exName) return;
      const numSets = parseInt(det.exercises[exIdx]?.sets) || 3;
      const rows    = [];
      for (let s = 0; s < numSets; s++) {
        rows.push({
          reps: document.querySelector(`.gym-set-reps[data-ex="${exIdx}"][data-set="${s}"]`)?.value || '',
          load: document.querySelector(`.gym-set-load[data-ex="${exIdx}"][data-set="${s}"]`)?.value || '',
        });
      }
      saved[exName] = rows;
    });
    saveSessionField(dateStr, 'smartGymSets', saved);
  }
  document.getElementById('smart-gym-exercises')?.addEventListener('input', e => {
    if (e.target.classList.contains('gym-set-reps') || e.target.classList.contains('gym-set-load')) saveSmartGymSets();
  });

  document.getElementById('smart-cardio-distance')?.addEventListener('input', e => saveSessionField(dateStr, 'smartCardioDistance', parseFloat(e.target.value) || null));
  document.getElementById('smart-cardio-speed')?.addEventListener('input',    e => saveSessionField(dateStr, 'smartCardioSpeed',    parseFloat(e.target.value) || null));

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
