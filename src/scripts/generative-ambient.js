/*!
 * generative-ambient.js: V6.5 Scientific Archive · Generative Ambient Engine
 * -------------------------------------------------------------------------
 * Purpose (V6.5 spec, Fase 3 + 5):
 *   Fill desktop negative space with precise "scientific instrument"
 *   geometry drawn on Canvas 2D. Three effects are mounted from static
 *   <canvas class="ambient-canvas" data-effect="..."> elements:
 *
 *     isometric-grid  · Off-screen section  · data grid + fading scanline
 *     orbital         · Companion section   · 2x2px particles on ellipses
 *     constellation   · Social section      · nodes + lines, cursor-aware
 *
 * Hard rules honoured here:
 *   - No external libraries. Pure Canvas 2D, no WebGL.
 *   - Early return on (prefers-reduced-motion: reduce) or (max-width: 900px).
 *     Both are also watched at runtime: flipping either mid-session stops
 *     and tears the engine down.
 *   - Exactly ONE central requestAnimationFrame loop. Every canvas shares
 *     it; canvases only tick while they are actually in view
 *     (IntersectionObserver) and the whole loop stops when the tab is
 *     hidden (visibilitychange) or when no canvas is visible.
 *   - Every tick starts with clearRect: no incremental buildup, no leaks.
 *   - Canvases are decorative: aria-hidden, pointer-events: none. Pointer
 *     interaction (orbital slow-down, constellation highlight) is captured
 *     on the parent <section>, never on the canvas itself.
 *
 * Adding a new effect:
 *   1. Drop <canvas class="ambient-canvas" data-effect="my-effect"> into
 *      a position: relative section.
 *   2. Write a factory myEffect(canvas) returning
 *      { tick(dt), resize(), destroy() }.
 *   3. Register it in mountCanvases() below.
 * -------------------------------------------------------------------------
 */
/* Effect factories (modularized V11.1-M): dipisah dari engine.
   Engine tetap SATU owner RAF loop, active canvas set, visibility
   pause, observer bersama, environment MQL, dan mount/remount/
   teardown. Factory hanya menggambar; kontrak { tick, resize,
   destroy() } diterima engine. */
