/*!
 * about/curiosity-map.js: Curiosity Map (modularized V11.1-M).
 *
 * Single responsibility: status/data mapping khusus Curiosity Map
 * (statusLevelOf) dan builder peta (buildCuriosityMap) dari
 * DATA.curiosity. Restore default view (DATA focus) tetap bagian
 * builder.
 */
import {
  DATA, el, qs, qsa, SVG_NS, buildHeading, setText, MOTION,
  hasGSAP, isReducedMotion,
} from '../core.js';

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

/* Modularization exports (public API of this feature module). */
export { statusLevelOf, buildCuriosityMap };
