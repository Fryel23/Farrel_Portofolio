/*!
 * hero-webgl/controller.js: single-instance lifecycle controller for the
 * Signature Hero WebGL (V11.1 STAGE 5-12, modularized V11.1-M).
 *
 * Single responsibility (M01): SATU owner untuk lifecycle satu instance
 * - guard & state machine, scheduling dynamic import (race-token),
 *   pembuatan scene via scene.js, satu RAF loop, ResizeObserver +
 *   fallback resize, IntersectionObserver, pointer parallax, visibility,
 *   MQL listeners, context-loss handling, fallback visibility, registry
 *   references, dan dispose idempoten (temporary vs final).
 *
 * Kontrak kunci:
 *  - WebGL adalah ENHANCEMENT, bukan dependency Hero (spek §0): fallback
 *    SVG hidup sejak initial HTML; canvas baru tampil setelah frame
 *    valid pertama berhasil dirender (`.is-webgl-ready`).
 *  - OGL HANYA dimuat via dynamic import SETELAH seluruh guard lolos
 *    (viewport >700px, no reduced-motion, elemen isConnected, halaman
 *    masih aktif, API WebGL tersedia) (spek §3.4-§3.6, §9.4).
 *  - Tidak ada OGL request pada mobile / reduced motion / route
 *    non-home (route lain: wrapper tidak ada -> no-op murni §17.4).
 *  - Race dynamic import (spek §16.5): hasil import yang resolve
 *    terlambat tidak pernah membuat context - token per-instance
 *    (`cancelled`) + state machine diperiksa ulang setelah setiap await.
 *  - Dispose pada `astro:before-swap` ditangani entry publik
 *    (index.js); `cleanupMotionRegistry()` (core.js, astro:after-swap)
 *    tetap menjadi backstop. Semua stop/dispose idempoten
 *    (spek §16.2-§16.4).
 *  - Registry existing dipakai apa adanya: `trackRafLoop()` +
 *    `trackWebGLContext()` dari core.js (kapitalisasi resmi), TANPA
 *    membuat registry kedua (spek §1.5, §16.2). Reference registry
 *    dilepas saat dispose manual agar Set tidak menahan closure.
 *  - Context loss: fallback-only strategy - RAF berhenti, fallback
 *    tampil, tanpa retry tanpa batas, tanpa `preventDefault()` (spek
 *    §16.7). `WEBGL_lose_context.loseContext()` hanya pada dispose
 *    final keluar-homepage, tepat satu kali (spek §16.6).
 *  - Independen dari Curtain V11.0: tidak ada komunikasi, tidak ada
 *    penungguan, tidak ada perubahan Curtain (spek §1.4, §14.4).
 */
import {
  isReducedMotion,
  trackMotionListener,
  trackRafLoop,
  trackWebGLContext,
  motionRegistry,
} from '../core.js';
import { createHeroScene } from './scene.js';

/* Breakpoint konsisten dengan CSS Hero (home.css max-width: 700px):
   WebGL hanya aktif LEBIH dari 700px (spek §3.4: min-width 701px). */
const DESKTOP_MQ = '(min-width: 701px)';
const REDUCED_MQ = '(prefers-reduced-motion: reduce)';

/* --------------------------------------------------------------------
 * INSTANCE CONTROLLER (spek §16.1 - single owner principle).
 * ------------------------------------------------------------------ */
