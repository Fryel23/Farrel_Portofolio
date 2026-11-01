/*!
 * home/hero-motion.js: decorative Hero motion (modularized V11.1-M).
 *
 * Single responsibility: persiapan & entrance ELEMEN DEKORATIF hero
 * (scanline, pixel frame, floating tools, sticker, Data Atlas),
 * ambient atlas, hero dust, dan pointer parallax. Kontrak V11.0:
 * headline/deskripsi/CTA/search TIDAK PERNAH disembunyikan; search
 * tidak menunggu animasi.
 */
import {
  doc, el, qs, qsa, MOTION, finePointer, reducedMotion,
  hasGSAP, hasScrollTrigger, isReducedMotion, motionRegistry,
  trackMotionListener, trackEventTween, trackAmbientTween, trackQuickTo,
} from '../core.js';

/* ======================================================================
 * V11.0 FASE 3 (refactor V9.0 FASE 3.1): kontrak hero baru sesuai
 * Curtain Pattern. Kedua fungsi TIDAK lagi bergantung pada Opening:
 *   - prepareHeroState(): HANYA persiapan dekorasi (scanline + gsap.set
 *     pada elemen pendukung). KONTEN UTAMA TIDAK PERNAH disembunyikan:
 *     headline, tagline, deskripsi, actions (CTA + search), eyebrow,
 *     note, dan scroll-cue berada pada posisi final sejak HTML render
 *     (spek §3.1 NO HIDDEN HERO + §6.1).
 *   - animateHeroIn(): entrance elemen dekoratif saja (pixel frame,
 *     floating tools, sticker, atlas, scanline). Dipanggil langsung di
 *     boot gate global.js - tanpa menunggu completion apa pun (spek
 *     §3.8), dan tetap aman bila Curtain tidak pernah aktif.
 * ==================================================================== */
