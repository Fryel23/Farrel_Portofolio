/*!
 * core/page-lifecycle.js: application page lifecycle (modularized
 * V11.1-M).
 *
 * Single responsibility: bootPage() (pola boot V6.3: renders ->
 * registrasi plugin -> interaksi -> gsap.matchMedia lifecycle), nav
 * epoch + latch, motionContexts, teardownPageMotion() pada
 * astro:after-swap, forceContentVisible + REDUCED_REVEAL_SELECTOR.
 * Core tetap menjadi pemilik lifecycle aplikasi; bootPage TIDAK
 * dipindahkan ke entry global.
 */
import { doc, } from './dom.js';
import { hasGSAP, hasScrollTrigger } from './environment.js';
import { cleanupMotionRegistry } from './motion-registry.js';

export const REDUCED_REVEAL_SELECTOR = [
  '.eyebrow', '.hero-tail', '.hero-description', '.hero-note', '.scroll-cue',
  '.hero-actions > *', '#pixel-frame', '.floating-tool', '.hero-sticker',
  '#hero-title .line', '.atlas-path', '.atlas-node', '.atlas-cross',
  '.atlas-label', '.atlas-tick', '.display-heading .line', '.curiosity-heading .line',
  '.about-lead', '.about-body', '.software-chip', '.skill-chip',
  '.journey-item', '.resume-card', '.social-card', '.credential-card',
  '.credential-slot', '.contact-heading', '.contact-card', '.contact-note',
  '.curiosity-node', '.curiosity-panel', '.curiosity-intro', '.motto-word',
  '.deck-console', '.offscreen-layout > *', '.github-grid', '.github-fallback',
  '.github-note', '.companion-inner > *', '.project-card', '.github-card',
  '.closing-solid .line', '.closing-outline .line', '.closing-outline-fill'
].join(', ');

/* V10.2 D: setiap gsap.set di-guard dengan gsap.utils.toArray().length
   agar halaman tanpa target tertentu (mis. /work tidak punya
   .atlas-path atau #journey-rail-fill) tidak mencetak warning
   "GSAP target ... not found" di reduce mode. Warning hanyalah
   console.warn sehingga try/catch tidak menangkapnya; guard length
   adalah satu-satunya cara yang benar: lewati operasi saat kosong.
   Urutan operasi, REDUCED_REVEAL_SELECTOR, dan try/catch (jaring
   pengaman untuk partial lists) semuanya dipertahankan. */
export function forceContentVisible() {
  if (doc.body.classList.contains('is-glitching')) doc.body.classList.remove('is-glitching');
  if (hasGSAP) {
    const revealTargets = gsap.utils.toArray(REDUCED_REVEAL_SELECTOR);
    if (revealTargets.length) {
      try { gsap.set(revealTargets, { clearProps: 'all' }); } catch (error) { /* partial lists are fine */ }
    }
    const atlasTargets = gsap.utils.toArray('.atlas-path');
    if (atlasTargets.length) {
      try { gsap.set(atlasTargets, { strokeDasharray: 'none', strokeDashoffset: 0 }); } catch (error) { /* noop */ }
    }
    const journeyRailTargets = gsap.utils.toArray('#journey-rail-fill');
    if (journeyRailTargets.length) {
      try { gsap.set(journeyRailTargets, { scaleY: 1 }); } catch (error) { /* noop */ }
    }
    const closingFillTargets = gsap.utils.toArray('.closing-outline-fill');
    if (closingFillTargets.length) {
      try { gsap.set(closingFillTargets, { clipPath: 'inset(0 0% 0 0)' }); } catch (error) { /* noop */ }
    }
    const projectCoverTargets = gsap.utils.toArray('.project-cover-inner');
    if (projectCoverTargets.length) {
      try { gsap.set(projectCoverTargets, { clearProps: 'clipPath' }); } catch (error) { /* noop */ }
    }
  }
}

/* ======================================================================
 * V7.4 FASE 3: SIKLUS HIDUP JAVASCRIPT UNTUK CLIENTROUTER
 * ======================================================================
 * Dengan <ClientRouter /> (BaseLayout), halaman tidak di-reload penuh:
 * DOM diganti lewat swap dan event DOMContentLoaded hanya berjalan
 * SEKALI di awal sesi. Kunci siklus hidup yang baru adalah event
 * 'astro:page-load' yang dipicu Astro pada load awal DAN setiap kali
 * halaman baru selesai dimuat lewat navigasi client-side.
 *
 * Alur per navigasi (urutan dijamin router Astro):
 *   1. astro:before-swap  -> DOM halaman lama masih ada.
 *   2. swap()             -> DOM diganti; script lama tidak dieksekusi ulang.
 *   3. astro:after-swap   -> TEARDOWN: semua motion halaman lama dimatikan
 *                            (konteks matchMedia di-revert, registry
 *                            dibersihkan, ScrollTrigger dibunuh, Lenis
 *                            dihancurkan, timeline global disapu).
 *   4. runScripts         -> modul halaman yang BELUM pernah dieksekusi
 *                            dijalankan (mendaftar bootPage miliknya).
 *   5. astro:page-load    -> SETIAP bootPage menjalankan run() sekali
 *                            untuk epoch navigasi ini.
 *
 * navEpoch naik satu di astro:after-swap. Setiap pemanggil bootPage
 * memegang latch sendiri sehingga boot tepat satu kali per epoch,
 * tanpa boot ganda pada load awal (DOMContentLoaded + window load).
 * ==================================================================== */
