/*!
 * lab/ui/render.js — Renderer konteks dataset & catatan sumber (spec §9.2-B, §9.2-G).
 *
 * Single responsibility: mengisi dataset context strip (region, periode,
 * sumber, updated, averaging, coverage) dan source note dari manifest +
 * dataset. Informasi yang tidak tersedia → "Tidak disediakan sumber"
 * (jujur, bukan dikarang). Semua nilai via textContent; URL sumber
 * divalidasi safeExternalUrl sebelum jadi anchor (spec §13.7).
 */

import { safeExternalUrl, NOT_PROVIDED } from '../core/formatters.js';

function fillDefinition(list, term, valueText, href = null) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  if (href) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = valueText;
    dd.appendChild(anchor);
  } else {
    dd.textContent = valueText;
  }
  list.append(dt, dd);
}

export function renderContextStrip({ container, region, yearEntry, dataset, manifest }) {
  container.textContent = '';

  const list = document.createElement('dl');
  list.className = 'lab-context-list';

  const source = (manifest.sources || []).find((candidate) => candidate.id === dataset.dataset.sourceId) || null;

  fillDefinition(list, 'Region', region ? region.name : dataset.regionId);
  fillDefinition(list, 'Periode', `${dataset.year}${yearEntry && yearEntry.status === 'partial' ? ' (parsial)' : ''} — tahap: ${(yearEntry && yearEntry.stages ? yearEntry.stages.join(', ') : dataset.records.map((record) => record.period.stage).join(', '))}`);
  fillDefinition(list, 'Lokasi terukur', `${yearEntry && yearEntry.locationCount ? yearEntry.locationCount : new Set(dataset.records.map((record) => record.locationId)).size} titik`);
  fillDefinition(list, 'Parameter', 'SO₂ & NO₂ (µg/Nm³, sebagaimana sumber)');
  fillDefinition(list, 'Averaging period', (dataset.dataset.measurement && dataset.dataset.measurement.frequency) || NOT_PROVIDED);
  fillDefinition(list, 'Cakupan', yearEntry && yearEntry.coverageNote ? yearEntry.coverageNote : `${dataset.records.length} record`);
  fillDefinition(list, 'Sumber', source ? source.publisher : (dataset.dataset.sourceId || NOT_PROVIDED));
  fillDefinition(list, 'Dataset diperbarui', manifest.updatedAt || NOT_PROVIDED);
  fillDefinition(list, 'Data diakses', dataset.dataset.accessedAt || NOT_PROVIDED);

  container.appendChild(list);
}

export function renderSourceNote({ container, dataset, manifest }) {
  container.textContent = '';

  const source = (manifest.sources || []).find((candidate) => candidate.id === dataset.dataset.sourceId);
  const paragraph = document.createElement('p');
  paragraph.className = 'lab-source-text';

  const prefix = document.createElement('strong');
  prefix.textContent = 'Sumber data: ';
  paragraph.appendChild(prefix);

  if (source) {
    paragraph.appendChild(document.createTextNode(`${source.publisher} — ${source.name}. `));
    const url = safeExternalUrl(source.url);
    if (url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = 'Portal sumber ↗';
      paragraph.appendChild(anchor);
      paragraph.appendChild(document.createTextNode(' '));
    } else if (source.urlNote) {
      paragraph.appendChild(document.createTextNode(source.urlNote));
    }
    if (source.contact) {
      const contact = document.createElement('span');
      contact.className = 'lab-source-contact';
      contact.textContent = ` Kontak produsen: ${source.contact}.`;
      paragraph.appendChild(contact);
    }
    if (source.providedVia) {
      const via = document.createElement('span');
      via.className = 'lab-source-contact';
      via.textContent = ` Diperoleh via: ${source.providedVia}.`;
      paragraph.appendChild(via);
    }
  } else {
    paragraph.appendChild(document.createTextNode(dataset.dataset.sourceId || NOT_PROVIDED));
  }

  container.appendChild(paragraph);

  /* Catatan derivasi wajib (spec D10/D11). */
  const derivationNote = document.createElement('p');
  derivationNote.className = 'lab-source-derivation';
  derivationNote.textContent = 'Seluruh nilai ISPU di halaman ini adalah nilai TERDERIVASI yang dihitung dari konsentrasi SO₂/NO₂ menggunakan rumus interpolasi PermenLHK P.14/2020 (basis waktu tahap pengukuran, bukan 1-jam resmi). Sumber hanya melaporkan konsentrasi — reportedIndices.ispu = null. Rinciannya di halaman methodology.';
  container.appendChild(derivationNote);
}

export function renderDatasetLimitations({ container, dataset }) {
  container.textContent = '';
  const heading = document.createElement('h3');
  heading.className = 'lab-limitations-heading';
  heading.textContent = 'Keterbatasan dataset ini';
  container.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'lab-limitations-list';
  for (const limitation of dataset.dataset.limitations || []) {
    const item = document.createElement('li');
    item.textContent = limitation;
    list.appendChild(item);
  }
  container.appendChild(list);
}
