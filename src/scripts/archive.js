/*!
 * archive.js: cabang arsip (migrasi Astro V7.0, Fase 4.5-4.7 + 5).
 * /archive/play: Game Deck utuh (render, scene pixel, entrance,
 * eject, stat bar, Konami). /archive/credentials: render + dialog +
 * frame + kolom syarat. /archive/off-screen: pixel pet, hobi, habitat,
 * companion, Spotify copy. /archive: GitHub activity + pulse + tooltip.
 * Semua fungsi dipindahkan utuh tanpa mengurangi logika animasi.
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
  trackRafLoop, trackWebGLContext,
} from './core.js';

let deckReduceCleanup = null;

/* ======================================================================
 * V8.0 FASE 4: CRT SHADER PADA GAME DECK (WEBGL RINGAN)
 * ======================================================================
 * Overlay prosedural di atas .deck-screen selama Game Deck terbuka:
 * scanline, phosphor glow, grille RGB halus, band roll lambat, grain,
 * dan ilusi layar melengkung (vignette tepi + sudut membulat). Shader
 * GLSL inline string (spesifikasi mengizinkan); tanpa tekstur sehingga
 * konten DOM kartu tetap hidup dan interaktif di bawahnya (canvas
 * pointer-events none).
 * Lifecycle (Batasan 2 + 3): start hanya dari jalur openDeck animasi,
 * no-op saat reduced motion atau non fine-pointer; stop dipanggil dari
 * closeDeckInstant (satu choke point untuk eject, instant close, dan
 * reduce cleanup) plus jaring pengaman after-swap lewat trackRafLoop +
 * trackWebGLContext. Listener resize dikelola manual oleh stop() karena
 * hidup-matinya mengikuti sesi deck, bukan sekali per halaman; stop
 * sendiri terdaftar di registry sehingga tetap terbersihkan.
 * Progressive enhancement (Batasan 1): tanpa WebGL seluruh modul no-op
 * dan deck tampil normal. */
const CRT_VERTEX = [
  'attribute vec2 aPos;',
  'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }'
].join('\n');

const CRT_FRAGMENT = [
  'precision mediump float;',
  'uniform float uTime;',
  'uniform vec2 uRes;',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
  'void main() {',
  '  vec2 uv = gl_FragCoord.xy / uRes;',
  '  vec2 c = uv - 0.5;',
  '  float r = length(c * vec2(1.12, 1.0));',
  '  float edge = smoothstep(0.55, 0.8, r);',
  '  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 1.5708);',
  '  float grille = 0.86 + 0.14 * sin(gl_FragCoord.x * 2.0944);',
  '  float bandPos = fract(uv.y * 0.6 - uTime * 0.05);',
  '  float band = smoothstep(0.0, 0.2, bandPos) * smoothstep(0.45, 0.2, bandPos);',
  '  float grain = hash(gl_FragCoord.xy + floor(uTime * 24.0) * 13.7);',
  '  float dark = (1.0 - scan) * 0.2 + edge * 0.38;',
  '  float glow = 0.025 + band * 0.075;',
  '  float alpha = clamp(dark + glow, 0.0, 0.9);',
  '  vec3 phosphor = vec3(0.55, 1.0, 0.72) * grille;',
  '  vec3 col = mix(vec3(0.0), phosphor, clamp(glow / max(alpha, 0.001), 0.0, 1.0));',
  '  gl_FragColor = vec4(col, alpha);',
  '}'
].join('\n');

const crtState = {
  active: false,
  canvas: null,
  gl: null,
  rafId: 0,
  startedAt: 0,
  resizeHandler: null,
  stopFn: null
};

function compileCrtShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'CRT shader compile failed');
  }
  return shader;
}

