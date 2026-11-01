/*!
 * about/interactions.js: About interactions (modularized V11.1-M).
 *
 * Single responsibility: journey accordion (expand/collapse) dan
 * field marks dekoratif. Bukan motion murni - kontrol & DOM dekoratif.
 */
import { DATA, el, qs, qsa, hasGSAP, isReducedMotion, MOTION } from '../core.js';

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

/* Modularization exports (public API of this feature module). */
export { initJourneyExpand, initAboutFieldMarks };
