/*!
 * archive/game-deck/entrance-data.js: per-game entrance choreography
 * specs + prop helpers (V6.4 Fase 3, modularized V11.1-M).
 *
 * Single responsibility: data GAME_ENTRANCE_SPECS (satu fungsi per game
 * id) dan helper props sementara (.deck-temp). Tidak menyimpan state
 * controller; setiap spec menerima (tl, card, index) dan menambah
 * tween pada timeline open milik Game Deck.
 */
import { el, doc, qs, qsa } from '../../core.js';

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


/* Modularization exports (public API of this feature module).
   deckTemp/hexToRgba/deckProp tetap internal - hanya dipakai specs. */
export { GAME_ENTRANCE_SPECS };
