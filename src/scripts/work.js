/*!
 * work.js: halaman /work (migrasi Astro V7.0, Fase 4.2 + 5).
 * Filter kategori, render kartu proyek + slot reserved (perilaku V6.7:
 * reserved hanya tampil di view All, tidak dihitung), reveal arah pada
 * cover, batch entrance, dan dekorasi ruler galeri.
 * V8.0 Fase 3: WebGL image hover (Curtains) khusus path /work.
 * V10.3 SUBFASE 2: curtainsjs tidak lagi di-import statis - modul hanya
 * diunduh via dynamic import ketika initWebGLHover() berjalan di path
 * /work dengan pointer fine, tanpa reduced motion, dan WebGL didukung.
 * Homepage (work.js juga dipakai di sana untuk hover reveal) tidak akan
 * pernah mengunduh chunk curtainsjs.
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
  trackWebGLContext, trackRafLoop,
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
  /* V8.0 Fase 3: grid dibangun ulang -> plane WebGL untuk kartu lama
     dibuang dan plane baru dibuat untuk kartu yang tersisa. */
  syncWebGLPlanes();
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

/* ======================================================================
 * V8.0 FASE 3: WEBGL IMAGE HOVER (CURTAINS) - SPATIAL DEPTH
 * ======================================================================
 * Satu instance Curtains per cover kartu proyek (bukan satu container
 * global): canvas kecil hidup DI DALAM .project-cover sehingga terpotong
 * border-radius kartu (overflow hidden) dan z-index 1 menempatkannya di
 * atas gambar (z auto) tetapi DI BAWAH label .project-tag/.project-number
 * (z-index 2, .project-cover adalah stacking context via isolation).
 * Tekstur = img di dalam cover; img asli TIDAK disembunyikan sehingga
 * saat WebGL gagal/context hilang, kartu tetap tampil normal (Batasan 1).
 * Hanya jalan di path /work dan /work/[slug], pointer: fine, dan tanpa
 * reduced motion (Batasan 3 + 4). Instance Curtains + loop rAF internal
 * didaftarkan ke motionRegistry (webgl + rafLoops) sehingga astro:after-swap
 * mem-dispose context dan menghapus canvas dari DOM (Batasan 2).
 * Karena canvas planenya opaque meng-cover img, efek hover CSS pada img
 * (scale) praktis tergantikan oleh distorsi WebGL saat plane aktif;
 * tanpa WebGL, perilaku hover CSS lama tetap utuh. */

/* V10.3 SUBFASE 2: konstruktor Curtains/Plane diinjeksi dari dynamic
   import (tidak ada lagi binding statis dari 'curtainsjs'). */
const webglHoverState = { active: false, entries: [], curtainsCtor: null, planeCtor: null };

/* V10.2 B.1: hanya /work (galeri arsip) yang mengizinkan WebGL hover.
   [slug].astro tidak meng-import work.js sehingga /work/* dead path.
   work.js juga dipakai homepage, jadi gate-nya path, bukan file. */
function webglPathAllowed() {
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/work';
}

function webglSupported() {
  try {
    const probe = doc.createElement('canvas');
    return !!(probe.getContext && probe.getContext('webgl'));
  } catch (error) {
    return false;
  }
}

const WEBGL_VERTEX = [
  'precision mediump float;',
  'attribute vec3 aVertexPosition;',
  'attribute vec2 aTextureCoord;',
  'uniform mat4 uMVMatrix;',
  'uniform mat4 uPMatrix;',
  'uniform mat4 uTextureMatrix0;',
  'uniform float uHover;',
  'uniform vec2 uMouse;',
  'varying vec3 vVertexPosition;',
  'varying vec2 vTextureCoord;',
  'void main() {',
  '  vec3 vertexPosition = aVertexPosition;',
  '  float dist = distance(vertexPosition.xy, uMouse);',
  '  float pull = uHover * exp(-dist * 1.4) * 0.16;',
  '  vertexPosition.xy += (uMouse - vertexPosition.xy) * pull;',
  '  vertexPosition.z += uHover * 0.35 * exp(-dist * 1.4);',
  '  gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);',
  '  vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;',
  '  vVertexPosition = vertexPosition;',
  '}'
].join('\n');

