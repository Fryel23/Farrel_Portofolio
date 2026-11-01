/*!
 * about/renderers.js: About content renderers (modularized V11.1-M).
 *
 * Single responsibility: merender konten About dari DATA - software,
 * skills, journey, dan sticky notes. Tidak menyimpan state.
 */
import { DATA, el, qs, buildTwoLineCardHeading, isReducedMotion } from '../core.js';

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

/* Modularization exports (public API of this feature module). */
export { renderSoftware, renderSkills, renderJourney, renderAboutNotes };
