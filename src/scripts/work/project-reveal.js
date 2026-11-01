/*!
 * work/project-reveal.js: directional project image reveal
 * (modularized V11.1-M).
 *
 * Single responsibility: reveal arah clip-path pada .project-cover-
 * inner via delegasi pointerover/pointerout/focusin/focusout, WeakMap
 * timeline per kartu (tidak ada timeline ganda pada kartu sama), dan
 * reset-nya.
 */
import {
  qs, hasGSAP, isReducedMotion, finePointer,
  trackMotionListener, trackEventTween,
} from '../core.js';

const projectRevealTimelines = new WeakMap();

/* V10.3 SUBFASE 1: delegasi reveal dipindah dari .project-cover-inner ke
   .project-cover. Terbukti lewat log [FLICKER-DIAG] (kini dihapus):
   clip-path pada inner mengubah region hit-test-nya selama animasi, jadi
   pointerover/pointerout yang mendelegasi ke inner bergantian terpicu
   (over IMG -> out IMG dengan relatedTarget = wrapper -> over IMG ...)
   saat kursor diam, dan guard contains() (searah turun) tak bisa
   menyerapnya, sehingga tween reveal terus kill/restart -> flicker.
   Wrapper tidak pernah ter-clip, ukurannya stabil, dan dengan
   pointer-events:none pada inner (work.css) hit-test sepenuhnya
   terjadi di wrapper; guard relatedTarget menyerap semua perpindahan
   internal. Target animasi clip-path tetap .project-cover-inner. */
function initProjectImageReveal() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
  const grid = qs('#project-grid');
  if (!grid) return;

  trackMotionListener(grid, 'pointerover', (event) => {
    const cover = event.target.closest('.project-cover');
    if (!cover) return;
    if (event.relatedTarget && cover.contains(event.relatedTarget)) return;

    const card = cover.closest('.project-card');
    if (!card) return;
    const inner = cover.querySelector('.project-cover-inner');
    if (!inner) return;
    const rect = cover.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const distances = { top: y, right: rect.width - x, bottom: rect.height - y, left: x };
    const side = Object.keys(distances).reduce((a, b) => distances[a] < distances[b] ? a : b);
    const initialClip = {
      top: 'inset(0 0 100% 0)',
      right: 'inset(0 0 0 100%)',
      bottom: 'inset(100% 0 0 0)',
      left: 'inset(0 100% 0 0)'
    }[side];

    const previous = projectRevealTimelines.get(card);
    if (previous && typeof previous.kill === 'function') previous.kill();

    gsap.set(inner, { clipPath: initialClip });
    const timeline = gsap.to(inner, {
      clipPath: 'inset(0 0 0 0)',
      duration: 0.6,
      ease: 'power2.out'
    });
    projectRevealTimelines.set(card, timeline);
    trackEventTween(timeline);
  }, { passive: true });

  trackMotionListener(grid, 'pointerout', (event) => {
    const cover = event.target.closest('.project-cover');
    if (!cover) return;
    if (event.relatedTarget && cover.contains(event.relatedTarget)) return;

    const card = cover.closest('.project-card');
    if (!card) return;
    const inner = cover.querySelector('.project-cover-inner');
    if (!inner) return;
    const previous = projectRevealTimelines.get(card);
    if (previous && typeof previous.kill === 'function') previous.kill();
    const timeline = gsap.to(inner, {
      clipPath: 'inset(0 0 0 0)',
      duration: 0.3,
      ease: 'power2.out'
    });
    projectRevealTimelines.set(card, timeline);
    trackEventTween(timeline);
  }, { passive: true });

  trackMotionListener(grid, 'focusin', (event) => {
    const card = event.target.closest('.project-card');
    if (!card) return;
    const cover = card.querySelector('.project-cover-inner');
    if (!cover) return;
    const previous = projectRevealTimelines.get(card);
    if (previous && typeof previous.kill === 'function') previous.kill();
    const timeline = gsap.to(cover, {
      clipPath: 'inset(0 0 0 0)',
      duration: 0.3,
      ease: 'power2.out'
    });
    projectRevealTimelines.set(card, timeline);
    trackEventTween(timeline);
  });

  trackMotionListener(grid, 'focusout', (event) => {
    const card = event.target.closest('.project-card');
    if (!card) return;
    if (card.contains(event.relatedTarget)) return;
    const cover = card.querySelector('.project-cover-inner');
    if (!cover) return;
    const previous = projectRevealTimelines.get(card);
    if (previous && typeof previous.kill === 'function') previous.kill();
    const timeline = gsap.to(cover, {
      clipPath: 'inset(0 0 0 0)',
      duration: 0.3,
      ease: 'power2.out'
    });
    projectRevealTimelines.set(card, timeline);
    trackEventTween(timeline);
  });
}


function resetProjectReveal() {
  qsa('.project-cover-inner').forEach((cover) => {
    if (hasGSAP) gsap.killTweensOf(cover);
    cover.style.clipPath = 'inset(0 0 0 0)';
  });
}

/* Modularization exports (public API of this feature module). */
export { initProjectImageReveal, resetProjectReveal };
