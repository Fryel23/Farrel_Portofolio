/*!
 * archive/shared/pet-blink.js: pet blink utility (modularized V11.1-M).
 *
 * Single responsibility: scheduleBlink() - rantai kedipan mata pixel
 * pet. Ditempatkan di shared/ karena punya dua consumer nyata lintas
 * fitur: initOffscreenPet (off-screen) dan initCompanion (companion).
 */
import { hasGSAP, isReducedMotion, trackAmbientTween } from '../../core.js';

function scheduleBlink(eyes) {
  if (!eyes || !hasGSAP || isReducedMotion()) return;
  /* V6.3 §2.3: the blink chain is asynchronous (delayedCall then a
     self-rescheduling tween), so both hops are registered in
     ambientTweens for the reduce cleanup. */
  trackAmbientTween(gsap.delayedCall(gsap.utils.random(3, 5), () => {
    trackAmbientTween(gsap.to(eyes, {
      scaleY: 0.12, duration: 0.07, yoyo: true, repeat: 1,
      transformOrigin: '50% 50%',
      onComplete: () => scheduleBlink(eyes)
    }));
  }));
}

/* Modularization exports (public API of this feature module). */
export { scheduleBlink };
