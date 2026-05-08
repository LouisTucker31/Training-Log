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

  const STEPS = ['sleep', 'recovery', 'rhr', 'motivation', 'energy', 'soreness', 'joint', 'summary'];
  const TOTAL_STEPS = STEPS.length;

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
        if (value === 'high')     return 'green';
        if (value === 'neutral')  return 'amber';
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
    // ─── Auto-red checks ──────────────────────────────────
    if (ans.illness)                        return { score: 0, rag: 'red', autoRed: 'Illness/Fever' };
    if (ans.recoveryScore < 20)             return { score: 0, rag: 'red', autoRed: 'Recovery score below 20%' };
    if (getRHRRag(ans.rhr) === 'red') {
      const profile  = Store.getProfile();
      const baseline = profile.rhrBaseline || 59.1;
      if (ans.rhr - baseline >= 10)         return { score: 0, rag: 'red', autoRed: 'Resting HR +10 bpm above baseline' };
    }
    if (ans.jointPain >= 6)                 return { score: 0, rag: 'red', autoRed: 'Joint pain ≥6' };

    // ─── Weighted score ────────────────────────────────────
    let total = 0;
    Object.keys(WEIGHTS).forEach(key => {
      const rag   = getMetricRag(key, ans[key]);
      total      += ragToScore(rag) * WEIGHTS[key];
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
    const pct  = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);
    const fill = document.querySelector('.modal-progress-fill');
    const lbl  = document.querySelector('.modal-progress-label');
    if (fill) fill.style.width = `${pct}%`;
    if (lbl)  lbl.textContent  = `${currentStep + 1} of ${TOTAL_STEPS}`;
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
    updateProgress();
  }

  function advance() {
    if (currentStep < TOTAL_STEPS - 1) showStep(currentStep + 1, 1);
  }

  // ─── Build Modal HTML ─────────────────────────────────────

  function buildModal() {
    const backdrop = document.createElement('div');
    backdrop.id    = 'log-modal-backdrop';
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close();
    });
    backdrop.innerHTML = `
      <div id="log-modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <span class="modal-header-title">Morning Check-in</span>
          <button class="modal-close-btn" id="log-modal-close">✕</button>
        </div>
        <div class="modal-progress">
          <div class="modal-progress-track">
            <div class="modal-progress-fill" style="width:0%"></div>
          </div>
          <div class="modal-progress-label">1 of ${TOTAL_STEPS}</div>
        </div>
        <div class="modal-steps">
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
    bindEvents();
  }

  function buildStepSleep() {
    return `
      <div class="modal-step" data-step="sleep">
        <div class="step-question">Sleep Score</div>
        <div class="step-hint">Enter your Bevel sleep score (0–100)</div>
        <div class="number-input-wrap">
          <input class="native-input" id="input-sleep" type="tel"
                 placeholder="e.g. 82" />
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
                 placeholder="e.g. 74" />
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
          <input class="native-input" id="input-rhr" type="tel" placeholder="e.g. 58" />
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
            <option value="high">High — ready to go</option>
            <option value="neutral">Neutral — I'll get through it</option>
            <option value="dreading">Dreading it</option>
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
            ${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
        </div>
        <div class="illness-row" id="illness-row" style="margin-top:var(--space-md)">
          <div class="illness-checkbox" id="illness-checkbox">
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
            <option value="mild">Mild — barely noticeable</option>
            <option value="moderate">Moderate — present but manageable</option>
            <option value="severe">Severe — significantly sore</option>
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
        <div class="step-hint">Rate any joint pain or discomfort (≥6 is auto-red)</div>
        <div class="slider-wrap">
          <div class="slider-value-display" id="joint-value-display">0</div>
          <input class="range-input" id="input-joint" type="range"
                 min="0" max="10" step="1" value="0" />
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
          <button class="btn btn-primary" id="btn-submit" style="min-height:56px;font-size:var(--text-title3);">Done</button>
        </div>
        <div class="page-bottom-pad"></div>
      </div>`;
  }

  // ─── Populate Summary ─────────────────────────────────────

  function populateSummary() {
    const profile  = Store.getProfile();
    const baseline = profile.rhrBaseline || 59.1;
    const rows = [
      { label: 'Sleep Score',     value: `${answers.sleepScore}%`,    metric: 'sleepScore',    val: answers.sleepScore },
      { label: 'Recovery Score',  value: `${answers.recoveryScore}%`, metric: 'recoveryScore', val: answers.recoveryScore },
      { label: 'Resting HR',      value: `${answers.rhr} bpm`,        metric: 'rhr',           val: answers.rhr },
      { label: 'Motivation',      value: cap(answers.motivation),     metric: 'motivation',    val: answers.motivation },
      { label: 'Energy',          value: `${answers.energy} / 10`,    metric: 'energy',        val: answers.energy },
      { label: 'Soreness',        value: cap(answers.soreness),       metric: 'soreness',      val: answers.soreness },
      { label: 'Joint Pain',      value: `${answers.jointPain} / 10`, metric: 'jointPain',     val: answers.jointPain },
    ];

    if (answers.illness) {
      rows.push({ label: 'Illness/Fever', value: 'Yes — Auto Red', metric: null, val: null, forceRed: true });
    }

    const container = document.getElementById('summary-rows');
    if (!container) return;

    container.innerHTML = rows.map(r => {
      let rag = r.forceRed ? 'red' : (r.metric ? getMetricRag(r.metric, r.val) : null);
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

  function buildScoreRing(score, rag) {
    const colour    = { green: '#30D158', amber: '#FF9F0A', red: '#FF453A' }[rag] || '#30D158';
    const colourDim = { green: 'rgba(48,209,88,0.3)', amber: 'rgba(255,159,10,0.3)', red: 'rgba(255,69,58,0.3)' }[rag];
    const radius    = 52;
    const cx        = 70;
    const cy        = 70;
    const circ      = 2 * Math.PI * radius;
    const fill      = Math.max(0, Math.min(score / 100, 1)) * circ;
    const id        = `grad-${rag}-${score}`;
    return `
      <svg width="140" height="140" viewBox="0 0 140 140"
           style="display:block;filter:drop-shadow(0 2px 10px ${colourDim});">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${colour}" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="${colour}" stop-opacity="1"/>
          </linearGradient>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${radius}"
          fill="none"
          stroke="#D1D1D6"
          stroke-width="10"/>
        <circle cx="${cx}" cy="${cy}" r="${radius}"
          fill="none"
          stroke="url(#${id})"
          stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray="${fill} ${circ}"
          transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy + 9}" text-anchor="middle"
          font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"
          font-size="26" font-weight="700"
          fill="${colour}">${score}%</text>
      </svg>`;
  }

  // ─── Result Screen ────────────────────────────────────────

  function showResult(result) {
    const profile = Store.getProfile();
    const session = TrainingData.getTodaySession(profile.programmeStart, result.rag);
    const icon    = sessionIcon(session.type);

    const modal = document.getElementById('log-modal');
    if (!modal) return;

    // Replace modal content with result
    modal.innerHTML = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-header-title">Today's Training</span>
        <button class="btn btn-secondary" id="result-close-btn"
                style="width:auto;min-height:32px;padding:0 14px;font-size:15px;">Done</button>
      </div>
      <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:var(--space-md)">
        <div class="result-score-ring">
          ${buildScoreRing(result.score, result.rag)}
          ${result.autoRed ? `<div style="font-size:var(--text-footnote);color:var(--colour-red);text-align:center;margin-top:4px;">Auto Red: ${result.autoRed}</div>` : ''}
        </div>

        <div class="result-volume-label">${session.label || 'Rest Day'}</div>
        <div class="result-volume-sublabel">${getVolumeSublabel(session, result.rag)}</div>

        ${buildSessionCard(session)}

        <div class="section-spacer"></div>
        <div class="page-bottom-pad"></div>
      </div>
    `;

    document.getElementById('result-close-btn').addEventListener('click', close);

    // Also update the log page behind the modal
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
    const page    = document.getElementById('page-log');
    if (!page) return;
    const checkin = Store.getTodayCheckIn();

    if (!checkin) {
      page.innerHTML = `
        <div class="log-empty-state">
          <div class="log-empty-icon">🌅</div>
          <div class="log-empty-title">No check-in yet</div>
          <div class="log-empty-subtitle">Tap Log below to start your morning check-in.</div>
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

  function bindEvents() {
    // Close
    document.getElementById('log-modal-close')?.addEventListener('click', close);

    // Drag to dismiss
    const modal  = document.getElementById('log-modal');
    const handle = modal?.querySelector('.modal-handle');
    if (modal && handle) {
      let startY   = 0;
      let currentY = 0;
      let dragging = false;

      handle.addEventListener('touchstart', e => {
        startY   = e.touches[0].clientY;
        currentY = startY;
        dragging = true;
        modal.style.transition = 'none';
      }, { passive: true });

      document.addEventListener('touchmove', e => {
        if (!dragging) return;
        currentY    = e.touches[0].clientY;
        const raw   = currentY - startY;
        const delta = raw < 0
          ? Math.max(-30, raw * 0.15)
          : Math.min(120, raw * 0.6);
        modal.style.transform = `translateY(${delta}px)`;
      }, { passive: true });

      document.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging    = false;
        const delta = Math.max(0, currentY - startY);
        modal.style.transition = '';
        if (delta > 100) {
          close();
        } else {
          modal.style.transform = 'translateY(0)';
        }
      });
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
      const val = parseInt(getEl('input-rhr')?.value);
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

    // Energy — just store on change, next button advances
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
      const val     = parseInt(e.target.value);
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
      // Overwrites any existing check-in for today (covers both new and edit)
      Store.saveCheckIn(data);
      close();
    });
  }

  // ─── Open / Close ──────────────────────────────────────────

  function openForEdit() {
    // Open the form fresh but don't delete the existing check-in yet
    // Only on final submit do we overwrite it
    currentStep = 0;
    answers = { sleepScore: null, recoveryScore: null, rhr: null,
                motivation: null, energy: null, illness: false,
                soreness: null, jointPain: 0 };

    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();
    buildModal();

    // Mark modal as edit mode so submit overwrites rather than treating as new
    const modal = document.getElementById('log-modal');
    if (modal) modal.dataset.editMode = 'true';

    const editBackdrop = document.getElementById('log-modal-backdrop');
    if (editBackdrop) {
      editBackdrop.addEventListener('click', e => {
        if (e.target === editBackdrop) close();
      });
    }

    requestAnimationFrame(() => {
      document.getElementById('log-modal-backdrop')?.classList.add('open');
      showStep(0);
      updateProgress();
    });
  }

  function open() {
    // If already checked in today, always show the overview
    // (edit mode is only entered via the Edit button inside the overview)
    const existing = Store.getTodayCheckIn();
    if (existing) {
      openWithResult(existing);
      return;
    }

    // Reset state
    currentStep = 0;
    answers = { sleepScore: null, recoveryScore: null, rhr: null,
                motivation: null, energy: null, illness: false,
                soreness: null, jointPain: 0 };

    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();
    buildModal();

    requestAnimationFrame(() => {
      document.getElementById('log-modal-backdrop')?.classList.add('open');
      showStep(0);
      updateProgress();
    });
  }

  function openWithResult(checkin) {
    let backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) backdrop.remove();

    const backdropEl  = document.createElement('div');
    backdropEl.id     = 'log-modal-backdrop';
    backdropEl.innerHTML = `<div id="log-modal"></div>`;
    document.getElementById('app').appendChild(backdropEl);

    backdropEl.addEventListener('click', e => {
      if (e.target === backdropEl) close();
    });
    requestAnimationFrame(() => {
      backdropEl.classList.add('open');
      showResultWithEdit(checkin);
    });
  }

  function showResultWithEdit(checkin) {
    const modal = document.getElementById('log-modal');
    if (!modal) return;

    const rows = [
      { label: 'Sleep Score',    value: `${checkin.sleepScore}%`,    metric: 'sleepScore',    val: checkin.sleepScore },
      { label: 'Recovery Score', value: `${checkin.recoveryScore}%`, metric: 'recoveryScore', val: checkin.recoveryScore },
      { label: 'Resting HR',     value: `${checkin.rhr} bpm`,        metric: 'rhr',           val: checkin.rhr },
      { label: 'Motivation',     value: cap(checkin.motivation),     metric: 'motivation',    val: checkin.motivation },
      { label: 'Energy',         value: `${checkin.energy} / 10`,    metric: 'energy',        val: checkin.energy },
      { label: 'Soreness',       value: cap(checkin.soreness),       metric: 'soreness',      val: checkin.soreness },
      { label: 'Joint Pain',     value: `${checkin.jointPain} / 10`, metric: 'jointPain',     val: checkin.jointPain },
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
        <span class="modal-header-title">Today's Check-in</span>
        <button class="modal-close-btn" id="log-modal-close">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:var(--space-md)">

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
  }

  function close() {
    const backdrop = document.getElementById('log-modal-backdrop');
    const modal    = document.getElementById('log-modal');
    if (modal) modal.style.transform = '';
    if (backdrop) {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 400);
    }
    // Return nav pill to previous page
    NavBar.setActiveByTarget(Router.getCurrentPage());
  }

  // ─── Init ─────────────────────────────────────────────────

  function init() {
    checkMidnightReset();
    renderLogPage();
  }

  function checkMidnightReset() {
    // Store the last known date — if it's changed since last visit, nothing to do
    // (Store.getTodayCheckIn already keys by today's date, so old entries are
    // automatically ignored. We just need to schedule a live reset if the app
    // stays open past midnight.)
    scheduleMidnightReset();
  }

  function scheduleMidnightReset() {
    const now       = new Date();
    const midnight  = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntil   = midnight - now;

    setTimeout(() => {
      // Midnight has passed — re-render the log page so it shows empty state
      renderLogPage();
      // Schedule the next one
      scheduleMidnightReset();
    }, msUntil);
  }

  return { open, close, init, renderLogPage };

})();

document.addEventListener('DOMContentLoaded', () => LogModal.init());