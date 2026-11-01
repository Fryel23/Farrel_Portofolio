/*!
 * global/decorations.js: sitewide decorations (modularized V11.1-M).
 *
 * Single responsibility: ambient pixel debris, SVG ornamen V6.5
 * (radar, crypto rings, crosshair), dan archive spine - builder DOM
 * (dipanggil dari boot renders) + motion half-nya. Dekorasi tetap
 * aria-hidden, pointer-events aman, guard media tidak berubah.
 */
import gsap from 'gsap';
import {
  DATA, doc, el, qs, qsa, SVG_NS, MOTION,
  hasGSAP, hasScrollTrigger,
} from '../core.js';


const DECORATION_DEBRIS = {
  hero: ['diamond', 'diamond', 'diamond', 'diamond', 'diamond'],
  work: ['tag', 'tag', 'tag', 'folder'],
  games: ['button', 'button', 'stick', 'dpad'],
  about: ['note', 'note', 'paper'],
  offscreen: ['note', 'shuttle', 'note'],
  github: ['node', 'node', 'branch'],
  credentials: ['seal', 'seal', 'ribbon'],
  companion: ['footprint', 'footprint', 'bone'],
  profiles: ['envelope', 'envelope']
};

/* Rect-only 16x16 debris shapes, --px-* fills only, 5 rects max. */
const DEBRIS_SHAPES = {
  diamond: [
    [7, 2, 2, 2, 'var(--px-blue)'],
    [5, 4, 6, 2, 'var(--px-blue)'],
    [3, 6, 10, 2, 'var(--px-blue)'],
    [5, 8, 6, 2, 'var(--px-blue)'],
    [7, 10, 2, 2, 'var(--px-blue)']
  ],
  tag: [
    [3, 3, 8, 6, 'var(--px-slate)'],
    [4, 4, 2, 2, 'var(--px-gold)'],
    [11, 5, 2, 1, 'var(--px-wood)']
  ],
  folder: [
    [2, 3, 5, 2, 'var(--px-wood-dark)'],
    [2, 4, 12, 8, 'var(--px-wood)'],
    [3, 6, 6, 1, 'var(--px-wood-dark)']
  ],
  button: [
    [4, 4, 8, 8, 'var(--px-pink)'],
    [5, 5, 3, 2, 'var(--px-ivory)']
  ],
  stick: [
    [7, 2, 2, 6, 'var(--px-steel)'],
    [4, 8, 8, 3, 'var(--px-black)']
  ],
  dpad: [
    [6, 3, 4, 10, 'var(--px-slate)'],
    [3, 6, 10, 4, 'var(--px-slate)']
  ],
  note: [
    [6, 2, 2, 8, 'var(--px-navy)'],
    [4, 9, 4, 3, 'var(--px-navy)'],
    [8, 2, 3, 2, 'var(--px-navy)']
  ],
  paper: [
    [3, 2, 10, 12, 'var(--px-ivory)'],
    [4, 4, 8, 1, 'var(--px-steel)'],
    [4, 6, 8, 1, 'var(--px-steel)'],
    [4, 8, 6, 1, 'var(--px-steel)']
  ],
  shuttle: [
    [7, 2, 2, 6, 'var(--px-ivory)'],
    [5, 8, 6, 3, 'var(--px-ivory)'],
    [6, 11, 4, 1, 'var(--px-gold)']
  ],
  node: [
    [6, 6, 4, 4, 'var(--px-blue)'],
    [7, 1, 2, 2, 'var(--px-blue)'],
    [1, 7, 2, 2, 'var(--px-blue)'],
    [13, 7, 2, 2, 'var(--px-blue)'],
    [7, 12, 2, 2, 'var(--px-blue)']
  ],
  branch: [
    [7, 2, 2, 12, 'var(--px-wood)'],
    [3, 6, 2, 2, 'var(--px-python-blue)'],
    [11, 4, 2, 2, 'var(--px-python-blue)']
  ],
  seal: [
    [4, 4, 8, 8, 'var(--px-gold)'],
    [3, 6, 10, 4, 'var(--px-gold)'],
    [5, 6, 6, 4, 'var(--px-navy)']
  ],
  ribbon: [
    [4, 2, 8, 7, 'var(--px-pink)'],
    [5, 9, 2, 5, 'var(--px-pink)'],
    [9, 9, 2, 5, 'var(--px-pink)'],
    [7, 4, 2, 3, 'var(--px-gold)']
  ],
  footprint: [
    [4, 3, 3, 6, 'var(--px-wood-dark)'],
    [4, 9, 3, 2, 'var(--px-wood-dark)'],
    [9, 7, 3, 6, 'var(--px-wood-dark)']
  ],
  bone: [
    [3, 6, 10, 3, 'var(--px-ivory)'],
    [2, 5, 3, 2, 'var(--px-ivory)'],
    [11, 8, 3, 2, 'var(--px-ivory)']
  ],
  envelope: [
    [2, 4, 12, 9, 'var(--px-slate)'],
    [2, 4, 12, 4, 'var(--px-steel)'],
    [7, 7, 2, 2, 'var(--px-gold)']
  ]
};

