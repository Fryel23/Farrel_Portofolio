/*!
 * core/magnetic-buttons.js: magnetic button effect (modularized
 * V11.1-M).
 *
 * Single responsibility: efek magnetik .magnetic-button via
 * gsap.quickTo (x+y, max 15px, elastic release). Reduced motion dan
 * non fine-pointer tidak pernah menjalankan efek. Semua listener
 * masuk trackMotionListener; setiap quickTo masuk trackQuickTo.
 */
import { hasGSAP, isReducedMotion, finePointer } from './environment.js';
import { qsa } from './dom.js';
import {
  trackMotionListener, trackQuickTo, trackEventTween, motionRegistry,
} from './motion-registry.js';

/* ======================================================================
 * V8.0 FASE 1: MAGNETIC BUTTONS
 * ======================================================================
 * Elemen .magnetic-button mengikuti kursor dengan gsap.quickTo (x + y),
 * pergerakan dibatasi 15px dari pusat, dan kembali ke (0,0) dengan
 * elastic ease saat kursor meninggalkan tombol.
 * Batasan: reduced motion dan perangkat non fine-pointer tidak pernah
 * menjalankan efek (Batasan 3 + 4). Semua listener masuk
 * trackMotionListener dan setiap quickTo masuk trackQuickTo sehingga
 * after-swap membersihkan semuanya (Batasan 2).
 * Catatan implementasi elastic: pasangan quickTo dibuang saat mouseleave
 * lalu dibuat ulang lazily pada mousemove berikutnya. Pola ini menghindari
 * konflik antara tween quickTo yang di-park dan tween elastic (keduanya
 * menarget x/y pada elemen yang sama) tanpa bergantung pada perilaku
 * internal gsap terhadap tween quickTo yang di-kill. */
export function initMagneticButtons() {
  if (!hasGSAP || isReducedMotion() || !finePointer) return;
  const g = window.gsap;
  const MAX_SHIFT = 15;   // px, sesuai spesifikasi
  const STRENGTH = 0.4;   // kursor 1px -> tombol bergeser 0.4px

  qsa('.magnetic-button').forEach((button) => {
    if (button.dataset.magneticBound === 'true') return;
    button.dataset.magneticBound = 'true';

    /* .button/.deck-button memakai CSS transition pada transform; transisi
       itu menambah interpolasi kedua di atas quickTo (pergerakan terasa
       delay). Properti transform dikeluarkan dari daftar transition inline,
       properti lain (background, color, border) tetap bertransisi. Durasi
       tiap properti pada tombol-tombol ini seragam (var(--micro)) sehingga
       penghapusan satu entri tidak menggeser pemetaan durasi. */
    const computed = window.getComputedStyle(button);
    if (computed.transitionProperty && computed.transitionProperty.indexOf('transform') !== -1) {
      const kept = computed.transitionProperty
        .split(',')
        .map((prop) => prop.trim())
        .filter((prop) => prop && prop !== 'transform');
      if (kept.length) button.style.transitionProperty = kept.join(', ');
      else button.style.transitionProperty = 'none';
    }

    let xTo = null;
    let yTo = null;
    let elastic = null;
    let baseRect = null; // rect tanpa offset magnetik, dipatok saat mouseenter

    const buildQuickTo = () => {
      xTo = trackQuickTo(g.quickTo(button, 'x', { duration: 0.35, ease: 'power3.out' }));
      yTo = trackQuickTo(g.quickTo(button, 'y', { duration: 0.35, ease: 'power3.out' }));
    };
    const releaseQuickTo = () => {
      [xTo, yTo].forEach((fn) => {
        if (fn && fn.tween) {
          try { fn.tween.kill(); } catch (error) { /* tween sudah mati */ }
          motionRegistry.eventTweens.delete(fn.tween);
        }
      });
      xTo = null;
      yTo = null;
    };

    trackMotionListener(button, 'mouseenter', () => {
      if (elastic) { try { elastic.kill(); } catch (error) { /* noop */ } elastic = null; }
      g.set(button, { x: 0, y: 0 });
      baseRect = button.getBoundingClientRect();
    });

    trackMotionListener(button, 'mousemove', (event) => {
      if (!baseRect) return; // mouseenter selalu mendahului mousemove
      if (elastic) { try { elastic.kill(); } catch (error) { /* noop */ } elastic = null; }
      if (!xTo || !yTo) buildQuickTo();
      const shiftX = g.utils.clamp(-MAX_SHIFT, MAX_SHIFT, (event.clientX - (baseRect.left + baseRect.width / 2)) * STRENGTH);
      const shiftY = g.utils.clamp(-MAX_SHIFT, MAX_SHIFT, (event.clientY - (baseRect.top + baseRect.height / 2)) * STRENGTH);
      xTo(shiftX);
      yTo(shiftY);
    });

    trackMotionListener(button, 'mouseleave', () => {
      baseRect = null;
      releaseQuickTo();
      elastic = trackEventTween(g.to(button, {
        x: 0, y: 0,
        duration: 0.9,
        ease: 'elastic.out(1, 0.45)',
        overwrite: 'auto',
        onComplete: () => { elastic = null; }
      }));
    });
  });
}
