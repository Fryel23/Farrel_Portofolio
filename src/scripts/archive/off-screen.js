/*!
 * archive/off-screen.js: Off-screen pixel pet feature (modularized
 * V11.1-M).
 *
 * Single responsibility: pixel pet + habitat meja kerja - render copy
 * & hobby chips, blink/loop pet, reaksi chip hobi, status log,
 * Desk Habitat + debu, dan reset-nya. Pet loop tunggal (satu timeline
 * repeat -1) dengan IntersectionObserver + visibility pause.
 */
import {
  DATA, doc, el, qs, qsa, setText, buildHeading, showToast,
  hasGSAP, isReducedMotion, trackObserver, trackEventTween,
  trackAmbientTween, trackMotionListener,
} from '../core.js';
import { scheduleBlink } from './shared/pet-blink.js';

/* --- Section 05: Off-screen pixel pet -------------------------------- */
/* V6.4 Fase 4: DESKTOP DECORATION LAYERS (Q4=A active, Q9=B medium).
   Layer 1: ambient pixel debris in the section margins. One field per
   section, aria-hidden, pointer-events none, opacity 0.2, hidden
   below 900px (spec 4.4 master guard). Deterministic spread: the
   first two items always sit above top:30%, never more than three
   items below top:70%, 60/40 left/right split. */


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

function renderOffscreenCopy() {
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
        link.setAttribute('href', mapped[0].startsWith('/') ? mapped[0] : '#' + mapped[0]);
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


/* Modularization exports (public API of this feature module). */
export {
  renderOffscreenCopy,
  initOffscreenPet,
  initHobbyReactions,
  initHobbyStatusLog,
  initDeskHabitat,
  initDeskHabitatDust,
  resetOffscreenPet,
  resetDeskHabitatDust,
};
