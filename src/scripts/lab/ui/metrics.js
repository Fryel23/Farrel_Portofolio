/*!
 * lab/ui/metrics.js - Metric cards (maksimal 4, hanya yang didukung data).
 *
 * Single responsibility: merender kartu metrik ringkasan tahun terpilih.
 * Label WAJIB menjelaskan apa yang diukur (spec §9.2-D): ISPU di sini selalu
 * diberi kualifikasi "terderivasi dari SO₂/NO₂", bukan ISPU resmi 7 parameter.
 * Tidak ada data valid → '-' (bukan 0). Angka pakai DM Mono (class lab-number).
 */

import { formatIndex, formatNumber } from '../core/formatters.js';

const CATEGORY_LABELS = {
  baik: 'Baik',
  sedang: 'Sedang',
  'tidak-sehat': 'Tidak Sehat',
  'sangat-tidak-sehat': 'Sangat Tidak Sehat',
  berbahaya: 'Berbahaya',
};

function buildCard({ kicker, value, detail, categoryToken }) {
  const card = document.createElement('article');
  card.className = 'lab-metric-card';

  const kickerElement = document.createElement('p');
  kickerElement.className = 'lab-metric-kicker';
  kickerElement.textContent = kicker;

  const valueRow = document.createElement('p');
  valueRow.className = 'lab-metric-value-row';

  const valueElement = document.createElement('span');
  valueElement.className = 'lab-metric-value lab-number';
  valueElement.textContent = value;
  valueRow.appendChild(valueElement);

  if (categoryToken && CATEGORY_LABELS[categoryToken]) {
    const chip = document.createElement('span');
    chip.className = `lab-category-chip is-${categoryToken}`;
    chip.textContent = CATEGORY_LABELS[categoryToken];
    valueRow.appendChild(chip);
  }

  const detailElement = document.createElement('p');
  detailElement.className = 'lab-metric-detail';
  detailElement.textContent = detail;

  card.append(kickerElement, valueRow, detailElement);
  return card;
}

/**
 * @param {HTMLElement} container
 * @param {object} payload hasil computeMetrics (orchestrator)
 */
export function renderMetrics(container, payload) {
  container.textContent = '';

  if (!payload || payload.status !== 'valid') {
    for (let index = 0; index < 4; index += 1) {
      container.appendChild(buildCard({
        kicker: '-',
        value: '-',
        detail: 'Tidak ada data untuk kombinasi yang dipilih.',
        categoryToken: null,
      }));
    }
    return;
  }

  const { meanIspu, maxIspu, dominant, coverage } = payload;

  container.appendChild(buildCard({
    kicker: 'RATA-RATA ISPU TERDERIVASI (SO₂ & NO₂)',
    value: meanIspu.value === null ? '-' : formatIndex(meanIspu.value),
    detail: meanIspu.value === null
      ? 'Tidak ada record dengan sub-indeks valid.'
      : `Rata-rata dari ${formatNumber(meanIspu.recordCount)} record valid dari ${formatNumber(meanIspu.totalRecords)} record tahun ${meanIspu.year}.`,
    categoryToken: meanIspu.categoryToken || null,
  }));

  container.appendChild(buildCard({
    kicker: 'ISPU TERDERIVASI MAKSIMUM',
    value: maxIspu.value === null ? '-' : formatIndex(maxIspu.value),
    detail: maxIspu.value === null
      ? 'Tidak ada record valid.'
      : `${maxIspu.location} · ${maxIspu.stage} · kategori ${maxIspu.category}`,
    categoryToken: maxIspu.categoryToken || null,
  }));

  container.appendChild(buildCard({
    kicker: 'POLUTAN DOMINAN (SUB-INDEKS SETARA)',
    value: dominant.value,
    detail: dominant.detail,
    categoryToken: null,
  }));

  container.appendChild(buildCard({
    kicker: 'CAKUPAN RECORD VALID',
    value: coverage.value,
    detail: coverage.detail,
    categoryToken: null,
  }));
}
