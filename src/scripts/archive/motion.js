/*!
 * archive/motion.js: cross-section archive motion (modularized
 * V11.1-M).
 *
 * Single responsibility: initV4Motion() - choreography reveal per
 * section arsip (deck console, off-screen layout, github grid,
 * companion inner) dengan ScrollTrigger once:true. Bersifat lintas
 * section karena memang satu pola reveal, bukan gabungan fitur.
 */
import { hasScrollTrigger } from '../core.js';

/* V6.3 §2.6-§2.8: MATCHMEDIA LIFECYCLE
   The reload-based watcher is gone. gsap.matchMedia() now owns the
   two-way switch: the no-preference handler builds every motion piece
   and returns an explicit cleanup; the reduce handler only guarantees
   visible content. Everything matchMedia cannot revert on its own
   (async tweens, listeners, observers, Lenis) is cleaned through
   motionRegistry by cleanupMotionRegistry() plus the reset helpers. */

/* V6.3 §2.7: belt-and-braces pass for the reduce side. matchMedia reverts
   what it owns; this clears any leftover inline hidden states (and the
   two scrub finals) so content is always fully visible under reduce. */

function initV4Motion() {
  if (!hasScrollTrigger) return;

  /* V8.1 Fase 5: initV4Motion dipakai empat halaman arsip lewat
     PAGE_BOOT, tetapi tiap blok hanya relevan di satu halaman. Setiap
     blok dijaga gsap.utils.toArray + length agar GSAP tidak mencatat
     peringatan "target not found" di halaman arsip lain. */
  const deckConsole = gsap.utils.toArray('.deck-console');
  if (deckConsole.length) {
    gsap.set(deckConsole, { opacity: 0, y: 34 });
    gsap.to(deckConsole, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.games-section', start: 'top 78%', once: true }
    });
  }

  const offscreenItems = gsap.utils.toArray('.offscreen-layout > *');
  if (offscreenItems.length) {
    gsap.set(offscreenItems, { opacity: 0, y: 30 });
    gsap.to(offscreenItems, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.offscreen-layout', start: 'top 84%', once: true }
    });
  }

  const githubTargets = gsap.utils.toArray('.github-grid, .github-fallback, .github-note');
  if (githubTargets.length) {
    gsap.set(githubTargets, { opacity: 0, y: 30 });
    gsap.to(githubTargets, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.github-inner', start: 'top 84%', once: true }
    });
  }

  const companionItems = gsap.utils.toArray('.companion-inner > *');
  if (companionItems.length) {
    gsap.set(companionItems, { opacity: 0, y: 26 });
    gsap.to(companionItems, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.companion-inner', start: 'top 86%', once: true }
    });
  }
}


/* Modularization exports (public API of this feature module). */
export { initV4Motion };
