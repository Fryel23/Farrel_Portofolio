/*!
 * generative-ambient/effects/isometric-grid.js: Effect 1 factory
 * (modularized V11.1-M).
 *
 * Single responsibility: efek isometric grid + fading scanline untuk
 * section Off-screen. Satu kontrak engine: { tick(dt), resize(),
 * destroy() } - TANPA RAF sendiri (satu loop milik engine) dan TANPA
 * observer sendiri (observer bersama milik engine). Dependency engine
 * (doc/COLORS/fitCanvas) diterima via parameter env.
 */

  /* ======================================================================
   * Effect 1 · IsometricGrid (Off-screen): data grid + scanline
   * ==================================================================== */
  /* A static isometric line field (two line families at +/-30 degrees)
     pre-rendered once per resize, plus a horizontal scanline that sweeps
     down and fades behind itself. */
export function mountIsometricGrid(canvas, env) {
  const { doc, COLORS, fitCanvas } = env;
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
