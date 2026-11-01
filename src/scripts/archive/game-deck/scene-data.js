/*!
 * archive/game-deck/scene-data.js: pixel scene data + builder for the
 * Game Deck cards (V6.4 Fase 2, modularized V11.1-M).
 *
 * Single responsibility: data GAME_SCENE_SPECS, genre allowlist
 * DECK_GENRES, dan builder scene pixel per game. Mengubah ilustrasi
 * pixel per game tidak mengharuskan membaca controller Game Deck.
 */
import { el, doc, SVG_NS } from '../../core.js';

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

/* Modularization exports (public API of this feature module).
   GAME_SCENE_SPECS tetap internal - hanya dikonsumsi builder di sini. */
export { DECK_GENRES, buildGamePixelScene };
