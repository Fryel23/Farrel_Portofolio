/*!
 * page-transitions.js (V10.0 FASE 2): Archive Wipe page transition.
 *
 * KONTRAK DENGAN CLIENTROUTER (PERINGATAN KRITIS V10.0 + temuan audit
 * Astro 7.4 / transitions/router.js):
 * - TIDAK PERNAH memanggil event.swap() (hanya ada di astro:before-swap).
 * - TIDAK PERNAH memanggil event.preventDefault() di
 *   astro:before-preparation. Audit sumber Astro 7 membuktikan bahwa
 *   preventDefault di sana TIDAK membatalkan navigasi secara diam:
 *   doPreparation melewatkan loader, lalu transition() mendelegasikan
 *   ke `location.href = to.href` - full page reload yang justru
 *   menghancurkan pengalaman (opening ter-tutup paksa, flash reload).
 *   Karena itu kedua guard (rapid click) memakai
 *   intersepsi klik fase CAPTURE pada document: navigation never
 *   starts, benar-benar "tidak terjadi apa-apa".
 * - V11.0: guard Opening V9.1 (cek dialog.open) DIHAPUS bersama
 *   dialognya. Klik tautan internal kini hidup sejak awal - Curtain
 *   Pattern tidak pernah memblokir navigasi (spek §3.3).
 *
 * Alur overlay: before-preparation = Cover (panel naik), after-swap =
 * Reveal (panel berlanjut ke atas). Karena teardown halaman (core.js,
 * globalTimeline.clear()) dapat membunuh tween Cover di tengah jalan
 * saat fetch lebih cepat dari 0.4s, Reveal sengaja memakai .to() dari
 * posisi panel SAAT INI ke y:-100% - panel "berlanjut" mulus tanpa
 * snap, dan perubahan konten tetap tertutup cross-fade bawaan <main
 * transition:animate="fade">.
 *
 * Lifecycle: initPageTransitions() dipanggil dari bootPage global.js
 * pada SETIAP astro:page-load, tetapi listener document hanya dipasang
 * SEKALI per sesi (guard `bound`). Overlay memakai transition:persist,
 * jadi node #page-transition yang sama bertahan lintas navigasi.
 *
 * Jaring pengaman: jika astro:after-swap tidak pernah tiba (fetch
 * gagal / router membatalkan di tengah jalan), timer reset memulihkan
 * overlay + flag isTransitioning agar navigasi tidak terkunci selamanya.
 * Navigasi popstate/back tidak diblokir (perilaku V9.0 dipertahankan;
 * V11.0: tidak ada lagi dialog opening yang perlu ditutup after-swap).
 */
/* M1: isReducedMotion dibaca live (window.matchMedia) di setiap handler
   agar preferensi yang berubah mid-session selalu dihormati. M2: lenis
   live binding untuk sinkronisasi scroll restoration (scrollTo
   immediate) tanpa konflik dengan loop internal Lenis. */
import { qs, trackEventTween, isReducedMotion, lenis, motionRegistry } from './core.js';
import gsap from 'gsap';

let isTransitioning = false;
let bound = false;          // guard listener ganda (bootPage jalan tiap page-load)
let resetTimer = null;      // jaring pengaman navigasi gagal
/* M2: navigationType di-capture dari astro:before-preparation
   (metadata resmi router Astro) untuk membedakan navigasi baru
   (push/replace, scroll ke top) dari Back/Forward (traverse, posisi
   scroll di-restore router/browser - tidak boleh ditimpa). */
let pendingNavType = null;         // 'push' | 'replace' | 'traverse'
/* M1 lapis 3: MQL listener memaksa reset overlay jika reduce kicks in
   saat transisi sedang berjalan (edge case di luar runtime guard). */
let reduceMql = null;
let reduceChangeHandler = null;

