/* ============================================================
   alert.js — Native-style iOS alert sheet
   ============================================================ */

function showAlert({ title, message, confirmLabel = 'OK', confirmDestructive = false, onConfirm, onCancel }) {

  const existing = document.getElementById('ios-alert-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id    = 'ios-alert-overlay';

  overlay.innerHTML = `
    <div id="ios-alert-box">
      <div id="ios-alert-content">
        ${title   ? `<div id="ios-alert-title">${title}</div>`     : ''}
        ${message ? `<div id="ios-alert-message">${message}</div>` : ''}
      </div>
      <div id="ios-alert-actions">
        <button id="ios-alert-cancel">Cancel</button>
        <button id="ios-alert-confirm" class="${confirmDestructive ? 'destructive' : ''}">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function dismiss() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }

  document.getElementById('ios-alert-cancel').addEventListener('click', () => {
    dismiss();
    if (onCancel) onCancel();
  });

  document.getElementById('ios-alert-confirm').addEventListener('click', () => {
    dismiss();
    if (onConfirm) onConfirm();
  });

  // Tap outside does nothing — iOS alerts block interaction
}