function stopDeckCRT() {
  if (!crtState.active) return;
  crtState.active = false;
  if (crtState.rafId) {
    window.cancelAnimationFrame(crtState.rafId);
    crtState.rafId = 0;
  }
  if (crtState.resizeHandler) {
    window.removeEventListener('resize', crtState.resizeHandler);
    crtState.resizeHandler = null;
  }
  if (crtState.canvas && crtState.canvas.parentNode) {
    try { crtState.canvas.parentNode.removeChild(crtState.canvas); } catch (error) { /* DOM sudah diganti */ }
  }
  if (crtState.gl) {
    try {
      const lose = crtState.gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (error) { /* context sudah lepas */ }
  }
  crtState.canvas = null;
  crtState.gl = null;
}

function startDeckCRT(screen) {
  if (!screen || crtState.active || isReducedMotion() || !finePointer) return;
  const canvas = doc.createElement('canvas');
  canvas.className = 'deck-crt-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;';
  screen.appendChild(canvas);

  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false, antialias: false,
      depth: false, stencil: false, powerPreference: 'low-power'
    });
  } catch (error) {
    gl = null;
  }
  if (!gl) {
    canvas.remove();
    return; // Batasan 1: tanpa WebGL deck tetap berfungsi normal
  }

  let program = null;
  try {
    const vs = compileCrtShader(gl, gl.VERTEX_SHADER, CRT_VERTEX);
    const fs = compileCrtShader(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'CRT program link failed');
    }
  } catch (error) {
    canvas.remove();
    return; // Batasan 1: shader gagal -> deck tetap normal, tanpa error fatal
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'uTime');
  const uRes = gl.getUniformLocation(program, 'uRes');

  const resize = () => {
    const rect = screen.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();

  crtState.active = true;
  crtState.canvas = canvas;
  crtState.gl = gl;
  crtState.startedAt = 0;

  const loop = (timestamp) => {
    if (!crtState.active) return;
    if (!crtState.startedAt) crtState.startedAt = timestamp;
    gl.uniform1f(uTime, (timestamp - crtState.startedAt) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    crtState.rafId = window.requestAnimationFrame(loop);
  };
  crtState.rafId = window.requestAnimationFrame(loop);

  crtState.resizeHandler = resize;
  window.addEventListener('resize', resize);

  /* Batasan 2: satu fungsi stop terdaftar di dua jalur registry
     (rafLoops untuk rAF, webgl untuk context + canvas); idempoten via
     flag active, jadi pemanggilan ganda after-swap aman. */
  crtState.stopFn = trackRafLoop(stopDeckCRT);
  trackWebGLContext(stopDeckCRT);
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

    /* V8.1 Fase 4.2: kartu sampel "SAMPLE FORMAT / NOT AN ENTRY"
       dihapus dari tampilan publik agar vault hanya berisi slot yang
       jujur. Format kartu lengkap tetap terdokumentasi di komentar
       "HOW TO ADD A CREDENTIAL" pada src/data/content.js. */

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

function renderGithubCopy() {
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

/* --- Section 05: Off-screen pixel pet -------------------------------- */
/* V6.4 Fase 4: DESKTOP DECORATION LAYERS (Q4=A active, Q9=B medium).
   Layer 1: ambient pixel debris in the section margins. One field per
   section, aria-hidden, pointer-events none, opacity 0.2, hidden
   below 900px (spec 4.4 master guard). Deterministic spread: the
   first two items always sit above top:30%, never more than three
   items below top:70%, 60/40 left/right split. */

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
    motionRegistry.tickerCallbacks.delete(draw);
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

  /* V7.4: listener dilacak + ticker callback didaftarkan di registry
     supaya data rain yang masih berjalan saat navigasi ikut mati
     bersih di teardown (canvas lama sudah tidak ada di DOM). */
  trackMotionListener(doc, 'visibilitychange', onVisibility);
  trackMotionListener(window, 'resize', resize);
  gsap.ticker.add(draw);
  motionRegistry.tickerCallbacks.add(draw);
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

  /* V7.4: Konami memasang listener di level dokumen; dilacak agar
     tidak menumpuk ketika boot berjalan lagi setiap navigasi. */
  trackMotionListener(doc, 'keydown', (event) => {
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

  /* V7.4: dilacak untuk teardown navigasi. */
  trackMotionListener(doc, 'visibilitychange', () => { if (doc.hidden) hideTip(); });
}

/* --- §4.4: About constellation draw ------------------------------------- */
/* The decorative constellation draws its edges once when it enters the
   viewport. Without JS or motion the SVG simply renders complete.
   V6.3 §1.5: the constellation is an abstract network now - the
   DATA / SOFTWARE / AI / DATABASES / IOT labels were removed so the
   graphic cannot be misread as a verified skill map. */

function resetGameStatBars() {
  qsa('.stat-bar span').forEach((bar) => {
    if (hasGSAP) gsap.killTweensOf(bar);
    const target = Number(bar.dataset.target) || 0;
    bar.style.transform = 'scaleX(' + (target / 100) + ')';
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

function initV4Motion() {
  if (!hasScrollTrigger) return;

  /* V8.1 Fase 5: initV4Motion dipakai empat halaman arsip lewat
     PAGE_BOOT, tetapi tiap blok hanya relevan di satu halaman. Setiap
     blok dijaga gsap.utils.toArray + length agar GSAP tidak mencatat
     peringatan "target not found" di halaman arsip lain. */
  const deckConsole = gsap.utils.toArray('.deck-console');
  if (deckConsole.length) {
    gsap.set(deckConsole, { opacity: 0, y: 34 });
    gsap.to(deckConsole, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.games-section', start: 'top 78%', once: true }
    });
  }

  const offscreenItems = gsap.utils.toArray('.offscreen-layout > *');
  if (offscreenItems.length) {
    gsap.set(offscreenItems, { opacity: 0, y: 30 });
    gsap.to(offscreenItems, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.offscreen-layout', start: 'top 84%', once: true }
    });
  }

  const githubTargets = gsap.utils.toArray('.github-grid, .github-fallback, .github-note');
  if (githubTargets.length) {
    gsap.set(githubTargets, { opacity: 0, y: 30 });
    gsap.to(githubTargets, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.github-inner', start: 'top 84%', once: true }
    });
  }

  const companionItems = gsap.utils.toArray('.companion-inner > *');
  if (companionItems.length) {
    gsap.set(companionItems, { opacity: 0, y: 26 });
    gsap.to(companionItems, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.companion-inner', start: 'top 86%', once: true }
    });
  }
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

/* ======================================================================
 * BOOT HALAMAN ARSIP (dipilih halaman lewat window.__FIP_PAGE)
 * ==================================================================== */
const PAGE_BOOT = {
  'archive-index': {
    renders: [renderGithubCopy],
    interactions: [initGitHubActivity, initGitHubTooltips],
    motion: [initGithubPulse, initV4Motion],
    cleanups: [],
  },
  'archive-play': {
    renders: [renderDeckCopy, renderGameDeck],
    interactions: [initGameDeck, initKonami],
    motion: [initGameStatBars, initV4Motion],
    cleanups: [resetGameStatBars, runDeckReduceCleanup],
  },
  'archive-credentials': {
    renders: [renderCredentials],
    interactions: [initCredentialDialog, initCredentialFrame, initCredentialRequirements],
    motion: [initV4Motion],
    cleanups: [],
  },
  'archive-off-screen': {
    renders: [renderOffscreenCopy, renderCompanionCopy],
    interactions: [initCompanionHabitat, initCompanion, initHobbyReactions, initHobbyStatusLog],
    motion: [initDeskHabitatDust, initOffscreenPet, initV4Motion],
    cleanups: [resetOffscreenPet, resetDeskHabitatDust],
  },
};

/* V7.4: kunci halaman (data-page) dibaca ulang pada SETIAP
   astro:page-load lewat opsi resolve. Modul ini hanya dieksekusi sekali
   per sesi browser, tetapi kini satu bootPage melayani empat halaman
   arsip (hub, play, credentials, off-screen) bahkan saat berpindah
   lewat navigasi client-side. */
bootPage({
  resolve: () => PAGE_BOOT[doc.documentElement.dataset.page || ''] || null,
});
