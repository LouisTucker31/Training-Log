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

  function closeModalIfOpen() {
    const backdrop = document.getElementById('log-modal-backdrop');
    if (backdrop) {
      // Bypass NavBar.setActiveByTarget inside close() by removing backdrop directly
      const modal = document.getElementById('log-modal');
      if (modal) modal.style.transform = '';
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 400);
    }
  }

  function init() {
    document.addEventListener('nav:change', e => {
      const target = e.detail.target;

      if (target === 'log') {
        if (document.getElementById('log-modal-backdrop')) return;
        LogModal.open();
        return;
      }

      // If already on this page, scroll to top
      if (target === currentPage) {
        const page = document.querySelector(`.page[data-page="${target}"]`);
        if (page) page.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      closeModalIfOpen();
      showPage(target);
    });

    // Show home on load
    showPage('home');
  }

  return { init, showPage, getCurrentPage };

})();

document.addEventListener('DOMContentLoaded', () => Router.init());