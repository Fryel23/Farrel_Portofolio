/*!
 * work/filters.js: project category filters (modularized V11.1-M).
 *
 * Single responsibility: filter UI (render tombol + event) dan SATU
 * owner state `activeFilter`. State diekspor sebagai ESM live binding
 * (export let) sehingga renderProjects membaca nilai terkini tanpa
 * duplikasi state dan tanpa kontrak sinkronisasi manual (M03/M04).
 * Urutan filter, jumlah card, aria, dan empty state tidak berubah.
 */
import { DATA, el, qs, qsa } from '../core.js';

let activeFilter = 'All';
let galleryInView = false;
let emptyWasShown = false;
let batchTriggers = [];

function renderFilters() {
  const host = qs('#filter-controls');
  if (!host || !DATA) return;
  host.textContent = '';
  DATA.filters.forEach((filter) => {
    const button = el('button', 'filter-button', filter === 'All' ? 'All work' : filter);
    button.type = 'button';
    button.dataset.filter = filter;
    if (filter === 'All') button.classList.add('active');
    host.appendChild(button);
  });
}

/* Gallery category filters: the only project filter after V5.3. */
function initFilterControls() {
  qsa('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'All';
      qsa('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
      renderProjects();
    });
  });
}

/* Modularization exports (public API of this feature module).
   activeFilter: live binding - owner tunggal state filter. */
export { renderFilters, initFilterControls, activeFilter };
