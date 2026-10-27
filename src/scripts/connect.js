/*!
 * connect.js: halaman /connect (migrasi Astro V7.0, Fase 4.8 + 5).
 * Copy email (Clipboard API + fallback jujur), redraw ikon sosial,
 * dan crosshair observatory pada closing.
 */
import { renderSocials } from './global.js';
import {
  DATA, doc, MOTION,
  el, qs, qsa, setText, showToast, fetchWithTimeout,
  buildHeading, buildTwoLineCardHeading, safeImage,
  scrollToTarget, setLenis, lenis, initEnv, SVG_NS, lenisTicker,
  isReducedMotion, motionRegistry, trackMotionListener, trackObserver,
  trackEventTween, trackAmbientTween, trackQuickTo,
  reducedMotion, finePointer, hasGSAP, hasScrollTrigger, hasLenis,
  pluginsRegistered, bootPage, cleanupMotionRegistry,
} from './core.js';

function initCopyEmail() {
  const cfg = DATA && DATA.contact;

  qsa('.copy-button').forEach((button) => {
    button.addEventListener('click', () => {
      const value = String(button.dataset.copy || '');
      if (!value) return;

      const finish = (copied) => {
        if (copied) {
          // Checkmark swap (5.6.2): the copy icon is replaced by a drawn
          // check for two seconds, then the original icon returns.
          const originalSvg = button.querySelector('svg');
          if (originalSvg && hasGSAP && !isReducedMotion()) {
            gsap.to(originalSvg, {
              scale: 0, duration: 0.15,
              onComplete: () => {
                originalSvg.style.display = 'none';
                const check = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
                check.setAttribute('viewBox', '0 0 24 24');
                check.setAttribute('class', 'copy-check');
                check.setAttribute('aria-hidden', 'true');
                check.setAttribute('focusable', 'false');
                const checkPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
                checkPath.setAttribute('d', 'M4 12l5 5L20 6');
                checkPath.setAttribute('fill', 'none');
                checkPath.setAttribute('stroke', 'currentColor');
                checkPath.setAttribute('stroke-width', '2');
                checkPath.setAttribute('stroke-linecap', 'round');
                checkPath.setAttribute('stroke-linejoin', 'round');
                check.appendChild(checkPath);
                const checkLength = 25;
                checkPath.style.strokeDasharray = checkLength;
                checkPath.style.strokeDashoffset = checkLength;
                button.insertBefore(check, originalSvg);
                gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.2, ease: MOTION.easeSnap });
                gsap.to(checkPath, { strokeDashoffset: 0, duration: 0.3, delay: 0.1, ease: MOTION.easeDraw });
                window.setTimeout(() => {
                  gsap.to(check, {
                    scale: 0, duration: 0.15,
                    onComplete: () => {
                      check.remove();
                      originalSvg.style.display = '';
                      gsap.set(originalSvg, { scale: 1 });
                    }
                  });
                }, 2000);
              }
            });
          } else if (originalSvg && isReducedMotion()) {
            // Reduced motion: instant swap, no animation.
            originalSvg.style.display = 'none';
            const check = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
            check.setAttribute('viewBox', '0 0 24 24');
            check.setAttribute('class', 'copy-check');
            check.setAttribute('aria-hidden', 'true');
            check.setAttribute('focusable', 'false');
            const checkPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
            checkPath.setAttribute('d', 'M4 12l5 5L20 6');
            checkPath.setAttribute('fill', 'none');
            checkPath.setAttribute('stroke', 'currentColor');
            checkPath.setAttribute('stroke-width', '2');
            checkPath.setAttribute('stroke-linecap', 'round');
            checkPath.setAttribute('stroke-linejoin', 'round');
            check.appendChild(checkPath);
            button.insertBefore(check, originalSvg);
            window.setTimeout(() => {
              check.remove();
              originalSvg.style.display = '';
            }, 2000);
          }

          button.classList.add('is-copied');
          const label = qs('.copy-button-label', button);
          if (label) {
            const original = label.textContent;
            label.textContent = 'Copied';
            window.setTimeout(() => { label.textContent = original; button.classList.remove('is-copied'); }, 2000);
          } else {
            window.setTimeout(() => button.classList.remove('is-copied'), 2000);
          }
          showToast(cfg && cfg.copyOk ? cfg.copyOk : 'Email address copied.');
        } else {
          // Fail shake (5.6.2): a short, honest refusal wiggle.
          if (hasGSAP && !isReducedMotion()) {
            gsap.fromTo(button,
              { x: 0 },
              { x: -2, duration: 0.05, ease: 'none', yoyo: true, repeat: 5,
                onComplete: () => gsap.set(button, { x: 0 }) }
            );
          }
          showToast(cfg && cfg.copyFail ? cfg.copyFail : 'Copy is not available here.');
        }
      };

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).then(
          () => finish(true),
          () => finish(legacyCopy(value))
        );
      } else {
        finish(legacyCopy(value));
      }
    });
  });

  function legacyCopy(text) {
    try {
      const area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      doc.body.appendChild(area);
      area.select();
      const ok = doc.execCommand('copy');
      area.remove();
      return ok === true;
    } catch (error) {
      return false;
    }
  }
}