export function createHeroInstance(wrapper, canvas) {
  const instance = {
    /* Lifecycle token: true = halaman/scope sudah tidak valid. */
    cancelled: false,
    disposed: false,        // dispose final sudah berjalan
    state: 'idle',          // idle | waiting | loading | ready
    contextReleased: false,

    /* Scene API (owner resource GPU: renderer/camera/mesh/program). */
    sceneApi: null,

    /* Loop & observers. */
    rafId: 0,
    running: false,
    ioVisible: true,
    docVisible: document.visibilityState !== 'hidden',
    resizeObserver: null,
    resizeFallback: null,
    intersectionObserver: null,
    lastWidth: 0,
    lastHeight: 0,

    /* Parallax state (objek reuse - tanpa alokasi per frame §14.2). */
    finePointer: false,
    target: { rx: 0, ry: 0, px: 0, py: 0 },
    current: { rx: 0, ry: 0, px: 0, py: 0 },

    /* Pending schedules. */
    idleHandle: 0,
    rafChain: 0,

    /* Registry references (dilepas saat dispose manual §16.2). */
    rafStopRef: null,
    disposeRef: null,

    /* MQL + handlers. */
    mqDesktop: null,
    mqReduced: null,
    mqDesktopHandler: null,
    mqReducedHandler: null,
    contextLostHandler: null,
    pointerMoveHandler: null,
    pointerLeaveHandler: null,
    visibilityHandler: null,
  };

  const setState = (state) => {
    instance.state = state;
    try {
      wrapper.dataset.webglState =
        state === 'ready' ? 'ready' :
        state === 'loading' ? 'loading' :
        state === 'waiting' ? 'waiting' : 'fallback';
    } catch (error) { /* dataset tidak kritikal */ }
  };

  const showFallback = () => {
    wrapper.classList.remove('is-webgl-ready');
    setState('fallback');
  };

  const cancelSchedules = () => {
    if (instance.rafChain) {
      cancelAnimationFrame(instance.rafChain);
      instance.rafChain = 0;
    }
    if (instance.idleHandle) {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(instance.idleHandle);
      else clearTimeout(instance.idleHandle);
      instance.idleHandle = 0;
    }
  };

  /* --- Scheduling (spek §9.5): 2x rAF lalu requestIdleCallback
         dengan timeout; semua bisa dibatalkan. --- */
  const scheduleLoad = () => {
    instance.rafChain = requestAnimationFrame(() => {
      instance.rafChain = requestAnimationFrame(() => {
        instance.rafChain = 0;
        if (instance.cancelled || instance.disposed || instance.state !== 'waiting') return;
        const fire = () => {
          instance.idleHandle = 0;
          if (instance.cancelled || instance.disposed || instance.state !== 'waiting') return;
          setState('loading');
          loadOGL();
        };
        if (typeof window.requestIdleCallback === 'function') {
          instance.idleHandle = window.requestIdleCallback(fire, { timeout: 1200 });
        } else {
          instance.idleHandle = setTimeout(fire, 300);
        }
      });
    });
  };

  /* --- Dynamic import OGL (spek §3.6): HANYA setelah guards. --- */
  const loadOGL = async () => {
    try {
      const OGL = await import('ogl');
      /* Re-check SEMUA guard setelah await (spek §9.4 langkah 10):
         race dynamic import - hasil terlambat tidak boleh membuat
         context (spek §16.5). */
      if (instance.cancelled || instance.disposed) return;
      if (!canvas.isConnected || !wrapper.isConnected) return;
      if (!instance.mqDesktop.matches || isReducedMotion()) return;
      /* State berubah (mis. temporary dispose saat import pending)?
         Jangan bangun scene dari sisa import lama. */
      if (instance.state !== 'loading') return;
      buildScene(OGL);
    } catch (error) {
      if (instance.cancelled || instance.disposed) return;
      failSafe('ogl load failed: ' + (error && error.message ? error.message : error));
    }
  };

  /* --- Ukuran (spek §10.3): ukur wrapper, bukan window. --- */
  const measureWrapper = () => {
    const rect = wrapper.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  };

  const applySize = () => {
    if (!instance.sceneApi || instance.disposed || instance.cancelled) return;
    const { w, h } = measureWrapper();
    if (w <= 0 || h <= 0) return; // zero-size guard (spek §15.4)
    if (w === instance.lastWidth && h === instance.lastHeight) return;
    instance.lastWidth = w;
    instance.lastHeight = h;
    instance.sceneApi.resize(w, h);
  };

  /* --- Build scene setelah OGL dimuat & guard lolos ulang. Resource
         GPU dimiliki scene.js; controller tetap owner state ready. --- */
  const buildScene = (OGL) => {
    instance.sceneApi = createHeroScene({
      canvas,
      wrapper,
      OGL,
      onFail: failSafe,
    });
    if (!instance.sceneApi) return; // failSafe sudah dijalankan scene

    /* Frame valid sudah dirender scene: baru tampilkan canvas (spek §8.4). */
    setState('ready');
    wrapper.classList.add('is-webgl-ready');

    startLoop();
  };

  /* --- RAF loop tunggal (spek §15.1): Vessel + particles. --- */
  const tick = (t) => {
    if (!instance.running) return;
    const seconds = t * 0.001;
    const c = instance.current;
    const tg = instance.target;
    /* Lerp smoothing; tanpa alokasi objek baru (spek §14.2). */
    c.rx += (tg.rx - c.rx) * 0.08;
    c.ry += (tg.ry - c.ry) * 0.08;
    c.px += (tg.px - c.px) * 0.06;
    c.py += (tg.py - c.py) * 0.06;

    try {
      instance.sceneApi.frame(seconds, c);
    } catch (error) {
      instance.running = false;
      failSafe('render loop error: ' + (error && error.message ? error.message : error));
      return;
    }
    instance.rafId = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (instance.running || instance.disposed || instance.cancelled) return;
    if (!instance.ioVisible || !instance.docVisible) return;
    if (instance.state !== 'ready') return;
    instance.running = true;
    instance.rafId = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    instance.running = false;
    if (instance.rafId) {
      cancelAnimationFrame(instance.rafId);
      instance.rafId = 0;
    }
  };

  /* Stop function untuk registry (idempoten - spek §16.4). */
  const rafStop = () => { stopLoop(); };

  /* --- Fail-safe (spek §11.5, §9.4): fallback menjadi hasil akhir. --- */
  const failSafe = (reason) => {
    try { console.warn('[hero-webgl] initialization stopped:', reason); } catch (error) { /* noop */ }
    showFallback();
    dispose({ final: true });
  };

  /* --- Pointer parallax (spek §14): hanya fine pointer, area
         wrapper (bukan document), smoothing lerp tanpa quickTo. --- */
  instance.pointerMoveHandler = (event) => {
    if (!instance.finePointer || instance.state !== 'ready') return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    /* Subtle & terbatas (spek §14.1). */
    instance.target.ry = Math.max(-0.18, Math.min(0.18, nx * 0.16));
    instance.target.rx = Math.max(-0.1, Math.min(0.1, ny * 0.1));
    instance.target.px = Math.max(-0.06, Math.min(0.06, nx * 0.06));
    instance.target.py = Math.max(-0.04, Math.min(0.04, -ny * 0.04));
  };
  instance.pointerLeaveHandler = () => {
    instance.target.rx = 0; instance.target.ry = 0;
    instance.target.px = 0; instance.target.py = 0;
  };

  /* --- Visibility handling (spek §15.3). --- */
  instance.visibilityHandler = () => {
    instance.docVisible = document.visibilityState !== 'hidden';
    if (instance.docVisible) startLoop();
    else stopLoop();
  };

  /* --- Context loss (spek §16.7): fallback-only strategy. Tanpa
         preventDefault, tanpa retry, tanpa render ke context hilang. --- */
  instance.contextLostHandler = () => {
    try { console.warn('[hero-webgl] webglcontextlost - fallback engaged'); } catch (error) { /* noop */ }
    showFallback();
    dispose({ final: true });
  };

  /* --- Dispose (idempoten, spek §16.3-§16.6).
         final=true  : keluar-homepage / before-swap / fail-safe -
                       semua resource + context dilepas, instance mati.
         final=false : viewport/reduced-motion crossing - resource GPU
                       dibuang, fallback tampil, instance menunggu
                       (boleh re-init lewat MQL). --- */
  const dispose = ({ final = false } = {}) => {
    const isFinal = final || instance.cancelled;
    if (instance.disposed && instance.disposedFinal) return; // sudah final: idempoten

    cancelSchedules();
    stopLoop();

    if (isFinal) {
      /* --- FINAL dispose (keluar-homepage / before-swap / fail-safe):
         lepas SEMUA listeners, observers, dan registry references. --- */
      if (instance.resizeObserver) { try { instance.resizeObserver.disconnect(); } catch (error) { /* noop */ } instance.resizeObserver = null; }
      if (instance.intersectionObserver) { try { instance.intersectionObserver.disconnect(); } catch (error) { /* noop */ } instance.intersectionObserver = null; }
      if (instance.resizeFallback) {
        window.removeEventListener('resize', instance.resizeFallback);
        instance.resizeFallback = null;
      }
      if (instance.mqDesktop && instance.mqDesktopHandler) {
        if (typeof instance.mqDesktop.removeEventListener === 'function') instance.mqDesktop.removeEventListener('change', instance.mqDesktopHandler);
        else if (typeof instance.mqDesktop.removeListener === 'function') instance.mqDesktop.removeListener(instance.mqDesktopHandler);
      }
      if (instance.mqReduced && instance.mqReducedHandler) {
        if (typeof instance.mqReduced.removeEventListener === 'function') instance.mqReduced.removeEventListener('change', instance.mqReducedHandler);
        else if (typeof instance.mqReduced.removeListener === 'function') instance.mqReduced.removeListener(instance.mqReducedHandler);
      }
      instance.mqDesktopHandler = null;
      instance.mqReducedHandler = null;
      wrapper.removeEventListener('pointermove', instance.pointerMoveHandler);
      wrapper.removeEventListener('pointerleave', instance.pointerLeaveHandler);
      document.removeEventListener('visibilitychange', instance.visibilityHandler);
      canvas.removeEventListener('webglcontextlost', instance.contextLostHandler);
    }
    /* NOTE temporary dispose (viewport/reduced-motion crossing): listeners
       dan observers TETAP terpasang - merekalah yang memicu re-init saat
       kondisi kembali layak (spek §3.4, §3.5, §15.5). Semua handler
       self-guard terhadap state/cancelled. */

    /* Ambil referensi gl SEBELUM release (JANGAN getContext ulang:
       getContext pada canvas tanpa context akan MENCIPTAKAN context
       yatim - bug yang ditemukan audit LC06). */
    const glForRelease = instance.sceneApi ? instance.sceneApi.getGl() : null;
    if (instance.sceneApi) {
      instance.sceneApi.dispose();
      instance.sceneApi = null;
    }

    if (isFinal) {
      /* WEBGL_lose_context: tepat satu kali, hanya pada dispose final,
         hanya jika context benar-benar pernah dibuat (spek §16.6). */
      if (!instance.contextReleased && glForRelease) {
        instance.contextReleased = true;
        try {
          const loseContext = glForRelease.getExtension('WEBGL_lose_context');
          if (loseContext && typeof loseContext.loseContext === 'function') loseContext.loseContext();
        } catch (error) { /* context mungkin sudah hilang */ }
      }
      instance.disposed = true;
      instance.disposedFinal = true;
      instance.cancelled = true;
      /* Singleton `active` dikelola entry publik (index.js); instance
         final menandai dirinya via `disposedFinal` agar entry dapat
         membuat instance baru. */
      /* Registry references dilepas agar Set tidak menahan closure
         (spek §16.2). Pada temporary dispose refs dipertahankan agar
         backstop after-swap tetap mengenal instance ini. */
      if (instance.rafStopRef) { motionRegistry.rafLoops.delete(instance.rafStopRef); instance.rafStopRef = null; }
      if (instance.disposeRef) { motionRegistry.webgl.delete(instance.disposeRef); instance.disposeRef = null; }
    }

    /* Fallback SVG kembali (DOM lama masih tersedia pada before-swap -
       spek §16.3 langkah 9). */
    showFallback();

    if (!isFinal) {
      /* Temporary dispose: instance menunggu kondisi kembali layak;
         MQL handler memicu re-init (satu instance, refs tetap tracked). */
      setState('waiting');
    }
  };

  /* disposeRef yang terdaftar di registry: selalu final-safe. */
  instance.disposeRef = () => dispose({ final: true });
  instance.rafStopRef = rafStop;
  instance.disposedFinal = false;

  /* --- Public API instance. --- */
  instance.dispose = () => dispose({ final: true });
  instance.cancel = () => {
    instance.cancelled = true;
    dispose({ final: true });
  };

  /* --- begin(): guard awal sinkron + scheduling + wiring (spek §9.4). --- */
  instance.begin = () => {
    if (instance.disposed || instance.cancelled) return;
    if (!canvas.isConnected || !wrapper.isConnected) { setState('waiting'); return; }
    instance.mqDesktop = window.matchMedia(DESKTOP_MQ);
    instance.mqReduced = window.matchMedia(REDUCED_MQ);
    instance.finePointer = window.matchMedia('(pointer: fine)').matches;

    setState('waiting');
    if (instance.mqDesktop.matches && !instance.mqReduced.matches) {
      /* Semua guard awal lolos: jadwalkan load SETELAH initial
         rendering (2x rAF + idle, spek §9.4 langkah 8 + §9.5). */
      scheduleLoad();
    }
    /* Bila belum memenuhi syarat: TANPA dynamic import sama sekali
       (spek §3.4, §3.5). MQL listener di bawah menangani perubahan
       viewport / preferensi mid-session. */

    /* MQL listeners: viewport turun -> dispose temporary; naik lagi ->
       re-init (satu instance) setelah guard divalidasi ulang. */
    instance.mqDesktopHandler = (event) => {
      if (instance.cancelled || instance.disposed) return;
      if (!event.matches) {
        dispose({ final: false });
      } else if (instance.state === 'waiting' && !instance.sceneApi) {
        setState('loading');
        loadOGL();
      }
    };
    instance.mqReducedHandler = (event) => {
      if (instance.cancelled || instance.disposed) return;
      if (event.matches) {
        /* Reduced motion aktif mid-session: hentikan + dispose (spek
           §3.5). Fallback SVG muncul kembali, tanpa parallax. */
        dispose({ final: false });
      } else if (instance.state === 'waiting' && !instance.sceneApi) {
        /* Kembali no-preference: re-init hanya jika masih homepage
           (instance hidup), viewport OK (dicek ulang di loadOGL). */
        setState('loading');
        loadOGL();
      }
    };
    if (typeof instance.mqDesktop.addEventListener === 'function') instance.mqDesktop.addEventListener('change', instance.mqDesktopHandler);
    else if (typeof instance.mqDesktop.addListener === 'function') instance.mqDesktop.addListener(instance.mqDesktopHandler);
    if (typeof instance.mqReduced.addEventListener === 'function') instance.mqReduced.addEventListener('change', instance.mqReducedHandler);
    else if (typeof instance.mqReduced.addListener === 'function') instance.mqReduced.addListener(instance.mqReducedHandler);

    /* Pointer parallax + visibility + context loss. */
    wrapper.addEventListener('pointermove', instance.pointerMoveHandler, { passive: true });
    wrapper.addEventListener('pointerleave', instance.pointerLeaveHandler, { passive: true });
    document.addEventListener('visibilitychange', instance.visibilityHandler);
    canvas.addEventListener('webglcontextlost', instance.contextLostHandler);

    /* Backstop registry: listener juga dilacak agar after-swap cleanup
       melepas sisa apa pun bila dispose manual kelewat (spek §16.4). */
    trackMotionListener(wrapper, 'pointermove', instance.pointerMoveHandler, { passive: true });
    trackMotionListener(wrapper, 'pointerleave', instance.pointerLeaveHandler, { passive: true });
    trackMotionListener(document, 'visibilitychange', instance.visibilityHandler);
    trackMotionListener(canvas, 'webglcontextlost', instance.contextLostHandler);

    /* ResizeObserver (spek §15.4): ukuran wrapper, bukan window. */
    if (typeof ResizeObserver === 'function') {
      instance.resizeObserver = new ResizeObserver(() => {
        if (instance.cancelled || instance.disposed) return;
        applySize();
      });
      instance.resizeObserver.observe(wrapper);
    } else {
      /* Fallback sederhana (spek §10.3). */
      instance.resizeFallback = () => { if (!instance.cancelled && !instance.disposed) applySize(); };
      window.addEventListener('resize', instance.resizeFallback);
      trackMotionListener(window, 'resize', instance.resizeFallback);
    }

    /* IntersectionObserver: pause RAF offscreen (spek §15.2). */
    if (typeof IntersectionObserver === 'function') {
      instance.intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        instance.ioVisible = !!(entry && entry.isIntersecting);
        if (instance.ioVisible) startLoop();
        else stopLoop();
      }, { threshold: 0.01 });
      instance.intersectionObserver.observe(wrapper);
    }

    /* Registry integration (spek §16.2): RAF stop + WebGL dispose. */
    trackRafLoop(instance.rafStopRef);
    trackWebGLContext(instance.disposeRef);
  };

  return instance;
}
