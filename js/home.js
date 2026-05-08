/* ============================================================
   home.js — Home page
   ============================================================ */

const HomePage = (() => {

  // ─── Greeting ─────────────────────────────────────────────

  function getGreeting(name) {
    const h = new Date().getHours();
    const time = h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
    return { time, name: name || '' };
  }

  function getDateString() {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  // ─── Readiness Delta ──────────────────────────────────────

  function getRecoveryDelta(allCheckIns) {
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const todayKey = today.toISOString().slice(0, 10);
    const yestKey  = yesterday.toISOString().slice(0, 10);

    const todayCI = allCheckIns[todayKey];
    const yestCI  = allCheckIns[yestKey];

    if (!todayCI || !yestCI) return null;
    if (typeof todayCI.score !== 'number' || typeof yestCI.score !== 'number') return null;
    if (isNaN(todayCI.score) || isNaN(yestCI.score)) return null;

    const delta = todayCI.score - yestCI.score;
    return delta;
  }

  // ─── Readiness Ring ───────────────────────────────────────

  function buildRing(checkin, delta) {
    if (!checkin || checkin.score === undefined || checkin.score === null) {
      return `
        <div class="home-ring-wrap">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="60" fill="none" stroke="#E5E5EA" stroke-width="12"/>
            <text x="80" y="88" text-anchor="middle"
              font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
              font-size="15" fill="#AEAEB2">No check-in</text>
          </svg>
          <div class="home-ring-hint">Tap Today below to check in</div>
        </div>`;
    }

    const { score, rag } = checkin;
    const colour    = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' }[rag];
    const colourDim = { green: 'rgba(48,209,88,0.2)', amber: 'rgba(255,159,10,0.2)', red: 'rgba(255,69,58,0.2)' }[rag];
    const radius    = 60;
    const circ      = 2 * Math.PI * radius;
    const fill      = Math.max(0, Math.min(score / 100, 1)) * circ;
    const id        = `home-grad-${rag}`;

    return `
      <div class="home-ring-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160"
             style="filter:drop-shadow(0 4px 16px ${colourDim})">
          <defs>
            <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${colour}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${colour}" stop-opacity="1"/>
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#E5E5EA" stroke-width="12"/>
          <circle cx="80" cy="80" r="${radius}" fill="none"
            stroke="url(#${id})" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${fill} ${circ}"
            transform="rotate(-90 80 80)"/>
          <text x="80" y="88" text-anchor="middle"
            font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
            font-size="32" font-weight="700" fill="${colour}">${score}%</text>
        </svg>
        ${delta !== null ? `
        <div class="home-ring-delta ${delta >= 0 ? 'up' : 'down'}">
          ${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)} from yesterday
        </div>` : ''}
      </div>`;
  }

  // ─── Today's Session Card ─────────────────────────────────

  function sessionBadgeLabel(session) {
    if (session.tag) return session.tag.toUpperCase().slice(0, 7);
    const map = {
      hypertrophy: 'GYM', bjj: 'SPORT', golf: 'SPORT', cycle: 'RIDE', rest: 'REST', race: 'RIDE',
      'smart-gym': 'GYM', 'smart-sports': 'SPORT', 'smart-cardio': 'CARDIO', 'smart-other': 'OTHER',
    };
    return map[session.type] || 'REST';
  }

  function sessionDetail(session) {
    if (session.subtitle) return session.subtitle;
    if (session.type === 'hypertrophy')  return 'Hypertrophy';
    if (session.type === 'bjj')          return 'Martial Arts';
    if (session.type === 'cycle')        return 'Cardiovascular';
    if (session.type === 'golf')         return 'Golf Practice';
    if (session.type === 'race')         return 'Cardiovascular';
    if (session.type === 'smart-gym')    return 'Gym';
    if (session.type === 'smart-sports') return 'Sports';
    if (session.type === 'smart-cardio') return 'Cardio';
    if (session.type === 'smart-other')  return 'Other';
    return 'Rest & Recover';
  }

  function buildSessionCard(session) {
    const badge  = sessionBadgeLabel(session);
    const title  = session.name || session.label || 'Rest Day';
    const detail = sessionDetail(session);
    const isRest = session.type === 'rest' || session.type === 'none';

    return `
      <div class="home-session-card ${isRest ? 'is-rest' : ''}" id="home-session-card">
        <div class="home-session-left">
          <span class="home-session-badge type-${session.type}">${badge}</span>
          <div class="home-session-info">
            <div class="home-session-title">${title}</div>
            <div class="home-session-detail">${detail}</div>
          </div>
        </div>
        <span class="home-session-chevron">›</span>
      </div>`;
  }

  // ─── 7-Day Sparkline ──────────────────────────────────────

  function getCalendarWeekDates() {
    const today = new Date();
    const dow   = today.getDay(); // 0=Sun
    const mon   = new Date(today);
    mon.setDate(today.getDate() - ((dow + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
  }

  function buildSparkline(allCheckIns) {
    const dates   = getCalendarWeekDates();
    const days    = ['M','T','W','T','F','S','S'];
    const W       = 360;
    const H       = 60;
    const padX    = 16;
    const dotY    = 24;
    const step    = (W - padX * 2) / 6;

    const ragColour = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' };
    const todayStr  = new Date().toISOString().slice(0, 10);

    // Build point data
    const points = dates.map((dateStr, i) => {
      const ci    = allCheckIns[dateStr];
      const x     = padX + i * step;
      const hasData = !!ci && ci.score !== undefined;
      return { x, hasData, rag: ci?.rag, score: ci?.score, dateStr };
    });

    // Line segments between consecutive logged days
    let lineHTML = '';
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].hasData && points[i + 1].hasData) {
        lineHTML += `<line x1="${points[i].x}" y1="${dotY}" x2="${points[i+1].x}" y2="${dotY}"
          stroke="#E5E5EA" stroke-width="2"/>`;
      }
    }

    // Dots
    let dotHTML = points.map(p => {
      if (!p.hasData) {
        return `<circle cx="${p.x}" cy="${dotY}" r="5" fill="#E5E5EA"/>`;
      }
      const col = ragColour[p.rag] || '#30D158';
      const isToday = p.dateStr === todayStr;
      return `<circle cx="${p.x}" cy="${dotY}" r="${isToday ? 7 : 5}"
        fill="${col}" ${isToday ? `stroke="white" stroke-width="2"` : ''}/>`;
    }).join('');

    // Day labels
    let labelHTML = points.map((p, i) =>
      `<text x="${p.x}" y="${H - 4}" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="11" fill="#AEAEB2">${days[i]}</text>`
    ).join('');

    return `
      <div class="home-sparkline-wrap">
        <div class="home-section-title">This Week</div>
        <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible;width:100%">
          ${lineHTML}
          ${dotHTML}
          ${labelHTML}
        </svg>
      </div>`;
  }

  // ─── Streak ───────────────────────────────────────────────

  function getStreak(allCheckIns, programmeStart) {
    if (!programmeStart) return 0;

    const start = new Date(programmeStart);
    start.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak    = 0;
    let checkDate = new Date(today);

    while (checkDate >= start) {
      const y   = checkDate.getFullYear();
      const m   = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d   = String(checkDate.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;

      const ci = allCheckIns[key];

      // No check-in this day — streak broken
      if (!ci || ci.score === undefined) break;

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  // ─── Programme Progress ───────────────────────────────────

  function getProgrammeProgress(programmeStart, maxWeeks) {
    if (!programmeStart) return null;

    const weeks   = maxWeeks || 18;
    const start   = new Date(programmeStart);
    start.setHours(0, 0, 0, 0);
    const total   = weeks * 7;
    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const day     = Math.max(1, Math.min(elapsed, total));
    const pct     = Math.round((day / total) * 100);

    return { day, total, pct, weeks };
  }

  function buildProgressBar(programmeStart, maxWeeks) {
    const prog = getProgrammeProgress(programmeStart, maxWeeks);
    if (!prog) return '';

    return `
      <div class="home-progress-wrap">
        <div class="home-progress-header">
          <span class="home-section-title">Programme</span>
          <span class="home-progress-label">Week ${Math.ceil(prog.day / 7)} of ${prog.weeks}</span>
        </div>
        <div class="home-progress-track">
          <div class="home-progress-fill" style="width:${prog.pct}%"></div>
        </div>
      </div>`;
  }

  // ─── Stat Tiles ───────────────────────────────────────────

  function parseSetsUpper(str) {
    if (!str) return 0;
    const parts = str.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  }

  function getWeekStats(allCheckIns, programmeStart, programme, programmeLengthWeeks) {
    const dates = getCalendarWeekDates();
    let gymDone = 0, gymTotal = 0;
    let sportDone = 0, sportTotal = 0;
    let miles = 0, totalMiles = 0;

    // Smart: per-type buckets keyed by sessionType
    // Each entry: { tag, total, done, isCardio, distanceDone, distanceTotal }
    const smartTypes = {};

    dates.forEach(dateStr => {
      const ci      = allCheckIns[dateStr];
      const session = TrainingData.getSessionForDate(dateStr, programmeStart, ci?.rag || 'green', programme, programmeLengthWeeks);

      if (programme === 'smart') {
        if (!session.type.startsWith('smart-')) return;
        const sType    = session.type.replace('smart-', '');
        const tagKey   = session.tag ? session.tag.toLowerCase() : sType;
        const display  = session.tag || (sType.charAt(0).toUpperCase() + sType.slice(1));
        const isCardio = sType === 'cardio';
        if (!smartTypes[tagKey]) smartTypes[tagKey] = { tag: display, total: 0, done: 0, isCardio, distanceDone: 0 };
        smartTypes[tagKey].total++;
        if (ci?.completed) {
          smartTypes[tagKey].done++;
          if (isCardio) smartTypes[tagKey].distanceDone += session.details?.distance || 0;
        }
        return;
      }

      // Standard programme — count totals regardless of completion
      if (session.type === 'hypertrophy')                    gymTotal++;
      if (session.type === 'bjj' || session.type === 'golf') sportTotal++;
      if (session.type === 'cycle')                          totalMiles += session.distance || 0;

      if (!ci?.completed) return;
      if (session.type === 'hypertrophy')                    gymDone++;
      if (session.type === 'bjj' || session.type === 'golf') sportDone++;
      if (session.type === 'cycle')                          miles += session.distance || 0;
    });

    const streak = getStreak(allCheckIns, programmeStart);
    return { gymDone, gymTotal, sportDone, sportTotal, miles, totalMiles, streak, smartTypes };
  }

  function buildStatTiles(stats, weekNum, programme, maxWeeks) {
    const weekTile = `
      <div class="home-tile">
        <div class="home-tile-sub">Week</div>
        <div class="home-tile-value">${weekNum ? weekNum : '—'}</div>
        <div class="home-tile-label">of ${maxWeeks || '—'} weeks</div>
      </div>`;

    if (programme === 'smart') {
      const typeTiles = Object.values(stats.smartTypes).map(t => {
        const big   = t.isCardio
          ? (Units.isImperial() ? Math.round(t.distanceDone || 0) : Math.round((t.distanceDone || 0) * 1.60934))
          : t.done;
        const small = t.isCardio
          ? `${Units.distanceUnit()} this week`
          : `of ${t.total} sessions`;
        return `
          <div class="home-tile">
            <div class="home-tile-sub">${t.tag}</div>
            <div class="home-tile-value">${big}</div>
            <div class="home-tile-label">${small}</div>
          </div>`;
      }).join('');
      return `<div class="home-tiles-wrap">${weekTile}${typeTiles}</div>`;
    }

    return `
      <div class="home-tiles-wrap">
        ${weekTile}
        <div class="home-tile">
          <div class="home-tile-sub">Gym</div>
          <div class="home-tile-value">${stats.gymDone}</div>
          <div class="home-tile-label">of ${stats.gymTotal} sessions</div>
        </div>
        <div class="home-tile">
          <div class="home-tile-sub">Sports</div>
          <div class="home-tile-value">${stats.sportDone}</div>
          <div class="home-tile-label">of ${stats.sportTotal} sessions</div>
        </div>
        <div class="home-tile">
          <div class="home-tile-sub">Cycling</div>
          <div class="home-tile-value">${Units.isImperial() ? Math.round(stats.miles || 0) : Math.round((stats.miles || 0) * 1.60934)}</div>
          <div class="home-tile-label">${stats.totalMiles ? `of ${Units.isImperial() ? Math.round(stats.totalMiles) : Math.round(stats.totalMiles * 1.60934)} ${Units.distanceUnit()} planned` : `${Units.distanceUnit()} this week`}</div>
        </div>
      </div>`;
  }

  // ─── Render ───────────────────────────────────────────────

  function render() {
    const page = document.getElementById('page-home');
    if (!page) return;

    const profile    = Store.getProfile();
    const checkin    = Store.getTodayCheckIn();
    const allCI      = Store.getAllCheckIns();
    const isSmart    = profile.programme === 'smart';
    const maxWeeks   = isSmart ? (profile.programmeLengthWeeks || 52) : 18;
    const weekNum    = TrainingData.getWeekNumber(profile.programmeStart, maxWeeks);
    const rag        = checkin?.rag || 'green';
    const todayStr   = Store.todayKey();
    const session    = TrainingData.getSessionForDate(todayStr, profile.programmeStart, rag, profile.programme, profile.programmeLengthWeeks);
    const stats      = getWeekStats(allCI, profile.programmeStart, profile.programme, profile.programmeLengthWeeks);

    if (!profile.programmeStart) {
      page.innerHTML = `
        <div class="home-page">
          <div class="home-header">
            <div class="home-header-top">
              <div>
                <div class="home-greeting">${getGreeting(profile.name).time}</div>
                ${getGreeting(profile.name).name ? `<div class="home-greeting home-greeting--name">${getGreeting(profile.name).name}</div>` : ''}
              </div>
            </div>
            <div class="home-date">${getDateString()}</div>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-title">No programme set</div>
            <div class="empty-state-text">Set your programme start date in Profile to get started.</div>
            <button class="btn btn-primary" id="home-go-profile">Go to Profile</button>
          </div>
        </div>`;
      document.getElementById('home-go-profile')?.addEventListener('click', () => {
        Router.showPage('profile');
        NavBar.setActiveByTarget('profile');
      });
      return;
    }

    page.innerHTML = `
      <div class="home-page">

        <div class="home-header">
          <div class="home-header-top">
            <div>
              <div class="home-greeting">${getGreeting(profile.name).time}</div>
          ${getGreeting(profile.name).name ? `<div class="home-greeting home-greeting--name">${getGreeting(profile.name).name}</div>` : ''}
              <div class="home-date">${getDateString()}</div>
            </div>
            ${stats.streak > 0 ? `
            <div class="home-streak-badge">
              <span class="home-streak-fire">🔥</span>
              <span class="home-streak-num">${stats.streak}</span>
            </div>` : ''}
          </div>
        </div>

        ${buildRing(checkin, getRecoveryDelta(allCI))}
        ${buildSessionCard(session)}
        ${buildProgressBar(profile.programmeStart, isSmart ? maxWeeks : 18)}
        ${buildStatTiles(stats, weekNum, profile.programme, maxWeeks)}

        <div class="page-bottom-pad"></div>
      </div>
    `;

    // Session card tap → modal
    document.getElementById('home-session-card')?.addEventListener('click', () => {
      if (typeof TrainingPage !== 'undefined') {
        const today = Store.todayKey();
        TrainingPage.openSessionModal(today);
      }
    });
  }

  function init() {
    document.addEventListener('nav:change', e => {
      if (e.detail.target === 'home') render();
    });
    render();
  }

  return { init, render };

})();

document.addEventListener('DOMContentLoaded', () => HomePage.init());