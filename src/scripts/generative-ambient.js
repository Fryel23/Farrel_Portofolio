/*!
 * generative-ambient.js: V6.5 Scientific Archive · Generative Ambient Engine
 * -------------------------------------------------------------------------
 * Purpose (V6.5 spec, Fase 3 + 5):
 *   Fill desktop negative space with precise "scientific instrument"
 *   geometry drawn on Canvas 2D. Three effects are mounted from static
 *   <canvas class="ambient-canvas" data-effect="..."> elements:
 *
 *     isometric-grid  · Off-screen section  · data grid + fading scanline
 *     orbital         · Companion section   · 2x2px particles on ellipses
 *     constellation   · Social section      · nodes + lines, cursor-aware
 *
 * Hard rules honoured here:
 *   - No external libraries. Pure Canvas 2D, no WebGL.
 *   - Early return on (prefers-reduced-motion: reduce) or (max-width: 900px).
 *     Both are also watched at runtime: flipping either mid-session stops
 *     and tears the engine down.
 *   - Exactly ONE central requestAnimationFrame loop. Every canvas shares
 *     it; canvases only tick while they are actually in view
 *     (IntersectionObserver) and the whole loop stops when the tab is
 *     hidden (visibilitychange) or when no canvas is visible.
 *   - Every tick starts with clearRect: no incremental buildup, no leaks.
 *   - Canvases are decorative: aria-hidden, pointer-events: none. Pointer
 *     interaction (orbital slow-down, constellation highlight) is captured
 *     on the parent <section>, never on the canvas itself.
 *
 * Adding a new effect:
 *   1. Drop <canvas class="ambient-canvas" data-effect="my-effect"> into
 *      a position: relative section.
 *   2. Write a factory myEffect(canvas) returning
 *      { tick(dt), resize(), destroy() }.
 *   3. Register it in mountCanvases() below.
 * -------------------------------------------------------------------------
 */
