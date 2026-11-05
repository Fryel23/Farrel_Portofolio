/*!
 * global/identity.js: site identity & copy sync (modularized V11.1-M).
 *
 * Single responsibility: merender identitas situs dari DATA -
 * contact, social icons/render, hero copy, kartu profil, gallery,
 * about, journey, education, credentials, closing, footer. Satu
 * sumber kebenaran data: src/data/content.js (tidak ada salinan).
 */
import {
  DATA, doc, el, qs, qsa, setText,
  buildHeading, buildTwoLineCardHeading, safeImage,
} from '../core.js';

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
  const secondaryCta = (hero && (hero.secondaryCta || hero.docsCta)) || null;
  if (gh && secondaryCta) {
    gh.textContent = '';
    gh.appendChild(doc.createTextNode(secondaryCta.label + ' '));
    gh.appendChild(el('span', null, '→')).setAttribute('aria-hidden', 'true');
    if (secondaryCta.href) gh.setAttribute('href', secondaryCta.href);
    if (/^https?:\/\//i.test(String(secondaryCta.href || ''))) {
      gh.target = '_blank';
      gh.rel = 'noopener noreferrer';
    } else {
      gh.removeAttribute('target');
      gh.removeAttribute('rel');
    }
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
  if (journeyKicker) journeyKicker.textContent = DATA.journey.kicker || '04 / PERJALANAN BELAJAR · LEARNING JOURNEY';

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

/* The five declarations above keep their baseline inline `export`
   keywords (public API of this feature module). */
