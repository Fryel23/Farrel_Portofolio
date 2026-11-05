/*!
 * archive/github.js: GitHub Activity feature (modularized V11.1-M).
 *
 * Single responsibility: mengelola antarmuka GitHub Activity - polling
 * API dengan honest mapping + cache, render copy, pulse strip, dan
 * cursor/keyboard tooltip. Timer/fetch berbatas waktu; listener
 * dilacak di registry core agar teardown navigasi bersih.
 */
import {
  DATA, doc, el, qs, qsa, setText, buildHeading, fetchWithTimeout,
  hasGSAP, hasScrollTrigger, isReducedMotion, motionRegistry, trackMotionListener,
} from '../core.js';

/* --- Now Playing header indicator (V4 §6.5) --------------------------- */
/* Polls the Spotify endpoint every 30s. Honest states only:
   playing (pulsing dot), recent (dimmed), hidden on error. */

function initGitHubActivity() {
  const grid = qs('#github-grid');
  const fallback = qs('#github-fallback');
  const cfg = DATA && DATA.githubActivity;
  if (!grid || !cfg) return;

  const labels = cfg.cards || {};
  const num = (value) => (typeof value === 'number' && isFinite(value)) ? value : 0;

  function renderRepos(repos) {
    // Pre-V6.6 caches carry no topRepos: skip, the list appears on the
    // next cache refresh.
    if (!Array.isArray(repos) || !repos.length) return;
    let host = qs('.github-repos');
    if (!host) {
      host = el('div', 'github-repos');
      host.setAttribute('aria-label', 'Recent repositories');
      if (grid.parentElement) grid.parentElement.insertBefore(host, grid.nextSibling);
    }
    host.textContent = '';
    host.appendChild(el('p', 'github-repos-label', 'RECENT REPOSITORIES'));
    const list = el('ul', 'github-repos-list');
    repos.forEach((repo) => {
      const li = doc.createElement('li');
      const link = el('a', null, repo.name);
      link.href = repo.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.appendChild(link);
      li.appendChild(el('span', null, 'updated ' + relativeRepoAge(repo.updatedAt)));
      list.appendChild(li);
    });
    host.appendChild(list);
  }

  function relativeRepoAge(iso) {
    const then = new Date(iso).getTime();
    if (!isFinite(then)) return 'recently';
    const minutes = Math.floor(Math.max(0, Date.now() - then) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + 'm ago';
    if (minutes < 1440) return Math.floor(minutes / 60) + 'h ago';
    return Math.floor(minutes / 1440) + 'd ago';
  }

  function renderCards(stats) {
    grid.textContent = '';

    const makeCard = (valueText, labelText) => {
      const card = el('div', 'github-card');
      card.appendChild(el('span', 'github-card-value', valueText));
      card.appendChild(el('span', 'github-card-label', labelText));
      return card;
    };

    grid.appendChild(makeCard(String(stats.repositories), labels.repositories || 'REPOSITORIES'));
    grid.appendChild(makeCard(String(stats.stars), labels.stars || 'STARS EARNED'));
    grid.appendChild(makeCard(String(stats.followers), labels.followers || 'FOLLOWERS'));

    const langsCard = el('div', 'github-card github-card--langs');
    langsCard.appendChild(el('span', 'github-card-value', String(stats.languages.length)));
    langsCard.appendChild(el('span', 'github-card-label', labels.languages || 'TOP LANGUAGES'));
    const chips = el('div', 'github-langs');
    if (stats.languages.length) {
      stats.languages.forEach((lang) => chips.appendChild(el('span', 'github-lang-chip', lang)));
    } else {
      chips.appendChild(el('span', 'github-lang-chip', 'No language data yet'));
    }
    langsCard.appendChild(chips);
    grid.appendChild(langsCard);

    // V5.2 §5.4: cards are focusable so keyboard users reach the same
    // summary data the cursor tooltip shows (delegated in
    // initGitHubTooltips, so late renders are covered too).
    qsa('.github-card', grid).forEach((card) => { card.tabIndex = 0; });

    if (fallback) fallback.hidden = true;

    /* V5 §3.3: stat cards reveal with one batch. Cards render async
       (cache or fetch), so the batch is created right here, per render,
       never duplicated. Touch and reduced motion skip the hidden state. */
    const cards = qsa('.github-card', grid);
    if (hasScrollTrigger && !isReducedMotion()) {
      gsap.set(cards, { opacity: 0, y: 24 });
      window.ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out',
          overwrite: 'auto', clearProps: 'transform'
        })
      });
    }

    // Count-up on render (short, honest, final value guaranteed).
    if (!isReducedMotion() && hasGSAP) {
      qsa('.github-card-value', grid).forEach((node) => {
        const value = parseInt(node.textContent, 10);
        if (isNaN(value) || value <= 0) return;
        const proxy = { n: 0 };
        gsap.to(proxy, {
          n: value, duration: 0.8, ease: 'power2.out',
          onUpdate: () => { node.textContent = String(Math.round(proxy.n)); },
          onComplete: () => { node.textContent = String(value); }
        });
      });
    }

    // V6.6 Fase 8.2: recent repositories list below the grid.
    renderRepos(stats.topRepos);
  }

  function readCache(anyAge) {
    try {
      const raw = window.localStorage.getItem(cfg.cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.updatedAt !== 'number') return null;
      if (!anyAge && Date.now() - parsed.updatedAt > (cfg.cacheTTL || 3600000)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeCache(stats) {
    try { window.localStorage.setItem(cfg.cacheKey, JSON.stringify(stats)); }
    catch (error) { /* storage unavailable: stats still render live */ }
  }

  function compute(user, repos) {
    const repoList = Array.isArray(repos) ? repos : [];
    const counts = {};
    repoList.forEach((repo) => {
      const lang = String(repo.language || '').trim();
      if (lang) counts[lang] = (counts[lang] || 0) + 1;
    });
    /* V6.6 Fase 8.2: three most recently updated public repos as plain
       display data (name, real html_url, raw timestamp). */
    const topRepos = repoList
      .filter((repo) => repo && typeof repo.html_url === 'string' && repo.html_url)
      .slice()
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .slice(0, 3)
      .map((repo) => ({ name: String(repo.name || 'repository'), url: repo.html_url, updatedAt: repo.updated_at || '' }));
    return {
      repositories: num(user && user.public_repos),
      stars: repoList.reduce((acc, repo) => acc + num(repo.stargazers_count), 0),
      forks: repoList.reduce((acc, repo) => acc + num(repo.forks_count), 0),
      followers: num(user && user.followers),
      languages: Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3),
      topRepos: topRepos,
      updatedAt: Date.now()
    };
  }

  const cached = readCache(false);
  if (cached) { renderCards(cached); return; }

  const base = 'https://api.github.com/users/' + encodeURIComponent(cfg.username || 'Fryel23');
  // V5 §3.6: both requests carry an 8s timeout + AbortController and
  // resolve to the honest fallback on any failure.
  Promise.all([
    fetchWithTimeout(base),
    fetchWithTimeout(base + '/repos?per_page=100&sort=updated')
  ]).then(([user, repos]) => {
    const stats = compute(user, repos);
    writeCache(stats);
    renderCards(stats);
  }).catch(() => {
    const stale = readCache(true); // old cache is still real data
    if (stale) { renderCards(stale); return; }
    if (fallback) {
      fallback.hidden = false;
      const message = qs('span', fallback);
      if (message) message.textContent = cfg.fallbackMessage || 'STATISTIK GITHUB SEDANG TIDAK DAPAT DIMUAT SAAT INI.';
    }
  });
}

/* --- §3.4 + V6.3 §5.6: GitHub pulse strip -------------------------------- */
/* Decorative commit-pulse: 14 skeleton squares plus the V6.3 pulse line
   ornament. The squares are DOM and are rendered once by
   buildGithubPulseDots() during boot; this motion half runs inside the
   matchMedia no-preference handler, never under reduced motion.
   V6.3 §5.6.2: every pulse animation is owned by this one function -
   the old dots loop AND the new line reveal - never in two places. */
function buildGithubPulseDots() {
  const host = qs('.github-pulse');
  if (!host || host.childElementCount) return;
  for (let i = 0; i < 14; i++) host.appendChild(el('span'));
}

function initGithubPulse() {
  const host = qs('.github-pulse');
  const section = qs('#github');
  const pulseLine = qs('.ornament-github-pulse-path');
  if (!section || !hasGSAP || isReducedMotion()) return;

  const tweens = [];

  // Old pulse dots (if present): one paused loop, visibility-gated.
  if (host) {
    const squares = qsa('span', host);
    if (squares.length) {
      const dotsLoop = gsap.timeline({ repeat: -1, paused: true });
      dotsLoop.to(squares, { opacity: 1, duration: 0.22, stagger: 0.07, ease: 'none' })
        .to(squares, { opacity: 0.25, duration: 0.22, stagger: 0.07, ease: 'none' }, 0.35);
      tweens.push(dotsLoop);
    }
  }

  // New pulse line (V6.3 §5.6): one stroke draw reveal when the section
  // enters, plus the three nodes popping in.
  if (pulseLine) {
    const length = pulseLine.getTotalLength ? pulseLine.getTotalLength() : 400;
    gsap.set(pulseLine, { strokeDasharray: length, strokeDashoffset: length });
    const lineReveal = gsap.to(pulseLine, {
      strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut',
      scrollTrigger: { trigger: section, start: 'top 80%', once: true }
    });
    const pulseNodes = qsa('.ornament-github-pulse circle');
    const nodeReveal = pulseNodes.length
      ? gsap.from(pulseNodes, {
          scale: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.15, ease: 'back.out(2)',
          scrollTrigger: { trigger: section, start: 'top 80%', once: true }
        })
      : null;
    tweens.push(lineReveal);
    if (nodeReveal) tweens.push(nodeReveal);
  }

  // Play/pause the dots loop while the section is on screen.
  if (host && tweens.length && tweens[0] && hasScrollTrigger) {
    motionRegistry.scrollTriggers.add(window.ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => tweens[0].play(),
      onEnterBack: () => tweens[0].play(),
      onLeave: () => tweens[0].pause(),
      onLeaveBack: () => tweens[0].pause()
    }));
  } else if (host && tweens.length && tweens[0]) {
    tweens[0].play();
  }
}


