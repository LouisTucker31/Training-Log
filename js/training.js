/* ============================================================
   training.js — Training week view
   ============================================================ */

const TrainingPage = (() => {

  let weekOffset = 0;

  // ─── Date Helpers ─────────────────────────────────────────

  function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayStr() {
    return localDateStr(new Date());
  }

  function getWeekDates(offset) {
    const today  = new Date();
    const dow    = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return localDateStr(d);
    });
  }

  function formatWeekLabel(dates) {
    const first = new Date(dates[0] + 'T00:00:00');
    const last  = new Date(dates[6] + 'T00:00:00');
    const opts  = { day: 'numeric', month: 'short' };
    return `${first.toLocaleDateString('en-GB', opts)} – ${last.toLocaleDateString('en-GB', opts)}`;
  }

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // ─── Session Helpers ──────────────────────────────────────

  function sessionForDate(dateStr) {
    const profile = Store.getProfile();
    if (!profile.programmeStart) return { type: 'none' };
    const checkin = Store.getCheckIn(dateStr);
    const rag     = checkin ? checkin.rag : 'green';
    return TrainingData.getSessionForDate(dateStr, profile.programmeStart, rag);
  }

  function isCompleted(dateStr) {
    const all = Store.getAllCheckIns();
    return all[dateStr]?.completed === true;
  }

  function toggleComplete(dateStr) {
    const all   = Store.getAllCheckIns();
    const entry = all[dateStr] || { date: dateStr };
    entry.completed = !entry.completed;
    all[dateStr] = entry;
    try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
    renderList();
    if (typeof HomePage !== 'undefined') HomePage.render();
    updateModalButton(dateStr);
  }

  function updateModalButton(dateStr) {
    const btn = document.getElementById('session-modal-complete-btn');
    if (!btn || btn.dataset.date !== dateStr) return;
    const completed = isCompleted(dateStr);
    btn.textContent = completed ? 'Completed ✓' : 'Mark as Complete';
    btn.dataset.completed = completed ? 'true' : 'false';
    btn.className = `btn ${completed ? 'btn-secondary' : 'btn-primary'}`;
    btn.style.minHeight = '52px';
    btn.style.fontSize  = '17px';
    btn.style.opacity   = completed ? '0.6' : '1';
  }

  // ─── Session Modal ────────────────────────────────────────

  function openSessionModal(dateStr) {
    const existing = document.getElementById('session-modal-backdrop');
    if (existing) existing.remove();

    const profile   = Store.getProfile();
    const ci        = Store.getCheckIn(dateStr) || {};
    const rag       = ci.rag || 'green';
    const session   = TrainingData.getSessionForDate(dateStr, profile.programmeStart, rag);
    const completed = isCompleted(dateStr);
    const isFuture  = dateStr > todayStr();

    // Snapshot belt and handicap into the check-in when modal opens
    if (!isFuture && session.type === 'bjj' && profile.bjjBelt) {
      saveSessionField(dateStr, 'beltSnapshot',    profile.bjjBelt);
      saveSessionField(dateStr, 'stripesSnapshot', profile.bjjStripes);
    }
    if (!isFuture && session.type === 'golf' && profile.golfHandicap) {
      saveSessionField(dateStr, 'handicapSnapshot', profile.golfHandicap);
    }

    const title   = sessionTitle(session);
    const bodyHTML = buildModalBody(session, dateStr);
    const btnText  = completed ? 'Completed ✓' : 'Mark as Complete';

    const d     = parseLocalDate(dateStr);
    const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    const backdrop = document.createElement('div');
    backdrop.id    = 'session-modal-backdrop';

    backdrop.innerHTML = `
      <div id="session-modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div>
            <span class="modal-header-title">${title}</span>
            <div style="font-size:13px;color:var(--label-tertiary);margin-top:2px;">${label}</div>
          </div>
          <button class="modal-close-btn" id="session-modal-close">✕</button>
        </div>
        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 var(--space-md) 0;">
          ${bodyHTML}
          ${!isFuture ? `
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

    requestAnimationFrame(() => {
      backdrop.classList.add('open');
    });

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
        startY   = e.touches[0].clientY;
        lastY    = startY;
        dragging = true;
        sessionModal.style.transition = 'none';
        e.preventDefault();
      }, { passive: false });

      sessionHandle.addEventListener('touchmove', e => {
        if (!dragging) return;
        lastY = e.touches[0].clientY;
        const delta = Math.max(0, lastY - startY);
        sessionModal.style.transform = `translateY(${delta}px)`;
        e.preventDefault();
      }, { passive: false });

      sessionHandle.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        const delta = Math.max(0, lastY - startY);
        sessionModal.style.transition = '';
        if (delta > 120) {
          closeSessionModal();
        } else {
          sessionModal.style.transform = 'translateY(0)';
        }
      });
    }

    // Auto-save notes
    document.getElementById('session-notes-input')?.addEventListener('input', () => {
      saveNotes(dateStr);
    });

    // BJJ type — multi-select, update in place
    document.getElementById('bjj-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const all   = Store.getAllCheckIns();
        const entry = all[dateStr] || { date: dateStr };
        let types   = Array.isArray(entry.bjjTypes) ? [...entry.bjjTypes] : [];
        const t     = btn.dataset.type;
        if (types.includes(t)) {
          types = types.filter(x => x !== t);
        } else {
          types.push(t);
        }
        entry.bjjTypes  = types;
        all[dateStr]    = entry;
        try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
        // Update button styles in place
        document.getElementById('bjj-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
          const selected = types.includes(b.dataset.type);
          b.style.border     = `1.5px solid ${selected ? '#007AFF' : '#E5E5EA'}`;
          b.style.background = selected ? 'rgba(0,122,255,0.08)' : '#F9F9F9';
          b.style.fontWeight = selected ? '600' : '400';
          b.style.color      = selected ? '#007AFF' : '#000';
        });
      });
    });

    // BJJ rating — update in place
    document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        saveSessionField(dateStr, 'bjjRating', rating);
        document.getElementById('bjj-rating-selector')?.querySelectorAll('.session-rating-btn').forEach(b => {
          const n = parseInt(b.dataset.rating);
          b.style.border     = `1.5px solid ${rating >= n ? '#FF9500' : '#E5E5EA'}`;
          b.style.background = rating >= n ? 'rgba(255,149,0,0.08)' : '#F9F9F9';
        });
      });
    });

    // Cycle type — update in place
    document.querySelectorAll('.cycle-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        saveSessionField(dateStr, 'cycleType', btn.dataset.ctype);
        document.querySelectorAll('.cycle-type-btn').forEach(b => {
          const selected = b.dataset.ctype === btn.dataset.ctype;
          b.style.border     = `1.5px solid ${selected ? '#FF9500' : '#E5E5EA'}`;
          b.style.background = selected ? 'rgba(255,149,0,0.08)' : 'transparent';
          b.style.fontWeight = selected ? '600' : '400';
          b.style.color      = selected ? '#FF9500' : '#000';
        });
      });
    });

    // BJJ duration auto-save
    document.getElementById('bjj-duration')?.addEventListener('input', e => {
      saveSessionField(dateStr, 'bjjDuration', parseFloat(e.target.value) || 60);
    });

    // Cycle pace/duration auto-save
    document.getElementById('cycle-pace')?.addEventListener('input', e => {
      saveSessionField(dateStr, 'cyclePace', e.target.value);
    });
    document.getElementById('cycle-duration')?.addEventListener('input', e => {
      saveSessionField(dateStr, 'cycleDuration', e.target.value);
    });

    // Golf type — multi-select, update in place
    document.getElementById('golf-type-selector')?.querySelectorAll('.session-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const all   = Store.getAllCheckIns();
        const entry = all[dateStr] || { date: dateStr };
        let types   = Array.isArray(entry.golfTypes) ? [...entry.golfTypes] : [];
        const t     = btn.dataset.gtype;
        if (types.includes(t)) {
          types = types.filter(x => x !== t);
        } else {
          types.push(t);
        }
        entry.golfTypes = types;
        all[dateStr]    = entry;
        try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
        // Update button styles in place
        document.getElementById('golf-type-selector')?.querySelectorAll('.session-type-btn').forEach(b => {
          const selected = types.includes(b.dataset.gtype);
          b.style.border     = `1.5px solid ${selected ? '#34C759' : '#E5E5EA'}`;
          b.style.background = selected ? 'rgba(52,199,89,0.08)' : '#F9F9F9';
          b.style.fontWeight = selected ? '600' : '400';
          b.style.color      = selected ? '#34C759' : '#000';
        });
      });
    });

    // Complete button
    const btn = document.getElementById('session-modal-complete-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        saveNotes(dateStr);
        const wasCompleted = isCompleted(dateStr);
        toggleComplete(dateStr);
        if (!wasCompleted) closeSessionModal();
      });
    }
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
      const vol     = session.volume || 'green';
      const labels  = { green: 'Green Volume', amber: 'Amber Volume', red: 'Red Volume' };
      const colours = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' };
      html += `
        <div style="
          display:inline-block;padding:4px 10px;border-radius:6px;margin:8px 0 12px;
          background:rgba(${vol==='green'?'48,209,88':vol==='amber'?'255,159,10':'255,69,58'},0.12);
          color:${colours[vol]};font-size:13px;font-weight:600;
        ">${labels[vol]}</div>
        <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);">
          ${session.exercises.map((e, i) => `
            <div style="
              display:flex;justify-content:space-between;align-items:center;
              padding:12px 16px;
              ${i < session.exercises.length - 1 ? 'border-bottom:0.5px solid #E5E5EA;' : ''}
            ">
              <span style="font-size:15px;color:#000;">${e.name}</span>
              <span style="font-size:15px;color:#8E8E93;font-weight:500;">${e.sets} sets</span>
            </div>`).join('')}
        </div>`;
    }

    if (session.type === 'bjj') {
      // Use snapshot if available, fall back to profile
      const profile  = Store.getProfile();
      const belt     = ci.beltSnapshot    || profile.bjjBelt    || null;
      const stripes  = ci.stripesSnapshot !== undefined ? ci.stripesSnapshot : (profile.bjjStripes || null);
      const beltHTML = belt ? detailRow('Belt', `${belt}${stripes !== null && stripes !== '' ? ` · ${stripes} stripe${stripes == 1 ? '' : 's'}` : ''}`) : '';
      const bjjTypes = Array.isArray(ci.bjjTypes) ? ci.bjjTypes : [];

      const bjjDuration = ci.bjjDuration ?? session.duration ?? 60;
      html += `
        <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:15px;color:#000;">Duration</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <input id="bjj-duration" type="number" inputmode="decimal"
              placeholder="60"
              value="${bjjDuration}"
              style="width:50px;text-align:right;border:none;background:transparent;
              font-family:-apple-system,BlinkMacSystemFont,sans-serif;
              font-size:15px;color:#8E8E93;outline:none;"/>
            <span style="font-size:13px;color:#8E8E93;">mins</span>
          </div>
        </div>`;
      html += beltHTML;
      html += `
        <div style="margin-top:12px;">
          <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="bjj-type-selector">
            ${['Regular Class','Competition Class','Open Mat','Competition'].map(t => `
              <button class="session-type-btn" data-type="${t}"
                style="padding:10px 8px;border-radius:10px;
                border:1.5px solid ${bjjTypes.includes(t) ? '#007AFF' : '#E5E5EA'};
                background:${bjjTypes.includes(t) ? 'rgba(0,122,255,0.08)' : '#F9F9F9'};
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:13px;font-weight:${bjjTypes.includes(t) ? '600' : '400'};
                color:${bjjTypes.includes(t) ? '#007AFF' : '#000'};cursor:pointer;">
                ${t}
              </button>`).join('')}
          </div>
        </div>
        <div style="margin-top:12px;">
          <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Rating</div>
          <div style="display:flex;gap:8px;" id="bjj-rating-selector">
            ${[1,2,3,4,5].map(n => `
              <button class="session-rating-btn" data-rating="${n}"
                style="flex:1;padding:10px 0;border-radius:10px;
                border:1.5px solid ${(ci.bjjRating||0) >= n ? '#FF9500' : '#E5E5EA'};
                background:${(ci.bjjRating||0) >= n ? 'rgba(255,149,0,0.08)' : '#F9F9F9'};
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:18px;cursor:pointer;">★</button>`).join('')}
          </div>
        </div>`;
    }

    if (session.type === 'cycle') {
      html += detailRow('Target distance', Units.displayDistance(session.distance));
      html += `
        <div style="margin-top:12px;">
          <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Details</div>
          <div style="background:#F9F9F9;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid #E5E5EA;">
              <span style="font-size:15px;color:#000;">Target Pace</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <input id="cycle-pace" type="tel" placeholder="e.g. 15"
                  value="${ci.cyclePace || ''}"
                  style="width:60px;text-align:right;border:none;background:transparent;
                  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                  font-size:15px;color:#8E8E93;outline:none;"/>
                <span style="font-size:13px;color:#8E8E93;">mph</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid #E5E5EA;">
              <span style="font-size:15px;color:#000;">Duration</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <input id="cycle-duration" type="tel" placeholder="e.g. 90"
                  value="${ci.cycleDuration || ''}"
                  style="width:60px;text-align:right;border:none;background:transparent;
                  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                  font-size:15px;color:#8E8E93;outline:none;"/>
                <span style="font-size:13px;color:#8E8E93;">mins</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
              <span style="font-size:15px;color:#000;">Type</span>
              <div style="display:flex;gap:8px;">
                ${['Outdoor','Indoor'].map(t => `
                  <button class="cycle-type-btn" data-ctype="${t}"
                    style="padding:6px 14px;border-radius:8px;
                    border:1.5px solid ${ci.cycleType === t ? '#FF9500' : '#E5E5EA'};
                    background:${ci.cycleType === t ? 'rgba(255,149,0,0.08)' : 'transparent'};
                    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                    font-size:13px;font-weight:${ci.cycleType === t ? '600' : '400'};
                    color:${ci.cycleType === t ? '#FF9500' : '#000'};cursor:pointer;">
                    ${t}
                  </button>`).join('')}
              </div>
            </div>
          </div>
        </div>`;
    }

    if (session.type === 'golf') {
      const profile    = Store.getProfile();
      const handicap   = ci.handicapSnapshot || profile.golfHandicap || null;
      const golfTypes  = Array.isArray(ci.golfTypes) ? ci.golfTypes : [];
      if (handicap) html += detailRow('Current Handicap', handicap);
      html += `
        <div style="margin-top:8px;">
          <div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Session Type</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;" id="golf-type-selector">
            ${['Range','Short Game','Full Round','Lesson'].map(t => `
              <button class="session-type-btn" data-gtype="${t}"
                style="padding:10px 8px;border-radius:10px;
                border:1.5px solid ${golfTypes.includes(t) ? '#34C759' : '#E5E5EA'};
                background:${golfTypes.includes(t) ? 'rgba(52,199,89,0.08)' : '#F9F9F9'};
                font-family:-apple-system,BlinkMacSystemFont,sans-serif;
                font-size:13px;font-weight:${golfTypes.includes(t) ? '600' : '400'};
                color:${golfTypes.includes(t) ? '#34C759' : '#000'};cursor:pointer;">
                ${t}
              </button>`).join('')}
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
            width:100%;min-height:90px;padding:12px;
            background:#F9F9F9;border:none;
            border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
            box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);
            font-size:15px;color:#000;resize:none;outline:none;
            -webkit-appearance:none;box-sizing:border-box;
          "
        >${notes}</textarea>
      </div>`;

    return html;
  }

  function saveSessionField(dateStr, field, value) {
    const all   = Store.getAllCheckIns();
    const entry = all[dateStr] || { date: dateStr };
    entry[field] = value;
    all[dateStr] = entry;
    try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
  }

  function saveNotes(dateStr) {
    const input = document.getElementById('session-notes-input');
    if (!input) return;
    const all   = Store.getAllCheckIns();
    const entry = all[dateStr] || { date: dateStr };
    entry.sessionNotes = input.value;
    all[dateStr] = entry;
    try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
  }

  function detailRow(label, value) {
    return `
      <div style="background:#F9F9F9;border-radius:12px;padding:12px 16px;margin-top:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);box-shadow:0 2px 8px rgba(0,0,0,0.08),0 0 0 0.5px rgba(0,0,0,0.05);
                  display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;color:#000;">${label}</span>
        <span style="font-size:15px;color:#8E8E93;font-weight:500;">${value}</span>
      </div>`;
  }

  function getWeekNumber(dateStr) {
    const profile = Store.getProfile();
    if (!profile.programmeStart) return null;
    const start  = parseLocalDate(profile.programmeStart);
    const target = parseLocalDate(dateStr);
    const diff   = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    return Math.floor(diff / 7) + 1;
  }

  // ─── Session display strings ──────────────────────────────

  function sessionTitle(session) {
    if (session.type === 'hypertrophy') {
      const map = { push: 'Push Day', legs: 'Legs Day', pull: 'Pull Day' };
      return map[session.subtype] || 'Hypertrophy';
    }
    if (session.type === 'bjj')   return 'Brazilian Jiu-Jitsu';
    if (session.type === 'golf')  return 'Golf Practice';
    if (session.type === 'cycle') return 'Outdoor Cycle';
    if (session.type === 'rest')  return 'Rest Day';
    if (session.type === 'race')  return 'Race Week';
    return 'Rest Day';
  }

  function sessionSub(session) {
    if (session.type === 'hypertrophy') return session.label || '';
    if (session.type === 'bjj')         return `${session.duration} min session`;
    if (session.type === 'golf')        return 'Range';
    if (session.type === 'cycle')       return `${session.distance} mile ride`;
    if (session.type === 'race')        return 'Fri–Sun · ~130 miles/day';
    return '';
  }

  function sessionBadge(type) {
    const map = { hypertrophy: 'GYM', bjj: 'BJJ', golf: 'GOLF', cycle: 'RIDE', rest: 'REST', race: 'RACE' };
    return map[type] || 'REST';
  }

  function buildWeekSummary(dates) {
    let gym = 0, bjj = 0, golf = 0, miles = 0;

    dates.forEach(dateStr => {
      const session = sessionForDate(dateStr);
      if (session.type === 'hypertrophy') gym++;
      if (session.type === 'bjj')         bjj++;
      if (session.type === 'golf')        golf++;
      if (session.type === 'cycle')       miles += session.distance || 0;
    });

    const items = [
      { type: 'hypertrophy', label: 'GYM',  count: gym,   show: gym > 0  },
      { type: 'bjj',         label: 'BJJ',  count: bjj,   show: bjj > 0  },
      { type: 'golf',        label: 'GOLF', count: golf,  show: golf > 0 },
      { type: 'cycle',       label: 'RIDE', count: null,  show: miles > 0,
        display: Units.isImperial() ? `${miles} mi` : `${Math.round(miles * 1.60934)} km` },
    ].filter(i => i.show);

    if (!items.length) return '';

    const html = items.map(item => `
      <div class="week-summary-item">
        <span class="week-summary-badge acc-type-badge type-${item.type}">${item.label}</span>
        <span class="week-summary-count">${item.count !== null ? `× ${item.count}` : item.display}</span>
      </div>`).join('');

    return `<div class="acc-group-card" style="margin-top:12px;"><div class="week-summary-strip">${html}</div></div>`;
  }

  // ─── Render ───────────────────────────────────────────────

  function render() {
    const page = document.getElementById('page-training');
    if (!page) return;

    const profile = Store.getProfile();

    if (!profile.programmeStart) {
      page.innerHTML = `
        <div class="training-page">
          <div class="training-header"><h1>Training</h1></div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-xl) var(--space-lg);text-align:center;margin-top:40px;">
            <div style="font-size:48px;margin-bottom:var(--space-md);">🗓️</div>
            <div style="font-size:20px;font-weight:700;color:#000;margin-bottom:var(--space-sm);">No programme set</div>
            <div style="font-size:15px;color:#8E8E93;line-height:1.5;margin-bottom:var(--space-lg);">Select a programme and set a start date in Profile to see your training schedule.</div>
            <button class="btn btn-primary" id="training-go-profile">Go to Profile</button>
          </div>
        </div>`;
      document.getElementById('training-go-profile')?.addEventListener('click', () => {
        Router.showPage('profile');
        NavBar.setActiveByTarget('profile');
      });
      return;
    }

    const weekNum = TrainingData.getWeekNumber(profile.programmeStart);

    page.innerHTML = `
      <div class="training-page">
        <div class="training-header">
          <h1>Training</h1>
          <div class="training-header-sub">${weekNum ? `Week ${weekNum} of 18` : 'Programme complete'}</div>
        </div>
        <div class="week-nav-wrap">
          <button class="week-nav-btn" id="btn-week-prev">‹</button>
          <span class="week-nav-label" id="week-nav-label"></span>
          <button class="week-nav-btn" id="btn-week-next">›</button>
        </div>
        <div class="accordion-list" id="accordion-list">
          <div class="acc-group-card"></div>
        </div>
      </div>`;

    document.getElementById('btn-week-prev')?.addEventListener('click', () => {
      weekOffset--;
      renderList();
    });

    document.getElementById('btn-week-next')?.addEventListener('click', () => {
      weekOffset++;
      renderList();
    });

    renderList();
  }

  function renderList() {
    const list    = document.getElementById('accordion-list');
    const label   = document.getElementById('week-nav-label');
    const btnNext = document.getElementById('btn-week-next');
    if (!list) return;

    const dates = getWeekDates(weekOffset);
    const today = todayStr();
    const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    if (label)   label.textContent   = formatWeekLabel(dates);
    if (btnNext) btnNext.disabled    = false;

    const groupCard = list.querySelector('.acc-group-card');
    if (!groupCard) return;

    const summaryHTML = buildWeekSummary(dates);
    groupCard.innerHTML = dates.map((dateStr, i) => {
      const d         = parseLocalDate(dateStr);
      const session   = sessionForDate(dateStr);
      const completed = isCompleted(dateStr);
      const isToday   = dateStr === today;

      const classes = [
        'acc-item',
        `type-${session.type || 'rest'}`,
        isToday   ? 'is-today'     : '',
        completed ? 'is-completed' : '',
      ].filter(Boolean).join(' ');

      return `
        <div class="${classes}" data-date="${dateStr}">
          <div class="acc-header">
            <div class="acc-day-info">
              <span class="acc-day-name">${days[i]}</span>
              <span class="acc-day-num">${d.getDate()}</span>
            </div>
            <span class="acc-type-badge type-${session.type} ${weekOffset !== 0 ? 'is-muted' : ''}">${sessionBadge(session.type)}</span>
            <div class="acc-session-info">
              <div class="acc-session-title">${sessionTitle(session)}</div>
              <div class="acc-session-sub">${sessionSub(session)}</div>
            </div>
            <span class="acc-chevron">${completed ? '<span class="acc-tick-done">✓</span>' : '›'}</span>
          </div>
        </div>`;
    }).join('');

    const existing = list.querySelector('.week-summary-outer');
    if (existing) existing.remove();
    if (summaryHTML) {
      const wrapper = document.createElement('div');
      wrapper.className = 'week-summary-outer';
      wrapper.innerHTML = summaryHTML;
      list.appendChild(wrapper);
    }

    groupCard.querySelectorAll('.acc-item').forEach(item => {
      item.addEventListener('click', () => openSessionModal(item.dataset.date));
    });
  }

  function init() {
    document.addEventListener('nav:change', e => {
      closeSessionModal();
      if (e.detail.target === 'training') {
        weekOffset = 0;
        render();
      }
    });
    render();
  }

  return { init, render, openSessionModal };

})();

document.addEventListener('DOMContentLoaded', () => TrainingPage.init());