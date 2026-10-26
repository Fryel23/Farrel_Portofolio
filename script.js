/*!
 * script.js: Farrel Islami Putra · Editorial Portfolio
 * -------------------------------------------------------------------------
 * Architecture:
 *   1. Safe DOM rendering from PORTFOLIO_DATA (textContent, no innerHTML
 *      with data strings). No editor, no localStorage content management.
 *   2. Functional layer: search, filter, quick menu, anchor navigation,
 *      scroll progress, active-section tracking.
 *   3. Motion layer:
 *        - Full path : GSAP + ScrollTrigger + Lenis (local, pinned files).
 *        - Fallback  : IntersectionObserver + Web Animations API.
 *        - Reduced   : everything stays visible, no decorative motion.
 *      Content is visible by default; initial animation states are only
 *      ever applied from JavaScript, so a failed <script> cannot hide the
 *      page.
 * ------------------------------------------------------------------------- */
'use strict';

(function initPortfolio() {
  const DATA = window.PORTFOLIO_DATA || null;
  const doc = document;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  /* Shared motion vocabulary (§12.10 + V3 §3.2 + V4 §3.2): one easing
     family, consistent timings across every component. Existing sections
     keep the same power2/power3 family this file already uses. easeSnap
     drives microinteraction bounce, easeDraw drives stroke drawing,
     easeScrub is used by every scroll-scrubbed timeline. V4 additions:
     easeGlitch for digital glitch steps, easeSlot for slot machine
     deceleration, easeFloat for soft idle loops. */
  const MOTION = {
    micro: 0.18,
    hover: 0.3,
    reveal: 0.6,
    stagger: 0.08,
    ease: 'power3.out',
    easeSoft: 'power2.out',
    easeSnap: 'back.out(1.2)',
    easeDraw: 'power2.inOut',
    easeScrub: 'none',
    easeGlitch: 'steps(5)',
    easeSlot: 'power4.out',
    easeFloat: 'sine.inOut'
  };

  /* ======================================================================
   * Tiny DOM helpers (safe by construction)
   * ==================================================================== */
  function el(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function qs(selector, scope) { return (scope || doc).querySelector(selector); }
  function qsa(selector, scope) { return Array.from((scope || doc).querySelectorAll(selector)); }
  function setText(selector, value, scope) {
    const node = qs(selector, scope);
    if (node && value !== undefined && value !== null) node.textContent = String(value);
  }

  /* Shared accessible toast (copy feedback 12.7 + Konami toast V4 §9.2).
     One status region, reused by every feature that needs polite feedback. */
  let toastTimer = null;
  function showToast(message) {
    const toast = qs('#copy-toast');
    if (!toast || !message) return;
    toast.textContent = String(message);
    toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  /* V5 §3.6: every external fetch goes through this helper. 8 second
     timeout via AbortController, response.ok checked, and errors are
     always caught by the caller so a slow endpoint can never freeze
     the page or leave an unhandled rejection. */
  async function fetchWithTimeout(url, timeoutMs) {
    const limit = timeoutMs || 8000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), limit);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /** Build a heading with masked lines; `accent` substring is wrapped in <em>. */
  function buildHeading(node, lines, accent, withSparkle) {
    if (!node || !Array.isArray(lines)) return;
    node.textContent = '';
    lines.forEach((lineText, index) => {
      const mask = el('span', 'line-mask');
      const line = el('span', 'line');
      const text = String(lineText);
      const last = index === lines.length - 1;
      if (accent && text.includes(accent)) {
        const at = text.indexOf(accent);
        if (at > 0) line.appendChild(doc.createTextNode(text.slice(0, at)));
        const em = doc.createElement('em');
        em.textContent = accent;
        line.appendChild(em);
        if (at + accent.length < text.length) {
          line.appendChild(doc.createTextNode(text.slice(at + accent.length)));
        }
        if (withSparkle && last) {
          const spark = el('sup', 'sparkle', '✳');
          spark.setAttribute('aria-hidden', 'true');
          line.appendChild(spark);
        }
      } else {
        line.textContent = text;
      }
      mask.appendChild(line);
      node.appendChild(mask);
    });
  }

  function buildTwoLineCardHeading(node, lines) {
    if (!node || !Array.isArray(lines)) return;
    node.textContent = '';
    lines.forEach((lineText, index) => {
      node.appendChild(doc.createTextNode(lineText));
      if (index < lines.length - 1) node.appendChild(doc.createElement('br'));
    });
  }

  /* ======================================================================
   * 1. RENDER: collections
   * ==================================================================== */
  function safeImage(value, fallback) {
    const url = String(value || '').trim();
    if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
    if (/^(\.\/|\/)?assets\/[a-z0-9_./-]+\.(svg|png|jpe?g|webp|gif)$/i.test(url)) return url;
    return fallback || 'assets/project-aqi.svg';
  }

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
    if (project.status) foot.appendChild(el('span', 'project-status', project.status));
    if (/^https?:\/\//i.test(url)) {
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

  let activeFilter = 'All';
  let galleryInView = false;
  let emptyWasShown = false;

  /* V5 §3.3: project card reveal via ScrollTrigger.batch. Filters rebuild
     the grid, so the batch is killed and re-created on every render
     pass while the gallery is still below the viewport; after the first
     entrance, re-rendered cards use the honest micro-fade instead. Mobile
     (<700px) starts earlier so cards are never late. `batchTriggers` tracks
     the underlying triggers so re-renders never stack duplicate observers.
     V5.3 §1.1: the batch never runs before boot() has registered the
     plugin (`pluginsRegistered`), so no trigger is created early. */
  let batchTriggers = [];
  let pluginsRegistered = false;
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

  function renderSoftware() {
    const host = qs('#software-list');
    if (!host || !DATA) return;
    host.textContent = '';
    DATA.languagesTools.items.forEach((item) => host.appendChild(el('span', 'software-chip', item)));
  }

  function renderSkills() {
    const host = qs('#skill-list');
    if (!host || !DATA) return;
    host.textContent = '';
    DATA.skills.items.forEach((skill) => {
      const chip = el('span', 'skill-chip');
      chip.appendChild(el('b', null, skill.name));
      chip.appendChild(el('small', null, skill.status));
      host.appendChild(chip);
    });
  }

  function renderJourney() {
    const host = qs('#journey-list');
    if (!host || !DATA) return;
    host.textContent = '';
    /* V6.6 Fase 7.2: accordion per phase; a real <button class="journey-toggle">
       header (aria-expanded/aria-controls) plus a hidden .journey-detail
       filled from the data file. */
    DATA.journey.items.forEach((item, index) => {
      const li = el('li', 'journey-item');
      const toggle = el('button', 'journey-toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'journey-detail-' + String(index));
      toggle.appendChild(el('span', 'journey-phase', item.phase));
      toggle.appendChild(el('h4', null, item.title));
      const icon = el('span', 'journey-toggle-icon', '+');
      icon.setAttribute('aria-hidden', 'true');
      toggle.appendChild(icon);
      li.appendChild(toggle);
      li.appendChild(el('p', 'journey-desc', item.description));
      const detail = el('div', 'journey-detail');
      detail.id = 'journey-detail-' + String(index);
      detail.hidden = true;
      if (item.detail) detail.appendChild(el('p', null, item.detail));
      li.appendChild(detail);
      li.appendChild(el('span', 'journey-status', item.status));
      host.appendChild(li);
    });

    // Rail nodes (5.4.1): one dot per phase, positioned along the scroll
    // rail via a CSS custom property so GSAP can own `scale` without
    // clobbering the translate that centers each dot.
    const rail = qs('.journey-rail');
    if (rail && !rail.querySelector('.rail-node') && DATA.journey.items.length > 1) {
      DATA.journey.items.forEach((_, idx) => {
        const node = el('span', 'rail-node');
        node.style.setProperty('--node-top', ((idx / (DATA.journey.items.length - 1)) * 100) + '%');
        rail.appendChild(node);
      });
    }
  }

  /* V6.6 Fase 7.2: accordion behaviour (Category B). One item open at a
     time; + becomes a minus sign while open. */
  function initJourneyExpand() {
    const list = qs('#journey-list');
    if (!list) return;
    const toggles = qsa('.journey-toggle', list);
    const setItemState = (toggle, open) => {
      toggle.setAttribute('aria-expanded', String(open));
      const icon = qs('.journey-toggle-icon', toggle);
      if (icon) icon.textContent = open ? '\u2212' : '+';
      const item = toggle.closest('.journey-item');
      const detail = item ? qs('.journey-detail', item) : null;
      if (detail) detail.hidden = !open;
    };
    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggles.forEach((other) => { if (other !== toggle) setItemState(other, false); });
        setItemState(toggle, !isOpen);
      });
    });
  }

  /* ======================================================================
   * 1b. RENDER: Curiosity Map (12.2)
   * ==================================================================== */
  /* An authored graph: real <button> controls over a decorative SVG.
     Selection persists (aria-pressed); hover/focus previews the notes;
     Escape dismisses a preview back to the committed selection. */
  function statusLevelOf(status) {
    const value = String(status || '').toLowerCase();
    if (value.indexOf('primary') !== -1) return 'primary';
    if (value.indexOf('explor') !== -1) return 'exploring';
    return 'future';
  }

  function buildCuriosityMap() {
    const host = qs('#curiosity-nodes');
    const cfg = DATA && DATA.curiosityMap;
    if (!host || !cfg || !Array.isArray(cfg.nodes)) return;

    setText('#curiosity-kicker', cfg.kicker);
    buildHeading(qs('#curiosity-heading'), cfg.heading, cfg.headingAccentWord);
    setText('#curiosity-intro', cfg.intro);
    setText('#curiosity-hint', cfg.hint);
    setText('#curiosity-panel-label', cfg.panelTitle);

    const stage = qs('.curiosity-stage');
    const panel = qs('#curiosity-panel');
    const panelName = qs('#curiosity-panel-name');
    const panelStatus = qs('#curiosity-panel-status');
    const panelDetail = qs('#curiosity-panel-detail');
    const buttons = [];
    let selectedId = null;

    /* V6.6 Fase 3.1: three-tier instrument strip; the honest status is
       already announced through #curiosity-panel-status. */
    const statusRow = el('div', 'curiosity-status-row');
    statusRow.setAttribute('aria-hidden', 'true');
    [['primary', 'PRIMARY'], ['exploring', 'EXPLORING'], ['future', 'FUTURE']].forEach((tier) => {
      const chip = el('span', 'status-tier status-tier--' + tier[0], tier[1]);
      chip.dataset.tier = tier[0];
      statusRow.appendChild(chip);
    });
    if (panelStatus && panelStatus.parentElement) {
      panelStatus.parentElement.insertBefore(statusRow, panelStatus.nextSibling);
    }

    /* V6.6 Fase 3.2: SEE ALSO links; created ONCE, paint() only swaps
       href + text so initAnchors() handlers keep working. */
    const sectionLabels = {};
    (DATA.archiveSearch && Array.isArray(DATA.archiveSearch.routes)
      ? DATA.archiveSearch.routes : []).forEach((route) => {
      if (route && route.targetId && !sectionLabels[route.targetId]) sectionLabels[route.targetId] = route.label;
    });
    const SEE_ALSO_MAP = {
      data: ['work', 'journey'], software: ['work', 'journey'], ai: ['journey', 'credentials'],
      databases: ['work', 'journey'], iot: ['journey', 'work']
    };
    const seeAlso = el('div', 'curiosity-see-also');
    seeAlso.setAttribute('aria-label', 'Related sections');
    seeAlso.appendChild(el('span', 'see-also-label', 'SEE ALSO'));
    const seeAlsoLinks = [];
    for (let i = 0; i < 2; i++) {
      const link = el('a', 'see-also-link');
      link.setAttribute('href', '#work');
      seeAlso.appendChild(link);
      seeAlsoLinks.push(link);
    }
    if (panelDetail && panelDetail.parentElement) {
      panelDetail.parentElement.insertBefore(seeAlso, panelDetail.nextSibling);
    }

    /* V6.6 Fase 3.3: archive meta counter at the foot of the panel. */
    const metaLine = el('p', 'curiosity-meta');
    metaLine.setAttribute('aria-hidden', 'true');
    metaLine.textContent = 'FIELD NOTE 01 / ' + String(cfg.nodes.length).padStart(2, '0');
    if (panel) panel.appendChild(metaLine);

    function paint(node) {
      if (!node) return;
      if (panelName) panelName.textContent = node.name;
      if (panelStatus) {
        panelStatus.textContent = node.status;
        panelStatus.dataset.level = statusLevelOf(node.status);
      }
      if (panelDetail) panelDetail.textContent = node.detail;
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.nodeId === node.id));
      });
      qsa('.curiosity-links line').forEach((line) => {
        line.classList.toggle('is-active', line.id === 'curiosity-link-' + node.id);
      });
      // V6.6 Fase 3: tier highlight, SEE ALSO retarget, meta counter.
      const level = statusLevelOf(node.status);
      qsa('.status-tier', statusRow).forEach((tier) => {
        tier.classList.toggle('is-active', tier.dataset.tier === level);
      });
      const targets = SEE_ALSO_MAP[node.id] || [];
      seeAlsoLinks.forEach((link, index) => {
        const targetId = targets[index];
        if (targetId) {
          link.hidden = false;
          link.setAttribute('href', '#' + targetId);
          link.textContent = (sectionLabels[targetId] || targetId) + ' \u2192';
        } else {
          link.hidden = true;
        }
      });
      metaLine.textContent = 'FIELD NOTE ' + String(cfg.nodes.indexOf(node) + 1).padStart(2, '0') +
        ' / ' + String(cfg.nodes.length).padStart(2, '0');
      // Constellation connector (4.3): the active line draws itself from
      // the centre node outward. Reduced motion: final state instantly.
      if (hasGSAP) {
        const activeLine = qs('#curiosity-link-' + node.id);
        qsa('.curiosity-links line').forEach((line) => {
          if (line !== activeLine) {
            gsap.killTweensOf(line);
            gsap.set(line, { strokeDasharray: '4 7', strokeDashoffset: 0 });
          }
        });
        if (activeLine) {
          gsap.killTweensOf(activeLine);
          if (isReducedMotion()) {
            gsap.set(activeLine, { strokeDasharray: 'none', strokeDashoffset: 0 });
          } else {
            const length = activeLine.getTotalLength ? activeLine.getTotalLength() : 300;
            gsap.set(activeLine, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(activeLine, { strokeDashoffset: 0, duration: 0.5, ease: MOTION.easeDraw });
          }
        }
      }
      if (stage) stage.classList.add('has-selection');
    }

    function commit(id) {
      selectedId = id;
      const node = cfg.nodes.find((item) => item.id === id);
      if (node) paint(node);
    }

    function restore() {
      const id = selectedId || (cfg.nodes.find((item) => statusLevelOf(item.status) === 'primary') || cfg.nodes[0]).id;
      const node = cfg.nodes.find((item) => item.id === id);
      if (node) paint(node);
    }

    cfg.nodes.forEach((node) => {
      const button = el('button', 'curiosity-node');
      button.type = 'button';
      button.dataset.nodeId = node.id;
      button.style.left = node.x + '%';
      button.style.top = node.y + '%';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', node.name + ' (' + node.status + ')');
      if (statusLevelOf(node.status) === 'primary') button.classList.add('curiosity-node--primary');
      button.appendChild(el('b', null, node.name));
      button.appendChild(el('small', null, node.status));
      host.appendChild(button);
      buttons.push(button);

      button.addEventListener('click', () => commit(node.id));
      button.addEventListener('mouseenter', () => paint(node));
      button.addEventListener('focus', () => paint(node));
    });

    stage.addEventListener('mouseleave', restore);
    host.addEventListener('focusout', (event) => {
      if (!host.contains(event.relatedTarget)) restore();
    });
    host.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') restore();
    });

    restore(); // DATA (primary focus) is the committed default view.
  }

  /* Credentials: real entries render as cards; an empty list renders the
   * reserved empty state. Verification buttons only appear when a real
   * proofUrl exists, never a fake "verify" link. Entries with an image
   * open a native <dialog> preview (12.6). */
  const credentialDialog = qs('#credential-dialog');
  let credentialDialogTrigger = null;

  function openCredentialDialog(item, trigger) {
    if (!credentialDialog || typeof credentialDialog.showModal !== 'function') return;
    credentialDialogTrigger = trigger || null;

    const image = qs('#credential-dialog-image');
    const figure = qs('.credential-dialog-figure');
    const hasImage = String(item.image || '').trim() !== '';
    if (figure) figure.hidden = !hasImage;
    if (image) {
      if (hasImage) {
        image.src = safeImage(item.image);
        image.alt = (item.title || 'Credential') + ': full certificate / award image';
      } else {
        image.removeAttribute('src');
      }
    }

    setText('#credential-dialog-type', item.type || 'Credential');
    setText('#credential-dialog-title', item.title || 'Untitled entry');
    setText('#credential-dialog-issuer', item.issuer || '');

    const idNode = qs('#credential-dialog-id');
    if (idNode) {
      idNode.textContent = item.credentialId ? 'ID: ' + item.credentialId : '';
      idNode.hidden = !item.credentialId;
    }

    const proof = qs('#credential-dialog-proof');
    const url = String(item.proofUrl || '').trim();
    if (proof) {
      if (/^https?:\/\//i.test(url)) {
        proof.href = url;
        proof.hidden = false;
      } else {
        proof.hidden = true;
        proof.removeAttribute('href');
      }
    }

    credentialDialog.showModal();

    // Unfold reveal (5.5.3): the dialog content opens from its centre via
    // clip-path. Reduced motion: the dialog simply appears.
    const inner = qs('.credential-dialog-inner', credentialDialog);
    if (inner && hasGSAP && !isReducedMotion()) {
      gsap.fromTo(inner,
        { clipPath: 'inset(50% 50% 50% 50%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: MOTION.ease }
      );
    }
  }

  function initCredentialDialog() {
    if (!credentialDialog) return;
    const closeButton = qs('#credential-dialog-close');
    if (closeButton) closeButton.addEventListener('click', () => credentialDialog.close());
    // Click on the backdrop (the dialog element itself) closes the preview.
    credentialDialog.addEventListener('click', (event) => {
      if (event.target === credentialDialog) credentialDialog.close();
    });
    // Escape works natively; return focus to the card that opened it.
    credentialDialog.addEventListener('close', () => {
      // Reset the unfold state (5.5.3) so the next open starts folded.
      const inner = qs('.credential-dialog-inner', credentialDialog);
      if (inner && hasGSAP) gsap.set(inner, { clearProps: 'clipPath' });
      if (credentialDialogTrigger) credentialDialogTrigger.focus();
      credentialDialogTrigger = null;
    });
  }
  function renderCredentials() {
    const grid = qs('#credential-grid');
    if (!grid || !DATA || !DATA.credentials) return;
    const cfg = DATA.credentials;
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    grid.textContent = '';

    if (!items.length) {
      const types = Array.isArray(cfg.emptySlots) && cfg.emptySlots.length
        ? cfg.emptySlots : ['CERTIFICATE', 'AWARD', 'PUBLICATION'];
      types.forEach((type) => {
        const slot = el('div', 'credential-slot');
        slot.appendChild(el('span', 'credential-slot-type', type));
        slot.appendChild(el('span', 'credential-slot-label', cfg.emptyLabel || 'COMING SOON'));
        slot.appendChild(el('span', 'credential-slot-note', cfg.emptyNote || 'RESERVED FOR FUTURE ENTRIES'));
        grid.appendChild(slot);
      });

      // V6.6 Fase 2.2: clearly-labelled sample card; no buttons, no dialog,
      // no tab stops: it demonstrates the format without being an entry.
      const sample = el('article', 'credential-card credential-card--sample');
      sample.setAttribute('aria-label', 'Sample format, not a real credential');
      const sampleImage = el('div', 'credential-sample-image');
      sampleImage.setAttribute('aria-hidden', 'true');
      sampleImage.appendChild(el('span', null, 'IMAGE'));
      const sampleBody = el('div', 'credential-body');
      const sampleMeta = el('div', 'credential-meta');
      sampleMeta.append(el('span', 'credential-type', 'SAMPLE FORMAT'), el('span', 'credential-date', 'NOT AN ENTRY'));
      sampleBody.append(sampleMeta, el('h3', null, 'Certificate title'),
        el('p', 'credential-issuer', 'Issuing organization'), el('p', 'credential-desc', 'One honest line about relevance.'));
      const sampleActions = el('div', 'credential-sample-actions');
      sampleActions.setAttribute('aria-hidden', 'true');
      sampleActions.append(el('span', 'sample-button', 'Verify credential'), el('span', 'sample-button', 'Open preview'));
      sampleBody.appendChild(sampleActions);
      sample.append(sampleImage, sampleBody);
      grid.appendChild(sample);

      // Vault framing (5.5.1): the reserved grid gets a casing with a small
      // dial that turns on hover. Pure decoration; skipped once real
      // credential entries exist.
      if (!grid.parentElement.classList.contains('vault-frame')) {
        const wrapper = el('div', 'vault-frame');
        grid.parentNode.insertBefore(wrapper, grid);
        wrapper.appendChild(grid);
        const dial = el('div', 'vault-dial');
        dial.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 8; i++) {
          const tick = el('span', 'vault-tick');
          tick.style.transform = 'rotate(' + (i * 45) + 'deg)';
          dial.appendChild(tick);
        }
        wrapper.appendChild(dial);
      }
      return;
    }

    items.forEach((item) => {
      const card = el('article', 'credential-card');

      const image = String(item.image || '').trim();
      if (image) {
        const img = doc.createElement('img');
        img.src = safeImage(image);
        img.alt = (item.title || 'Credential') + ': certificate / award image';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', function () { this.remove(); }, { once: true });
        card.appendChild(img);
      }

      const body = el('div', 'credential-body');
      const meta = el('div', 'credential-meta');
      meta.appendChild(el('span', 'credential-type', item.type || 'Credential'));
      if (item.date) meta.appendChild(el('span', 'credential-date', item.date));
      body.appendChild(meta);

      body.appendChild(el('h3', null, item.title || 'Untitled entry'));
      if (item.issuer) body.appendChild(el('p', 'credential-issuer', item.issuer));
      if (item.description) body.appendChild(el('p', 'credential-desc', item.description));
      if (item.credentialId) {
        body.appendChild(el('p', 'credential-id', 'ID: ' + item.credentialId));
      }

      const proof = String(item.proofUrl || '').trim();
      if (/^https?:\/\//i.test(proof)) {
        const link = el('a', 'credential-proof', 'Verify credential');
        link.href = proof;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.appendChild(el('span', 'project-link-arrow', '↗'));
        body.appendChild(link);
      }

      // Large accessible preview: only for entries that really have an image.
      if (image) {
        const previewButton = el('button', 'credential-preview', 'Open preview');
        previewButton.type = 'button';
        previewButton.addEventListener('click', () => openCredentialDialog(item, previewButton));
        body.appendChild(previewButton);
      }

      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function renderContact() {
    if (!DATA || !DATA.contact) return;
    const contact = DATA.contact;
    setText('#contact-heading', contact.heading);
    const note = qs('.contact-note');
    if (note) note.textContent = contact.note || '';
    const pairs = [
      ['.contact-card--personal', contact.personal],
      ['.contact-card--university', contact.university]
    ];
    pairs.forEach(([selector, entry]) => {
      const card = qs(selector);
      if (!card || !entry) return;
      const address = qs('.contact-address', card);
      const label = qs('.contact-label', card);
      const button = qs('.copy-button', card);
      if (address) {
        address.href = 'mailto:' + entry.address;
        address.textContent = entry.address;
      }
      if (label) label.textContent = String(entry.label || 'EMAIL').toUpperCase();
      if (button) {
        button.dataset.copy = entry.address;
        button.setAttribute('aria-label', 'Copy ' + String(entry.label || 'email').toLowerCase() + ' address');
        const copyLabel = qs('.copy-button-label', button);
        if (copyLabel && contact.copyLabel) copyLabel.textContent = contact.copyLabel;
      }
    });
  }

  /* Proper brand marks (12.7): inline SVG paths replace the old
     text-as-icon labels. Only services actually linked are used.
     GitHub / Instagram / LinkedIn marks are well-known 24×24 brand paths;
     the archive card uses a simple original archive-box mark. */
  const SOCIAL_ICONS = {
    github:
      'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    instagram:
      'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    linkedin:
      'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
    drive:
      'M3 3h18v5H3V3zm2 7h14v11H5V10zm5 2h4v2h-4v-2z'
  };

  function socialIconNode(social) {
    const key = String(social.iconKey || '').toLowerCase();
    if (SOCIAL_ICONS[key]) {
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', SOCIAL_ICONS[key]);
      svg.appendChild(path);
      return svg;
    }
    // Fallback for unknown keys: short text label (never a broken icon).
    return el('span', null, social.name.slice(0, 2));
  }

  function renderSocials() {
    const host = qs('#social-grid');
    if (!host || !DATA) return;
    host.textContent = '';
    const items = DATA.social.items.filter((social) => /^https?:\/\//i.test(String(social.url || '')));
    items.forEach((social) => {
      const link = el('a', 'social-card');
      link.href = social.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', social.name + ': ' + (social.handle || 'profile'));

      const meta = el('div', 'social-meta');
      meta.appendChild(el('span', null, 'PROFILE / ' + String(social.name).toUpperCase()));
      meta.appendChild(el('span', null, '↗'));
      link.appendChild(meta);

      const iconBox = el('span', 'social-icon');
      iconBox.appendChild(socialIconNode(social));
      link.appendChild(iconBox);
      link.appendChild(el('h3', null, social.name));
      link.appendChild(el('p', null, social.handle || 'Social profile'));
      host.appendChild(link);
    });
    host.classList.toggle('social-grid--single', items.length < 2);
  }

  /* ======================================================================
   * 2. RENDER: identity & copy sync (source of truth: portfolio-data.js)
   * ==================================================================== */
  function renderIdentity() {
    if (!DATA) return;
    const hero = DATA.hero;

    // Keep the document title synchronized with the canonical value.
    if (DATA.meta.siteTitle) doc.title = DATA.meta.siteTitle;

    setText('#hero-eyebrow', hero.eyebrow);
    buildHeading(qs('#hero-title'), hero.headline, hero.headlineAccent, true);
    setText('#hero-tail', hero.headlineTail);
    setText('#hero-subtitle', hero.description);
    setText('#hero-note', hero.note);

    const cta = qs('#hero-cta');
    if (cta && hero.primaryCta) {
      cta.textContent = '';
      cta.appendChild(doc.createTextNode(hero.primaryCta.label + ' '));
      cta.appendChild(el('span', null, '↗')).setAttribute('aria-hidden', 'true');
      if (hero.primaryCta.href) cta.setAttribute('href', hero.primaryCta.href);
    }
    const gh = qs('#hero-docs');
    if (gh && DATA.links.docs) {
      gh.setAttribute('href', DATA.links.docs);
      gh.target = '_blank';
      gh.rel = 'noopener noreferrer';
    }

    const sticker = qs('.hero-sticker');
    if (sticker && hero.sticker) {
      sticker.textContent = '';
      sticker.appendChild(doc.createTextNode(hero.sticker.top));
      sticker.appendChild(doc.createElement('br'));
      sticker.appendChild(el('b', null, hero.sticker.bottom));
    }

    // Pixel profile card
    const card = hero.profileCard;
    if (card) {
      const topline = qs('.profile-topline');
      if (topline) {
        topline.textContent = '';
        topline.appendChild(el('span', null, card.topline));
        topline.appendChild(el('span', 'status-dot', '● ' + card.status));
      }
      setText('.profile-emblem', card.emblem);
      const meta = qs('.profile-meta');
      if (meta) {
        meta.textContent = '';
        meta.appendChild(el('strong', null, card.name));
        meta.appendChild(el('span', null, card.role));
        meta.appendChild(el('small', null, String(card.specialty).toUpperCase()));
      }
      const bottom = qs('.profile-bottom');
      if (bottom) {
        bottom.textContent = '';
        bottom.appendChild(el('span', null, card.bottom));
        const arrow = el('span', 'tiny-arrow', '↗');
        arrow.setAttribute('aria-hidden', 'true');
        bottom.appendChild(arrow);
      }
    }

    qsa('.floating-tool').forEach((tool, index) => {
      if (hero.floatingTools && hero.floatingTools[index]) tool.textContent = hero.floatingTools[index];
    });
    setText('.visual-caption', hero.caption);

    // Data Atlas microcopy (illustrative only, from the single source)
    if (hero.dataAtlas) {
      const corner = qs('.atlas-corner');
      if (corner && hero.dataAtlas.cornerLabel) corner.textContent = hero.dataAtlas.cornerLabel;
      const axis = qs('.atlas-axis');
      if (axis && hero.dataAtlas.axisNote) axis.textContent = hero.dataAtlas.axisNote;
      const labels = qsa('.atlas-label-a, .atlas-label-b, .atlas-label-c');
      const observations = Array.isArray(hero.dataAtlas.observations) ? hero.dataAtlas.observations : [];
      labels.forEach((label, index) => {
        if (observations[index]) label.textContent = observations[index];
      });
    }

    // V5.2 §4.1: Archive Spine labels on the hero edge, from data.
    const decoHero = DATA.decorations && DATA.decorations.hero;
    if (decoHero) {
      setText('.hero-ruler-label', decoHero.edgeLabel);
      setText('.hero-ruler-label--bottom', decoHero.edgeLabelBottom);
    }

    // Gallery
    const gallery = DATA.gallery;
    const galleryHeading = qs('#gallery-heading');
    if (galleryHeading) buildHeading(galleryHeading, gallery.heading, gallery.headingAccentWord);
    setText('#gallery-aside', gallery.aside);
    setText('#empty-state', gallery.emptyMessage);
    const galleryKicker = qs('.gallery-section .section-kicker');
    if (galleryKicker) galleryKicker.textContent = gallery.kicker;
    const galleryLine = qs('.gallery-bottom-line');
    if (galleryLine) {
      const spans = qsa('span', galleryLine);
      if (spans[0]) spans[0].textContent = gallery.footerLeft;
      if (spans[1]) spans[1].textContent = gallery.footerRight;
    }

    // About
    const about = DATA.about;
    const aboutKicker = qs('.about-section .section-kicker');
    if (aboutKicker) aboutKicker.textContent = about.kicker;
    buildHeading(qs('#about-heading'), about.heading, about.headingAccentWord);
    setText('#about-lead', about.lead);
    setText('#about-body', about.body);
    const stamp = qs('.heading-stamp');
    if (stamp && about.stamp) {
      stamp.textContent = '';
      stamp.appendChild(doc.createTextNode(about.stamp.top));
      stamp.appendChild(doc.createElement('br'));
      stamp.appendChild(el('b', null, about.stamp.bold));
      const star = el('span', null, '✳');
      star.setAttribute('aria-hidden', 'true');
      stamp.appendChild(star);
    }
    const art = qs('#profile-image');
    if (art && about.artwork) {
      art.src = safeImage(about.artwork.image, 'assets/profile-card.svg');
      art.alt = about.artwork.alt || 'Personal file illustration';
    }
    const artworkLabel = qs('.artwork-label');
    if (artworkLabel && about.artwork && about.artwork.label) {
      artworkLabel.textContent = '';
      artworkLabel.appendChild(el('span', null, about.artwork.label.small));
      artworkLabel.appendChild(el('strong', null, about.artwork.label.strong));
      artworkLabel.appendChild(el('span', null, about.artwork.label.foot));
    }

    // Software + skills headings
    setText('.software-block .inline-heading h3', DATA.languagesTools.heading);
    setText('.software-block .mini-label', DATA.languagesTools.miniLabel);
    setText('.skills-block .inline-heading h3', DATA.skills.heading);
    setText('.skills-block .mini-label', DATA.skills.miniLabel);

    // Journey card
    buildTwoLineCardHeading(qs('.resume-card h3'), DATA.journey.heading);
    const journeyKicker = qs('.journey-grid .resume-card .resume-card-top span');
    if (journeyKicker) journeyKicker.textContent = '03 / LEARNING JOURNEY';

    // Education card
    const educationCard = qs('.resume-card-blue');
    if (educationCard) {
      buildTwoLineCardHeading(qs('h3', educationCard), DATA.education.heading);
      setText('#education-body', DATA.education.body, educationCard);
      const top = qs('.resume-card-top span', educationCard);
      if (top) top.textContent = DATA.education.kicker;
      // V6.6 Fase 7.1: coursework line under the education paragraph,
      // joined from the data file with the middle dot separator.
      const coursework = Array.isArray(DATA.education.coursework) ? DATA.education.coursework : [];
      const educationBody = qs('#education-body', educationCard);
      if (educationBody && coursework.length) {
        const courseworkLine = el('p', 'education-coursework', 'COURSEWORK / ' + coursework.join(' \u00B7 '));
        if (educationBody.nextSibling) {
          educationCard.insertBefore(courseworkLine, educationBody.nextSibling);
        } else {
          educationCard.appendChild(courseworkLine);
        }
      }
      const foot = qs('.resume-foot', educationCard);
      if (foot) foot.textContent = DATA.education.foot;
    }

    // Social
    const social = DATA.social;
    const socialKicker = qs('.social-section .section-kicker');
    if (socialKicker) socialKicker.textContent = social.kicker;
    buildHeading(qs('#social-heading'), social.heading, social.headingAccentWord);
    setText('#social-intro', social.intro);
    const socialFootnote = qs('.social-footnote');
    if (socialFootnote) {
      socialFootnote.textContent = '';
      socialFootnote.appendChild(doc.createTextNode(social.footnote + ' '));
      socialFootnote.appendChild(el('span', null, social.footnoteSub));
    }

    // Credentials
    const credentials = DATA.credentials;
    if (credentials) {
      const credKicker = qs('.credentials-section .section-kicker');
      if (credKicker) credKicker.textContent = credentials.kicker;
      buildHeading(qs('#credentials-heading'), credentials.heading, credentials.headingAccentWord);
      setText('#credentials-intro', credentials.intro);
    }

    // Contact block
    renderContact();

    // Closing
    const closing = DATA.closing;
    const closingTop = qs('.closing-top');
    if (closingTop && closing.top) {
      const spans = qsa('span', closingTop);
      if (spans[0]) spans[0].textContent = closing.top.left;
      if (spans[1]) {
        spans[1].textContent = '';
        String(closing.top.right).split('\n').forEach((part, index, arr) => {
          spans[1].appendChild(doc.createTextNode(part));
          if (index < arr.length - 1) spans[1].appendChild(doc.createElement('br'));
        });
      }
    }
    // Motto: presented once, as Farrel's own words (not a quotation).
    // The text lives inside #motto-text so the word-by-word reveal (5.7.2)
    // can target it without touching the label.
    const motto = qs('.closing-motto');
    if (motto && closing.motto) {
      motto.textContent = '';
      motto.appendChild(el('span', 'motto-label', closing.motto.label));
      const mottoText = el('span', 'motto-text', closing.motto.text);
      mottoText.id = 'motto-text';
      motto.appendChild(mottoText);
    }
    const closingName = qs('#closing-name');
    if (closingName) {
      closingName.textContent = '';
      const solid = el('span', 'closing-solid line-mask');
      solid.appendChild(el('span', 'line', closing.nameSolid));
      const outline = el('span', 'closing-outline line-mask');
      outline.appendChild(el('span', 'line', closing.nameOutline));
      // Solid layer revealed by scroll-linked clip-path (12.8).
      const fillSpan = el('span', 'closing-outline-fill line', closing.nameOutline);
      fillSpan.setAttribute('aria-hidden', 'true');
      outline.appendChild(fillSpan);
      closingName.appendChild(solid);
      closingName.appendChild(outline);
    }
    const closingNote = qs('.closing-bottom p');
    if (closingNote) closingNote.textContent = closing.note;
    setText('#year-now', DATA.meta.year);
    // V6.6: explicit class (span:last-child would now hit .closing-stamp).
    const copyright = qs('.closing-copyright');
    if (copyright) {
      copyright.textContent = '';
      copyright.appendChild(doc.createTextNode('© '));
      copyright.appendChild(el('span', null, DATA.meta.year));
      copyright.appendChild(doc.createTextNode(' · PERSONAL ARCHIVE'));
    }

    // Thin footer
    const siteFooter = qs('.site-footer');
    if (siteFooter) {
      const spans = qsa('span', siteFooter);
      if (spans[0]) spans[0].textContent = DATA.siteFooter.left;
      if (spans[1]) {
        spans[1].textContent = '';
        spans[1].appendChild(doc.createTextNode('HTML '));
        spans[1].appendChild(el('b', null, '+'));
        spans[1].appendChild(doc.createTextNode(' CSS '));
        spans[1].appendChild(el('b', null, '+'));
        spans[1].appendChild(doc.createTextNode(' JS'));
      }
      if (spans[2]) spans[2].textContent = DATA.siteFooter.right;
    }
  }

  /* ======================================================================
   * 3. FUNCTIONAL LAYER
   * ==================================================================== */
  let lenis = null;

  /* ======================================================================
   * 3a. V6.3 §2.2 + §2.3: MOTION LIFECYCLE INFRASTRUCTURE
   * ==================================================================== */
  /* Live preference check for runtime decisions (click handlers, hovers,
     anything that can fire long after boot). The boot-time `reducedMotion`
     constant stays valid for one-shot init decisions only. */
  function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Central registry for everything gsap.matchMedia() cannot revert on
     its own: tweens created asynchronously (from event handlers or
     onComplete callbacks), motion-only listeners, observers, timers,
     intervals, batch triggers and stray ScrollTriggers. Every Set is
     iterable so cleanup can walk it. */
  const motionRegistry = {
    observers: new Set(),
    timers: new Set(),
    intervals: new Set(),
    motionListeners: [],
    eventTweens: new Set(),   // created from event handlers (parallax, hover)
    ambientTweens: new Set(), // created async (onComplete / delayedCall)
    batchTriggers: new Set(), // triggers from ScrollTrigger.batch()
    scrollTriggers: new Set() // other triggers created asynchronously
  };

  let motionMedia = null; // created once in boot() when GSAP is present

  function trackMotionListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    motionRegistry.motionListeners.push({ target, type, handler, options });
  }

  function trackObserver(observer) {
    motionRegistry.observers.add(observer);
    return observer;
  }

  /* Event-handler tweens are not owned by the matchMedia context, so they
     are registered here and removed on cleanup. The original onComplete
     (if any) is preserved and still fires. */
  function trackEventTween(tween) {
    if (!tween) return tween;
    motionRegistry.eventTweens.add(tween);
    if (typeof tween.eventCallback === 'function') {
      const existing = tween.vars && tween.vars.onComplete;
      tween.eventCallback('onComplete', function onDone() {
        motionRegistry.eventTweens.delete(tween);
        if (typeof existing === 'function') existing.apply(this, arguments);
      });
    }
    return tween;
  }

  function trackAmbientTween(tween) {
    if (!tween) return tween;
    motionRegistry.ambientTweens.add(tween);
    return tween;
  }

  /* V6.5 §1.1: dedicated tracker for gsap.quickTo() functions.
     A quickTo returns a reusable function whose internal tween stays
     alive forever (it is never "complete" while parked). The old path,
     trackEventTween(fn.tween), wrapped onComplete so the tween removed
     itself from the registry on its first real animation - the leak:
     after the first pointer move the reduce cleanup could no longer see
     it. This helper registers the parked tween WITHOUT an onComplete
     hook, so it stays listed for the whole motion session and is killed
     exactly once by cleanupMotionRegistry(). */
  function trackQuickTo(fn) {
    if (fn && fn.tween) {
      motionRegistry.eventTweens.add(fn.tween);
    }
    return fn;
  }

  function scrollToTarget(target) {
    if (!target) return;
    /* V6.3 §2.2: the smooth-vs-instant choice is a runtime decision, so
       it reads the live preference, not the boot-time constant. */
    if (lenis && !isReducedMotion()) {
      lenis.scrollTo(target, { offset: -78, duration: 1.1 });
    } else if (isReducedMotion()) {
      target.scrollIntoView();
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function initAnchors() {
    qsa('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const hash = anchor.getAttribute('href');
        if (!hash || hash === '#') return;
        const target = qs(hash);
        if (!target) return;
        event.preventDefault();
        scrollToTarget(target);
        closeQuickMenu();
      });
    });
  }

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

  /* Navigate to a route target. The ID always comes from the configured
     route objects; the raw input is never used to build the target. */
  function navigateToArchiveTarget(entry) {
    const cfg = DATA && DATA.archiveSearch;
    const note = qs('#archive-search-note');
    if (!entry || typeof entry.targetId !== 'string') return false;
    const target = doc.getElementById(entry.targetId);
    if (!target) return false;

    closeArchiveSuggestions();
    scrollToTarget(target);
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
    doc.addEventListener('click', (event) => {
      if (!event.target.closest('.archive-search-wrap')) closeArchiveSuggestions();
    });
    // Keyboard users: close when focus leaves the whole widget.
    wrap.addEventListener('focusout', (event) => {
      if (!wrap.contains(event.relatedTarget)) closeArchiveSuggestions();
    });
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

  function closeQuickMenu() {
    const menu = qs('#quick-menu');
    const button = qs('#menu-dots');
    if (!menu || !button) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  function initQuickMenu() {
    const button = qs('#menu-dots');
    const menu = qs('#quick-menu');
    if (!button || !menu) return;
    button.addEventListener('click', () => {
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      // Open stagger (5.6.3): links slide in briefly. Reduced motion and
      // failure paths show the menu instantly.
      if (willOpen && hasGSAP && !isReducedMotion()) {
        gsap.fromTo(qsa('a', menu),
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: MOTION.easeSoft }
        );
      }
    });
    doc.addEventListener('click', (event) => {
      if (!event.target.closest('#quick-menu') && !event.target.closest('#menu-dots')) closeQuickMenu();
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        closeQuickMenu();
        button.focus(); // focus never lost when closing via keyboard
      }
    });
    // Keyboard users: close when focus moves out of the open menu.
    menu.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (!menu.contains(next) && next !== button) closeQuickMenu();
    });
  }

  function initActiveNav() {
    const links = qsa('.nav-link[data-section]');
    if (!links.length) return;
    const map = new Map();
    links.forEach((link) => map.set(link.dataset.section, link));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // The hero section has no id; it stands in for the "top" area.
        const key = entry.target.id || (entry.target.classList.contains('hero') ? 'top' : '');
        const active = map.get(key);
        if (!active) return;
        links.forEach((link) => link.classList.toggle('active', active === link));
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    ['top', 'work', 'games', 'about', 'offscreen', 'github', 'credentials', 'companion', 'profiles', 'contact'].forEach((id) => {
      // The header itself is too short for the observer band; the hero
      // section represents the "top" area for active-link purposes.
      const section = id === 'top' ? qs('.hero') : qs('#' + id);
      if (section) observer.observe(section);
    });
  }

  let progressTicking = false;
  function updateProgress() {
    progressTicking = false;
    const bar = qs('#progress-bar');
    if (!bar) return;
    const scrollable = doc.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    bar.style.transform = 'scaleX(' + progress + ')';
  }
  function requestProgress() {
    if (!progressTicking) {
      progressTicking = true;
      window.requestAnimationFrame(updateProgress);
    }
  }

  /* V6.3 §2.5.1: initPageProgressBar (was initProgress) owns ONLY the
     reading-progress bar. The lenis.on('scroll') branch was removed:
     Lenis drives the native scroll position, so the window scroll
     listener below already catches every frame it produces. This runs
     outside matchMedia - the progress bar is content, not decoration.
     V6.4 §1.2.2: the globalTimeline pause/resume handler also lives
     here now (outside matchMedia) so a tab that is hidden exactly when
     the motion preference flips can never come back stuck on pause.
     This listener is intentionally NOT tracked: it must survive every
     matchMedia revert, and gsap.globalTimeline.play() is harmless while
     no tween exists (and correct under reduce, where nothing animates
     anyway because every reduced path avoids tweened motion). */
  function initPageProgressBar() {
    const bar = qs('#progress-bar');
    if (bar) {
      bar.style.transformOrigin = '0 50%';
      bar.style.width = '100%';
      bar.style.transform = 'scaleX(0)';
    }
    window.addEventListener('scroll', requestProgress, { passive: true });
    updateProgress();

    if (hasGSAP) {
      doc.addEventListener('visibilitychange', () => {
        if (doc.hidden) {
          gsap.globalTimeline.pause();
        } else {
          gsap.globalTimeline.play();
        }
      });
    }
  }

  /* ======================================================================
   * 4. MOTION LAYER
   * ==================================================================== */
  function fallbackReveal() {
    if (reducedMotion || hasGSAP || !('IntersectionObserver' in window)) return;
    const targets = qsa('.project-card, .software-chip, .skill-chip, .social-card, .contact-card, .journey-item, .about-lead, .about-body, .resume-card, .heading-aside, .credential-card, .credential-slot, .hobby-chip, .github-card, .deck-console, .companion-inner > *');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        observer.unobserve(node);
        const siblings = Array.from(node.parentElement ? node.parentElement.children : []);
        const index = Math.max(0, siblings.indexOf(node));
        node.animate(
          [
            { opacity: 0, transform: 'translateY(22px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 560, delay: Math.min(index, 5) * 60, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'backwards' }
        );
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    targets.forEach((node) => observer.observe(node));
  }

  /* --- V6.6 Fase 9: archive opening experience (Konsep A) ------------------ */
  /* Once per session editorial cover, skippable via click/Escape/scroll/
     SKIP; reduced motion never reaches this path; no JS = no overlay.
     READY waits for BOTH the 1.2s floor and document.fonts.ready. */
  const OPENING_SEEN_KEY = 'fip-opening-seen';

  function shouldShowArchiveOpening() {
    if (!hasGSAP || isReducedMotion() || !qs('#archive-opening')) return false;
    try {
      return window.sessionStorage.getItem(OPENING_SEEN_KEY) !== '1';
    } catch (error) {
      return false; // storage unavailable: stay on the quiet path
    }
  }

  function initArchiveOpening(onComplete) {
    const overlay = qs('#archive-opening');
    if (!overlay) { if (onComplete) onComplete(); return; }

    // Mark the session FIRST so a refresh mid-animation never replays it.
    try { window.sessionStorage.setItem(OPENING_SEEN_KEY, '1'); } catch (error) { /* best effort */ }
    overlay.removeAttribute('aria-hidden'); // content is live while visible
    overlay.hidden = false;

    const topLabel = qs('.opening-label--top', overlay);
    const bottomLabel = qs('.opening-label--bottom', overlay);
    const line = qs('.opening-rule-line', overlay);
    const ticksHost = qs('.opening-rule-ticks', overlay);
    const ruleEnd = qs('.opening-rule-end', overlay);
    const ticks = [];
    if (ticksHost) {
      for (let i = 0; i < 13; i++) {
        const tick = el('span', 'opening-rule-tick');
        ticksHost.appendChild(tick);
        ticks.push(tick);
      }
    }

    gsap.set([topLabel, bottomLabel, ruleEnd], { opacity: 0 });
    gsap.set(ticks, { opacity: 0 });
    gsap.set(overlay, { clipPath: 'inset(0 0 0% 0)' });

    const cleanup = () => {
      doc.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
    const done = () => {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      gsap.set(overlay, { clearProps: 'clipPath,transform' });
      cleanup();
      if (onComplete) onComplete();
    };
    const exitOverlay = (fast) => {
      if (overlay.dataset.closing === '1') return;
      overlay.dataset.closing = '1';
      gsap.to(overlay, {
        clipPath: 'inset(0 0 100% 0)', y: '-2%',
        duration: fast ? 0.3 : 0.7, ease: 'power3.inOut', onComplete: done
      });
    };
    const onKey = (event) => { if (event.key === 'Escape') exitOverlay(true); };
    const onScroll = () => { exitOverlay(true); };

    overlay.addEventListener('click', () => exitOverlay(true));
    doc.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    // Entrance (9.3 steps a to e).
    gsap.to(topLabel, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    gsap.to(line, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' });
    gsap.to(ticks, { opacity: 1, duration: 0.18, stagger: 0.05, ease: 'none', delay: 0.5 });
    gsap.to(bottomLabel, { opacity: 1, duration: 0.3, ease: 'power2.out', delay: 1.2 });

    // Step f: READY after 1.2s AND fonts ready; exit 0.3s later (7g).
    const minDelay = new Promise((resolve) => { window.setTimeout(resolve, 1200); });
    const fontsReady = (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function')
      ? doc.fonts.ready : Promise.resolve();
    Promise.all([minDelay, fontsReady]).then(() => {
      if (overlay.dataset.closing === '1') return;
      gsap.to(ruleEnd, {
        opacity: 1, duration: 0.2, ease: 'none',
        onComplete: () => { window.setTimeout(() => exitOverlay(false), 300); }
      });
    });
  }

  function initHeroIntro() {
    const hero = qs('.hero');
    if (!hero) return;

    // Scanline elements (5.1.1): one per masked headline line, appended
    // before the timeline so they can sweep during the reveal.
    qsa('.hero-title .line-mask').forEach((mask) => {
      if (!mask.querySelector('.scanline')) {
        const scan = el('span', 'scanline');
        scan.setAttribute('aria-hidden', 'true');
        mask.appendChild(scan);
      }
    });

    gsap.set('#hero-title .line', { yPercent: 115 });
    gsap.set(['.eyebrow', '.hero-tail', '.hero-description', '.hero-note', '.scroll-cue'], { opacity: 0, y: 16 });
    gsap.set('.hero-actions > *', { opacity: 0, y: 14 });
    gsap.set('#pixel-frame', { opacity: 0, y: 40, rotate: -14, scale: 0.96 });
    gsap.set('.floating-tool', { opacity: 0, scale: 0.5, y: 10 });
    gsap.set('.hero-sticker', { opacity: 0, scale: 0.9 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('#hero-title .line', { yPercent: 0, duration: 0.9, stagger: 0.09 }, 0.15)
      .to('.eyebrow', { opacity: 1, y: 0, duration: 0.5 }, 0.35)
      .to('.hero-tail', { opacity: 1, y: 0, duration: 0.55 }, 0.62)
      .to('.hero-description', { opacity: 1, y: 0, duration: 0.6 }, 0.72)
      .to('.hero-actions > *', { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, clearProps: 'transform' }, 0.84)
      .to('.hero-note', { opacity: 1, y: 0, duration: 0.5 }, 1.02)
      .to('#pixel-frame', { opacity: 1, y: 0, rotate: -7, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.55)
      .to('.floating-tool', { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' }, 1.0)
      .to('.hero-sticker', { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 1.1)
      .to('.scroll-cue', { opacity: 1, y: 0, duration: 0.5 }, 1.2);

    // Scanline sweep (5.1.1): a light beam crosses each line once while
    // the masked text rises, like a scanner reading the archive.
    tl.fromTo('.scanline',
      { x: '-100%' },
      { x: '100%', duration: 0.6, ease: 'power2.inOut', stagger: 0.09 },
      0.15
    );

    /* Data Atlas entrance (12.1): paths draw themselves in, nodes and
       labels follow. Decorative only, nothing here hides content. */
    const atlasPaths = qsa('.atlas-path');
    if (atlasPaths.length) {
      atlasPaths.forEach((path) => {
        const length = path.getTotalLength ? path.getTotalLength() : 0;
        if (length) gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });
      tl.to(atlasPaths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.25, ease: 'power2.inOut' }, 0.55);
    }
    gsap.set(['.atlas-node', '.atlas-cross'], { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });
    tl.to(['.atlas-node', '.atlas-cross'], { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: MOTION.easeSoft }, 0.9);
    tl.fromTo('.atlas-label', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.08, ease: MOTION.easeSoft }, 1.15);
    tl.fromTo('.atlas-tick', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.3);

    // Ambient atlas loops (4.1) start only after the entrance finishes.
    tl.eventCallback('onComplete', startAtlasAmbient);
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

    // About copy: calm rhythm
    gsap.set(['.about-lead', '.about-body'], { opacity: 0, y: 26 });
    gsap.to(['.about-lead', '.about-body'], {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-layout', start: 'top 78%', once: true }
    });

    // Chips: short stagger (transform cleared afterwards so the CSS hover
    // lift and the :active press (5.3.5) can take over)
    gsap.set('.software-chip', { opacity: 0, scale: 0.85 });
    gsap.to('.software-chip', {
      opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.software-block', start: 'top 85%', once: true }
    });
    gsap.set('.skill-chip', { opacity: 0, y: 14 });
    gsap.to('.skill-chip', {
      opacity: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.skills-block', start: 'top 85%', once: true }
    });

    // Journey + education: sequential, emphasis on titles
    gsap.set('.journey-item', { opacity: 0, x: -18 });
    gsap.to('.journey-item', {
      opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-list', start: 'top 84%', once: true }
    });
    gsap.set('.resume-card', { opacity: 0, y: 40 });
    gsap.to('.resume-card', {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-grid', start: 'top 86%', once: true }
    });

    // Social cards: measured stagger
    gsap.set('.social-card', { opacity: 0, y: 30 });
    gsap.to('.social-card', {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.social-grid', start: 'top 86%', once: true }
    });

    // Credentials: restrained entrance; reserved slots stay quiet
    gsap.set(['.credential-card', '.credential-slot'], { opacity: 0, y: 26 });
    gsap.to(['.credential-card', '.credential-slot'], {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.credential-grid', start: 'top 86%', once: true }
    });

    // Contact block: modest entrance for the email cards
    gsap.set(['.contact-heading', '.contact-card', '.contact-note'], { opacity: 0, y: 22 });
    gsap.to(['.contact-heading', '.contact-card', '.contact-note'], {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact-block', start: 'top 88%', once: true }
    });

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
    gsap.set(['.curiosity-panel', '.curiosity-intro'], { opacity: 0, y: 18 });
    gsap.to(['.curiosity-panel', '.curiosity-intro'], {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: MOTION.easeSoft,
      scrollTrigger: { trigger: '.curiosity-map', start: 'top 78%', once: true }
    });

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

  /* One coordinated pointer state for the hero (12.4 + 12.1):
     identity card x/y drift + capped ±3° tilt + light highlight, the
     floating tools, and the Data Atlas layers all respond to the same
     single mousemove handler through gsap.quickTo(). No second loop
     competes for the same transforms.
     V6.3 §2.5: the pixel-dust spans are DOM and are built once by
     buildHeroDust() in the boot render phase; initPointerParallax()
     (inside the matchMedia no-preference handler) only wires the
     listeners, all through trackMotionListener so the reduce cleanup
     removes them. */
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

  /* Learning Journey rail (12.5): a scroll-linked fill plus a modest
     active-stage highlight. Statuses stay visible without JS or motion.
     V6.3 §2.5.2: the rail nodes are DOM and are rendered by
     renderJourney(); this is the motion half, re-initialisable inside
     the matchMedia no-preference handler. The Ghost-title class and the
     node scale states belong to motion and are removed by
     resetJourneyRail() on cleanup. */
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

  /* Copy email (12.7): Clipboard API first, graceful fallback second,
     and feedback that never claims success that did not happen. */
  function initCopyEmail() {
    const cfg = DATA && DATA.contact;

    qsa('.copy-button').forEach((button) => {
      button.addEventListener('click', () => {
        const value = String(button.dataset.copy || '');
        if (!value) return;

        const finish = (copied) => {
          if (copied) {
            // Checkmark swap (5.6.2): the copy icon is replaced by a drawn
            // check for two seconds, then the original icon returns.
            const originalSvg = button.querySelector('svg');
            if (originalSvg && hasGSAP && !isReducedMotion()) {
              gsap.to(originalSvg, {
                scale: 0, duration: 0.15,
                onComplete: () => {
                  originalSvg.style.display = 'none';
                  const check = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  check.setAttribute('viewBox', '0 0 24 24');
                  check.setAttribute('class', 'copy-check');
                  check.setAttribute('aria-hidden', 'true');
                  check.setAttribute('focusable', 'false');
                  const checkPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
                  checkPath.setAttribute('d', 'M4 12l5 5L20 6');
                  checkPath.setAttribute('fill', 'none');
                  checkPath.setAttribute('stroke', 'currentColor');
                  checkPath.setAttribute('stroke-width', '2');
                  checkPath.setAttribute('stroke-linecap', 'round');
                  checkPath.setAttribute('stroke-linejoin', 'round');
                  check.appendChild(checkPath);
                  const checkLength = 25;
                  checkPath.style.strokeDasharray = checkLength;
                  checkPath.style.strokeDashoffset = checkLength;
                  button.insertBefore(check, originalSvg);
                  gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.2, ease: MOTION.easeSnap });
                  gsap.to(checkPath, { strokeDashoffset: 0, duration: 0.3, delay: 0.1, ease: MOTION.easeDraw });
                  window.setTimeout(() => {
                    gsap.to(check, {
                      scale: 0, duration: 0.15,
                      onComplete: () => {
                        check.remove();
                        originalSvg.style.display = '';
                        gsap.set(originalSvg, { scale: 1 });
                      }
                    });
                  }, 2000);
                }
              });
            } else if (originalSvg && isReducedMotion()) {
              // Reduced motion: instant swap, no animation.
              originalSvg.style.display = 'none';
              const check = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
              check.setAttribute('viewBox', '0 0 24 24');
              check.setAttribute('class', 'copy-check');
              check.setAttribute('aria-hidden', 'true');
              check.setAttribute('focusable', 'false');
              const checkPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
              checkPath.setAttribute('d', 'M4 12l5 5L20 6');
              checkPath.setAttribute('fill', 'none');
              checkPath.setAttribute('stroke', 'currentColor');
              checkPath.setAttribute('stroke-width', '2');
              checkPath.setAttribute('stroke-linecap', 'round');
              checkPath.setAttribute('stroke-linejoin', 'round');
              check.appendChild(checkPath);
              button.insertBefore(check, originalSvg);
              window.setTimeout(() => {
                check.remove();
                originalSvg.style.display = '';
              }, 2000);
            }

            button.classList.add('is-copied');
            const label = qs('.copy-button-label', button);
            if (label) {
              const original = label.textContent;
              label.textContent = 'Copied';
              window.setTimeout(() => { label.textContent = original; button.classList.remove('is-copied'); }, 2000);
            } else {
              window.setTimeout(() => button.classList.remove('is-copied'), 2000);
            }
            showToast(cfg && cfg.copyOk ? cfg.copyOk : 'Email address copied.');
          } else {
            // Fail shake (5.6.2): a short, honest refusal wiggle.
            if (hasGSAP && !isReducedMotion()) {
              gsap.fromTo(button,
                { x: 0 },
                { x: -2, duration: 0.05, ease: 'none', yoyo: true, repeat: 5,
                  onComplete: () => gsap.set(button, { x: 0 }) }
              );
            }
            showToast(cfg && cfg.copyFail ? cfg.copyFail : 'Copy is not available here.');
          }
        };

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(value).then(
            () => finish(true),
            () => finish(legacyCopy(value))
          );
        } else {
          finish(legacyCopy(value));
        }
      });
    });

    function legacyCopy(text) {
      try {
        const area = doc.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        doc.body.appendChild(area);
        area.select();
        const ok = doc.execCommand('copy');
        area.remove();
        return ok === true;
      } catch (error) {
        return false;
      }
    }
  }

  /* V5 §3.1: exactly one Lenis instance, one stable ticker callback.
     lagSmoothing(0) lives in boot() BEFORE Lenis starts; registration of
     ScrollTrigger also happens there, once. `lenis` itself is declared
     once near scrollToTarget(). */
  function lenisTicker(time) {
    if (lenis) lenis.raf(time * 1000); // GSAP ticker: seconds; Lenis: ms
  }
  function initSmoothScroll() {
    if (isReducedMotion() || !hasLenis || !hasGSAP || !hasScrollTrigger || lenis) return;
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', () => window.ScrollTrigger.update());
    gsap.ticker.add(lenisTicker);
  }

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

  function renderAboutNotes() {
    const host = qs('#about-notes');
    if (!host || !DATA || !DATA.about || !Array.isArray(DATA.about.notes)) return;
    host.textContent = '';
    DATA.about.notes.forEach((note, idx) => {
      const card = el('div', 'sticky-note');
      if (!isReducedMotion()) {
        card.style.transform = 'rotate(' + (idx % 2 === 0 ? -1.5 : 1.5) + 'deg)';
      }
      const pin = el('span', 'note-pin', '·');
      pin.setAttribute('aria-hidden', 'true');
      card.appendChild(pin);
      card.appendChild(el('p', null, note));
      host.appendChild(card);
    });
  }

  /* Social icon redraw (5.6.1): on hover, each brand mark redraws itself
     via stroke-dashoffset, then hands back to the plain filled icon. */
  /* --- V6.3 §3.3: HoverGrid-style directional cover reveal ------------------ */
  /* The project cover image reveals from the side the pointer enters.
     Principles adapted from HoverGrid (Codrops, MIT); this implementation
     is original. Two non-negotiables from the spec:
       1. the non-bubbling enter/leave pair of pointer events is NOT used;
          the grid listens to the bubbling over/out pair instead
          (delegation: cards rendered by the filters are covered
          automatically).
       2. The inset() map follows the pointer direction: entering from the
          top clips everything but the top edge, so the reveal travels
          top -> bottom; same logic for the other three sides.
     Leaving the cover simply returns to inset(0 0 0 0) - the image never
     disappears. FocusIn/focusOut give keyboard users the same reveal.
     All listeners run through trackMotionListener and every timeline is
     tracked with trackEventTween, so the reduce cleanup removes them. */
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

  function initSocialIconRedraw() {
    if (!hasGSAP || isReducedMotion()) return;
    qsa('.social-card').forEach((card) => {
      const icon = card.querySelector('.social-icon svg');
      if (!icon) return;
      const paths = icon.querySelectorAll('path');
      paths.forEach((path) => {
        const length = path.getTotalLength ? path.getTotalLength() : 1000;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = 0;
      });
      trackMotionListener(card, 'mouseenter', () => {
        paths.forEach((path) => {
          const length = path.getTotalLength ? path.getTotalLength() : 1000;
          trackEventTween(gsap.fromTo(path,
            { strokeDashoffset: length, fill: 'transparent', stroke: 'currentColor', strokeWidth: 1.5 },
            {
              strokeDashoffset: 0, fill: 'currentColor', stroke: 'currentColor',
              duration: 0.8, ease: MOTION.easeDraw,
              onComplete: () => {
                // Hand back to the stylesheet so the icon looks untouched.
                path.style.strokeDasharray = '';
                path.style.strokeDashoffset = '';
                path.style.stroke = '';
                path.style.fill = '';
                path.style.strokeWidth = '';
              }
            }
          ));
        });
      });
    });
  }

  /* CTA hover bounce (5.1.2): the arrow nudges once and the button lifts
     slightly, both via GSAP so no inline transform fight with CSS. */
  function initHeroButtons() {
    if (!hasGSAP || isReducedMotion()) return;
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
  function initBackTop() {
    const backTop = qs('.back-top');
    if (!backTop || !hasGSAP || isReducedMotion()) return;
    trackMotionListener(backTop, 'mouseenter', () => {
      if (!backTop.textContent.includes('↑')) return;
      trackEventTween(gsap.fromTo(backTop,
        { y: 0 },
        { y: -3, duration: 0.15, yoyo: true, repeat: 1, ease: MOTION.easeSnap }
      ));
    });
  }

  /* ======================================================================
   * 5. V4: THE LIVING ARCADE (sections 03 / 05 / 06 / 08 + extras)
   * ==================================================================== */

  /* V4 render pass: sync every new section's copy from portfolio-data.js
     and render the hobby chips. Uses textContent/createElement only. */
  const HOBBY_ICONS = {
    shuttlecock: 'M12 4 L17 13 H7 Z M8 16.5 h8 M10 20 h4',
    terminal: 'M4 5 h16 v14 h-16 Z M7 10 l3 2.5 -3 2.5 M12.5 15.5 h4.5',
    gamepad: 'M8 8 h8 a4.5 4.5 0 0 1 4.4 5.4 l-0.7 3 a2.6 2.6 0 0 1 -4.7 1 L14 15.5 h-4 L8.9 17.4 a2.6 2.6 0 0 1 -4.7 -1 l-0.7 -3 A4.5 4.5 0 0 1 8 8 Z M8.5 11.2 v2.6 M7.2 12.5 h2.6 M15.5 11.6 h0.01 M17.3 13.4 h0.01',
    headphones: 'M5 15 v-2.5 a7 7 0 0 1 14 0 V15 M5 15 h3.4 v5 H5 Z M15.6 15 H19 v5 h-3.4 Z'
  };

  function hobbyIconNode(iconKey) {
    const key = String(iconKey || '').toLowerCase();
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', HOBBY_ICONS[key] || HOBBY_ICONS.terminal);
    svg.appendChild(path);
    return svg;
  }

  function renderV4Sections() {
    if (!DATA) return;

    // Game deck copy
    const gd = DATA.gameDeck;
    if (gd) {
      setText('#games-kicker', gd.kicker);
      buildHeading(qs('#games-heading'), gd.heading, gd.headingAccentWord);
      setText('#games-intro', gd.intro);
      setText('#deck-hint', gd.hint);
      setText('#deck-button-label', gd.insertLabel);
      setText('.deck-no-signal', gd.screenOffLabel);
      setText('.deck-no-signal-sub', gd.screenOffSub);
      setText('.deck-footnote span:first-child', gd.footnote);
      setText('.deck-footnote span:last-child', gd.footnoteSub);
      const region = qs('#deck-region');
      if (region) region.setAttribute('aria-label', gd.deckAriaLabel || 'Game deck');
    }

    // Off-screen copy + hobby chips + Spotify frame
    const off = DATA.offscreen;
    if (off) {
      setText('#offscreen-kicker', off.kicker);
      buildHeading(qs('#offscreen-heading'), off.heading, off.headingAccentWord);
      setText('#offscreen-intro', off.intro);
      setText('#pixel-stage-label', off.pixelLabel);

      const host = qs('#hobby-chips');
      if (host && Array.isArray(off.hobbies)) {
        host.textContent = '';
        /* V6.6 Fase 4.3: wrapper div + button.hobby-chip-main + separate
           a.hobby-link (an <a> inside <button> would be invalid HTML). */
        const HOBBY_LINKS = {
          badminton: ['journey', 'Jump to learning journey'],
          coding: ['work', 'Jump to project archive'],
          gaming: ['offscreen', 'Jump to off-screen section'],
          music: ['offscreen', 'Jump to off-screen section']
        };
        off.hobbies.forEach((hobby) => {
          const chip = el('div', 'hobby-chip');
          const main = el('button', 'hobby-chip-main');
          main.type = 'button';
          main.dataset.hobby = String(hobby.label || '').toLowerCase();
          const icon = el('span', 'hobby-icon');
          icon.setAttribute('aria-hidden', 'true');
          icon.appendChild(hobbyIconNode(hobby.icon));
          main.appendChild(icon);
          const body = el('span', 'hobby-body');
          body.appendChild(el('b', 'hobby-label', hobby.label));
          body.appendChild(el('small', 'hobby-detail', hobby.detail));
          main.appendChild(body);
          chip.appendChild(main);
          const mapped = HOBBY_LINKS[main.dataset.hobby] || ['work', 'Jump to project archive'];
          const link = el('a', 'hobby-link', '\u2192');
          link.setAttribute('href', '#' + mapped[0]);
          link.setAttribute('aria-label', mapped[1]);
          chip.appendChild(link);
          host.appendChild(chip);
        });
      }

      const sp = off.spotify;
      if (sp) {
        setText('#spotify-frame-label', sp.frameLabel);
        const iframe = qs('#spotify-embed');
        if (iframe && sp.embedUrl) iframe.setAttribute('src', sp.embedUrl);
        if (iframe && sp.playlistName) iframe.setAttribute('title', 'Spotify playlist: ' + sp.playlistName);
        const link = qs('#spotify-frame-link');
        if (link && sp.playlistUrl) link.href = sp.playlistUrl;
      }
    }

    // GitHub activity copy + honest no-JS fallback line
    const gh = DATA.githubActivity;
    if (gh) {
      setText('#github-kicker', gh.kicker);
      buildHeading(qs('#github-heading'), gh.heading, gh.headingAccentWord);
      setText('#github-intro', gh.intro);
      const fallback = qs('#github-fallback');
      if (fallback) {
        fallback.textContent = '';
        const message = el('span', null, gh.jsRequiredMessage || 'GITHUB STATS REQUIRE JAVASCRIPT.');
        fallback.appendChild(message);
        const link = el('a', null, (gh.fallbackLinkLabel || 'VISIT THE PROFILE DIRECTLY') + ' ');
        link.href = gh.profileUrl || ('https://github.com/' + encodeURIComponent(gh.username || ''));
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

    // V5.2 §4.2: measurement ticks above the project grid. Decorative
    // layout numbers only; the live count stays in #project-count.
    const decoGallery = DATA.decorations && DATA.decorations.gallery;
    if (decoGallery && Array.isArray(decoGallery.rulerLabels)) {
      qsa('.gallery-ruler span').forEach((span, index) => {
        if (decoGallery.rulerLabels[index]) span.textContent = decoGallery.rulerLabels[index];
      });
    }

    // Companion copy + labels
    const comp = DATA.companion;
    if (comp) {
      setText('#companion-kicker', comp.kicker);
      buildHeading(qs('#companion-heading'), comp.heading, comp.headingAccentWord);
      setText('#companion-intro', comp.intro);
      const toggle = qs('#companion-toggle');
      if (toggle) toggle.textContent = comp.summonLabel || 'Summon companion';
      const stamp = qs('.heading-stamp-pet');
      if (stamp) {
        stamp.textContent = '';
        stamp.appendChild(el('b', null, comp.stampBold || comp.petName || 'KOK'));
        stamp.appendChild(doc.createElement('br'));
        stamp.appendChild(doc.createTextNode(comp.stampTop || 'PAGE PET'));
        const star = el('span', null, '✳');
        star.setAttribute('aria-hidden', 'true');
        stamp.appendChild(star);
      }
      setText('.companion-note span:first-child', comp.note);
      setText('.companion-note span:last-child', comp.noteSub);
      const petButton = qs('#companion-pet-button');
      if (petButton) petButton.setAttribute('aria-label', comp.petAriaLabel || 'Companion. Click to say hi.');
    }
  }

  /* --- Section 03: Game Deck ------------------------------------------ */
  /* --- V6.4 Fase 2: one pixel scene per game ------------------------------ */
  /* 16x16 rect-only scenes (viewBox 0 0 16 16, crispEdges via CSS), one
     per game id, max 20 rects each: background (3-5 rects), character
     (8-12 rects) and effects (2-4 rects). Fills use the real --px-*
     tokens promoted to :root in V6.3; '@theme' substitutes the game's
     own themeColor for exactly one or two accent rects. Entry format:
     [x, y, w, h, fill, className?, fillOpacity?]. The className hooks the
     CSS steps() loop animation (see styles.css V6.4 §2.6). Only
     right-angle pixel aesthetics: no curves, no round joins. */
  const GAME_SCENE_SPECS = {
    /* Valorant: industrial wall, sand ground, agent with pistol. */
    valorant: [
      [0, 0, 16, 8, 'var(--px-slate)'],
      [11, 1, 4, 3, 'var(--px-blue)'],
      [0, 12, 16, 4, 'var(--px-wood)'],
      [4, 4, 3, 3, 'var(--px-ivory)'],
      [4, 5, 3, 1, '@theme'],
      [3, 7, 5, 4, 'var(--px-black)'],
      [4, 11, 1, 2, 'var(--px-black)'],
      [6, 11, 1, 2, 'var(--px-black)'],
      [8, 8, 2, 1, 'var(--px-black)'],
      [10, 7, 4, 1, 'var(--px-steel)'],
      [10, 8, 1, 1, 'var(--px-steel)'],
      [14, 7, 2, 2, 'var(--px-gold)', 'val-muzzle'],
      [9, 10, 1, 1, 'var(--px-gold)', 'val-casing']
    ],
    /* Hades II: Tartarus wall, twin torches, Melinoe with staff. */
    'hades-ii': [
      [0, 0, 16, 11, 'var(--px-navy)'],
      [0, 11, 16, 5, 'var(--px-black)'],
      [2, 6, 1, 3, 'var(--px-gold)', 'hades-torch'],
      [13, 6, 1, 3, 'var(--px-gold)', 'hades-torch'],
      [7, 2, 3, 2, 'var(--px-ivory)'],
      [7, 4, 3, 2, 'var(--px-ivory)'],
      [6, 6, 5, 4, 'var(--px-blue)'],
      [5, 7, 1, 2, 'var(--px-blue)'],
      [11, 7, 1, 2, 'var(--px-blue)'],
      [12, 2, 1, 9, 'var(--px-wood)'],
      [7, 10, 1, 1, 'var(--px-black)'],
      [9, 10, 1, 1, 'var(--px-black)'],
      [2, 3, 1, 1, 'var(--px-neon)', 'hades-rune'],
      [4, 4, 1, 1, 'var(--px-neon)', 'hades-rune'],
      [12, 12, 1, 1, 'var(--px-neon)', 'hades-rune'],
      [12, 1, 1, 1, '@theme']
    ],
    /* Dark Souls III: dungeon wall, knight with sword and shield. */
    'dark-souls-iii': [
      [0, 0, 16, 10, 'var(--px-slate)'],
      [0, 10, 16, 6, 'var(--px-black)'],
      [13, 4, 1, 3, 'var(--px-gold)', 'ds3-torch'],
      [5, 2, 3, 2, 'var(--px-steel)'],
      [6, 3, 1, 1, 'var(--px-black)'],
      [4, 4, 5, 4, 'var(--px-steel)'],
      [5, 8, 1, 3, 'var(--px-steel)'],
      [7, 8, 1, 3, 'var(--px-steel)'],
      [2, 4, 2, 4, 'var(--px-navy)'],
      [11, 1, 1, 8, 'var(--px-ivory)', 'ds3-sword'],
      [10, 9, 3, 1, 'var(--px-wood)', 'ds3-sword'],
      [9, 1, 2, 1, 'var(--px-ivory)', 'ds3-slash', 0.6],
      [10, 2, 1, 2, 'var(--px-ivory)', 'ds3-slash', 0.4],
      [9, 4, 1, 1, 'var(--px-ivory)', 'ds3-slash', 0.2],
      [3, 9, 1, 1, '@theme']
    ],
    /* Hearts of Iron IV: parchment map, commander with pointer. */
    'hearts-of-iron-iv': [
      [0, 0, 16, 16, 'var(--px-gold)', 'hoi4-paper', 0.25],
      [0, 0, 16, 1, 'var(--px-wood-dark)'],
      [0, 15, 16, 1, 'var(--px-wood-dark)'],
      [0, 0, 1, 16, 'var(--px-wood-dark)'],
      [15, 0, 1, 16, 'var(--px-wood-dark)'],
      [6, 2, 4, 1, 'var(--px-navy)'],
      [6, 3, 3, 2, 'var(--px-ivory)'],
      [5, 5, 5, 5, 'var(--px-navy)'],
      [10, 6, 2, 1, 'var(--px-navy)'],
      [12, 3, 1, 4, 'var(--px-wood)'],
      [6, 10, 1, 3, 'var(--px-navy)'],
      [8, 10, 1, 3, 'var(--px-navy)'],
      [6, 13, 1, 1, 'var(--px-black)'],
      [8, 13, 1, 1, 'var(--px-black)'],
      [3, 5, 2, 1, 'var(--px-pink)', 'hoi4-arrow'],
      [12, 9, 1, 2, 'var(--px-python-blue)', 'hoi4-arrow'],
      [3, 10, 2, 1, 'var(--px-python-blue)', 'hoi4-arrow'],
      [7, 12, 1, 1, '@theme']
    ],
    /* Minecraft: stone wall, dirt floor, Steve with pickaxe. */
    minecraft: [
      [0, 0, 16, 10, 'var(--px-gray)'],
      [0, 10, 16, 6, 'var(--px-wood)'],
      [13, 6, 1, 3, 'var(--px-gold)', 'mc-torch'],
      [5, 2, 3, 1, 'var(--px-wood-dark)'],
      [5, 3, 3, 2, 'var(--px-ivory)'],
      [4, 5, 5, 4, 'var(--px-python-blue)'],
      [3, 5, 1, 3, 'var(--px-python-blue)'],
      [9, 5, 1, 3, 'var(--px-python-blue)'],
      [5, 9, 1, 3, 'var(--px-navy)'],
      [7, 9, 1, 3, 'var(--px-navy)'],
      [10, 2, 3, 1, 'var(--px-steel)', 'mc-pick'],
      [11, 3, 1, 3, 'var(--px-wood)', 'mc-pick'],
      [2, 3, 2, 2, 'var(--px-gold)', 'mc-ore'],
      [2, 4, 1, 1, 'var(--px-black)', 'mc-crack'],
      [3, 3, 1, 1, 'var(--px-black)', 'mc-crack'],
      [8, 2, 1, 1, '@theme']
    ],
    /* Age of Empires IV: watercolor hills, castle, soldier with spear. */
    'age-of-empires-iv': [
      [0, 1, 16, 5, 'var(--px-python-blue)', 'aoe-wash', 0.3],
      [9, 2, 5, 8, 'var(--px-slate)'],
      [0, 10, 16, 6, 'var(--px-wood)'],
      [5, 3, 3, 2, 'var(--px-steel)'],
      [4, 5, 5, 4, 'var(--px-steel)'],
      [9, 6, 1, 2, 'var(--px-steel)'],
      [10, 0, 1, 1, 'var(--px-steel)'],
      [10, 1, 1, 9, 'var(--px-wood)'],
      [2, 6, 2, 3, 'var(--px-navy)'],
      [5, 9, 1, 1, 'var(--px-steel)'],
      [7, 9, 1, 1, 'var(--px-steel)'],
      [3, 2, 1, 3, '@theme', 'aoe-banner'],
      [3, 1, 1, 1, 'var(--px-gold)']
    ],
    /* Total War: Warhammer III: chaos realm, blood ground, chaos warrior. */
    'total-war-warhammer-iii': [
      [0, 0, 16, 13, 'var(--px-black)'],
      [0, 13, 16, 3, 'var(--px-pink)', 'tw-lava'],
      [2, 12, 1, 1, 'var(--px-ivory)'],
      [12, 12, 1, 1, 'var(--px-ivory)'],
      [5, 2, 3, 2, 'var(--px-navy)'],
      [4, 1, 1, 2, 'var(--px-ivory)'],
      [9, 1, 1, 2, 'var(--px-ivory)'],
      [4, 4, 5, 5, 'var(--px-navy)'],
      [11, 3, 1, 5, 'var(--px-wood)', 'tw-axe'],
      [12, 3, 2, 2, 'var(--px-steel)', 'tw-axe'],
      [5, 9, 1, 2, 'var(--px-navy)'],
      [7, 9, 1, 2, 'var(--px-navy)'],
      [5, 14, 2, 1, 'var(--px-gold)', 'tw-lava-flicker'],
      [10, 13, 1, 1, 'var(--px-gold)', 'tw-lava-flicker'],
      [8, 6, 1, 2, '@theme']
    ],
    /* Red Dead Redemption II: sky, mesa, desert, cowboy with revolver. */
    'red-dead-redemption-ii': [
      [0, 0, 16, 4, 'var(--px-python-blue)'],
      [0, 4, 16, 7, 'var(--px-wood-dark)'],
      [0, 11, 16, 5, 'var(--px-gold)'],
      [5, 3, 4, 1, 'var(--px-wood-dark)'],
      [6, 2, 2, 1, 'var(--px-wood-dark)'],
      [6, 4, 2, 1, 'var(--px-ivory)'],
      [5, 5, 4, 4, 'var(--px-pink)', 'rdr-body', 0.5],
      [4, 5, 1, 3, 'var(--px-pink)', 'rdr-body', 0.5],
      [9, 5, 1, 3, 'var(--px-pink)', 'rdr-body', 0.5],
      [10, 8, 2, 1, 'var(--px-steel)'],
      [6, 9, 1, 2, 'var(--px-black)'],
      [8, 9, 1, 2, 'var(--px-black)'],
      [2, 12, 2, 1, 'var(--px-gold)', 'rdr-dust', 0.4],
      [3, 14, 1, 1, 'var(--px-gold)', 'rdr-dust', 0.3],
      [12, 1, 3, 2, '@theme']
    ],
    /* Ghost of Tsushima: maple canopy, torii, Jin with katana. */
    'ghost-of-tsushima': [
      [0, 0, 16, 6, 'var(--px-pink)', 'got-leaves', 0.35],
      [9, 2, 6, 1, 'var(--px-navy)', 'got-torii'],
      [10, 3, 1, 5, 'var(--px-navy)', 'got-torii'],
      [13, 3, 1, 5, 'var(--px-navy)', 'got-torii'],
      [0, 8, 16, 8, 'var(--px-wood)'],
      [2, 3, 2, 2, 'var(--px-navy)'],
      [2, 4, 2, 1, 'var(--px-ivory)'],
      [1, 5, 4, 4, 'var(--px-navy)'],
      [0, 6, 1, 2, 'var(--px-navy)'],
      [5, 6, 1, 2, 'var(--px-navy)'],
      [5, 4, 1, 5, 'var(--px-ivory)', 'got-katana'],
      [5, 9, 1, 2, 'var(--px-black)', 'got-katana'],
      [2, 9, 1, 1, 'var(--px-black)'],
      [3, 9, 1, 1, 'var(--px-black)'],
      [7, 6, 1, 1, 'var(--px-pink)', 'got-leaf'],
      [11, 10, 1, 1, 'var(--px-pink)', 'got-leaf'],
      [4, 12, 1, 1, 'var(--px-pink)', 'got-leaf'],
      [5, 3, 1, 1, '@theme']
    ],
    /* The Last of Us Part I: concrete wall, vines, Joel with pistol. */
    'the-last-of-us-part-i': [
      [0, 0, 16, 10, 'var(--px-gray)'],
      [0, 2, 1, 6, 'var(--px-lime)', 'tlou-vine'],
      [1, 5, 1, 3, 'var(--px-lime)', 'tlou-vine'],
      [0, 10, 16, 6, 'var(--px-black)'],
      [5, 2, 3, 1, 'var(--px-black)'],
      [5, 3, 3, 2, 'var(--px-ivory)'],
      [4, 5, 5, 4, 'var(--px-wood-dark)'],
      [3, 5, 1, 3, 'var(--px-wood-dark)'],
      [9, 5, 1, 3, 'var(--px-wood-dark)'],
      [10, 6, 3, 1, 'var(--px-steel)'],
      [5, 9, 1, 2, 'var(--px-navy)'],
      [7, 9, 1, 2, 'var(--px-navy)'],
      [11, 2, 3, 3, 'var(--px-gold)', 'tlou-flashlight', 0.5],
      [2, 7, 1, 2, '@theme']
    ],
    /* Outlast II: night sky, church, corn field, Blake with camcorder. */
    'outlast-ii': [
      [0, 0, 16, 5, 'var(--px-navy)'],
      [8, 0, 1, 1, 'var(--px-slate)'],
      [6, 1, 5, 4, 'var(--px-slate)'],
      [0, 5, 16, 11, 'var(--px-gold)', 'out-corn', 0.2],
      [2, 5, 1, 4, 'var(--px-gold)', 'out-corn', 0.5],
      [5, 6, 3, 1, 'var(--px-black)'],
      [5, 7, 3, 1, 'var(--px-ivory)'],
      [4, 8, 5, 4, 'var(--px-slate)'],
      [3, 8, 1, 3, 'var(--px-slate)'],
      [9, 8, 3, 2, 'var(--px-black)'],
      [5, 12, 1, 2, 'var(--px-black)'],
      [7, 12, 1, 2, 'var(--px-black)'],
      [5, 14, 1, 1, 'var(--px-black)'],
      [7, 14, 1, 1, 'var(--px-black)'],
      [1, 1, 1, 1, 'var(--px-lime)', 'out-noise'],
      [14, 3, 1, 1, 'var(--px-lime)', 'out-noise'],
      [3, 10, 1, 1, 'var(--px-lime)', 'out-noise'],
      [10, 9, 1, 1, '@theme']
    ]
  };

  /* V6.4 §2.2.4: the old PIXEL_CHARACTERS lookup is gone (the per-card
     avatar became a full scene). The eject choreography still needs the
     genre key, so the check is now this explicit allowlist with the same
     roguelike fallback as before. */
  const DECK_GENRES = ['roguelike', 'shooter', 'soulslike', 'strategy', 'sandbox', 'horror'];

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* V6.4 §2.3: build the .game-pixel-scene wrapper + scene SVG for one
     game. Unknown ids fall back to a single-color frame. */
  function buildGamePixelScene(game) {
    const wrapper = el('div', 'game-pixel-scene game-pixel-scene--' + String((game && game.id) || 'default'));
    wrapper.setAttribute('aria-hidden', 'true');

    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('focusable', 'false');

    const layers = GAME_SCENE_SPECS[game && game.id];
    if (!layers) {
      /* Fallback: single-color frame. */
      const fill = doc.createElementNS(SVG_NS, 'rect');
      fill.setAttribute('x', '0');
      fill.setAttribute('y', '0');
      fill.setAttribute('width', '16');
      fill.setAttribute('height', '16');
      fill.setAttribute('fill', 'var(--px-slate)');
      svg.appendChild(fill);
    } else {
      layers.forEach((layer) => {
        const rect = doc.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(layer[0]));
        rect.setAttribute('y', String(layer[1]));
        rect.setAttribute('width', String(layer[2]));
        rect.setAttribute('height', String(layer[3]));
        rect.setAttribute('fill', layer[4] === '@theme' ? String(game.themeColor || '#93C5FD') : layer[4]);
        if (layer[5]) rect.setAttribute('class', String(layer[5]));
        if (typeof layer[6] === 'number') rect.setAttribute('fill-opacity', String(layer[6]));
        svg.appendChild(rect);
      });
    }

    wrapper.appendChild(svg);
    return wrapper;
  }

  /* --- V6.4 Fase 3: entrance choreography helpers ------------------------- */

  /* Temporary entrance props share the .deck-temp class. Every tween that
     introduces one fades it out, and the deck state machine sweeps any
     .deck-temp node at every boundary (settle, eject, re-open, reduce),
     so no prop can survive its animation (V6.4 §3.3.3). */
  function deckTemp(className) {
    const node = el('span', 'deck-temp ' + className);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  /* themeColor comes from the data file, never from user input; this is
     a pure colour-format helper for box-shadows and prop tints. */
  function hexToRgba(hex, alpha) {
    const value = String(hex || '').replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const int = parseInt(full, 16);
    if (!isFinite(int)) return 'rgba(147, 197, 253, ' + alpha + ')';
    return 'rgba(' + ((int >> 16) & 255) + ', ' + ((int >> 8) & 255) + ', ' + (int & 255) + ', ' + alpha + ')';
  }

  /* One small decorative square/rect prop positioned inside a card. */
  function deckProp(host, className, left, top) {
    const node = deckTemp(className);
    if (left !== undefined) node.style.left = left;
    if (top !== undefined) node.style.top = top;
    host.appendChild(node);
    return node;
  }

  /* V6.4 §3.2: GAME_ENTRANCE_SPECS. One function per game id, module
     scope. Each spec receives (tl, card, index) and appends its 4-5
     choreography tweens at `at = 0.25 + index * 0.06`, so every entrance
     lives on the ONE kill()-able open timeline (Batasan 11) and every
     tween is inside trackEventTween via that timeline (Batasan 12). */
  const GAME_ENTRANCE_SPECS = {
    /* Valorant: fast deploy from the right, screen flash, recoil. */
    valorant: function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      const screenEl = card.closest('.deck-screen') || doc.body;
      const scene = qs('.game-pixel-scene', card);
      // 1. slide in from the right
      tl.fromTo(card, { x: 200, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, at);
      // 2. one white flash across the screen
      const flash = deckProp(screenEl, 'deck-flash');
      tl.fromTo(flash, { opacity: 0.4 }, { opacity: 0, duration: 0.2, ease: 'none' }, at + 0.1);
      // 3. recoil shake (renders after the slide, so the overlap reads as impact)
      tl.to(card, {
        keyframes: [
          { x: -2, duration: 0.04 },
          { x: 2, duration: 0.04 },
          { x: -2, duration: 0.04 },
          { x: 0, duration: 0.04 }
        ],
        ease: 'none'
      }, at + 0.2);
      // 4. border pulse in the game colour
      const theme = String(card.style.getPropertyValue('--game-color') || '#FF4655');
      tl.fromTo(card, { boxShadow: '0 0 20px ' + theme }, { boxShadow: '0 0 0px ' + theme, duration: 0.3, ease: 'power2.out' }, at + 0.25);
      // 5. scene pops
      if (scene) {
        tl.fromTo(scene, { scale: 0.6 }, { scale: 1.2, duration: 0.1, ease: 'power2.out' }, at + 0.3)
          .to(scene, { scale: 1, duration: 0.1, ease: 'power2.in' }, at + 0.4);
      }
    },

    /* Hades II: circle wipe, golden glow, spring scale, runes, scene glow. */
    'hades-ii': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      const scene = qs('.game-pixel-scene', card);
      // 1. circle wipe from the centre
      tl.fromTo(card, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(100% at 50% 50%)', duration: 0.5, ease: 'power2.out' }, at);
      // 2. golden inner glow that dies away
      tl.fromTo(card, { boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.6)' }, { boxShadow: 'inset 0 0 0px rgba(212, 175, 55, 0)', duration: 0.4, ease: 'power2.out' }, at + 0.05);
      // 3. spring scale
      tl.fromTo(card, { scale: 0.8 }, { scale: 1.05, duration: 0.18, ease: 'back.out(1.5)' }, at + 0.05)
        .to(card, { scale: 1, duration: 0.17, ease: 'power2.out' }, at + 0.23);
      // 4. rune particles stagger in (rotation stays owned by the CSS loop)
      const runes = qsa('.hades-rune', card);
      if (runes.length) tl.fromTo(runes, { scale: 0.4 }, { scale: 1, duration: 0.3, stagger: 0.05, ease: 'steps(2)', transformOrigin: '50% 50%' }, at + 0.15);
      // 5. scene glow fade
      if (scene) tl.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, at + 0.3);
    },

    /* Dark Souls III: boss drop from above, darkened screen, dust burst. */
    'dark-souls-iii': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      const screenEl = card.closest('.deck-screen') || doc.body;
      // 1. fall from above
      tl.fromTo(card, { y: -300, rotation: -10, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.5, ease: 'power2.in' }, at);
      // 2. the room darkens, then recovers
      const dark = deckProp(screenEl, 'deck-darken');
      tl.fromTo(dark, { opacity: 0 }, { keyframes: [{ opacity: 0.5, duration: 0.15, ease: 'none' }, { opacity: 0, duration: 0.15, ease: 'none' }] }, at + 0.15);
      // 3. landing dust burst
      for (let i = 0; i < 3; i++) {
        const puff = deckProp(card, 'deck-dust', (28 + i * 20) + '%', '58%');
        tl.fromTo(puff, { y: 0, opacity: 1 }, { y: -20, opacity: 0, duration: 0.4, ease: 'power1.out' }, at + 0.15 + i * 0.03);
      }
      // 4. sword slash trail
      const slash = deckProp(card, 'deck-slash');
      tl.fromTo(slash, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.12, ease: 'none' }, { opacity: 0, duration: 0.13, ease: 'none' }] }, at + 0.25);
      // 5. ember glow settles and fades
      const ember = deckProp(card, 'deck-ember');
      ember.style.background = hexToRgba(String(card.style.getPropertyValue('--game-color') || '#E25822'), 0.35);
      tl.fromTo(ember, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.15, ease: 'none' }, { opacity: 0, duration: 0.15, ease: 'none' }] }, at + 0.35);
    },

    /* Hearts of Iron IV: map unrolls upward, lines extend, markers pop. */
    'hearts-of-iron-iv': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. clip reveal from the bottom edge
      tl.fromTo(card, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.out' }, at);
      // 2. border lines extend from the centre
      const lineTop = deckProp(card, 'deck-line deck-line--top');
      const lineBottom = deckProp(card, 'deck-line deck-line--bottom');
      tl.fromTo([lineTop, lineBottom], { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, at + 0.1);
      tl.to([lineTop, lineBottom], { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.45);
      // 3. unit markers pop in, then fall back
      const markers = [];
      for (let i = 0; i < 4; i++) {
        markers.push(deckProp(card, 'deck-marker', (16 + (i % 2) * 52) + '%', (28 + Math.floor(i / 2) * 34) + '%'));
      }
      tl.fromTo(markers, { scale: 0 }, { scale: 1, duration: 0.25, stagger: 0.05, ease: 'back.out(2)', transformOrigin: '50% 50%' }, at + 0.2);
      tl.to(markers, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.5);
      // 4. command arrows slide in
      const arrows = [deckProp(card, 'deck-arrow deck-arrow--a', '12%', '40%'), deckProp(card, 'deck-arrow deck-arrow--b', '58%', '62%')];
      tl.fromTo(arrows, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out' }, at + 0.25);
      tl.to(arrows, { opacity: 0, duration: 0.12, ease: 'none' }, at + 0.58);
      // 5. paper texture settles over the map, then fades
      const paper = deckProp(card, 'deck-paper');
      tl.fromTo(paper, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, at + 0.3);
      tl.to(paper, { opacity: 0, duration: 0.2, ease: 'none' }, at + 0.55);
    },

    /* Minecraft: block pops out of the ground, dirt burst, pickaxe swing. */
    minecraft: function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. rise with a bounce, springing the scale
      tl.fromTo(card, { y: 200, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.2)' }, at);
      tl.fromTo(card, { scale: 0.4 }, { keyframes: [{ scale: 1.05, duration: 0.28, ease: 'power2.out' }, { scale: 1, duration: 0.17, ease: 'power2.out' }] }, at);
      // 2. dirt particles burst radially
      for (let i = 0; i < 6; i++) {
        const bit = deckProp(card, 'deck-dirt', (24 + i * 10) + '%', (44 + (i % 3) * 12) + '%');
        const dx = (i % 2 === 0 ? -1 : 1) * (10 + i * 4);
        tl.fromTo(bit, { x: 0, y: 0, opacity: 1 }, { x: dx, y: -18 - (i % 3) * 6, opacity: 0, duration: 0.4, ease: 'power1.out' }, at + 0.05);
      }
      // 3. pickaxe swing
      const pick = qsa('.mc-pick', card);
      if (pick.length) tl.fromTo(pick, { rotation: 0 }, { rotation: -25, duration: 0.1, yoyo: true, repeat: 1, ease: 'steps(2)', transformOrigin: '0% 100%' }, at + 0.2);
      // 4. ore block appears
      const ore = qs('.mc-ore', card);
      if (ore) tl.fromTo(ore, { scale: 0 }, { scale: 1, duration: 0.25, ease: 'back.out(2)', transformOrigin: '50% 50%' }, at + 0.25);
      // 5. torch light settles
      const torch = qs('.mc-torch', card);
      if (torch) tl.fromTo(torch, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, at + 0.35);
    },

    /* Age of Empires IV: alternating march, banner unfurl, formation. */
    'age-of-empires-iv': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      const fromRight = index % 2 === 0;
      // 1. march in from alternating sides
      tl.fromTo(card, { x: fromRight ? 150 : -150, rotation: fromRight ? 5 : -5, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }, at);
      // 2. banner unfurls downward
      const banner = qs('.aoe-banner', card);
      if (banner) tl.fromTo(banner, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.3, ease: 'power2.out' }, at + 0.1);
      // 3. watercolor wash rolls over the card and fades
      const wash = deckProp(card, 'deck-wash');
      tl.fromTo(wash, { opacity: 0 }, { keyframes: [{ opacity: 0.3, duration: 0.2, ease: 'none' }, { opacity: 0.15, duration: 0.2, ease: 'none' }] }, at + 0.15);
      tl.to(wash, { opacity: 0, duration: 0.2, ease: 'none' }, at + 0.6);
      // 4. formation markers pop, then fall back
      const markers = [];
      for (let i = 0; i < 3; i++) {
        markers.push(deckProp(card, 'deck-marker', (22 + i * 26) + '%', '64%'));
      }
      tl.fromTo(markers, { scale: 0 }, { scale: 1, duration: 0.2, stagger: 0.04, ease: 'back.out(2)', transformOrigin: '50% 50%' }, at + 0.2);
      tl.to(markers, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.55);
      // 5. soft glow settle
      tl.fromTo(card, { boxShadow: '0 0 0px rgba(147, 197, 253, 0)' }, { boxShadow: '0 0 15px rgba(147, 197, 253, 0.35)', duration: 0.3, ease: 'power2.out' }, at + 0.3);
    },

    /* Total War: blood ground rise, inner blood glow, lava burst. */
    'total-war-warhammer-iii': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. rise from below with a clip reveal
      tl.fromTo(card, { y: 150, clipPath: 'inset(100% 0% 0% 0%)' }, { y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power2.out' }, at);
      // 2. blood pool inner glow blooms, then dies
      tl.fromTo(card, { boxShadow: 'inset 0 0 0px rgba(255, 0, 0, 0)' }, { keyframes: [{ boxShadow: 'inset 0 0 25px rgba(255, 0, 0, 0.5)', duration: 0.2, ease: 'power2.out' }, { boxShadow: 'inset 0 0 0px rgba(255, 0, 0, 0)', duration: 0.2, ease: 'power2.in' }] }, at + 0.15);
      // 3. lava burst
      for (let i = 0; i < 5; i++) {
        const spark = deckProp(card, 'deck-lava', (14 + i * 17) + '%', '62%');
        tl.fromTo(spark, { y: 0, opacity: 1 }, { y: -24 - (i % 2) * 10, opacity: 0, duration: 0.35, ease: 'power1.out' }, at + 0.2 + (i % 3) * 0.03);
      }
      // 4. axe swing
      const axe = qsa('.tw-axe', card);
      if (axe.length) tl.fromTo(axe, { rotation: 0 }, { rotation: -30, duration: 0.1, yoyo: true, repeat: 1, ease: 'steps(2)', transformOrigin: '0% 100%' }, at + 0.25);
      // 5. blood splatter accent
      const splat = deckProp(card, 'deck-splatter', '58%', '18%');
      splat.style.background = 'rgba(153, 0, 0, 0.5)';
      tl.fromTo(splat, { scale: 0 }, { keyframes: [{ scale: 1.2, duration: 0.15, ease: 'power2.out' }, { scale: 1, duration: 0.1, ease: 'power2.in' }], transformOrigin: '50% 50%' }, at + 0.35);
      tl.to(splat, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.55);
    },

    /* Red Dead Redemption II: ride in from the left, dust trail, hat tip. */
    'red-dead-redemption-ii': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. ride in diagonally
      tl.fromTo(card, { x: -200, y: 50, rotation: -5, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, at);
      // 2. dust trail behind the ride
      const puffs = [];
      for (let i = 0; i < 3; i++) {
        puffs.push(deckProp(card, 'deck-dust deck-dust--rdr', (18 + i * 20) + '%', '72%'));
      }
      tl.fromTo(puffs, { x: 0, opacity: 1 }, { x: -40, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power1.out' }, at + 0.1);
      // 3. hat tip (renders after the ride-in, ends back at 0)
      tl.to(card, { keyframes: [{ rotation: -5, duration: 0.1, ease: 'power2.out' }, { rotation: 0, duration: 0.1, ease: 'power2.in' }] }, at + 0.3);
      // 4. revolver flash
      const flash = deckProp(card, 'deck-flash deck-flash--local', '70%', '20%');
      tl.fromTo(flash, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.07, ease: 'none' }, { opacity: 0, duration: 0.08, ease: 'none' }] }, at + 0.35);
      // 5. sunset gradient settles, then lifts
      //    V6.5 §1.2: the fade-out used to start at at+0.68 with duration
      //    0.15, so the LAST card (index 10, at = 0.85) finished at 1.68s
      //    and broke the 1.5s entrance budget. Now: fade-in 0.15s ends at
      //    at+0.55, fade-out 0.1s runs at+0.55 -> at+0.65, giving a hard
      //    maximum of 0.85 + 0.65 = 1.50s (index 10, worst case).
      const sunset = deckProp(card, 'deck-sunset');
      tl.fromTo(sunset, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none' }, at + 0.4);
      tl.to(sunset, { opacity: 0, duration: 0.1, ease: 'none' }, at + 0.55);
    },

    /* Ghost of Tsushima: slice reveal, white slash, maple leaves. */
    'ghost-of-tsushima': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. horizontal slice reveal
      tl.fromTo(card, { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.inOut' }, at);
      // 2. white slash line crosses, then fades
      const slash = deckProp(card, 'deck-slash deck-slash--got');
      tl.fromTo(slash, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.2, ease: 'power2.out' }, at + 0.05)
        .to(slash, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.25);
      // 3. maple leaves fall and turn
      const leaves = [];
      for (let i = 0; i < 3; i++) {
        leaves.push(deckProp(card, 'deck-leaf', (20 + i * 25) + '%', '30%'));
      }
      tl.fromTo(leaves, { y: -20, rotation: 0, opacity: 1 }, { y: 20, rotation: 180, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power1.in' }, at + 0.15);
      // 4. torii silhouette dips in, then returns to full strength
      const torii = qsa('.got-torii', card);
      if (torii.length) {
        tl.fromTo(torii, { opacity: 0 }, { opacity: 0.6, duration: 0.3, ease: 'none' }, at + 0.2)
          .to(torii, { opacity: 1, duration: 0.15, ease: 'none' }, at + 0.55);
      }
      // 5. katana gleam
      const gleam = deckProp(card, 'deck-gleam', '8%', '30%');
      tl.fromTo(gleam, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.1, ease: 'none' }, { opacity: 0, duration: 0.1, ease: 'none' }] }, at + 0.35);
    },

    /* The Last of Us Part I: flicker to life, vignette, flashlight. */
    'the-last-of-us-part-i': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. flicker sequence (steps, like a failing torch)
      tl.fromTo(card, { opacity: 0 }, {
        keyframes: [
          { opacity: 0.3, duration: 0.07 },
          { opacity: 0, duration: 0.07 },
          { opacity: 0.6, duration: 0.07 },
          { opacity: 0, duration: 0.07 },
          { opacity: 1, duration: 0.07 }
        ],
        ease: 'steps(1)'
      }, at);
      // 2. heavy vignette closes in, then lifts
      //    V6.5 §1.2: the global 1.5s entrance budget is enforced across
      //    ALL cards. TLOU sits at index 9 (at = 0.79), so the old lift
      //    (at+0.55 + 0.25) ended at 1.59s and became the real offender
      //    once the RDR2 sunset was fixed. Lift now runs at+0.50 for 0.2s
      //    -> ends at+0.70 (abs 1.49s).
      const vignette = deckProp(card, 'deck-vignette');
      tl.fromTo(vignette, { opacity: 0 }, { opacity: 0.7, duration: 0.3, ease: 'none' }, at + 0.1);
      tl.to(vignette, { opacity: 0, duration: 0.2, ease: 'none' }, at + 0.5);
      // 3. flashlight beam flickers four times (0.125s each = 0.5s total,
      //    so the whole entrance stays inside the 1.5s budget)
      const beam = qs('.tlou-flashlight', card);
      if (beam) {
        tl.fromTo(beam, { opacity: 0.3 }, { opacity: 0.7, duration: 0.125, yoyo: true, repeat: 3, ease: 'steps(2)' }, at + 0.15)
          .set(beam, { opacity: 1 }, at + 0.68);
      }
      // 4. dried blood splatter
      const splat = deckProp(card, 'deck-splatter deck-splatter--tlou', '12%', '24%');
      splat.style.background = 'rgba(87, 42, 34, 0.55)';
      tl.fromTo(splat, { scale: 0 }, { keyframes: [{ scale: 1.1, duration: 0.18, ease: 'power2.out' }, { scale: 1, duration: 0.12, ease: 'power2.in' }], transformOrigin: '50% 50%' }, at + 0.3);
      // V6.5 §1.2: splatter fade moved to at+0.55 so it also ends at
      // at+0.70 (abs 1.49s), inside the shared 1.5s budget.
      tl.to(splat, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.55);
      // 5. static horizontal sweep
      const scan = deckProp(card, 'deck-scan');
      tl.fromTo(scan, { x: '-100%' }, { x: '100%', duration: 0.35, ease: 'none' }, at + 0.35);
    },

    /* Outlast II: brightness flicker boot, night vision, scan, shake. */
    'outlast-ii': function (tl, card, index) {
      const at = 0.25 + index * 0.06;
      // 1. boot up through brightness flicker
      tl.fromTo(card, { filter: 'brightness(0)' }, {
        keyframes: [
          { filter: 'brightness(1)', duration: 0.07 },
          { filter: 'brightness(0.5)', duration: 0.07 },
          { filter: 'brightness(1)', duration: 0.07 },
          { filter: 'brightness(0.7)', duration: 0.07 },
          { filter: 'brightness(1)', duration: 0.07 }
        ],
        ease: 'steps(1)'
      }, at);
      // 2. green night-vision tint blooms, then clears
      const nv = deckProp(card, 'deck-nightvision');
      tl.fromTo(nv, { opacity: 0 }, { opacity: 0.25, duration: 0.3, ease: 'none' }, at + 0.1);
      tl.to(nv, { opacity: 0, duration: 0.15, ease: 'none' }, at + 0.45);
      // 3. static scan line
      const scan = deckProp(card, 'deck-scan deck-scan--out');
      tl.fromTo(scan, { x: '-100%' }, { x: '100%', duration: 0.4, ease: 'none' }, at + 0.15);
      // 4. camera shake
      tl.fromTo(card, { x: -1 }, { x: 1, duration: 0.04, yoyo: true, repeat: 4, ease: 'none' }, at + 0.25);
      // 5. digital artifact flicker
      const artifact = deckProp(card, 'deck-artifact', '30%', '40%');
      tl.fromTo(artifact, { opacity: 0 }, { keyframes: [{ opacity: 0.4, duration: 0.1, ease: 'none' }, { opacity: 0, duration: 0.15, ease: 'none' }] }, at + 0.35);
    }
  };

  function renderGameDeck() {
    const grid = qs('#deck-grid');
    const gd = DATA && DATA.gameDeck;
    if (!grid || !gd || !Array.isArray(gd.games)) return;
    grid.textContent = '';

    gd.games.forEach((game) => {
      const card = el('article', 'game-card');
      card.dataset.rarity = String(game.rarity || 'common');
      /* V6.3 §4.5: the genre key for the eject choreography, stamped at
         render time so ejectDeck never has to guess from text content. */
      card.dataset.pixelCharacter = String(game.pixelCharacter || 'roguelike');
      /* V6.4 §3.1.3: the game id for the per-game entrance choreography. */
      card.dataset.gameId = String(game.id || '');
      card.tabIndex = 0;
      card.style.setProperty('--game-color', String(game.themeColor || '#93C5FD'));
      card.setAttribute('aria-label', [game.name, game.rarity, game.status, game.genre]
        .filter(Boolean).join(', '));

      /* V6.4 §2.2.2: the head is a two-column flex row: the text column
         (name + status) on the left, the per-game pixel scene on the
         right, top-aligned with the first text row. Long names wrap
         inside the text column without pushing the scene around. */
      const head = el('div', 'game-card-head');
      const textCol = el('div', 'game-head-text');
      textCol.appendChild(el('h3', 'game-name', game.name));
      const isPlaying = String(game.status || '') === 'Sedang Main';
      textCol.appendChild(el('span', 'game-status' + (isPlaying ? ' game-status--playing' : ''), game.status));
      head.appendChild(textCol);
      head.appendChild(buildGamePixelScene(game));
      card.appendChild(head);

      const meta = el('div', 'game-card-meta');
      meta.appendChild(el('span', 'rarity-badge', String(game.rarity || 'common').toUpperCase()));
      meta.appendChild(el('span', null, [game.platform, game.genre].filter(Boolean).join(' · ')));
      card.appendChild(meta);

      const stats = el('div', 'game-stats');
      (Array.isArray(game.stats) ? game.stats : []).forEach((stat) => {
        const numeric = typeof stat.value === 'number';
        const row = el('div', 'stat-row' + (numeric ? '' : ' stat-row--text'));
        row.appendChild(el('span', 'stat-label', stat.label));
        if (numeric) {
          /* V6.3 §1.1.1: the bar span is a full-width track fill driven by
             scaleX only. data-target carries the 0-100 number; the inline
             transform is the no-JS/no-GSAP default state so a value of 80
             reads as 80% with or without motion. */
          const bar = el('div', 'stat-bar');
          const fill = el('span');
          const target = Math.max(0, Math.min(100, stat.value));
          fill.dataset.target = String(target);
          fill.style.transform = 'scaleX(' + target / 100 + ')';
          bar.appendChild(fill);
          row.appendChild(bar);
          row.appendChild(el('span', 'stat-value', stat.value + '%'));
        } else {
          row.appendChild(el('span', 'stat-spacer'));
          row.appendChild(el('span', 'stat-value stat-value--text', String(stat.value)));
        }
        stats.appendChild(row);
        if (stat.note) stats.appendChild(el('p', 'stat-note', stat.note));
      });
      card.appendChild(stats);
      grid.appendChild(card);
    });
  }

  /* State machine: idle (INSERT COIN) -> loading (LOADING...) ->
     open (EJECT COIN) -> ejecting (EJECTING...).
     V6.3 Fase 4: the eject path is now a four-phase timeline with a
     per-genre exit for every card, a scrambling button label, and a
     strict aria-busy / aria-expanded sequence. The single scramble
     interval is owned by stopScramble(); no interval can leak. */
  function initGameDeck() {
    const button = qs('#deck-button');
    const label = qs('#deck-button-label');
    const screen = qs('#deck-region');
    const grid = qs('#deck-grid');
    const offLabel = qs('.deck-off-label');
    const gd = DATA && DATA.gameDeck;
    if (!button || !label || !screen || !grid) return;

    const labels = gd || {};
    let state = 'idle';
    let busy = false;
    let ejectTimeline = null;
    /* V6.4 §3.1.1: the single entrance timeline. One openDeck run owns
       exactly one kill()-able timeline (Batasan 11); eject, re-open and
       the reduce cleanup all kill it before doing anything else. */
    let openTimeline = null;

    /* V6.4 §3.3.3: sweep every temporary entrance prop. Called at every
       state boundary, so no prop can outlive its animation. */
    function clearTempDeckNodes() {
      qsa('.deck-temp', screen).forEach((node) => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }

    /* V6.3 §4.3: ASCII-only scramble vocabulary. Verified free of the
       em dash (U+2014) and every other non-ASCII character. */
    const SCRAMBLE_CHARS = '!<>-_\\/[]{}#@$%^&*=+';
    let scrambleIntervalId = null;

    function stopScramble() {
      if (scrambleIntervalId !== null) {
        window.clearInterval(scrambleIntervalId);
        motionRegistry.intervals.delete(scrambleIntervalId);
        scrambleIntervalId = null;
      }
    }

    function scrambleText(element, finalText, duration) {
      stopScramble();
      const startTime = Date.now();
      scrambleIntervalId = window.setInterval(() => {
        if (Date.now() - startTime >= duration) {
          stopScramble();
          element.textContent = finalText;
          return;
        }
        let scrambled = '';
        for (let i = 0; i < finalText.length; i++) {
          scrambled += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        element.textContent = scrambled;
      }, 50);
      motionRegistry.intervals.add(scrambleIntervalId);
    }

    function setBusy(value) {
      button.setAttribute('aria-busy', String(value));
    }

    function openDeckInstant() {
      stopScramble();
      clearTempDeckNodes();
      if (offLabel) offLabel.hidden = true;
      grid.hidden = false;
      screen.classList.remove('deck-screen--off', 'deck-screen--glitch');
      screen.classList.add('deck-screen--active');
      label.textContent = labels.ejectLabel || 'EJECT COIN';
      button.setAttribute('aria-expanded', 'true');
      state = 'open';
      busy = false;
      setBusy(false);
    }

    function closeDeckInstant() {
      stopScramble();
      clearTempDeckNodes();
      grid.hidden = true;
      screen.classList.remove('deck-screen--active', 'deck-screen--glitch');
      screen.classList.add('deck-screen--off');
      if (offLabel) offLabel.hidden = false;
      label.textContent = labels.insertLabel || 'INSERT COIN';
      button.setAttribute('aria-expanded', 'false');
      state = 'idle';
      busy = false;
      setBusy(false);
    }

    /* V6.4 §3.1 (Settle): shared finish step. Guarded by state so the
       timeline's onComplete (which fires right after the final .add)
       cannot run the settle twice. */
    function finishOpen() {
      if (state !== 'loading') return;
      const cards = qsa('.game-card', grid);
      const bars = qsa('.stat-bar span', grid);
      /* V6.3 §1.1.4: never clearProps 'transform' on the bars (that
         would drop scaleX back to 1 = a full bar). Only the origin is
         released and the honest target value is re-applied. V6.4: the
         card clearProps list also releases filter, clipPath and the
         entrance box-shadows so no choreography state can persist. */
      gsap.set(cards, { clearProps: 'transform,opacity,filter,clipPath,boxShadow' });
      gsap.set(qsa('.game-pixel-scene', grid), { clearProps: 'transform,opacity' });
      gsap.set(bars, { clearProps: 'transformOrigin' });
      gsap.set(bars, { scaleX: (index, target) => Number(target.dataset.target) / 100 });
      clearTempDeckNodes();
      screen.classList.remove('deck-screen--glitch');
      screen.classList.add('deck-screen--active');
      label.textContent = labels.ejectLabel || 'EJECT COIN';
      button.setAttribute('aria-expanded', 'true');
      state = 'open';
      busy = false;
      setBusy(false);
      openTimeline = null;
    }

    function openDeck() {
      busy = true;
      state = 'loading';
      setBusy(true);
      stopScramble();
      label.textContent = labels.loadingLabel || 'LOADING...';

      const cards = qsa('.game-card', grid);
      if (!cards.length) { openDeckInstant(); return; }

      /* V6.4 §3.3.2: a re-open kills any in-flight entrance first. */
      if (openTimeline && typeof openTimeline.kill === 'function') openTimeline.kill();
      openTimeline = null;
      clearTempDeckNodes();

      /* V6.3 §2.3: created from a click handler - tracked so the reduce
         cleanup kills it (the deck timeline is event-driven, not owned
         by the matchMedia context). */
      const tl = trackEventTween(gsap.timeline({ onComplete: finishOpen }));
      openTimeline = tl;

      /* Phase Wake (0.25s, shared): the CRT blinks on. */
      tl.to(screen, { opacity: 0, duration: 0.12, ease: 'none' })
        .add(() => {
          screen.classList.remove('deck-screen--off');
          screen.classList.add('deck-screen--glitch');
          if (offLabel) offLabel.hidden = true;
          grid.hidden = false;
        })
        .set(screen, { opacity: 1 })
        // Glitch shake (steps easing, V4 §5.4)
        .to(screen, {
          keyframes: [
            { x: -3, skewX: 3, duration: 0.04 },
            { x: 3, skewX: -3, duration: 0.04 },
            { x: 0, skewX: 0, duration: 0.04 }
          ],
          ease: 'steps(2)'
        })
        .add(() => screen.classList.remove('deck-screen--glitch'));

      /* Phase Scene Entrance (per-game, from the spec table): every
         fromTo renders its start state at build time, so cards are
         already hidden/offset the moment the grid un-hides. */
      cards.forEach((card, index) => {
        const spec = GAME_ENTRANCE_SPECS[card.dataset.gameId];
        if (spec) spec(tl, card, index);
      });

      /* Phase Settle (shared): clear every prop, re-assert honest bar
         values, flip the aria sequence and release the machine. */
      tl.add(finishOpen);
    }

    /* V6.4 §2.2.4: the genre each card exits with. The key is stamped on
       the card at render time (data-pixel-character); unknown or missing
       values fall back to roguelike, exactly as the spec requires. */
    function genreOf(card) {
      const requested = String(card.dataset.pixelCharacter || 'roguelike').toLowerCase();
      return DECK_GENRES.indexOf(requested) !== -1 ? requested : 'roguelike';
    }

    /* V6.3 §4.5: four phases.
       1 (0.15s): the label scrambles to EJECTING..., the screen glitches
                  (x -3 / skewX 2 / hue-rotate(20deg), steps(2), 2 rounds)
                  while a scanline sweeps top -> bottom.
       2 (0.5s):  every card exits with its genre's move, staggered
                  randomly (each 0.035s).
       3 (0.3s):  the active CRT collapses (scaleY 0.6, scaleX 0.96,
                  brightness 0.4, opacity 0) around a thin centre line,
                  then the dead screen fades back in.
       4 (0.2s):  NO SIGNAL + INSERT COIN TO CONTINUE fade in, the label
                  settles on INSERT COIN, aria states reset, transforms
                  clear, and the state machine returns to idle. */
    function ejectDeck() {
      /* V6.4 §3.3.2: EJECT during the entrance is allowed - the entrance
         timeline is killed first so animations can never stack. */
      if (busy && state !== 'loading') return;
      if (openTimeline && typeof openTimeline.kill === 'function') openTimeline.kill();
      openTimeline = null;
      clearTempDeckNodes();
      if (!hasGSAP || isReducedMotion()) return closeDeckInstant();

      busy = true;
      setBusy(true); // aria-busy: fase 1 starts
      stopScramble();
      if (ejectTimeline && typeof ejectTimeline.kill === 'function') ejectTimeline.kill();

      const cards = qsa('.game-card', grid);
      if (!cards.length) return closeDeckInstant();

      /* Fase 1 prop: a sweeping scanline (created and removed here, so
         no markup is left behind) - one thin bar crossing the screen. */
      const sweep = el('span', 'deck-eject-sweep');
      sweep.setAttribute('aria-hidden', 'true');
      screen.appendChild(sweep);

      /* Fase 3 prop: the CRT-off line, a thin horizontal bar that flashes
         at the centre while the screen dies. */
      const crtLine = el('span', 'deck-crt-line');
      crtLine.setAttribute('aria-hidden', 'true');
      screen.appendChild(crtLine);

      const finishEject = () => {
        gsap.set(cards, { clearProps: 'transform,opacity,filter,clipPath' });
        gsap.set(screen, { clearProps: 'transform,opacity,filter' });
        sweep.remove();
        crtLine.remove();
        closeDeckInstant(); // stops any scramble, resets labels and aria
      };

      const tl = gsap.timeline({ onComplete: finishEject });
      ejectTimeline = tl;
      trackEventTween(tl);

      /* Fase 1 (0 -> 0.15s) ------------------------------------------------ */
      tl.add(() => scrambleText(label, 'EJECTING...', 150), 0)
        .to(screen, {
          keyframes: [
            { x: -3, skewX: 2, filter: 'hue-rotate(20deg)', duration: 0.0375 },
            { x: 3, skewX: -2, duration: 0.0375 },
            { x: -3, skewX: 2, duration: 0.0375 },
            { x: 0, skewX: 0, filter: 'hue-rotate(0deg)', duration: 0.0375 }
          ],
          ease: 'steps(2)'
        }, 0)
        .fromTo(sweep,
          { top: '0%', opacity: 0.9 },
          { top: '100%', opacity: 0, duration: 0.15, ease: 'power1.in' }, 0);

      /* Fase 2 (0.15s -> ~0.65s): one exit move per genre, staggered
         randomly (each 0.035s). Every tween lives on the eject timeline,
         so a rapid second EJECT can never stack animations. */
      const order = cards.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      order.forEach((card, position) => {
        const at = 0.15 + position * 0.035;
        const genre = genreOf(card);
        if (genre === 'shooter') {
          // Shot off-screen: flies left while clipping to the centre.
          tl.to(card, {
            x: -160, clipPath: 'inset(0 50% 0 50%)', opacity: 0,
            duration: 0.5, ease: 'power2.in'
          }, at);
        } else if (genre === 'soulslike') {
          // Slashed away: knocked up-right, spinning and shrinking.
          tl.to(card, {
            rotation: 15, x: 80, y: -40, scale: 0.7, opacity: 0,
            duration: 0.5, ease: 'power2.in'
          }, at);
        } else if (genre === 'strategy') {
          // Recalled to the map: lifted first, then carried off sideways.
          tl.to(card, { y: -60, duration: 0.2, ease: 'power2.out' }, at)
            .to(card, {
              x: position % 2 === 0 ? 100 : -100, opacity: 0,
              duration: 0.3, ease: 'power2.in'
            }, at + 0.2);
        } else if (genre === 'sandbox') {
          // Dug down: drops below the deck and shrinks.
          tl.to(card, {
            y: 120, scale: 0.6, opacity: 0,
            duration: 0.5, ease: 'power2.in'
          }, at);
        } else if (genre === 'horror') {
          // Flickering light: strobes, then dies to black.
          tl.to(card, {
            keyframes: [
              { opacity: 1, duration: 0.08 },
              { opacity: 0.4, duration: 0.08 },
              { opacity: 1, duration: 0.08 },
              { opacity: 0, duration: 0.08 },
              { opacity: 1, duration: 0.08 },
              { opacity: 0, filter: 'brightness(0)', duration: 0.1 }
            ],
            ease: 'none'
          }, at);
        } else {
          // roguelike (and the default): flips out of existence.
          tl.to(card, {
            rotationY: 180, scale: 0.5, opacity: 0,
            duration: 0.5, ease: 'power2.in'
          }, at);
        }
      });

      /* Fase 3 (0.65 -> 0.95s): the CRT dies -------------------------------- */
      tl.to(screen, {
        scaleY: 0.6, scaleX: 0.96, filter: 'brightness(0.4)', opacity: 0,
        duration: 0.3, ease: 'power2.in', transformOrigin: '50% 50%'
      }, 0.65)
        .fromTo(crtLine,
          { opacity: 0 },
          { opacity: 1, duration: 0.05, ease: 'none' }, 0.68)
        .to(crtLine, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0.78)
        .add(() => {
          /* Fase 3 complete: swap to the dead screen. aria-expanded
             flips to false here, per the §4.4 sequence. */
          screen.classList.remove('deck-screen--active', 'deck-screen--glitch');
          screen.classList.add('deck-screen--off');
          grid.hidden = true;
          if (offLabel) offLabel.hidden = false;
          button.setAttribute('aria-expanded', 'false');
          gsap.set(screen, { scaleY: 1, scaleX: 1, filter: 'brightness(1)' });
          const noSignal = offLabel ? qsa('.deck-no-signal, .deck-no-signal-sub', offLabel) : [];
          if (noSignal.length) gsap.set(noSignal, { opacity: 0 });
        }, 0.95);

      /* Fase 4 (0.95 -> 1.15s): honest reset -------------------------------- */
      tl.to(screen, { opacity: 1, duration: 0.2, ease: 'none' }, 0.95);
      const offSpans = offLabel ? qsa('.deck-no-signal, .deck-no-signal-sub', offLabel) : [];
      if (offSpans.length) {
        tl.to(offSpans, { opacity: 1, duration: 0.2, ease: 'none', stagger: 0.05 }, 0.95);
      }
      tl.to({}, { duration: 0.2 }, 0.95); // beat while the dead screen settles
    }

    /* V6.4 §3.3.2: two-way reduced-motion safety net, registered by the
       matchMedia cleanup. Kills both timelines, sweeps props and lands
       the machine on an instant, honest state. */
    deckReduceCleanup = function () {
      if (openTimeline && typeof openTimeline.kill === 'function') openTimeline.kill();
      openTimeline = null;
      if (ejectTimeline && typeof ejectTimeline.kill === 'function') ejectTimeline.kill();
      ejectTimeline = null;
      stopScramble();
      clearTempDeckNodes();
      if (hasGSAP) {
        gsap.set(qsa('.game-card', grid), { clearProps: 'transform,opacity,filter,clipPath,boxShadow' });
        gsap.set(qsa('.game-pixel-scene', grid), { clearProps: 'transform,opacity' });
        gsap.set(screen, { clearProps: 'transform,opacity,filter' });
      }
      if (state === 'loading') openDeckInstant();
      else if (state === 'open') closeDeckInstant();
    };

    button.addEventListener('click', () => {
      if (state === 'idle') {
        if (!hasGSAP || isReducedMotion()) openDeckInstant();
        else openDeck();
        return;
      }
      if (state === 'open') {
        ejectDeck();
        return;
      }
      /* V6.4 §3.4: EJECT clicked while the entrance is still running:
         the entrance is killed and the eject takes over immediately. */
      if (state === 'loading' && openTimeline) ejectDeck();
    });
  }

  /* --- Section 05: Off-screen pixel pet -------------------------------- */
  /* V6.4 Fase 4: DESKTOP DECORATION LAYERS (Q4=A active, Q9=B medium).
     Layer 1: ambient pixel debris in the section margins. One field per
     section, aria-hidden, pointer-events none, opacity 0.2, hidden
     below 900px (spec 4.4 master guard). Deterministic spread: the
     first two items always sit above top:30%, never more than three
     items below top:70%, 60/40 left/right split. */
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

  /* V6.5 §4.6 motion half: the crosshair scales 1.2 -> 1.0 and fades
     0 -> 0.15 the first time #closing enters the viewport. Created ONLY
     inside the matchMedia no-preference context, so a mid-session flip
     to reduced motion reverts it to the CSS final state (opacity 0.15,
     scale 1) immediately. Without GSAP the CSS default already shows the
     final state, honestly static. */
  function initClosingCrosshair() {
    const section = qs('#closing');
    const crosshair = qs('.ornament-closing-crosshair');
    if (!section || !crosshair || !hasScrollTrigger) return;
    gsap.fromTo(
      crosshair,
      { opacity: 0, scale: 1.2, transformOrigin: '50% 50%' },
      {
        opacity: 0.15,
        scale: 1,
        duration: 0.9,
        ease: MOTION.easeSoft,
        scrollTrigger: { trigger: section, start: 'top 80%', once: true }
      }
    );
  }


  /* --- Section 05: Off-screen pixel pet -------------------------------- */
  /* 12 frames across 3 states (coding / music / badminton) on one paused
     timeline; played only while the section is on screen. */
  /* V6.4 Fase 3: module-level hand-back so the matchMedia cleanup can
     reset the deck when the motion preference flips mid-animation. */
  let deckReduceCleanup = null;
  function scheduleBlink(eyes) {
    if (!eyes || !hasGSAP || isReducedMotion()) return;
    /* V6.3 §2.3: the blink chain is asynchronous (delayedCall then a
       self-rescheduling tween), so both hops are registered in
       ambientTweens for the reduce cleanup. */
    trackAmbientTween(gsap.delayedCall(gsap.utils.random(3, 5), () => {
      trackAmbientTween(gsap.to(eyes, {
        scaleY: 0.12, duration: 0.07, yoyo: true, repeat: 1,
        transformOrigin: '50% 50%',
        onComplete: () => scheduleBlink(eyes)
      }));
    }));
  }

  /* V6.3 §2.5.4: fully motion - runs inside the matchMedia no-preference
     handler. The loop is held in a module-level variable so the cleanup
     helper can kill it, and the IntersectionObserver is registered in
     motionRegistry.observers so it disconnects on teardown. */
  let offscreenPetLoop = null;
  function initOffscreenPet() {
    const svg = qs('#pixel-pet-art');
    const section = qs('#offscreen');
    if (!svg || !section) return;

    const head = qs('.pet-head', svg);
    const handR = qs('.pet-hand-r', svg);
    const handL = qs('.pet-hand-l', svg);
    const hud = qs('.pet-hud', svg);
    const glow = qs('.pet-screen-glow', svg);
    const codeLines = qsa('.pet-code-line', svg);
    const notes = qsa('.pet-note', svg);
    const racket = qs('.pet-racket', svg);
    const shuttle = qs('.pet-shuttle', svg);
    const eyes = qs('.pet-eyes', svg);

    if (!hasGSAP || isReducedMotion()) return; // static coding frame stays

    gsap.set(notes.concat([racket, shuttle]).filter(Boolean), { opacity: 0 });

    if (offscreenPetLoop && typeof offscreenPetLoop.kill === 'function') offscreenPetLoop.kill();
    const loop = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'sine.inOut' } });
    offscreenPetLoop = loop;

    // CODING (frames 1-4): typing hand, screen glow blink, HUD + code toggles
    loop.to([handR, handL].filter(Boolean), { y: -2, duration: 0.14, yoyo: true, repeat: 5, ease: 'steps(2)' }, 0)
      .to(glow, { opacity: 0.05, duration: 0.1, yoyo: true, repeat: 1 }, 0.4)
      .to(hud, { opacity: 0, duration: 0.01 }, 0.7)
      .to(hud, { opacity: 1, duration: 0.01 }, 1.0)
      .to(codeLines, { opacity: 0.25, duration: 0.01, stagger: 0.06 }, 1.1)
      .to(codeLines, { opacity: 1, duration: 0.01, stagger: 0.06 }, 1.4);

    // MUSIC (frames 5-8): head bobs, notes drift up from the headphones
    loop.to(head, { rotation: 3, svgOrigin: '29 24', duration: 0.32, yoyo: true, repeat: 3 }, 1.8)
      .set(notes, { opacity: 1 }, 1.9)
      .fromTo(notes, { y: 0 }, { y: -10, duration: 1.1, ease: 'sine.out', stagger: 0.3 }, 1.9)
      .to(notes, { opacity: 0, duration: 0.3, stagger: 0.3 }, 2.5)
      .set(notes, { y: 0 }, 3.5);

    // BADMINTON (frames 9-12): racket leans in, shuttle falls and bounces
    loop.to(head, { rotation: -2, svgOrigin: '29 24', duration: 0.2 }, 3.8)
      .to(racket, { opacity: 1, duration: 0.2 }, 3.8)
      .fromTo(shuttle, { y: -8, opacity: 0 }, { opacity: 1, duration: 0.1 }, 3.9)
      .to(shuttle, { y: 36, duration: 0.45, ease: 'power1.in' }, 4.0)
      .to(shuttle, { y: 31, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.out' }, 4.45)
      .to(shuttle, { opacity: 0, duration: 0.2 }, 4.85)
      .to(racket, { opacity: 0, duration: 0.2 }, 4.9)
      .to(head, { rotation: 0, svgOrigin: '29 24', duration: 0.2 }, 4.95)
      .set(shuttle, { y: 0 }, 5.2);

    // Off-screen pause (V4 §3.4 / §12.2): no loop while not visible.
    if ('IntersectionObserver' in window) {
      const io = trackObserver(new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loop.play();
          else loop.pause();
        });
      }, { threshold: 0.15 }));
      io.observe(section);
    } else {
      loop.play();
    }

    scheduleBlink(eyes);
  }

  /* --- Now Playing header indicator (V4 §6.5) --------------------------- */
  /* Polls the Spotify endpoint every 30s. Honest states only:
     playing (pulsing dot), recent (dimmed), hidden on error. */
  function initNowPlaying() {
    const link = qs('#now-playing');
    const cfg = DATA && DATA.offscreen && DATA.offscreen.spotify;
    if (!link || !cfg || !cfg.nowPlayingEndpoint) return;

    const img = qs('#now-playing-img', link);
    const text = qs('#now-playing-text', link);
    const quickRow = qs('#quick-now-playing');
    const pollMs = cfg.nowPlayingPollMs || 30000;

    if (img) img.addEventListener('error', function () { this.hidden = true; }, { once: true });

    function hide() {
      link.hidden = true;
      link.classList.remove('is-playing', 'is-recent');
      if (quickRow) quickRow.hidden = true;
    }

    function render(data) {
      if (!data || typeof data !== 'object') return hide();
      const title = String(data.title || '').trim();
      const artist = String(data.artist || '').trim();
      if (!title && !artist) return hide();

      const playing = data.isPlaying === true;
      const url = String(data.songUrl || '').trim();
      if (img) {
        const art = String(data.albumImageUrl || '').trim();
        if (art) {
          img.src = art;
          img.hidden = false;
        } else {
          img.hidden = true;
        }
      }
      if (text) text.textContent = (playing ? '' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
      link.classList.toggle('is-playing', playing);
      link.classList.toggle('is-recent', !playing);
      link.hidden = false;
      link.setAttribute('aria-label', (playing ? 'Now playing: ' : 'Recently played: ') + title + (artist ? ' by ' + artist : ''));
      if (/^https?:\/\//i.test(url)) {
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      if (quickRow) {
        quickRow.textContent = (playing ? 'NOW PLAYING · ' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
        quickRow.hidden = false;
      }
    }

    async function poll() {
      if (doc.hidden) return;
      try {
        // V5 §3.6: timeout + abort handled inside fetchWithTimeout; an
        // endpoint that never answers now resolves to the honest hidden
        // state instead of hanging forever.
        render(await fetchWithTimeout(cfg.nowPlayingEndpoint));
      } catch (error) {
        hide();
      }
    }

    /* V6.3 §1.4: one interval id, started only while visible and stopped
       the moment the tab hides. The guard inside poll() stays as a safety
       net for a page that boots while already hidden. */
    let pollIntervalId = null;

    function startPolling() {
      if (pollIntervalId !== null) return;
      if (doc.hidden) return;
      pollIntervalId = window.setInterval(poll, pollMs);
    }

    function stopPolling() {
      if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    }

    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        stopPolling();
      } else {
        poll(); // one honest refresh on return, then resume the cadence
        startPolling();
      }
    });
    poll();
    startPolling();
  }

  /* --- Section 06: GitHub Activity (V4 §7) ------------------------------- */
  /* Live REST data with a one hour localStorage cache. No streaks, no
     commit totals: only metrics the REST API can honestly provide. */
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

    const base = 'https://api.github.com/users/' + encodeURIComponent(cfg.username || 'Fryel32');
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
        if (message) message.textContent = cfg.fallbackMessage || 'GITHUB STATS ARE UNAVAILABLE RIGHT NOW.';
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

  /* --- Section 08: Companion page pet (V4 §8 + V5.2 §4.8 / §5.5) --------- */
  /* ONE companion implementation: the habitat scene is where the pet
     lives before summon; summon moves the single fixed pet from the
     habitat rect to the page corner via a FLIP-like transition, dismiss
     walks it back. One boolean state drives button text, aria-pressed,
     habitat label, and pet visibility. */

  /* Shared habitat state, filled by initCompanionHabitat() (which runs
     before initCompanion() in boot()). */
  const companionState = {
    built: false,
    sceneEl: null,
    previewPet: null,   // static pet inside the habitat (clone, no ids)
    labelEl: null,
    statusEl: null,     // V5.3 §4.9: WAITING / SUMMONED status chip
    boardValue: null    // V6.6 Fase 5.3: NAP / AWAY wall board text
  };

  /* V5.2 §4.8 + V5.3 §4.9 Pixel Habitat: wall, window, poster, floor, and
     a pet preview waiting inside, plus a small status chip so the scene
     reads as a balanced habitat instead of an empty stage. Pure scene
     building: decoration only, the preview pet is aria-hidden and never
     interactive. */
  function initCompanionHabitat() {
    if (companionState.built) return;
    const habitat = qs('#pet-habitat');
    const scene = qs('#pet-habitat-scene');
    const deco = DATA && DATA.decorations && DATA.decorations.companion;
    if (!habitat || !scene || (deco && deco.habitat === false)) return;
    companionState.built = true;
    companionState.sceneEl = scene;
    companionState.labelEl = qs('.pet-habitat-label', habitat);

    if (deco && deco.habitatLabel && companionState.labelEl) {
      companionState.labelEl.textContent = deco.habitatLabel;
    }

    const wall = el('div', 'habitat-wall');
    const window_ = el('div', 'habitat-window');
    const poster = el('div', 'habitat-poster');

    /* V6.3 §5.8: pixel shelf with two books (rects INSIDE an <svg>, per
       the spec's hard rule) plus the geometric rug on the floor. Both
       are aria-hidden scenery built with createElementNS. */
    const shelf = el('div', 'habitat-shelf');
    const shelfSvg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    shelfSvg.setAttribute('viewBox', '0 0 40 20');
    shelfSvg.setAttribute('aria-hidden', 'true');
    shelfSvg.setAttribute('focusable', 'false');
    [['2', '12', '4', '8', 'var(--px-pink)'],
     ['8', '10', '3', '10', 'var(--px-neon)']].forEach((r) => {
      const book = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      book.setAttribute('x', r[0]);
      book.setAttribute('y', r[1]);
      book.setAttribute('width', r[2]);
      book.setAttribute('height', r[3]);
      book.setAttribute('fill', r[4]);
      shelfSvg.appendChild(book);
    });
    shelf.appendChild(shelfSvg);

    const rug = el('div', 'ornament ornament-habitat-rug');
    rug.setAttribute('aria-hidden', 'true');

    const floor = el('div', 'habitat-floor');
    scene.appendChild(wall);
    scene.appendChild(window_);
    scene.appendChild(poster);
    scene.appendChild(shelf);
    scene.appendChild(rug);
    scene.appendChild(floor);

    // V5.3 §4.9: status chip in the habitat corner. Mirrors the summon
    // state honestly; it carries no behaviour of its own.
    const status = el('span', 'pet-habitat-status', (deco && deco.habitatStatusIdle) || 'WAITING IN HABITAT');
    status.setAttribute('aria-hidden', 'true');
    habitat.appendChild(status);
    companionState.statusEl = status;

    // Pet preview: clone of the Off-screen pixel art without ids.
    const sourceSvg = qs('#pixel-pet-art');
    if (sourceSvg) {
      const preview = sourceSvg.cloneNode(true);
      preview.removeAttribute('id');
      preview.removeAttribute('aria-hidden');
      preview.setAttribute('aria-hidden', 'true');
      preview.setAttribute('focusable', 'false');
      preview.classList.add('habitat-preview-pet');
      scene.appendChild(preview);
      companionState.previewPet = preview;
    }

    /* V6.6 Fase 5.1: rect-only pixel furniture via createElementNS in the
       --px-* palette; margins only, never over the centred pet preview. */
    const PX = 'http://www.w3.org/2000/svg';
    function habitatFurnitureSvg(name, rects, posStyle) {
      const svg = doc.createElementNS(PX, 'svg');
      const width = Math.max.apply(null, rects.map((r) => r[1] + r[3]));
      const height = Math.max.apply(null, rects.map((r) => r[2] + r[4]));
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('shape-rendering', 'crispEdges');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      // Positioning classes live on the <svg> host (CSS position does not
      // apply to inner SVG children); the <g> keeps the semantic label.
      svg.setAttribute('class', 'habitat-furniture habitat-furniture--' + name);
      const group = doc.createElementNS(PX, 'g');
      group.setAttribute('class', 'habitat-furniture-group habitat-furniture-group--' + name);
      rects.forEach((r) => {
        const rect = doc.createElementNS(PX, 'rect');
        rect.setAttribute('x', String(r[1]));
        rect.setAttribute('y', String(r[2]));
        rect.setAttribute('width', String(r[3]));
        rect.setAttribute('height', String(r[4]));
        rect.setAttribute('fill', 'var(--px-' + r[0] + ')');
        group.appendChild(rect);
      });
      svg.appendChild(group);
      Object.keys(posStyle).forEach((key) => { svg.style[key] = posStyle[key]; });
      scene.appendChild(svg);
    }

    habitatFurnitureSvg('table', [ // folding table under the window
      ['wood-dark', 0, 8, 20, 2], ['wood', 0, 10, 20, 1],
      ['wood-dark', 2, 11, 2, 8], ['wood-dark', 16, 11, 2, 8]
    ], { left: '7%', bottom: '10%', width: '40px' });
    habitatFurnitureSvg('chair', [ // small chair beside the table
      ['slate', 0, 6, 8, 8], ['slate', 1, 14, 2, 4], ['slate', 5, 14, 2, 4]
    ], { left: 'calc(7% + 46px)', bottom: '10%', width: '22px' });
    habitatFurnitureSvg('plant', [ // potted plant, bottom right corner
      ['wood-dark', 4, 12, 6, 4], ['lime', 5, 6, 2, 6],
      ['lime', 3, 4, 3, 3], ['lime', 7, 3, 2, 3]
    ], { right: '4%', bottom: '4%', width: '26px' });
    habitatFurnitureSvg('clock', [ // wall clock without hands
      ['ivory', 0, 0, 10, 10], ['black', 4, 4, 2, 2]
    ], { left: '50%', top: '7%', width: '22px', transform: 'translateX(-50%)' });

    /* V6.6 Fase 5.2: wall activity board, NAP default (5.3 flips it). */
    const board = el('div', 'habitat-board');
    board.setAttribute('aria-hidden', 'true');
    board.appendChild(el('span', 'habitat-board-label', 'STATUS'));
    const boardValue = el('span', 'habitat-board-value', 'NAP');
    board.appendChild(boardValue);
    scene.appendChild(board);
    companionState.boardValue = boardValue;
  }

  function initCompanion() {
    const comp = DATA && DATA.companion;
    const petWrap = qs('#companion-pet');
    const petButton = qs('#companion-pet-button');
    const tooltip = qs('#companion-tooltip');
    const toggle = qs('#companion-toggle');
    const sourceSvg = qs('#pixel-pet-art');
    if (!comp || !petWrap || !petButton || !tooltip || !toggle) return;

    const STORE_KEY = 'fryel32-companion-v1'; // UI preference, not content
    const lines = Array.isArray(comp.tooltipLines) && comp.tooltipLines.length
      ? comp.tooltipLines : ['Hi, Farrel is probably coding.'];
    let summoned = false;
    let petSvg = null;
    let floatTween = null;
    let tooltipTimer = null;
    let lineIndex = 0;
    let moving = false;

    function startFloat() {
      // V5.2 §5.5: float only while summoned, tab visible, motion allowed.
      if (!hasGSAP || isReducedMotion() || doc.hidden) return;
      if (floatTween) floatTween.kill();
      floatTween = gsap.to(petWrap, { y: 4, duration: 2, yoyo: true, repeat: -1, ease: MOTION.easeFloat });
    }

    function stopFloat() {
      if (floatTween) { floatTween.kill(); floatTween = null; }
    }

    function buildPetSvg() {
      if (petSvg || !sourceSvg) return;
      const clone = sourceSvg.cloneNode(true);
      clone.removeAttribute('id');
      petButton.textContent = '';
      petButton.appendChild(clone);
      petSvg = clone;
    }

    function showTooltip() {
      tooltip.textContent = lines[lineIndex % lines.length];
      lineIndex += 1;
      tooltip.hidden = false;
      if (tooltipTimer) window.clearTimeout(tooltipTimer);
      tooltipTimer = window.setTimeout(() => { tooltip.hidden = true; }, 2600);
    }

    function setHabitatLabel(text) {
      if (companionState.labelEl && text) companionState.labelEl.textContent = text;
    }

    function setHabitatStatus(text) {
      if (companionState.statusEl && text) companionState.statusEl.textContent = text;
    }

    function statusIdleText() {
      const deco = DATA && DATA.decorations && DATA.decorations.companion;
      return (deco && deco.habitatStatusIdle) || 'WAITING IN HABITAT';
    }

    function statusSummonedText() {
      const deco = DATA && DATA.decorations && DATA.decorations.companion;
      return (deco && deco.habitatStatusSummoned) || 'SUMMONED';
    }

    function setPreviewVisible(visible) {
      if (companionState.previewPet) companionState.previewPet.style.opacity = visible ? '' : '0';
    }

    function summon(withMotion) {
      if (summoned || moving) return;
      summoned = true;
      buildPetSvg();
      petWrap.hidden = false;
      toggle.textContent = comp.dismissLabel || 'Dismiss companion';
      toggle.setAttribute('aria-pressed', 'true');
      setPreviewVisible(false);
      setHabitatLabel('PET SUMMONED');
      setHabitatStatus(statusSummonedText());
      /* V6.6 Fase 5.3: the wall board follows the pet honestly. */
      if (companionState.boardValue) companionState.boardValue.textContent = 'AWAY';
      try { window.localStorage.setItem(STORE_KEY, 'summoned'); } catch (error) { /* pref only */ }

      const habitatOrigin = companionState.previewPet || companionState.sceneEl;
      if (hasGSAP && !isReducedMotion() && withMotion && habitatOrigin) {
        // FLIP-like move: measure the habitat preview and the final corner
        // position, then fly the fixed pet from one to the other.
        moving = true;
        gsap.set(petWrap, { opacity: 1, x: 0, y: 0, scale: 1 });
        const from = habitatOrigin.getBoundingClientRect();
        const to = petWrap.getBoundingClientRect();
        const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        const scale = Math.min(1.4, Math.max(0.4, from.width / Math.max(1, to.width)));
        gsap.fromTo(petWrap,
          { x: dx, y: dy, scale: scale, opacity: 0.9 },
          {
            x: 0, y: 0, scale: 1, opacity: 1,
            duration: 0.7, ease: 'power3.inOut',
            onComplete: () => {
              gsap.set(petWrap, { clearProps: 'x,y,scale' });
              moving = false;
              startFloat();
            }
          });
        scheduleBlink(qs('.pet-eyes', petSvg));
      } else {
        startFloat();
        scheduleBlink(qs('.pet-eyes', petSvg));
      }
    }

    function dismiss(withMotion) {
      if (!summoned || moving) return;
      const finish = () => {
        petWrap.hidden = true;
        stopFloat();
        if (tooltipTimer) { window.clearTimeout(tooltipTimer); tooltipTimer = null; tooltip.hidden = true; }
        gsap.set(petWrap, { clearProps: 'opacity,transform' });
        toggle.textContent = comp.summonLabel || 'Summon companion';
        toggle.setAttribute('aria-pressed', 'false');
        setPreviewVisible(true);
        setHabitatLabel((DATA.decorations && DATA.decorations.companion && DATA.decorations.companion.habitatLabel) || 'PET HABITAT / 08');
        setHabitatStatus(statusIdleText());
        /* V6.6 Fase 5.3: back to NAP once the pet is home. */
        if (companionState.boardValue) companionState.boardValue.textContent = 'NAP';
        try { window.localStorage.setItem(STORE_KEY, 'dismissed'); } catch (error) { /* pref only */ }
        summoned = false;
        moving = false;
      };
      const habitatOrigin = companionState.previewPet || companionState.sceneEl;
      if (hasGSAP && !isReducedMotion() && withMotion && habitatOrigin) {
        moving = true;
        stopFloat();
        const from = petWrap.getBoundingClientRect();
        const to = habitatOrigin.getBoundingClientRect();
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        gsap.to(petWrap, {
          x: dx, y: dy, scale: 0.55, opacity: 0,
          duration: 0.55, ease: 'power3.inOut',
          onComplete: finish
        });
      } else {
        finish();
      }
    }

    toggle.addEventListener('click', () => {
      if (summoned) dismiss(true);
      else summon(true);
    });

    petButton.addEventListener('click', () => {
      showTooltip();
      if (hasGSAP && !isReducedMotion() && !moving) {
        stopFloat();
        gsap.timeline({ onComplete: startFloat })
          .to(petWrap, { y: -12, scale: 1.1, duration: 0.16, ease: MOTION.easeSnap })
          .to(petWrap, { y: 0, scale: 1, duration: 0.3, ease: MOTION.easeFloat });
      }
    });

    // Tab hidden: float stops (the global pause also holds), timers clear.
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) stopFloat();
      else if (summoned && !moving) startFloat();
    });

    let saved = null;
    try { saved = window.localStorage.getItem(STORE_KEY); } catch (error) { saved = null; }
    if (saved === 'summoned') summon(false);
  }

  /* --- Konami code: Data Rain (V4 §9, V5 §3.5) --------------------------- */
  /* V5 §3.5: the drawing loop runs on the single shared GSAP ticker (no
     second requestAnimationFrame loop), stops itself after ~5 seconds of
     visible time, and never schedules a second loop while active. */
  function startDataRain(onDone) {
    const canvas = doc.createElement('canvas');
    canvas.id = 'data-rain';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    doc.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); if (onDone) onDone(); return; }

    const chars = '01·+×';
    const fontSize = 16;
    const colors = ['#00A8E8', '#1E1E24', '#93C5FD'];
    const DURATION_MS = 5000;
    let columns = Math.max(1, Math.floor(canvas.width / fontSize));
    let drops = Array(columns).fill(1).map(() => Math.random() * -40);
    let elapsed = 0;
    let finished = false;
    let hiddenPaused = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.max(1, Math.floor(canvas.width / fontSize));
      drops = Array(columns).fill(1).map(() => Math.random() * -40);
    }

    function fadeOut() {
      if (finished) return;
      finished = true;
      canvas.classList.add('is-fading');
      window.setTimeout(() => {
        cleanup();
        if (onDone) onDone();
      }, 450);
    }

    function cleanup() {
      gsap.ticker.remove(draw);
      doc.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    function onVisibility() {
      // The ticker itself stops firing while the tab is hidden (rAF is
      // suspended by the browser); this guard keeps the effect paused on
      // return instead of resuming with a stale state.
      if (doc.hidden) hiddenPaused = true;
      else if (!finished) hiddenPaused = false;
    }

    function draw(time, deltaTime) {
      if (finished || hiddenPaused || doc.hidden) return;
      elapsed += deltaTime || 16.7;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
      if (elapsed >= DURATION_MS) fadeOut();
    }

    doc.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    gsap.ticker.add(draw);
  }

  function initKonami() {
    const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let progress = [];
    let tapCount = 0;
    let tapTimer = null;
    let running = false;

    function trigger() {
      if (running) return;
      running = true;
      showToast('Easter egg found: data stream initiated.');
      // Reduced motion: toast only, no glitch, no canvas (V4 §9.4).
      if (isReducedMotion() || !hasGSAP) { running = false; return; }
      doc.body.classList.add('is-glitching');
      window.setTimeout(() => doc.body.classList.remove('is-glitching'), 320);
      startDataRain(() => { running = false; });
    }

    doc.addEventListener('keydown', (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expected = SEQUENCE[progress.length];
      if (key === expected) {
        progress.push(key);
        if (progress.length === SEQUENCE.length) {
          progress = [];
          trigger();
        }
      } else {
        progress = key === SEQUENCE[0] ? [key] : [];
      }
    });

    // Mobile trigger: 5 taps on the brand mark within 2 seconds.
    const brand = qs('.brand-mark');
    if (brand) {
      brand.addEventListener('touchstart', () => {
        tapCount += 1;
        if (tapTimer) window.clearTimeout(tapTimer);
        tapTimer = window.setTimeout(() => { tapCount = 0; }, 2000);
        if (tapCount >= 5) {
          tapCount = 0;
          trigger();
        }
      }, { passive: true });
    }
  }

  /* ======================================================================
   * 6. V5.2: EDGE ARCHIVE (decorations + interactions, per section)
   * ==================================================================== */

  /* --- §5.2: Game stat bar refill on hover ------------------------------ */
  /* Only numeric bars refill, only on devices that really support hover.
     Targets are read once from the renderer's own widths (never guessed
     from a possibly-changed style), old tweens are killed first, and the
     whole refill is one tween with a stagger. Reduced motion never
     resets bars, and touch taps do not reset them either. */
  function initGameStatBars() {
    if (!hasGSAP || isReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    qsa('.game-card').forEach((card) => {
      const bars = qsa('.stat-bar span', card);
      if (!bars.length) return;
      /* V6.3 §1.1.2: set every bar to its target up front so the first
         render shows the honest value. Bars without a numeric
         data-target (there are none today: non-numeric stats render as
         text rows) are skipped defensively. */
      bars.forEach((bar) => {
        const target = Number(bar.dataset.target);
        if (!isFinite(target)) return;
        bar.style.transformOrigin = 'left center';
        gsap.set(bar, { scaleX: target / 100 });
      });
      trackMotionListener(card, 'mouseenter', () => {
        /* V6.3 §1.1.3: kill -> zero -> refill to the same target, so the
           bar visibly refills to its honest value on every hover. */
        gsap.killTweensOf(bars);
        gsap.set(bars, { scaleX: 0 });
        trackEventTween(gsap.to(bars, {
          scaleX: (index, target) => Number(target.dataset.target) / 100,
          duration: 0.4, stagger: 0.08, ease: 'power2.out', overwrite: 'auto'
        }));
      });
    });
  }

  /* --- §5.3: Hobby chip reactions ---------------------------------------- */
  /* Four short, non-looping reactions driven by dedicated pet-react
     elements, so they never fight the idle desk loop for transforms.
     One active timeline at a time: starting a reaction kills the last.
     Unknown hobbies get a polite toast, never a wrong animation. */
  let hobbyReactionTimeline = null;
  function initHobbyReactions() {
    const host = qs('#hobby-chips');
    const svg = qs('#pixel-pet-art');
    if (!host || !svg) return;

    const props = {
      glow: qs('.pet-react-glow', svg),
      codeline: qs('.pet-react-codeline', svg),
      notes: qsa('.pet-react-note', svg),
      shuttle: qs('.pet-react-shuttle', svg),
      gamepad: qs('.pet-gamepad', svg)
    };

    function resetProps() {
      const all = [props.glow, props.codeline, props.shuttle, props.gamepad]
        .concat(props.notes).filter(Boolean);
      gsap.killTweensOf(all);
      gsap.set(all, { clearProps: 'opacity,transform' });
      gsap.set(all, { opacity: 0 });
    }

    function playReaction(label) {
      const name = String(label || '').toLowerCase();
      const known = name.indexOf('badminton') !== -1 || name.indexOf('coding') !== -1 ||
        name.indexOf('gaming') !== -1 || name.indexOf('music') !== -1;
      if (!known || isReducedMotion() || !hasGSAP) {
        showToast('Pet reacts to ' + (label || 'that'));
        return;
      }

      if (hobbyReactionTimeline) {
        hobbyReactionTimeline.kill();
        resetProps();
      }

      const tl = gsap.timeline({
        onComplete: () => {
          resetProps();
          hobbyReactionTimeline = null;
        }
      });
      hobbyReactionTimeline = tl;
      trackEventTween(tl);

      if (name.indexOf('badminton') !== -1 && props.shuttle) {
        // Shuttle drops from above, bounces once, fades out. Max ~1s.
        tl.fromTo(props.shuttle,
          { y: -8, opacity: 0 },
          { y: 26, opacity: 1, duration: 0.38, ease: 'power1.in' })
          .to(props.shuttle, { y: 20, duration: 0.14, ease: 'power1.out', yoyo: true, repeat: 1 })
          .to(props.shuttle, { opacity: 0, duration: 0.2 });
      } else if (name.indexOf('coding') !== -1 && props.glow) {
        // Screen glow blinks three times, code line flickers in sync.
        tl.fromTo(props.glow,
          { opacity: 0 },
          { opacity: 0.35, duration: 0.12, yoyo: true, repeat: 5, ease: 'steps(1)' })
          .fromTo(props.codeline,
            { opacity: 0 },
            { opacity: 1, duration: 0.1, yoyo: true, repeat: 3, ease: 'steps(1)' }, 0);
      } else if (name.indexOf('gaming') !== -1 && props.gamepad) {
        // Pixel gamepad appears by the pet's hands and shakes three times.
        tl.fromTo(props.gamepad,
          { opacity: 0, x: 0 },
          { opacity: 1, duration: 0.12 })
          .to(props.gamepad, { x: 2, duration: 0.06, yoyo: true, repeat: 5, ease: 'steps(1)' })
          .to(props.gamepad, { opacity: 0, duration: 0.16 });
      } else if (name.indexOf('music') !== -1 && props.notes.length) {
        // Three notes rise from the headphones and fade.
        tl.fromTo(props.notes,
          { opacity: 0, y: 0 },
          { opacity: 1, y: -9, duration: 0.5, stagger: 0.12, ease: 'sine.out' })
          .to(props.notes, { opacity: 0, duration: 0.25, stagger: 0.08 }, '>0.05');
      }
    }

    qsa('.hobby-chip-main', host).forEach((chip) => {
      chip.addEventListener('click', () => {
        const labelNode = chip.querySelector('.hobby-label');
        playReaction(labelNode ? labelNode.textContent : chip.textContent);
      });
    });
  }

  /* --- V6.6 Fase 4: CURRENTLY status + last-logged log (max 3 rows) -------
     Newest first; a repeat press moves the row up with a fresh HH:MM. */
  function initHobbyStatusLog() {
    const host = qs('#hobby-chips');
    const statusValue = qs('#hobby-current .hobby-current-value');
    const logList = qs('#hobby-log-list');
    if (!host || !statusValue || !logList) return;

    const MAX_ROWS = 3;
    const rows = []; // { name, li } newest first
    const timestampNow = () => {
      const now = new Date();
      const pad = (value) => String(value).padStart(2, '0');
      return pad(now.getHours()) + ':' + pad(now.getMinutes());
    };
    const markNewest = () => {
      rows.forEach((row, index) => {
        const nameNode = row.li.querySelector('.log-name');
        if (nameNode) nameNode.classList.toggle('is-new', index === 0);
      });
    };

    function pushRow(label) {
      const name = String(label || '').toUpperCase();
      if (!name) return;
      statusValue.textContent = name;
      const existingIndex = rows.findIndex((row) => row.name === name);
      if (existingIndex !== -1) {
        const existing = rows.splice(existingIndex, 1)[0];
        const timeNode = existing.li.querySelector('.log-time');
        if (timeNode) timeNode.textContent = timestampNow();
        rows.unshift(existing);
        logList.insertBefore(existing.li, logList.firstChild);
      } else {
        const li = doc.createElement('li');
        li.appendChild(el('span', 'log-name', name));
        li.appendChild(el('span', 'log-time', timestampNow()));
        rows.unshift({ name: name, li: li });
        if (rows.length > MAX_ROWS) {
          const oldest = rows.pop();
          if (oldest.li.parentElement === logList) logList.removeChild(oldest.li);
        }
        logList.insertBefore(li, logList.firstChild);
      }
      markNewest();
    }

    qsa('.hobby-chip-main', host).forEach((chip) => {
      chip.addEventListener('click', () => {
        const labelNode = chip.querySelector('.hobby-label');
        pushRow(labelNode ? labelNode.textContent : chip.dataset.hobby);
      });
    });
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

    doc.addEventListener('visibilitychange', () => { if (doc.hidden) hideTip(); });
  }

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

  /* --- §4.2: Gallery Blueprint Archive ------------------------------------ */
  /* Corner brackets around the grid area (markup stays light: four <i>
     elements styled by CSS). The blueprint grid itself is pure CSS on the
     section. Labels were synced in renderV4Sections. */
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
  function initAboutFieldMarks() {
    const deco = DATA && DATA.decorations && DATA.decorations.about;
    const layout = qs('.about-layout');
    if (!deco || deco.sideAnnotations === false || !layout) return;
    if (layout.querySelector('.field-note-tag')) return;
    const marks = ['FIELD NOTE / 01 · OBSERVED', 'REFERENCE / CURIOSITY MAP'];
    marks.forEach((text, index) => {
      const tag = el('span', 'field-note-tag field-note-tag--' + (index + 1), text);
      tag.setAttribute('aria-hidden', 'true');
      layout.appendChild(tag);
    });
  }

  /* --- §4.7: Engraved Credential Archive framing --------------------------- */
  /* Ruler lines with tick marks, corner plates, the archive plate label,
     and the archive stamp: a policy statement about the empty slots,
     never a claim that they are verified entries. The frame anchors to
     the credential grid itself so rulers hug the real area. */
  function initCredentialFrame() {
    const deco = DATA && DATA.decorations && DATA.decorations.credentials;
    if (!deco) return;
    const inner = qs('.credentials-inner');
    const grid = qs('.credential-grid');
    if (!inner || !grid || grid.querySelector('.credential-frame')) return;

    const frame = el('div', 'credential-frame');
    frame.setAttribute('aria-hidden', 'true');
    if (deco.rulerLines) {
      frame.appendChild(el('span', 'credential-ruler credential-ruler--top'));
      frame.appendChild(el('span', 'credential-ruler credential-ruler--bottom'));
    }
    for (let i = 0; i < 4; i++) frame.appendChild(el('i', 'credential-plate'));
    grid.appendChild(frame);

    if (deco.plateLabel) {
      const plate = el('span', 'credential-plate-label', deco.plateLabel);
      plate.setAttribute('aria-hidden', 'true');
      grid.appendChild(plate);
    }
    if (deco.stamp) {
      const stamp = el('span', 'credential-stamp', deco.stamp);
      stamp.setAttribute('aria-hidden', 'true');
      grid.appendChild(stamp);
    }
  }

  /* --- V6.6 Fase 2: entry requirements column + verification timeline ----
     The empty archive explains its own admission rules; the timeline
     counts only real entries from DATA.credentials.items.length. */
  function initCredentialRequirements() {
    const inner = qs('.credentials-inner');
    if (!inner || !DATA || !DATA.credentials) return;
    if (qs('.credential-columns', inner)) return; // idempotent
    const gridHost = qs('.vault-frame', inner) || qs('.credential-grid', inner);
    if (!gridHost) return;

    /* 2.1 left column, aligned with the grid. */
    const columns = el('div', 'credential-columns');
    const aside = el('aside', 'credential-requirements');
    aside.setAttribute('aria-label', 'Entry requirements');
    aside.append(el('p', 'section-kicker', 'ENTRY REQUIREMENTS'), el('ul', 'credential-req-list'));
    [['ISSUER', 'Named organization'], ['DATE', 'Year earned'],
     ['VERIFICATION URL', 'Official page only'], ['IMAGE', 'Full certificate or award'],
     ['PROOF ID', 'Optional credential ID']].forEach((req) => {
      const li = doc.createElement('li');
      li.append(el('span', 'req-label', req[0]), el('span', 'req-value', req[1]));
      aside.lastChild.appendChild(li);
    });
    aside.appendChild(el('p', 'credential-req-note',
      'Setiap entri ditambahkan melalui source code. Tidak ada entri yang ditampilkan sebelum benar-benar ada.'));
    columns.append(aside, gridHost);
    const footnote = qs('.credentials-footnote', inner);
    inner.insertBefore(columns, footnote);

    /* 2.3 timeline: live entry count, marker at the running year. */
    const timeline = el('div', 'credential-timeline');
    timeline.setAttribute('aria-hidden', 'true');
    timeline.append(el('div', 'timeline-line'), el('div', 'timeline-marker timeline-marker--current'),
      el('span', 'timeline-year', String(DATA.meta.year || new Date().getFullYear())),
      el('span', 'timeline-label', (Array.isArray(DATA.credentials.items) ? DATA.credentials.items.length : 0) + ' ENTRI TERVERIFIKASI'));
    inner.insertBefore(timeline, footnote);
  }

  /* --- §4.5: Off-screen Desk Habitat --------------------------------------- */
  /* A quiet environment behind the pixel pet: wall, window, poster, and a
     three-row pixel floor. A few dust particles drift a few pixels up and
     down, but only while the section is on screen, the tab is visible,
     and motion is allowed. Mobile caps the count; reduced motion shows
     static dots. Pointer-events stay with the hobby chips.
     V6.3 §2.5.3: the habitat DOM (and the dust spans) are built once by
     initDeskHabitat() during boot; the dust timeline lives in
     initDeskHabitatDust() inside the matchMedia no-preference handler. */
  let habitatDustTimeline = null;
  function initDeskHabitat() {
    const deco = DATA && DATA.decorations && DATA.decorations.offscreen;
    const stage = qs('.pixel-stage');
    const section = qs('#offscreen');
    if (!deco || deco.habitat === false || !stage || !section) return;
    if (stage.querySelector('.desk-habitat')) return;

    const habitat = el('div', 'desk-habitat');
    habitat.setAttribute('aria-hidden', 'true');
    habitat.appendChild(el('div', 'habitat-wall'));
    habitat.appendChild(el('div', 'habitat-window'));
    habitat.appendChild(el('div', 'habitat-poster'));
    habitat.appendChild(el('div', 'habitat-shelf'));
    habitat.appendChild(el('div', 'habitat-floor'));
    stage.insertBefore(habitat, stage.firstChild);

    /* V6.3 §1.3.2: honour the data file on both viewport classes. The
       mobile value is smaller than the desktop value by design, and the
       hard cap of 8 protects performance if the data ever changes. */
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const desktopCount = Number(deco.dustParticles) || 5;
    const mobileCount = Number(deco.dustParticlesMobile) || 4;
    const dataCount = isMobile ? mobileCount : desktopCount;
    const count = Math.max(0, Math.min(dataCount, 8));
    for (let i = 0; i < count; i++) {
      const dust = el('span', 'habitat-dust');
      dust.style.left = (12 + Math.random() * 76) + '%';
      dust.style.top = (18 + Math.random() * 55) + '%';
      habitat.appendChild(dust);
    }
  }

  /* Motion half: rebuilds the drift timeline over the existing dust
     spans whenever the no-preference handler (re)runs, and cleans up
     through motionRegistry + resetDeskHabitatDust(). */
  function initDeskHabitatDust() {
    const section = qs('#offscreen');
    const habitat = qs('.desk-habitat');
    const dustNodes = habitat ? qsa('.habitat-dust', habitat) : [];
    if (!section || !hasGSAP || isReducedMotion() || !dustNodes.length) return;

    if (habitatDustTimeline && typeof habitatDustTimeline.kill === 'function') habitatDustTimeline.kill();
    habitatDustTimeline = gsap.timeline({ repeat: -1, paused: true, ease: 'sine.inOut' });
    dustNodes.forEach((dust, index) => {
      habitatDustTimeline.to(dust,
        { y: -6, duration: 1.6 + index * 0.25, yoyo: true, repeat: -1 }, 0);
    });

    if ('IntersectionObserver' in window) {
      const io = trackObserver(new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!habitatDustTimeline) return;
          if (entry.isIntersecting && !doc.hidden) habitatDustTimeline.play();
          else habitatDustTimeline.pause();
        });
      }, { threshold: 0.15 }));
      io.observe(section);
      trackMotionListener(doc, 'visibilitychange', () => {
        if (!habitatDustTimeline) return;
        if (doc.hidden) habitatDustTimeline.pause();
      });
    } else {
      habitatDustTimeline.play();
    }
  }

  /* --- V6.3 §2.6-§2.8: MATCHMEDIA LIFECYCLE ------------------------------- */
  /* The reload-based watcher is gone. gsap.matchMedia() now owns the
     two-way switch: the no-preference handler builds every motion piece
     and returns an explicit cleanup; the reduce handler only guarantees
     visible content. Everything matchMedia cannot revert on its own
     (async tweens, listeners, observers, Lenis) is cleaned through
     motionRegistry by cleanupMotionRegistry() plus the reset helpers. */
  const REDUCED_REVEAL_SELECTOR = [
    '.eyebrow', '.hero-tail', '.hero-description', '.hero-note', '.scroll-cue',
    '.hero-actions > *', '#pixel-frame', '.floating-tool', '.hero-sticker',
    '#hero-title .line', '.atlas-path', '.atlas-node', '.atlas-cross',
    '.atlas-label', '.atlas-tick', '.display-heading .line', '.curiosity-heading .line',
    '.about-lead', '.about-body', '.software-chip', '.skill-chip',
    '.journey-item', '.resume-card', '.social-card', '.credential-card',
    '.credential-slot', '.contact-heading', '.contact-card', '.contact-note',
    '.curiosity-node', '.curiosity-panel', '.curiosity-intro', '.motto-word',
    '.deck-console', '.offscreen-layout > *', '.github-grid', '.github-fallback',
    '.github-note', '.companion-inner > *', '.project-card', '.github-card',
    '.closing-solid .line', '.closing-outline .line', '.closing-outline-fill'
  ].join(', ');

  /* V6.3 §2.6.1: walk the registry and release everything that the
     matchMedia context does not revert automatically. */
  function cleanupMotionRegistry() {
    motionRegistry.observers.forEach((obs) => obs.disconnect());
    motionRegistry.observers.clear();
    motionRegistry.timers.forEach((id) => window.clearTimeout(id));
    motionRegistry.timers.clear();
    motionRegistry.intervals.forEach((id) => window.clearInterval(id));
    motionRegistry.intervals.clear();
    motionRegistry.motionListeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    motionRegistry.motionListeners = [];
    motionRegistry.eventTweens.forEach((tween) => {
      if (tween && typeof tween.kill === 'function') tween.kill();
    });
    motionRegistry.eventTweens.clear();
    motionRegistry.ambientTweens.forEach((tween) => {
      if (tween && typeof tween.kill === 'function') tween.kill();
    });
    motionRegistry.ambientTweens.clear();
    motionRegistry.scrollTriggers.forEach((trigger) => {
      if (trigger && typeof trigger.kill === 'function') trigger.kill();
    });
    motionRegistry.scrollTriggers.clear();
    if (lenis) {
      gsap.ticker.remove(lenisTicker);
      try { lenis.destroy(); } catch (error) { /* already gone */ }
      lenis = null;
    }
  }

  /* V6.3 §2.6.2: component-specific reset helpers. */
  function resetProjectReveal() {
    qsa('.project-cover-inner').forEach((cover) => {
      if (hasGSAP) gsap.killTweensOf(cover);
      cover.style.clipPath = 'inset(0 0 0 0)';
    });
  }

  function resetGameStatBars() {
    qsa('.stat-bar span').forEach((bar) => {
      if (hasGSAP) gsap.killTweensOf(bar);
      const target = Number(bar.dataset.target) || 0;
      bar.style.transform = 'scaleX(' + (target / 100) + ')';
    });
  }

  function resetAtlasAmbient() {
    atlasAmbientStarted = false;
  }

  function resetBatchTriggers() {
    motionRegistry.batchTriggers.forEach((trigger) => {
      if (trigger && typeof trigger.kill === 'function') trigger.kill();
    });
    motionRegistry.batchTriggers.clear();
    batchTriggers.forEach((trigger) => trigger.kill());
    batchTriggers = [];
  }

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

  function resetOffscreenPet() {
    if (offscreenPetLoop && typeof offscreenPetLoop.kill === 'function') {
      offscreenPetLoop.kill();
    }
    offscreenPetLoop = null;
  }

  function resetDeskHabitatDust() {
    if (habitatDustTimeline && typeof habitatDustTimeline.kill === 'function') {
      habitatDustTimeline.kill();
    }
    habitatDustTimeline = null;
  }

  /* V6.3 §2.7: belt-and-braces pass for the reduce side. matchMedia reverts
     what it owns; this clears any leftover inline hidden states (and the
     two scrub finals) so content is always fully visible under reduce. */
  function forceContentVisible() {
    if (doc.body.classList.contains('is-glitching')) doc.body.classList.remove('is-glitching');
    if (hasGSAP) {
      try { gsap.set(REDUCED_REVEAL_SELECTOR, { clearProps: 'all' }); } catch (error) { /* partial lists are fine */ }
      try { gsap.set('.atlas-path', { strokeDasharray: 'none', strokeDashoffset: 0 }); } catch (error) { /* noop */ }
      try { gsap.set('#journey-rail-fill', { scaleY: 1 }); } catch (error) { /* noop */ }
      try { gsap.set('.closing-outline-fill', { clipPath: 'inset(0 0% 0 0)' }); } catch (error) { /* noop */ }
      try { gsap.set('.project-cover-inner', { clearProps: 'clipPath' }); } catch (error) { /* noop */ }
    }
  }

  /* V4 section entrances, registered once from boot() (V4 §12.1). */
  function initV4Motion() {
    if (!hasScrollTrigger) return;

    gsap.set('.deck-console', { opacity: 0, y: 34 });
    gsap.to('.deck-console', {
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.games-section', start: 'top 78%', once: true }
    });

    gsap.set('.offscreen-layout > *', { opacity: 0, y: 30 });
    gsap.to('.offscreen-layout > *', {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.offscreen-layout', start: 'top 84%', once: true }
    });

    gsap.set(['.github-grid', '.github-fallback', '.github-note'], { opacity: 0, y: 30 });
    gsap.to(['.github-grid', '.github-fallback', '.github-note'], {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.github-inner', start: 'top 84%', once: true }
    });

    gsap.set('.companion-inner > *', { opacity: 0, y: 26 });
    gsap.to('.companion-inner > *', {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.companion-inner', start: 'top 86%', once: true }
    });
  }

  /* ======================================================================
   * 7. V6.3 §2.5.1: VISIBILITY PAUSE (motion half of the old
   *    initScrollPerformance). The progress bar now lives in
   *    initPageProgressBar() outside matchMedia; the journey rail motion
   *    lives in initJourneyProgressMotion() inside it.
   * ==================================================================== */
  function initVisibilityPause() {
    if (!hasGSAP) return;

    /* V6.4 §1.2.3: the globalTimeline pause/resume handler moved to
       initPageProgressBar() (outside matchMedia) so a hidden tab can
       never keep the timeline paused across a preference transition.
       This function still owns the deferred full-load refresh for
       ScrollTrigger, registered exactly once per motion session. */

    if (hasScrollTrigger) {
      trackMotionListener(window, 'load', () => window.ScrollTrigger.refresh(), { once: true });
    }
  }

  /* ======================================================================
   * BOOT (V6.3 §2.4 order: renders -> registration -> interactions ->
   *        gsap.matchMedia lifecycle)
   * ==================================================================== */
  function boot() {
    // 1. Data-driven DOM renders first. Nothing in this block creates a
    //    tween or a ScrollTrigger. Includes the V6.3 DOM-only builders
    //    that used to be fused with their motion halves.
    renderFilters();
    renderProjects();
    renderSoftware();
    renderSkills();
    renderJourney();
    renderAboutNotes();
    buildCuriosityMap();
    renderCredentials();
    renderSocials();
    renderIdentity();
    renderV4Sections();
    renderGameDeck();
    buildHeadingTicks();    // V6.3 §2.10: ticks DOM once, reveals re-creatable
    buildArchiveSpines();   // V6.3 §2.5: spine DOM once
    buildGithubPulseDots(); // V6.3 §2.5: pulse dots DOM once
    buildHeroDust();        // V6.3 §2.5: hero dust spans once
    initDeskHabitat();      // V6.3 §2.5.3: habitat + dust spans once
    buildAllAmbientDebris(); // V6.4 Fase 4: ambient debris fields once
    buildV65Ornaments();     // V6.5 Fase 4: radar / crypto rings / crosshair SVGs

    // 2. Plugin registration + lag smoothing happen ONCE here, before any
    //    helper below creates a trigger (V5.3 §1.1). V6.3 §2.4.1:
    //    registration is unconditional - it only makes the plugin
    //    available, it never creates an animation, so reduced motion is
    //    not a reason to skip it.
    if (hasGSAP && hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
      gsap.ticker.lagSmoothing(0);
      pluginsRegistered = true;
    }

    // 3. Interaction layer (Category B listeners). These stay active under
    //    reduced motion; their internal guards read the live preference.
    initQuickMenu();
    initAnchors();
    initGlobalArchiveSearch(); // V5.3: hero search is now the navigator
    initFilterControls();
    initJourneyExpand(); // V6.6 Fase 7.2: journey accordion
    initActiveNav();
    initCopyEmail();
    initCredentialDialog();
    initSearchPulse();
    initGameDeck();
    initNowPlaying();
    initGitHubActivity();
    initCompanionHabitat();
    initCompanion();
    initKonami();
    initPageProgressBar(); // V6.3 §2.5.1: progress bar without Lenis
    initHobbyReactions();
    initHobbyStatusLog(); // V6.6 Fase 4: CURRENTLY status + last-logged log
    initGitHubTooltips();
    initGalleryBlueprint();
    initAboutFieldMarks();
    initCredentialFrame();
    initCredentialRequirements(); // V6.6 Fase 2: requirements column + timeline
    initJourneyProgressFallback(); // V6.3: no-GSAP rail fallback (IO + WAAPI)
    fallbackReveal();

    // 4. Motion lifecycle (V6.3 Fase 2): gsap.matchMedia() owns the
    //    two-way reduced-motion switch. Everything created synchronously
    //    inside the no-preference handler is reverted automatically when
    //    the condition changes; the returned cleanup releases the rest.
    if (hasGSAP) {
      motionMedia = gsap.matchMedia();

      motionMedia.add('(prefers-reduced-motion: no-preference)', () => {
        initSmoothScroll();
        initV4Motion();
        initSkillConstellation();
        initArchiveSpine();
        initJourneyProgressMotion();
        initGithubPulse();
        initDeskHabitatDust();
        initOffscreenPet();
        initPointerParallax();
        initHeroButtons();
        initBackTop();
        initSocialIconRedraw();
        initProjectImageReveal(); // V6.3 Fase 3: directional cover reveal
        initClosingCrosshair();   // V6.5 §4.6: observatory crosshair reveal
        initGameStatBars();
        setupProjectBatch();
        initVisibilityPause();

        /* V6.6 Fase 9.4: the opening experience is the ONLY animation
           allowed to delay the hero. Everything else above already ran. */
        const startHero = () => {
          initHeroIntro();
          initSectionMotion();
        };

        if (shouldShowArchiveOpening()) {
          initArchiveOpening(startHero);
        } else {
          startHero();
        }

        return () => {
          cleanupMotionRegistry();
          if (deckReduceCleanup) deckReduceCleanup(); // V6.4 §3.3.2
          resetProjectReveal();
          resetGameStatBars();
          resetAtlasAmbient();
          resetBatchTriggers();
          resetJourneyRail();
          resetJourneyMotionState();
          resetOffscreenPet();
          resetDeskHabitatDust();
        };
      });

      motionMedia.add('(prefers-reduced-motion: reduce)', () => {
        // Content is visible, no hidden states: the CSS
        // @media (prefers-reduced-motion: reduce) block already renders
        // every final state. This pass only clears leftovers that the
        // revert above might have missed (V6.3 §2.7).
        forceContentVisible();
        return () => {};
      });
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
