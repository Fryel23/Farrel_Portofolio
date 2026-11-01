/*!
 * global/section-motion.js: generic section motion (modularized
 * V11.1-M).
 *
 * Single responsibility: buildHeadingTicks (DOM dekoratif sekali) dan
 * initSectionMotion (reveal heading, motto, chips, journey, social,
 * credentials, contact, closing, curiosity, geo drift) via
 * ScrollTrigger once:true. Berjalan di semua halaman; selector
 * di-guard agar halaman tanpa section terkait tidak memicu warning.
 */
import gsap from 'gsap';
import { doc, el, qs, qsa, MOTION, hasScrollTrigger, isReducedMotion } from '../core.js';

/* Field notes (5.3.3): sticky notes rendered from about.notes. Rotation
   is applied inline only when motion is allowed; reduced motion keeps
   the notes straight and static. */
/* V6.3 §2.10 fix: the heading ticks are DOM (built once, guarded) and
   their reveal tween is created separately by initSectionMotion() so a
   reduce -> normal round trip restores the full ScrollTrigger set. */
function buildHeadingTicks() {
  qsa('.display-heading').forEach((heading, idx) => {
    if (heading.querySelector('.heading-ticks')) return;
    const ticks = el('div', 'heading-ticks');
    ticks.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) ticks.appendChild(el('span'));
    ticks.appendChild(el('span', 'tick-label', '[ ' + String(idx + 1).padStart(2, '0') + ' ]'));
    heading.style.position = 'relative';
    heading.appendChild(ticks);
  });
}

