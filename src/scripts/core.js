/*!
 * core.js: fondasi bersama semua modul portofolio (migrasi Astro V7.0).
 * Berisi: environment flags (live), helper DOM aman, MOTION vocabulary,
 * registry siklus motion, scrollToTarget, pembersih registry, dan
 * bootPage (pola boot V6.3: renders -> registrasi plugin -> interaksi
 * -> gsap.matchMedia lifecycle). Logika identik dengan script.js lama.
 */
import { DATA } from '../data/content.js';

export { DATA };
export const doc = document;

/* Environment flags: dievaluasi ulang lewat initEnv() dari global.js.
   Binding ES modul bersifat live sehingga modul lain selalu membaca
   nilai terbaru (perilaku sama dengan konstanta boot lama, karena
   initEnv dijalankan sebelum modul halaman dieksekusi). */
export let reducedMotion = false;
export let finePointer = false;
export let hasGSAP = false;
export let hasScrollTrigger = false;
export let hasLenis = false;

export function initEnv() {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  finePointer = window.matchMedia('(pointer: fine)').matches;
  hasGSAP = typeof window.gsap !== 'undefined';
  hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  hasLenis = typeof window.Lenis !== 'undefined';
}

/* Shared motion vocabulary (§12.10 + V3 §3.2 + V4 §3.2): one easing
   family, consistent timings across every component. Existing sections
   keep the same power2/power3 family this file already uses. easeSnap
   drives microinteraction bounce, easeDraw drives stroke drawing,
   easeScrub is used by every scroll-scrubbed timeline. V4 additions:
   easeGlitch for digital glitch steps, easeSlot for slot machine
   deceleration, easeFloat for soft idle loops. */
export const MOTION = {
  micro: 0.18,
  hover: 0.3,
  reveal: 0.6,
  stagger: 0.08,
  ease: 'power3.out',
  easeSoft: 'power2.out',
  easeSnap: 'back.out(1.2)',
  easeDraw: 'power2.inOut',
  easeScrub: 'none',
  easeGlitch: 'steps(5)',
  easeSlot: 'power4.out',
  easeFloat: 'sine.inOut'
};

/* ======================================================================
 * Tiny DOM helpers (safe by construction)
 * ==================================================================== */