/* Section id -> element selector (the hero section has no id). */
const DEBRIS_SELECTORS = {
  hero: '.hero',
  work: '#work',
  games: '#games',
  about: '#about',
  offscreen: '#offscreen',
  github: '#github',
  credentials: '#credentials',
  companion: '#companion',
  profiles: '#profiles'
};

function buildAmbientDebris(sectionId, container) {
  if (!container || qs('.ambient-debris', container)) return;
  const kinds = DECORATION_DEBRIS[sectionId];
  if (!Array.isArray(kinds) || !kinds.length) return;

  const field = el('div', 'ambient-debris');
  field.setAttribute('aria-hidden', 'true');
  const total = kinds.length;
  const leftShare = Math.max(1, Math.ceil(total * 0.6));

  kinds.forEach((kind, index) => {
    const layers = DEBRIS_SHAPES[kind];
    if (!layers) return;
    const item = el('span', 'ambient-debris-item');
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('focusable', 'false');
    layers.forEach((layer) => {
      const rect = doc.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(layer[0]));
      rect.setAttribute('y', String(layer[1]));
      rect.setAttribute('width', String(layer[2]));
      rect.setAttribute('height', String(layer[3]));
      rect.setAttribute('fill', layer[4]);
      svg.appendChild(rect);
    });
    item.appendChild(svg);

    /* Vertical spread: items 0 and 1 always above 30%; items after
       that walk down; at most 3 land below 70% (tops 76/84/90). */
    let top;
    if (index === 0) top = 10;
    else if (index === 1) top = 22;
    else top = Math.min(90, 36 + (index - 2) * 16);
    top += (index % 2 === 0 ? -2 : 2); // deterministic jitter
    /* Horizontal: 60% of the items hug the left margin, 40% the right. */
    const leftSide = index < leftShare;
    if (leftSide) item.style.left = (2 + (index % 3) * 2) + '%';
    else item.style.right = (2 + (index % 2) * 3) + '%';
    item.style.top = top + '%';
    field.appendChild(item);
  });

  container.appendChild(field);
}

/* DOM-only builder, called once from boot() before any motion starts. */
function buildAllAmbientDebris() {
  Object.keys(DECORATION_DEBRIS).forEach((sectionId) => {
    buildAmbientDebris(sectionId, qs(DEBRIS_SELECTORS[sectionId]));
  });
}

/* ======================================================================
 * V6.5 §3.2 + §4: SCIENTIFIC ARCHIVE ORNAMENTS (SVG, generative)
 * ==================================================================== */
/* Helper (V6.5 §3.2): wraps a hardcoded developer-authored SVG string
   in the standard .ornament contract (aria-hidden, pointer-events none,
   z-index layering). innerHTML is used ONLY for the constants below;
   user data never reaches this function. */
function createSvgOrnament(className, viewBox, innerSvgString) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'ornament ' + className;
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML =
    '<svg viewBox="' + viewBox + '" focusable="false">' + innerSvgString + '</svg>';
  return wrapper;
}

