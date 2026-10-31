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
   iterable so cleanup can walk it. V7.4 additions: tickerCallbacks
   (fungsi gsap.ticker yang dibuat di luar konteks matchMedia, mis.
   data rain easter egg) supaya mati saat navigasi. */
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

/* ======================================================================
 * V8.0 FASE 1: MAGNETIC BUTTONS
 * ======================================================================
 * Elemen .magnetic-button mengikuti kursor dengan gsap.quickTo (x + y),
 * pergerakan dibatasi 15px dari pusat, dan kembali ke (0,0) dengan
 * elastic ease saat kursor meninggalkan tombol.
 * Batasan: reduced motion dan perangkat non fine-pointer tidak pernah
 * menjalankan efek (Batasan 3 + 4). Semua listener masuk
 * trackMotionListener dan setiap quickTo masuk trackQuickTo sehingga
 * after-swap membersihkan semuanya (Batasan 2).
 * Catatan implementasi elastic: pasangan quickTo dibuang saat mouseleave
 * lalu dibuat ulang lazily pada mousemove berikutnya. Pola ini menghindari
 * konflik antara tween quickTo yang di-park dan tween elastic (keduanya
 * menarget x/y pada elemen yang sama) tanpa bergantung pada perilaku
 * internal gsap terhadap tween quickTo yang di-kill. */
export function initMagneticButtons() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
  const g = window.gsap;
  const MAX_SHIFT = 15;   // px, sesuai spesifikasi
  const STRENGTH = 0.4;   // kursor 1px -> tombol bergeser 0.4px

  qsa('.magnetic-button').forEach((button) => {
    if (button.dataset.magneticBound === 'true') return;
    button.dataset.magneticBound = 'true';

    /* .button/.deck-button memakai CSS transition pada transform; transisi
       itu menambah interpolasi kedua di atas quickTo (pergerakan terasa
       delay). Properti transform dikeluarkan dari daftar transition inline,
       properti lain (background, color, border) tetap bertransisi. Durasi
       tiap properti pada tombol-tombol ini seragam (var(--micro)) sehingga
       penghapusan satu entri tidak menggeser pemetaan durasi. */
    const computed = window.getComputedStyle(button);
    if (computed.transitionProperty && computed.transitionProperty.indexOf('transform') !== -1) {
      const kept = computed.transitionProperty
        .split(',')
        .map((prop) => prop.trim())
        .filter((prop) => prop && prop !== 'transform');
      if (kept.length) button.style.transitionProperty = kept.join(', ');
      else button.style.transitionProperty = 'none';
    }

    let xTo = null;
    let yTo = null;
    let elastic = null;
    let baseRect = null; // rect tanpa offset magnetik, dipatok saat mouseenter

    const buildQuickTo = () => {
      xTo = trackQuickTo(g.quickTo(button, 'x', { duration: 0.35, ease: 'power3.out' }));
      yTo = trackQuickTo(g.quickTo(button, 'y', { duration: 0.35, ease: 'power3.out' }));
    };
    const releaseQuickTo = () => {
      [xTo, yTo].forEach((fn) => {
        if (fn && fn.tween) {
          try { fn.tween.kill(); } catch (error) { /* tween sudah mati */ }
          motionRegistry.eventTweens.delete(fn.tween);
        }
      });
      xTo = null;
      yTo = null;
    };

    trackMotionListener(button, 'mouseenter', () => {
      if (elastic) { try { elastic.kill(); } catch (error) { /* noop */ } elastic = null; }
      g.set(button, { x: 0, y: 0 });
      baseRect = button.getBoundingClientRect();
    });

    trackMotionListener(button, 'mousemove', (event) => {
      if (!baseRect) return; // mouseenter selalu mendahului mousemove
      if (elastic) { try { elastic.kill(); } catch (error) { /* noop */ } elastic = null; }
      if (!xTo || !yTo) buildQuickTo();
      const shiftX = g.utils.clamp(-MAX_SHIFT, MAX_SHIFT, (event.clientX - (baseRect.left + baseRect.width / 2)) * STRENGTH);
      const shiftY = g.utils.clamp(-MAX_SHIFT, MAX_SHIFT, (event.clientY - (baseRect.top + baseRect.height / 2)) * STRENGTH);
      xTo(shiftX);
      yTo(shiftY);
    });

    trackMotionListener(button, 'mouseleave', () => {
      baseRect = null;
      releaseQuickTo();
      elastic = trackEventTween(g.to(button, {
        x: 0, y: 0,
        duration: 0.9,
        ease: 'elastic.out(1, 0.45)',
        overwrite: 'auto',
        onComplete: () => { elastic = null; }
      }));
    });
  });
}

