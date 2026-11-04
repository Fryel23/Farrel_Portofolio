/*!
 * lab/ui/data-table.js — Tabel data alternatif chart (spec §9.2-F, §14.4).
 *
 * Single responsibility: merender tabel record tahun terpilih — nilai ASLI
 * yang sama dengan chart, missing = '—' (bukan 0), caption + thead/tbody,
 * kategori sebagai label + rentang (bukan warna saja, spec §14.3), ditandai
 * duplikat sumber dengan catatan kaki. Seluruhnya via createElement/
 * textContent (aman terhadap data, spec §13.7). Chart.js gagal → tabel tetap
 * tampil. Container dibatasi max-height + scroll (konvensi UI proyek).
 */

import { formatNumber } from '../core/formatters.js';
import { getISPUCategory } from '../core/aqi-calculator.js';

const HEADERS = [
  'Lokasi', 'Tahap', 'SO₂ (µg/Nm³)', 'NO₂ (µg/Nm³)',
  'Sub-indeks SO₂', 'Sub-indeks NO₂', 'ISPU (terderivasi)', 'Kategori',
];

function cellValue(value, fractionDigits = 2) {
  return value === null || value === undefined ? '—' : formatNumber(value, { maxFractionDigits: fractionDigits });
}

function subIndexText(entry) {
  if (!entry || entry.status !== 'valid' || !Number.isFinite(entry.value)) return '—';
  return formatNumber(entry.value, { maxFractionDigits: 2 });
}

function categoryCell(record) {
  const fragment = document.createDocumentFragment();
  const ispu = record.derived && record.derived.ispu;
  if (!Number.isFinite(ispu)) {
    fragment.appendChild(document.createTextNode('—'));
    return fragment;
  }
  const category = getISPUCategory(ispu);
  const chip = document.createElement('span');
  chip.className = `lab-category-chip is-${category.token}`;
  chip.textContent = `${category.label} (${category.range})`;
  fragment.appendChild(chip);
  return fragment;
}

function duplicateMark(record, parameter) {
  const quality = record.quality && record.quality[parameter];
  return Boolean(quality && quality.duplicateCount);
}

export function renderDataTable(container, { dataset }) {
  container.textContent = '';

  const table = document.createElement('table');
  table.className = 'lab-table';

  const caption = document.createElement('caption');
  caption.textContent = `Record pengukuran Kota Cirebon tahun ${dataset.year} — nilai konsentrasi sebagaimana sumber (µg/Nm³) dan sub-indeks/ISPU terderivasi P.14/2020 dari SO₂ & NO₂.`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  HEADERS.forEach((header) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = header;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let duplicateCount = 0;

  dataset.records.forEach((record) => {
    const row = document.createElement('tr');
    if (duplicateMark(record, 'so2') || duplicateMark(record, 'no2')) {
      row.classList.add('has-source-duplicate');
      duplicateCount += 1;
    }

    const cells = [
      record.location,
      record.period.stage,
      cellValue(record.values.so2) + (duplicateMark(record, 'so2') ? ' *' : ''),
      cellValue(record.values.no2) + (duplicateMark(record, 'no2') ? ' *' : ''),
      subIndexText(record.derived && record.derived.subIndex && record.derived.subIndex.so2),
      subIndexText(record.derived && record.derived.subIndex && record.derived.subIndex.no2),
      Number.isFinite(record.derived && record.derived.ispu) ? String(record.derived.ispu) : '—',
      null, /* kategori: node khusus */
    ];

    cells.forEach((cellContent, index) => {
      const td = document.createElement('td');
      if (index === 0) td.className = 'lab-cell-location';
      if (index === HEADERS.length - 1) {
        td.appendChild(categoryCell(record));
      } else {
        td.className = index >= 2 ? 'lab-number' : '';
        td.textContent = cellContent;
      }
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  if (duplicateCount > 0) {
    const note = document.createElement('p');
    note.className = 'lab-table-note';
    note.textContent = '* Kombinasi lokasi/tahap/parameter ini memuat lebih dari satu baris di sumber. Nilai yang tampil = kemunculan pertama sesuai urutan sumber; seluruh kemunculan tersimpan di field `duplicates` dataset JSON dan dijelaskan di halaman methodology.';
    container.appendChild(note);
  }
}

export function renderTableEmptyMessage(container, message) {
  container.textContent = '';
  const paragraph = document.createElement('p');
  paragraph.className = 'lab-table-empty';
  paragraph.textContent = message;
  container.appendChild(paragraph);
}
