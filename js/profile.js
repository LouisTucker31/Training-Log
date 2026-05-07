/* ============================================================
   profile.js — Profile & settings page
   ============================================================ */

const ProfilePage = (() => {

  function getWeekInfo(programmeStart) {
    if (!programmeStart) return null;
    const start = new Date(programmeStart);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff  = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    const week  = Math.min(Math.floor(diff / 7) + 1, 18);
    const day   = (diff % 7) + 1;
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
      <div class="progress-bar-wrap">
        <div class="progress-bar-label">
          <span>Programme progress</span>
          <span>${info.week} of 18 weeks</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${progressPct}%"></div>
        </div>
      </div>` : '';

    const nameDisplay = profile.name
      ? `<div class="profile-name-display">${profile.name}</div>`
      : `<div class="profile-name-display placeholder">Your Name</div>`;

    page.innerHTML = `
      <div class="profile-page">

        <div class="profile-avatar-section">
          <div class="profile-avatar">🏋️</div>
          ${nameDisplay}
          ${weekBadge}
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
            </div>
            ${progressBar}
          </div>
        </div>

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
          Training Log v1.0<br>
          Built for Louis Tucker
        </div>

      </div>
    `;

    bindEvents(profile);
  }

  function save() {
    const name        = document.getElementById('input-name')?.value.trim() || '';
    const startDate   = document.getElementById('input-start-date')?.value || null;
    const rhrBaseline = parseFloat(document.getElementById('input-rhr-baseline')?.value) || 59.1;

    Store.saveProfile({ name, programmeStart: startDate, rhrBaseline });

    // Re-render header to reflect changes immediately
    const nameDisplay = document.querySelector('.profile-name-display');
    if (nameDisplay) {
      nameDisplay.textContent = name || 'Your Name';
      nameDisplay.classList.toggle('placeholder', !name);
    }

    // Update week badge
    const info = getWeekInfo(startDate);
    const badge = document.querySelector('.profile-week-badge');
    if (badge && info) {
      badge.textContent = `Week ${info.week} of 18`;
      badge.style.background = 'rgba(0, 122, 255, 0.10)';
      badge.style.color = 'var(--colour-blue)';
    }
  }

  function bindEvents(profile) {
    // Save on every input change — no explicit save button needed
    document.getElementById('input-name')?.addEventListener('input', save);
    document.getElementById('input-start-date')?.addEventListener('change', () => {
      save();
      render(); // Re-render to show progress bar
    });
    document.getElementById('input-rhr-baseline')?.addEventListener('change', save);

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
    // Render when profile tab is opened
    document.addEventListener('nav:change', e => {
      if (e.detail.target === 'profile') render();
    });
    // Also render on first load in case profile is the active page
    render();
  }

  return { init, render };

})();

document.addEventListener('DOMContentLoaded', () => ProfilePage.init());