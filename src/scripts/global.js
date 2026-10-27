/*!
 * global.js: lapisan sitewide (migrasi Astro V7.0, Fase 2 + Fase 5).
 * Lenis + GSAP + ScrollTrigger diimpor dari npm lalu didaftarkan ke
 * window agar seluruh logika V6.7 yang memakai window.gsap /
 * window.ScrollTrigger / window.Lenis tetap berjalan tanpa diubah.
 * Bertanggung jawab atas: identity sync, header (quick menu, now
 * playing), progress bar, anchor smooth scroll, opening experience
 * (sekali per sesi), dekorasi sitewide (ticks, spine, debris,
 * ornamen V6.5), smooth scroll, dan section motion generik.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './generative-ambient.js';
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

/* Fase 0/2: jembatan kompatibilitas untuk logika V6.7 yang membaca
   window.gsap / window.ScrollTrigger / window.Lenis. */
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.Lenis = Lenis;
initEnv();

export function renderContact() {
  if (!DATA || !DATA.contact) return;
  const contact = DATA.contact;
  setText('#contact-heading', contact.heading);
  const note = qs('.contact-note');
  if (note) note.textContent = contact.note || '';
  const pairs = [
    ['.contact-card--personal', contact.personal],
    ['.contact-card--university', contact.university]
  ];
  pairs.forEach(([selector, entry]) => {
    const card = qs(selector);
    if (!card || !entry) return;
    const address = qs('.contact-address', card);
    const label = qs('.contact-label', card);
    const button = qs('.copy-button', card);
    if (address) {
      address.href = 'mailto:' + entry.address;
      address.textContent = entry.address;
    }
    if (label) label.textContent = String(entry.label || 'EMAIL').toUpperCase();
    if (button) {
      button.dataset.copy = entry.address;
      button.setAttribute('aria-label', 'Copy ' + String(entry.label || 'email').toLowerCase() + ' address');
      const copyLabel = qs('.copy-button-label', button);
      if (copyLabel && contact.copyLabel) copyLabel.textContent = contact.copyLabel;
    }
  });
}

/* Proper brand marks (12.7): inline SVG paths replace the old
   text-as-icon labels. Only services actually linked are used.
   GitHub / Instagram / LinkedIn marks are well-known 24×24 brand paths;
   the archive card uses a simple original archive-box mark. */
export const SOCIAL_ICONS = {
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
  drive:
    'M3 3h18v5H3V3zm2 7h14v11H5V10zm5 2h4v2h-4v-2z'
};

export function socialIconNode(social) {
  const key = String(social.iconKey || '').toLowerCase();
  if (SOCIAL_ICONS[key]) {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', SOCIAL_ICONS[key]);
    svg.appendChild(path);
    return svg;
  }
  // Fallback for unknown keys: short text label (never a broken icon).
  return el('span', null, social.name.slice(0, 2));
}

