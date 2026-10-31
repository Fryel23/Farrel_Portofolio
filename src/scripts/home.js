/*!
 * home.js: halaman pucuk "/" (migrasi Astro V7.0, Fase 4.1 + 5).
 * Hero intro, Data Atlas (entrance + ambient + parallax), tombol hero,
 * dan Global Archive Navigator (pencarian arsip lintas halaman).
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

/* ======================================================================
 * 3b. V5.3: GLOBAL ARCHIVE NAVIGATOR (hero search)
 * ==================================================================== */
/* The hero search navigates between sections by keyword. Everything a
   visitor can reach is authored in DATA.archiveSearch.routes; input is
   treated as text and nothing else. It can never become HTML, a CSS
   selector, a URL, an object key, or executable code (V5.3 §2.6):
     - rendering uses createElement/textContent only
     - targets are resolved through doc.getElementById(fixedId)
     - matching runs over the allowlist, never over the DOM
     - lookup tables are arrays of trusted route objects, so keys like
       __proto__ / constructor cannot reach any property access */

/* Normalise a raw query (V5.3 §2.3): trim, NFKC, lowercase (en-US),
   collapse whitespace, drop control characters, cap length. This is a
   UX consistency step, not a security mechanism; the boundary is that
   the value is only ever compared and inserted as textContent. */
function normalizeSearchQuery(raw) {
  const cfg = DATA && DATA.archiveSearch;
  const limit = (cfg && cfg.maxQueryLength) || 80;
  let value = raw === undefined || raw === null ? '' : String(raw);
  try {
    if (typeof value.normalize === 'function') value = value.normalize('NFKC');
  } catch (error) { /* keep the raw text */ }
  value = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  value = value.replace(/\s+/g, ' ');
  value = value.toLocaleLowerCase('en-US');
  value = value.trim();
  if (value.length > limit) value = value.slice(0, limit);
  return value;
}

/* Resolve a normalised query against the allowlist. Deterministic
   scoring, no fuzzy similarity, no DOM scanning:
     3 = exact alias match
     2 = known alias found inside the query on word boundaries
     1 = alias starts with the query (3+ characters)
   Word boundaries are implemented by padding with spaces, which also
   stays correct for aliases that contain punctuation such as c++.
   Ambiguous keywords (multiRoutes) yield several results, capped at 3
   selectable destinations. */
function resolveArchiveSearchResults(query) {
  const cfg = DATA && DATA.archiveSearch;
  if (!cfg || !query) return [];
  const base = Array.isArray(cfg.routes) ? cfg.routes : [];
  const multi = Array.isArray(cfg.multiRoutes) ? cfg.multiRoutes : [];
  const scored = [];

  base.concat(multi).forEach((route) => {
    if (!route || typeof route.targetId !== 'string' || !route.targetId) return;
    const aliases = Array.isArray(route.aliases) ? route.aliases : [];
    let best = 0;
    let bestAlias = '';
    aliases.forEach((aliasRaw) => {
      const alias = normalizeSearchQuery(aliasRaw);
      if (!alias) return;
      let score = 0;
      if (alias === query) score = 3;
      else if ((' ' + query + ' ').indexOf(' ' + alias + ' ') !== -1) score = 2;
      else if (query.length >= 3 && alias.indexOf(query) === 0) score = 1;
      if (score > best) { best = score; bestAlias = alias; }
    });
    if (best > 0) scored.push({ targetId: route.targetId, label: route.label || route.targetId, alias: bestAlias, score: best });
  });

  if (!scored.length) return [];
  scored.sort((a, b) => b.score - a.score); // stable for equal scores: route order preserved
  const seen = [];
  const results = [];
  for (let i = 0; i < scored.length && results.length < 3; i++) {
    if (seen.indexOf(scored[i].targetId) !== -1) continue;
    seen.push(scored[i].targetId);
    results.push({ targetId: scored[i].targetId, label: scored[i].label, alias: scored[i].alias });
  }
  return results;
}

let archiveResults = [];
let archiveActiveIndex = -1;
let archiveNoteKind = 'none'; // none | found | notfound

