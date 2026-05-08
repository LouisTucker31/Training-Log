/* ============================================================
   profile.js — Profile & settings page
   ============================================================ */

const ProfilePage = (() => {

  const AVATAR_OPTIONS = ['🏋️','🧑‍💻','🏃','🚴','🥋','⛳','🏊','🤸','💪','🧘'];

  function getWeekInfo(programmeStart) {
    if (!programmeStart) return null;
    const start = new Date(programmeStart);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    const week = Math.min(Math.floor(diff / 7) + 1, 18);
    const day  = (diff % 7) + 1;
    return { week, day };
  }

  function render() {
    const page    = document.getElementById('page-profile');
    if (!page) return;
    const profile = Store.getProfile();
    const info    = getWeekInfo(profile.programmeStart);

    const weekBadge = info
      ? `<div class="profile-week-badge">Week ${info.week} of 18</div>`
      : `<div class="profile-week-badge" style="background:var(--fill-tertiary);color:var(--label-tertiary)">No programme set</div>`;

    const progressPct = info ? Math.round((info.week / 18) * 100) : 0;
    const progressBar = info ? `
      <div class="profile-progress-section">
        <div class="settings-group-title">Progress</div>
        <div class="profile-progress-card">
          <div class="profile-progress-header">
            <span class="profile-progress-title">Custom Programme</span>
            <span class="profile-progress-label">Week ${info.week} of 18</span>
          </div>
          <div class="profile-progress-track">
            <div class="profile-progress-fill" style="width:${progressPct}%"></div>
          </div>
        </div>
      </div>` : '';

    const avatar     = profile.avatar || '🏋️';
    const nameDisplay = profile.name
      ? `<div class="profile-name-display">${profile.name}</div>`
      : `<div class="profile-name-display placeholder">Your Name</div>`;

    page.innerHTML = `
      <div class="profile-page">

        <!-- AVATAR -->
        <div class="profile-avatar-section">
          <div class="profile-avatar" id="btn-avatar">${avatar}</div>
          ${nameDisplay}
          ${weekBadge}
        </div>

        <!-- AVATAR PICKER (hidden by default) -->
        <div class="avatar-picker" id="avatar-picker" style="display:none;">
          <div class="settings-group-title" style="padding-left:var(--space-md);">Choose Avatar</div>
          <div class="avatar-picker-grid">
            ${AVATAR_OPTIONS.map(e => `
              <button class="avatar-option ${e === avatar ? 'selected' : ''}" data-emoji="${e}">${e}</button>
            `).join('')}
          </div>
        </div>

        <!-- YOU -->
        <div class="settings-group">
          <div class="settings-group-title">You</div>
          <div class="settings-card">
            <div class="settings-row">
              <span class="settings-row-label">Name</span>
              <input
                class="settings-row-input"
                id="input-name"
                type="text"
                placeholder="Add your name"
                value="${profile.name || ''}"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
              />
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Age</span>
              <input
                class="settings-row-input"
                id="input-age"
                type="tel"
                placeholder="—"
                value="${profile.age || ''}"
              />
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Gender</span>
              <select class="settings-row-select" id="input-gender">
                <option value="">—</option>
                <option value="Male"   ${profile.gender === 'Male'   ? 'selected' : ''}>Male</option>
                <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other"  ${profile.gender === 'Other'  ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Height</span>
              <input
                class="settings-row-input"
                id="input-height"
                type="tel"
                placeholder="—"
                value="${profile.height || ''}"
              />
              <span class="settings-row-hint">cm</span>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Weight</span>
              <input
                class="settings-row-input"
                id="input-weight"
                type="tel"
                placeholder="—"
                value="${profile.weight || ''}"
              />
              <span class="settings-row-hint">kg</span>
            </div>
          </div>
        </div>

        <!-- SPORTS -->
        <div class="settings-group">
          <div class="settings-group-title">Sports</div>
          <div class="settings-card">
            <div class="settings-row">
              <span class="settings-row-label">BJJ Belt</span>
              <select class="settings-row-select" id="input-bjj-belt">
                <option value="">—</option>
                ${['White','Blue','Purple','Brown','Black'].map(b => `
                  <option value="${b}" ${profile.bjjBelt === b ? 'selected' : ''}>${b}</option>
                `).join('')}
              </select>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">BJJ Stripes</span>
              <select class="settings-row-select" id="input-bjj-stripes">
                <option value="">—</option>
                ${[0,1,2,3,4].map(n => `
                  <option value="${n}" ${profile.bjjStripes == n ? 'selected' : ''}>${n}</option>
                `).join('')}
              </select>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Golf Handicap</span>
              <input
                class="settings-row-input"
                id="input-golf-handicap"
                type="tel"
                placeholder="—"
                value="${profile.golfHandicap || ''}"
              />
            </div>
          </div>
        </div>

        <!-- GOALS -->
        <div class="settings-group">
          <div class="settings-group-title">Goals</div>
          <div class="settings-card">
            <div class="settings-row">
              <span class="settings-row-label">Primary Goal</span>
              <select class="settings-row-select" id="input-goal">
                <option value="">—</option>
                <option value="Hypertrophy"      ${profile.goal === 'Hypertrophy'      ? 'selected' : ''}>Hypertrophy</option>
                <option value="Endurance"        ${profile.goal === 'Endurance'        ? 'selected' : ''}>Endurance</option>
                <option value="General Fitness"  ${profile.goal === 'General Fitness'  ? 'selected' : ''}>General Fitness</option>
                <option value="Competition"      ${profile.goal === 'Competition'      ? 'selected' : ''}>Competition</option>
              </select>
            </div>
          </div>
        </div>

        <!-- TRAINING -->
        <div class="settings-group">
          <div class="settings-group-title">Training</div>
          <div class="settings-card">
            <div class="settings-row">
              <span class="settings-row-label">Programme Start</span>
              <input
                class="settings-row-input"
                id="input-start-date"
                type="date"
                value="${profile.programmeStart || ''}"
              />
            </div>
            <div class="settings-row">
              <span class="settings-row-label">RHR Baseline</span>
              <input
                class="settings-row-input"
                id="input-rhr-baseline"
                type="tel"
                placeholder="59.1"
                value="${profile.rhrBaseline || ''}"
              />
              <span class="settings-row-hint">bpm</span>
            </div>
          </div>
        </div>

        ${progressBar}

        <!-- DATA -->
        <div class="settings-group">
          <div class="settings-group-title">Data</div>
          <div class="settings-card">
            <div class="settings-row" id="btn-clear-data">
              <span class="settings-row-destructive">Clear All Check-in Data</span>
            </div>
          </div>
        </div>

        <!-- ABOUT -->
        <div class="settings-about">
          Training Log v1.0
        </div>

      </div>
    `;

    bindEvents(profile);
  }

  function save() {
    const name        = document.getElementById('input-name')?.value.trim()        || '';
    const startDate   = document.getElementById('input-start-date')?.value         || null;
    const rhrBaseline = parseFloat(document.getElementById('input-rhr-baseline')?.value) || 59.1;
    const age         = document.getElementById('input-age')?.value                || '';
    const gender      = document.getElementById('input-gender')?.value             || '';
    const height      = document.getElementById('input-height')?.value             || '';
    const weight      = document.getElementById('input-weight')?.value             || '';
    const goal         = document.getElementById('input-goal')?.value        || '';
    const bjjBelt      = document.getElementById('input-bjj-belt')?.value    || '';
    const bjjStripes   = document.getElementById('input-bjj-stripes')?.value || '';
    const golfHandicap = document.getElementById('input-golf-handicap')?.value || '';

    const existing = Store.getProfile();
    Store.saveProfile({
      ...existing,
      name, programmeStart: startDate, rhrBaseline,
      age, gender, height, weight, goal,
      bjjBelt, bjjStripes, golfHandicap,
    });

    // Update header live
    const nameDisplay = document.querySelector('.profile-name-display');
    if (nameDisplay) {
      nameDisplay.textContent = name || 'Your Name';
      nameDisplay.classList.toggle('placeholder', !name);
    }

    const info  = getWeekInfo(startDate);
    const badge = document.querySelector('.profile-week-badge');
    if (badge && info) {
      badge.textContent        = `Week ${info.week} of 18`;
      badge.style.background   = 'rgba(0, 122, 255, 0.10)';
      badge.style.color        = 'var(--colour-blue)';
    }
  }

  function bindEvents(profile) {
    // Avatar tap — toggle picker
    document.getElementById('btn-avatar')?.addEventListener('click', () => {
      const picker = document.getElementById('avatar-picker');
      if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    });

    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji   = btn.dataset.emoji;
        const existing = Store.getProfile();
        Store.saveProfile({ ...existing, avatar: emoji });
        const avatarEl = document.getElementById('btn-avatar');
        if (avatarEl) avatarEl.textContent = emoji;
        document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('avatar-picker').style.display = 'none';
      });
    });

    // Save on every input change
    document.getElementById('input-name')?.addEventListener('input', save);
    document.getElementById('input-age')?.addEventListener('input', save);
    document.getElementById('input-gender')?.addEventListener('change', save);
    document.getElementById('input-height')?.addEventListener('input', save);
    document.getElementById('input-weight')?.addEventListener('input', save);
    document.getElementById('input-goal')?.addEventListener('change', save);
    document.getElementById('input-bjj-belt')?.addEventListener('change', save);
    document.getElementById('input-bjj-stripes')?.addEventListener('change', save);
    document.getElementById('input-golf-handicap')?.addEventListener('input', save);
    document.getElementById('input-rhr-baseline')?.addEventListener('change', save);
    document.getElementById('input-start-date')?.addEventListener('change', () => {
      save();
      render();
    });

    // Clear data
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('Clear all check-in data? This cannot be undone.')) {
        const all = Store.getAllCheckIns();
        Object.keys(all).forEach(k => Store.deleteCheckIn(k));
        LogModal.renderLogPage();
        alert('All check-in data cleared.');
      }
    });
  }

  function init() {
    document.addEventListener('nav:change', e => {
      if (e.detail.target === 'profile') render();
    });
    render();
  }

  return { init, render };

})();

document.addEventListener('DOMContentLoaded', () => ProfilePage.init());