export function renderSocials() {
  const host = qs('#social-grid');
  if (!host || !DATA) return;
  host.textContent = '';
  const items = DATA.social.items.filter((social) => /^https?:\/\//i.test(String(social.url || '')));
  items.forEach((social) => {
    const link = el('a', 'social-card');
    link.href = social.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', social.name + ': ' + (social.handle || 'profile'));

    const meta = el('div', 'social-meta');
    meta.appendChild(el('span', null, 'PROFILE / ' + String(social.name).toUpperCase()));
    meta.appendChild(el('span', null, '↗'));
    link.appendChild(meta);

    const iconBox = el('span', 'social-icon');
    iconBox.appendChild(socialIconNode(social));
    link.appendChild(iconBox);
    link.appendChild(el('h3', null, social.name));
    link.appendChild(el('p', null, social.handle || 'Social profile'));
    host.appendChild(link);
  });
  host.classList.toggle('social-grid--single', items.length < 2);
}

/* ======================================================================
 * 2. RENDER: identity & copy sync (source of truth: portfolio-data.js)
 * ==================================================================== */
export function renderIdentity() {
  if (!DATA) return;
  const hero = DATA.hero;

  // Keep the document title synchronized with the canonical value.
  if (DATA.meta.siteTitle) doc.title = DATA.meta.siteTitle;

  setText('#hero-eyebrow', hero.eyebrow);
  buildHeading(qs('#hero-title'), hero.headline, hero.headlineAccent, true);
  setText('#hero-tail', hero.headlineTail);
  setText('#hero-subtitle', hero.description);
  setText('#hero-note', hero.note);

  const cta = qs('#hero-cta');
  if (cta && hero.primaryCta) {
    cta.textContent = '';
    cta.appendChild(doc.createTextNode(hero.primaryCta.label + ' '));
    cta.appendChild(el('span', null, '↗')).setAttribute('aria-hidden', 'true');
    if (hero.primaryCta.href) cta.setAttribute('href', hero.primaryCta.href);
  }
  const gh = qs('#hero-docs');
  if (gh && DATA.links.docs) {
    gh.setAttribute('href', DATA.links.docs);
    gh.target = '_blank';
    gh.rel = 'noopener noreferrer';
  }

  const sticker = qs('.hero-sticker');
  if (sticker && hero.sticker) {
    sticker.textContent = '';
    sticker.appendChild(doc.createTextNode(hero.sticker.top));
    sticker.appendChild(doc.createElement('br'));
    sticker.appendChild(el('b', null, hero.sticker.bottom));
  }

  // Pixel profile card
  const card = hero.profileCard;
  if (card) {
    const topline = qs('.profile-topline');
    if (topline) {
      topline.textContent = '';
      topline.appendChild(el('span', null, card.topline));
      topline.appendChild(el('span', 'status-dot', '● ' + card.status));
    }
    setText('.profile-emblem', card.emblem);
    const meta = qs('.profile-meta');
    if (meta) {
      meta.textContent = '';
      meta.appendChild(el('strong', null, card.name));
      meta.appendChild(el('span', null, card.role));
      meta.appendChild(el('small', null, String(card.specialty).toUpperCase()));
    }
    const bottom = qs('.profile-bottom');
    if (bottom) {
      bottom.textContent = '';
      bottom.appendChild(el('span', null, card.bottom));
      const arrow = el('span', 'tiny-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      bottom.appendChild(arrow);
    }
  }

  qsa('.floating-tool').forEach((tool, index) => {
    if (hero.floatingTools && hero.floatingTools[index]) tool.textContent = hero.floatingTools[index];
  });
  setText('.visual-caption', hero.caption);

  // Data Atlas microcopy (illustrative only, from the single source)
  if (hero.dataAtlas) {
    const corner = qs('.atlas-corner');
    if (corner && hero.dataAtlas.cornerLabel) corner.textContent = hero.dataAtlas.cornerLabel;
    const axis = qs('.atlas-axis');
    if (axis && hero.dataAtlas.axisNote) axis.textContent = hero.dataAtlas.axisNote;
    const labels = qsa('.atlas-label-a, .atlas-label-b, .atlas-label-c');
    const observations = Array.isArray(hero.dataAtlas.observations) ? hero.dataAtlas.observations : [];
    labels.forEach((label, index) => {
      if (observations[index]) label.textContent = observations[index];
    });
  }

  // V5.2 §4.1: Archive Spine labels on the hero edge, from data.
  const decoHero = DATA.decorations && DATA.decorations.hero;
  if (decoHero) {
    setText('.hero-ruler-label', decoHero.edgeLabel);
    setText('.hero-ruler-label--bottom', decoHero.edgeLabelBottom);
  }

  // Gallery
  const gallery = DATA.gallery;
  const galleryHeading = qs('#gallery-heading');
  if (galleryHeading) buildHeading(galleryHeading, gallery.heading, gallery.headingAccentWord);
  setText('#gallery-aside', gallery.aside);
  setText('#empty-state', gallery.emptyMessage);
  const galleryKicker = qs('.gallery-section .section-kicker');
  if (galleryKicker) galleryKicker.textContent = gallery.kicker;
  const galleryLine = qs('.gallery-bottom-line');
  if (galleryLine) {
    const spans = qsa('span', galleryLine);
    if (spans[0]) spans[0].textContent = gallery.footerLeft;
    if (spans[1]) spans[1].textContent = gallery.footerRight;
  }

  // About
  const about = DATA.about;
  const aboutKicker = qs('.about-section .section-kicker');
  if (aboutKicker) aboutKicker.textContent = about.kicker;
  buildHeading(qs('#about-heading'), about.heading, about.headingAccentWord);
  setText('#about-lead', about.lead);
  setText('#about-body', about.body);
  const stamp = qs('.heading-stamp');
  if (stamp && about.stamp) {
    stamp.textContent = '';
    stamp.appendChild(doc.createTextNode(about.stamp.top));
    stamp.appendChild(doc.createElement('br'));
    stamp.appendChild(el('b', null, about.stamp.bold));
    const star = el('span', null, '✳');
    star.setAttribute('aria-hidden', 'true');
    stamp.appendChild(star);
  }
  const art = qs('#profile-image');
  if (art && about.artwork) {
    art.src = safeImage(about.artwork.image, 'assets/profile-card.svg');
    art.alt = about.artwork.alt || 'Personal file illustration';
  }
  const artworkLabel = qs('.artwork-label');
  if (artworkLabel && about.artwork && about.artwork.label) {
    artworkLabel.textContent = '';
    artworkLabel.appendChild(el('span', null, about.artwork.label.small));
    artworkLabel.appendChild(el('strong', null, about.artwork.label.strong));
    artworkLabel.appendChild(el('span', null, about.artwork.label.foot));
  }

  // Software + skills headings
  setText('.software-block .inline-heading h3', DATA.languagesTools.heading);
  setText('.software-block .mini-label', DATA.languagesTools.miniLabel);
  setText('.skills-block .inline-heading h3', DATA.skills.heading);
  setText('.skills-block .mini-label', DATA.skills.miniLabel);

  // Journey card
  buildTwoLineCardHeading(qs('.resume-card h3'), DATA.journey.heading);
  const journeyKicker = qs('.journey-grid .resume-card .resume-card-top span');
  if (journeyKicker) journeyKicker.textContent = '03 / LEARNING JOURNEY';

  // Education card
  const educationCard = qs('.resume-card-blue');
  if (educationCard) {
    buildTwoLineCardHeading(qs('h3', educationCard), DATA.education.heading);
    setText('#education-body', DATA.education.body, educationCard);
    const top = qs('.resume-card-top span', educationCard);
    if (top) top.textContent = DATA.education.kicker;
    // V6.6 Fase 7.1: coursework line under the education paragraph,
    // joined from the data file with the middle dot separator.
    const coursework = Array.isArray(DATA.education.coursework) ? DATA.education.coursework : [];
    const educationBody = qs('#education-body', educationCard);
    if (educationBody && coursework.length) {
      const courseworkLine = el('p', 'education-coursework', 'COURSEWORK / ' + coursework.join(' \u00B7 '));
      if (educationBody.nextSibling) {
        educationCard.insertBefore(courseworkLine, educationBody.nextSibling);
      } else {
        educationCard.appendChild(courseworkLine);
      }
    }
    const foot = qs('.resume-foot', educationCard);
    if (foot) foot.textContent = DATA.education.foot;
  }

  // Social
  const social = DATA.social;
  const socialKicker = qs('.social-section .section-kicker');
  if (socialKicker) socialKicker.textContent = social.kicker;
  buildHeading(qs('#social-heading'), social.heading, social.headingAccentWord);
  setText('#social-intro', social.intro);
  const socialFootnote = qs('.social-footnote');
  if (socialFootnote) {
    socialFootnote.textContent = '';
    socialFootnote.appendChild(doc.createTextNode(social.footnote + ' '));
    socialFootnote.appendChild(el('span', null, social.footnoteSub));
  }

  // Credentials
  const credentials = DATA.credentials;
  if (credentials) {
    const credKicker = qs('.credentials-section .section-kicker');
    if (credKicker) credKicker.textContent = credentials.kicker;
    buildHeading(qs('#credentials-heading'), credentials.heading, credentials.headingAccentWord);
    setText('#credentials-intro', credentials.intro);
  }

  // Contact block
  renderContact();

  // Closing
  const closing = DATA.closing;
  const closingTop = qs('.closing-top');
  if (closingTop && closing.top) {
    const spans = qsa('span', closingTop);
    if (spans[0]) spans[0].textContent = closing.top.left;
    if (spans[1]) {
      spans[1].textContent = '';
      String(closing.top.right).split('\n').forEach((part, index, arr) => {
        spans[1].appendChild(doc.createTextNode(part));
        if (index < arr.length - 1) spans[1].appendChild(doc.createElement('br'));
      });
    }
  }
  // Motto: presented once, as Farrel's own words (not a quotation).
  // The text lives inside #motto-text so the word-by-word reveal (5.7.2)
  // can target it without touching the label.
  const motto = qs('.closing-motto');
  if (motto && closing.motto) {
    motto.textContent = '';
    motto.appendChild(el('span', 'motto-label', closing.motto.label));
    const mottoText = el('span', 'motto-text', closing.motto.text);
    mottoText.id = 'motto-text';
    motto.appendChild(mottoText);
  }
  const closingName = qs('#closing-name');
  if (closingName) {
    closingName.textContent = '';
    const solid = el('span', 'closing-solid line-mask');
    solid.appendChild(el('span', 'line', closing.nameSolid));
    const outline = el('span', 'closing-outline line-mask');
    outline.appendChild(el('span', 'line', closing.nameOutline));
    // Solid layer revealed by scroll-linked clip-path (12.8).
    const fillSpan = el('span', 'closing-outline-fill line', closing.nameOutline);
    fillSpan.setAttribute('aria-hidden', 'true');
    outline.appendChild(fillSpan);
    closingName.appendChild(solid);
    closingName.appendChild(outline);
  }
  const closingNote = qs('.closing-bottom p');
  if (closingNote) closingNote.textContent = closing.note;
  setText('#year-now', DATA.meta.year);
  // V6.6: explicit class (span:last-child would now hit .closing-stamp).
  const copyright = qs('.closing-copyright');
  if (copyright) {
    copyright.textContent = '';
    copyright.appendChild(doc.createTextNode('© '));
    copyright.appendChild(el('span', null, DATA.meta.year));
    copyright.appendChild(doc.createTextNode(' · PERSONAL ARCHIVE'));
  }

  // Thin footer
  const siteFooter = qs('.site-footer');
  if (siteFooter) {
    const spans = qsa('span', siteFooter);
    if (spans[0]) spans[0].textContent = DATA.siteFooter.left;
    if (spans[1]) {
      spans[1].textContent = '';
      spans[1].appendChild(doc.createTextNode('HTML '));
      spans[1].appendChild(el('b', null, '+'));
      spans[1].appendChild(doc.createTextNode(' CSS '));
      spans[1].appendChild(el('b', null, '+'));
      spans[1].appendChild(doc.createTextNode(' JS'));
    }
    if (spans[2]) spans[2].textContent = DATA.siteFooter.right;
  }
}

/* V7.0: delegasi dokumen. Perilaku sama untuk link statis, dan link
   hasil render dinamis (hobi, SEE ALSO curiosity, kartu proyek) ikut
   ter-smooth-scroll karena render halaman berjalan setelah interaksi
   global. */
function initAnchors() {
  doc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const hash = anchor.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = qs(hash);
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target);
    closeQuickMenu();
  });
}

