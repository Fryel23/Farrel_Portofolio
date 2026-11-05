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
  const num = String(index + 1).padStart(2, '0');
  const card = el('article', 'project-card project-card--flagship');
  if (project.category) card.setAttribute('data-category', project.category);
  if (project.slug) card.setAttribute('data-slug', project.slug);

  const cTl = el('span', 'flagship-corner flagship-corner--tl', num);
  const cTr = el('span', 'flagship-corner flagship-corner--tr', 'CRB');
  const cBl = el('span', 'flagship-corner flagship-corner--bl', 'ISPU');
  const cBr = el('span', 'flagship-corner flagship-corner--br', '21–25');
  [cTl, cTr, cBl, cBr].forEach((corner) => {
    corner.setAttribute('aria-hidden', 'true');
    card.appendChild(corner);
  });

  const cover = el('div', 'project-cover');
  if (project.slug) {
    cover.style.viewTransitionName = 'project-image-' + project.slug;
  }
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
  cover.appendChild(el('span', 'project-number', num + ' / ARCHIVE'));
  card.appendChild(cover);

  const info = el('div', 'project-info');
  info.appendChild(el('span', 'flagship-kicker', num + ' / STUDI KASUS UTAMA · FLAGSHIP RESEARCH'));
  info.appendChild(el('h3', null, project.title));
  info.appendChild(el('p', 'project-desc', project.description));

  const summary = project.caseSummary || {
    problem: 'Masyarakat sulit membaca angka mentah SO₂ & NO₂ dari 23 titik pantau DLH.',
    method: 'Normalisasi time-series 2021–2025 sesuai ambang PermenLHK P.14/2020.',
    finding: 'Koridor padat lalu lintas konsisten mencatat konsentrasi NO₂ tertinggi.',
    impact: 'Dasbor interaktif (/lab) & dokumentasi terbuka untuk eksplorasi warga.',
  };
  const dl = el('dl', 'flagship-summary-grid');
  dl.setAttribute('aria-label', 'Ringkasan eksekutif studi kasus');
  [
    ['MASALAH', summary.problem],
    ['METODE', summary.method],
    ['TEMUAN UTAMA', summary.finding],
    ['DAMPAK', summary.impact],
  ].forEach(([term, desc]) => {
    const item = el('div', 'flagship-summary-item');
    item.appendChild(el('dt', null, term));
    item.appendChild(el('dd', null, desc));
    dl.appendChild(item);
  });
  info.appendChild(dl);

  if (Array.isArray(project.stack) && project.stack.length) {
    const stack = el('div', 'project-stack');
    project.stack.forEach((tech) => stack.appendChild(el('span', 'stack-chip', tech)));
    info.appendChild(stack);
  }

  const foot = el('div', 'project-foot');
  const url = String(project.link || '').trim();
  if (project.status) foot.appendChild(el('span', 'project-status', project.status));

  const ctaGroup = el('div', 'flagship-cta-group');
  if (project.slug) {
    const link = el('a', 'project-link project-link--primary', 'Buka Studi Kasus Lengkap');
    link.href = '/work/' + project.slug;
    link.appendChild(el('span', 'project-link-arrow', '↗'));
    ctaGroup.appendChild(link);

    const labLink = el('a', 'project-link project-link--lab', 'Coba AQI Explorer (/lab)');
    labLink.href = '/lab';
    labLink.appendChild(el('span', 'project-link-arrow', '→'));
    ctaGroup.appendChild(labLink);
  } else if (/^https?:\/\//i.test(url)) {
    const link = el('a', 'project-link', project.linkLabel || 'Lihat Proyek');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.appendChild(el('span', 'project-link-arrow', '↗'));
    ctaGroup.appendChild(link);
  }
  if (ctaGroup.childNodes.length) foot.appendChild(ctaGroup);
  if (foot.childNodes.length) info.appendChild(foot);

  card.appendChild(info);
  return card;
}

/** Reserved "coming soon" slot: non-clickable, clearly labelled, and
 *  never counted as real work. Rendered only in the unfiltered view. */
function reservedCardMarkup(slot, index = 0) {
  const code = 'RES-0' + String(index + 2);
  const card = el('article', 'project-card project-card--reserved reserved-card--ledger');
  card.setAttribute('aria-label', 'Slot arsip terjadwal: proyek belum dipublikasikan');

  const codeEl = el('div', 'reserved-ledger-code', code);
  codeEl.setAttribute('aria-hidden', 'true');
  card.appendChild(codeEl);

  const main = el('div', 'reserved-ledger-main');
  main.appendChild(el('span', 'reserved-kicker', slot.kicker || (code + ' · SLOT MENDATANG')));
  main.appendChild(el('h3', 'reserved-title', slot.title || 'Slot riset mendatang'));
  main.appendChild(el('p', 'reserved-text', slot.text || slot.description || 'Eksperimen ini sedang disiapkan dan akan dipublikasikan setelah dokumentasinya lengkap.'));
  card.appendChild(main);

  const meta = el('div', 'reserved-ledger-meta');
  meta.appendChild(el('span', 'reserved-ledger-cat', slot.category || 'ARSIP RISET'));
  meta.appendChild(el('span', 'reserved-ledger-badge', 'RESERVED'));
  card.appendChild(meta);

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
    DATA.comingSoon.forEach((slot, index) => grid.appendChild(reservedCardMarkup(slot, index)));
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