/* Inner SVG bodies for the three V6.5 SVG ornaments (verbatim from the
   V6.5 spec, Fase 4.1 / 4.3 / 4.6). */
const V65_RADAR_INNER =
  '<circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<line class="radar-beam" x1="100" y1="100" x2="100" y2="10" stroke="currentColor" stroke-width="1.5"/>';
const V65_CRYPTO_RINGS_INNER =
  '<circle class="ring-outer" cx="200" cy="200" r="180" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 8"/>' +
  '<circle class="ring-inner" cx="200" cy="200" r="120" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 6"/>';
const V65_CROSSHAIR_INNER =
  '<line x1="400" y1="0" x2="400" y2="400" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<line x1="0" y1="200" x2="800" y2="200" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="400" cy="200" r="180" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="400" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="8 16" opacity="0.3"/>';

/* DOM-only builder (Fase 4): mounts the three SVG ornaments. The
   canvases for 4.2/4.4/4.5 are static markup in index.html and are
   owned by generative-ambient.js; these three are injected here so the
   markup stays declarative and every ornament shares one helper. */
function buildV65Ornaments() {
  /* 4.1 Curiosity Map: sonar/radar sweep inside the field-notes panel,
     rendered behind the panel content (z-index -1 + panel isolation). */
  const panel = qs('#curiosity-panel');
  if (panel && !qs('.ornament-radar-sweep', panel)) {
    panel.insertBefore(
      createSvgOrnament('ornament-radar-sweep', '0 0 200 200', V65_RADAR_INNER),
      panel.firstChild
    );
  }
  /* 4.3 Credentials: two counter-rotating dashed rings behind the
     credential grid, mounted at section level so they sit below
     .credentials-inner entirely. */
  const credentials = qs('#credentials');
  if (credentials && !qs('.ornament-crypto-rings', credentials)) {
    credentials.insertBefore(
      createSvgOrnament('ornament-crypto-rings', '0 0 400 400', V65_CRYPTO_RINGS_INNER),
      credentials.firstChild
    );
  }
  /* 4.6 Closing: observatory crosshair behind the closing name. */
  const closing = qs('#closing');
  if (closing && !qs('.ornament-closing-crosshair', closing)) {
    closing.insertBefore(
      createSvgOrnament('ornament-closing-crosshair', '0 0 800 400', V65_CROSSHAIR_INNER),
      closing.firstChild
    );
  }
}

/* --- Section 06: GitHub Activity (V4 §7) ------------------------------- */
/* Live REST data with a one hour localStorage cache. No streaks, no
   commit totals: only metrics the REST API can honestly provide. */

function buildArchiveSpines() {
  const spineConfig = DATA && DATA.decorations && DATA.decorations.spine;
  if (!spineConfig) return;
  Object.keys(spineConfig).forEach((key) => {
    const section = key === 'hero' ? qs('.hero') : qs('#' + key);
    const label = spineConfig[key];
    if (!section || !label || section.querySelector('.archive-spine')) return;

    const spine = el('div', 'archive-spine');
    spine.setAttribute('aria-hidden', 'true');
    const ticks = el('span', 'archive-spine__ticks');
    for (let i = 0; i < 7; i++) ticks.appendChild(el('i'));
    spine.appendChild(ticks);
    spine.appendChild(el('span', 'archive-spine__label', label));
    section.appendChild(spine);
  });
}

function initArchiveSpine() {
  if (!hasGSAP || !hasScrollTrigger) return;
  qsa('.archive-spine').forEach((spine) => {
    const section = spine.closest('section') || spine.parentElement;
    if (!section) return;
    gsap.fromTo(spine,
      { opacity: 0, x: -8 },
      {
        opacity: 1, x: 0, duration: 0.7, ease: MOTION.easeSoft,
        scrollTrigger: { trigger: section, start: 'top 88%', once: true },
        clearProps: 'transform'
      }
    );
  });
}

/* Modularization exports (public API of this feature module). */
export {
  buildAllAmbientDebris, buildV65Ornaments,
  buildArchiveSpines, initArchiveSpine,
};
