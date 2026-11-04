/*!
 * home/archive-search.js: Global Archive Navigator (hero search,
 * modularized V11.1-M).
 *
 * Single responsibility: pencarian arsip lintas halaman - normalisasi
 * query, matching allowlist DATA.archiveSearch.routes, saran,
 * navigasi keyboard, not-found, dan riwayat pencarian. Input hanya
 * pernah dibandingkan & disisipkan sebagai textContent (V5.3 §2.6).
 * Route allowlist, alias scoring, ARIA, cap saran, dan policy riwayat
 * tidak berubah dari baseline.
 */
import {
  DATA, doc, el, qs, qsa, showToast, buildHeading, scrollToTarget,
  isReducedMotion, hasGSAP, motionRegistry, trackMotionListener,
} from '../core.js';

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

/* Modularization exports (public API of this feature module). */
export { initGlobalArchiveSearch };