/* --- §5.4: GitHub cursor tooltip ---------------------------------------- */
/* One fixed tooltip for the whole grid (event delegation, no per-card
   listeners for pointermove). Content is read from the values actually
   rendered in the cards, so tooltip and cards can never disagree.
   Shows after a 200ms delay, follows the cursor via gsap.quickTo,
   clamps to the viewport, hides on leave / tooltip enter / hidden tab.
   Keyboard: cards are focusable and show the same data anchored to the
   card. Touch devices skip the follow-cursor behaviour entirely. */


function initGitHubTooltips() {
  const grid = qs('#github-grid');
  const section = qs('#github');
  if (!grid || !section) return;

  const tip = el('div', 'github-tooltip');
  tip.setAttribute('role', 'status');
  tip.hidden = true;
  doc.body.appendChild(tip);

  let showTimer = null;
  let activeCard = null;
  let tipX = null;
  let tipY = null;

  function contentFor(card) {
    tip.textContent = '';
    const value = card.querySelector('.github-card-value');
    const label = card.querySelector('.github-card-label');
    if (label) {
      const line = el('span', 'github-tooltip-line',
        (label.textContent || '') + ': ' + (value ? value.textContent : ''));
      tip.appendChild(line);
    }
    const langs = qsa('.github-lang-chip', card).map((chip) => chip.textContent);
    if (langs.length) {
      tip.appendChild(el('span', 'github-tooltip-line', 'Languages: ' + langs.join(', ')));
    } else if (card.classList.contains('github-card--langs') && !langs.length) {
      tip.appendChild(el('span', 'github-tooltip-line', 'Languages: not available yet'));
    }
    return tip.childNodes.length > 0;
  }

  function place(anchorRect, clientX, clientY) {
    const pad = 12;
    const width = tip.offsetWidth || 180;
    const height = tip.offsetHeight || 48;
    let x = (clientX !== null && clientX !== undefined) ? clientX + 16 : anchorRect.left;
    let y = (clientY !== null && clientY !== undefined) ? clientY + 18 : anchorRect.bottom + 8;
    x = Math.min(Math.max(pad, x), window.innerWidth - width - pad);
    y = Math.min(Math.max(pad, y), window.innerHeight - height - pad);
    /* V6.3 §2.2: the follow-cursor easing is runtime motion - under
       reduced motion the tooltip jumps instantly and the quickTo
       transform is cleared so left/top positioning is exact. */
    if (tipX && !isReducedMotion()) {
      tipX(x);
      tipY(y);
    } else {
      if (tipX) tip.style.transform = '';
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }
  }

  function showFor(card, clientX, clientY) {
    if (!contentFor(card)) return;
    if (showTimer) window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => {
      tip.hidden = false;
      if (hasGSAP && !isReducedMotion()) {
        gsap.killTweensOf(tip);
        gsap.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none' });
      }
      place(card.getBoundingClientRect(), clientX, clientY);
    }, 200);
    activeCard = card;
  }

  function hideTip() {
    if (showTimer) { window.clearTimeout(showTimer); showTimer = null; }
    if (!tip.hidden && hasGSAP && !isReducedMotion()) {
      gsap.to(tip, { opacity: 0, duration: 0.12, onComplete: () => { tip.hidden = true; } });
    } else {
      tip.hidden = true;
    }
    activeCard = null;
  }

  const hoverOK = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hoverOK && hasGSAP) {
    tipX = gsap.quickTo(tip, 'x', { duration: 0.12, ease: 'power2.out' });
    tipY = gsap.quickTo(tip, 'y', { duration: 0.12, ease: 'power2.out' });
    tip.style.left = '0px';
    tip.style.top = '0px';

    grid.addEventListener('mouseover', (event) => {
      const card = event.target.closest('.github-card');
      if (!card || card === activeCard || doc.hidden) return;
      showFor(card, event.clientX, event.clientY);
    });
    grid.addEventListener('mousemove', (event) => {
      if (!activeCard || tip.hidden) return;
      place(activeCard.getBoundingClientRect(), event.clientX, event.clientY);
    });
    grid.addEventListener('mouseleave', hideTip);
    grid.addEventListener('mouseout', (event) => {
      const card = event.target.closest('.github-card');
      if (card && card === activeCard && !event.relatedTarget) hideTip();
    });
    tip.addEventListener('mouseenter', hideTip);
    section.addEventListener('mouseleave', hideTip);
  }

  // Keyboard path: the same data, anchored to the focused card. The
  // grid uses delegation (focusin/focusout) so cards that render later
  // from the async fetch are covered without re-binding.
  grid.addEventListener('focusin', (event) => {
    const card = event.target.closest('.github-card');
    if (!card) return;
    if (showTimer) window.clearTimeout(showTimer);
    tip.hidden = false;
    contentFor(card);
    place(card.getBoundingClientRect(), null, null);
    activeCard = card;
  });
  grid.addEventListener('focusout', (event) => {
    if (event.target.closest && event.target.closest('.github-card')) hideTip();
  });

  /* V7.4: dilacak untuk teardown navigasi. */
  trackMotionListener(doc, 'visibilitychange', () => { if (doc.hidden) hideTip(); });
}