/* ======================================================================
 * V8.0 FASE 2: AUDIO FEEDBACK (WEB AUDIO API, TANPA FILE)
 * ======================================================================
 * Dua suara sintesis oscillator: playClickSound (frekuensi tinggi,
 * 0.05s) untuk CTA dan playHoverSound (frekuensi rendah, volume sangat
 * kecil) untuk kartu proyek. AudioContext dibuat lazily di dalam gesture
 * pengguna (kebijakan autoplay browser). Preferensi mute tersimpan di
 * localStorage (kunci fip-audio-muted). Progressive enhancement penuh:
 * tanpa Web Audio, atau saat mute, semua fungsi no-op tanpa error.
 * Keputusan dokumentasi: Batasan 3 membaca "semua efek baru", maka
 * suara juga dimatikan saat prefers-reduced-motion: reduce. */
const AUDIO_STORAGE_KEY = 'fip-audio-muted';
let audioCtx = null;
let audioMutedCache = null;

export function isAudioMuted() {
  if (audioMutedCache === null) {
    try {
      audioMutedCache = window.localStorage.getItem(AUDIO_STORAGE_KEY) === 'true';
    } catch (error) {
      audioMutedCache = false; // storage diblokir: default tidak mute
    }
  }
  return audioMutedCache;
}

export function setAudioMuted(value) {
  audioMutedCache = value === true;
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, String(audioMutedCache));
  } catch (error) { /* penyimpanan tidak tersedia: preferensi hanya sesi ini */ }
}

function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null; // Batasan 1: tanpa Web Audio situs tetap normal
  if (!audioCtx) {
    try { audioCtx = new AC(); } catch (error) { return null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try { audioCtx.resume(); } catch (error) { /* akan di-resume gesture lain */ }
  }
  return audioCtx;
}

