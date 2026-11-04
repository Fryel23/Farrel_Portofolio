/*!
 * core/motion-registry.js: THE single motion registry (modularized
 * V11.1-M).
 *
 * Single responsibility: SATUTON registry bersama untuk semua yang
 * tidak bisa di-revert otomatis oleh gsap.matchMedia() - observers,
 * timers, intervals, motion listeners, event/ambient tweens, batch
 * triggers, scroll triggers, ticker callbacks, rAF loops, dan WebGL
 * disposers - plus tracker functions dan cleanupMotionRegistry().
 * HANYA ADA SATU registry di seluruh aplikasi; jangan membuat Set
 * `webgl`/`rafLoops` kedua (spek V11.1-M §16.2).
 */
import { hasGSAP } from './environment.js';
import { lenis, lenisTicker, setLenis } from './scroll-runtime.js';

/**
 * @typedef {import('../../types/core-lifecycle.ts').MotionRegistryState} MotionRegistryState
 * @typedef {import('../../types/core-lifecycle.ts').DisconnectableObserver} DisconnectableObserver
 * @typedef {import('../../types/core-lifecycle.ts').KillableMotionPrimitive} KillableMotionPrimitive
 * @typedef {import('../../types/core-lifecycle.ts').QuickToFunction} QuickToFunction
 * @typedef {import('../../types/core-lifecycle.ts').DisposerFn} DisposerFn
 */

/* Central registry for everything gsap.matchMedia() cannot revert on
   its own: tweens created asynchronously (from event handlers or
   onComplete callbacks), motion-only listeners, observers, timers,
   intervals, batch triggers and stray ScrollTriggers. Every Set is
   iterable so cleanup can walk it. V7.4 additions: tickerCallbacks
   (fungsi gsap.ticker yang dibuat di luar konteks matchMedia, mis.
   data rain easter egg) supaya mati saat navigasi. */
/** @type {MotionRegistryState} */
export const motionRegistry = {
  observers: new Set(),
  timers: new Set(),
  intervals: new Set(),
  motionListeners: [],
  eventTweens: new Set(),   // created from event handlers (parallax, hover)
  ambientTweens: new Set(), // created async (onComplete / delayedCall)
  batchTriggers: new Set(), // triggers from ScrollTrigger.batch()
  scrollTriggers: new Set(), // other triggers created asynchronously
  tickerCallbacks: new Set(), // V7.4: gsap.ticker callbacks outside matchMedia
  rafLoops: new Set(),      // V8.0: stop functions untuk loop requestAnimationFrame
  webgl: new Set()          // V8.0: dispose functions untuk instance/context WebGL
};

export function trackMotionListener(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  motionRegistry.motionListeners.push({ target, type, handler, options });
}

export function trackObserver(observer) {
  motionRegistry.observers.add(observer);
  return observer;
}

/* Event-handler tweens are not owned by the matchMedia context, so they
   are registered here and removed on cleanup. The original onComplete
   (if any) is preserved and still fires. */
export function trackEventTween(tween) {
  if (!tween) return tween;
  motionRegistry.eventTweens.add(tween);
  if (typeof tween.eventCallback === 'function') {
    const existing = tween.vars && tween.vars.onComplete;
    tween.eventCallback('onComplete', function onDone() {
      motionRegistry.eventTweens.delete(tween);
      if (typeof existing === 'function') existing.apply(this, arguments);
    });
  }
  return tween;
}

export function trackAmbientTween(tween) {
  if (!tween) return tween;
  motionRegistry.ambientTweens.add(tween);
  return tween;
}

/* V6.5 §1.1: dedicated tracker for gsap.quickTo() functions.
   A quickTo returns a reusable function whose internal tween stays
   alive forever (it is never "complete" while parked). The old path,
   trackEventTween(fn.tween), wrapped onComplete so the tween removed
   itself from the registry on its first real animation - the leak:
   after the first pointer move the reduce cleanup could no longer see
   it. This helper registers the parked tween WITHOUT an onComplete
   hook, so it stays listed for the whole motion session and is killed
   exactly once by cleanupMotionRegistry(). */
export function trackQuickTo(fn) {
  if (fn && fn.tween) {
    motionRegistry.eventTweens.add(fn.tween);
  }
  return fn;
}

/* V8.0 Batasan 2 (lifecycle ketat): dua jalur registrasi baru.
   - rafLoops: fungsi stop untuk setiap loop requestAnimationFrame yang
     dibuat di luar konteks gsap.matchMedia (CRT deck, dsb.).
   - webgl: fungsi dispose untuk setiap instance/context WebGL (Curtains,
     CRT canvas) sehingga after-swap selalu melepas context + canvas. */
export function trackRafLoop(stopFn) {
  if (typeof stopFn === 'function') motionRegistry.rafLoops.add(stopFn);
  return stopFn;
}

export function trackWebGLContext(disposeFn) {
  if (typeof disposeFn === 'function') motionRegistry.webgl.add(disposeFn);
  return disposeFn;
}

/* V6.3 §2.6.1: walk the registry and release everything that the
   matchMedia context does not revert automatically. */
/* V6.3 §2.6.1: walk the registry and release everything that the
   matchMedia context does not revert automatically. */
export function cleanupMotionRegistry() {
  motionRegistry.observers.forEach((obs) => obs.disconnect());
  motionRegistry.observers.clear();
  motionRegistry.timers.forEach((id) => window.clearTimeout(id));
  motionRegistry.timers.clear();
  motionRegistry.intervals.forEach((id) => window.clearInterval(id));
  motionRegistry.intervals.clear();
  motionRegistry.motionListeners.forEach(({ target, type, handler, options }) => {
    target.removeEventListener(type, handler, options);
  });
  motionRegistry.motionListeners = [];
  motionRegistry.eventTweens.forEach((tween) => {
    if (tween && typeof tween.kill === 'function') tween.kill();
  });
  motionRegistry.eventTweens.clear();
  motionRegistry.ambientTweens.forEach((tween) => {
    if (tween && typeof tween.kill === 'function') tween.kill();
  });
  motionRegistry.ambientTweens.clear();
  motionRegistry.scrollTriggers.forEach((trigger) => {
    if (trigger && typeof trigger.kill === 'function') trigger.kill();
  });
  motionRegistry.scrollTriggers.clear();
  if (hasGSAP) {
    motionRegistry.tickerCallbacks.forEach((fn) => {
      try { gsap.ticker.remove(fn); } catch (error) { /* sudah lepas */ }
    });
  }
  motionRegistry.tickerCallbacks.clear();
  /* V8.0: loop rAF dan context WebGL (Curtains/CRT) dimatikan sebelum
     sisanya; setiap stop/dispose dibuat idempoten oleh pemiliknya. */
  motionRegistry.rafLoops.forEach((stopFn) => {
    try { stopFn(); } catch (error) { /* loop sudah mati */ }
  });
  motionRegistry.rafLoops.clear();
  motionRegistry.webgl.forEach((disposeFn) => {
    try { disposeFn(); } catch (error) { /* context sudah lepas */ }
  });
  motionRegistry.webgl.clear();
  if (lenis) {
    gsap.ticker.remove(lenisTicker);
    try { lenis.destroy(); } catch (error) { /* already gone */ }
    setLenis(null); // live binding dimiliki scroll-runtime (satu owner)
  }
}