export function prepareHeroState() {
  const hero = qs('.hero');
  if (!hero || !hasGSAP) return;

  // Scanline elements (5.1.1): one per masked headline line, appended
  // during preparation so they are already in place when the decorative
  // beam sweeps (animateHeroIn never mutates the DOM). Beam dekoratif:
  // tidak pernah menyembunyikan teks (pointer-events none, overlay tipis).
  qsa('.hero-title .line-mask').forEach((mask) => {
    if (!mask.querySelector('.scanline')) {
      const scan = el('span', 'scanline');
      scan.setAttribute('aria-hidden', 'true');
      mask.appendChild(scan);
    }
  });

  /* Dekorasi visual pendukung: entrance tetap punya karakter, konten
     utama tidak tersentuh (posisi final sejak frame pertama, spek §3.2). */
  gsap.set('#pixel-frame', { opacity: 0, y: 40, rotate: -14, scale: 0.96 });
  gsap.set('.floating-tool', { opacity: 0, scale: 0.5, y: 10 });
  gsap.set('.hero-sticker', { opacity: 0, scale: 0.9 });

  /* Data Atlas prep (12.1): ukur panjang path dan sembunyikan node.
     Semua gsap.set murni - bagian dari persiapan, bukan animasi. */
  qsa('.atlas-path').forEach((path) => {
    const length = path.getTotalLength ? path.getTotalLength() : 0;
    if (length) gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  });
  gsap.set(['.atlas-node', '.atlas-cross'], { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
}

export function animateHeroIn() {
  const hero = qs('.hero');
  if (!hero || !hasGSAP) return;

  /* V11.0: HANYA dekorasi - tidak ada teks/CTA/search di timeline ini.
     Semua elemen konten utama sudah terlihat sejak initial render. */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('#pixel-frame', { opacity: 1, y: 0, rotate: -7, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.1)
    .to('.floating-tool', { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' }, 0.35)
    .to('.hero-sticker', { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.45);

  // Scanline sweep (5.1.1): a light beam crosses each masked line once.
  // Dekoratif; teks sudah terbaca penuh sejak frame pertama.
  tl.fromTo('.scanline',
    { x: '-100%' },
    { x: '100%', duration: 0.6, ease: 'power2.inOut', stagger: 0.09 },
    0.1
  );

  /* Data Atlas entrance (12.1): paths draw themselves in, nodes and
     labels follow. Decorative only, nothing here hides content. */
  const atlasPaths = qsa('.atlas-path');
  if (atlasPaths.length) {
    tl.to(atlasPaths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.25, ease: 'power2.inOut' }, 0.55);
  }
  tl.to(['.atlas-node', '.atlas-cross'], { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: MOTION.easeSoft }, 0.9);
  tl.fromTo('.atlas-label', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.08, ease: MOTION.easeSoft }, 1.15);
  tl.fromTo('.atlas-tick', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.3);

  // Ambient atlas loops (4.1) start only after the entrance finishes.
  tl.eventCallback('onComplete', startAtlasAmbient);
  /* V9.0 (Batasan 9): timeline dibuat asinkron dari callback wipe, di
     luar kepemilikan gsap.matchMedia, sehingga didaftarkan ke registry
     agar teardown navigasi pasti membunuhnya (trackEventTween tetap
     mempertahankan onComplete asli startAtlasAmbient). */
  return trackEventTween(tl);
}

/* Data Atlas breathing (4.1): once the entrance ends, the field keeps
   living quietly. Node dots pulse, one path flows. Both loops are
   created PAUSED and only play while the hero is on screen (ScrollTrigger
   enter/leave), so nothing runs off-screen. Reduced motion: never starts.
   V6.3 §2.3: the loops are created asynchronously from the intro's
   onComplete, so they are registered in motionRegistry.ambientTweens
   and the visibility trigger in motionRegistry.scrollTriggers; the
   started flag is reset by resetAtlasAmbient() during cleanup. */
let atlasAmbientStarted = false;
function startAtlasAmbient() {
  if (atlasAmbientStarted || !hasGSAP || isReducedMotion()) return;
  atlasAmbientStarted = true;

  const rings = qsa('.atlas-node circle:first-child');
  const flowPath = qs('.atlas-path-a');
  const loops = [];

  if (rings.length) {
    loops.push(trackAmbientTween(gsap.to(rings, {
      scale: 1.3,
      transformOrigin: '50% 50%',
      duration: 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.4, from: 'random' },
      paused: true
    })));
  }
  if (flowPath) {
    // Entrance already set strokeDasharray to the path length; keep that
    // dash and slide the offset linearly for a slow current.
    const length = flowPath.getTotalLength ? flowPath.getTotalLength() : 600;
    gsap.set(flowPath, { strokeDasharray: length, strokeDashoffset: 0 });
    loops.push(trackAmbientTween(gsap.to(flowPath, {
      strokeDashoffset: '-=200',
      duration: 10,
      ease: 'none',
      repeat: -1,
      paused: true
    })));
  }
  if (!loops.length) return;

  const play = () => loops.forEach((tw) => tw.play());
  const pause = () => loops.forEach((tw) => tw.pause());

  if (hasScrollTrigger) {
    motionRegistry.scrollTriggers.add(window.ScrollTrigger.create({
      trigger: '.hero',
      start: 'top bottom',
      end: 'bottom top',
      onEnter: play,
      onEnterBack: play,
      onLeave: pause,
      onLeaveBack: pause
    }));
  }
  play(); // the hero is in view when the entrance completes
}

function buildHeroDust() {
  const heroVisual = qs('.hero-visual');
  if (!heroVisual || qs('.pixel-dust', heroVisual)) return;
  for (let i = 0; i < 14; i++) {
    const particle = el('span', 'pixel-dust');
    particle.style.left = (10 + Math.random() * 80) + '%';
    particle.style.top = (10 + Math.random() * 80) + '%';
    heroVisual.appendChild(particle);
  }
}

function initPointerParallax() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;

  const hero = qs('.hero');
  const frame = qs('#pixel-frame');
  const nodesLayer = qs('.data-atlas .atlas-nodes');
  const pathsLayer = qs('.data-atlas .atlas-paths');
  const toolEls = qsa('.floating-tool');

  // Pixel dust (4.5): tiny particles scattered around the identity card
  // that are gently repelled by the pointer. Uses its own quickTo pair
  // per particle; no shared transforms with the tilt handler below.
  const heroVisual = qs('.hero-visual');
  const dustNodes = heroVisual ? qsa('.pixel-dust', heroVisual) : [];
  if (heroVisual && dustNodes.length) {
    /* V6.5 §1.1: every quickTo tween is registered with trackQuickTo
       so the reduce cleanup can kill it (no onComplete self-removal). */
    const dust = dustNodes.map((particle) => {
      const xTo = gsap.quickTo(particle, 'x', { duration: 0.5, ease: MOTION.easeSoft });
      const yTo = gsap.quickTo(particle, 'y', { duration: 0.5, ease: MOTION.easeSoft });
      /* V6.5 §1.1: quickTo is now tracked via trackQuickTo so its parked
         tween stays in the registry until the reduce cleanup kills it. */
      trackQuickTo(xTo);
      trackQuickTo(yTo);
      return { node: particle, xTo, yTo };
    });
    trackMotionListener(hero, 'mousemove', (event) => {
      const rect = hero.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      dust.forEach((p) => {
        const node = p.node;
        const nx = (parseFloat(node.style.left) / 100) * rect.width;
        const ny = (parseFloat(node.style.top) / 100) * rect.height;
        const dx = nx - mx;
        const dy = ny - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120;
        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 10;
          p.xTo((dx / dist) * force);
          p.yTo((dy / dist) * force);
        } else {
          p.xTo(0);
          p.yTo(0);
        }
      });
    });
    trackMotionListener(hero, 'mouseleave', () => {
      dust.forEach((p) => { p.xTo(0); p.yTo(0); });
    });
  }

  if (hero && frame) {
    gsap.set(frame, { transformPerspective: 900 });
    /* V6.5 §1.1: every quickTo below (frame, tools, atlas layers) is
       registered through trackQuickTo, which keeps the parked tween in
       the registry for the whole motion session (the V6.4 leak fix). */
    const frameX = gsap.quickTo(frame, 'x', { duration: 0.7, ease: MOTION.easeSoft });
    const frameY = gsap.quickTo(frame, 'y', { duration: 0.7, ease: MOTION.easeSoft });
    const frameRX = gsap.quickTo(frame, 'rotationX', { duration: 0.6, ease: MOTION.easeSoft });
    const frameRY = gsap.quickTo(frame, 'rotationY', { duration: 0.6, ease: MOTION.easeSoft });
    trackQuickTo(frameX);
    trackQuickTo(frameY);
    trackQuickTo(frameRX);
    trackQuickTo(frameRY);
    const toolX = toolEls.map((tool) => {
      const fn = gsap.quickTo(tool, 'x', { duration: 0.8, ease: MOTION.easeSoft });
      trackQuickTo(fn);
      return fn;
    });
    const toolY = toolEls.map((tool) => {
      const fn = gsap.quickTo(tool, 'y', { duration: 0.8, ease: MOTION.easeSoft });
      trackQuickTo(fn);
      return fn;
    });
    const nodesX = nodesLayer ? gsap.quickTo(nodesLayer, 'x', { duration: 0.9, ease: MOTION.easeSoft }) : null;
    const nodesY = nodesLayer ? gsap.quickTo(nodesLayer, 'y', { duration: 0.9, ease: MOTION.easeSoft }) : null;
    const pathsX = pathsLayer ? gsap.quickTo(pathsLayer, 'x', { duration: 1.0, ease: MOTION.easeSoft }) : null;
    const pathsY = pathsLayer ? gsap.quickTo(pathsLayer, 'y', { duration: 1.0, ease: MOTION.easeSoft }) : null;
    trackQuickTo(nodesX);
    trackQuickTo(nodesY);
    trackQuickTo(pathsX);
    trackQuickTo(pathsY);

    trackMotionListener(hero, 'mousemove', (event) => {
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;

      frameX(nx * 14);
      frameY(ny * 10);
      // Capped tilt: 2 to 4 degrees per axis, calm and reversible.
      frameRY(nx * 3);
      frameRX(ny * -3);

      toolEls.forEach((_, index) => {
        toolX[index](nx * -9 * (index + 1) * 0.6);
        toolY[index](ny * -7 * (index + 1) * 0.6);
      });

      if (nodesX && nodesY) { nodesX(nx * 9); nodesY(ny * 7); }
      if (pathsX && pathsY) { pathsX(nx * -5); pathsY(ny * -4); }

      // Pointer-lit highlight follows the cursor across the card.
      const frameRect = frame.getBoundingClientRect();
      if (frameRect.width && frameRect.height) {
        frame.style.setProperty('--hl-x', (((event.clientX - frameRect.left) / frameRect.width) * 100).toFixed(1) + '%');
        frame.style.setProperty('--hl-y', (((event.clientY - frameRect.top) / frameRect.height) * 100).toFixed(1) + '%');
      }
      frame.classList.add('is-lit');
    });
    trackMotionListener(hero, 'mouseleave', () => {
      frameX(0); frameY(0); frameRX(0); frameRY(0);
      toolX.forEach((fn) => fn(0));
      toolY.forEach((fn) => fn(0));
      if (nodesX && nodesY) { nodesX(0); nodesY(0); }
      if (pathsX && pathsY) { pathsX(0); pathsY(0); }
      frame.classList.remove('is-lit');
    });
  }
}


function resetAtlasAmbient() {
  atlasAmbientStarted = false;
}


/* ======================================================================
 * BOOT HALAMAN HOME

/* prepareHeroState & animateHeroIn keep their baseline inline `export`
   (public API consumed by global.js boot gate + home.js facade). */
export { buildHeroDust, initPointerParallax, resetAtlasAmbient };
