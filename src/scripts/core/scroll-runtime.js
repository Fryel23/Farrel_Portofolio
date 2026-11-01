/*!
 * core/scroll-runtime.js: Lenis scroll runtime owner (modularized
 * V11.1-M).
 *
 * Single responsibility: SATU instance Lenis (live binding `lenis` +
 * setLenis), ticker bridge GSAP, dan scrollToTarget. Instance Lenis
 * dibuat di global/scroll.js (initSmoothScroll) lalu didaftarkan di
 * sini - jangan membuat Lenis kedua.
 */
import { isReducedMotion } from './environment.js';

/* Instance Lenis dibuat di global.js (initSmoothScroll) lalu didaftarkan
   di sini agar scrollToTarget dapat memakainya. */
export let lenis = null;
export function setLenis(instance) { lenis = instance; }

/* Lenis ticker berjalan di atas ticker GSAP (dipasang initSmoothScroll,
   dilepas cleanupMotionRegistry). */
export function lenisTicker(time) {
  if (lenis) lenis.raf(time * 1000); // GSAP ticker: seconds; Lenis: ms
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