function initSectionMotion() {
  if (!hasScrollTrigger) return;
  /* V5 §3.1: registration happens once in boot() before anything runs;
     calling gsap.registerPlugin here again is unnecessary. */

  // Section display headings: masked line reveal (different rhythm from hero)
  qsa('.display-heading, .curiosity-heading').forEach((heading) => {
    const lines = qsa('.line', heading);
    if (!lines.length) return;
    gsap.set(lines, { yPercent: 115 });
    gsap.to(lines, {
      yPercent: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: heading, start: 'top 82%', once: true }
    });
  });

  /* Measurement ticks (4.2): small ruler marks beside every display
     heading, numbered like archive figures. Decorative (aria-hidden);
     created here so a failed script leaves clean markup.
     V6.3 §2.10 fix: the ticks DOM is built once by buildHeadingTicks()
     in the boot render phase; the reveal tweens are re-created on every
     no-preference entry so the ScrollTrigger population after a
     reduce -> normal round trip is identical to the first boot. */
  qsa('.display-heading').forEach((heading) => {
    const ticks = heading.querySelector('.heading-ticks');
    if (!ticks) return;
    gsap.fromTo(qsa('span:not(.tick-label)', ticks),
      { scaleX: 0, opacity: 0, transformOrigin: 'right center' },
      {
        scaleX: 1, opacity: 0.5, duration: 0.3, stagger: 0.05, ease: MOTION.easeSoft,
        scrollTrigger: { trigger: heading, start: 'top 82%', once: true }
      }
    );
  });

  // Personal motto (5.7.2): word-by-word fade tied to the closing section.
  const mottoText = qs('#motto-text');
  if (mottoText && !isReducedMotion()) {
    const words = mottoText.textContent.split(' ');
    mottoText.textContent = '';
    words.forEach((word, idx) => {
      const span = el('span', 'motto-word', word);
      mottoText.appendChild(span);
      if (idx < words.length - 1) mottoText.appendChild(doc.createTextNode(' '));
    });
    gsap.fromTo(qsa('.motto-word', mottoText),
      { opacity: 0 },
      {
        opacity: 1, duration: 0.2, stagger: 0.03, ease: 'none',
        scrollTrigger: { trigger: '.closing-motto', start: 'top 85%', once: true }
      }
    );
  }

  /* V5 §3.3: project card reveals run through ScrollTrigger.batch.
     setupProjectBatch lives at module scope because renderProjects()
     rebuilds the batch whenever the grid is re-rendered below the
     viewport. */

  /* V8.1 Fase 5: setiap blok di bawah ini dijaga dengan pemeriksaan
     keberadaan target (gsap.utils.toArray + length) agar GSAP tidak
     mencatat peringatan "target not found" di halaman yang tidak
     memiliki section tersebut. initSectionMotion berjalan di semua
     halaman, sedangkan selector di bawah hanya ada di halaman tertentu. */

  // About copy: calm rhythm (halaman /about)
  const aboutTargets = gsap.utils.toArray('.about-lead, .about-body');
  if (aboutTargets.length) {
    gsap.set(aboutTargets, { opacity: 0, y: 26 });
    gsap.to(aboutTargets, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-layout', start: 'top 78%', once: true }
    });
  }

  // Chips: short stagger (transform cleared afterwards so the CSS hover
  // lift and the :active press (5.3.5) can take over)
  const softwareChips = gsap.utils.toArray('.software-chip');
  if (softwareChips.length) {
    gsap.set(softwareChips, { opacity: 0, scale: 0.85 });
    gsap.to(softwareChips, {
      opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.software-block', start: 'top 85%', once: true }
    });
  }
  const skillChips = gsap.utils.toArray('.skill-chip');
  if (skillChips.length) {
    gsap.set(skillChips, { opacity: 0, y: 14 });
    gsap.to(skillChips, {
      opacity: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.skills-block', start: 'top 85%', once: true }
    });
  }

  // Journey + education: sequential, emphasis on titles
  const journeyItems = gsap.utils.toArray('.journey-item');
  if (journeyItems.length) {
    gsap.set(journeyItems, { opacity: 0, x: -18 });
    gsap.to(journeyItems, {
      opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-list', start: 'top 84%', once: true }
    });
  }
  const resumeCards = gsap.utils.toArray('.resume-card');
  if (resumeCards.length) {
    gsap.set(resumeCards, { opacity: 0, y: 40 });
    gsap.to(resumeCards, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-grid', start: 'top 86%', once: true }
    });
  }

  // Social cards: measured stagger (grid dirender renderSocials di /connect)
  const socialCards = gsap.utils.toArray('.social-card');
  if (socialCards.length) {
    gsap.set(socialCards, { opacity: 0, y: 30 });
    gsap.to(socialCards, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.social-grid', start: 'top 86%', once: true }
    });
  }

  // Credentials: restrained entrance; reserved slots stay quiet
  const credentialTargets = gsap.utils.toArray('.credential-card, .credential-slot');
  if (credentialTargets.length) {
    gsap.set(credentialTargets, { opacity: 0, y: 26 });
    gsap.to(credentialTargets, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.credential-grid', start: 'top 86%', once: true }
    });
  }

  // Contact block: modest entrance for the email cards
  const contactTargets = gsap.utils.toArray('.contact-heading, .contact-card, .contact-note');
  if (contactTargets.length) {
    gsap.set(contactTargets, { opacity: 0, y: 22 });
    gsap.to(contactTargets, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact-block', start: 'top 88%', once: true }
    });
  }

  // Closing: oversized typography reveal
  const solid = qs('.closing-solid .line');
  const outline = qs('.closing-outline .line');
  if (solid) {
    gsap.set(solid, { yPercent: 110 });
    gsap.to(solid, {
      yPercent: 0, duration: 0.85, ease: 'power3.out',
      scrollTrigger: { trigger: '.closing-name', start: 'top 90%', once: true }
    });
  }
  if (outline) {
    gsap.set(outline, { opacity: 0, y: 24 });
    gsap.to(outline, {
      opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.closing-name', start: 'top 90%', once: true }
    });
  }

  /* Footer outline-to-solid fill (12.8): one scroll-linked clip-path
     sweep as the name enters. Reduced motion renders the final state
     via CSS instead. */
  const outlineFill = qs('.closing-outline-fill');
  if (outlineFill) {
    gsap.fromTo(outlineFill,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)', ease: 'none',
        scrollTrigger: { trigger: '.closing-name', start: 'top 92%', end: 'top 55%', scrub: 0.5 }
      }
    );
  }

  /* Curiosity Map (12.2): heading reveal + quiet node stagger. The
     transform is released afterwards so the CSS hover offset applies. */
  const curiosityNodes = qsa('.curiosity-node');
  if (curiosityNodes.length) {
    gsap.set(curiosityNodes, { opacity: 0, y: 16 });
    gsap.to(curiosityNodes, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: MOTION.easeSoft,
      clearProps: 'transform',
      scrollTrigger: { trigger: '.curiosity-map', start: 'top 82%', once: true }
    });
  }
  const curiosityPanels = gsap.utils.toArray('.curiosity-panel, .curiosity-intro');
  if (curiosityPanels.length) {
    gsap.set(curiosityPanels, { opacity: 0, y: 18 });
    gsap.to(curiosityPanels, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: MOTION.easeSoft,
      scrollTrigger: { trigger: '.curiosity-map', start: 'top 78%', once: true }
    });
  }

  /* Learning Journey rail (12.5): called from boot() so its
     IntersectionObserver fallback also works without GSAP. */

  /* V5 §3.2: decorative geometry no longer runs a permanent scrub.
     Each shape drifts once into place when its section enters the
     viewport (once: true). Scrub is reserved for the journey rail and
     the closing outline fill, which are designed to follow scroll. */
  if (window.matchMedia('(min-width: 701px)').matches) {
    const drifts = [
      ['.geo-two', 22], ['.geo-three', -16],
      ['.geo-four', -18], ['.geo-five', 20],
      ['.geo-six', -14], ['.geo-seven', 16]
    ];
    drifts.forEach(([selector, distance]) => {
      const node = qs(selector);
      if (!node) return;
      const section = node.closest('section');
      if (!section) return;
      gsap.fromTo(node,
        { y: Math.round(distance / 2) },
        {
          y: distance, duration: 1.1, ease: MOTION.easeSoft,
          scrollTrigger: { trigger: section, start: 'top 88%', once: true }
        }
      );
    });
  }

  /* V5 §3.2: the deferred full-load refresh is owned by
     initVisibilityPause() inside the matchMedia handler so it is
     registered exactly once per motion session. */
}

/* Modularization exports (public API of this feature module). */
export { buildHeadingTicks, initSectionMotion };