function resetOverlayState() {
  if (resetTimer) {
    clearTimeout(resetTimer);
    /* M4: timer yatim dihapus dari registry (konvensi lifecycle).
       cleanupMotionRegistry tetap jaring pengaman untuk kasus lain. */
    if (motionRegistry.timers) motionRegistry.timers.delete(resetTimer);
    resetTimer = null;
  }
  isTransitioning = false;
  const ov = qs('#page-transition');
  if (!ov) return;
  gsap.set(ov, { visibility: 'hidden' });
  gsap.set('.pt-panel', { y: '100%' });
  gsap.set('.pt-accent', { scaleX: 0, transformOrigin: 'left' });
  gsap.set('.pt-label', { opacity: 0 });
}

/* Link internal (= jangkauan router) tempat klik berasal. */
function internalLink(target) {
  if (!(target instanceof Element)) return null;
  const link = target.closest('a[href]');
  if (!link) return null;
  const href = link.getAttribute('href') || '';
  if (link.target === '_blank' || link.hasAttribute('download')) return null;
  if (/^(https?:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href)) return null;
  return link;
}

export function initPageTransitions() {
  const overlay = qs('#page-transition');
  if (!overlay) return;

  if (bound) return; // listener document terpasang sekali per sesi
  bound = true;
  /* ----------------------------------------------------------------
   * GUARD (fase capture, sebelum router melihat klik):
   * Transisi sedang berjalan -> klik tautan berikutnya di-blok
   * (rapid click: hanya satu transisi dalam satu waktu).
   * V11.0: guard dialog opening V9.1 DIHAPUS bersama dialognya -
   * tidak ada lagi gerbang halaman; semua tautan internal hidup
   * sejak first paint (Curtain tidak pernah memblokir navigasi).
   * ---------------------------------------------------------------- */
  document.addEventListener('click', (event) => {
    if (isReducedMotion()) return; // M1: no-op di reduce mode
    const link = internalLink(event.target);
    if (!link) return;

    if (isTransitioning) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  /* ----------------------------------------------------------------
   * COVER: navigasi benar-benar dimulai (tanpa preventDefault!).
   * Popstate di tengah transikiun cukup "menumpuk" - wipe yang sama
   * berlanjut sampai after-swap berikutnya.
   * ---------------------------------------------------------------- */
  document.addEventListener('astro:before-preparation', (event) => {
    if (isReducedMotion()) return; // M1: no-op di reduce mode

    /* Kecualikan rute Case Study Descent (biarkan morphing Astro
       berjalan tanpa wipe): /work <-> /work/[slug]. */
    const from = event.from.pathname;
    const to = event.to.pathname;
    if (from.startsWith('/work') && to.startsWith('/work/') && from !== '/work') return;
    if (from === '/work' && to.startsWith('/work/')) return;

    if (isTransitioning) return; // wipe sudah berjalan; biarkan yang sama menutup

    isTransitioning = true;
    pendingNavType = event.navigationType; // M2: capture nav type
    /* Re-query: dengan transition:persist bernama node tetap sama,
       tetapi jangan percaya-cache - ambil node hidup saat ini. */
    const ov = qs('#page-transition') || overlay;
    gsap.set(ov, { visibility: 'visible' });
    const tl = trackEventTween(gsap.timeline());
    tl.to('.pt-panel', { y: '0%', duration: 0.4, ease: 'power3.inOut' })
      .to('.pt-accent', { scaleX: 1, duration: 0.3, ease: 'none' }, 0.1)
      .to('.pt-label', { opacity: 1, duration: 0.2 }, 0.1);

    /* Jaring pengaman: jika after-swap tidak kunjung tiba.
       M4: timer didaftarkan ke motionRegistry.timers sesuai konvensi
       lifecycle; dihapus saat clear (resetOverlayState dan after-swap). */
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => resetOverlayState(), 3000);
    if (motionRegistry.timers) motionRegistry.timers.add(resetTimer);
  });

  /* ----------------------------------------------------------------
   * REVEAL: setelah DOM baru terpasang, panel berlanjut ke atas dari
   * posisi apa pun yang tersisa (lihat catatan header).
   * ---------------------------------------------------------------- */
  document.addEventListener('astro:after-swap', () => {
    if (isReducedMotion()) {
      /* M1: reduce kicks in (kemungkinan mid-transition): paksa reset
         ke state aman, jangan jalankan reveal beranimasi. */
      if (isTransitioning) resetOverlayState();
      pendingNavType = null;
      return;
    }

    if (!isTransitioning) return;

    /* M3: batalkan safety timer SEBELUM reveal dimulai. Tanpa ini,
       fetch lambat (mis. 2.9s) membuat timer 3.0s menyala di tengah
       reveal (selesai t=3.5s) dan snap .pt-panel ke y:100% - sweep
       visual yang tidak diinginkan. */
    if (resetTimer) {
      clearTimeout(resetTimer);
      if (motionRegistry.timers) motionRegistry.timers.delete(resetTimer);
      resetTimer = null;
    }

    /* M2: hanya navigasi BARU (push/replace) yang dipaksa ke top.
       Traverse (Back/Forward) membiarkan router/browser me-restore
       posisi scroll; Lenis disinkronkan ke posisi restore agar tidak
       saling menimpa. */
    if (pendingNavType !== 'traverse') {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      /* Traverse: restore oleh router/browser. Catatan V10.1 (terukur
         via instrumentasi): router memanggil scrollTo(x, y) SEBELUM
         after-swap, tetapi bentuk posisi itu menghormati CSS
         scroll-behavior: smooth (global.css) sehingga restore berjalan
         animasi lalu dibatalkan siklus save/restore
         ScrollTrigger.refresh() saat boot halaman baru - halaman selalu
         mendarat di 0. Selain itu binding `lenis` sudah null di titik
         ini (teardown core meng-destroy Lenis sebelum handler ini).
         Solusi: paksa restore deterministik dari history.state.scrollY
         (posisi resmi metadata router Astro) dengan behavior instant -
         pola yang sama dipakai router Astro sendiri saat scrollTo(0,0).
         Lenis baru yang lahir saat boot mengadopsi posisi scroll ini.
         Entri tanpa state (hash buatan browser) dibiarkan native. */
      const st = history.state;
      if (st && typeof st.scrollY === 'number') {
        window.scrollTo({ left: st.scrollX || 0, top: st.scrollY, behavior: 'instant' });
      }
    }
    pendingNavType = null;

    /* Re-assert overlay pada node HIDUP saat ini (persist bernama
       harusnya menjaga node lama; jaga-jaga bila node bertukar). */
    const ov = qs('#page-transition');
    if (ov) gsap.set(ov, { visibility: 'visible' });

    requestAnimationFrame(() => {
      const tl = trackEventTween(gsap.timeline({
        onComplete: () => resetOverlayState(),
      }));

      tl.to('.pt-accent', { scaleX: 0, transformOrigin: 'right', duration: 0.2, ease: 'none' })
        .to('.pt-label', { opacity: 0, duration: 0.2 }, 0)
        .to('.pt-panel', { y: '-100%', duration: 0.4, ease: 'power3.inOut' }, 0.1);
    });
  });

  /* M1 lapis 3: preferensi flip normal -> reduce SAAT transisi berjalan.
     Runtime guard hanya melindungi handler yang belum masuk; tween yang
     sudah hidup harus dimatikan dan overlay di-reset ke state aman. */
  reduceMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduceChangeHandler = (event) => {
    if (!event.matches) return;         // hanya saat reduce menjadi aktif
    if (!isTransitioning) return;       // hanya mid-transition
    const ov = qs('#page-transition');
    if (ov) {
      const targets = ov.querySelectorAll('.pt-panel, .pt-accent, .pt-label');
      if (targets.length) gsap.killTweensOf(targets);
    }
    resetOverlayState();
  };
  if (typeof reduceMql.addEventListener === 'function') {
    reduceMql.addEventListener('change', reduceChangeHandler);
  } else if (typeof reduceMql.addListener === 'function') {
    reduceMql.addListener(reduceChangeHandler);   // legacy Safari
  }
}
