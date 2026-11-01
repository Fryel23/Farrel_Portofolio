/*!
 * archive/credentials.js: Credentials feature (modularized V11.1-M).
 *
 * Single responsibility: seluruh fitur Credentials - render kartu,
 * empty/reserved state, native <dialog> preview, credential frame,
 * dan kolom entry requirements. Native dialog preview adalah fitur
 * tersendiri (BUKAN modal Opening V9.1 yang dilarang) - dipertahankan.
 */
import {
  DATA, doc, el, qs, setText, safeImage, MOTION, hasGSAP, isReducedMotion,
} from '../core.js';

/* Credentials: real entries render as cards; an empty list renders the
 * reserved empty state. Verification buttons only appear when a real
 * proofUrl exists, never a fake "verify" link. Entries with an image
 * open a native <dialog> preview (12.6). */
const credentialDialog = qs('#credential-dialog');
let credentialDialogTrigger = null;

function openCredentialDialog(item, trigger) {
  if (!credentialDialog || typeof credentialDialog.showModal !== 'function') return;
  credentialDialogTrigger = trigger || null;

  const image = qs('#credential-dialog-image');
  const figure = qs('.credential-dialog-figure');
  const hasImage = String(item.image || '').trim() !== '';
  if (figure) figure.hidden = !hasImage;
  if (image) {
    if (hasImage) {
      image.src = safeImage(item.image);
      image.alt = (item.title || 'Credential') + ': full certificate / award image';
    } else {
      image.removeAttribute('src');
    }
  }

  setText('#credential-dialog-type', item.type || 'Credential');
  setText('#credential-dialog-title', item.title || 'Untitled entry');
  setText('#credential-dialog-issuer', item.issuer || '');

  const idNode = qs('#credential-dialog-id');
  if (idNode) {
    idNode.textContent = item.credentialId ? 'ID: ' + item.credentialId : '';
    idNode.hidden = !item.credentialId;
  }

  const proof = qs('#credential-dialog-proof');
  const url = String(item.proofUrl || '').trim();
  if (proof) {
    if (/^https?:\/\//i.test(url)) {
      proof.href = url;
      proof.hidden = false;
    } else {
      proof.hidden = true;
      proof.removeAttribute('href');
    }
  }

  credentialDialog.showModal();

  // Unfold reveal (5.5.3): the dialog content opens from its centre via
  // clip-path. Reduced motion: the dialog simply appears.
  const inner = qs('.credential-dialog-inner', credentialDialog);
  if (inner && hasGSAP && !isReducedMotion()) {
    gsap.fromTo(inner,
      { clipPath: 'inset(50% 50% 50% 50%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: MOTION.ease }
    );
  }
}

function initCredentialDialog() {
  if (!credentialDialog) return;
  const closeButton = qs('#credential-dialog-close');
  if (closeButton) closeButton.addEventListener('click', () => credentialDialog.close());
  // Click on the backdrop (the dialog element itself) closes the preview.
  credentialDialog.addEventListener('click', (event) => {
    if (event.target === credentialDialog) credentialDialog.close();
  });
  // Escape works natively; return focus to the card that opened it.
  credentialDialog.addEventListener('close', () => {
    // Reset the unfold state (5.5.3) so the next open starts folded.
    const inner = qs('.credential-dialog-inner', credentialDialog);
    if (inner && hasGSAP) gsap.set(inner, { clearProps: 'clipPath' });
    if (credentialDialogTrigger) credentialDialogTrigger.focus();
    credentialDialogTrigger = null;
  });
}
function renderCredentials() {
  const grid = qs('#credential-grid');
  if (!grid || !DATA || !DATA.credentials) return;
  const cfg = DATA.credentials;
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  grid.textContent = '';

  if (!items.length) {
    const types = Array.isArray(cfg.emptySlots) && cfg.emptySlots.length
      ? cfg.emptySlots : ['CERTIFICATE', 'AWARD', 'PUBLICATION'];
    types.forEach((type) => {
      const slot = el('div', 'credential-slot');
      slot.appendChild(el('span', 'credential-slot-type', type));
      slot.appendChild(el('span', 'credential-slot-label', cfg.emptyLabel || 'COMING SOON'));
      slot.appendChild(el('span', 'credential-slot-note', cfg.emptyNote || 'RESERVED FOR FUTURE ENTRIES'));
      grid.appendChild(slot);
    });

    /* V8.1 Fase 4.2: kartu sampel "SAMPLE FORMAT / NOT AN ENTRY"
       dihapus dari tampilan publik agar vault hanya berisi slot yang
       jujur. Format kartu lengkap tetap terdokumentasi di komentar
       "HOW TO ADD A CREDENTIAL" pada src/data/content.js. */

    // Vault framing (5.5.1): the reserved grid gets a casing with a small
    // dial that turns on hover. Pure decoration; skipped once real
    // credential entries exist.
    if (!grid.parentElement.classList.contains('vault-frame')) {
      const wrapper = el('div', 'vault-frame');
      grid.parentNode.insertBefore(wrapper, grid);
      wrapper.appendChild(grid);
      const dial = el('div', 'vault-dial');
      dial.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 8; i++) {
        const tick = el('span', 'vault-tick');
        tick.style.transform = 'rotate(' + (i * 45) + 'deg)';
        dial.appendChild(tick);
      }
      wrapper.appendChild(dial);
    }
    return;
  }

  items.forEach((item) => {
    const card = el('article', 'credential-card');

    const image = String(item.image || '').trim();
    if (image) {
      const img = doc.createElement('img');
      img.src = safeImage(image);
      img.alt = (item.title || 'Credential') + ': certificate / award image';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { this.remove(); }, { once: true });
      card.appendChild(img);
    }

    const body = el('div', 'credential-body');
    const meta = el('div', 'credential-meta');
    meta.appendChild(el('span', 'credential-type', item.type || 'Credential'));
    if (item.date) meta.appendChild(el('span', 'credential-date', item.date));
    body.appendChild(meta);

    body.appendChild(el('h3', null, item.title || 'Untitled entry'));
    if (item.issuer) body.appendChild(el('p', 'credential-issuer', item.issuer));
    if (item.description) body.appendChild(el('p', 'credential-desc', item.description));
    if (item.credentialId) {
      body.appendChild(el('p', 'credential-id', 'ID: ' + item.credentialId));
    }

    const proof = String(item.proofUrl || '').trim();
    if (/^https?:\/\//i.test(proof)) {
      const link = el('a', 'credential-proof', 'Verify credential');
      link.href = proof;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(el('span', 'project-link-arrow', '↗'));
      body.appendChild(link);
    }

    // Large accessible preview: only for entries that really have an image.
    if (image) {
      const previewButton = el('button', 'credential-preview', 'Open preview');
      previewButton.type = 'button';
      previewButton.addEventListener('click', () => openCredentialDialog(item, previewButton));
      body.appendChild(previewButton);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

function initCredentialFrame() {
  const deco = DATA && DATA.decorations && DATA.decorations.credentials;
  if (!deco) return;
  const inner = qs('.credentials-inner');
  const grid = qs('.credential-grid');
  if (!inner || !grid || grid.querySelector('.credential-frame')) return;

  const frame = el('div', 'credential-frame');
  frame.setAttribute('aria-hidden', 'true');
  if (deco.rulerLines) {
    frame.appendChild(el('span', 'credential-ruler credential-ruler--top'));
    frame.appendChild(el('span', 'credential-ruler credential-ruler--bottom'));
  }
  for (let i = 0; i < 4; i++) frame.appendChild(el('i', 'credential-plate'));
  grid.appendChild(frame);

  if (deco.plateLabel) {
    const plate = el('span', 'credential-plate-label', deco.plateLabel);
    plate.setAttribute('aria-hidden', 'true');
    grid.appendChild(plate);
  }
  if (deco.stamp) {
    const stamp = el('span', 'credential-stamp', deco.stamp);
    stamp.setAttribute('aria-hidden', 'true');
    grid.appendChild(stamp);
  }
}

/* --- V6.6 Fase 2: entry requirements column + verification timeline ----
   The empty archive explains its own admission rules; the timeline
   counts only real entries from DATA.credentials.items.length. */
function initCredentialRequirements() {
  const inner = qs('.credentials-inner');
  if (!inner || !DATA || !DATA.credentials) return;
  if (qs('.credential-columns', inner)) return; // idempotent
  const gridHost = qs('.vault-frame', inner) || qs('.credential-grid', inner);
  if (!gridHost) return;

  /* 2.1 left column, aligned with the grid. */
  const columns = el('div', 'credential-columns');
  const aside = el('aside', 'credential-requirements');
  aside.setAttribute('aria-label', 'Entry requirements');
  aside.append(el('p', 'section-kicker', 'ENTRY REQUIREMENTS'), el('ul', 'credential-req-list'));
  [['ISSUER', 'Named organization'], ['DATE', 'Year earned'],
   ['VERIFICATION URL', 'Official page only'], ['IMAGE', 'Full certificate or award'],
   ['PROOF ID', 'Optional credential ID']].forEach((req) => {
    const li = doc.createElement('li');
    li.append(el('span', 'req-label', req[0]), el('span', 'req-value', req[1]));
    aside.lastChild.appendChild(li);
  });
  aside.appendChild(el('p', 'credential-req-note',
    'Setiap entri ditambahkan melalui source code. Tidak ada entri yang ditampilkan sebelum benar-benar ada.'));
  columns.append(aside, gridHost);
  const footnote = qs('.credentials-footnote', inner);
  inner.insertBefore(columns, footnote);

  /* 2.3 timeline: live entry count, marker at the running year. */
  const timeline = el('div', 'credential-timeline');
  timeline.setAttribute('aria-hidden', 'true');
  timeline.append(el('div', 'timeline-line'), el('div', 'timeline-marker timeline-marker--current'),
    el('span', 'timeline-year', String(DATA.meta.year || new Date().getFullYear())),
    el('span', 'timeline-label', (Array.isArray(DATA.credentials.items) ? DATA.credentials.items.length : 0) + ' ENTRI TERVERIFIKASI'));
  inner.insertBefore(timeline, footnote);
}


/* Modularization exports (public API of this feature module). */
export {
  initCredentialDialog,
  renderCredentials,
  initCredentialFrame,
  initCredentialRequirements,
};
