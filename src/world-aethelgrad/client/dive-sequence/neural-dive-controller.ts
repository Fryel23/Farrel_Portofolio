/**
 * src/world-aethelgrad/client/dive-sequence/neural-dive-controller.ts
 * Pengendali Sekuens Transisi "VR Neural Dive" dari Batang Portofolio menuju /aethelgrad.
 */

import { playDiveWarpSfx } from '../audio/aethelgrad-sound-synth.ts';

let diveInProgress = false;

export function triggerNeuralDiveSequence(targetUrl: string = '/aethelgrad'): void {
  if (typeof window === 'undefined' || diveInProgress) return;

  const reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    window.sessionStorage.setItem('aethelgrad_dive_active', '1');
  } catch {
    // ignore
  }

  if (reducedMotion) {
    window.location.href = targetUrl;
    return;
  }

  const overlay = document.getElementById('portal-dive-overlay');
  if (!overlay) {
    window.location.href = targetUrl;
    return;
  }

  diveInProgress = true;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  playDiveWarpSfx();

  const phaseLabel = document.getElementById('portal-dive-phase-label');
  const subLabel = document.getElementById('portal-dive-sub');
  const progressBar = document.getElementById('portal-dive-progress-bar');
  const pctLabel = document.getElementById('portal-dive-pct');
  const canvas = document.getElementById('portal-warp-canvas') as HTMLCanvasElement | null;
  const ctx = canvas ? canvas.getContext('2d') : null;

  const stars = Array.from({ length: 110 }, (_, idx) => ({
    angle: (idx / 110) * Math.PI * 2,
    radius: 10 + (idx % 17) * 18,
    speed: 6 + (idx % 7) * 2.5,
    color: idx % 3 === 0 ? '#38BDF8' : idx % 3 === 1 ? '#818CF8' : '#FBBF24',
  }));

  const startMs = performance.now();
  const totalDurationMs = 1350;

  const step = (now: number) => {
    const elapsed = now - startMs;
    const pct = Math.min(100, Math.round((elapsed / totalDurationMs) * 100));

    if (progressBar) progressBar.style.width = `${pct}%`;
    if (pctLabel) pctLabel.textContent = `${pct}%`;

    if (elapsed > 520 && phaseLabel && subLabel) {
      phaseLabel.textContent = 'PHASE 02 // QUANTUM WARP TUNNEL ENGAGED';
      subLabel.textContent =
        'MEMBUKA GERBANG MENARA AETHELGRAD · MEMUAT PROTOKOL PAPER-DOLL & COLOSSEUM...';
    }

    if (ctx && canvas) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.fillStyle = 'rgba(3, 6, 17, 0.32)';
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        const rPrev = s.radius;
        s.radius += s.speed * (elapsed > 500 ? 1.85 : 0.9);
        if (s.radius > Math.max(w, h) * 0.65) {
          s.radius = 8;
        }
        const x1 = cx + Math.cos(s.angle) * rPrev;
        const y1 = cy + Math.sin(s.angle) * rPrev;
        const x2 = cx + Math.cos(s.angle) * s.radius;
        const y2 = cy + Math.sin(s.angle) * s.radius;

        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    if (elapsed < totalDurationMs) {
      window.requestAnimationFrame(step);
    } else {
      diveInProgress = false;
      window.location.href = targetUrl;
    }
  };

  window.requestAnimationFrame(step);
}

export function initNeuralDiveTriggers(): void {
  if (typeof document === 'undefined') return;
  const triggers = document.querySelectorAll<HTMLElement>('.portal-dive-trigger');
  triggers.forEach((el) => {
    if (el.getAttribute('data-dive-bound') === '1') return;
    el.setAttribute('data-dive-bound', '1');
    el.addEventListener('click', (evt) => {
      const target = el.getAttribute('data-portal-dive') || '/aethelgrad';
      if (window.location.pathname.replace(/\/+$/, '') === '/aethelgrad') {
        return;
      }
      evt.preventDefault();
      triggerNeuralDiveSequence(target);
    });
  });
}