function closeQuickMenu() {
  const menu = qs('#quick-menu');
  const button = qs('#menu-dots');
  if (!menu || !button) return;
  menu.hidden = true;
  button.setAttribute('aria-expanded', 'false');
}

function initQuickMenu() {
  const button = qs('#menu-dots');
  const menu = qs('#quick-menu');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));
    // Open stagger (5.6.3): links slide in briefly. Reduced motion and
    // failure paths show the menu instantly.
    if (willOpen && hasGSAP && !isReducedMotion()) {
      gsap.fromTo(qsa('a', menu),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: MOTION.easeSoft }
      );
    }
  });
  doc.addEventListener('click', (event) => {
    if (!event.target.closest('#quick-menu') && !event.target.closest('#menu-dots')) closeQuickMenu();
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeQuickMenu();
      button.focus(); // focus never lost when closing via keyboard
    }
  });
  // Keyboard users: close when focus moves out of the open menu.
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (!menu.contains(next) && next !== button) closeQuickMenu();
  });
}

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
   This listener is intentionally NOT tracked: it must survive every
   matchMedia revert, and gsap.globalTimeline.play() is harmless while
   no tween exists (and correct under reduce, where nothing animates
   anyway because every reduced path avoids tweened motion). */
function initPageProgressBar() {
  const bar = qs('#progress-bar');
  if (bar) {
    bar.style.transformOrigin = '0 50%';
    bar.style.width = '100%';
    bar.style.transform = 'scaleX(0)';
  }
  window.addEventListener('scroll', requestProgress, { passive: true });
  updateProgress();

  if (hasGSAP) {
    doc.addEventListener('visibilitychange', () => {
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
  targets.forEach((node) => observer.observe(node));
}

/* --- V6.6 Fase 9: archive opening experience (Konsep A) ------------------ */
/* Once per session editorial cover, skippable via click/Escape/scroll/
   SKIP; reduced motion never reaches this path; no JS = no overlay.
   READY waits for BOTH the 1.2s floor and document.fonts.ready. */
const OPENING_SEEN_KEY = 'fip-opening-seen';

function shouldShowArchiveOpening() {
  if (!hasGSAP || isReducedMotion() || !qs('#archive-opening')) return false;
  try {
    return window.sessionStorage.getItem(OPENING_SEEN_KEY) !== '1';
  } catch (error) {
    return false; // storage unavailable: stay on the quiet path
  }
}

function initArchiveOpening(onComplete) {
  const overlay = qs('#archive-opening');
  if (!overlay) { if (onComplete) onComplete(); return; }

  // Mark the session FIRST so a refresh mid-animation never replays it.
  try { window.sessionStorage.setItem(OPENING_SEEN_KEY, '1'); } catch (error) { /* best effort */ }
  overlay.removeAttribute('aria-hidden'); // content is live while visible
  overlay.hidden = false;

  const topLabel = qs('.opening-label--top', overlay);
  const bottomLabel = qs('.opening-label--bottom', overlay);
  const line = qs('.opening-rule-line', overlay);
  const ticksHost = qs('.opening-rule-ticks', overlay);
  const ruleEnd = qs('.opening-rule-end', overlay);
  const ticks = [];
  if (ticksHost) {
    for (let i = 0; i < 13; i++) {
      const tick = el('span', 'opening-rule-tick');
      ticksHost.appendChild(tick);
      ticks.push(tick);
    }
  }

  gsap.set([topLabel, bottomLabel, ruleEnd], { opacity: 0 });
  gsap.set(ticks, { opacity: 0 });
  gsap.set(overlay, { clipPath: 'inset(0 0 0% 0)' });

  const cleanup = () => {
    doc.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll, true);
  };
  const done = () => {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    gsap.set(overlay, { clearProps: 'clipPath,transform' });
    cleanup();
    if (onComplete) onComplete();
  };
  const exitOverlay = (fast) => {
    if (overlay.dataset.closing === '1') return;
    overlay.dataset.closing = '1';
    gsap.to(overlay, {
      clipPath: 'inset(0 0 100% 0)', y: '-2%',
      duration: fast ? 0.3 : 0.7, ease: 'power3.inOut', onComplete: done
    });
  };
  const onKey = (event) => { if (event.key === 'Escape') exitOverlay(true); };
  const onScroll = () => { exitOverlay(true); };

  overlay.addEventListener('click', () => exitOverlay(true));
  doc.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });

  // Entrance (9.3 steps a to e).
  gsap.to(topLabel, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  gsap.to(line, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' });
  gsap.to(ticks, { opacity: 1, duration: 0.18, stagger: 0.05, ease: 'none', delay: 0.5 });
  gsap.to(bottomLabel, { opacity: 1, duration: 0.3, ease: 'power2.out', delay: 1.2 });

  // Step f: READY after 1.2s AND fonts ready; exit 0.3s later (7g).
  const minDelay = new Promise((resolve) => { window.setTimeout(resolve, 1200); });
  const fontsReady = (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function')
    ? doc.fonts.ready : Promise.resolve();
  Promise.all([minDelay, fontsReady]).then(() => {
    if (overlay.dataset.closing === '1') return;
    gsap.to(ruleEnd, {
      opacity: 1, duration: 0.2, ease: 'none',
      onComplete: () => { window.setTimeout(() => exitOverlay(false), 300); }
    });
  });
}

function initSmoothScroll() {
  if (isReducedMotion() || !hasLenis || !hasGSAP || !hasScrollTrigger || lenis) return;
  setLenis(new window.Lenis({ duration: 1.05, smoothWheel: true }));
  lenis.on('scroll', () => window.ScrollTrigger.update());
  gsap.ticker.add(lenisTicker);
}

/* Field notes (5.3.3): sticky notes rendered from about.notes. Rotation
   is applied inline only when motion is allowed; reduced motion keeps
   the notes straight and static. */
/* V6.3 §2.10 fix: the heading ticks are DOM (built once, guarded) and
   their reveal tween is created separately by initSectionMotion() so a
   reduce -> normal round trip restores the full ScrollTrigger set. */
function buildHeadingTicks() {
  qsa('.display-heading').forEach((heading, idx) => {
    if (heading.querySelector('.heading-ticks')) return;
    const ticks = el('div', 'heading-ticks');
    ticks.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) ticks.appendChild(el('span'));
    ticks.appendChild(el('span', 'tick-label', '[ ' + String(idx + 1).padStart(2, '0') + ' ]'));
    heading.style.position = 'relative';
    heading.appendChild(ticks);
  });
}


function initSectionMotion() {
  if (!hasScrollTrigger) return;
  /* V5 §3.1: registration happens once in boot() before anything runs;
     calling gsap.registerPlugin here again is unnecessary. */

  // Section display headings: masked line reveal (different rhythm from hero)
  qsa('.display-heading, .curiosity-heading').forEach((heading) => {
    const lines = qsa('.line', heading);
    if (!lines.length) return;
    gsap.set(lines, { yPercent: 115 });
    gsap.to(lines, {
      yPercent: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: heading, start: 'top 82%', once: true }
    });
  });

  /* Measurement ticks (4.2): small ruler marks beside every display
     heading, numbered like archive figures. Decorative (aria-hidden);
     created here so a failed script leaves clean markup.
     V6.3 §2.10 fix: the ticks DOM is built once by buildHeadingTicks()
     in the boot render phase; the reveal tweens are re-created on every
     no-preference entry so the ScrollTrigger population after a
     reduce -> normal round trip is identical to the first boot. */
  qsa('.display-heading').forEach((heading) => {
    const ticks = heading.querySelector('.heading-ticks');
    if (!ticks) return;
    gsap.fromTo(qsa('span:not(.tick-label)', ticks),
      { scaleX: 0, opacity: 0, transformOrigin: 'right center' },
      {
        scaleX: 1, opacity: 0.5, duration: 0.3, stagger: 0.05, ease: MOTION.easeSoft,
        scrollTrigger: { trigger: heading, start: 'top 82%', once: true }
      }
    );
  });

  // Personal motto (5.7.2): word-by-word fade tied to the closing section.
  const mottoText = qs('#motto-text');
  if (mottoText && !isReducedMotion()) {
    const words = mottoText.textContent.split(' ');
    mottoText.textContent = '';
    words.forEach((word, idx) => {
      const span = el('span', 'motto-word', word);
      mottoText.appendChild(span);
      if (idx < words.length - 1) mottoText.appendChild(doc.createTextNode(' '));
    });
    gsap.fromTo(qsa('.motto-word', mottoText),
      { opacity: 0 },
      {
        opacity: 1, duration: 0.2, stagger: 0.03, ease: 'none',
        scrollTrigger: { trigger: '.closing-motto', start: 'top 85%', once: true }
      }
    );
  }

  /* V5 §3.3: project card reveals run through ScrollTrigger.batch.
     setupProjectBatch lives at module scope because renderProjects()
     rebuilds the batch whenever the grid is re-rendered below the
     viewport. */

  // About copy: calm rhythm
  gsap.set(['.about-lead', '.about-body'], { opacity: 0, y: 26 });
  gsap.to(['.about-lead', '.about-body'], {
    opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: '.about-layout', start: 'top 78%', once: true }
  });

  // Chips: short stagger (transform cleared afterwards so the CSS hover
  // lift and the :active press (5.3.5) can take over)
  gsap.set('.software-chip', { opacity: 0, scale: 0.85 });
  gsap.to('.software-chip', {
    opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out',
    clearProps: 'transform',
    scrollTrigger: { trigger: '.software-block', start: 'top 85%', once: true }
  });
  gsap.set('.skill-chip', { opacity: 0, y: 14 });
  gsap.to('.skill-chip', {
    opacity: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out',
    clearProps: 'transform',
    scrollTrigger: { trigger: '.skills-block', start: 'top 85%', once: true }
  });

  // Journey + education: sequential, emphasis on titles
  gsap.set('.journey-item', { opacity: 0, x: -18 });
  gsap.to('.journey-item', {
    opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: 'power2.out',
    scrollTrigger: { trigger: '.journey-list', start: 'top 84%', once: true }
  });
  gsap.set('.resume-card', { opacity: 0, y: 40 });
  gsap.to('.resume-card', {
    opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: '.journey-grid', start: 'top 86%', once: true }
  });

  // Social cards: measured stagger
  gsap.set('.social-card', { opacity: 0, y: 30 });
  gsap.to('.social-card', {
    opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: '.social-grid', start: 'top 86%', once: true }
  });

  // Credentials: restrained entrance; reserved slots stay quiet
  gsap.set(['.credential-card', '.credential-slot'], { opacity: 0, y: 26 });
  gsap.to(['.credential-card', '.credential-slot'], {
    opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
    scrollTrigger: { trigger: '.credential-grid', start: 'top 86%', once: true }
  });

  // Contact block: modest entrance for the email cards
  gsap.set(['.contact-heading', '.contact-card', '.contact-note'], { opacity: 0, y: 22 });
  gsap.to(['.contact-heading', '.contact-card', '.contact-note'], {
    opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
    scrollTrigger: { trigger: '.contact-block', start: 'top 88%', once: true }
  });

  // Closing: oversized typography reveal
  const solid = qs('.closing-solid .line');
  const outline = qs('.closing-outline .line');
  if (solid) {
    gsap.set(solid, { yPercent: 110 });
    gsap.to(solid, {
      yPercent: 0, duration: 0.85, ease: 'power3.out',
      scrollTrigger: { trigger: '.closing-name', start: 'top 90%', once: true }
    });
  }
  if (outline) {
    gsap.set(outline, { opacity: 0, y: 24 });
    gsap.to(outline, {
      opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.closing-name', start: 'top 90%', once: true }
    });
  }

  /* Footer outline-to-solid fill (12.8): one scroll-linked clip-path
     sweep as the name enters. Reduced motion renders the final state
     via CSS instead. */
  const outlineFill = qs('.closing-outline-fill');
  if (outlineFill) {
    gsap.fromTo(outlineFill,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)', ease: 'none',
        scrollTrigger: { trigger: '.closing-name', start: 'top 92%', end: 'top 55%', scrub: 0.5 }
      }
    );
  }

  /* Curiosity Map (12.2): heading reveal + quiet node stagger. The
     transform is released afterwards so the CSS hover offset applies. */
  const curiosityNodes = qsa('.curiosity-node');
  if (curiosityNodes.length) {
    gsap.set(curiosityNodes, { opacity: 0, y: 16 });
    gsap.to(curiosityNodes, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: MOTION.easeSoft,
      clearProps: 'transform',
      scrollTrigger: { trigger: '.curiosity-map', start: 'top 82%', once: true }
    });
  }
  gsap.set(['.curiosity-panel', '.curiosity-intro'], { opacity: 0, y: 18 });
  gsap.to(['.curiosity-panel', '.curiosity-intro'], {
    opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: MOTION.easeSoft,
    scrollTrigger: { trigger: '.curiosity-map', start: 'top 78%', once: true }
  });

  /* Learning Journey rail (12.5): called from boot() so its
     IntersectionObserver fallback also works without GSAP. */

  /* V5 §3.2: decorative geometry no longer runs a permanent scrub.
     Each shape drifts once into place when its section enters the
     viewport (once: true). Scrub is reserved for the journey rail and
     the closing outline fill, which are designed to follow scroll. */
  if (window.matchMedia('(min-width: 701px)').matches) {
    const drifts = [
      ['.geo-two', 22], ['.geo-three', -16],
      ['.geo-four', -18], ['.geo-five', 20],
      ['.geo-six', -14], ['.geo-seven', 16]
    ];
    drifts.forEach(([selector, distance]) => {
      const node = qs(selector);
      if (!node) return;
      const section = node.closest('section');
      if (!section) return;
      gsap.fromTo(node,
        { y: Math.round(distance / 2) },
        {
          y: distance, duration: 1.1, ease: MOTION.easeSoft,
          scrollTrigger: { trigger: section, start: 'top 88%', once: true }
        }
      );
    });
  }

  /* V5 §3.2: the deferred full-load refresh is owned by
     initVisibilityPause() inside the matchMedia handler so it is
     registered exactly once per motion session. */
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


