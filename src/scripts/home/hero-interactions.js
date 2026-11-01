/*!
 * home/hero-interactions.js: Hero button & search pulse interactions
 * (modularized V11.1-M).
 *
 * Single responsibility: efek hover tombol hero (arrow + scale) dan
 * search focus pulse (ikon + placeholder). Listener terdaftar di
 * registry; timer placeholder bisa dibatalkan alami (route teardown
 * mengganti DOM). Tidak mengendalikan rendering Hero.
 */
import {
  qs, qsa, MOTION, hasGSAP, isReducedMotion,
  trackMotionListener, trackEventTween,
} from '../core.js';

function initHeroButtons() {
  if (!hasGSAP || isReducedMotion()) return;
  /* V9.0: home.js kini dieksekusi di semua halaman (diimpor statis oleh
     global.js untuk kontrak callback opening). Guard ini menjaga
     cakupan perilaku persis seperti sebelum V9.0: efek hover tombol
     hanya pernah aktif di halaman home - satu-satunya halaman yang
     memuat home.js sebelum V9.0. */
  if (!qs('.hero')) return;
  qsa('.button-primary, .button-outline').forEach((btn) => {
    trackMotionListener(btn, 'mouseenter', () => {
      const arrow = btn.querySelector('span[aria-hidden="true"]');
      if (arrow) {
        trackEventTween(gsap.to(arrow, { x: 4, y: -4, duration: 0.15, ease: MOTION.easeSnap, yoyo: true, repeat: 1 }));
      }
      trackEventTween(gsap.to(btn, { scale: 1.03, duration: 0.15, ease: MOTION.easeSoft }));
    });
    trackMotionListener(btn, 'mouseleave', () => {
      trackEventTween(gsap.to(btn, { scale: 1, duration: 0.15, ease: MOTION.easeSoft }));
    });
  });
}

/* Search focus pulse (5.1.3): the magnifier icon pops once and the
   placeholder whispers that the archive is listening. */
function initSearchPulse() {
  const searchInput = qs('#search-input');
  const searchIcon = qs('#project-search button svg');
  if (!searchInput || !searchIcon) return;
  const originalPlaceholder = searchInput.placeholder;
  searchInput.addEventListener('focus', () => {
    if (hasGSAP && !isReducedMotion()) {
      gsap.fromTo(searchIcon,
        { scale: 1 },
        { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: MOTION.easeSnap }
      );
    }
    searchInput.placeholder = 'Searching the archive...';
    window.setTimeout(() => { searchInput.placeholder = originalPlaceholder; }, 1500);
  });
}

/* Back to top bounce (5.7.3): a small hop on hover, motion allowed only. */

/* Modularization exports (public API of this feature module). */
export { initHeroButtons, initSearchPulse };
