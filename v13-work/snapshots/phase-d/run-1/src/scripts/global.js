/*!
 * global.js: SITEWIDE ORCHESTRATOR (modularized V11.1-M).
 *
 * Single responsibility: mengatur urutan boot sitewide — bridge
 * window.gsap/ScrollTrigger/Lenis, initEnv, dan konfigurasi bootPage()
 * dengan urutan renders/interactions/motion/cleanups yang telah
 * teruji. Implementasi fitur hidup di modul global/ (M01/M08) —
 * jangan memindahkan logika fitur kembali ke file ini.
 *
 * Urutan boot motion gate (kontrak V11.0 + V11.1, tidak boleh diubah):
 *   1. prepareHeroState()
 *   2. initSectionMotion()
 *   3. animateHeroIn()
 *   4. initCurtain()
 *   5. initHeroWebGL() — non-blocking (void)
 * Dispose Hero WebGL tetap terdaftar pada cleanups motion gate.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './generative-ambient.js';
/* V11.0 FASE 3: kontrak hero baru. prepareHeroState hanya menyiapkan
   dekorasi (TIDAK menyembunyikan konten) dan animateHeroIn hanya
   menganimasikan elemen pendukung - keduanya dipanggil langsung di boot
   gate, tanpa bergantung pada Opening. home.js tidak pernah mengimpor
   global.js sehingga arah dependensi tetap satu arah tanpa siklus.
   Konsekuensi yang disadari: home.js dieksekusi di semua halaman;
   seluruh entri boot-nya ber-guard terhadap ketiadaan elemen hero
   (lihat initHeroButtons di home.js).
   (V11.1-M §11.5: import diarahkan langsung ke home/hero-motion.js
   agar runtime search homepage tidak ikut termuat di entry global.) */
import { prepareHeroState, animateHeroIn } from './home/hero-motion.js';
/* V11.0 FASE 6: controller Curtain Pattern (dekorasi opening).
   Self-guarding: elemen, reduced motion, sesi, late window, duplikat. */
import { initCurtain } from './curtain-controller.js';
/* V11.1: controller Signature Hero WebGL (OGL, dynamic import).
   Dipanggil non-blocking setelah sequence V11.0; self-guarding
   (route, viewport >700px, reduced motion, WebGL API) sehingga
   halaman tanpa markup Canvas adalah no-op tanpa network request.
   disposeHeroWebGL menjadi cleanup matchMedia (revert saat masuk
   reduce / navigasi) - registry core.js tetap backstop after-swap. */
import { initHeroWebGL, disposeHeroWebGL } from './hero-webgl/index.js';
import {
  initEnv, bootPage, initMagneticButtons,
} from './core.js';
/* V10.0 FASE 2: Archive Wipe page transition (overlay transition:persist
   di BaseLayout; guard V9.1 opening + rapid click + pengecualian rute
   /work morphing ada di dalam modulnya). */
import { initPageTransitions } from './page-transitions.js';
/* Feature modules global (modularized V11.1-M). */
import { renderIdentity } from './global/identity.js';
import {
  initMobileMenu, initQuickMenu, initAnchors,
} from './global/navigation.js';
import {
  initPageProgressBar, fallbackReveal, initSmoothScroll,
  initBackTop, initVisibilityPause,
} from './global/scroll.js';
import { buildHeadingTicks, initSectionMotion } from './global/section-motion.js';
import {
  buildAllAmbientDebris, buildV65Ornaments,
  buildArchiveSpines, initArchiveSpine,
} from './global/decorations.js';
import { initNowPlaying } from './global/now-playing.js';
import { initAudioFeedback } from './global/audio-feedback.js';

/* Compatibility exports: consumer lama (connect.js) masih mengimpor
   renderSocials dari './global.js' - named re-export menjaga path
   publik tetap stabil tanpa data sosial kedua (M14). */
export {
  renderContact, SOCIAL_ICONS, socialIconNode, renderSocials,
} from './global/identity.js';

/* Fase 0/2: jembatan kompatibilitas untuk logika V6.7 yang membaca
   window.gsap / window.ScrollTrigger / window.Lenis. */
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.Lenis = Lenis;
initEnv();

/* ======================================================================
 * BOOT GLOBAL (semua halaman)
 * ==================================================================== */
/* V11.0: gerbang hero lama (kontrak callback initArchiveOpening + event
   'fip:start-hero' + window.__FIP_OPENING_ACTIVE) dihapus bersama
   arsitektur Opening modal. Urutan baru di motion gate:
   initSectionMotion -> animateHeroIn (dekorasi) -> initCurtain.
   Ketiganya independen: tidak ada yang menunggu completion entitas
   lain (spek §3.8 - NO DEPENDENCY ON ANIMATION COMPLETION). */

bootPage({
  renders: [
    renderIdentity,
    buildHeadingTicks,
    buildArchiveSpines,
    buildAllAmbientDebris,
    buildV65Ornaments,
    /* V7.4 Fase 3: engine ambient generatif terpasang di level modul
       (sekali per sesi). Setelah ClientRouter mengganti DOM, canvas
       halaman baru harus di-mount ulang; no-op di halaman tanpa canvas. */
    () => { if (window.GenerativeAmbient && typeof window.GenerativeAmbient.remount === 'function') window.GenerativeAmbient.remount(); },
  ],
  /* M1: initPageTransitions pindah ke `motion` (gate inisialisasi):
     di reduce mode boot, init tidak dipanggil sama sekali - tidak ada
     listener preventDefault yang memblokir klik ~0.8s per navigasi.
     Runtime guard + MQL listener di page-transitions.js menutup kasus
     preferensi berubah mid-session. */
  interactions: [initMobileMenu, initQuickMenu, initAnchors, initNowPlaying, initPageProgressBar, fallbackReveal, initMagneticButtons, initAudioFeedback],
  motion: [
    initSmoothScroll,
    initArchiveSpine,
    initBackTop,
    initVisibilityPause,
    () => {
      /* V11.0 FASE 3+6: Hero tidak lagi menunggu Opening.
         1. prepareHeroState: persiapan dekorasi (scanline + state awal
            elemen pendukung) - konten utama tidak pernah disembunyikan.
         2. initSectionMotion: reveal heading per section (ScrollTrigger,
            below-fold) - registrasi langsung di boot.
         3. animateHeroIn: entrance ELEMEN DEKORATIF hero saja (pixel
            frame, tools, sticker, atlas); teks/CTA/search berada pada
            posisi final sejak HTML.
         4. initCurtain: dekorasi opening sekali per sesi; self-guarding
            (reduced motion, sesi, jendela aktivasi ~1s, duplikat) dan
            gagal aman - bila tidak aktif, halaman tetap normal.
         5. V11.1: initHeroWebGL - Signature Hero WebGL, terpisah dan
            NON-BLOCKING (void): tidak menunggu Curtain, tidak membuat
            Curtain menunggu; dua sistem independen (spek V11.1 §17.1).
            Tidak mengubah urutan/hasil empat entri V11.0 di atas. */
      prepareHeroState();
      initSectionMotion();
      animateHeroIn();
      initCurtain();
      void initHeroWebGL();
    },
    /* M1: gate inisialisasi via `motion` (no-preference saja). Posisi
       akhir: overlay siap setelah semua motion halaman terpasang. */
    initPageTransitions,
  ],
  /* V11.1: cleanup saat gsap.matchMedia revert (masuk reduce mid-session
     atau teardown navigasi) - idempoten; before-swap dispose (listener
     module-level controller) tetap jalur utama, registry core.js
     after-swap tetap backstop. */
  cleanups: [disposeHeroWebGL],
});
