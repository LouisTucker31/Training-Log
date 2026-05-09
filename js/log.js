/* ============================================================
   log.js — Morning check-in modal, scoring, result display
   ============================================================ */

const LogModal = (() => {

  // ─── State ────────────────────────────────────────────────
  let currentStep = 0;
  let answers = {
    sleepScore:    null,
    recoveryScore: null,
    rhr:           null,
    motivation:    null,
    energy:        null,
    illness:       false,
    soreness:      null,
    jointPain:     0,
  };

  // 'welcome' is prepended when opening fresh (no prior check-in)
  const CHECKIN_STEPS = ['sleep', 'recovery', 'rhr', 'motivation', 'energy', 'soreness', 'joint', 'summary'];
  let STEPS      = CHECKIN_STEPS;
  let TOTAL_STEPS = STEPS.length;

  let _weatherCache     = null;
  let _weatherCacheDate = null;

  // ─── Weather ──────────────────────────────────────────────

  const WMO_CODES = {
    0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
    45: ['Foggy', '🌫️'], 48: ['Freezing fog', '🌫️'],
    51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
    61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
    71: ['Light snow', '🌨️'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '🌨️'],
    80: ['Light showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Heavy showers', '⛈️'],
    85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '❄️'],
    95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm+hail', '⛈️'], 99: ['Thunderstorm+hail', '⛈️'],
  };

  async function fetchWeather() {
    const today = new Date().toISOString().slice(0, 10);
    if (_weatherCache && _weatherCacheDate === today) return _weatherCache;
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto&forecast_days=2`;
          const res  = await fetch(url);
          const data = await res.json();
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weathercode;
          const [condition, icon] = WMO_CODES[code] || ['Unknown', '🌡️'];

          // Collect all hourly slots from the next hour onwards (today + tomorrow)
          const now          = new Date();
          const nowHour      = now.getHours();
          const todayDateStr = now.toISOString().slice(0, 10);
          const hourly       = [];
          for (let i = 0; i < data.hourly.time.length; i++) {
            const slotDateStr = data.hourly.time[i].slice(0, 10);
            const h           = new Date(data.hourly.time[i]).getHours();
            const isToday     = slotDateStr === todayDateStr;
            if (isToday && h <= nowHour) continue;
            const [, hIcon] = WMO_CODES[data.hourly.weathercode[i]] || ['', '🌡️'];
            hourly.push({ hour: h, icon: hIcon, temp: Math.round(data.hourly.temperature_2m[i]) });
          }

          const high = Math.round(data.daily.temperature_2m_max[0]);
          const low  = Math.round(data.daily.temperature_2m_min[0]);

          _weatherCacheDate = today;
          _weatherCache     = { temp, condition, icon, hourly, high, low };
          resolve(_weatherCache);
        } catch { resolve(null); }
      }, () => resolve(null), { timeout: 5000 });
    });
  }

  // ─── Hourly strip mouse-drag scroll ──────────────────────────
  function bindHourlyDrag() {
    const strip = document.querySelector('.welcome-hourly');
    if (!strip || strip._dragBound) return;
    strip._dragBound = true;
    let isDown = false, startX = 0, scrollLeft = 0;
    strip.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - strip.offsetLeft;
      scrollLeft = strip.scrollLeft;
      strip.classList.add('is-dragging');
    });
    strip.addEventListener('mouseleave', () => { isDown = false; strip.classList.remove('is-dragging'); });
    strip.addEventListener('mouseup',    () => { isDown = false; strip.classList.remove('is-dragging'); });
    strip.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      strip.scrollLeft = scrollLeft - (e.pageX - strip.offsetLeft - startX);
    });
  }

  // ─── Welcome Step Builder ─────────────────────────────────

  function buildStepWelcome(todaysSessions, weather) {
    const profile  = Store.getProfile();
    const h        = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const name     = profile.name ? `, ${profile.name}` : '';

    const now  = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    // Streak / programme context line
    const allCI    = Store.getAllCheckIns();
    const streak   = _getWelcomeStreak(allCI, profile.programmeStart);
    const weekNum  = profile.programmeStart ? TrainingData.getWeekNumber(profile.programmeStart, profile.programmeLengthWeeks || 18) : null;
    const contextParts = [];
    if (weekNum) contextParts.push(`Week ${weekNum}`);
    if (streak > 0) contextParts.push(`🔥 ${streak} day streak`);
    const contextLine = contextParts.length
      ? `<div class="welcome-context">${contextParts.join(' · ')}</div>`
      : '';

    // Weather block
    let weatherHTML = `<div class="welcome-weather-placeholder" style="min-height:60px"></div>`;
    if (weather) {
      const hourlyHTML = weather.hourly && weather.hourly.length
        ? `<div class="welcome-hourly">${weather.hourly.map(slot => `
            <div class="welcome-hourly-slot">
              <span class="welcome-hourly-time">${String(slot.hour).padStart(2,'0')}:00</span>
              <span class="welcome-hourly-icon">${slot.icon}</span>
              <span class="welcome-hourly-temp">${slot.temp}°</span>
            </div>`).join('')}</div>`
        : '';
      weatherHTML = `
        <div class="welcome-weather-block">
          <div class="welcome-weather-main">
            <span class="welcome-weather-icon">${weather.icon}</span>
            <span class="welcome-weather-temp">${weather.temp}°C</span>
            <span class="welcome-weather-condition">${weather.condition}</span>
            <span class="welcome-weather-hilo">H:${weather.high}° L:${weather.low}°</span>
          </div>
          ${hourlyHTML}
        </div>`;
    }

    const sessionTypeColour = {
      hypertrophy:    '#007AFF', 'smart-gym':    '#007AFF',
      bjj:            '#FF3B30', 'smart-sports': '#FF3B30',
      cycle:          '#FF9500', 'smart-cardio': '#FF9500',
      golf:           '#34C759', race:           '#FF9F0A',
      rest:           '#8E8E93', none:           '#8E8E93', 'smart-other': '#8E8E93',
    };

    const restTile = `
      <div class="welcome-session-row">
        <span class="welcome-session-badge" style="color:#8E8E93;background:rgba(142,142,147,0.1)">REST</span>
        <div class="welcome-session-info">
          <div class="welcome-session-title">Rest Day</div>
          <div class="welcome-session-sub">Rest & Recover</div>
        </div>
      </div>`;

    const sessionsHTML = todaysSessions.length
      ? todaysSessions.map(s => {
          const isRest = s.type === 'rest' || s.type === 'none';
          if (isRest) return restTile;
          const badge  = (s.tag || s.type).toUpperCase().slice(0, 7);
          const title  = s.name || s.label || 'Session';
          const sub    = s.subtitle || s.note || '';
          const colour = s.tagColour || sessionTypeColour[s.type] || '#8E8E93';
          return `
            <div class="welcome-session-row">
              <span class="welcome-session-badge" style="color:${colour};background:${colour}18">${badge}</span>
              <div class="welcome-session-info">
                <div class="welcome-session-title">${title}</div>
                ${sub ? `<div class="welcome-session-sub">${sub}</div>` : ''}
              </div>
            </div>`;
        }).join('')
      : restTile;

    return `
      <div class="modal-step welcome-step" data-step="welcome">
        <div class="welcome-greeting">${greeting}${name}</div>
        <div class="welcome-datetime">
          <span class="welcome-time">${time}</span>
          <span class="welcome-date">${date}</span>
        </div>
        ${contextLine}
        ${weatherHTML}
        <div class="welcome-section-label">Today's Training</div>
        <div class="welcome-sessions">${sessionsHTML}</div>
        <div class="welcome-inline-cta">
          <button class="btn btn-primary" id="next-welcome">Start Check-in</button>
        </div>
        <div class="page-bottom-pad"></div>
      </div>`;
  }

  function _getWelcomeStreak(allCheckIns, programmeStart) {
    if (!programmeStart) return 0;
    const start = new Date(programmeStart);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Don't count today (no check-in yet) — streak is up to yesterday
    let streak = 0;
    let check  = new Date(today);
    check.setDate(check.getDate() - 1);
    while (check >= start) {
      const key = check.toISOString().slice(0, 10);
      const ci  = allCheckIns[key];
      if (!ci || ci.score === undefined) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  }

  // ─── Scoring Logic ────────────────────────────────────────

  function getRHRRag(rhr) {
    const profile  = Store.getProfile();
    const baseline = profile.rhrBaseline || 59.1;
    const delta    = rhr - baseline;
    if (delta <= 3)  return 'green';
    if (delta <= 7)  return 'amber';
    return 'red';
  }

  function getMetricRag(metric, value) {
    switch (metric) {
      case 'sleepScore':
        if (value >= 85) return 'green';
        if (value >= 70) return 'amber';
        return 'red';
      case 'recoveryScore':
        if (value >= 75) return 'green';
        if (value >= 50) return 'amber';
        return 'red';
      case 'rhr':
        return getRHRRag(value);
      case 'motivation':
        if (value === 'high')    return 'green';
        if (value === 'neutral') return 'amber';
        return 'red';
      case 'energy':
        if (value >= 7) return 'green';
        if (value >= 4) return 'amber';
        return 'red';
      case 'soreness':
        if (value === 'mild')     return 'green';
        if (value === 'moderate') return 'amber';
        return 'red';
      case 'jointPain':
        if (value <= 2) return 'green';
        if (value <= 5) return 'amber';
        return 'red';
      default:
        return 'green';
    }
  }

  function ragToScore(rag) {
    if (rag === 'green') return 1.0;
    if (rag === 'amber') return 0.5;
    return 0.0;
  }

  const WEIGHTS = {
    sleepScore:    0.20,
    recoveryScore: 0.25,
    rhr:           0.15,
    motivation:    0.05,
    energy:        0.10,
    soreness:      0.10,
    jointPain:     0.15,
  };

  function calculateScore(ans) {
    if (ans.illness)            return { score: 0, rag: 'red', autoRed: 'Illness/Fever' };
    if (ans.recoveryScore < 20) return { score: 0, rag: 'red', autoRed: 'Recovery score below 20%' };
    if (getRHRRag(ans.rhr) === 'red') {
      const profile  = Store.getProfile();
      const baseline = profile.rhrBaseline || 59.1;
      if (ans.rhr - baseline >= 10) return { score: 0, rag: 'red', autoRed: 'Resting HR +10 bpm above baseline' };
    }
    if (ans.jointPain >= 6) return { score: 0, rag: 'red', autoRed: 'Joint pain ≥6' };

    let total = 0;
    Object.keys(WEIGHTS).forEach(key => {
      const rag = getMetricRag(key, ans[key]);
      total    += ragToScore(rag) * WEIGHTS[key];
    });

    const pct = Math.round(total * 100);
    let rag;
    if (pct >= 80)      rag = 'green';
    else if (pct >= 60) rag = 'amber';
    else                rag = 'red';

    return { score: pct, rag, autoRed: null };
  }

  // ─── DOM Helpers ──────────────────────────────────────────

  function getEl(id) { return document.getElementById(id); }

  function updateProgress() {
    const hasWelcome  = STEPS[0] === 'welcome';
    const progressBar = document.getElementById('modal-progress-bar');
    const backBtn     = document.getElementById('modal-back-btn');

    if (hasWelcome && currentStep === 0) {
      // Welcome screen: hide progress bar, hide back button
      if (progressBar) progressBar.style.display = 'none';
      if (backBtn) backBtn.style.visibility = 'hidden';
      return;
    }

    if (progressBar) progressBar.style.display = '';

    // Step index within the check-in portion
    const ciStep  = hasWelcome ? currentStep - 1 : currentStep;
    const ciTotal = CHECKIN_STEPS.length;
    const pct     = Math.round(((ciStep + 1) / ciTotal) * 100);
    const fill    = document.querySelector('.modal-progress-fill');
    const lbl     = document.querySelector('.modal-progress-label');
    if (fill) fill.style.width = `${pct}%`;
    if (lbl)  lbl.textContent  = `${ciStep + 1} of ${ciTotal}`;

    const firstCheckinStep = hasWelcome ? 1 : 0;
    if (backBtn) backBtn.style.visibility = currentStep <= firstCheckinStep ? 'hidden' : 'visible';
  }

  function showStep(index, direction = 1) {
    const steps = document.querySelectorAll('.modal-step');
    steps.forEach((s, i) => {
      s.classList.remove('active', 'exit');
      if (i === index) {
        s.classList.add('active');
      } else if (i === index - direction) {
        s.classList.add('exit');
      }
    });
    currentStep = index;
    // Reveal "Daily Readiness" title once past the welcome step
    const titleEl = document.getElementById('modal-header-title');
    if (titleEl) titleEl.style.visibility = (STEPS[index] === 'welcome') ? 'hidden' : 'visible';
    updateProgress();
  }

  function advance() {
    if (currentStep < TOTAL_STEPS - 1) showStep(currentStep + 1, 1);
  }

  // ─── Build Modal HTML ─────────────────────────────────────

  function buildModal(welcomeHTML) {
    const backdrop = document.createElement('div');
    backdrop.id    = 'log-modal-backdrop';
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
    });

    // When the welcome step is included, progress bar only counts check-in steps
    const progressStepCount = CHECKIN_STEPS.length;

    backdrop.innerHTML = `
      <div id="log-modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <button class="modal-close-btn" id="modal-back-btn" style="visibility:hidden;">‹</button>
          <span class="modal-header-title" id="modal-header-title" ${welcomeHTML ? 'style="visibility:hidden;"' : ''}>Daily Readiness</span>
          <button class="modal-close-btn" id="log-modal-close">✕</button>
        </div>
        <div class="modal-progress" id="modal-progress-bar" ${welcomeHTML ? 'style="display:none"' : ''}>
          <div class="modal-progress-track">
            <div class="modal-progress-fill" style="width:0%"></div>
          </div>
          <div class="modal-progress-label">1 of ${progressStepCount}</div>
        </div>
        <div class="modal-steps">
          ${welcomeHTML || ''}
          ${buildStepSleep()}
          ${buildStepRecovery()}
          ${buildStepRHR()}
          ${buildStepMotivation()}
          ${buildStepEnergy()}
          ${buildStepSoreness()}
          ${buildStepJointPain()}
          ${buildStepSummary()}
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(backdrop);
    bindEvents(!!welcomeHTML);
  }

  function buildStepSleep() {
    return `
      <div class="modal-step" data-step="sleep">
        <div class="step-question">Sleep Score</div>
        <div class="step-hint">Enter your Bevel sleep score (0–100)</div>
        <div class="number-input-wrap">
          <input class="native-input" id="input-sleep" type="tel"
                 placeholder="e.g. 82" value="${answers.sleepScore ?? ''}" />
          <div class="number-input-unit">out of 100</div>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-sleep">Continue</button>
        </div>
      </div>`;
  }

  function buildStepRecovery() {
    return `
      <div class="modal-step" data-step="recovery">
        <div class="step-question">Recovery Score</div>
        <div class="step-hint">Enter your Bevel recovery score (0–100)</div>
        <div class="number-input-wrap">
          <input class="native-input" id="input-recovery" type="tel"
                 placeholder="e.g. 74" value="${answers.recoveryScore ?? ''}" />
          <div class="number-input-unit">out of 100</div>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-recovery">Continue</button>
        </div>
      </div>`;
  }

  function buildStepRHR() {
    const profile  = Store.getProfile();
    const baseline = profile.rhrBaseline || 59.1;
    return `
      <div class="modal-step" data-step="rhr">
        <div class="step-question">Resting Heart Rate</div>
        <div class="step-hint">Your baseline is ${baseline} bpm</div>
        <div class="number-input-wrap">
          <input class="native-input" id="input-rhr" type="number"
                 inputmode="decimal" placeholder="e.g. 58.4"
                 value="${answers.rhr ?? ''}" />
          <div class="number-input-unit">bpm</div>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-rhr">Continue</button>
        </div>
      </div>`;
  }

  function buildStepMotivation() {
    return `
      <div class="modal-step" data-step="motivation">
        <div class="step-question">Motivation</div>
        <div class="step-hint">How do you feel about training today?</div>
        <div class="native-select-wrap">
          <select id="input-motivation" class="native-select">
            <option value="">Select...</option>
            <option value="high"     ${answers.motivation === 'high'     ? 'selected' : ''}>High — ready to go</option>
            <option value="neutral"  ${answers.motivation === 'neutral'  ? 'selected' : ''}>Neutral — I'll get through it</option>
            <option value="dreading" ${answers.motivation === 'dreading' ? 'selected' : ''}>Dreading it</option>
          </select>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-motivation">Continue</button>
        </div>
      </div>`;
  }

  function buildStepEnergy() {
    return `
      <div class="modal-step" data-step="energy">
        <div class="step-question">Energy Level</div>
        <div class="step-hint">Rate your energy from 1 (exhausted) to 10 (excellent)</div>
        <div class="native-select-wrap">
          <select id="input-energy" class="native-select">
            <option value="">Select...</option>
            ${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
              `<option value="${n}" ${answers.energy === n ? 'selected' : ''}>${n}</option>`
            ).join('')}
          </select>
        </div>
        <div class="illness-row" id="illness-row" style="margin-top:var(--space-md)">
          <div class="illness-checkbox ${answers.illness ? 'checked' : ''}" id="illness-checkbox">
            <span class="illness-checkbox-icon">✓</span>
          </div>
          <div>
            <div class="illness-label">Illness or Fever</div>
          </div>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-energy">Continue</button>
        </div>
      </div>`;
  }

  function buildStepSoreness() {
    return `
      <div class="modal-step" data-step="soreness">
        <div class="step-question">Whole Body Soreness</div>
        <div class="step-hint">How is your overall muscle soreness today?</div>
        <div class="native-select-wrap">
          <select id="input-soreness" class="native-select">
            <option value="">Select...</option>
            <option value="mild"     ${answers.soreness === 'mild'     ? 'selected' : ''}>Mild — barely noticeable</option>
            <option value="moderate" ${answers.soreness === 'moderate' ? 'selected' : ''}>Moderate — present but manageable</option>
            <option value="severe"   ${answers.soreness === 'severe'   ? 'selected' : ''}>Severe — significantly sore</option>
          </select>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-soreness">Continue</button>
        </div>
      </div>`;
  }

  function buildStepJointPain() {
    return `
      <div class="modal-step" data-step="joint">
        <div class="step-question">Joint Pain</div>
        <div class="step-hint">Rate any joint pain or discomfort today</div>
        <div class="slider-wrap">
          <div class="slider-value-display" id="joint-value-display">${answers.jointPain ?? 0}</div>
          <input class="range-input" id="input-joint" type="range"
                 min="0" max="10" step="1" value="${answers.jointPain ?? 0}" />
          <div class="slider-labels">
            <span>0 — None</span>
            <span>10 — Severe</span>
          </div>
        </div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="next-joint">Continue</button>
        </div>
      </div>`;
  }

  function buildStepSummary() {
    return `
      <div class="modal-step" data-step="summary">
        <div class="step-question">Review & Confirm</div>
        <div class="step-hint">Check your answers before calculating your score</div>
        <div class="summary-rows" id="summary-rows"></div>
        <div class="step-next-btn">
          <button class="btn btn-primary" id="btn-submit"
                  style="min-height:56px;font-size:var(--text-title3);">Done</button>
        </div>
        <div class="page-bottom-pad"></div>
      </div>`;
  }

  // ─── Populate Summary ─────────────────────────────────────

  function populateSummary() {
    const rows = [
      { label: 'Sleep Score',    value: `${answers.sleepScore}%`,    metric: 'sleepScore',    val: answers.sleepScore },
      { label: 'Recovery Score', value: `${answers.recoveryScore}%`, metric: 'recoveryScore', val: answers.recoveryScore },
      { label: 'Resting HR',     value: `${answers.rhr} bpm`,        metric: 'rhr',           val: answers.rhr },
      { label: 'Motivation',     value: cap(answers.motivation),     metric: 'motivation',    val: answers.motivation },
      { label: 'Energy',         value: `${answers.energy} / 10`,    metric: 'energy',        val: answers.energy },
      { label: 'Soreness',       value: cap(answers.soreness),       metric: 'soreness',      val: answers.soreness },
      { label: 'Joint Pain',     value: `${answers.jointPain} / 10`, metric: 'jointPain',     val: answers.jointPain },
    ];

    if (answers.illness) {
      rows.push({ label: 'Illness/Fever', value: 'Yes — Auto Red', metric: null, val: null, forceRed: true });
    }

    const container = document.getElementById('summary-rows');
    if (!container) return;

    container.innerHTML = rows.map(r => {
      const rag = r.forceRed ? 'red' : (r.metric ? getMetricRag(r.metric, r.val) : null);
      const dot = rag ? `<span class="summary-rag-dot ${rag}"></span>` : '';
      return `
        <div class="summary-row">
          <span class="summary-row-label">${r.label}</span>
          <span class="summary-row-value">${r.value}${dot}</span>
        </div>`;
    }).join('');
  }

  function cap(str) {
    if (!str) return '—';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ─── Score Ring ───────────────────────────────────────────

  function buildScoreRing(score, rag) {
    if (score == null) {
      return `
        <svg width="140" height="140" viewBox="0 0 140 140" style="display:block;">
          <circle cx="70" cy="70" r="52" fill="none" stroke="#E5E5EA" stroke-width="10"/>
          <text x="70" y="76" text-anchor="middle"
            font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
            font-size="13" fill="#AEAEB2">No score</text>
        </svg>`;
    }
    const colour    = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' }[rag] || '#30D158';
    const colourDim = { green: 'rgba(48,209,88,0.3)', amber: 'rgba(255,159,10,0.3)', red: 'rgba(255,69,58,0.3)' }[rag];
    const radius    = 52;
    const cx = 70, cy = 70;
    const circ = 2 * Math.PI * radius;
    const fill = Math.max(0, Math.min(score / 100, 1)) * circ;
    const id   = `grad-${rag}-${score}`;
    return `
      <svg width="140" height="140" viewBox="0 0 140 140"
           style="display:block;filter:drop-shadow(0 2px 10px ${colourDim});">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="${colour}" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="${colour}" stop-opacity="1"/>
          </linearGradient>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#D1D1D6" stroke-width="10"/>
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none"
          stroke="url(#${id})" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${fill} ${circ}"
          transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy + 9}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
          font-size="26" font-weight="700" fill="${colour}">${score}%</text>
      </svg>`;
  }

  // ─── Result / Overview Screen ─────────────────────────────

  function showResultWithEdit(checkin) {
    const modal = document.getElementById('log-modal');
    if (!modal) return;

    const rows = [
      { label: 'Sleep Score',    value: checkin.sleepScore    != null ? `${checkin.sleepScore}%`    : '—', metric: 'sleepScore',    val: checkin.sleepScore },
      { label: 'Recovery Score', value: checkin.recoveryScore != null ? `${checkin.recoveryScore}%` : '—', metric: 'recoveryScore', val: checkin.recoveryScore },
      { label: 'Resting HR',     value: checkin.rhr           != null ? `${checkin.rhr} bpm`        : '—', metric: 'rhr',           val: checkin.rhr },
      { label: 'Motivation',     value: checkin.motivation    != null ? cap(checkin.motivation)     : '—', metric: 'motivation',    val: checkin.motivation },
      { label: 'Energy',         value: checkin.energy        != null ? `${checkin.energy} / 10`    : '—', metric: 'energy',        val: checkin.energy },
      { label: 'Soreness',       value: checkin.soreness      != null ? cap(checkin.soreness)       : '—', metric: 'soreness',      val: checkin.soreness },
      { label: 'Joint Pain',     value: checkin.jointPain     != null ? `${checkin.jointPain} / 10` : '—', metric: 'jointPain',     val: checkin.jointPain },
    ];

    if (checkin.illness) {
      rows.push({ label: 'Illness/Fever', value: 'Yes — Auto Red', metric: null, val: null, forceRed: true });
    }

    const summaryHTML = rows.map(r => {
      const rag = r.forceRed ? 'red' : (r.metric ? getMetricRag(r.metric, r.val) : null);
      const dot = rag ? `<span class="summary-rag-dot ${rag}"></span>` : '';
      return `
        <div class="summary-row">
          <span class="summary-row-label">${r.label}</span>
          <span class="summary-row-value">${r.value}${dot}</span>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-header-title">Daily Readiness</span>
        <button class="modal-close-btn" id="log-modal-close">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:var(--space-md)">
        <div class="result-score-ring">
          ${buildScoreRing(checkin.score, checkin.rag)}
          ${checkin.autoRed ? `<div style="font-size:var(--text-footnote);color:var(--colour-red);text-align:center;margin-top:4px;">Auto Red: ${checkin.autoRed}</div>` : ''}
        </div>
        <div class="card-section-title" style="padding-left:0;padding-top:var(--space-lg);">Your answers</div>
        <div class="summary-rows" style="margin-bottom:var(--space-md)">
          ${summaryHTML}
        </div>
        <button class="btn btn-secondary" id="btn-edit-checkin">Edit Check-in</button>
        <div class="page-bottom-pad"></div>
      </div>
    `;

    document.getElementById('log-modal-close')?.addEventListener('click', close);
    document.getElementById('btn-edit-checkin')?.addEventListener('click', () => {
      close();
      setTimeout(() => openForEdit(), 450);
    });

    renderLogPage();
  }

  function getVolumeSublabel(session, rag) {
    if (session.type === 'hypertrophy') {
      const labels = { green: 'Full volume — you\'re good to go', amber: 'Moderate volume — controlled session', red: 'Low volume — protect the body today' };
      return labels[rag] || '';
    }
    if (session.type === 'bjj')   return session.note || '';
    if (session.type === 'golf')  return session.note || '';
    if (session.type === 'cycle') return session.note || '';
    if (session.type === 'rest')  return session.note || 'Rest and recover';
    if (session.type === 'race')  return session.note || '';
    return '';
  }

  function buildSessionCard(session) {
    if (session.type === 'hypertrophy') {
      const volColour = { green: 'var(--rag-green)', amber: 'var(--rag-amber)', red: 'var(--rag-red)' }[session.volume] || '';
      return `
        <div class="workout-card">
          <div class="workout-card-header">
            <span class="workout-card-icon">🏋️</span>
            <div>
              <div class="workout-card-title">${session.label}</div>
              <div class="workout-card-subtitle" style="color:${volColour};font-weight:600;">
                ${cap(session.volume)} Volume
              </div>
            </div>
          </div>
          ${session.exercises.map(e => `
            <div class="workout-exercise-row">
              <span class="workout-exercise-name">${e.name}</span>
              <span class="workout-exercise-sets">${e.sets} sets</span>
            </div>`).join('')}
        </div>`;
    }
    const icons = { bjj: '🥋', golf: '⛳', cycle: '🚴', rest: '💤', race: '🏁' };
    const icon  = icons[session.type] || '📋';
    const note  = session.note && session.note !== 'undefined' ? session.note : '';
    return `
      <div class="workout-card">
        <div class="workout-card-header">
          <span class="workout-card-icon">${icon}</span>
          <div>
            <div class="workout-card-title">${session.label || 'Rest Day'}</div>
            ${note ? `<div class="workout-card-subtitle">${note}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  function sessionIcon(type) {
    const map = { hypertrophy: '🏋️', bjj: '🥋', golf: '⛳', cycle: '🚴', rest: '💤', race: '🏁' };
    return map[type] || '📋';
  }

  // ─── Log Page Render ──────────────────────────────────────

  function renderLogPage() {
    const page = document.getElementById('page-log');
    if (!page) return;
    const checkin = Store.getTodayCheckIn();

    if (!checkin) {
      page.innerHTML = `
        <div class="log-empty-state">
          <div class="log-empty-icon">🌅</div>
          <div class="log-empty-title">No check-in yet</div>
          <div class="log-empty-subtitle">Tap Today below to start your morning check-in.</div>
        </div>`;
      return;
    }

    const profile = Store.getProfile();
    const session = TrainingData.getTodaySession(profile.programmeStart, checkin.rag);

    page.innerHTML = `
      <div class="page-header">
        <h1>Today</h1>
        <div class="page-subtitle">${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</div>
      </div>
      <div style="padding: 0 var(--space-md)">
        <div class="result-score-ring">
          ${buildScoreRing(checkin.score, checkin.rag)}
          ${checkin.autoRed ? `<div style="font-size:var(--text-footnote);color:var(--colour-red);text-align:center;margin-top:4px;">Auto Red: ${checkin.autoRed}</div>` : ''}
        </div>
        <div class="result-volume-label">${session.label || 'Rest Day'}</div>
        <div class="result-volume-sublabel">${getVolumeSublabel(session, checkin.rag)}</div>
        ${buildSessionCard(session)}
        <div class="section-spacer"></div>
        <button class="btn btn-destructive" id="btn-redo-checkin" style="margin-bottom:var(--space-sm)">Edit Check-in</button>
      </div>
      <div class="page-bottom-pad"></div>
    `;

    document.getElementById('btn-redo-checkin')?.addEventListener('click', () => {
      if (confirm('Re-do today\'s check-in?')) {
        Store.deleteCheckIn(Store.todayKey());
        renderLogPage();
      }
    });
  }

  // ─── Event Binding ────────────────────────────────────────

  function bindEvents(hasWelcome) {
    // Close
    document.getElementById('log-modal-close')?.addEventListener('click', close);

    // Back — can't go back past the first check-in step (skip welcome on back)
    document.getElementById('modal-back-btn')?.addEventListener('click', () => {
      const firstCheckinStep = hasWelcome ? 1 : 0;
      if (currentStep > firstCheckinStep) showStep(currentStep - 1, -1);
    });

    // Welcome continue
    document.getElementById('next-welcome')?.addEventListener('click', () => advance());
    bindHourlyDrag();

    // Drag to dismiss — scroll body is the currently visible step
    const modal = document.getElementById('log-modal');
    if (modal) {
      const scrollProxy = { get scrollTop() {
        return modal.querySelector('.modal-step.active')?.scrollTop
            ?? modal.querySelector('.modal-step')?.scrollTop
            ?? 0;
      }};
      attachModalDrag(modal, scrollProxy, close);
    }

    // Sleep next
    document.getElementById('next-sleep')?.addEventListener('click', () => {
      const val = parseInt(getEl('input-sleep')?.value);
      if (isNaN(val) || val < 0 || val > 100) return alert('Enter a score between 0 and 100');
      answers.sleepScore = val;
      advance();
    });

    // Recovery next
    document.getElementById('next-recovery')?.addEventListener('click', () => {
      const val = parseInt(getEl('input-recovery')?.value);
      if (isNaN(val) || val < 0 || val > 100) return alert('Enter a score between 0 and 100');
      answers.recoveryScore = val;
      advance();
    });

    // RHR next
    document.getElementById('next-rhr')?.addEventListener('click', () => {
      const val = parseFloat(getEl('input-rhr')?.value);
      if (isNaN(val) || val < 30 || val > 200) return alert('Enter a valid heart rate');
      answers.rhr = val;
      advance();
    });

    // Motivation next
    document.getElementById('next-motivation')?.addEventListener('click', () => {
      const val = document.getElementById('input-motivation')?.value;
      if (!val) return alert('Please select your motivation level');
      answers.motivation = val;
      advance();
    });

    // Energy — store on change
    document.getElementById('input-energy')?.addEventListener('change', e => {
      answers.energy = parseInt(e.target.value);
    });

    // Illness checkbox
    document.getElementById('illness-row')?.addEventListener('click', () => {
      answers.illness = !answers.illness;
      document.getElementById('illness-checkbox')?.classList.toggle('checked', answers.illness);
    });

    // Energy next
    document.getElementById('next-energy')?.addEventListener('click', () => {
      if (answers.energy === null) return alert('Select an energy level');
      advance();
    });

    // Soreness next
    document.getElementById('next-soreness')?.addEventListener('click', () => {
      const val = document.getElementById('input-soreness')?.value;
      if (!val) return alert('Please select your soreness level');
      answers.soreness = val;
      advance();
    });

    // Joint pain slider
    document.getElementById('input-joint')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      answers.jointPain = val;
      const display = document.getElementById('joint-value-display');
      const slider  = document.getElementById('input-joint');
      if (display) {
        display.textContent = val;
        display.classList.toggle('danger', val >= 6);
      }
      if (slider) slider.classList.toggle('danger', val >= 6);
    });

    // Joint next
    document.getElementById('next-joint')?.addEventListener('click', () => {
      populateSummary();
      advance();
    });

    // Submit
    document.getElementById('btn-submit')?.addEventListener('click', () => {
      const result = calculateScore(answers);
      const data   = { ...answers, ...result };
      Store.saveCheckIn(data);
      showResultWithEdit(data);
    });
  }

  // ─── Open / Close ──────────────────────────────────────────

  function openForEdit() {
    const existing = Store.getTodayCheckIn();
    currentStep = 0;
    answers = {
      sleepScore:    existing?.sleepScore    ?? null,
      recoveryScore: existing?.recoveryScore ?? null,
      rhr:           existing?.rhr           ?? null,
      motivation:    existing?.motivation    ?? null,
      energy:        existing?.energy        ?? null,
      illness:       existing?.illness       ?? false,
      soreness:      existing?.soreness      ?? null,
      jointPain:     existing?.jointPain     ?? 0,
    };

    // Edit mode: no welcome step
    STEPS       = CHECKIN_STEPS;
    TOTAL_STEPS = STEPS.length;

    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();
    buildModal(null);

    requestAnimationFrame(() => {
      document.getElementById('log-modal-backdrop')?.classList.add('open');
      showStep(0);
      updateProgress();
    });
    lockBodyScroll();
  }

  async function open() {
    const existing = Store.getTodayCheckIn();
    if (existing) {
      openWithResult(existing);
      return;
    }

    currentStep = 0;
    answers = {
      sleepScore: null, recoveryScore: null, rhr: null,
      motivation: null, energy: null, illness: false,
      soreness: null, jointPain: 0,
    };

    // Build welcome step: fetch weather and today's sessions
    const profile       = Store.getProfile();
    const todayStr      = Store.todayKey();
    const todaySession  = TrainingData.getSessionForDate(todayStr, profile.programmeStart, 'green', profile.programme, profile.programmeLengthWeeks);
    const todaySessions = todaySession ? [todaySession] : [];

    // Start fetching weather in the background (don't block modal open)
    STEPS      = ['welcome', ...CHECKIN_STEPS];
    TOTAL_STEPS = STEPS.length;

    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();

    // Fetch weather async — build modal with placeholder, then patch in once ready
    let weather = _weatherCache;
    if (!weather) {
      fetchWeather().then(w => {
        _weatherCache = w;
        const el = document.querySelector('.welcome-weather-placeholder');
        if (el && w) {
          const hourlyHTML = w.hourly && w.hourly.length
            ? `<div class="welcome-hourly">${w.hourly.map(slot => `
                <div class="welcome-hourly-slot">
                  <span class="welcome-hourly-time">${String(slot.hour).padStart(2,'0')}:00</span>
                  <span class="welcome-hourly-icon">${slot.icon}</span>
                  <span class="welcome-hourly-temp">${slot.temp}°</span>
                </div>`).join('')}</div>`
            : '';
          el.outerHTML = `
            <div class="welcome-weather-block">
              <div class="welcome-weather-main">
                <span class="welcome-weather-icon">${w.icon}</span>
                <span class="welcome-weather-temp">${w.temp}°C</span>
                <span class="welcome-weather-condition">${w.condition}</span>
                <span class="welcome-weather-hilo">H:${w.high}° L:${w.low}°</span>
              </div>
              ${hourlyHTML}
            </div>`;
          bindHourlyDrag();
        }
      });
    }

    const welcomeHTML = buildStepWelcome(todaySessions, weather);
    buildModal(welcomeHTML);

    requestAnimationFrame(() => {
      document.getElementById('log-modal-backdrop')?.classList.add('open');
      showStep(0);
      updateProgress();
    });
    lockBodyScroll();
  }

  function openWithResult(checkin) {
    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();

    const backdropEl     = document.createElement('div');
    backdropEl.id        = 'log-modal-backdrop';
    backdropEl.innerHTML = `<div id="log-modal"></div>`;
    document.getElementById('app').appendChild(backdropEl);

    backdropEl.addEventListener('click', e => {
      if (e.target === backdropEl) close();
    });

    requestAnimationFrame(() => {
      backdropEl.classList.add('open');
      showResultWithEdit(checkin);
    });
    lockBodyScroll();
  }

  function close() {
    const backdrop = document.getElementById('log-modal-backdrop');
    const modal    = document.getElementById('log-modal');
    if (modal) modal.style.transform = '';
    if (backdrop) {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 400);
    }
    unlockBodyScroll();
    NavBar.setActiveByTarget(Router.getCurrentPage());
  }

  // ─── Init ─────────────────────────────────────────────────

  function init() {
    checkMidnightReset();
    renderLogPage();
    maybeAutoOpen();
  }

  function maybeAutoOpen() {
    // Auto-open the morning modal once per day if no check-in yet
    const todayStr  = Store.todayKey();
    const seenKey   = `tl_morning_seen_${todayStr}`;
    const alreadySeen = localStorage.getItem(seenKey);
    if (alreadySeen) return;

    const existing = Store.getTodayCheckIn();
    if (existing) return;

    // Mark as shown for today so reloads don't re-trigger
    localStorage.setItem(seenKey, '1');

    // Small delay so the UI has settled before the modal slides up
    setTimeout(() => open(), 600);
  }

  function checkMidnightReset() {
    scheduleMidnightReset();
  }

  function scheduleMidnightReset() {
    const now      = new Date();
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntil  = midnight - now;

    setTimeout(() => {
      renderLogPage();
      scheduleMidnightReset();
    }, msUntil);
  }

  return { open, close, init, renderLogPage };

})();

document.addEventListener('DOMContentLoaded', () => LogModal.init());