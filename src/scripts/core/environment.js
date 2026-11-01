/*!
 * core/environment.js: environment capability flags (modularized
 * V11.1-M).
 *
 * Single responsibility: flag lingkungan LIVE (reducedMotion,
 * finePointer, hasGSAP, hasScrollTrigger, hasLenis) + initEnv().
 * Mutable exports tetap ESM live bindings - JANGAN menyalin nilai
 * boolean ke object lain yang menjadi stale (spek V11.1-M §16.2).
 */

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

export function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
