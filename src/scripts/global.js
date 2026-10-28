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
/* V9.0 FASE 3.2: kontrak callback hero. initArchiveOpening menerima
   dua fungsi ini dari home.js (modul hero). home.js tidak pernah
   mengimpor global.js sehingga arah dependensi tetap satu arah tanpa
   siklus. Konsekuensi yang disadari: home.js kini dieksekusi di semua
   halaman; seluruh entri boot-nya ber-guard terhadap ketiadaan elemen
   hero (lihat initHeroButtons di home.js). */
import { prepareHeroState, animateHeroIn } from './home.js';
import {
  DATA, doc, MOTION,
  el, qs, qsa, setText, showToast, fetchWithTimeout,
  buildHeading, buildTwoLineCardHeading, safeImage,
  scrollToTarget, setLenis, lenis, initEnv, SVG_NS, lenisTicker,
  isReducedMotion, motionRegistry, trackMotionListener, trackObserver,
  trackEventTween, trackAmbientTween, trackQuickTo,
  reducedMotion, finePointer, hasGSAP, hasScrollTrigger, hasLenis,
  pluginsRegistered, bootPage, cleanupMotionRegistry,
  initMagneticButtons, isAudioMuted, setAudioMuted, playClickSound, playHoverSound,
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

  /* V8.1 Fase 1: override doc.title dihapus. BaseLayout.astro menerima
     prop title dan merendernya di <head> untuk setiap halaman, sehingga
     judul tab kini unik per halaman tanpa ditimpa JS global. */

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
   global. V7.4: listener level dokumen dilacak (trackMotionListener)
   supaya teardown navigasi ClientRouter melepasnya, tidak menumpuk
   setiap kali boot berjalan lagi di halaman berikutnya. */
function initAnchors() {
  trackMotionListener(doc, 'click', (event) => {
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
  /* V7.4: listener level dokumen dilacak agar terlepas saat teardown
     navigasi (tidak menumpuk antar boot). */
  trackMotionListener(doc, 'click', (event) => {
    if (!event.target.closest('#quick-menu') && !event.target.closest('#menu-dots')) closeQuickMenu();
  });
  trackMotionListener(doc, 'keydown', (event) => {
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

/* V7.3 Fase 2: laci navigasi mobile (hamburger). Membuka/menutup drawer,
   mengunci scroll latar belakang selagi terbuka, menutup otomatis saat
   salah satu tautan diklik, dan menutup via Escape dengan mengembalikan
   fokus ke tombol hamburger (fokus tidak pernah hilang). Vanilla JS
   murni tanpa library baru, sesuai Batasan Absolut V7.3. */
function initMobileMenu() {
  const toggle = qs('#mobile-menu-toggle');
  const drawer = qs('#mobile-menu-drawer');
  const closeButton = qs('#mobile-menu-close');
  if (!toggle || !drawer) return;

  const toggleMenu = () => {
    const isHidden = drawer.hidden;
    drawer.hidden = !isHidden;
    toggle.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) {
      document.body.style.overflow = 'hidden'; // Mencegah scroll latar belakang
    } else {
      document.body.style.overflow = '';
    }
  };

  toggle.addEventListener('click', toggleMenu);
  if (closeButton) closeButton.addEventListener('click', toggleMenu);

  // Tutup menu jika tautan diklik
  qsa('a', drawer).forEach((link) => {
    link.addEventListener('click', () => {
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Tutup menu dengan tombol Escape. V7.4: dilacak untuk teardown.
  trackMotionListener(doc, 'keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) {
      toggleMenu();
      toggle.focus();
    }
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

/* --- V9.1 FASE 3: ENHANCED ARCHIVE BOOT SEQUENCE ------------------------ */
/* Overlay pembuka sinematik berbasis <dialog> native. V9.1 meningkatkan
   ritual V9.0 (yang terlalu cepat) menjadi pengalaman ~4.5s dengan
   komposisi 4 lapis + choreography GSAP beat-by-beat:
   - Zero-FOUC: inline script di <head> sudah menandai html.opening-armed
     sebelum first paint; guard ini dilepas tepat setelah showModal().
   - Timer tunggal: satu variabel timeoutId; setiap penjadwalan ulang
     wajib clearTimeout dulu (Batasan 5 V9.0).
   - Exactly-once asset settlement: Set `settled` + pasangan load/error
     saling melepas listenernya (Batasan 3 V9.0) - tetap dipertahankan,
     kini bertugas mendeteksi KEGAGALAN aset (exit cepat) karena progress
     visual sudah dimiliki counter choreography (bukan progres nyata,
     sejalan dengan prinsip ticker dekoratif V9.1).
   - PERUBAHAN V9.1: exit TIDAK lagi dipicu "semua aset selesai". Waktu
     exit tunggal = timeout utama 3500ms (Batasan 2 V9.1) supaya
     choreography selalu utuh (halaman depan memang tanpa img kritis;
     perilaku lama akan memotong ritual di <1s). Aset gagal tetap
     fast-fail ke CONTINUING... (Skenario 9), aset lambat tetap ditutup
     timeout 3.5s dengan CONTINUING... (Skenario 8).
   - Kontrak callback hero: prepareHeroState setelah showModal(),
     animateHeroIn di REVEAL_AT; kedua callback pasti dipanggil tepat
     satu kali di semua jalur (Batasan 6 V9.0).
   - Lifecycle (Batasan 8 V9.1): choreography + counter + pulse lewat
     trackEventTween, ticker interval di motionRegistry.intervals,
     quickTo debu kursor lewat trackQuickTo, listener lewat
     trackMotionListener; exitSequence membersihkan semuanya idempoten. */
const OPENING_SEEN_KEY = 'fip-opening-seen';

export function initArchiveOpening(prepareHero, animateHero) {
  /* Kontrak Batasan 6: SELURUH jalur (bypass maupun normal) memanggil
     callback yang diterima - bukan impor langsung - supaya pemanggil
     (gate boot di bawah) bisa membungkus animateHeroIn dengan
     initSectionMotion dan tetap berjalan di semua jalur. */
  const dialog = qs('#archive-opening');
  const skipBtn = qs('#opening-skip');
  const counter = qs('#opening-counter');
  const ringFill = qs('#opening-ring-fill');
  const status = qs('#opening-status');

  /* --- BYPASS PATHS --- */
  /* 1. Elemen hilang (markup tanpa dialog / halaman tanpa overlay):
        hero jalan langsung, dan guard FOUC wajib dilepas supaya halaman
        tidak menggantung tersembunyi sampai safety timeout 4s. */
  if (!dialog || !skipBtn) {
    document.documentElement.classList.remove('opening-armed');
    prepareHero();
    animateHero();
    return;
  }
  /* 2. Reduced motion (jaring pengaman; jalur boot motion context
        no-preference sudah menyaring sebelumnya). */
  if (isReducedMotion()) {
    document.documentElement.classList.remove('opening-armed');
    prepareHero();
    animateHero();
    return;
  }
  /* 3. Sesi sudah pernah melihat opening: inline script tidak menambah
        class opening-armed, jadi cukup animasi hero biasa. */
  if (!document.documentElement.classList.contains('opening-armed')) {
    prepareHero();
    animateHero();
    return;
  }

  /* --- NORMAL PATH --- */
  /* Safety timeout inline script tidak dibutuhkan lagi. */
  if (window.__openingSafety) {
    clearTimeout(window.__openingSafety);
    delete window.__openingSafety;
  }

  /* Tandai sesi TERLEBIH DAHULU: refresh di tengah animasi tidak
     pernah me-replay opening (Skenario 4). */
  try { window.sessionStorage.setItem(OPENING_SEEN_KEY, '1'); } catch (error) { /* best effort */ }

  dialog.showModal();
  /* Tombol lahir disabled (anti klik tidak sengaja, Batasan 2 V9.1);
     focus() menjadi no-op dan fokus jatuh ke dialog itu sendiri sampai
     choreography mengaktifkan tombol di 1.5s. */
  skipBtn.focus({ preventScroll: true });

  /* Hero disiapkan (tersembunyi, siap animasi) TAPI belum dianimasikan;
     animasi dipicu di REVEAL_AT di tengah wipe. */
  prepareHero();

  /* Sekarang aman membuka guard FOUC: dialog sudah menutupi layar. */
  document.documentElement.classList.remove('opening-armed');

  /* --- STATE (timer tunggal, Batasan 5) + KONSTANTA V9.1 --- */
  let isExiting = false;
  let heroAnimated = false;
  let timeoutId = null;
  /* Batasan 2 V9.1: total ~4.5s = 3.5s choreography + 1.0s wipe exit. */
  const TOTAL_TIMEOUT_MS = 3500;
  const EXIT_DURATION_MS = 1000;
  const REVEAL_AT_SEC = 0.65; // hero mulai muncul di pertengahan wipe

  const clearMainTimer = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      if (motionRegistry.timers) motionRegistry.timers.delete(timeoutId);
      timeoutId = null;
    }
  };

  const animateHeroOnce = () => {
    if (heroAnimated) return;
    heroAnimated = true;
    animateHero();
  };

  /* --- LAYER 4: METADATA TICKER (dekoratif, teks statis) --- */
  const tickerLines = [
    '> LOADING FIELD NOTES / 001',
    '> MOUNTING DATA ATLAS / 002',
    '> INDEXING ARCHIVE / 003',
    '> CALIBRATING SENSORS / 004'
  ];
  let tickerIndex = 0;
  let tickerIntervalId = null;

  const startTicker = () => {
    tickerIntervalId = window.setInterval(() => {
      tickerIndex = (tickerIndex + 1) % tickerLines.length;
      const line = qs('#opening-ticker-line');
      if (!line) return;
      /* Tween pergantian dibuat asinkron dari callback interval,
         jadi didaftarkan lewat trackEventTween (Batasan 8). */
      trackEventTween(gsap.fromTo(line,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }));
      line.textContent = tickerLines[tickerIndex];
    }, 500);
    if (motionRegistry.intervals) motionRegistry.intervals.add(tickerIntervalId);
  };

  const stopTicker = () => {
    if (tickerIntervalId) {
      window.clearInterval(tickerIntervalId);
      if (motionRegistry.intervals) motionRegistry.intervals.delete(tickerIntervalId);
      tickerIntervalId = null;
    }
  };

  /* --- CHOREOGRAPHY TIMELINE (Batasan 4 V9.1, beat-by-beat) --- */
  /* Semua layer dianimasikan dalam SATU timeline terlacak; exitSequence
     meng-kill-nya dan men-snap visual ke keadaan akhir. */
  const choreography = trackEventTween(gsap.timeline());

  /* Posisi clip HARUS eksplisit inline: CSS produksi meminimasi
     circle(150% at 50% 50%) menjadi circle(150%) (posisi default
     dilepas minifier), dan GSAP membaca computed style - tanpa inline
     set, interpolasi exit salah membaca posisi awal 0% sehingga iris
     menyusut ke pojok kiri atas, bukan ke pusat. */
  gsap.set('.opening-clip', { clipPath: 'circle(150% at 50% 50%)' });

  choreography
    /* Layer 1: Ambient (grain + vignette) */
    .to('.opening-grain', { opacity: 0.04, duration: 0.5, ease: 'none' }, 0)
    .to('.opening-vignette', { opacity: 1, duration: 0.5, ease: 'none' }, 0)

    /* Layer 2: bracket stagger 0.1s + garis ukur menggambar diri 0.2s
       + label sudut 0.4/0.6s */
    .to('.opening-bracket', { opacity: 1, duration: 0.3, stagger: 0.1, ease: 'power2.out' }, 0)
    .to('.opening-ruler--v', { scaleY: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut', transformOrigin: 'top' }, 0.2)
    .to('.opening-ruler--h', { scaleX: 1, opacity: 0.4, duration: 0.6, ease: 'power2.inOut', transformOrigin: 'left' }, 0.2)
    .to('.opening-corner-label--tl', { opacity: 1, duration: 0.4, ease: 'none' }, 0.4)
    .to('.opening-corner-label--br', { opacity: 1, duration: 0.4, ease: 'none' }, 0.6)

    /* Layer 3: label fade-slide-up 0.8s, ring scale-in back.out 1.0s,
       skip fade-in + aktif di 1.5s (>= jeda 800ms Batasan 2) */
    .to('.opening-label', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.8)
    .fromTo('.opening-progress-wrap',
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, 1.0)
    .to('.opening-skip',
      { opacity: 1, duration: 0.3, ease: 'none',
        onStart: () => {
          skipBtn.disabled = false;
          /* Batasan 7 V9.1: satu-satunya elemen yang bisa di-fokus.
             Saat tombol aktif, fokus (yang sampai detik ini berada di
             dialog) dipindah ke tombol agar Tab langsung berputar di
             dalam dialog. */
          skipBtn.focus({ preventScroll: true });
        } }, 1.5)

    /* Layer 4: ticker fade-in + interval pergantian 500ms dimulai. */
    .to('.opening-ticker', { opacity: 1, duration: 0.3, ease: 'none', onStart: startTicker }, 1.2);

  /* Counter choreographed: 000 -> 100 selama 1.8s mulai 1.2s (selesai
     3.0s), ring mengikuti, status INITIALIZING -> CALIBRATING (>=50)
     -> READY. Ini pemilik visual progres - bukan progres aset nyata. */
  const counterProxy = { val: 0 };
  let pulseTween = null;
  const counterTween = trackEventTween(gsap.to(counterProxy, {
    val: 100, duration: 1.8, ease: 'power2.inOut', delay: 1.2,
    onUpdate: () => {
      const v = Math.round(counterProxy.val);
      if (counter) counter.textContent = String(v).padStart(3, '0');
      if (ringFill) ringFill.style.strokeDashoffset = String(289 * (1 - v / 100));
      if (status && v >= 50 && status.textContent === 'INITIALIZING...') {
        status.textContent = 'CALIBRATING...';
      }
    },
    onComplete: () => {
      if (status) status.textContent = 'READY';
      /* Ring pulse 3.2s: scale 1 -> 1.12 -> 1. Tracked agar exitSequence
         dapat membunuhnya di tengah jalan. */
      pulseTween = trackEventTween(gsap.fromTo('.opening-progress-wrap',
        { scale: 1 },
        { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }));
    }
  }));

  /* --- MICRO-DELIGHT: partikel debu kursor (reuse motif .pixel-dust) --- */
  /* 6 partikel kecil di sekitar ring yang mengikuti kursor perlahan
     lewat gsap.quickTo (damped 0.22 sehingga tetap melayang di area
     ring). Hanya fine pointer; semua quickTo + listener terlacak. */
  let dustNodes = null;
  let dustFns = null;
  let dustMove = null;
  const dustWrap = qs('.opening-progress-wrap');
  if (finePointer && dustWrap) {
    dustNodes = [];
    dustFns = [];
    const DAMPING = 0.22;
    for (let i = 0; i < 6; i++) {
      const particle = el('span', 'opening-dust');
      particle.setAttribute('aria-hidden', 'true');
      dustWrap.appendChild(particle);
      gsap.set(particle, {
        x: gsap.utils.random(-80, 80),
        y: gsap.utils.random(-80, 80),
        opacity: gsap.utils.random(0.18, 0.42)
      });
      dustNodes.push(particle);
      dustFns.push({
        xTo: trackQuickTo(gsap.quickTo(particle, 'x', { duration: 1.4, ease: 'power2.out' })),
        yTo: trackQuickTo(gsap.quickTo(particle, 'y', { duration: 1.4, ease: 'power2.out' }))
      });
    }
    dustMove = (event) => {
      if (!dustWrap || !dustFns) return;
      const rect = dustWrap.getBoundingClientRect();
      const cx = (event.clientX - rect.left - rect.width / 2) * DAMPING;
      const cy = (event.clientY - rect.top - rect.height / 2) * DAMPING;
      dustFns.forEach((fn, index) => {
        const spread = (index - 2.5) * 10;
        fn.xTo(cx + spread);
        fn.yTo(cy - spread * 0.6);
      });
    };
    trackMotionListener(doc, 'pointermove', dustMove);
  }

  const removeDust = () => {
    if (dustMove) {
      doc.removeEventListener('pointermove', dustMove);
      dustMove = null;
    }
    if (dustFns) {
      dustFns.forEach((fn) => {
        if (fn.xTo && fn.xTo.tween) fn.xTo.tween.kill();
        if (fn.yTo && fn.yTo.tween) fn.yTo.tween.kill();
      });
      dustFns = null;
    }
    if (dustNodes) {
      dustNodes.forEach((node) => { if (node.parentNode) node.parentNode.removeChild(node); });
      dustNodes = null;
    }
  };

  /* --- EXIT SEQUENCE (satu-satunya jalur keluar, idempoten) --- */
  const exitSequence = () => {
    if (isExiting) return;
    isExiting = true;

    /* 1. Matikan seluruh sumber gerak V9.1 + timer utama V9.0. */
    if (choreography) choreography.kill();
    if (counterTween) counterTween.kill();
    if (pulseTween) { pulseTween.kill(); pulseTween = null; }
    stopTicker();
    removeDust();
    clearMainTimer();

    /* 2. Snap visual ke keadaan akhir (skip/Escape di tengah
          choreography tetap meninggalkan ritual yang terbaca lengkap).
          Status CONTINUING... (jalur gagal aset) tidak ditimpa. */
    gsap.set('.opening-bracket', { opacity: 1 });
    gsap.set('.opening-ruler--v', { scaleY: 1, opacity: 0.4, transformOrigin: 'top' });
    gsap.set('.opening-ruler--h', { scaleX: 1, opacity: 0.4, transformOrigin: 'left' });
    gsap.set('.opening-corner-label--tl, .opening-corner-label--br', { opacity: 1 });
    gsap.set('.opening-label, .opening-skip', { opacity: 1, y: 0 });
    gsap.set('.opening-progress-wrap', { scale: 1, opacity: 1 });
    gsap.set('.opening-ticker', { opacity: 1 });
    skipBtn.disabled = false;
    if (counter) counter.textContent = '100';
    if (ringFill) ringFill.style.strokeDashoffset = '0';
    if (status && status.textContent !== 'CONTINUING...') status.textContent = 'READY';

    /* 3. Wipe: circular reveal. clip-path circle pada .opening-clip
          menyusut 150% -> 0% (1.0s power3.inOut) sementara ::backdrop
          memudar 1s (CSS .is-wiping) dan dialog menjadi transparan,
          sehingga hero terungkap DI TENGAH wipe (REVEAL_AT 0.65s),
          bukan hanya setelah dialog.close(). Total exit 1.0s: total
          keseluruhan 3.5 + 1.0 = 4.5s (Batasan 2). */
    dialog.classList.add('is-wiping');
    const tl = trackEventTween(gsap.timeline({
      onComplete: () => {
        dialog.close();
        /* Listener spesifik dilepas di sini DAN tersedia di
           motionRegistry (didaftarkan lewat trackMotionListener di
           bawah), jadi teardown navigasi juga membersihkannya. */
        skipBtn.removeEventListener('click', exitSequence);
        dialog.removeEventListener('cancel', onCancel);
      }
    }));
    /* Frame + ambient memudar bersamaan (mereka di luar clip). */
    tl.to('.opening-frame, .opening-grain, .opening-vignette',
      { opacity: 0, duration: 0.4, ease: 'none' }, 0);
    /* Circular reveal pada wrapper konten. */
    tl.to('.opening-clip',
      { clipPath: 'circle(0% at 50% 50%)', duration: EXIT_DURATION_MS / 1000, ease: 'power3.inOut' }, 0);
    /* Hero mulai muncul 0.65s ke dalam wipe (Batasan 6). */
    tl.call(animateHeroOnce, null, REVEAL_AT_SEC);
  };

  /* --- ASSET TRACKING (Batasan 3 + 8 V9.0, dipertahankan) --- */
  const images = qsa('img[data-opening-critical]');
  const total = images.length;
  let loaded = 0;
  let failed = 0;
  const settled = new Set();

  /* Setiap aset dihitung TEPAT SATU KALI. */
  const settleAsset = (img, success) => {
    if (settled.has(img)) return;
    settled.add(img);
    if (success) loaded++; else failed++;
    checkAssets();
  };

  /* V9.1: checkAssets hanya menangani KEGAGALAN (fast-fail, Skenario 9).
     Kondisi "semua berhasil" TIDAK lagi keluar cepat: waktu exit tunggal
     adalah timeout utama 3.5s agar choreography selalu utuh (lihat
     komentar header). Tidak ada penulisan counter/ring di sini - visual
     progres dimiliki counter choreography. */
  const checkAssets = () => {
    if (isExiting) return;
    if (failed > 0) {
      clearMainTimer();
      if (status) status.textContent = 'CONTINUING...';
      exitSequence();
    }
  };

  /* --- TIMEOUT UTAMA (dijadwalkan SEBELUM listener aset dipasang) --- */
  timeoutId = window.setTimeout(() => {
    if (isExiting) return;
    /* Skenario 8 (lambat): aset masih menggantung -> CONTINUING...
       Jalur normal membiarkan READY dari counter tween terbaca. */
    if (status && loaded < total) status.textContent = 'CONTINUING...';
    exitSequence();
  }, TOTAL_TIMEOUT_MS);
  if (motionRegistry.timers) motionRegistry.timers.add(timeoutId);

  /* --- NO-ASSETS BRANCH (Batasan 2 V9.0; diperbarui V9.1) ---
     Halaman tanpa img kritis (termasuk halaman depan) tidak memasang
     listener apa pun; choreography + counter choreographed + timeout
     3.5s memegang seluruh garis waktu: counter tetap berjalan 000->100,
     status READY di 3.0s, lalu wipe di 3.5s (Skenario 3 + 11). Tidak
     ada lagi exit cepat 400ms karena itu memotong ritual V9.1. */
  if (total > 0) {
    /* --- ASSET LOOP (deduplikasi tepat-satu) --- */
    images.forEach((img) => {
      if (settled.has(img)) return;

      if (img.complete) {
        /* Sudah selesai (sukses atau gagal) sebelum listener dipasang. */
        settleAsset(img, img.naturalWidth > 0);
        return;
      }

      /* Pasangan handler saling melepas: setiap load/error memastikan
         pasangannya tidak pernah memicu settleAsset kedua kalinya. */
      const onLoad = () => {
        img.removeEventListener('error', onError);
        settleAsset(img, true);
      };
      const onError = () => {
        img.removeEventListener('load', onLoad);
        settleAsset(img, false);
      };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });
  }

  /* --- KONTROL --- */
  const onCancel = (event) => {
    event.preventDefault(); // blok close native; tutup lewat wipe saja
    exitSequence();
  };

  /* Klik tombol dan Escape (cancel) sama-sama lewat exitSequence;
     guard isExiting membuat klik ganda / Escape berulang tidak
     memicu dua wipe (Skenario 6 + 7). */
  trackMotionListener(skipBtn, 'click', exitSequence);
  trackMotionListener(dialog, 'cancel', onCancel);
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

  /* V8.1 Fase 5: setiap blok di bawah ini dijaga dengan pemeriksaan
     keberadaan target (gsap.utils.toArray + length) agar GSAP tidak
     mencatat peringatan "target not found" di halaman yang tidak
     memiliki section tersebut. initSectionMotion berjalan di semua
     halaman, sedangkan selector di bawah hanya ada di halaman tertentu. */

  // About copy: calm rhythm (halaman /about)
  const aboutTargets = gsap.utils.toArray('.about-lead, .about-body');
  if (aboutTargets.length) {
    gsap.set(aboutTargets, { opacity: 0, y: 26 });
    gsap.to(aboutTargets, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-layout', start: 'top 78%', once: true }
    });
  }

  // Chips: short stagger (transform cleared afterwards so the CSS hover
  // lift and the :active press (5.3.5) can take over)
  const softwareChips = gsap.utils.toArray('.software-chip');
  if (softwareChips.length) {
    gsap.set(softwareChips, { opacity: 0, scale: 0.85 });
    gsap.to(softwareChips, {
      opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.software-block', start: 'top 85%', once: true }
    });
  }
  const skillChips = gsap.utils.toArray('.skill-chip');
  if (skillChips.length) {
    gsap.set(skillChips, { opacity: 0, y: 14 });
    gsap.to(skillChips, {
      opacity: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.skills-block', start: 'top 85%', once: true }
    });
  }

  // Journey + education: sequential, emphasis on titles
  const journeyItems = gsap.utils.toArray('.journey-item');
  if (journeyItems.length) {
    gsap.set(journeyItems, { opacity: 0, x: -18 });
    gsap.to(journeyItems, {
      opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-list', start: 'top 84%', once: true }
    });
  }
  const resumeCards = gsap.utils.toArray('.resume-card');
  if (resumeCards.length) {
    gsap.set(resumeCards, { opacity: 0, y: 40 });
    gsap.to(resumeCards, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: '.journey-grid', start: 'top 86%', once: true }
    });
  }

  // Social cards: measured stagger (grid dirender renderSocials di /connect)
  const socialCards = gsap.utils.toArray('.social-card');
  if (socialCards.length) {
    gsap.set(socialCards, { opacity: 0, y: 30 });
    gsap.to(socialCards, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.social-grid', start: 'top 86%', once: true }
    });
  }

  // Credentials: restrained entrance; reserved slots stay quiet
  const credentialTargets = gsap.utils.toArray('.credential-card, .credential-slot');
  if (credentialTargets.length) {
    gsap.set(credentialTargets, { opacity: 0, y: 26 });
    gsap.to(credentialTargets, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.credential-grid', start: 'top 86%', once: true }
    });
  }

  // Contact block: modest entrance for the email cards
  const contactTargets = gsap.utils.toArray('.contact-heading, .contact-card, .contact-note');
  if (contactTargets.length) {
    gsap.set(contactTargets, { opacity: 0, y: 22 });
    gsap.to(contactTargets, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact-block', start: 'top 88%', once: true }
    });
  }

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
  const curiosityPanels = gsap.utils.toArray('.curiosity-panel, .curiosity-intro');
  if (curiosityPanels.length) {
    gsap.set(curiosityPanels, { opacity: 0, y: 18 });
    gsap.to(curiosityPanels, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: MOTION.easeSoft,
      scrollTrigger: { trigger: '.curiosity-map', start: 'top 78%', once: true }
    });
  }

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
     net for a page that boots while already hidden.
     V7.4: interval didaftarkan di motionRegistry.intervals supaya
     teardown navigasi ClientRouter menghentikannya; visibilitychange
     dilacak lewat trackMotionListener (tidak menumpuk antar boot). */
  let pollIntervalId = null;

  function startPolling() {
    if (pollIntervalId !== null) return;
    if (doc.hidden) return;
    pollIntervalId = window.setInterval(poll, pollMs);
    motionRegistry.intervals.add(pollIntervalId);
  }

  function stopPolling() {
    if (pollIntervalId !== null) {
      window.clearInterval(pollIntervalId);
      motionRegistry.intervals.delete(pollIntervalId);
      pollIntervalId = null;
    }
  }

  trackMotionListener(doc, 'visibilitychange', () => {
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
/* V9.0: flag window.__FIP_OPENING_ACTIVE dan event 'fip:start-hero'
   dihapus. Gerbang hero kini kontrak callback langsung: gate di bawah
   memanggil initArchiveOpening(prepareHeroState, animateHeroIn+)
   (dua fungsi diekspor home.js). animateHeroIn dibungkus agar
   initSectionMotion tetap start tepat saat reveal - di SEMUA jalur
   (bypass maupun normal), menggantikan gating startHeroGateGlobal lama.
   Catatan urutan: initSectionMotion sebelum animateHeroIn, sama
   seperti urutan listener lama saat event fip:start-hero dispatch. */

/* ======================================================================
 * V8.0 FASE 2: AUDIO FEEDBACK INIT (sitewide)
 * ==================================================================== */
/* Tiga tugas: (1) sinkron + wiring tombol mute Header (preferensi
 * localStorage fip-audio-muted), (2) suara klik CTA lewat delegasi
 * document pada .magnetic-button sehingga tetap bekerja untuk DOM yang
 * dirender ulang, (3) suara hover kartu proyek lewat delegasi mouseover
 * (sekali per kartu + throttle 90ms). Fungsi suara sendiri sudah no-op
 * saat mute / reduced motion / tanpa Web Audio (Batasan 1 + 3). */
function initAudioFeedback() {
  const toggle = qs('#audio-toggle');
  const syncToggle = (button) => {
    if (!button) return;
    const muted = isAudioMuted();
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Unmute interface sounds' : 'Mute interface sounds');
    button.classList.toggle('is-muted', muted);
    const iconOn = button.querySelector('.audio-icon-on');
    const iconOff = button.querySelector('.audio-icon-off');
    if (iconOn) iconOn.hidden = muted;
    if (iconOff) iconOff.hidden = !muted;
  };
  if (toggle && toggle.dataset.audioBound !== 'true') {
    toggle.dataset.audioBound = 'true';
    syncToggle(toggle);
    trackMotionListener(toggle, 'click', () => {
      const next = !isAudioMuted();
      setAudioMuted(next);
      syncToggle(toggle);
      if (!next) playClickSound(); // umpan balik saat di-unmute
    });
  } else if (toggle) {
    syncToggle(toggle);
  }

  trackMotionListener(doc, 'click', (event) => {
    if (event.target && event.target.closest && event.target.closest('.magnetic-button')) {
      playClickSound();
    }
  });

  let lastHoverCard = null;
  let lastHoverAt = 0;
  trackMotionListener(doc, 'mouseover', (event) => {
    const card = event.target && event.target.closest ? event.target.closest('.project-card') : null;
    if (!card) {
      lastHoverCard = null;
      return;
    }
    if (card === lastHoverCard) return;
    lastHoverCard = card;
    const now = Date.now();
    if (now - lastHoverAt < 90) return;
    lastHoverAt = now;
    playHoverSound();
  });
}

/* V9.0 FASE 4 (Batasan 9): lifecycle guard navigation. Idempoten dan
   berjalan pada SETIAP astro:after-swap. Teardown utama sudah dilakukan
   cleanupMotionRegistry() di core.js (listener astro:after-swap core
   terdaftar lebih dulu, jadi berjalan sebelum handler ini): timer yang
   dilacak dibatalkan, listener dilepas, timeline exit di-kill. Handler
   ini menutup sisa state DOM yang tidak dimiliki registry:
   - dialog yang mungkin masih open (mis. navigasi di tengah opening);
   - safety timeout inline script (timer mentah di luar registry);
   - class opening-armed di <html> (Batasan 9: tidak ada class sisa). */
document.addEventListener('astro:after-swap', () => {
  const dialog = qs('#archive-opening');
  if (dialog && dialog.open) {
    /* Paksa tutup dialog. */
    dialog.close();
  }
  /* Batalkan timer safety inline script bila masih menggantung. */
  if (window.__openingSafety) {
    clearTimeout(window.__openingSafety);
    delete window.__openingSafety;
  }
  /* Pulihkan state DOM: guard FOUC tidak boleh tersisa. */
  document.documentElement.classList.remove('opening-armed');
});

bootPage({
  renders: [
    renderIdentity,
    buildHeadingTicks,
    buildArchiveSpines,
    buildAllAmbientDebris,
    buildV65Ornaments,
    /* V7.4 Fase 3: engine ambient generatif terpasang di level modul
       (sekali per sesi). Setelah ClientRouter mengganti DOM, canvas
       halaman baru harus di-mount ulang; no-op di halaman tanpa canvas. */
    () => { if (window.GenerativeAmbient && typeof window.GenerativeAmbient.remount === 'function') window.GenerativeAmbient.remount(); },
  ],
  interactions: [initMobileMenu, initQuickMenu, initAnchors, initNowPlaying, initPageProgressBar, fallbackReveal, initMagneticButtons, initAudioFeedback],
  motion: [
    initSmoothScroll,
    initArchiveSpine,
    initBackTop,
    initVisibilityPause,
    () => {
      /* V9.0 FASE 4.1: Archive Boot Sequence dipanggil di bootPage,
         menggantikan gate shouldShowArchiveOpening + event lama. Semua
         keputusan tampil/tidak (elemen, reduced motion, sesi) kini
         internal ke initArchiveOpening lewat jalur bypass-nya. */
      const animateHeroInWithSections = () => {
        initSectionMotion();
        animateHeroIn();
      };
      initArchiveOpening(prepareHeroState, animateHeroInWithSections);
    },
  ],
  cleanups: [],
});