let navEpoch = 0;

/* Semua konteks gsap.matchMedia() yang masih hidup. Satu halaman bisa
   punya beberapa pemanggil bootPage (global + skrip halaman), jadi
   konteks dikumpulkan di sini dan di-revert semua saat teardown. */
const motionContexts = new Set();

/* Dipanggil tepat setelah DOM halaman lama diganti (astro:after-swap).
   Semua yang menunjuk DOM lama mati di sini, sebelum halaman baru boot. */
function teardownPageMotion() {
  if (hasGSAP) {
    /* 1. Revert seluruh konteks gsap.matchMedia(): tween/ScrollTrigger
          milik konteks dikembalikan, fungsi cleanup halaman dijalankan. */
    motionContexts.forEach((context) => {
      try { context.revert(); } catch (error) { /* konteks sudah mati */ }
    });
    motionContexts.clear();
    /* 2. Registry: listener/timer/interval/observer/tween terlacak,
          ticker callbacks, lalu Lenis dihancurkan. */
    cleanupMotionRegistry();
    /* 3. Jaring pengaman: sisa ScrollTrigger apa pun (dibuat handler
          asinkron di luar konteks) ikut dibunuh. */
    if (hasScrollTrigger) {
      try { window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); } catch (error) { /* noop */ }
    }
    /* 4. Sapu timeline global: tween & delayedCall nyasar dari halaman
          lama (di luar konteks maupun registry) mati semua. Aman karena
          boot halaman baru belum berjalan. */
    try { window.gsap.globalTimeline.clear(); } catch (error) { /* noop */ }
  }
}

doc.addEventListener('astro:after-swap', () => {
  navEpoch += 1;
  teardownPageMotion();
});

/* ======================================================================
 * BOOT PER HALAMAN (pola boot V6.3: renders -> registrasi -> interaksi
 * -> gsap.matchMedia lifecycle). Setiap halaman Astro memanggil
 * bootPage dengan daftar fungsi miliknya; urutan dan semantik
 * (revert otomatis + cleanup registry) identik dengan boot() lama.
 * V7.4: boot kini berjalan pada 'astro:page-load' untuk setiap muatan
 * halaman (awal maupun navigasi client-side), tidak lagi hanya
 * bergantung pada DOMContentLoaded. Opsi `resolve` memungkinkan satu
 * modul melayani beberapa halaman (mis. archive.js) dengan konfigurasi
 * yang dibaca ulang setiap astro:page-load.
 * ==================================================================== */
export let pluginsRegistered = false;

export function bootPage({ renders = [], interactions = [], motion = [], cleanups = [], resolve = null } = {}) {
  /* Latch per pemanggil: satu boot per epoch navigasi. */
  let bootedEpoch = -1;

  const run = (config = {}) => {
    const {
      renders: pageRenders = [],
      interactions: pageInteractions = [],
      motion: pageMotion = [],
      cleanups: pageCleanups = []
    } = config;

    // 1. Render data-driven dulu; tidak ada tween/ScrollTrigger di sini.
    pageRenders.forEach((fn) => fn());

    // 2. Registrasi plugin + lag smoothing sekali, sebelum trigger dibuat.
    if (hasGSAP && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.ticker.lagSmoothing(0);
      pluginsRegistered = true;
    }

    // 3. Interaksi (Category B): aktif di bawah reduced motion juga.
    pageInteractions.forEach((fn) => fn());

    // 4. Siklus motion: gsap.matchMedia() memiliki saklar dua arah.
    //    V7.4: konteks dikumpulkan agar teardown navigasi me-revert
    //    SEMUA konteks halaman (global + per halaman).
    if (hasGSAP) {
      const motionMedia = window.gsap.matchMedia();
      motionContexts.add(motionMedia);
      motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
        pageMotion.forEach((fn) => fn());
        return () => { pageCleanups.forEach((fn) => fn()); };
      });
      motionMedia.add('(prefers-reduced-motion: reduce)', () => {
        // Konten terlihat; blok CSS prefers-reduced-motion merender
        // semua status akhir. Pass ini hanya membersihkan sisa.
        forceContentVisible();
        return () => {};
      });
    }

    /* V7.4 (spek Fase 3): refresh di akhir inisialisasi agar posisi
       trigger dihitung ulang terhadap tinggi halaman yang baru. */
    if (hasScrollTrigger) {
      try { window.ScrollTrigger.refresh(); } catch (error) { /* noop */ }
    }
  };

  const boot = () => {
    if (bootedEpoch === navEpoch) return; // sudah boot untuk muat halaman ini
    bootedEpoch = navEpoch;
    const config = resolve ? resolve() : { renders, interactions, motion, cleanups };
    run(config || {});
  };

  /* astro:page-load: dipicu Astro pada load awal (window load) DAN
     setelah setiap navigasi client-side selesai (DOM baru + script baru
     siap). Modul yang baru dieksekusi saat navigasi selalu mendaftar
     sebelum event ini, karena router menunggu eksekusi script selesai
     sebelum memicu astro:page-load. */
  doc.addEventListener('astro:page-load', boot);

  /* Load awal (hard reload): boot langsung saat modul dieksekusi
     (perilaku lama dipertahankan) agar animasi entrance tidak menunggu
     window load. astro:page-load yang menyusul membawa epoch yang sama,
     jadi latch mencegah boot ganda. Navigasi client-side (navEpoch > 0)
     tidak boot di sini: astro:page-load-lah yang memicunya. */
  if (navEpoch === 0) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
}
