/*!
 * work.js: PUBLIC PAGE ENTRY facade untuk /work + homepage grid
 * (modularized V11.1-M).
 *
 * Single responsibility: konfigurasi route-aware bootPage() —
 * implementasi hidup di work/renderers.js, work/filters.js,
 * work/batch-motion.js, work/project-reveal.js, dan work/webgl-hover.js
 * (M01/M08). Discriminator galeri arsip tetap #filter-controls; route
 * lain no-op; homepage TIDAK me-render ulang grid hasil Astro.
 */
import { bootPage, qs } from './core.js';
import { renderFilters, initFilterControls } from './work/filters.js';
import {
  renderProjects, renderGalleryRuler, initGalleryBlueprint,
} from './work/renderers.js';
import { setupProjectBatch, resetBatchTriggers } from './work/batch-motion.js';
import { initProjectImageReveal, resetProjectReveal } from './work/project-reveal.js';
import { initWebGLHover } from './work/webgl-hover.js';

/* ======================================================================
 * BOOT HALAMAN WORK
 * ====================================================================
 * V10.2 B.3: konfigurasi route-aware. Discriminator galeri arsip adalah
 * #filter-controls (hanya ada di /work, tidak ada di homepage).
 * - /work: render penuh (filter + kartu + ruler), interaksi penuh,
 *   motion penuh (reveal + WebGL + batch).
 * - Homepage: HANYA hover reveal + entrance batch. renderProjects TIDAK
 *   dijalankan agar markup kartu hasil render Astro (termasuk atribut
 *   transition:name) tidak diganti ulang dari DATA.projects.
 * - Route lain (about, connect, dst): no-op sama sekali.
 * Fungsi individu tidak diubah; hanya logika dispatch-nya. */
function getWorkConfig() {
  const isWorkGallery = !!qs('#filter-controls');
  if (isWorkGallery) {
    return {
      renders: [renderFilters, renderProjects, renderGalleryRuler],
      interactions: [initFilterControls, initGalleryBlueprint],
      motion: [initProjectImageReveal, initWebGLHover, setupProjectBatch],
      cleanups: [resetProjectReveal, resetBatchTriggers],
    };
  }
  // Homepage or other routes: preserve hover reveal + entrance, skip gallery renders
  const hasProjectGrid = !!qs('#project-grid');
  if (!hasProjectGrid) {
    // No project grid at all: no-op
    return { renders: [], interactions: [], motion: [], cleanups: [] };
  }
  return {
    renders: [],
    interactions: [],
    motion: [initProjectImageReveal, setupProjectBatch],
    cleanups: [resetProjectReveal, resetBatchTriggers],
  };
}

bootPage({ resolve: getWorkConfig });
