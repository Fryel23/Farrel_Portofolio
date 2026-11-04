/*!
 * hero-webgl/index.js (V11.1 STAGE 5-12, modularized V11.1-M):
 * PUBLIC LIFECYCLE ENTRY — thin orchestrator.
 *
 * Single responsibility: menyediakan API publik `initHeroWebGL()` /
 * `disposeHeroWebGL()`, mengelola singleton instance aktif per halaman
 * (spek §22.1), dan mengikat listener `astro:before-swap` satu kali.
 * Pembuatan instance didelegasikan ke controller.js; resource GPU ke
 * scene.js; geometri ke geometry.js; shader ke shaders.js.
 *
 * Implementasi tidak lagi hidup di file ini (M01/M08) — jangan
 * meletakkan shader, geometry arrays, atau lifecycle controller kembali
 * di sini.
 */
import { createHeroInstance } from './controller.js';

/* Satu instance aktif per halaman (spek §22.1). */
let active = null;
let beforeSwapBound = false;

export function initHeroWebGL() {
  /* Duplikat: jangan pernah buat instance kedua (spek §17.2, §22.1).
     Instance yang sudah final-dispose (disposed=true) tidak dihitung. */
  if (active && !active.disposed) return active.dispose;
  active = null; // bersihkan referensi instance yang sudah final

  const wrapper = document.getElementById('hero-canvas-wrapper');
  const canvas = document.getElementById('webgl-canvas');

  /* Route guard (spek §17.4): halaman tanpa markup Canvas -> no-op
     murni, TANPA dynamic import OGL. */
  if (!wrapper || !canvas) return () => {};

  const instance = createHeroInstance(wrapper, canvas);
  active = instance;

  /* Lifecycle Astro (spek §16.3): dispose pada BEFORE-swap, DOM lama
     masih tersedia. Satu listener module-level untuk selamanya. */
  if (!beforeSwapBound) {
    beforeSwapBound = true;
    document.addEventListener('astro:before-swap', () => {
      if (active) active.cancel();
    });
  }

  instance.begin();
  return instance.dispose;
}

/* Cleanup untuk gsap.matchMedia revert (global.js cleanups) -
   idempoten, aman dipanggil dua kali. */
export function disposeHeroWebGL() {
  if (active) active.cancel();
}
