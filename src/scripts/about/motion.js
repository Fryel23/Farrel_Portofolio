/*!
 * about/motion.js: About motion (modularized V11.1-M).
 *
 * Single responsibility: artwork parallax, journey progress rail
 * (motion + fallback IntersectionObserver), skill constellation draw,
 * dan reset rail/motion state. Semua tween ScrollTrigger once:true;
 * cleanup via reset functions milik modul ini.
 */
import {
  qs, qsa, MOTION, finePointer, hasGSAP, hasScrollTrigger, isReducedMotion,
  trackObserver, trackMotionListener, trackQuickTo,
} from '../core.js';

/* V7.0: parallax artwork about dipisah dari initPointerParallax
   (bagian hero pindah ke home.js). Perilaku identik. */
function initArtworkParallax() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
  const artwork = qs('.about-artwork');
  const art = qs('#profile-image');
  const backdrop = qs('.artwork-backdrop');
  if (artwork && art) {
    /* V6.5 §1.1: artwork + backdrop quickTo tracked via trackQuickTo. */
    const artX = gsap.quickTo(art, 'x', { duration: 0.8, ease: MOTION.easeSoft });
    const artY = gsap.quickTo(art, 'y', { duration: 0.8, ease: MOTION.easeSoft });
    const backX = backdrop ? gsap.quickTo(backdrop, 'x', { duration: 0.9, ease: MOTION.easeSoft }) : null;
    const backY = backdrop ? gsap.quickTo(backdrop, 'y', { duration: 0.9, ease: MOTION.easeSoft }) : null;
    trackQuickTo(artX);
    trackQuickTo(artY);
    trackQuickTo(backX);
    trackQuickTo(backY);

    trackMotionListener(artwork, 'mousemove', (event) => {
      const rect = artwork.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      artX(nx * 10);
      artY(ny * 8);
      if (backX && backY) { backX(nx * -14); backY(ny * -10); }
    });
    trackMotionListener(artwork, 'mouseleave', () => {
      artX(0); artY(0);
      if (backX && backY) { backX(0); backY(0); }
    });
  }
}


function initJourneyProgressMotion() {
  const wrap = qs('.journey-body');
  const fill = qs('#journey-rail-fill');
  const list = qs('#journey-list');
  if (!wrap || !fill || !list) return;
  const items = qsa('.journey-item', list);
  const nodes = qsa('.rail-node', wrap);

  // Ghost titles (5.4.4) only apply while motion drives the states.
  wrap.classList.add('js-motion');
  if (nodes.length) gsap.set(nodes, { scale: 0.7 });

  const activateNode = (node) => {
    if (!node) return;
    gsap.to(node, { scale: 1.2, duration: 0.2, ease: MOTION.easeSoft });
  };
  const pulseNode = (node) => {
    if (!node) return;
    gsap.fromTo(node,
      { scale: 1.2 },
      { scale: 1.5, duration: 0.3, yoyo: true, repeat: 1, ease: MOTION.easeSnap,
        onComplete: () => gsap.set(node, { scale: 1.2 }) }
    );
  };

  if (hasScrollTrigger) {
    const setFill = gsap.quickSetter(fill, 'scaleY');
    gsap.set(fill, { scaleY: 0 });
    window.ScrollTrigger.create({
      trigger: wrap,
      start: 'top 78%',
      end: 'bottom 55%',
      scrub: 0.4,
      onUpdate(self) {
        setFill(self.progress);
        if (items.length) {
          const activeCount = Math.max(1, Math.round(self.progress * items.length));
          items.forEach((item, index) => {
            const isActive = index < activeCount;
            const wasActive = item.classList.contains('is-active');
            item.classList.toggle('is-active', isActive);
            const node = nodes[index];
            if (node) {
              node.classList.toggle('is-active', isActive);
              if (isActive && !wasActive) {
                activateNode(node);
                pulseNode(node); // one pulse the moment it turns active
              }
            }
          });
        }
      }
    });
  } else if ('IntersectionObserver' in window) {
    // No ScrollTrigger: fill the rail once, honestly, on first view.
    const observer = trackObserver(new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        fill.animate(
          [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
          { duration: 900, easing: 'ease-out', fill: 'forwards' }
        );
        nodes.forEach((node, index) => {
          node.classList.add('is-active');
          gsap.to(node, { scale: 1.2, duration: 0.25, delay: index * 0.08, ease: MOTION.easeSoft });
        });
      });
    }, { threshold: 0.25 }));
    observer.observe(wrap);
  }
  // Reduced motion: CSS shows the completed rail; no toggling needed.
}

