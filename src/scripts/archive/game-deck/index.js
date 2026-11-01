/*!
 * archive/game-deck/index.js: Game Deck feature owner (modularized
 * V11.1-M).
 *
 * Single responsibility: render Game Deck + state machine
 * idle -> loading -> open/ejecting, wiring tombol, entrance/eject
 * timeline, stat bar refill, dan cleanup/reset deck (termasuk choke
 * point CRT via crt.js). Data scene/entrance ada di scene-data.js dan
 * entrance-data.js; modul ini pemilik state & lifecycle-nya.
 */
import {
  DATA, el, qs, qsa, setText, buildHeading, lenis,
  hasGSAP, hasScrollTrigger, isReducedMotion, motionRegistry, trackEventTween,
  trackMotionListener,
} from '../../core.js';
import { startDeckCRT, stopDeckCRT } from './crt.js';
import { GAME_ENTRANCE_SPECS } from './entrance-data.js';
import { DECK_GENRES, buildGamePixelScene } from './scene-data.js';

let deckReduceCleanup = null;

/* V7.0: renderV4Sections dipecah per halaman tujuan. */
function renderDeckCopy() {
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
}


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
    /* V8.0 Fase 4: satu choke point penutupan deck -> CRT overlay (jika
       aktif) selalu dimatikan di sini: eject, instant close, reduce
       cleanup, dan jalur fallback tanpa GSAP. Idempoten. */
    stopDeckCRT();
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

    /* V7.5 FIX: Tinggi halaman menyusut karena kartu hilang. */
    if (lenis) {
      requestAnimationFrame(() => lenis.resize());
    }
    if (hasScrollTrigger) {
      requestAnimationFrame(() => window.ScrollTrigger.refresh());
    }
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

    /* V7.5 FIX: Beri tahu Lenis & ScrollTrigger bahwa tinggi halaman
       telah bertambah karena kartu game baru saja muncul. */
    if (lenis) {
      requestAnimationFrame(() => lenis.resize());
    }
    if (hasScrollTrigger) {
      requestAnimationFrame(() => window.ScrollTrigger.refresh());
    }
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

    /* V8.0 Fase 4: CRT overlay hidup dari awal entrance sampai deck
       ditutup (stopDeckCRT dipanggil closeDeckInstant). */
    startDeckCRT(screen);

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

      /* V7.5 FIX: Pastikan tinggi halaman diukur ulang setelah eject. */
      if (lenis) {
        requestAnimationFrame(() => lenis.resize());
      }
      if (hasScrollTrigger) {
        requestAnimationFrame(() => window.ScrollTrigger.refresh());
      }
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


function resetGameStatBars() {
  qsa('.stat-bar span').forEach((bar) => {
    if (hasGSAP) gsap.killTweensOf(bar);
    const target = Number(bar.dataset.target) || 0;
    bar.style.transform = 'scaleX(' + (target / 100) + ')';
  });
}



/* ======================================================================
 * 7. V6.3 §2.5.1: VISIBILITY PAUSE (motion half of the old
 *    initScrollPerformance). The progress bar now lives in
 *    initPageProgressBar() outside matchMedia; the journey rail motion
 *    lives in initJourneyProgressMotion() inside it.
 * ==================================================================== */

/* V7.0: cleanup deck untuk siklus matchMedia halaman play. */
function runDeckReduceCleanup() {
  if (deckReduceCleanup) deckReduceCleanup();
}


/* Modularization exports (public API of this feature module). */
export {
  renderDeckCopy,
  renderGameDeck,
  initGameDeck,
  initGameStatBars,
  resetGameStatBars,
  runDeckReduceCleanup,
};
