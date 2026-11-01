/*!
 * archive/konami.js: Konami code easter egg + Data Rain (modularized
 * V11.1-M).
 *
 * Single responsibility: input sequence Konami (keyboard + 5 taps),
 * glitch body class, dan Data Rain canvas yang menggambar pada SATU
 * shared GSAP ticker (tanpa RAF kedua) dengan cleanup lengkap.
 */
import {
  doc, qs, showToast, hasGSAP, isReducedMotion,
  trackMotionListener, motionRegistry,
} from '../core.js';

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


/* Modularization exports (public API of this feature module). */
export { initKonami };
