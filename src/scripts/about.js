/*!
 * about.js: halaman /about (migrasi Astro V7.0, Fase 4.4 + 5).
 * Skills & tools, Journey (accordion + rail), Curiosity Map,
 * field notes, dan parallax artwork.
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


/* V7.0: parallax artwork about dipisah dari initPointerParallax
   (bagian hero pindah ke home.js). Perilaku identik. */
function initArtworkParallax() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
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


/* ======================================================================
 * BOOT HALAMAN ABOUT
 * ==================================================================== */
bootPage({
  renders: [renderSoftware, renderSkills, renderJourney, renderAboutNotes, buildCuriosityMap],
  interactions: [initJourneyExpand, initAboutFieldMarks, initJourneyProgressFallback],
  motion: [initJourneyProgressMotion, initArtworkParallax, initSkillConstellation],
  cleanups: [resetJourneyRail, resetJourneyMotionState],
});
