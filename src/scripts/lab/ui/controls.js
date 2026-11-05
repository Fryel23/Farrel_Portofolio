/*!
 * lab/ui/controls.js - Kontrol seleksi (region/tahun/lokasi/metric/view).
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

  const yearPills = Array.from(root.querySelectorAll('[data-year-pill]'));
  const metricPills = Array.from(root.querySelectorAll('[data-metric-pill]'));
  const viewPills = Array.from(root.querySelectorAll('[data-view-pill]'));
  const mapNodes = Array.from(root.querySelectorAll('[data-station-id]'));
  const mapReadoutName = root.querySelector('[data-lab-map-name]');
  const mapReadoutCorridor = root.querySelector('[data-lab-map-corridor]');

  function syncPills({ year, metric, view, locationId } = {}) {
    if (year !== undefined) {
      const yrStr = String(year);
      yearPills.forEach((btn) => {
        const active = btn.getAttribute('data-year-pill') === yrStr;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
      });
    }
    if (metric !== undefined) {
      metricPills.forEach((btn) => {
        const active = btn.getAttribute('data-metric-pill') === metric;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
      });
    }
    if (view !== undefined) {
      viewPills.forEach((btn) => {
        const active = btn.getAttribute('data-view-pill') === view;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
      });
    }
    if (locationId !== undefined) {
      let matchedNode = null;
      mapNodes.forEach((node) => {
        const active = node.getAttribute('data-station-id') === locationId;
        node.classList.toggle('is-active', active);
        if (active) matchedNode = node;
      });
      if (mapReadoutName) {
        if (matchedNode) {
          mapReadoutName.textContent = matchedNode.getAttribute('data-station-name') || locationId;
          if (mapReadoutCorridor) {
            mapReadoutCorridor.textContent = matchedNode.getAttribute('data-station-corridor') || 'Titik pantau aktif';
          }
        } else if (locationSelect && locationSelect.selectedIndex >= 0) {
          mapReadoutName.textContent = locationSelect.options[locationSelect.selectedIndex].textContent || locationId;
          if (mapReadoutCorridor) {
            mapReadoutCorridor.textContent = 'Titik pantau DLH Kota Cirebon (dipilih via dropdown)';
          }
        }
      }
    }
  }

  /* Statik: metric & view */
  fillSelect(metricSelect, [
    { value: 'ispu', label: 'ISPU · sub-indeks maksimum (terderivasi)' },
    { value: 'so2', label: 'SO₂ · konsentrasi (µg/Nm³)' },
    { value: 'no2', label: 'NO₂ · konsentrasi (µg/Nm³)' },
  ], { selectedValue: 'ispu' });
  fillSelect(viewSelect, [
    { value: 'trend', label: 'Tren 2021–2025 (satu lokasi)' },
    { value: 'year', label: 'Per lokasi (tahun terpilih)' },
  ], { selectedValue: 'trend' });
  syncPills({ metric: 'ispu', view: 'trend' });

  regionSelect.addEventListener('change', () => handlers.onRegionChange(regionSelect.value));
  yearSelect.addEventListener('change', () => {
    const yr = Number(yearSelect.value);
    syncPills({ year: yr });
    handlers.onYearChange(yr);
  });
  locationSelect.addEventListener('change', () => {
    syncPills({ locationId: locationSelect.value });
    handlers.onLocationChange(locationSelect.value);
  });
  metricSelect.addEventListener('change', () => {
    syncPills({ metric: metricSelect.value });
    handlers.onMetricChange(metricSelect.value);
  });
  viewSelect.addEventListener('change', () => {
    syncPills({ view: viewSelect.value });
    handlers.onViewChange(viewSelect.value);
  });

  /* Segmented Toggle Pills bindings */
  yearPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const yr = Number(btn.getAttribute('data-year-pill'));
      if (!Number.isFinite(yr)) return;
      yearSelect.value = String(yr);
      syncPills({ year: yr });
      handlers.onYearChange(yr);
    });
  });

  metricPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = btn.getAttribute('data-metric-pill');
      if (!m) return;
      metricSelect.value = m;
      syncPills({ metric: m });
      handlers.onMetricChange(m);
    });
  });

  viewPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-view-pill');
      if (!v) return;
      viewSelect.value = v;
      syncPills({ view: v });
      handlers.onViewChange(v);
    });
  });

  /* Interactive Spatial Station Map bindings */
  mapNodes.forEach((node) => {
    const activateStation = () => {
      const stationId = node.getAttribute('data-station-id');
      if (!stationId) return;
      locationSelect.value = stationId;
      syncPills({ locationId: stationId });
      handlers.onLocationChange(stationId);
    };
    node.addEventListener('click', activateStation);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateStation();
      }
    });
  });

  function renderRegions(manifest, selectedRegionId) {
    fillSelect(regionSelect, manifest.regions.map((region) => ({
      value: region.id,
      label: region.status === 'available' || region.status === 'partial'
        ? region.name
        : `${region.name} · ${region.status}`,
      disabled: region.status !== 'available' && region.status !== 'partial',
    })), { selectedValue: selectedRegionId });
  }

  function renderYears(yearEntries, selectedYear) {
    fillSelect(yearSelect, yearEntries.map((yearEntry) => ({
      value: yearEntry.year,
      label: `${yearEntry.year}${yearEntry.status === 'partial' ? ' · parsial' : ''}${yearEntry.status === 'no-data' ? ' · tanpa data' : ''}`,
      disabled: yearEntry.status === 'no-data' || !yearEntry.dataPath,
    })), { selectedValue: selectedYear });
    syncPills({ year: selectedYear });
  }

  function renderLocations(locations, selectedLocationId) {
    fillSelect(locationSelect, locations.map((location) => ({
      value: location.id,
      label: location.name,
    })), { selectedValue: selectedLocationId });
    syncPills({ locationId: selectedLocationId });
  }

  function setValues({ regionId, year, locationId, metric, view }) {
    if (regionId !== undefined) regionSelect.value = regionId;
    if (year !== undefined) yearSelect.value = String(year);
    if (locationId !== undefined) locationSelect.value = locationId;
    if (metric !== undefined) metricSelect.value = metric;
    if (view !== undefined) viewSelect.value = view;
    syncPills({ year, locationId, metric, view });
  }

  function setBusy(isBusy) {
    /* Jangan kunci seluruh halaman (spec §13.2); cukup tandai panel kontrol.
       C1: guard elemen tidak ada (mis. teardown/variant markup tanpa panel)
       supaya tidak melempar TypeError saat root tersedia tapi panel absen. */
    const panel = root.querySelector('[data-lab-controls]');
    if (!panel) return;
    panel.setAttribute('data-busy', isBusy ? 'true' : 'false');
  }

  return { renderRegions, renderYears, renderLocations, setValues, setBusy };
}