const WEBGL_FRAGMENT = [
  'precision mediump float;',
  'varying vec3 vVertexPosition;',
  'varying vec2 vTextureCoord;',
  'uniform sampler2D uSampler0;',
  'uniform float uHover;',
  'uniform float uTime;',
  'void main() {',
  '  vec2 texCoord = vTextureCoord;',
  '  float wave = sin(vVertexPosition.x * 6.0 + uTime * 1.6) * cos(vVertexPosition.y * 5.0 - uTime) * 0.014 * uHover;',
  '  texCoord.x += wave;',
  '  texCoord.y += wave * 0.6;',
  '  gl_FragColor = texture2D(uSampler0, texCoord);',
  '}'
].join('\n');

function disposeWebGLEntry(entry) {
  if (!entry || entry.disposed) return;
  entry.disposed = true;
  if (entry.hoverTween) { try { entry.hoverTween.kill(); } catch (error) { /* tween sudah mati */ } }
  if (entry.plane) { try { entry.plane.remove(); } catch (error) { /* plane sudah lepas */ } }
  if (entry.curtains) { try { entry.curtains.dispose(); } catch (error) { /* context sudah lepas */ } }
  if (entry.container && entry.container.parentNode) {
    try { entry.container.parentNode.removeChild(entry.container); } catch (error) { /* DOM sudah diganti */ }
  }
}

function createWebGLPlane(img) {
  const Curtains = webglHoverState.curtainsCtor;
  const Plane = webglHoverState.planeCtor;
  if (!Curtains || !Plane) return null;
  const cover = img.closest('.project-cover');
  const card = img.closest('.project-card');
  if (!cover || !card || cover.querySelector('.webgl-cover-canvas')) return null;

  const container = el('div', 'webgl-cover-canvas');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;';
  cover.appendChild(container);

  const entry = { img, cover, card, container, curtains: null, plane: null, hoverTween: null, disposed: false };
  let disposeRegistered = false;
  const registerDispose = () => {
    if (disposeRegistered) return;
    disposeRegistered = true;
    const disposeFn = () => disposeWebGLEntry(entry);
    trackWebGLContext(disposeFn); // Batasan 2: context + canvas dibersihkan after-swap
    trackRafLoop(disposeFn);      // Batasan 2: rAF internal Curtains ikut mati
  };

  let curtains = null;
  try {
    curtains = new Curtains({
      container: container,
      watchScroll: false,
      alpha: true,
      premultipliedAlpha: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5)
    });
  } catch (error) {
    container.parentNode.removeChild(container);
    return null; // Batasan 1: WebGL gagal -> kartu tetap normal
  }
  entry.curtains = curtains;

  curtains.onError(() => disposeWebGLEntry(entry));
  curtains.onContextLost(() => disposeWebGLEntry(entry));

  let plane = null;
  try {
    plane = new Plane(curtains, cover, {
      autoloadSources: false,
      widthSegments: 16,
      heightSegments: 12,
      vertexShader: WEBGL_VERTEX,
      fragmentShader: WEBGL_FRAGMENT,
      uniforms: {
        uHover: { name: 'uHover', type: '1f', value: 0 },
        uMouse: { name: 'uMouse', type: '2f', value: [0, 0] },
        uTime: { name: 'uTime', type: '1f', value: 0 }
      }
    });
  } catch (error) {
    disposeWebGLEntry(entry);
    return null;
  }
  entry.plane = plane;
  registerDispose();

  /* Tekstur dimuat eksplisit dari img (autoload dimatikan supaya canvas
     WebGL sendiri tidak ikut dijadikan tekstur). */
  try { plane.loadImages([img]); } catch (error) { disposeWebGLEntry(entry); return null; }

  plane.onRender(() => {
    if (plane.uniforms && plane.uniforms.uTime) plane.uniforms.uTime.value += 0.016;
  });

  const setHover = (target) => {
    if (entry.hoverTween) { try { entry.hoverTween.kill(); } catch (error) { /* noop */ } }
    if (plane.uniforms && plane.uniforms.uHover) {
      entry.hoverTween = trackEventTween(window.gsap.to(plane.uniforms.uHover, { value: target, duration: 0.5, ease: 'power2.out' }));
    }
  };

  trackMotionListener(card, 'pointerenter', () => setHover(1));
  trackMotionListener(card, 'pointermove', (event) => {
    const rect = cover.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (plane.uniforms && plane.uniforms.uMouse) {
      plane.uniforms.uMouse.value = [
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      ];
    }
  }, { passive: true });
  trackMotionListener(card, 'pointerleave', () => setHover(0));

  return entry;
}