export function playClickSound() {
  if (isAudioMuted() || isReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function playHoverSound() {
  if (isAudioMuted() || isReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.012, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
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
    lenis = null;
  }
}

/* V6.3 §2.6.2: component-specific reset helpers. */

/* V10.2 D: setiap gsap.set di-guard dengan gsap.utils.toArray().length
   agar halaman tanpa target tertentu (mis. /work tidak punya
   .atlas-path atau #journey-rail-fill) tidak mencetak warning
   "GSAP target ... not found" di reduce mode. Warning hanyalah
   console.warn sehingga try/catch tidak menangkapnya; guard length
   adalah satu-satunya cara yang benar: lewati operasi saat kosong.
   Urutan operasi, REDUCED_REVEAL_SELECTOR, dan try/catch (jaring
   pengaman untuk partial lists) semuanya dipertahankan. */
export function forceContentVisible() {
  if (doc.body.classList.contains('is-glitching')) doc.body.classList.remove('is-glitching');
  if (hasGSAP) {
    const revealTargets = gsap.utils.toArray(REDUCED_REVEAL_SELECTOR);
    if (revealTargets.length) {
      try { gsap.set(revealTargets, { clearProps: 'all' }); } catch (error) { /* partial lists are fine */ }
    }
    const atlasTargets = gsap.utils.toArray('.atlas-path');
    if (atlasTargets.length) {
      try { gsap.set(atlasTargets, { strokeDasharray: 'none', strokeDashoffset: 0 }); } catch (error) { /* noop */ }
    }
    const journeyRailTargets = gsap.utils.toArray('#journey-rail-fill');
    if (journeyRailTargets.length) {
      try { gsap.set(journeyRailTargets, { scaleY: 1 }); } catch (error) { /* noop */ }
    }
    const closingFillTargets = gsap.utils.toArray('.closing-outline-fill');
    if (closingFillTargets.length) {
      try { gsap.set(closingFillTargets, { clipPath: 'inset(0 0% 0 0)' }); } catch (error) { /* noop */ }
    }
    const projectCoverTargets = gsap.utils.toArray('.project-cover-inner');
    if (projectCoverTargets.length) {
      try { gsap.set(projectCoverTargets, { clearProps: 'clipPath' }); } catch (error) { /* noop */ }
    }
  }
}

/* V4 section entrances, registered once from boot() (V4 §12.1). */

/* ======================================================================
 * V7.4 FASE 3: SIKLUS HIDUP JAVASCRIPT UNTUK CLIENTROUTER
 * ======================================================================
 * Dengan <ClientRouter /> (BaseLayout), halaman tidak di-reload penuh:
 * DOM diganti lewat swap dan event DOMContentLoaded hanya berjalan
 * SEKALI di awal sesi. Kunci siklus hidup yang baru adalah event
 * 'astro:page-load' yang dipicu Astro pada load awal DAN setiap kali
 * halaman baru selesai dimuat lewat navigasi client-side.
 *
 * Alur per navigasi (urutan dijamin router Astro):
 *   1. astro:before-swap  -> DOM halaman lama masih ada.
 *   2. swap()             -> DOM diganti; script lama tidak dieksekusi ulang.
 *   3. astro:after-swap   -> TEARDOWN: semua motion halaman lama dimatikan
 *                            (konteks matchMedia di-revert, registry
 *                            dibersihkan, ScrollTrigger dibunuh, Lenis
 *                            dihancurkan, timeline global disapu).
 *   4. runScripts         -> modul halaman yang BELUM pernah dieksekusi
 *                            dijalankan (mendaftar bootPage miliknya).
 *   5. astro:page-load    -> SETIAP bootPage menjalankan run() sekali
 *                            untuk epoch navigasi ini.
 *
 * navEpoch naik satu di astro:after-swap. Setiap pemanggil bootPage
 * memegang latch sendiri sehingga boot tepat satu kali per epoch,
 * tanpa boot ganda pada load awal (DOMContentLoaded + window load).
 * ==================================================================== */
let navEpoch = 0;

/* Semua konteks gsap.matchMedia() yang masih hidup. Satu halaman bisa
   punya beberapa pemanggil bootPage (global + skrip halaman), jadi
   konteks dikumpulkan di sini dan di-revert semua saat teardown. */
const motionContexts = new Set();

/* Dipanggil tepat setelah DOM halaman lama diganti (astro:after-swap).
   Semua yang menunjuk DOM lama mati di sini, sebelum halaman baru boot. */
function teardownPageMotion() {
  if (hasGSAP) {
    /* 1. Revert seluruh konteks gsap.matchMedia(): tween/ScrollTrigger
          milik konteks dikembalikan, fungsi cleanup halaman dijalankan. */
    motionContexts.forEach((context) => {
      try { context.revert(); } catch (error) { /* konteks sudah mati */ }
    });
    motionContexts.clear();
    /* 2. Registry: listener/timer/interval/observer/tween terlacak,
          ticker callbacks, lalu Lenis dihancurkan. */
    cleanupMotionRegistry();
    /* 3. Jaring pengaman: sisa ScrollTrigger apa pun (dibuat handler
          asinkron di luar konteks) ikut dibunuh. */
    if (hasScrollTrigger) {
      try { window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); } catch (error) { /* noop */ }
    }
    /* 4. Sapu timeline global: tween & delayedCall nyasar dari halaman
          lama (di luar konteks maupun registry) mati semua. Aman karena
          boot halaman baru belum berjalan. */
    try { window.gsap.globalTimeline.clear(); } catch (error) { /* noop */ }
  }
}

doc.addEventListener('astro:after-swap', () => {
  navEpoch += 1;
  teardownPageMotion();
});

/* ======================================================================
 * BOOT PER HALAMAN (pola boot V6.3: renders -> registrasi -> interaksi
 * -> gsap.matchMedia lifecycle). Setiap halaman Astro memanggil
 * bootPage dengan daftar fungsi miliknya; urutan dan semantik
 * (revert otomatis + cleanup registry) identik dengan boot() lama.
 * V7.4: boot kini berjalan pada 'astro:page-load' untuk setiap muatan
 * halaman (awal maupun navigasi client-side), tidak lagi hanya
 * bergantung pada DOMContentLoaded. Opsi `resolve` memungkinkan satu
 * modul melayani beberapa halaman (mis. archive.js) dengan konfigurasi
 * yang dibaca ulang setiap astro:page-load.
 * ==================================================================== */
export let pluginsRegistered = false;

export function bootPage({ renders = [], interactions = [], motion = [], cleanups = [], resolve = null } = {}) {
  /* Latch per pemanggil: satu boot per epoch navigasi. */
  let bootedEpoch = -1;

  const run = (config = {}) => {
    const {
      renders: pageRenders = [],
      interactions: pageInteractions = [],
      motion: pageMotion = [],
      cleanups: pageCleanups = []
    } = config;

    // 1. Render data-driven dulu; tidak ada tween/ScrollTrigger di sini.
    pageRenders.forEach((fn) => fn());

    // 2. Registrasi plugin + lag smoothing sekali, sebelum trigger dibuat.
    if (hasGSAP && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.ticker.lagSmoothing(0);
      pluginsRegistered = true;
    }

    // 3. Interaksi (Category B): aktif di bawah reduced motion juga.
    pageInteractions.forEach((fn) => fn());

    // 4. Siklus motion: gsap.matchMedia() memiliki saklar dua arah.
    //    V7.4: konteks dikumpulkan agar teardown navigasi me-revert
    //    SEMUA konteks halaman (global + per halaman).
    if (hasGSAP) {
      const motionMedia = window.gsap.matchMedia();
      motionContexts.add(motionMedia);
      motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
        pageMotion.forEach((fn) => fn());
        return () => { pageCleanups.forEach((fn) => fn()); };
      });
      motionMedia.add('(prefers-reduced-motion: reduce)', () => {
        // Konten terlihat; blok CSS prefers-reduced-motion merender
        // semua status akhir. Pass ini hanya membersihkan sisa.
        forceContentVisible();
        return () => {};
      });
    }

    /* V7.4 (spek Fase 3): refresh di akhir inisialisasi agar posisi
       trigger dihitung ulang terhadap tinggi halaman yang baru. */
    if (hasScrollTrigger) {
      try { window.ScrollTrigger.refresh(); } catch (error) { /* noop */ }
    }
  };

  const boot = () => {
    if (bootedEpoch === navEpoch) return; // sudah boot untuk muat halaman ini
    bootedEpoch = navEpoch;
    const config = resolve ? resolve() : { renders, interactions, motion, cleanups };
    run(config || {});
  };

  /* astro:page-load: dipicu Astro pada load awal (window load) DAN
     setelah setiap navigasi client-side selesai (DOM baru + script baru
     siap). Modul yang baru dieksekusi saat navigasi selalu mendaftar
     sebelum event ini, karena router menunggu eksekusi script selesai
     sebelum memicu astro:page-load. */
  doc.addEventListener('astro:page-load', boot);

  /* Load awal (hard reload): boot langsung saat modul dieksekusi
     (perilaku lama dipertahankan) agar animasi entrance tidak menunggu
     window load. astro:page-load yang menyusul membawa epoch yang sama,
     jadi latch mencegah boot ganda. Navigasi client-side (navEpoch > 0)
     tidak boot di sini: astro:page-load-lah yang memicunya. */
  if (navEpoch === 0) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
}
