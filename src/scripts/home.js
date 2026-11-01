/*!
 * home.js: PUBLIC PAGE ENTRY facade untuk halaman "/" (modularized
 * V11.1-M).
 *
 * Single responsibility: menjaga path import publik
 * `src/scripts/home.js` tetap stabil bagi index.astro dan global.js
 * (M14 safe migration) sambil implementasi hidup di home/archive-
 * search.js, home/hero-motion.js, dan home/hero-interactions.js.
 * File ini HANYA mengimpor modul fitur dan mendaftarkan SATU
 * konfigurasi bootPage() — submodule tidak pernah memanggil
 * bootPage() sendiri.
 *
 * Urutan renders/interactions/motion/cleanups dipertahankan persis
 * dari baseline; prepareHeroState & animateHeroIn tetap dipanggil
 * dari boot gate global.js (bukan dari sini).
 */
import { bootPage } from './core.js';
/* V11.1-M §11.5: global.js kini mengimpor Hero motion langsung dari
   modulnya (lihat home/hero-motion.js); facade ini tetap mengekspor
   ulang kedua fungsi untuk kompatibilitas kontrak lama. */
export { prepareHeroState, animateHeroIn } from './home/hero-motion.js';
import { initGlobalArchiveSearch } from './home/archive-search.js';
import {
  buildHeroDust, initPointerParallax, resetAtlasAmbient,
} from './home/hero-motion.js';
import { initHeroButtons, initSearchPulse } from './home/hero-interactions.js';

/* ======================================================================
 * BOOT HALAMAN HOME
 * ==================================================================== */
bootPage({
  renders: [buildHeroDust],
  interactions: [initGlobalArchiveSearch, initSearchPulse],
  motion: [
    initPointerParallax,
    initHeroButtons,
    /* V11.0: entri hero-boot lama dihapus. animateHeroIn kini dipanggil
       dari boot gate global.js (dekorasi, tanpa menunggu Opening);
       prepareHeroState tetap diekspor untuk kontrak yang sama. */
  ],
  cleanups: [resetAtlasAmbient],
});