const DECORATION_DEBRIS = {
  hero: ['diamond', 'diamond', 'diamond', 'diamond', 'diamond'],
  work: ['tag', 'tag', 'tag', 'folder'],
  games: ['button', 'button', 'stick', 'dpad'],
  about: ['note', 'note', 'paper'],
  offscreen: ['note', 'shuttle', 'note'],
  github: ['node', 'node', 'branch'],
  credentials: ['seal', 'seal', 'ribbon'],
  companion: ['footprint', 'footprint', 'bone'],
  profiles: ['envelope', 'envelope']
};

/* Rect-only 16x16 debris shapes, --px-* fills only, 5 rects max. */
const DEBRIS_SHAPES = {
  diamond: [
    [7, 2, 2, 2, 'var(--px-blue)'],
    [5, 4, 6, 2, 'var(--px-blue)'],
    [3, 6, 10, 2, 'var(--px-blue)'],
    [5, 8, 6, 2, 'var(--px-blue)'],
    [7, 10, 2, 2, 'var(--px-blue)']
  ],
  tag: [
    [3, 3, 8, 6, 'var(--px-slate)'],
    [4, 4, 2, 2, 'var(--px-gold)'],
    [11, 5, 2, 1, 'var(--px-wood)']
  ],
  folder: [
    [2, 3, 5, 2, 'var(--px-wood-dark)'],
    [2, 4, 12, 8, 'var(--px-wood)'],
    [3, 6, 6, 1, 'var(--px-wood-dark)']
  ],
  button: [
    [4, 4, 8, 8, 'var(--px-pink)'],
    [5, 5, 3, 2, 'var(--px-ivory)']
  ],
  stick: [
    [7, 2, 2, 6, 'var(--px-steel)'],
    [4, 8, 8, 3, 'var(--px-black)']
  ],
  dpad: [
    [6, 3, 4, 10, 'var(--px-slate)'],
    [3, 6, 10, 4, 'var(--px-slate)']
  ],
  note: [
    [6, 2, 2, 8, 'var(--px-navy)'],
    [4, 9, 4, 3, 'var(--px-navy)'],
    [8, 2, 3, 2, 'var(--px-navy)']
  ],
  paper: [
    [3, 2, 10, 12, 'var(--px-ivory)'],
    [4, 4, 8, 1, 'var(--px-steel)'],
    [4, 6, 8, 1, 'var(--px-steel)'],
    [4, 8, 6, 1, 'var(--px-steel)']
  ],
  shuttle: [
    [7, 2, 2, 6, 'var(--px-ivory)'],
    [5, 8, 6, 3, 'var(--px-ivory)'],
    [6, 11, 4, 1, 'var(--px-gold)']
  ],
  node: [
    [6, 6, 4, 4, 'var(--px-blue)'],
    [7, 1, 2, 2, 'var(--px-blue)'],
    [1, 7, 2, 2, 'var(--px-blue)'],
    [13, 7, 2, 2, 'var(--px-blue)'],
    [7, 12, 2, 2, 'var(--px-blue)']
  ],
  branch: [
    [7, 2, 2, 12, 'var(--px-wood)'],
    [3, 6, 2, 2, 'var(--px-python-blue)'],
    [11, 4, 2, 2, 'var(--px-python-blue)']
  ],
  seal: [
    [4, 4, 8, 8, 'var(--px-gold)'],
    [3, 6, 10, 4, 'var(--px-gold)'],
    [5, 6, 6, 4, 'var(--px-navy)']
  ],
  ribbon: [
    [4, 2, 8, 7, 'var(--px-pink)'],
    [5, 9, 2, 5, 'var(--px-pink)'],
    [9, 9, 2, 5, 'var(--px-pink)'],
    [7, 4, 2, 3, 'var(--px-gold)']
  ],
  footprint: [
    [4, 3, 3, 6, 'var(--px-wood-dark)'],
    [4, 9, 3, 2, 'var(--px-wood-dark)'],
    [9, 7, 3, 6, 'var(--px-wood-dark)']
  ],
  bone: [
    [3, 6, 10, 3, 'var(--px-ivory)'],
    [2, 5, 3, 2, 'var(--px-ivory)'],
    [11, 8, 3, 2, 'var(--px-ivory)']
  ],
  envelope: [
    [2, 4, 12, 9, 'var(--px-slate)'],
    [2, 4, 12, 4, 'var(--px-steel)'],
    [7, 7, 2, 2, 'var(--px-gold)']
  ]
};

