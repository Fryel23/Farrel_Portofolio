/*!
 * about.js: PUBLIC PAGE ENTRY facade untuk halaman /about (modularized
 * V11.1-M).
 *
 * Single responsibility: konfigurasi bootPage() halaman About —
 * implementasi hidup di about/renderers.js, about/curiosity-map.js,
 * about/interactions.js, dan about/motion.js. Urutan renders/
 * interactions/motion/cleanups dipertahankan persis dari baseline.
 *
 * Catatan migrasi (dokumentasi V11.1-M):
 * - Deklarasi `credentialDialog`/`credentialDialogTrigger` yang ada di
 *   baseline about.js TIDAK dipindahkan: keduanya dead declarations
 *   (tidak pernah dipakai di about.js; dialog preview credential
 *   dimiliki archive/credentials.js). Dihapus sesuai M11.
 * - Komentar "About constellation draw" dari archive.js baseline
 *   (baris 2864-2870) dipindahkan ke about/motion.js di atas
 *   initSkillConstellation — pemilik dokumentasinya yang sebenarnya.
 */
import { bootPage } from './core.js';
import { renderSoftware, renderSkills, renderJourney, renderAboutNotes } from './about/renderers.js';
import { buildCuriosityMap } from './about/curiosity-map.js';
import { initJourneyExpand, initAboutFieldMarks } from './about/interactions.js';
import {
  initJourneyProgressMotion, initJourneyProgressFallback,
  initArtworkParallax, initSkillConstellation,
  resetJourneyRail, resetJourneyMotionState,
} from './about/motion.js';

/* ======================================================================
 * BOOT HALAMAN ABOUT
 * ==================================================================== */
bootPage({
  renders: [renderSoftware, renderSkills, renderJourney, renderAboutNotes, buildCuriosityMap],
  interactions: [initJourneyExpand, initAboutFieldMarks, initJourneyProgressFallback],
  motion: [initJourneyProgressMotion, initArtworkParallax, initSkillConstellation],
  cleanups: [resetJourneyRail, resetJourneyMotionState],
});