function closeArchiveSuggestions() {
  const list = qs('#archive-suggestions');
  const input = qs('#search-input');
  const hint = qs('#archive-search-hint');
  // Focus never lands on a removed node (V5.3 §10.2).
  if (list && input && list.contains(doc.activeElement)) {
    try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
  }
  if (list) { list.hidden = true; list.textContent = ''; }
  if (hint) hint.hidden = true;
  if (input) {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  archiveResults = [];
  archiveActiveIndex = -1;
}


function renderArchiveSuggestions(results) {
  const list = qs('#archive-suggestions');
  const input = qs('#search-input');
  const hint = qs('#archive-search-hint');
  if (!list || !input) return;
  list.textContent = '';
  archiveResults = results;
  archiveActiveIndex = results.length ? 0 : -1;

  results.forEach((entry, index) => {
    const option = el('button', 'archive-suggestion');
    option.type = 'button';
    option.id = 'archive-option-' + String(index);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    option.appendChild(el('span', 'archive-suggestion-label', entry.label));
    if (entry.alias) option.appendChild(el('span', 'archive-suggestion-key', entry.alias));
    option.addEventListener('click', () => navigateToArchiveTarget(entry));
    list.appendChild(option);
  });

  if (results.length) {
    list.hidden = false;
    if (hint) hint.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', 'archive-option-0');
  } else {
    list.hidden = true;
    if (hint) hint.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
}

function setActiveSuggestion(index) {
  const list = qs('#archive-suggestions');
  const input = qs('#search-input');
  if (!list || !input || !archiveResults.length) return;
  const count = archiveResults.length;
  archiveActiveIndex = ((index % count) + count) % count; // wraps in both directions
  qsa('.archive-suggestion', list).forEach((option, i) => {
    const selected = i === archiveActiveIndex;
    option.setAttribute('aria-selected', String(selected));
    option.classList.toggle('is-active', selected);
  });
  const activeId = 'archive-option-' + String(archiveActiveIndex);
  input.setAttribute('aria-activedescendant', activeId);
  const active = qs('#' + activeId); // static id built from a number only
  if (active && typeof active.scrollIntoView === 'function') active.scrollIntoView({ block: 'nearest' });
}

/* V7.0: pemetaan targetId arsip -> rute Hub-and-Spoke. Data allowlist
   (DATA.archiveSearch) tidak berubah; hanya resolusi tujuannya yang
   kini melintasi halaman, bukan section satu halaman. */
const SEARCH_PAGE_ROUTES = {
  top: '/',
  work: '/work',
  games: '/archive/play',
  about: '/about',
  journey: '/about',
  offscreen: '/archive/off-screen',
  github: '/archive',
  credentials: '/archive/credentials',
  companion: '/archive/off-screen',
  profiles: '/connect',
  contact: '/connect',
  closing: '/connect'
};
const SEARCH_ANCHORS = {
  top: '#top',
  work: '#work',
  games: '#games',
  about: '#about',
  journey: '#journey',
  offscreen: '#offscreen',
  github: '#github',
  credentials: '#credentials',
  companion: '#companion',
  profiles: '#profiles',
  contact: '#contact',
  closing: '#closing'
};

function navigateToArchiveTarget(entry) {
  const cfg = DATA && DATA.archiveSearch;
  const note = qs('#archive-search-note');
  if (!entry || typeof entry.targetId !== 'string') return false;
  /* V7.0: targetId kini di-resolve ke rute Hub-and-Spoke. Tujuan di
     halaman yang sama tetap smooth scroll; tujuan lintas halaman
     menavigasi (hash dieksekusi native oleh browser setelah load). */
  const pageUrl = SEARCH_PAGE_ROUTES[entry.targetId];
  const anchor = SEARCH_ANCHORS[entry.targetId] || '';
  if (!pageUrl) return false;
  const here = window.location.pathname.replace(/\/+$/, '') || '/';
  const dest = pageUrl.replace(/\/+$/, '') || '/';
  closeArchiveSuggestions();
  if (dest === here) {
    const target = anchor ? doc.getElementById(anchor.slice(1)) : null;
    if (target) scrollToTarget(target);
  } else {
    window.location.href = dest + anchor;
  }
  if (note) {
    note.textContent = (cfg && cfg.goAnnouncement ? cfg.goAnnouncement + ' ' : '') + (entry.label || entry.targetId);
    note.hidden = false;
    note.classList.remove('is-notfound');
    archiveNoteKind = 'found';
  }
  return true;
}

/* Not-found state (V5.3 §2.8): honest message plus at most one gentle
   shake per transition into the state. Repeated unknown queries while
   the note is already visible never restart the animation. */
function showArchiveNotFound() {
  const cfg = DATA && DATA.archiveSearch;
  const note = qs('#archive-search-note');
  const form = qs('#project-search');
  if (!note) return;
  const message = (cfg && cfg.notFoundMessage) || 'No matching archive entry found.';
  const firstTransition = archiveNoteKind !== 'notfound';
  note.textContent = message;
  note.hidden = false;
  note.classList.add('is-notfound');
  archiveNoteKind = 'notfound';
  if (firstTransition && hasGSAP && !isReducedMotion() && form) {
    gsap.fromTo(form,
      { x: 0 },
      { x: 3, duration: 0.05, ease: 'none', yoyo: true, repeat: 5,
        onComplete: () => gsap.set(form, { x: 0 }) }
    );
  }
}

/* V6.6 Fase 8.1: three latest successful queries in localStorage;
   re-resolved through the allowlist before anything navigates. */
const SEARCH_HISTORY_KEY = 'fip-archive-history';

function loadSearchHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === 'string' && entry.trim()).slice(0, 3);
  } catch (error) {
    return [];
  }
}

