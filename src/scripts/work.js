/*!
 * work.js: halaman /work (migrasi Astro V7.0, Fase 4.2 + 5).
 * Filter kategori, render kartu proyek + slot reserved (perilaku V6.7:
 * reserved hanya tampil di view All, tidak dihitung), reveal arah pada
 * cover, batch entrance, dan dekorasi ruler galeri.
 */
import {
  DATA, doc, MOTION,
  el, qs, qsa, setText, showToast, fetchWithTimeout,
  buildHeading, buildTwoLineCardHeading, safeImage,
  scrollToTarget, setLenis, lenis, initEnv, SVG_NS, lenisTicker,
  isReducedMotion, motionRegistry, trackMotionListener, trackObserver,
  trackEventTween, trackAmbientTween, trackQuickTo,
  reducedMotion, finePointer, hasGSAP, hasScrollTrigger, hasLenis,
  pluginsRegistered, bootPage, cleanupMotionRegistry,
} from './core.js';

let activeFilter = 'All';
let galleryInView = false;
let emptyWasShown = false;
let batchTriggers = [];

function renderFilters() {
  const host = qs('#filter-controls');
  if (!host || !DATA) return;
  host.textContent = '';
  DATA.filters.forEach((filter) => {
    const button = el('button', 'filter-button', filter === 'All' ? 'All work' : filter);
    button.type = 'button';
    button.dataset.filter = filter;
    if (filter === 'All') button.classList.add('active');
    host.appendChild(button);
  });
}


function projectCardMarkup(project, index) {
  const card = el('article', 'project-card');

  const cover = el('div', 'project-cover');
  /* V7.4 Fase 2: nama view transition identik dengan kartu statis
     (ProjectCard.astro) supaya morph kartu -> cover case study tetap
     bekerja setelah renderProjects() membangun ulang grid saat boot
     maupun saat filter. Tanpa slug = tanpa nama (fallback fade). */
  if (project.slug) {
    cover.style.viewTransitionName = 'project-image-' + project.slug;
  }
  /* V6.3 §3.1.1: the img sits inside a .project-cover-inner clip layer.
     The inner div is the only element the hover reveal ever animates,
     so the entrance batch (scale on the img) and the directional
     reveal (clip-path on the inner) can never fight each other. */
  const coverInner = el('div', 'project-cover-inner');
  const img = doc.createElement('img');
  img.src = safeImage(project.image);
  img.alt = project.title + ': project cover illustration';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', function () { this.remove(); }, { once: true });
  coverInner.appendChild(img);
  cover.appendChild(coverInner);
  cover.appendChild(el('span', 'project-tag', project.tag || project.category || 'Project'));
  cover.appendChild(el('span', 'project-number', String(index + 1).padStart(2, '0') + ' / ARCHIVE'));
  card.appendChild(cover);

  const info = el('div', 'project-info');
  info.appendChild(el('h3', null, project.title));
  info.appendChild(el('p', 'project-desc', project.description));

  if (Array.isArray(project.stack) && project.stack.length) {
    const stack = el('div', 'project-stack');
    project.stack.forEach((tech) => stack.appendChild(el('span', 'stack-chip', tech)));
    info.appendChild(stack);
  }

  const foot = el('div', 'project-foot');
  const url = String(project.link || '').trim();
  // Honest footer: the status label is always shown; a link is only
  // rendered when it points to a real destination. Never a dead button.
  // V7.4 Fase 2: proyek ber-slug menaut ke halaman case study secara
  // internal agar transisi morph terjadi saat kartu diklik; tautan
  // dataset eksternal tetap tersedia sebagai CTA di halaman detail.
  if (project.status) foot.appendChild(el('span', 'project-status', project.status));
  if (project.slug) {
    const link = el('a', 'project-link', 'Read case study');
    link.href = '/work/' + project.slug;
    link.appendChild(el('span', 'project-link-arrow', '↗'));
    foot.appendChild(link);
  } else if (/^https?:\/\//i.test(url)) {
    const link = el('a', 'project-link', project.linkLabel || 'View project');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.appendChild(el('span', 'project-link-arrow', '↗'));
    foot.appendChild(link);
  }
  if (foot.childNodes.length) info.appendChild(foot);

  card.appendChild(info);
  return card;
}

/** Reserved "coming soon" slot: non-clickable, clearly labelled, and
 *  never counted as real work. Rendered only in the unfiltered view. */
function reservedCardMarkup(slot) {
  const card = el('article', 'project-card project-card--reserved');
  card.setAttribute('aria-label', 'Reserved placeholder: no project announced yet');
  card.appendChild(el('span', 'reserved-kicker', slot.kicker || 'COMING SOON'));
  card.appendChild(el('h3', 'reserved-title', slot.title || 'Reserved slot'));
  card.appendChild(el('p', 'reserved-text', slot.text || 'A future entry will live here.'));
  return card;
}


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