/* Section id -> element selector (the hero section has no id). */
const DEBRIS_SELECTORS = {
  hero: '.hero',
  work: '#work',
  games: '#games',
  about: '#about',
  offscreen: '#offscreen',
  github: '#github',
  credentials: '#credentials',
  companion: '#companion',
  profiles: '#profiles'
};

function buildAmbientDebris(sectionId, container) {
  if (!container || qs('.ambient-debris', container)) return;
  const kinds = DECORATION_DEBRIS[sectionId];
  if (!Array.isArray(kinds) || !kinds.length) return;

  const field = el('div', 'ambient-debris');
  field.setAttribute('aria-hidden', 'true');
  const total = kinds.length;
  const leftShare = Math.max(1, Math.ceil(total * 0.6));

  kinds.forEach((kind, index) => {
    const layers = DEBRIS_SHAPES[kind];
    if (!layers) return;
    const item = el('span', 'ambient-debris-item');
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('focusable', 'false');
    layers.forEach((layer) => {
      const rect = doc.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(layer[0]));
      rect.setAttribute('y', String(layer[1]));
      rect.setAttribute('width', String(layer[2]));
      rect.setAttribute('height', String(layer[3]));
      rect.setAttribute('fill', layer[4]);
      svg.appendChild(rect);
    });
    item.appendChild(svg);

    /* Vertical spread: items 0 and 1 always above 30%; items after
       that walk down; at most 3 land below 70% (tops 76/84/90). */
    let top;
    if (index === 0) top = 10;
    else if (index === 1) top = 22;
    else top = Math.min(90, 36 + (index - 2) * 16);
    top += (index % 2 === 0 ? -2 : 2); // deterministic jitter
    /* Horizontal: 60% of the items hug the left margin, 40% the right. */
    const leftSide = index < leftShare;
    if (leftSide) item.style.left = (2 + (index % 3) * 2) + '%';
    else item.style.right = (2 + (index % 2) * 3) + '%';
    item.style.top = top + '%';
    field.appendChild(item);
  });

  container.appendChild(field);
}

