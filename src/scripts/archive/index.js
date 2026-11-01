/*!
 * archive/index.js: route map + boot untuk empat halaman arsip
 * (modularized V11.1-M).
 *
 * Single responsibility: menyatukan feature modules ke konfigurasi
 * bootPage() per data-page (archive-index, archive-play,
 * archive-credentials, archive-off-screen). Urutan renders,
 * interactions, motion, cleanups dipertahankan persis dari baseline;
 * hanya ada SATU bootPage untuk seluruh route arsip.
 */
import { bootPage, doc } from '../core.js';
import {
  renderGithubCopy, initGitHubActivity, initGithubPulse, initGitHubTooltips,
} from './github.js';
import {
  renderDeckCopy, renderGameDeck, initGameDeck, initGameStatBars,
  resetGameStatBars, runDeckReduceCleanup,
} from './game-deck/index.js';
import { initKonami } from './konami.js';
import { initV4Motion } from './motion.js';
import {
  renderCredentials, initCredentialDialog, initCredentialFrame,
  initCredentialRequirements,
} from './credentials.js';
import {
  renderOffscreenCopy, initOffscreenPet, initHobbyReactions,
  initHobbyStatusLog, initDeskHabitatDust, resetOffscreenPet,
  resetDeskHabitatDust,
} from './off-screen.js';
import { renderCompanionCopy, initCompanionHabitat, initCompanion } from './companion.js';

/* ======================================================================
 * BOOT HALAMAN ARSIP (dipilih halaman lewat window.__FIP_PAGE)
 * ==================================================================== */
const PAGE_BOOT = {
  'archive-index': {
    renders: [renderGithubCopy],
    interactions: [initGitHubActivity, initGitHubTooltips],
    motion: [initGithubPulse, initV4Motion],
    cleanups: [],
  },
  'archive-play': {
    renders: [renderDeckCopy, renderGameDeck],
    interactions: [initGameDeck, initKonami],
    motion: [initGameStatBars, initV4Motion],
    cleanups: [resetGameStatBars, runDeckReduceCleanup],
  },
  'archive-credentials': {
    renders: [renderCredentials],
    interactions: [initCredentialDialog, initCredentialFrame, initCredentialRequirements],
    motion: [initV4Motion],
    cleanups: [],
  },
  'archive-off-screen': {
    renders: [renderOffscreenCopy, renderCompanionCopy],
    interactions: [initCompanionHabitat, initCompanion, initHobbyReactions, initHobbyStatusLog],
    motion: [initDeskHabitatDust, initOffscreenPet, initV4Motion],
    cleanups: [resetOffscreenPet, resetDeskHabitatDust],
  },
};

/* V7.4: kunci halaman (data-page) dibaca ulang pada SETIAP
   astro:page-load lewat opsi resolve. Modul ini hanya dieksekusi sekali
   per sesi browser, tetapi kini satu bootPage melayani empat halaman
   arsip (hub, play, credentials, off-screen) bahkan saat berpindah
   lewat navigasi client-side. */
bootPage({
  resolve: () => PAGE_BOOT[doc.documentElement.dataset.page || ''] || null,
});