function renderProjects() {
  const grid = qs('#project-grid');
  const empty = qs('#empty-state');
  const count = qs('#project-count');
  if (!grid || !DATA) return;

  /* V5.3 §2.7: the hero search is now the Global Archive Navigator and
     no longer reads #search-input or filters this grid. The category
     filters below are the only project filter. */
  const visible = DATA.projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => activeFilter === 'All' || project.category === activeFilter);

  grid.textContent = '';
  visible.forEach(({ project, index }) => grid.appendChild(projectCardMarkup(project, index)));

  // Reserved slots appear only in the unfiltered All view; they are
  // placeholders, so they never surface through filters and never
  // inflate the project count.
  if (activeFilter === 'All' && Array.isArray(DATA.comingSoon)) {
    DATA.comingSoon.forEach((slot) => grid.appendChild(reservedCardMarkup(slot)));
  }

  // Motion-aware visibility: before the gallery has scrolled into view the
  // V5 batch owns the cards' entrance (setupProjectBatch); afterwards a
  // quick, honest micro-fade gives filter feedback without re-running
  // reveals.
  const cards = qsa('.project-card', grid);
  if (hasScrollTrigger && pluginsRegistered && !isReducedMotion() && !galleryInView) {
    setupProjectBatch(); // kills the previous batch, re-creates it on the fresh cards
  } else if (!isReducedMotion()) {
    cards.forEach((card, index) => {
      card.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 240, delay: Math.min(index, 5) * 50, easing: 'ease-out', fill: 'backwards' }
      );
    });
  }

  const nowEmpty = visible.length === 0;
  if (empty) {
    empty.hidden = !nowEmpty;
    // Empty state shake (5.2.2): fired once per transition into the empty
    // view (not on every interaction while it stays empty).
    if (nowEmpty && !emptyWasShown && hasGSAP && !isReducedMotion()) {
      gsap.fromTo(empty,
        { x: 0 },
        { x: 4, duration: 0.05, ease: 'none', yoyo: true, repeat: 7,
          onComplete: () => gsap.set(empty, { x: 0 }) }
      );
    }
  }
  emptyWasShown = nowEmpty;
  if (count) {
    count.textContent = String(visible.length).padStart(2, '0') + ' ' +
      (visible.length === 1 ? 'PROJECT' : (DATA.gallery.countLabel || 'PROJECTS'));
  }
  if (pluginsRegistered) window.ScrollTrigger.refresh();
}

/* Gallery category filters: the only project filter after V5.3. */
function initFilterControls() {
  qsa('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'All';
      qsa('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
      renderProjects();
    });
  });
}

/* V7.0: label ruler galeri (dekorasi) dipisah dari renderV4Sections. */
function renderGalleryRuler() {
  // V5.2 §4.2: measurement ticks above the project grid. Decorative
  // layout numbers only; the live count stays in #project-count.
  const decoGallery = DATA.decorations && DATA.decorations.gallery;
  if (decoGallery && Array.isArray(decoGallery.rulerLabels)) {
    qsa('.gallery-ruler span').forEach((span, index) => {
      if (decoGallery.rulerLabels[index]) span.textContent = decoGallery.rulerLabels[index];
    });
  }
}

const projectRevealTimelines = new WeakMap();

function initProjectImageReveal() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
  const grid = qs('#project-grid');
  if (!grid) return;

  trackMotionListener(grid, 'pointerover', (event) => {
    const cover = event.target.closest('.project-cover-inner');
    if (!cover) return;
    if (event.relatedTarget && cover.contains(event.relatedTarget)) return;

    const card = cover.closest('.project-card');
    if (!card) return;
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

    gsap.set(cover, { clipPath: initialClip });
    const timeline = gsap.to(cover, {
      clipPath: 'inset(0 0 0 0)',
      duration: 0.6,
      ease: 'power2.out'
    });
    projectRevealTimelines.set(card, timeline);
    trackEventTween(timeline);
  }, { passive: true });

  trackMotionListener(grid, 'pointerout', (event) => {
    const cover = event.target.closest('.project-cover-inner');
    if (!cover) return;
    if (event.relatedTarget && cover.contains(event.relatedTarget)) return;

    const card = cover.closest('.project-card');
    if (!card) return;
    const previous = projectRevealTimelines.get(card);
    if (previous && typeof previous.kill === 'function') previous.kill();
    const timeline = gsap.to(cover, {
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


function initGalleryBlueprint() {
  const deco = DATA && DATA.decorations && DATA.decorations.gallery;
  if (!deco || !deco.cornerBrackets) return;
  const inner = qs('.gallery-inner');
  if (!inner || inner.querySelector('.blueprint-corners')) return;
  const corners = el('div', 'blueprint-corners');
  corners.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) corners.appendChild(el('i'));
  inner.appendChild(corners);
}

/* --- §4.4: About margin annotations -------------------------------------- */
/* Two quiet mono annotations with leader lines in the About margins.
   They are decorative identities (observation style), not claims: no
   metrics, no percentages. Hidden on small viewports via CSS. */

function resetProjectReveal() {
  qsa('.project-cover-inner').forEach((cover) => {
    if (hasGSAP) gsap.killTweensOf(cover);
    cover.style.clipPath = 'inset(0 0 0 0)';
  });
}


function resetBatchTriggers() {
  motionRegistry.batchTriggers.forEach((trigger) => {
    if (trigger && typeof trigger.kill === 'function') trigger.kill();
  });
  motionRegistry.batchTriggers.clear();
  batchTriggers.forEach((trigger) => trigger.kill());
  batchTriggers = [];
}


/* ======================================================================
 * BOOT HALAMAN WORK
 * ==================================================================== */
bootPage({
  renders: [renderFilters, renderProjects, renderGalleryRuler],
  interactions: [initFilterControls, initGalleryBlueprint],
  motion: [initProjectImageReveal, setupProjectBatch],
  cleanups: [resetProjectReveal, resetBatchTriggers],
});
