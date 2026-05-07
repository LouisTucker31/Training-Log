/* ============================================================
   router.js — Page switching + modal coordination
   ============================================================ */

const Router = (() => {

  let currentPage = 'home';

  function showPage(target) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.dataset.page === target);
    });
    currentPage = target;
  }

  function getCurrentPage() {
    return currentPage;
  }

  function init() {
    document.addEventListener('nav:change', e => {
      const target = e.detail.target;

      if (target === 'training') {
        showPage('training');
        return;
      }

      if (target === 'log') {
        // Don't switch page — open modal over current page
        LogModal.open();
        return;
      }

      showPage(target);
    });

    // Show home on load
    showPage('home');
  }

  return { init, showPage, getCurrentPage };

})();

document.addEventListener('DOMContentLoaded', () => Router.init());