/*!
 * generative-ambient/effects/orbital.js: Effect 2 factory (modularized
 * V11.1-M).
 *
 * Single responsibility: partikel 2x2px pada lintasan elips untuk
 * section Companion; partikel melambat saat pointer mendekat.
 * Pointer ditangkap section parent via trackSectionPointer milik
 * engine (bukan listener di canvas). Kontrak: { tick, resize, destroy }.
 */

  /* ======================================================================
   * Effect 2 · Orbital (Companion): particles on tracking paths
   * ==================================================================== */
  /* 2x2px particles travelling along faint ellipses. When the pointer
     approaches, a particle slows down (V6.5 §4.4). */
export function mountOrbital(canvas, env) {
  const { COLORS, fitCanvas, trackSectionPointer } = env;
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