/* DOM-only builder, called once from boot() before any motion starts. */
function buildAllAmbientDebris() {
  Object.keys(DECORATION_DEBRIS).forEach((sectionId) => {
    buildAmbientDebris(sectionId, qs(DEBRIS_SELECTORS[sectionId]));
  });
}

/* ======================================================================
 * V6.5 §3.2 + §4: SCIENTIFIC ARCHIVE ORNAMENTS (SVG, generative)
 * ==================================================================== */
/* Helper (V6.5 §3.2): wraps a hardcoded developer-authored SVG string
   in the standard .ornament contract (aria-hidden, pointer-events none,
   z-index layering). innerHTML is used ONLY for the constants below;
   user data never reaches this function. */
function createSvgOrnament(className, viewBox, innerSvgString) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'ornament ' + className;
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML =
    '<svg viewBox="' + viewBox + '" focusable="false">' + innerSvgString + '</svg>';
  return wrapper;
}

/* Inner SVG bodies for the three V6.5 SVG ornaments (verbatim from the
   V6.5 spec, Fase 4.1 / 4.3 / 4.6). */
const V65_RADAR_INNER =
  '<circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<line class="radar-beam" x1="100" y1="100" x2="100" y2="10" stroke="currentColor" stroke-width="1.5"/>';