function saveSearchHistory(query) {
  const value = String(query || '').trim();
  if (!value) return;
  try {
    const next = loadSearchHistory().filter((entry) => entry !== value);
    next.unshift(value);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next.slice(0, 3)));
  } catch (error) { /* storage unavailable: search still works live */ }
}

/* RECENT suggestions: best match per stored query, unresolvable skipped. */
function renderSearchHistory() {
  const results = [];
  const seenTargets = [];
  loadSearchHistory().forEach((query) => {
    const resolved = resolveArchiveSearchResults(query);
    if (!resolved.length || seenTargets.indexOf(resolved[0].targetId) !== -1) return;
    seenTargets.push(resolved[0].targetId);
    results.push({ targetId: resolved[0].targetId, label: 'RECENT / ' + query, alias: 'recent' });
  });
  renderArchiveSuggestions(results);
}

function initGlobalArchiveSearch() {
  const form = qs('#project-search');
  const input = qs('#search-input');
  const wrap = qs('.archive-search-wrap');
  if (!form || !input || !wrap || !DATA || !DATA.archiveSearch) return;

  const cfg = DATA.archiveSearch;
  // Accessible names come from the data file: the widget speaks about
  // archive navigation, never about filtering projects (V5.3 §2.1).
  const label = qs('label[for="search-input"]');
  if (label && cfg.inputLabel) label.textContent = cfg.inputLabel;
  const submit = qs('button[type="submit"]', form);
  if (submit && cfg.submitLabel) submit.setAttribute('aria-label', cfg.submitLabel);
  const list = qs('#archive-suggestions');
  if (list && cfg.listLabel) list.setAttribute('aria-label', cfg.listLabel);

  let suggestTimer = null;
  input.addEventListener('input', () => {
    // Typing never moves the viewport and never announces (V5.3 §2.4 /
    // §2.5): only the suggestion list updates, after a short debounce.
    if (suggestTimer) window.clearTimeout(suggestTimer);
    suggestTimer = window.setTimeout(() => {
      suggestTimer = null;
      const query = normalizeSearchQuery(input.value);
      /* V6.6 Fase 8.1: empty input offers the recent-search history;
         with content in the input, history never shows. */
      if (!query) { renderSearchHistory(); return; }
      renderArchiveSuggestions(resolveArchiveSearchResults(query));
    }, 120);
  });

  // Focusing an empty input also opens the RECENT list (8.1).
  input.addEventListener('focus', () => {
    if (!normalizeSearchQuery(input.value)) renderSearchHistory();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (suggestTimer) { window.clearTimeout(suggestTimer); suggestTimer = null; }
    const query = normalizeSearchQuery(input.value);
    if (!query) { renderSearchHistory(); return; }
    const results = resolveArchiveSearchResults(query);
    if (!results.length) {
      closeArchiveSuggestions();
      showArchiveNotFound();
      return;
    }
    // Enter navigates to the active suggestion (default: best match);
    // with several matches the list stays interactive first (§2.4.3).
    const entry = (archiveActiveIndex >= 0 && archiveResults.length) ? archiveResults[archiveActiveIndex] : results[0];
    const navigated = navigateToArchiveTarget(entry || results[0]);
    // History is recorded only for navigations that actually happened.
    if (navigated) saveSearchHistory(query);
  });

  input.addEventListener('keydown', (event) => {
    if (!archiveResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion(archiveActiveIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion(archiveActiveIndex - 1);
    } else if (event.key === 'Escape') {
      closeArchiveSuggestions(); // focus returns to / stays on the input
    }
  });

  // Click outside the widget closes the dropdown.
  /* V7.4: listener level dokumen dilacak agar terlepas saat teardown
     navigasi (tidak menumpuk antar boot). */
  trackMotionListener(doc, 'click', (event) => {
    if (!event.target.closest('.archive-search-wrap')) closeArchiveSuggestions();
  });
  // Keyboard users: close when focus leaves the whole widget.
  wrap.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget)) closeArchiveSuggestions();
  });
}

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