import { mountIsometricGrid } from './generative-ambient/effects/isometric-grid.js';
import { mountOrbital } from './generative-ambient/effects/orbital.js';
import { mountConstellation } from './generative-ambient/effects/constellation.js';
(function initGenerativeAmbient() {
  'use strict';

  const doc = document;

  /* V6.5 §5.3: mobile and reduced-motion never run the engine. */
  const reduceMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMql = window.matchMedia('(max-width: 900px)');
  if (reduceMql.matches || mobileMql.matches) return;

  /* Canvas 2D capability probe (defensive: every target browser has it). */
  const probe = doc.createElement('canvas');
  if (!probe.getContext || !probe.getContext('2d')) return;

  /* ======================================================================
   * Central loop: one rAF for every active canvas
   * ==================================================================== */
  const activeCanvases = new Set();
  let rafId = null;
  let lastTime = 0;

  function loop(time) {
    rafId = null;
    if (!activeCanvases.size) return;
    /* Clamp dt so a background-tab pause cannot teleport the scanline
       or fling the particles on return. */
    const dt = Math.min(Math.max(time - lastTime, 0), 50);
    lastTime = time;
    activeCanvases.forEach((instance) => instance.tick(dt));
    rafId = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId || doc.hidden || !activeCanvases.size) return;
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* V6.5 §5.4: nothing may run while the document is hidden. */
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) stopLoop();
    else startLoop();
  });

  /* ======================================================================
   * Shared helpers
   * ==================================================================== */
  const FALLBACK_COLORS = {
    soft: '#93C5FD',
    blue: '#2563EB',
    deep: '#1E3A8A',
    ink: '#0F172A'
  };

  function readColors() {
    const rootStyle = window.getComputedStyle(doc.documentElement);
    function pick(name, fallback) {
      const value = String(rootStyle.getPropertyValue(name) || '').trim();
      return value || fallback;
    }
    return {
      soft: pick('--blue-soft', FALLBACK_COLORS.soft),
      blue: pick('--blue', FALLBACK_COLORS.blue),
      deep: pick('--blue-deep', FALLBACK_COLORS.deep),
      ink: pick('--ink', FALLBACK_COLORS.ink)
    };
  }

  const COLORS = readColors();

  const instances = [];
  let visibility = null;

  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: width, height: height };
  }

  /* Shared pointer tracker: listens on the parent section (the canvas
     itself keeps pointer-events: none). pointer = null means "away". */
  function trackSectionPointer(section, state) {
    if (!section) return;
    section.addEventListener('pointermove', (event) => {
      const rect = section.getBoundingClientRect();
      state.x = event.clientX - rect.left;
      state.y = event.clientY - rect.top;
      state.inside = true;
    });
    section.addEventListener('pointerleave', () => {
      state.inside = false;
      state.x = -9999;
      state.y = -9999;
    });
  }

  function registerInstance(canvas, instance) {
    canvas.__ambientInstance = instance;
    instances.push(instance);
    instance.resize();
    visibility.observe(canvas);
  }

  /* One resize handler for every mounted canvas (debounced with a timer,
     NOT a second rAF: the spec allows only the central loop). */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      instances.forEach((instance) => instance.resize());
    }, 120);
  });

  /* V6.5 §5.3 runtime watch: if the user flips to reduced motion or the
     window drops under 900px mid-session, stop and tear everything down. */
  function teardown() {
    stopLoop();
    activeCanvases.clear();
    instances.forEach((instance) => {
      if (instance.destroy) instance.destroy();
    });
    /* V7.4: daftar instance dikosongkan agar resize handler tidak
       menyentuh instance mati (destroy mematikan ctx internalnya). */
    instances.length = 0;
    if (visibility) visibility.disconnect();
    visibility = null;
    if (resizeTimer) window.clearTimeout(resizeTimer);
  }
  function onEnvironmentChange() {
    if (reduceMql.matches || mobileMql.matches) teardown();
  }
  if (typeof mobileMql.addEventListener === 'function') {
    mobileMql.addEventListener('change', onEnvironmentChange);
    reduceMql.addEventListener('change', onEnvironmentChange);
  } else if (typeof mobileMql.addListener === 'function') {
    mobileMql.addListener(onEnvironmentChange);
    reduceMql.addListener(onEnvironmentChange);
  }


  /* --- Effect factories 1-3 (isometric-grid, orbital, constellation)
     dipindah ke generative-ambient/effects/*.js (V11.1-M §14).
     Dependency engine bersama (doc, COLORS, fitCanvas,
     trackSectionPointer) diberikan via parameter env; TIDAK ada RAF
     atau observer baru per effect. --- */
  const envDeps = { doc: doc, COLORS: COLORS, fitCanvas: fitCanvas, trackSectionPointer: trackSectionPointer };
  /* ======================================================================
   * Registration (V6.5 §5.1) + per-canvas IntersectionObserver (§5.2)
   * ==================================================================== */
  /* V7.4 Fase 3: observer dibuat lewat factory. Teardown navigasi
     (ClientRouter) memutus observer lama; mountCanvases() berikutnya
     membuat observer baru untuk canvas halaman yang baru. */
  function ensureObserver() {
    if (visibility) return;
    visibility = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const instance = entry.target.__ambientInstance;
        if (!instance) return;
        if (entry.isIntersecting) {
          instance.resize(); // re-fit in case the layout shifted
          activeCanvases.add(instance);
          startLoop();
        } else {
          activeCanvases.delete(instance);
          if (!activeCanvases.size) stopLoop();
        }
      });
    }, { threshold: 0.04, rootMargin: '60px 0px' });
  }

  function mountCanvases() {
    ensureObserver();
    const canvases = doc.querySelectorAll('canvas.ambient-canvas');
    Array.prototype.forEach.call(canvases, (el) => {
      const effect = el.dataset.effect;
      if (effect === 'isometric-grid') registerInstance(el, mountIsometricGrid(el, envDeps));
      else if (effect === 'orbital') registerInstance(el, mountOrbital(el, envDeps));
      else if (effect === 'constellation') registerInstance(el, mountConstellation(el, envDeps));
    });
  }

  mountCanvases();

  /* Public handle (V6.5 §3.1): the loop and the live set are exposed so
     future features can integrate without owning a second rAF loop.
     V7.4 Fase 3: remount() dipanggil global.js pada setiap
     astro:page-load: canvas halaman yang baru di-mount lagi setelah
     ClientRouter mengganti DOM (no-op saat reduce/mobile atau saat
     halaman tak punya canvas ambient). */
  window.GenerativeAmbient = {
    activeCanvases: activeCanvases,
    startLoop: startLoop,
    stopLoop: stopLoop,
    remount: function () {
      if (reduceMql.matches || mobileMql.matches) return;
      teardown(); // hentikan loop, destroy instance lama (canvas lama)
      mountCanvases();
    }
  };
})();
