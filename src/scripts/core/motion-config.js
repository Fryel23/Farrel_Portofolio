/*!
 * core/motion-config.js: shared motion vocabulary (modularized
 * V11.1-M).
 *
 * Single responsibility: object MOTION - satu keluarga easing &
 * timing lintas fitur (§12.10 + V3 §3.2 + V4 §3.2). Jangan
 * menduplikasi easing config di masing-masing fitur.
 */

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
