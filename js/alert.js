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

// iOS-style action sheet for multi-option choices
// actions: [{ label, handler, destructive }]
function showActionSheet({ title, message, actions }) {
  const existing = document.getElementById('ios-action-sheet-overlay');
  if (existing) existing.remove();

  const actionsHTML = actions.map((a, i) => `
    <button class="ios-action-btn${a.destructive ? ' destructive' : ''}" data-idx="${i}">
      ${a.label}
    </button>`).join('');

  const overlay = document.createElement('div');
  overlay.id    = 'ios-action-sheet-overlay';
  overlay.innerHTML = `
    <div id="ios-action-sheet">
      ${(title || message) ? `
      <div class="ios-action-header">
        ${title   ? `<div class="ios-action-title">${title}</div>`     : ''}
        ${message ? `<div class="ios-action-message">${message}</div>` : ''}
      </div>` : ''}
      ${actionsHTML}
      <button class="ios-action-btn ios-action-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function dismiss() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  }

  overlay.querySelector('.ios-action-cancel').addEventListener('click', dismiss);
  overlay.querySelectorAll('.ios-action-btn[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      dismiss();
      if (actions[idx]?.handler) actions[idx].handler();
    });
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) dismiss();
  });
}

// ─── Body scroll lock ─────────────────────────────────────────
// Prevents the page behind a modal from scrolling while the modal is open.
// Uses a count so nested modals don't prematurely unlock.
let _scrollLockCount = 0;
function lockBodyScroll() {
  if (_scrollLockCount++ === 0) document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
  if (--_scrollLockCount <= 0) { _scrollLockCount = 0; document.body.style.overflow = ''; }
}

// ─── attachModalDrag ──────────────────────────────────────────
// Attaches drag-to-dismiss to a full modal sheet element.
// Works from anywhere on the modal when the scroll body is at the top,
// matching native iOS sheet behaviour.
// modal:      the sheet element that receives translateY
// scrollBody: a DOM element or {scrollTop} proxy; pass null if no inner scroll
// onDismiss:  called when the downward drag exceeds the threshold
function attachModalDrag(modal, scrollBody, onDismiss) {
  let startX = 0, startY = 0, lastY = 0, lastX = 0, dragging = false, cancelled = false;

  modal.addEventListener('touchstart', e => {
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    lastY     = startY;
    lastX     = startX;
    dragging  = false;
    // Don't intercept touches that start on a range slider
    cancelled = e.target.type === 'range';
  }, { passive: true });

  modal.addEventListener('touchmove', e => {
    if (cancelled) return;
    lastY = e.touches[0].clientY;
    lastX = e.touches[0].clientX;
    const dy = lastY - startY;
    const dx = Math.abs(lastX - startX);

    // If the gesture is more horizontal than vertical, treat as a scroll gesture
    if (!dragging && dx > Math.abs(dy) && dx > 8) {
      cancelled = true;
      return;
    }

    const atTop = !scrollBody || scrollBody.scrollTop <= 0;

    if (!dragging) {
      if (dy > 8 && atTop) {
        dragging = true;
        modal.style.transition = 'none';
      } else if (dy < -4 || !atTop) {
        cancelled = true;
        return;
      } else {
        return;
      }
    }

    e.preventDefault();
    modal.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });

  modal.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    modal.style.transition = '';
    const dy = lastY - startY;
    const dx = Math.abs(lastX - startX);
    // Only dismiss if clearly a downward drag, not a diagonal flick
    if (dy > 160 && dx < dy) {
      onDismiss();
    } else {
      modal.style.transform = 'translateY(0)';
    }
  });
}