/*!
 * global/scroll.js: sitewide scroll runtime consumers (modularized
 * V11.1-M).
 *
 * Single responsibility: progress bar baca, fallback reveal tanpa GSAP,
 * smooth scroll (satu Lenis milik core scroll runtime), back-to-top,
 * dan visibility pause (deferred ScrollTrigger refresh). Tidak membuat
 * instance Lenis kedua.
 */
import gsap from 'gsap';
import {
  doc, qs, qsa, MOTION, lenis, lenisTicker, setLenis,
  reducedMotion, hasGSAP, hasLenis, hasScrollTrigger,
  isReducedMotion, trackMotionListener, trackObserver, trackEventTween,
} from '../core.js';

let progressTicking = false;
function updateProgress() {
  progressTicking = false;
  const bar = qs('#progress-bar');
  if (!bar) return;
  const scrollable = doc.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  bar.style.transform = 'scaleX(' + progress + ')';
}
function requestProgress() {
  if (!progressTicking) {
    progressTicking = true;
    window.requestAnimationFrame(updateProgress);
  }
}

/* V6.3 §2.5.1: initPageProgressBar (was initProgress) owns ONLY the
   reading-progress bar. The lenis.on('scroll') branch was removed:
   Lenis drives the native scroll position, so the window scroll
   listener below already catches every frame it produces. This runs
   outside matchMedia - the progress bar is content, not decoration.
   V6.4 §1.2.2: the globalTimeline pause/resume handler also lives
   here now (outside matchMedia) so a tab that is hidden exactly when
   the motion preference flips can never come back stuck on pause.
   V7.4: kedua listener dilacak (trackMotionListener) sehingga mereka
   tetap hidup melampaui revert matchMedia (intent V6.4 dipertahankan)
   tetapi tetap terlepas saat teardown navigasi ClientRouter. */
function initPageProgressBar() {
  const bar = qs('#progress-bar');
  if (bar) {
    bar.style.transformOrigin = '0 50%';
    bar.style.width = '100%';
    bar.style.transform = 'scaleX(0)';
  }
  trackMotionListener(window, 'scroll', requestProgress, { passive: true });
  updateProgress();

  if (hasGSAP) {
    trackMotionListener(doc, 'visibilitychange', () => {
      if (doc.hidden) {
        gsap.globalTimeline.pause();
      } else {
        gsap.globalTimeline.play();
      }
    });
  }
}

function fallbackReveal() {
  if (reducedMotion || hasGSAP || !('IntersectionObserver' in window)) return;
  const targets = qsa('.project-card, .software-chip, .skill-chip, .social-card, .contact-card, .journey-item, .about-lead, .about-body, .resume-card, .heading-aside, .credential-card, .credential-slot, .hobby-chip, .github-card, .deck-console, .companion-inner > *');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      observer.unobserve(node);
      const siblings = Array.from(node.parentElement ? node.parentElement.children : []);
      const index = Math.max(0, siblings.indexOf(node));
      node.animate(
        [
          { opacity: 0, transform: 'translateY(22px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 560, delay: Math.min(index, 5) * 60, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'backwards' }
      );
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
  trackObserver(observer); // V7.4: observer ikut teardown navigasi
  targets.forEach((node) => observer.observe(node));
}

function initSmoothScroll() {
  if (isReducedMotion() || !hasLenis || !hasGSAP || !hasScrollTrigger || lenis) return;
  setLenis(new window.Lenis({ duration: 1.05, smoothWheel: true }));
  lenis.on('scroll', () => window.ScrollTrigger.update());
  gsap.ticker.add(lenisTicker);
}

/* Back to top bounce (5.7.3): a small hop on hover, motion allowed only. */
function initBackTop() {
  const backTop = qs('.back-top');
  if (!backTop || !hasGSAP || isReducedMotion()) return;
  trackMotionListener(backTop, 'mouseenter', () => {
    if (!backTop.textContent.includes('↑')) return;
    trackEventTween(gsap.fromTo(backTop,
      { y: 0 },
      { y: -3, duration: 0.15, yoyo: true, repeat: 1, ease: MOTION.easeSnap }
    ));
  });
}

/* --- §4.2: Gallery Blueprint Archive ------------------------------------ */
/* Corner brackets around the grid area (markup stays light: four <i>
   elements styled by CSS). The blueprint grid itself is pure CSS on the
   section. Labels were synced in renderV4Sections. */

function initVisibilityPause() {
  if (!hasGSAP) return;

  /* V6.4 §1.2.3: the globalTimeline pause/resume handler moved to
     initPageProgressBar() (outside matchMedia) so a hidden tab can
     never keep the timeline paused across a preference transition.
     This function still owns the deferred full-load refresh for
     ScrollTrigger, registered exactly once per motion session. */

  if (hasScrollTrigger) {
    trackMotionListener(window, 'load', () => window.ScrollTrigger.refresh(), { once: true });
  }
}

/* Modularization exports (public API of this feature module). */
export {
  initPageProgressBar, fallbackReveal, initSmoothScroll,
  initBackTop, initVisibilityPause,
};
