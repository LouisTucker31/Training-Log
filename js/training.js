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
    return TrainingData.getSessionForDate(dateStr, profile.programmeStart, rag, profile.programme, profile.programmeLengthWeeks);
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
    if (typeof InsightsPage !== 'undefined') InsightsPage.render();
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
    if (session.type === 'bjj')          return 'Brazilian Jiu-Jitsu';
    if (session.type === 'golf')         return 'Golf Practice';
    if (session.type === 'cycle')        return 'Outdoor Cycle';
    if (session.type === 'rest')         return 'Rest Day';
    if (session.type === 'race')         return 'Race Week';
    if (session.type === 'smart-gym')    return session.name || 'Gym';
    if (session.type === 'smart-sports') return session.name || 'Sports';
    if (session.type === 'smart-cardio') return session.name || 'Cardio';
    if (session.type === 'smart-other')  return session.name || 'Workout';
    return 'Rest Day';
  }

  function sessionSub(session) {
    if (session.type === 'hypertrophy')  return session.label || '';
    if (session.type === 'bjj')          return `${session.duration} min session`;
    if (session.type === 'golf')         return 'Range';
    if (session.type === 'cycle')        return `${session.distance} mile ride`;
    if (session.type === 'race')         return 'Fri–Sun · ~130 miles/day';
    if (typeof session.type === 'string' && session.type.startsWith('smart-')) {
      if (session.subtitle) return session.subtitle;
      const typeMap = { 'smart-gym': 'Gym', 'smart-sports': 'Sports', 'smart-cardio': 'Cardio', 'smart-other': 'Other' };
      return typeMap[session.type] || '';
    }
    return '';
  }

  function sessionBadge(type, session) {
    if (session && session.tag) return session.tag.toUpperCase().slice(0, 7);
    const map = {
      hypertrophy: 'GYM', bjj: 'BJJ', golf: 'GOLF', cycle: 'RIDE', rest: 'REST', race: 'RACE',
      'smart-gym': 'GYM', 'smart-sports': 'SPORT', 'smart-cardio': 'CARDIO', 'smart-other': 'OTHER',
    };
    return map[type] || 'REST';
  }

  // ─── Render ───────────────────────────────────────────────

  function render() {
    const page = document.getElementById('page-training');
    if (!page) return;

    const profile = Store.getProfile();

    if (!profile.programmeStart) {
      page.innerHTML = `
        <div class="training-page">
          <div class="training-header">
            <h1>Training</h1>
            <div class="training-header-sub">Your weekly schedule</div>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">🗓️</div>
            <div class="empty-state-title">No programme set</div>
            <div class="empty-state-text">Select a programme and set a start date in Profile to see your training schedule.</div>
            <button class="btn btn-primary" id="training-go-profile">Go to Profile</button>
          </div>
        </div>`;
      document.getElementById('training-go-profile')?.addEventListener('click', () => {
        Router.showPage('profile');
        NavBar.setActiveByTarget('profile');
      });
      return;
    }

    const isSmart  = profile.programme === 'smart';
    const maxWeeks = isSmart ? (profile.programmeLengthWeeks || 52) : 18;
    const weekNum  = TrainingData.getWeekNumber(profile.programmeStart, maxWeeks);

    page.innerHTML = `
      <div class="training-page">
        <div class="training-header">
          <h1>Training</h1>
          <div class="training-header-sub">${weekNum ? `Week ${weekNum} of ${maxWeeks}` : 'Programme complete'}</div>
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

    if (label)   label.textContent = formatWeekLabel(dates);
    if (btnNext) btnNext.disabled  = false;

    const groupCard = list.querySelector('.acc-group-card');
    if (!groupCard) return;

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
            <span class="acc-type-badge type-${session.type} ${weekOffset !== 0 ? 'is-muted' : ''}">${sessionBadge(session.type, session)}</span>
            <div class="acc-session-info">
              <div class="acc-session-title">${sessionTitle(session)}</div>
              <div class="acc-session-sub">${sessionSub(session)}</div>
            </div>
            <span class="acc-chevron">${completed ? '<span class="acc-tick-done">✓</span>' : '›'}</span>
          </div>
        </div>`;
    }).join('');

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

  return {
    init,
    render,
    renderList,
    isCompleted,
    todayStr,
    toggleComplete,
    sessionTitle,
    parseLocalDate,
  };

})();

document.addEventListener('DOMContentLoaded', () => TrainingPage.init());