function renderGithubCopy() {
  // GitHub activity copy + honest no-JS fallback line
  const gh = DATA.githubActivity;
  if (gh) {
    setText('#github-kicker', gh.kicker);
    buildHeading(qs('#github-heading'), gh.heading, gh.headingAccentWord);
    setText('#github-intro', gh.intro);
    const fallback = qs('#github-fallback');
    if (fallback) {
      fallback.textContent = '';
      const message = el('span', null, gh.jsRequiredMessage || 'STATISTIK GITHUB MEMERLUKAN JAVASCRIPT.');
      fallback.appendChild(message);
      const link = el('a', null, (gh.fallbackLinkLabel || 'BUKA REPOSITORI UTAMA (@FRYEL23)') + ' ');
      link.href = gh.repoUrl || gh.profileUrl || 'https://github.com/Fryel23/Farrel_Portofolio';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const arrow = el('span', null, '↗');
      arrow.setAttribute('aria-hidden', 'true');
      link.appendChild(arrow);
      fallback.appendChild(link);
    }
  }

  // V5.2 §4.6: the terminal bracket label is decoration sourced from
  // the single data file, kept in sync with the configured profile.
  const decoGh = DATA.decorations && DATA.decorations.github;
  if (decoGh && decoGh.bracketLabel) setText('.github-brackets span', decoGh.bracketLabel);
}
/* Modularization exports (public API of this feature module). */
export {
  renderGithubCopy,
  initGitHubActivity,
  buildGithubPulseDots,
  initGithubPulse,
  initGitHubTooltips,
};
