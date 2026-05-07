/**
 * navbar.js — iOS Floating Pill Navigation Bar
 * ─────────────────────────────────────────────
 * Drop-in with navbar.html + navbar.css.
 *
 * How the pill works:
 *  - Fixed width (72px) — identical for every tab so it
 *    never looks uneven between edge and centre items.
 *  - Always perfectly centred on the active nav-item using
 *    getBoundingClientRect() relative to #nav-track.
 *  - No clamping — the track's own padding handles edges.
 *  - Repositions on resize/orientation change.
 *
 * To integrate into your router:
 *  Call NavBar.setActiveByTarget('home') with the page name
 *  whenever you navigate programmatically.
 */

const NavBar = (() => {

  // ─── State ──────────────────────────────────────
  let pill       = null;
  let track      = null;
  let navItems   = [];
  let activeItem = null;

  // Fixed pill width — same for every tab
  const PILL_WIDTH = 72;

  // ─── Move pill to item ───────────────────────────
  function movePillTo(item) {
    if (!pill || !track || !item) return;

    const trackRect = track.getBoundingClientRect();
    const itemRect  = item.getBoundingClientRect();

    // Centre of item relative to track
    const centreX  = itemRect.left + itemRect.width / 2 - trackRect.left;
    const pillLeft = Math.round(centreX - PILL_WIDTH / 2);

    pill.style.width = `${PILL_WIDTH}px`;
    pill.style.left  = `${pillLeft}px`;
  }

  // ─── Set active item ─────────────────────────────
  function setActive(item) {
    if (!item) return;
    if (activeItem) activeItem.classList.remove('active');
    item.classList.add('active');
    activeItem = item;
    movePillTo(item);
  }

  // ─── Set active by data-target string ────────────
  function setActiveByTarget(target) {
    const item = navItems.find(i => i.dataset.target === target);
    if (item) setActive(item);
  }

  // ─── Init ────────────────────────────────────────
  function init() {
    pill     = document.getElementById('nav-pill');
    track    = document.getElementById('nav-track');
    navItems = Array.from(document.querySelectorAll('.nav-item'));

    if (!pill || !track || !navItems.length) {
      console.warn('NavBar: required elements not found.');
      return;
    }

    // Bind click handlers
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        setActive(item);

        // Hook: fire custom event so your router can listen
        const target = item.dataset.target;
        document.dispatchEvent(new CustomEvent('nav:change', { detail: { target } }));
      });
    });

    // Set initial active state (first item marked .active in HTML,
    // or fall back to the first item)
    const initialActive =
      navItems.find(i => i.classList.contains('active')) || navItems[0];

    // Remove all .active first to avoid duplicates, then re-set
    navItems.forEach(i => i.classList.remove('active'));
    activeItem = initialActive;
    activeItem.classList.add('active');

    // Position pill after layout settles (two rAF for safety on iOS)
    requestAnimationFrame(() => {
      movePillTo(activeItem);
      requestAnimationFrame(() => {
        pill.classList.add('ready');   // fade in
      });
    });

    // Reposition on resize / orientation change
    window.addEventListener('resize', () => {
      movePillTo(activeItem);
    });
  }

  // ─── Public API ──────────────────────────────────
  return { init, setActive, setActiveByTarget, movePillTo };

})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => NavBar.init());