/* V6.3 §2.5.2: no-GSAP fallback for the journey rail (WAAPI + IO),
   used when GSAP itself is unavailable so the rail still fills once. */
function initJourneyProgressFallback() {
  if (hasGSAP) return;
  const wrap = qs('.journey-body');
  const fill = qs('#journey-rail-fill');
  if (!wrap || !fill || !('IntersectionObserver' in window)) return;
  const nodes = qsa('.rail-node', wrap);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      fill.animate(
        [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 900, easing: 'ease-out', fill: 'forwards' }
      );
      nodes.forEach((node) => node.classList.add('is-active'));
    });
  }, { threshold: 0.25 });
  observer.observe(wrap);
}

/* --- §4.7: Engraved Credential Archive framing --------------------------- */
/* Ruler lines with tick marks, corner plates, the archive plate label,
   and the archive stamp: a policy statement about the empty slots,
   never a claim that they are verified entries. The frame anchors to
   the credential grid itself so rulers hug the real area. */

/* --- §4.4: About constellation draw ------------------------------------- */
/* The decorative constellation draws its edges once when it enters the
   viewport. Without JS or motion the SVG simply renders complete.
   V6.3 §1.5: the constellation is an abstract network now - the
   DATA / SOFTWARE / AI / DATABASES / IOT labels were removed so the
   graphic cannot be misread as a verified skill map. */
function initSkillConstellation() {
  const wrap = qs('.skill-constellation-wrap');
  const svg = qs('.skill-constellation');
  if (!wrap || !svg || !hasGSAP || isReducedMotion()) return;
  const edges = qsa('.skill-constellation__edge', svg);
  const nodes = qsa('.skill-constellation__node', svg);
  if (!edges.length) return;

  edges.forEach((edge) => {
    const length = edge.getTotalLength ? edge.getTotalLength() : 220;
    gsap.set(edge, { strokeDasharray: length, strokeDashoffset: length });
  });
  if (nodes.length) gsap.set(nodes, { scale: 0, transformOrigin: '50% 50%' });

  const tl = gsap.timeline({
    scrollTrigger: { trigger: wrap, start: 'top 80%', once: true }
  });
  tl.to(edges, { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: MOTION.easeDraw });
  if (nodes.length) tl.to(nodes, { scale: 1, duration: 0.35, stagger: 0.07, ease: MOTION.easeSnap }, 0.35);
}

/* --- §3.2: Archive Spine / Margin Atlas --------------------------------- */
/* A consistent margin annotation system: a thin vertical measure line,
   tick marks, and one mono label per section, driven by the data file.
   Pure decoration: aria-hidden, pointer-events none, behind content,
   hidden on small viewports. One restrained reveal per section.
   V6.3 §2.5: the spine DOM is built once by buildArchiveSpines() during
   boot; initArchiveSpine() is the motion half that runs inside the
   matchMedia no-preference handler (and re-runs after each revert). */

function resetJourneyRail() {
  const fill = qs('#journey-rail-fill');
  if (fill && hasGSAP) gsap.set(fill, { scaleY: 0 });
}

function resetJourneyMotionState() {
  const wrap = qs('.journey-body');
  if (wrap) wrap.classList.remove('js-motion');
  qsa('.rail-node').forEach((node) => {
    if (hasGSAP) gsap.killTweensOf(node);
    node.style.transform = '';
  });
}

/* Modularization exports (public API of this feature module). */
export {
  initArtworkParallax, initJourneyProgressMotion,
  initJourneyProgressFallback, initSkillConstellation,
  resetJourneyRail, resetJourneyMotionState,
};