const V65_CRYPTO_RINGS_INNER =
  '<circle class="ring-outer" cx="200" cy="200" r="180" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 8"/>' +
  '<circle class="ring-inner" cx="200" cy="200" r="120" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 6"/>';
const V65_CROSSHAIR_INNER =
  '<line x1="400" y1="0" x2="400" y2="400" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<line x1="0" y1="200" x2="800" y2="200" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="400" cy="200" r="180" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>' +
  '<circle cx="400" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="8 16" opacity="0.3"/>';

/* DOM-only builder (Fase 4): mounts the three SVG ornaments. The
   canvases for 4.2/4.4/4.5 are static markup in index.html and are
   owned by generative-ambient.js; these three are injected here so the
   markup stays declarative and every ornament shares one helper. */
function buildV65Ornaments() {
  /* 4.1 Curiosity Map: sonar/radar sweep inside the field-notes panel,
     rendered behind the panel content (z-index -1 + panel isolation). */
  const panel = qs('#curiosity-panel');
  if (panel && !qs('.ornament-radar-sweep', panel)) {
    panel.insertBefore(
      createSvgOrnament('ornament-radar-sweep', '0 0 200 200', V65_RADAR_INNER),
      panel.firstChild
    );
  }
  /* 4.3 Credentials: two counter-rotating dashed rings behind the
     credential grid, mounted at section level so they sit below
     .credentials-inner entirely. */
  const credentials = qs('#credentials');
  if (credentials && !qs('.ornament-crypto-rings', credentials)) {
    credentials.insertBefore(
      createSvgOrnament('ornament-crypto-rings', '0 0 400 400', V65_CRYPTO_RINGS_INNER),
      credentials.firstChild
    );
  }
  /* 4.6 Closing: observatory crosshair behind the closing name. */
  const closing = qs('#closing');
  if (closing && !qs('.ornament-closing-crosshair', closing)) {
    closing.insertBefore(
      createSvgOrnament('ornament-closing-crosshair', '0 0 800 400', V65_CROSSHAIR_INNER),
      closing.firstChild
    );
  }
}

/* V6.5 §4.6 motion half: the crosshair scales 1.2 -> 1.0 and fades
   0 -> 0.15 the first time #closing enters the viewport. Created ONLY
   inside the matchMedia no-preference context, so a mid-session flip
   to reduced motion reverts it to the CSS final state (opacity 0.15,
   scale 1) immediately. Without GSAP the CSS default already shows the
   final state, honestly static. */

