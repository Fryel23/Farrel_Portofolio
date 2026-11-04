/*!
 * lab/ui/controls.js — Kontrol seleksi (region/tahun/lokasi/metric/view).
 *
 * Single responsibility: mengikat <select> native ke callback orchestrator
 * (spec §14.2: native select, tanpa custom dropdown). Semua option dibangun
 * via createElement + textContent (aman terhadap data, spec §13.7). Tahun
 * tanpa dataset tampil disabled dengan label status yang jujur (spec §9.2-C).
 */

function fillSelect(selectElement, options, { selectedValue, includeBlank = null } = {}) {
  selectElement.textContent = '';
  if (includeBlank !== null) {
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = includeBlank;
    selectElement.appendChild(blankOption);
  }
  for (const option of options) {
    const optionElement = document.createElement('option');
    optionElement.value = String(option.value);
    optionElement.textContent = option.label;
    optionElement.disabled = Boolean(option.disabled);
    if (selectedValue !== undefined && String(option.value) === String(selectedValue)) {
      optionElement.selected = true;
    }
    selectElement.appendChild(optionElement);
  }
}

export function createControls({ root, handlers }) {
  const regionSelect = root.querySelector('[data-lab-region]');
  const yearSelect = root.querySelector('[data-lab-year]');
  const locationSelect = root.querySelector('[data-lab-location]');
  const metricSelect = root.querySelector('[data-lab-metric]');
  const viewSelect = root.querySelector('[data-lab-view]');

  /* Statik: metric & view */
  fillSelect(metricSelect, [
    { value: 'ispu', label: 'ISPU — sub-indeks maksimum (terderivasi)' },
    { value: 'so2', label: 'SO₂ — konsentrasi (µg/Nm³)' },
    { value: 'no2', label: 'NO₂ — konsentrasi (µg/Nm³)' },
  ], { selectedValue: 'ispu' });
  fillSelect(viewSelect, [
    { value: 'trend', label: 'Tren 2021–2025 (satu lokasi)' },
    { value: 'year', label: 'Per lokasi (tahun terpilih)' },
  ], { selectedValue: 'trend' });

  regionSelect.addEventListener('change', () => handlers.onRegionChange(regionSelect.value));
  yearSelect.addEventListener('change', () => handlers.onYearChange(Number(yearSelect.value)));
  locationSelect.addEventListener('change', () => handlers.onLocationChange(locationSelect.value));
  metricSelect.addEventListener('change', () => handlers.onMetricChange(metricSelect.value));
  viewSelect.addEventListener('change', () => handlers.onViewChange(viewSelect.value));

  function renderRegions(manifest, selectedRegionId) {
    fillSelect(regionSelect, manifest.regions.map((region) => ({
      value: region.id,
      label: region.status === 'available' || region.status === 'partial'
        ? region.name
        : `${region.name} — ${region.status}`,
      disabled: region.status !== 'available' && region.status !== 'partial',
    })), { selectedValue: selectedRegionId });
  }

  function renderYears(yearEntries, selectedYear) {
    fillSelect(yearSelect, yearEntries.map((yearEntry) => ({
      value: yearEntry.year,
      label: `${yearEntry.year}${yearEntry.status === 'partial' ? ' — parsial' : ''}${yearEntry.status === 'no-data' ? ' — tanpa data' : ''}`,
      disabled: yearEntry.status === 'no-data' || !yearEntry.dataPath,
    })), { selectedValue: selectedYear });
  }

  function renderLocations(locations, selectedLocationId) {
    fillSelect(locationSelect, locations.map((location) => ({
      value: location.id,
      label: location.name,
    })), { selectedValue: selectedLocationId });
  }

  function setValues({ regionId, year, locationId, metric, view }) {
    if (regionId !== undefined) regionSelect.value = regionId;
    if (year !== undefined) yearSelect.value = String(year);
    if (locationId !== undefined) locationSelect.value = locationId;
    if (metric !== undefined) metricSelect.value = metric;
    if (view !== undefined) viewSelect.value = view;
  }

  function setBusy(isBusy) {
    /* Jangan kunci seluruh halaman (spec §13.2); cukup tandai panel kontrol. */
    root.querySelector('[data-lab-controls]').setAttribute('data-busy', isBusy ? 'true' : 'false');
  }

  return { renderRegions, renderYears, renderLocations, setValues, setBusy };
}
