/*!
 * src/scripts/archive/adr.js - Engineering Records Vault interactions (V13.0-A).
 *
 * Terintegrasi dengan single-owner lifecycle bootPage() dari core.js.
 * Menyediakan filter kategori/tipe/status, pencarian teks real-time
 * berbasis textContent, serta penyalinan hash SHA-256 yang aksesibel.
 */

import { bootPage, qs, qsa, showToast, trackMotionListener } from '../core.js';

function normalizeQuery(value) {
  let text = value === undefined || value === null ? '' : String(value);
  try {
    if (typeof text.normalize === 'function') text = text.normalize('NFKC');
  } catch (error) {
    /* Pertahankan input mentah bila normalize gagal */
  }
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function initAdrCatalog() {
  const listNode = qs('#adr-record-list');
  if (!listNode) return;

  const cards = qsa('.adr-card', listNode);
  const searchInput = qs('#adr-search-input');
  const resetBtn = qs('#adr-reset-filters');
  const countNode = qs('#adr-visible-count');
  const emptyNode = qs('#adr-empty-state');

  const categoryButtons = qsa('[data-adr-filter-category]');
  const typeButtons = qsa('[data-adr-filter-type]');
  const statusButtons = qsa('[data-adr-filter-status]');

  let activeCategory = 'all';
  let activeType = 'all';
  let activeStatus = 'all';
  let activeQuery = '';

  function syncButtonGroup(buttons, attrName, currentValue) {
    buttons.forEach((btn) => {
      const val = btn.getAttribute(attrName) || 'all';
      const isSelected = val === currentValue;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      const indicator = qs('.adr-filter-indicator', btn);
      if (indicator) {
        indicator.textContent = isSelected ? '[•]' : '';
      }
    });
  }

  function applyFilters() {
    let visibleCount = 0;

    cards.forEach((card) => {
      const cat = card.getAttribute('data-category') || '';
      const rType = card.getAttribute('data-record-type') || '';
      const rStatus = card.getAttribute('data-record-status') || '';
      const haystack = (card.getAttribute('data-search-haystack') || '').toLowerCase();

      const matchCat = activeCategory === 'all' || cat === activeCategory;
      const matchType = activeType === 'all' || rType === activeType;
      const matchStatus = activeStatus === 'all' || rStatus === activeStatus;
      const matchQuery = !activeQuery || haystack.includes(activeQuery);

      const visible = matchCat && matchType && matchStatus && matchQuery;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (countNode) {
      countNode.textContent = `Menampilkan ${visibleCount} dari ${cards.length} dokumen rekayasa`;
    }
    if (emptyNode) {
      emptyNode.hidden = visibleCount > 0;
    }
  }

  categoryButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      activeCategory = btn.getAttribute('data-adr-filter-category') || 'all';
      syncButtonGroup(categoryButtons, 'data-adr-filter-category', activeCategory);
      applyFilters();
    });
  });

  typeButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      activeType = btn.getAttribute('data-adr-filter-type') || 'all';
      syncButtonGroup(typeButtons, 'data-adr-filter-type', activeType);
      applyFilters();
    });
  });

  statusButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      activeStatus = btn.getAttribute('data-adr-filter-status') || 'all';
      syncButtonGroup(statusButtons, 'data-adr-filter-status', activeStatus);
      applyFilters();
    });
  });

  if (searchInput) {
    trackMotionListener(searchInput, 'input', () => {
      activeQuery = normalizeQuery(searchInput.value);
      applyFilters();
    });
  }

  if (resetBtn) {
    trackMotionListener(resetBtn, 'click', () => {
      activeCategory = 'all';
      activeType = 'all';
      activeStatus = 'all';
      activeQuery = '';
      if (searchInput) searchInput.value = '';
      syncButtonGroup(categoryButtons, 'data-adr-filter-category', 'all');
      syncButtonGroup(typeButtons, 'data-adr-filter-type', 'all');
      syncButtonGroup(statusButtons, 'data-adr-filter-status', 'all');
      applyFilters();
    });
  }
}

export function initAdrDetail() {
  const copyBtn = qs('#adr-copy-hash-btn');
  const statusNode = qs('#adr-copy-status');
  if (!copyBtn) return;

  trackMotionListener(copyBtn, 'click', async () => {
    const hash = copyBtn.getAttribute('data-copy-hash') || '';
    if (!hash) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(hash);
        if (statusNode) statusNode.textContent = 'SHA-256 tersalin.';
        showToast('SHA-256 checksum copied to clipboard.');
      } else {
        if (statusNode) statusNode.textContent = 'Salin manual dari kode di samping.';
      }
    } catch (error) {
      if (statusNode) statusNode.textContent = 'Salin manual dari kode di samping.';
    }
  });
}

bootPage({
  interactions: [initAdrCatalog, initAdrDetail],
});
