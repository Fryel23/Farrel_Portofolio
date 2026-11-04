/*!
 * curtain-controller.js (V11.0 FASE 6): Curtain Pattern controller.
 *
 * ARSITEKTUR (PROMPT_EKSEKUSI_V11.0_CURTAIN_PATTERN.md):
 * Opening bukan lagi gerbang halaman (pola modal V9.1 dihapus) melainkan
 * lapisan dekoratif di atas komposisi Hero. Kontrak inti:
 *  - Hero TIDAK bergantung pada controller ini dalam bentuk apa pun
 *    (spek §3.8): seluruh fungsi Hero tetap hidup meski Curtain tidak
 *    pernah tampil.
 *  - Default Curtain hidden; class .is-active + Skip hanya dipasang
 *    SETELAH seluruh setup sukses (spek §9.4-9.5). Gagal di mana pun ->
 *    fail-safe hidden, halaman normal.
 *  - Tidak ada modal, scroll lock, wheel/touch interception, focus trap,
 *    inert, aria-modal (spek §3.3). Skip satu-satunya elemen interaktif.
 *  - State machine eksplisit; completion tepat satu kali lewat fungsi
 *    `complete()` idempoten (spek §10-10.1).
 *  - Resource ownership: SATU dispose() milik controller. GSAP
 *    context.revert() mengembalikan inline style; listener MQL/skip
 *    dilepas eksplisit. TIDAK ada setTimeout/setInterval sama sekali -
 *    counter & ticker digerakkan timeline GSAP, sehingga tidak ada
 *    timer yatim yang mungkin tertinggal (spek §9.3 + §15.6).
 *  - Late activation protection (spek §9.6): tanpa window.onload /
 *    network idle; bila initialization terlambat (> ACTIVATION_WINDOW_MS
 *    sejak navigasi), halaman sudah discroll, atau fokus sudah ada di
 *    kontrol hero -> kunjungan ini tanpa Curtain, Hero berjalan normal.
 *  - Session policy V9.1 dipertahankan: sekali per sesi via sessionStorage
 *    'fip-opening-seen' (kunci lama dipakai ulang - tanpa storage baru,
 *    refresh di tengah animasi tidak pernah me-replay, spek §14.5).
 *  - Lifecycle Astro: dispose terjadi pada astro:before-swap (listener
 *    module-level terpasang sekali) dan pada preferensi reduce yang
 *    berubah mid-run. cleanupMotionRegistry (core.js) tetap menjadi
 *    jaring pengaman navigasi untuk listener terlacak.
 */
import gsap from 'gsap';
import { qs, isReducedMotion, trackMotionListener } from './core.js';

/* Kebijakan sesi: kunci lama V9.1 dipakai ulang (sekali per sesi). */
const SESSION_SEEN_KEY = 'fip-opening-seen';
/* Jendela aktivasi sejak navigasi dimulai (spek §9.6: pedoman ~1s). */
const ACTIVATION_WINDOW_MS = 1000;
/* Geometri frame fallback (px) bila pengukuran live tidak tersedia. */
const FALLBACK_FRAME_TOP = 96;
const FALLBACK_FRAME_BOTTOM = 24;
const MIN_FRAME_BOTTOM = 24;
const FRAME_BOTTOM_MARGIN = 28;

const STATE = Object.freeze({
  INACTIVE: 'inactive',
  INITIALIZING: 'initializing',
  ACTIVE: 'active',
  COMPLETING: 'completing',
  COMPLETED: 'completed',
  DISPOSED: 'disposed',
});

/* Ticker: teks berganti lewat tl.call (tanpa interval). */
const TICKER_LINES = [
  '> ARCHIVE INITIALIZING / 001',
  '> MOUNTING DATA ATLAS / 002',
  '> INDEXING FIELD NOTES / 003',
  '> ARCHIVE READY / 004',
];

/* Instance aktif tunggal (spek §9.7 duplicate initialization prevention). */
let active = null;
let beforeSwapBound = false;

/* Satu dispose untuk SELURUH resource instance: GSAP context (inline
   style dikembalikan, tween dimatikan), listener skip, listener MQL,
   state DOM (Curtain + Skip kembali hidden), dan flag modul. Idempoten. */