/* Buang plane yang elemennya sudah tidak terhubung (hasil render ulang
   filter) dan buat plane untuk kartu baru. */
function syncWebGLPlanes() {
  if (!webglHoverState.active || !webglPathAllowed()) return;
  webglHoverState.entries = webglHoverState.entries.filter((entry) => {
    if (entry.img.isConnected && entry.cover.isConnected) return true;
    disposeWebGLEntry(entry);
    return false;
  });
  qsa('.project-card .project-cover img').forEach((img) => {
    if (webglHoverState.entries.some((entry) => entry.img === img)) return;
    const entry = createWebGLPlane(img);
    if (entry) webglHoverState.entries.push(entry);
  });
}

/* V10.3 SUBFASE 2: async - chunk curtainsjs hanya diunduh di sini, dan
   hanya ketika semua gate lolos (path /work, pointer fine, bukan reduced
   motion, WebGL didukung). webglHoverState.active baru bernilai true
   setelah import sukses, sehingga syncWebGLPlanes() yang dipanggil
   renderProjects() tidak membuat plane sebelum modul siap. */
async function initWebGLHover() {
  if (!finePointer || isReducedMotion() || !webglPathAllowed() || !webglSupported()) return;
  try {
    const module = await import('curtainsjs');
    webglHoverState.curtainsCtor = module.Curtains;
    webglHoverState.planeCtor = module.Plane;
    webglHoverState.active = true;
    syncWebGLPlanes();
  } catch (error) {
    /* Import gagal (jarang): kartu tetap tampil normal tanpa WebGL
       (Batasan 1 V8.0). Tidak ada fallback visual baru (zero creep). */
    webglHoverState.active = false;
  }
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
 * ====================================================================
 * V10.2 B.3: konfigurasi route-aware. Discriminator galeri arsip adalah
 * #filter-controls (hanya ada di /work, tidak ada di homepage).
 * - /work: render penuh (filter + kartu + ruler), interaksi penuh,
 *   motion penuh (reveal + WebGL + batch).
 * - Homepage: HANYA hover reveal + entrance batch. renderProjects TIDAK
 *   dijalankan agar markup kartu hasil render Astro (termasuk atribut
 *   transition:name) tidak diganti ulang dari DATA.projects.
 * - Route lain (about, connect, dst): no-op sama sekali.
 * Fungsi individu tidak diubah; hanya logika dispatch-nya. */
function getWorkConfig() {
  const isWorkGallery = !!qs('#filter-controls');
  if (isWorkGallery) {
    return {
      renders: [renderFilters, renderProjects, renderGalleryRuler],
      interactions: [initFilterControls, initGalleryBlueprint],
      motion: [initProjectImageReveal, initWebGLHover, setupProjectBatch],
      cleanups: [resetProjectReveal, resetBatchTriggers],
    };
  }
  // Homepage or other routes: preserve hover reveal + entrance, skip gallery renders
  const hasProjectGrid = !!qs('#project-grid');
  if (!hasProjectGrid) {
    // No project grid at all: no-op
    return { renders: [], interactions: [], motion: [], cleanups: [] };
  }
  return {
    renders: [],
    interactions: [],
    motion: [initProjectImageReveal, setupProjectBatch],
    cleanups: [resetProjectReveal, resetBatchTriggers],
  };
}

bootPage({ resolve: getWorkConfig });
