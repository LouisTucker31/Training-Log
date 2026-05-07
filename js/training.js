/* ============================================================
   training.js — Training accordion week view
   ============================================================ */

const TrainingPage = (() => {

  let weekOffset  = 0;
  let openDate    = null;

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
    const all     = Store.getAllCheckIns();
    const entry   = all[dateStr] || { date: dateStr };
    entry.completed = !entry.completed;
    all[dateStr]  = entry;
    try { localStorage.setItem('tl_checkins', JSON.stringify(all)); } catch {}
    renderList();
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
    if (session.type === 'golf')  return 'Golf Training';
    if (session.type === 'cycle') return 'Outdoor Cycle';
    if (session.type === 'rest')  return 'Rest Day';
    if (session.type === 'race')  return 'Race Week';
    return 'Rest Day';
  }

  function sessionSub(session) {
    if (session.type === 'hypertrophy') return session.label || '';
    if (session.type === 'bjj')         return `${session.duration} min session`;
    if (session.type === 'golf')        return 'Range session';
    if (session.type === 'cycle')       return `${session.distance} mile ride`;
    if (session.type === 'race')        return 'Fri–Sun · ~130 miles/day';
    return '';
  }

  function sessionIcon(type) {
    return '';
  }

  // ─── Build accordion body HTML ────────────────────────────

  function buildBody(dateStr, session, completed) {
    const today    = todayStr();
    const isFuture = dateStr > today;

    if (session.type === 'rest' || session.type === 'none') {
      return `<div class="rest-body">Rest up and recover.</div>`;
    }

    if (session.type === 'race') {
      return `<div class="rest-body">Cycling event — Fri to Sun, ~130 miles per day.</div>`;
    }

    let html = '';

    // Volume badge + exercises for hypertrophy
    if (session.type === 'hypertrophy') {
      const checkin   = Store.getCheckIn(dateStr);
      const vol       = checkin ? checkin.rag : null;
      const exercises = vol
        ? session.exercises
        : TrainingData.getHypertrophySession(session.subtype, 'green').exercises;

      if (vol) {
        const labels = { green: 'Green Volume', amber: 'Amber Volume', red: 'Red Volume' };
        html += `<div class="volume-badge ${vol}">${labels[vol]}</div>`;
      }

      html += `<div class="exercise-card">
        ${exercises.map(e => `
          <div class="exercise-row">
            <span class="exercise-name">${e.name}</span>
            <span class="exercise-sets">${e.sets} sets</span>
          </div>`).join('')}
      </div>`;
    }

    // Non-hypertrophy detail
    if (session.type === 'bjj') {
      html += `<div class="exercise-card">
        <div class="exercise-row">
          <span class="exercise-name">Duration</span>
          <span class="exercise-sets">${session.duration} mins</span>
        </div>
      </div>`;
    }

    if (session.type === 'cycle') {
      html += `<div class="exercise-card">
        <div class="exercise-row">
          <span class="exercise-name">Target distance</span>
          <span class="exercise-sets">${session.distance} miles</span>
        </div>
      </div>`;
    }

    if (session.type === 'golf') {
      html += `<div class="exercise-card">
        <div class="exercise-row">
          <span class="exercise-name">Session type</span>
          <span class="exercise-sets">Range</span>
        </div>
      </div>`;
    }

    return html;
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
          <div class="no-programme-card">
            <div class="no-programme-icon">📅</div>
            <div class="no-programme-title">No programme set</div>
            <div class="no-programme-sub">Go to Profile and set your programme start date.</div>
          </div>
        </div>`;
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
        <div class="accordion-list" id="accordion-list"></div>
      </div>`;

    document.getElementById('btn-week-prev')?.addEventListener('click', () => {
      weekOffset--;
      openDate = null;
      renderList();
    });

    document.getElementById('btn-week-next')?.addEventListener('click', () => {
      weekOffset++;
      openDate = null;
      renderList();
    });

    renderList();
  }

  function renderList() {
    const list  = document.getElementById('accordion-list');
    const label = document.getElementById('week-nav-label');
    const btnNext = document.getElementById('btn-week-next');
    if (!list) return;

    const dates  = getWeekDates(weekOffset);
    const today  = todayStr();
    const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    if (label) label.textContent = formatWeekLabel(dates);
    if (btnNext) btnNext.disabled = false;

    // All closed by default — openDate stays null unless user taps

    list.innerHTML = dates.map((dateStr, i) => {
      const d         = parseLocalDate(dateStr);
      const session   = sessionForDate(dateStr);
      const completed = isCompleted(dateStr);
      const isToday   = dateStr === today;
      const isOpen    = dateStr === openDate;
      const wn        = getWeekNumber(dateStr);
      const weekTag   = wn ? `W${wn}` : '';

      const isFuture = dateStr > today;

      const classes = [
        'acc-item',
        `type-${session.type || 'rest'}`,
        isToday    ? 'is-today'     : '',
        completed  ? 'is-completed' : '',
        isOpen     ? 'is-open'      : '',
      ].filter(Boolean).join(' ');

      return `
        <div class="${classes}" data-date="${dateStr}">
          <div class="acc-header">
            <div class="acc-day-info">
              <span class="acc-day-name">${days[i]}</span>
              <span class="acc-day-num">${d.getDate()}</span>
            </div>
            <span class="acc-icon">${sessionIcon(session.type)}</span>
            <div class="acc-session-info">
              <div class="acc-session-title">${sessionTitle(session)}</div>
              <div class="acc-session-sub">${sessionSub(session)}</div>
            </div>
            <div class="acc-right" style="display:flex;align-items:center;gap:8px;">
              ${!isFuture ? `<div class="acc-tick ${completed ? 'ticked' : ''}" data-tick="${dateStr}">
                <span class="acc-tick-check">✓</span>
              </div>` : ''}
              <span class="acc-chevron">›</span>
            </div>
          </div>
          <div class="acc-body">
            <div class="acc-body-inner">
              ${buildBody(dateStr, session, completed)}
            </div>
          </div>
        </div>`;
    }).join('');

    // Tick buttons — bind first, use pointerdown to beat accordion
    list.querySelectorAll('[data-tick]').forEach(tick => {
      tick.addEventListener('pointerdown', e => {
        e.stopPropagation();
        e.preventDefault();
        toggleComplete(tick.dataset.tick);
      });
    });

    // Accordion toggle
    list.querySelectorAll('.acc-header').forEach(header => {
      header.addEventListener('click', e => {
        // Don't toggle if the tick was tapped
        if (e.target.closest('[data-tick]')) return;
        const item    = header.closest('.acc-item');
        const dateStr = item.dataset.date;
        openDate = openDate === dateStr ? null : dateStr;
        renderList();
      });
    });
  }

  function init() {
    document.addEventListener('nav:change', e => {
      if (e.detail.target === 'training') {
        weekOffset = 0;
        openDate   = null;
        render();
      }
    });
    render();
  }

  return { init, render };

})();

document.addEventListener('DOMContentLoaded', () => TrainingPage.init());