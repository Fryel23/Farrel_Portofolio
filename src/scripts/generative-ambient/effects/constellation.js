/*!
 * generative-ambient/effects/constellation.js: Effect 3 factory
 * (modularized V11.1-M).
 *
 * Single responsibility: node drifting + garis tipis untuk section
 * Social; node terang saat kursor dekat dan terhubung ke kursor.
 * Kontrak: { tick, resize, destroy } - satu loop engine.
 */

  /* ======================================================================
   * Effect 3 · Constellation (Social): the ONE interactive ornament
   * ==================================================================== */
  /* Drifting nodes joined by thin lines. While the pointer is over the
     section, nearby nodes light up and link to the cursor. */
export function mountConstellation(canvas, env) {
  const { COLORS, fitCanvas, trackSectionPointer } = env;
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