function makeController(root, skip) {
  const controller = { state: STATE.INITIALIZING, disposed: false };
  let context = null;
  let mql = null;
  let mqlHandler = null;

  const hideDom = () => {
    root.classList.remove('is-active');
    /* Hapus CSS var ukuran frame agar tidak ada state sisa di root. */
    root.style.removeProperty('--v11-frame-top');
    root.style.removeProperty('--v11-frame-bottom');
    root.style.removeProperty('--v11-frame-side');
    skip.classList.remove('is-visible');
    skip.hidden = true;
    /* Jangan tinggalkan fokus pada elemen yang disembunyikan (spek §7.4);
       fokus jatuh ke body tanpa dipaksa ke target tertentu. */
    if (document.activeElement === skip) skip.blur();
  };

  /* Sumber kebenaran completion - tepat satu kali (spek §10.1). */
  const complete = () => {
    if (controller.disposed) return;
    if (controller.state === STATE.COMPLETING ||
        controller.state === STATE.COMPLETED ||
        controller.state === STATE.DISPOSED) return;
    controller.state = STATE.COMPLETING;
    hideDom();
    dispose();
    controller.state = STATE.COMPLETED;
  };

  const dispose = () => {
    if (controller.disposed) return;
    controller.disposed = true;
    if (context) {
      try { context.revert(); } catch (error) { /* context sudah mati */ }
      context = null;
    }
    skip.removeEventListener('click', complete);
    if (mql && mqlHandler) {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', mqlHandler);
      else if (typeof mql.removeListener === 'function') mql.removeListener(mqlHandler);
    }
    mql = null;
    mqlHandler = null;
    hideDom();
    /* Navigation dispose melaporkan DISPOSED; completion (skip/natural)
       menimpa dengan COMPLETED setelah dispose selesai - transisi tetap
       satu arah tanpa dua terminal state bersamaan. */
    if (controller.state !== STATE.COMPLETING) controller.state = STATE.DISPOSED;
    if (active === controller) active = null;
  };

  /* Fail-safe initialization (spek §9.4): tidak ada state setengah aktif. */
  const failSafe = (reason) => {
    try { console.warn('[curtain] initialization skipped:', reason); } catch (e) { /* noop */ }
    hideDom();
    dispose();
  };

  const measureFrame = () => {
    const header = qs('.site-header');
    if (header) {
      const top = Math.round(header.getBoundingClientRect().bottom) + 14;
      root.style.setProperty('--v11-frame-top', String(top) + 'px');
    }
    const hero = qs('.hero');
    if (hero) {
      const bottom = Math.round(window.innerHeight - hero.getBoundingClientRect().bottom + FRAME_BOTTOM_MARGIN);
      root.style.setProperty('--v11-frame-bottom', String(Math.max(MIN_FRAME_BOTTOM, bottom)) + 'px');
    }
  };

  const run = () => {
    /* Frame mengikuti header + batas hero aktual (dekorasi tidak boleh
       menutup konten; pengukuran live, bukan angka magic tersebar). */
    measureFrame();

    context = gsap.context(() => {
      const ringFill = root.querySelector('.v11-ring-fill');
      const counterNodes = [root.querySelector('.v11-counter'), root.querySelector('.v11-mini-counter')];
      const statusNode = root.querySelector('.v11-status');
      const tickerNode = root.querySelector('.v11-ticker-line');

      /* --- FASE T1-T2: archive framing --- */
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        /* Bracket sudut + garis ukur menggambar diri + label meta. */
        .to('.v11-bracket', { opacity: 1, duration: 0.35, stagger: 0.08 }, 0)
        .to('.v11-ruler--v', { scaleY: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut' }, 0.15)
        .to('.v11-ruler--h', { scaleX: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut' }, 0.15)
        .to('.v11-corner-label', { opacity: 1, duration: 0.4, ease: 'none' }, 0.4)
        /* T3: ritual pusat - ring scale-in, counter 000 -> 100. */
        .to('.v11-ritual', { opacity: 1, duration: 0.45 }, 0.5)
        .to('.v11-ticker', { opacity: 1, duration: 0.3, ease: 'none' }, 0.6);

      const counterProxy = { val: 0 };
      gsap.to(counterProxy, {
        val: 100, duration: 1.4, ease: 'power2.inOut', delay: 0.5,
        onUpdate: () => {
          const v = Math.round(counterProxy.val);
          const label = String(v).padStart(3, '0');
          counterNodes.forEach((node) => { if (node) node.textContent = label; });
          if (ringFill) ringFill.style.strokeDashoffset = String(289 * (1 - v / 100));
          if (statusNode && v >= 60 && statusNode.textContent === 'INITIALIZING...') {
            statusNode.textContent = 'CALIBRATING...';
          }
        },
        onComplete: () => {
          if (statusNode) statusNode.textContent = 'READY';
        },
      });

      /* Ticker berganti beat via timeline call - tanpa interval. */
      TICKER_LINES.slice(1).forEach((line, index) => {
        gsap.timeline({ delay: 0.9 + index * 0.3 })
          .call(() => {
            if (!tickerNode) return;
            tickerNode.textContent = line;
            gsap.fromTo(tickerNode, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.25, ease: 'none' });
          });
      });

      /* --- T4-T5: signature circular wipe pada dekorasi SAJA. --- */
      gsap.timeline({
        delay: 1.9,
        onComplete: complete,
      })
        .to('.v11-frame', { opacity: 0, duration: 0.35, ease: 'none' }, 0)
        .to('.v11-clip', {
          clipPath: 'circle(0% at 50% 50%)',
          duration: 0.7,
          ease: 'power3.inOut',
        }, 0);
    }, root);
  };

  controller.activate = () => {
    if (controller.disposed || controller.state !== STATE.INITIALIZING) return;
    try {
      run();
    } catch (error) {
      failSafe('setup error: ' + (error && error.message));
      return;
    }
    controller.state = STATE.ACTIVE;
    root.classList.add('is-active');
    skip.hidden = false;
    /* Skip: satu-satunya elemen interaktif Opening. Listener click
       mencakup aktivasi mouse DAN keyboard (Enter/Space native button).
       Dilepas di dispose(). */
    skip.addEventListener('click', complete);
    /* Double rAF agar transisi opacity/transform skip berjalan. */
    requestAnimationFrame(() => {
      if (!controller.disposed) skip.classList.add('is-visible');
    });
    /* Preferensi reduce yang berubah mid-run: selesaikan dengan aman. */
    mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    mqlHandler = (event) => { if (event.matches) complete(); };
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', mqlHandler);
    else if (typeof mql.addListener === 'function') mql.addListener(mqlHandler);
    /* Dilacak juga di registry: teardown navigasi melepasnya sebagai
       jaring pengaman sebelum before-swap dispose sempat berjalan. */
    trackMotionListener(mql, 'change', mqlHandler);
  };

  controller.complete = complete;
  controller.dispose = dispose;
  return controller;
}

/* Kontrak publik (spek §9.4): aman dipanggil berulang, aman tanpa elemen,
   aman tanpa GSAP; mengembalikan dispose idempoten. */
export function initCurtain() {
  const root = document.getElementById('v11-curtain');
  const skip = document.getElementById('v11-skip');

  /* Halaman tanpa Curtain (semua kecuali homepage): no-op murni. */
  if (!root || !skip) return () => {};

  /* Duplikat: kembalikan dispose instance yang sudah ada. */
  if (active && !active.disposed && active.state !== STATE.DISPOSED) return active.dispose;

  /* Reduced motion: tidak ada Curtain, tidak ada Skip, tidak ada timeline
     (spek §10.4 + §15.7) - Hero sudah berada pada state normal. */
  if (isReducedMotion()) return () => {};

  /* GSAP tidak tersedia: jangan tampilkan apa pun (spek §15.3). */
  if (typeof window.gsap === 'undefined') return () => {};

  /* Session policy: sudah pernah melihat opening sesi ini. */
  let seen = false;
  try { seen = window.sessionStorage.getItem(SESSION_SEEN_KEY) === '1'; } catch (error) { seen = false; }
  if (seen) return () => {};

  /* Late activation protection (spek §9.6): initialization terlambat,
     halaman sudah dipakai -> lewati kunjungan ini, biarkan Hero berjalan. */
  if (typeof performance !== 'undefined' && performance.now() > ACTIVATION_WINDOW_MS) return () => {};
  if (window.scrollY > 0) return () => {};
  const activeEl = document.activeElement;
  if (activeEl && activeEl.closest && activeEl.closest('.hero, .site-header')) return () => {};
  /* Tab tidak terlihat: jangan memutar opening secara tak terlihat lalu
     mengejutkan pengguna saat kembali (spek §15.6). */
  if (document.visibilityState === 'hidden') return () => {};

  /* Tandai sesi SEBELUM aktivasi: refresh di tengah animasi tidak
     pernah me-replay (kebijakan V9.1 dipertahankan). */
  try { window.sessionStorage.setItem(SESSION_SEEN_KEY, '1'); } catch (error) { /* best effort */ }

  const controller = makeController(root, skip);
  active = controller;
  controller.activate();

  /* Lifecycle Astro: satu listener module-level untuk selamanya. */
  if (!beforeSwapBound) {
    beforeSwapBound = true;
    document.addEventListener('astro:before-swap', () => {
      if (active) active.dispose();
    });
  }

  return controller.dispose;
}