export function el(tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
export function qs(selector, scope) { return (scope || doc).querySelector(selector); }
export function qsa(selector, scope) { return Array.from((scope || doc).querySelectorAll(selector)); }
export function setText(selector, value, scope) {
  const node = qs(selector, scope);
  if (node && value !== undefined && value !== null) node.textContent = String(value);
}

/* Shared accessible toast (copy feedback 12.7 + Konami toast V4 §9.2).
   One status region, reused by every feature that needs polite feedback. */
let toastTimer = null;
export function showToast(message) {
  const toast = qs('#copy-toast');
  if (!toast || !message) return;
  toast.textContent = String(message);
  toast.classList.add('is-visible');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/* V5 §3.6: every external fetch goes through this helper. 8 second
   timeout via AbortController, response.ok checked, and errors are
   always caught by the caller so a slow endpoint can never freeze
   the page or leave an unhandled rejection. */
export async function fetchWithTimeout(url, timeoutMs) {
  const limit = timeoutMs || 8000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), limit);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Request failed: ' + response.status);
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** Build a heading with masked lines; `accent` substring is wrapped in <em>. */
export function buildHeading(node, lines, accent, withSparkle) {
  if (!node || !Array.isArray(lines)) return;
  node.textContent = '';
  lines.forEach((lineText, index) => {
    const mask = el('span', 'line-mask');
    const line = el('span', 'line');
    const text = String(lineText);
    const last = index === lines.length - 1;
    if (accent && text.includes(accent)) {
      const at = text.indexOf(accent);
      if (at > 0) line.appendChild(doc.createTextNode(text.slice(0, at)));
      const em = doc.createElement('em');
      em.textContent = accent;
      line.appendChild(em);
      if (at + accent.length < text.length) {
        line.appendChild(doc.createTextNode(text.slice(at + accent.length)));
      }
      if (withSparkle && last) {
        const spark = el('sup', 'sparkle', '✳');
        spark.setAttribute('aria-hidden', 'true');
        line.appendChild(spark);
      }
    } else {
      line.textContent = text;
    }
    mask.appendChild(line);
    node.appendChild(mask);
  });
}

export function buildTwoLineCardHeading(node, lines) {
  if (!node || !Array.isArray(lines)) return;
  node.textContent = '';
  lines.forEach((lineText, index) => {
    node.appendChild(doc.createTextNode(lineText));
    if (index < lines.length - 1) node.appendChild(doc.createElement('br'));
  });
}

/* ======================================================================
 * 1. RENDER: collections
 * ==================================================================== */
export function safeImage(value, fallback) {
  const url = String(value || '').trim();
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
  if (/^(\.\/|\/)?assets\/[a-z0-9_./-]+\.(svg|png|jpe?g|webp|gif)$/i.test(url)) return url;
  return fallback || 'assets/project-aqi.svg';
}

/* Instance Lenis dibuat di global.js (initSmoothScroll) lalu didaftarkan
   di sini agar scrollToTarget dapat memakainya. */
export let lenis = null;
export function setLenis(instance) { lenis = instance; }

/* Namespace SVG bersama (dipakai ornamen global + scene arsip). */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/* Lenis ticker berjalan di atas ticker GSAP (dipasang initSmoothScroll,
   dilepas cleanupMotionRegistry). */
export function lenisTicker(time) {
  if (lenis) lenis.raf(time * 1000); // GSAP ticker: seconds; Lenis: ms
}

export function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Central registry for everything gsap.matchMedia() cannot revert on
   its own: tweens created asynchronously (from event handlers or
   onComplete callbacks), motion-only listeners, observers, timers,
   intervals, batch triggers and stray ScrollTriggers. Every Set is
   iterable so cleanup can walk it. */
export const motionRegistry = {
  observers: new Set(),
  timers: new Set(),
  intervals: new Set(),
  motionListeners: [],
  eventTweens: new Set(),   // created from event handlers (parallax, hover)
  ambientTweens: new Set(), // created async (onComplete / delayedCall)
  batchTriggers: new Set(), // triggers from ScrollTrigger.batch()
  scrollTriggers: new Set() // other triggers created asynchronously
};

let motionMedia = null; // created once in boot() when GSAP is present

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

export function scrollToTarget(target) {
  if (!target) return;
  /* V6.3 §2.2: the smooth-vs-instant choice is a runtime decision, so
     it reads the live preference, not the boot-time constant. */
  if (lenis && !isReducedMotion()) {
    lenis.scrollTo(target, { offset: -78, duration: 1.1 });
  } else if (isReducedMotion()) {
    target.scrollIntoView();
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

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
  if (lenis) {
    gsap.ticker.remove(lenisTicker);
    try { lenis.destroy(); } catch (error) { /* already gone */ }
    lenis = null;
  }
}

/* V6.3 §2.6.2: component-specific reset helpers. */

export function forceContentVisible() {
  if (doc.body.classList.contains('is-glitching')) doc.body.classList.remove('is-glitching');
  if (hasGSAP) {
    try { gsap.set(REDUCED_REVEAL_SELECTOR, { clearProps: 'all' }); } catch (error) { /* partial lists are fine */ }
    try { gsap.set('.atlas-path', { strokeDasharray: 'none', strokeDashoffset: 0 }); } catch (error) { /* noop */ }
    try { gsap.set('#journey-rail-fill', { scaleY: 1 }); } catch (error) { /* noop */ }
    try { gsap.set('.closing-outline-fill', { clipPath: 'inset(0 0% 0 0)' }); } catch (error) { /* noop */ }
    try { gsap.set('.project-cover-inner', { clearProps: 'clipPath' }); } catch (error) { /* noop */ }
  }
}

/* V4 section entrances, registered once from boot() (V4 §12.1). */

/* ======================================================================
 * BOOT PER HALAMAN (pola boot V6.3: renders -> registrasi -> interaksi
 * -> gsap.matchMedia lifecycle). Setiap halaman Astro memanggil
 * bootPage dengan daftar fungsi miliknya; urutan dan semantik
 * (revert otomatis + cleanup registry) identik dengan boot() lama.
 * ==================================================================== */
export let pluginsRegistered = false;

export function bootPage({ renders = [], interactions = [], motion = [], cleanups = [] }) {
  const run = () => {
    // 1. Render data-driven dulu; tidak ada tween/ScrollTrigger di sini.
    renders.forEach((fn) => fn());

    // 2. Registrasi plugin + lag smoothing sekali, sebelum trigger dibuat.
    if (hasGSAP && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.ticker.lagSmoothing(0);
      pluginsRegistered = true;
    }

    // 3. Interaksi (Category B): aktif di bawah reduced motion juga.
    interactions.forEach((fn) => fn());

    // 4. Siklus motion: gsap.matchMedia() memiliki saklar dua arah.
    if (hasGSAP) {
      motionMedia = window.gsap.matchMedia();
      motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
        motion.forEach((fn) => fn());
        return () => { cleanups.forEach((fn) => fn()); };
      });
      motionMedia.add('(prefers-reduced-motion: reduce)', () => {
        // Konten terlihat; blok CSS prefers-reduced-motion merender
        // semua status akhir. Pass ini hanya membersihkan sisa.
        forceContentVisible();
        return () => {};
      });
    }
  };
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}
