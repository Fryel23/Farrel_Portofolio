/*!
 * archive/companion.js: Companion page pet feature (modularized
 * V11.1-M).
 *
 * Single responsibility: SATU implementasi companion - habitat scene,
 * summon/dismiss FLIP-like, tooltip, float, dan status board. State
 * habitat (companionState) dimiliki modul ini; kedipan mata memakai
 * utilitas bersama scheduleBlink (bukan state duplikat).
 */
import {
  DATA, doc, el, qs, setText, buildHeading, MOTION,
  hasGSAP, isReducedMotion, trackMotionListener,
} from '../core.js';
import { scheduleBlink } from './shared/pet-blink.js';

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
  /* V7.4: listener level dokumen dilacak agar terlepas saat teardown
     navigasi (tidak menumpuk antar boot). */
  trackMotionListener(doc, 'visibilitychange', () => {
    if (doc.hidden) stopFloat();
    else if (summoned && !moving) startFloat();
  });

  let saved = null;
  try { saved = window.localStorage.getItem(STORE_KEY); } catch (error) { saved = null; }
  if (saved === 'summoned') summon(false);
}



function renderCompanionCopy() {
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
/* Modularization exports (public API of this feature module). */
export {
  renderCompanionCopy,
  initCompanionHabitat,
  initCompanion,
};