function initHeroButtons() {
  if (!hasGSAP || isReducedMotion()) return;
  /* V9.0: home.js kini dieksekusi di semua halaman (diimpor statis oleh
     global.js untuk kontrak callback opening). Guard ini menjaga
     cakupan perilaku persis seperti sebelum V9.0: efek hover tombol
     hanya pernah aktif di halaman home - satu-satunya halaman yang
     memuat home.js sebelum V9.0. */
  if (!qs('.hero')) return;
  qsa('.button-primary, .button-outline').forEach((btn) => {
    trackMotionListener(btn, 'mouseenter', () => {
      const arrow = btn.querySelector('span[aria-hidden="true"]');
      if (arrow) {
        trackEventTween(gsap.to(arrow, { x: 4, y: -4, duration: 0.15, ease: MOTION.easeSnap, yoyo: true, repeat: 1 }));
      }
      trackEventTween(gsap.to(btn, { scale: 1.03, duration: 0.15, ease: MOTION.easeSoft }));
    });
    trackMotionListener(btn, 'mouseleave', () => {
      trackEventTween(gsap.to(btn, { scale: 1, duration: 0.15, ease: MOTION.easeSoft }));
    });
  });
}

/* Search focus pulse (5.1.3): the magnifier icon pops once and the
   placeholder whispers that the archive is listening. */
function initSearchPulse() {
  const searchInput = qs('#search-input');
  const searchIcon = qs('#project-search button svg');
  if (!searchInput || !searchIcon) return;
  const originalPlaceholder = searchInput.placeholder;
  searchInput.addEventListener('focus', () => {
    if (hasGSAP && !isReducedMotion()) {
      gsap.fromTo(searchIcon,
        { scale: 1 },
        { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: MOTION.easeSnap }
      );
    }
    searchInput.placeholder = 'Searching the archive...';
    window.setTimeout(() => { searchInput.placeholder = originalPlaceholder; }, 1500);
  });
}

/* Back to top bounce (5.7.3): a small hop on hover, motion allowed only. */

function resetAtlasAmbient() {
  atlasAmbientStarted = false;
}


/* ======================================================================
 * BOOT HALAMAN HOME
 * ==================================================================== */
bootPage({
  renders: [buildHeroDust],
  interactions: [initGlobalArchiveSearch, initSearchPulse],
  motion: [
    initPointerParallax,
    initHeroButtons,
    /* V11.0: entri hero-boot lama dihapus. animateHeroIn kini dipanggil
       dari boot gate global.js (dekorasi, tanpa menunggu Opening);
       prepareHeroState tetap diekspor untuk kontrak yang sama. */
  ],
  cleanups: [resetAtlasAmbient],
});