(function initGenerativeAmbient() {
  'use strict';

  const doc = document;

  /* V6.5 §5.3: mobile and reduced-motion never run the engine. */
  const reduceMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMql = window.matchMedia('(max-width: 900px)');
  if (reduceMql.matches || mobileMql.matches) return;

  /* Canvas 2D capability probe (defensive: every target browser has it). */
  const probe = doc.createElement('canvas');
  if (!probe.getContext || !probe.getContext('2d')) return;

  /* ======================================================================
   * Central loop: one rAF for every active canvas
   * ==================================================================== */
  const activeCanvases = new Set();
  let rafId = null;
  let lastTime = 0;

  function loop(time) {
    rafId = null;
    if (!activeCanvases.size) return;
    /* Clamp dt so a background-tab pause cannot teleport the scanline
       or fling the particles on return. */
    const dt = Math.min(Math.max(time - lastTime, 0), 50);
    lastTime = time;
    activeCanvases.forEach((instance) => instance.tick(dt));
    rafId = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId || doc.hidden || !activeCanvases.size) return;
    lastTime = performance.now();
    rafId = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* V6.5 §5.4: nothing may run while the document is hidden. */
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) stopLoop();
    else startLoop();
  });

  /* ======================================================================
   * Shared helpers
   * ==================================================================== */
  const FALLBACK_COLORS = {
    soft: '#93C5FD',
    blue: '#2563EB',
    deep: '#1E3A8A',
    ink: '#0F172A'
  };

  function readColors() {
    const rootStyle = window.getComputedStyle(doc.documentElement);
    function pick(name, fallback) {
      const value = String(rootStyle.getPropertyValue(name) || '').trim();
      return value || fallback;
    }
    return {
      soft: pick('--blue-soft', FALLBACK_COLORS.soft),
      blue: pick('--blue', FALLBACK_COLORS.blue),
      deep: pick('--blue-deep', FALLBACK_COLORS.deep),
      ink: pick('--ink', FALLBACK_COLORS.ink)
    };
  }

  const COLORS = readColors();

  const instances = [];
  let visibility = null;

  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: width, height: height };
  }

  /* Shared pointer tracker: listens on the parent section (the canvas
     itself keeps pointer-events: none). pointer = null means "away". */
  function trackSectionPointer(section, state) {
    if (!section) return;
    section.addEventListener('pointermove', (event) => {
      const rect = section.getBoundingClientRect();
      state.x = event.clientX - rect.left;
      state.y = event.clientY - rect.top;
      state.inside = true;
    });
    section.addEventListener('pointerleave', () => {
      state.inside = false;
      state.x = -9999;
      state.y = -9999;
    });
  }

  function registerInstance(canvas, instance) {
    canvas.__ambientInstance = instance;
    instances.push(instance);
    instance.resize();
    visibility.observe(canvas);
  }

  /* One resize handler for every mounted canvas (debounced with a timer,
     NOT a second rAF: the spec allows only the central loop). */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      instances.forEach((instance) => instance.resize());
    }, 120);
  });

  /* V6.5 §5.3 runtime watch: if the user flips to reduced motion or the
     window drops under 900px mid-session, stop and tear everything down. */
  function teardown() {
    stopLoop();
    activeCanvases.clear();
    instances.forEach((instance) => {
      if (instance.destroy) instance.destroy();
    });
    if (visibility) visibility.disconnect();
    if (resizeTimer) window.clearTimeout(resizeTimer);
  }
  function onEnvironmentChange() {
    if (reduceMql.matches || mobileMql.matches) teardown();
  }
  if (typeof mobileMql.addEventListener === 'function') {
    mobileMql.addEventListener('change', onEnvironmentChange);
    reduceMql.addEventListener('change', onEnvironmentChange);
  } else if (typeof mobileMql.addListener === 'function') {
    mobileMql.addListener(onEnvironmentChange);
    reduceMql.addListener(onEnvironmentChange);
  }

  /* ======================================================================
   * Effect 1 · IsometricGrid (Off-screen): data grid + scanline
   * ==================================================================== */
  /* A static isometric line field (two line families at +/-30 degrees)
     pre-rendered once per resize, plus a horizontal scanline that sweeps
     down and fades behind itself. */
  function mountIsometricGrid(canvas) {
    let ctx = null;
    let width = 1;
    let height = 1;
    let gridLayer = null;
    let clock = 0;
    const PERIOD = 7000;   // ms for one full sweep
    const TRAIL = 130;     // px of fading trail behind the scanline
    const SPACING = 46;    // px between grid lines
    const SLOPE = Math.tan(Math.PI / 6); // isometric 30 degrees

    function renderGridLayer() {
      gridLayer = doc.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gridLayer.width = Math.round(width * dpr);
      gridLayer.height = Math.round(height * dpr);
      const g = gridLayer.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, height);
      g.strokeStyle = COLORS.deep;
      g.globalAlpha = 0.09;
      g.lineWidth = 0.5;
      g.beginPath();
      const span = height * SLOPE;
      for (let c = -span; c <= width * SLOPE + span + SPACING; c += SPACING) {
        g.moveTo(0, c);
        g.lineTo(width, c + width * SLOPE);   // falling family
        g.moveTo(0, c);
        g.lineTo(width, c - width * SLOPE);   // rising family
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    return {
      resize() {
        const fit = fitCanvas(canvas);
        ctx = fit.ctx;
        width = fit.width;
        height = fit.height;
        renderGridLayer();
      },
      tick(dt) {
        if (!ctx || !gridLayer) return;
        clock = (clock + dt) % PERIOD;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(gridLayer, 0, 0, width, height);

        /* Scanline: leads with a soft gradient trail that fades over
           time (distance behind the leading edge = age). */
        const progress = clock / PERIOD;
        const y = progress * (height + TRAIL * 2) - TRAIL;
        if (y > -TRAIL && y < height + TRAIL) {
          const trailTop = Math.max(0, y - TRAIL);
          const trailBottom = Math.min(height, y);
          if (trailBottom > trailTop) {
            const gradient = ctx.createLinearGradient(0, trailTop, 0, y);
            gradient.addColorStop(0, 'rgba(147, 197, 253, 0)');
            gradient.addColorStop(1, 'rgba(147, 197, 253, 0.26)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, trailTop, width, trailBottom - trailTop);
          }
          if (y >= 0 && y <= height) {
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
        }
      },
      destroy() {
        ctx = null;
        gridLayer = null;
      }
    };
  }

  /* ======================================================================
   * Effect 2 · Orbital (Companion): particles on tracking paths
   * ==================================================================== */
  /* 2x2px particles travelling along faint ellipses. When the pointer
     approaches, a particle slows down (V6.5 §4.4). */
  function mountOrbital(canvas) {
    const section = canvas.closest('section');
    const pointer = { x: -9999, y: -9999, inside: false };
    trackSectionPointer(section, pointer);

    let ctx = null;
    let width = 1;
    let height = 1;
    let particles = [];

    function build() {
      const count = 26;
      particles = [];
      for (let i = 0; i < count; i++) {
        const ring = i % 3;
        /* V6.6 Fase 1: particles live in the section margins so they are
           never hidden behind the white habitat card (max-width 760px,
           z-index 1). Spread 4% to 96% wide, 8% to 83% tall; the centre
           band keeps fewer particles, so the orbits read around it. */
        particles.push({
          cx: width * (0.04 + (i % 5) * 0.23) + (i % 2 === 0 ? -20 : 20),
          cy: height * (0.08 + (i % 6) * 0.15),
          rx: width * (0.16 + ring * 0.09),
          ry: width * (0.16 + ring * 0.09) * (0.34 + (i % 3) * 0.12),
          angle: (i * 2.39996) % (Math.PI * 2), // golden-angle spread
          speed: (0.00022 + ring * 0.00016) * (i % 2 === 0 ? 1 : -1),
          slow: 1
        });
      }
    }

    return {
      resize() {
        const fit = fitCanvas(canvas);
        ctx = fit.ctx;
        width = fit.width;
        height = fit.height;
        build();
      },
      tick(dt) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        particles.forEach((p) => {
          const px = p.cx + p.rx * Math.cos(p.angle);
          const py = p.cy + p.ry * Math.sin(p.angle);

          /* Pointer proximity: ease the particle toward 25% speed. */
          let target = 1;
          if (pointer.inside) {
            const dx = px - pointer.x;
            const dy = py - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 170) target = 0.25 + 0.75 * (dist / 170);
          }
          p.slow += (target - p.slow) * Math.min(dt / 220, 1);
          p.angle += p.speed * dt * p.slow;

          /* Faint tracking path (the ellipse itself). */
          ctx.strokeStyle = COLORS.deep;
          ctx.globalAlpha = 0.05;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
          ctx.stroke();

          /* Short trailing arc, fading behind the particle. */
          const dir = p.speed > 0 ? 1 : -1;
          ctx.strokeStyle = COLORS.soft;
          for (let s = 1; s <= 4; s++) {
            ctx.globalAlpha = 0.16 - s * 0.035;
            ctx.beginPath();
            ctx.ellipse(
              p.cx, p.cy, p.rx, p.ry, 0,
              p.angle - dir * s * 0.09,
              p.angle - dir * (s - 1) * 0.09,
              dir < 0
            );
            ctx.stroke();
          }

          /* The particle: a 2x2px pixel dot. */
          ctx.globalAlpha = 0.3 * p.slow + 0.06;
          ctx.fillStyle = COLORS.blue;
          ctx.fillRect(px - 1, py - 1, 2, 2);
          ctx.globalAlpha = 1;
        });
      },
      destroy() {
        ctx = null;
        particles = [];
      }
    };
  }

  /* ======================================================================
   * Effect 3 · Constellation (Social): the ONE interactive ornament
   * ==================================================================== */
  /* Drifting nodes joined by thin lines. While the pointer is over the
     section, nearby nodes light up and link to the cursor. */
  function mountConstellation(canvas) {
    const section = canvas.closest('section');
    const pointer = { x: -9999, y: -9999, inside: false };
    trackSectionPointer(section, pointer);

    let ctx = null;
    let width = 1;
    let height = 1;
    let nodes = [];
    const LINK_DIST = 120;
    const CURSOR_DIST = 150;

    function build() {
      const count = Math.max(26, Math.min(46, Math.round((width * height) / 26000)));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.016,
          vy: (Math.random() - 0.5) * 0.014
        });
      }
    }

    return {
      resize() {
        const fit = fitCanvas(canvas);
        ctx = fit.ctx;
        width = fit.width;
        height = fit.height;
        build();
      },
      tick(dt) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        /* Drift + soft bounce. */
        nodes.forEach((n) => {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x < 4) { n.x = 4; n.vx = Math.abs(n.vx); }
          if (n.x > width - 4) { n.x = width - 4; n.vx = -Math.abs(n.vx); }
          if (n.y < 4) { n.y = 4; n.vy = Math.abs(n.vy); }
          if (n.y > height - 4) { n.y = height - 4; n.vy = -Math.abs(n.vy); }
        });

        /* Node-to-node mesh. */
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = COLORS.deep;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < LINK_DIST) {
              ctx.globalAlpha = 0.09 * (1 - dist / LINK_DIST);
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }

        /* Nodes; lit when the cursor is near. */
        nodes.forEach((n) => {
          let lit = 0;
          if (pointer.inside) {
            const dx = n.x - pointer.x;
            const dy = n.y - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CURSOR_DIST) lit = 1 - dist / CURSOR_DIST;
          }
          ctx.globalAlpha = 0.28 + lit * 0.5;
          ctx.fillStyle = lit > 0 ? COLORS.blue : COLORS.deep;
          ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
          if (lit > 0) {
            ctx.globalAlpha = 0.28 * lit;
            ctx.strokeStyle = COLORS.soft;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
            ctx.lineWidth = 0.5;
          }
        });
        ctx.globalAlpha = 1;
      },
      destroy() {
        ctx = null;
        nodes = [];
      }
    };
  }

  /* ======================================================================
   * Registration (V6.5 §5.1) + per-canvas IntersectionObserver (§5.2)
   * ==================================================================== */
  visibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const instance = entry.target.__ambientInstance;
      if (!instance) return;
      if (entry.isIntersecting) {
        instance.resize(); // re-fit in case the layout shifted
        activeCanvases.add(instance);
        startLoop();
      } else {
        activeCanvases.delete(instance);
        if (!activeCanvases.size) stopLoop();
      }
    });
  }, { threshold: 0.04, rootMargin: '60px 0px' });

  function mountCanvases() {
    const canvases = doc.querySelectorAll('canvas.ambient-canvas');
    Array.prototype.forEach.call(canvases, (el) => {
      const effect = el.dataset.effect;
      if (effect === 'isometric-grid') registerInstance(el, mountIsometricGrid(el));
      else if (effect === 'orbital') registerInstance(el, mountOrbital(el));
      else if (effect === 'constellation') registerInstance(el, mountConstellation(el));
    });
  }

  mountCanvases();

  /* Public handle (V6.5 §3.1): the loop and the live set are exposed so
     future features can integrate without owning a second rAF loop. */
  window.GenerativeAmbient = { activeCanvases: activeCanvases, startLoop: startLoop, stopLoop: stopLoop };
})();
