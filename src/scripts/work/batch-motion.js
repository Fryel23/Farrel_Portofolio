/*!
 * work/batch-motion.js: project batch entrance (modularized V11.1-M).
 *
 * Single responsibility: entrance batch kartu via ScrollTrigger.batch,
 * flag galleryInView (owner tunggal; diekspor sebagai live binding),
 * dan reset trigger batch. Start/end batch dan stagger tidak berubah.
 */
import {
  qs, qsa, hasScrollTrigger, isReducedMotion, pluginsRegistered,
  motionRegistry,
} from '../core.js';

let galleryInView = false;

let batchTriggers = [];

function setupProjectBatch() {
  if (!hasScrollTrigger || isReducedMotion() || !pluginsRegistered) return;
  const ST = window.ScrollTrigger;
  const grid = qs('#project-grid');
  if (!grid) return;
  batchTriggers.forEach((trigger) => trigger.kill());
  batchTriggers = [];
  const cards = qsa('.project-card', grid);
  if (!cards.length) return;
  gsap.set(cards, { opacity: 0, y: 44 });
  const start = window.matchMedia('(max-width: 700px)').matches ? 'top 95%' : 'top 86%';
  ST.batch(cards, {
    start: start,
    once: true,
    onEnter: (batch) => {
      galleryInView = true;
      gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out',
        overwrite: 'auto', clearProps: 'transform'
      });
      /* V6.3 §3.2.1: the batch no longer animates clipPath on the img.
         The directional hover reveal owns clip-path exclusively (on
         .project-cover-inner); the entrance only settles the img scale. */
      batch.forEach((card) => {
        const img = card.querySelector('.project-cover img');
        if (!img) return;
        gsap.fromTo(img,
          { scale: 1.06 },
          { scale: 1, duration: 0.8, ease: 'power2.inOut', clearProps: 'scale' }
        );
      });
    }
  });
  /* V6.3 §2.6.3: batch() triggers are created synchronously here, so the
     matchMedia context owns them; the registry copy is the belt-and-
     braces path for the explicit cleanup (resetBatchTriggers). */
  batchTriggers = ST.getAll().filter((trigger) =>
    trigger.trigger && trigger.trigger.classList && trigger.trigger.classList.contains('project-card'));
  motionRegistry.batchTriggers = new Set(batchTriggers);
}

function resetBatchTriggers() {
  motionRegistry.batchTriggers.forEach((trigger) => {
    if (trigger && typeof trigger.kill === 'function') trigger.kill();
  });
  motionRegistry.batchTriggers.clear();
  batchTriggers.forEach((trigger) => trigger.kill());
  batchTriggers = [];
}

/* Modularization exports (public API of this feature module).
   galleryInView: live binding - owner tunggal flag entrance. */
export { setupProjectBatch, resetBatchTriggers, galleryInView };
