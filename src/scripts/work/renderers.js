/*!
 * work/renderers.js: project grid rendering (modularized V11.1-M).
 *
 * Single responsibility: markup kartu proyek + reserved slot dan
 * renderProjects (grid, empty state, count). Struktur DOM dan
 * transition:name dipertahankan untuk Astro morph transition.
 * renderProjects memanggil syncWebGLPlanes() (webgl-hover) setelah
 * grid dibangun ulang - satu arah, tanpa siklus.
 */
import {
  DATA, doc, el, qs, qsa, safeImage,
  hasGSAP, hasScrollTrigger, isReducedMotion, pluginsRegistered,
} from '../core.js';
import { activeFilter } from './filters.js';
import { galleryInView, setupProjectBatch } from './batch-motion.js';
import { syncWebGLPlanes } from './webgl-hover.js';

/* Module-level render state (baseline): empty-state shake fires once
   per transition into the empty view. Owner: renderProjects. */
let emptyWasShown = false;

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
  /* V8.0 Fase 3: grid dibangun ulang -> plane WebGL untuk kartu lama
     dibuang dan plane baru dibuat untuk kartu yang tersisa. */
  syncWebGLPlanes();
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

/* Modularization exports (public API of this feature module).
   renderFilters & initFilterControls dimiliki filters.js; galleryInView
   live binding dimiliki batch-motion.js. */
export { renderProjects, renderGalleryRuler, initGalleryBlueprint };