function initNowPlaying() {
  const link = qs('#now-playing');
  const cfg = DATA && DATA.offscreen && DATA.offscreen.spotify;
  if (!link || !cfg || !cfg.nowPlayingEndpoint) return;

  const img = qs('#now-playing-img', link);
  const text = qs('#now-playing-text', link);
  const quickRow = qs('#quick-now-playing');
  const pollMs = cfg.nowPlayingPollMs || 30000;

  if (img) img.addEventListener('error', function () { this.hidden = true; }, { once: true });

  function hide() {
    link.hidden = true;
    link.classList.remove('is-playing', 'is-recent');
    if (quickRow) quickRow.hidden = true;
  }

  function render(data) {
    if (!data || typeof data !== 'object') return hide();
    const title = String(data.title || '').trim();
    const artist = String(data.artist || '').trim();
    if (!title && !artist) return hide();

    const playing = data.isPlaying === true;
    const url = String(data.songUrl || '').trim();
    if (img) {
      const art = String(data.albumImageUrl || '').trim();
      if (art) {
        img.src = art;
        img.hidden = false;
      } else {
        img.hidden = true;
      }
    }
    if (text) text.textContent = (playing ? '' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
    link.classList.toggle('is-playing', playing);
    link.classList.toggle('is-recent', !playing);
    link.hidden = false;
    link.setAttribute('aria-label', (playing ? 'Now playing: ' : 'Recently played: ') + title + (artist ? ' by ' + artist : ''));
    if (/^https?:\/\//i.test(url)) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    if (quickRow) {
      quickRow.textContent = (playing ? 'NOW PLAYING · ' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
      quickRow.hidden = false;
    }
  }

  async function poll() {
    if (doc.hidden) return;
    try {
      // V5 §3.6: timeout + abort handled inside fetchWithTimeout; an
      // endpoint that never answers now resolves to the honest hidden
      // state instead of hanging forever.
      render(await fetchWithTimeout(cfg.nowPlayingEndpoint));
    } catch (error) {
      hide();
    }
  }

  /* V6.3 §1.4: one interval id, started only while visible and stopped
     the moment the tab hides. The guard inside poll() stays as a safety
     net for a page that boots while already hidden. */
  let pollIntervalId = null;

  function startPolling() {
    if (pollIntervalId !== null) return;
    if (doc.hidden) return;
    pollIntervalId = window.setInterval(poll, pollMs);
  }

  function stopPolling() {
    if (pollIntervalId !== null) {
      window.clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) {
      stopPolling();
    } else {
      poll(); // one honest refresh on return, then resume the cadence
      startPolling();
    }
  });
  poll();
  startPolling();
}

/* --- Section 06: GitHub Activity (V4 §7) ------------------------------- */
/* Live REST data with a one hour localStorage cache. No streaks, no
   commit totals: only metrics the REST API can honestly provide. */

function buildArchiveSpines() {
  const spineConfig = DATA && DATA.decorations && DATA.decorations.spine;
  if (!spineConfig) return;
  Object.keys(spineConfig).forEach((key) => {
    const section = key === 'hero' ? qs('.hero') : qs('#' + key);
    const label = spineConfig[key];
    if (!section || !label || section.querySelector('.archive-spine')) return;

    const spine = el('div', 'archive-spine');
    spine.setAttribute('aria-hidden', 'true');
    const ticks = el('span', 'archive-spine__ticks');
    for (let i = 0; i < 7; i++) ticks.appendChild(el('i'));
    spine.appendChild(ticks);
    spine.appendChild(el('span', 'archive-spine__label', label));
    section.appendChild(spine);
  });
}

function initArchiveSpine() {
  if (!hasGSAP || !hasScrollTrigger) return;
  qsa('.archive-spine').forEach((spine) => {
    const section = spine.closest('section') || spine.parentElement;
    if (!section) return;
    gsap.fromTo(spine,
      { opacity: 0, x: -8 },
      {
        opacity: 1, x: 0, duration: 0.7, ease: MOTION.easeSoft,
        scrollTrigger: { trigger: section, start: 'top 88%', once: true },
        clearProps: 'transform'
      }
    );
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


/* ======================================================================
 * BOOT GLOBAL (semua halaman)
 * ==================================================================== */
/* V7.0: gerbang hero lintas modul. Opening experience dimiliki
   global.js; halaman (home) menunggu event 'fip:start-hero' bila
   opening tampil, sehingga hero tidak berjalan di balik overlay. */
window.__FIP_OPENING_ACTIVE = false;

function startHeroGateGlobal() {
  if (window.__FIP_OPENING_ACTIVE) {
    window.addEventListener('fip:start-hero', () => initSectionMotion(), { once: true });
  } else {
    initSectionMotion();
  }
}

bootPage({
  renders: [renderIdentity, buildHeadingTicks, buildArchiveSpines, buildAllAmbientDebris, buildV65Ornaments],
  interactions: [initQuickMenu, initAnchors, initNowPlaying, initPageProgressBar, fallbackReveal],
  motion: [
    initSmoothScroll,
    startHeroGateGlobal,
    initArchiveSpine,
    initBackTop,
    initVisibilityPause,
    () => {
      const start = () => {
        window.__FIP_OPENING_ACTIVE = false;
        window.dispatchEvent(new CustomEvent('fip:start-hero'));
      };
      if (shouldShowArchiveOpening()) {
        window.__FIP_OPENING_ACTIVE = true;
        initArchiveOpening(start);
      } else {
        start();
      }
    },
  ],
  cleanups: [],
});