/* V5 §3.1: exactly one Lenis instance, one stable ticker callback.
   lagSmoothing(0) lives in boot() BEFORE Lenis starts; registration of
   ScrollTrigger also happens there, once. `lenis` itself is declared
   once near scrollToTarget(). */

function initSocialIconRedraw() {
  if (!hasGSAP || isReducedMotion()) return;
  qsa('.social-card').forEach((card) => {
    const icon = card.querySelector('.social-icon svg');
    if (!icon) return;
    const paths = icon.querySelectorAll('path');
    paths.forEach((path) => {
      const length = path.getTotalLength ? path.getTotalLength() : 1000;
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = 0;
    });
    trackMotionListener(card, 'mouseenter', () => {
      paths.forEach((path) => {
        const length = path.getTotalLength ? path.getTotalLength() : 1000;
        trackEventTween(gsap.fromTo(path,
          { strokeDashoffset: length, fill: 'transparent', stroke: 'currentColor', strokeWidth: 1.5 },
          {
            strokeDashoffset: 0, fill: 'currentColor', stroke: 'currentColor',
            duration: 0.8, ease: MOTION.easeDraw,
            onComplete: () => {
              // Hand back to the stylesheet so the icon looks untouched.
              path.style.strokeDasharray = '';
              path.style.strokeDashoffset = '';
              path.style.stroke = '';
              path.style.fill = '';
              path.style.strokeWidth = '';
            }
          }
        ));
      });
    });
  });
}

/* CTA hover bounce (5.1.2): the arrow nudges once and the button lifts
   slightly, both via GSAP so no inline transform fight with CSS. */

function initClosingCrosshair() {
  const section = qs('#closing');
  const crosshair = qs('.ornament-closing-crosshair');
  if (!section || !crosshair || !hasScrollTrigger) return;
  gsap.fromTo(
    crosshair,
    { opacity: 0, scale: 1.2, transformOrigin: '50% 50%' },
    {
      opacity: 0.15,
      scale: 1,
      duration: 0.9,
      ease: MOTION.easeSoft,
      scrollTrigger: { trigger: section, start: 'top 80%', once: true }
    }
  );
}


/* --- Section 05: Off-screen pixel pet -------------------------------- */
/* 12 frames across 3 states (coding / music / badminton) on one paused
   timeline; played only while the section is on screen. */
/* V6.4 Fase 3: module-level hand-back so the matchMedia cleanup can
   reset the deck when the motion preference flips mid-animation. */

/* ======================================================================
 * BOOT HALAMAN CONNECT
 * ==================================================================== */
bootPage({
  renders: [renderSocials],
  interactions: [initCopyEmail],
  motion: [initSocialIconRedraw, initClosingCrosshair],
  cleanups: [],
});
