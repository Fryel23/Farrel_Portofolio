/*!
 * global/navigation.js: navigation interactions (modularized V11.1-M).
 *
 * Single responsibility: anchor smooth-scroll delegasi, quick menu
 * (dots), dan drawer menu mobile - termasuk aria-expanded, fokus,
 * keyboard (Escape), dan close-on-outside. Tidak mengubah state menu
 * dari luar modul.
 */
import {
  doc, qs, qsa, scrollToTarget, MOTION,
  hasGSAP, isReducedMotion, trackMotionListener,
} from '../core.js';

/* V7.0: delegasi dokumen. Perilaku sama untuk link statis, dan link
   hasil render dinamis (hobi, SEE ALSO curiosity, kartu proyek) ikut
   ter-smooth-scroll karena render halaman berjalan setelah interaksi
   global. V7.4: listener level dokumen dilacak (trackMotionListener)
   supaya teardown navigasi ClientRouter melepasnya, tidak menumpuk
   setiap kali boot berjalan lagi di halaman berikutnya. */
function initAnchors() {
  trackMotionListener(doc, 'click', (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const hash = anchor.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = qs(hash);
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target);
    closeQuickMenu();
  });
}

function closeQuickMenu() {
  const menu = qs('#quick-menu');
  const button = qs('#menu-dots');
  if (!menu || !button) return;
  menu.hidden = true;
  button.setAttribute('aria-expanded', 'false');
}

function initQuickMenu() {
  const button = qs('#menu-dots');
  const menu = qs('#quick-menu');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));
    // Open stagger (5.6.3): links slide in briefly. Reduced motion and
    // failure paths show the menu instantly.
    if (willOpen && hasGSAP && !isReducedMotion()) {
      gsap.fromTo(qsa('a', menu),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: MOTION.easeSoft }
      );
    }
  });
  /* V7.4: listener level dokumen dilacak agar terlepas saat teardown
     navigasi (tidak menumpuk antar boot). */
  trackMotionListener(doc, 'click', (event) => {
    if (!event.target.closest('#quick-menu') && !event.target.closest('#menu-dots')) closeQuickMenu();
  });
  trackMotionListener(doc, 'keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeQuickMenu();
      button.focus(); // focus never lost when closing via keyboard
    }
  });
  // Keyboard users: close when focus moves out of the open menu.
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (!menu.contains(next) && next !== button) closeQuickMenu();
  });
}

/* V7.3 Fase 2: laci navigasi mobile (hamburger). Membuka/menutup drawer,
   mengunci scroll latar belakang selagi terbuka, menutup otomatis saat
   salah satu tautan diklik, dan menutup via Escape dengan mengembalikan
   fokus ke tombol hamburger (fokus tidak pernah hilang). Vanilla JS
   murni tanpa library baru, sesuai Batasan Absolut V7.3. */
function initMobileMenu() {
  const toggle = qs('#mobile-menu-toggle');
  const drawer = qs('#mobile-menu-drawer');
  const closeButton = qs('#mobile-menu-close');
  if (!toggle || !drawer) return;

  const toggleMenu = () => {
    const isHidden = drawer.hidden;
    drawer.hidden = !isHidden;
    toggle.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) {
      document.body.style.overflow = 'hidden'; // Mencegah scroll latar belakang
    } else {
      document.body.style.overflow = '';
    }
  };

  toggle.addEventListener('click', toggleMenu);
  if (closeButton) closeButton.addEventListener('click', toggleMenu);

  // Tutup menu jika tautan diklik
  qsa('a', drawer).forEach((link) => {
    link.addEventListener('click', () => {
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Tutup menu dengan tombol Escape. V7.4: dilacak untuk teardown.
  trackMotionListener(doc, 'keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) {
      toggleMenu();
      toggle.focus();
    }
  });
}

/* Modularization exports (public API of this feature module). */
export { initAnchors, closeQuickMenu, initQuickMenu, initMobileMenu };
