/*!
 * lab/index.js - Orchestrator Data Lab (spec §12.1).
 *
 * Single responsibility: mengoordinasikan manifest loading → UI init →
 * dataset selection → loader → kalkulasi/statistik → chart controller →
 * cleanup. TIDAK berisi implementasi parser/statistik/chart config (semua
 * di modul masing-masing).
 *
 * State model eksplisit (spec §8.4): idle | loading-manifest | loading-dataset
 * | ready | empty | unavailable | error) : satu sumber kebenaran di objek
 * `state`, tidak tersebar antar modul.
 *
 * Race protection (spec §8.2): request token + AbortController : hasil
 * request lama dibuang dan tidak pernah menimpa pilihan terbaru; hanya SATU
 * instance chart (controller line-chart).
 *
 * Lifecycle (spec §12.3): modul ini hanya dieksekusi sekali per sesi; init
 * per navigasi dipicu bootPage (facade lab.js) yang berjalan pada
 * astro:page-load; teardown dijalankan pada astro:before-swap milik modul
 * ini (satu listener, owner jelas). Chart.js TIDAK didaftarkan ke
 * motionRegistry (bukan WebGL resource).
 */

import { loadManifest, LabError } from './data/manifest-loader.js';
import { loadDataset } from './data/dataset-loader.js';
import { createControls } from './ui/controls.js';
import { createStatusView } from './ui/status-view.js';
import { renderMetrics } from './ui/metrics.js';
import { renderDataTable, renderTableEmptyMessage } from './ui/data-table.js';
import { renderContextStrip, renderSourceNote, renderDatasetLimitations } from './ui/render.js';
import { createLineChartController } from './charts/line-chart.js';
import { buildChartConfig } from './charts/chart-config.js';
import { mean, countValid, validPercentage } from './shared/stats.js';
import { getDominantParameterSummary, getISPUCategory } from './core/aqi-calculator.js';
import { parameterLabel, formatPercent } from './core/formatters.js';

/* ====================================================================== */
/* Referensi instance aktif (satu per dokumen) + lifecycle router          */
/* ====================================================================== */
let activeInstance = null;

document.addEventListener('astro:before-swap', () => {
  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }
});

export function initDataLab() {
  const root = document.querySelector('[data-lab-root]');
  if (!root) return; /* bukan halaman /lab; tidak ada yang dilakukan */
  if (activeInstance) activeInstance.destroy(); /* jaga-jaga re-init */
  activeInstance = createDataLab(root);
  activeInstance.init();
}

/* ====================================================================== */
function createDataLab(root) {
  /* --- DOM refs --- */
  const refs = {
    status: root.querySelector('[data-lab-status]'),
    retry: root.querySelector('[data-lab-retry]'),
    context: root.querySelector('[data-lab-context]'),
    metrics: root.querySelector('[data-lab-metrics]'),
    canvas: root.querySelector('[data-lab-canvas]'),
    chartOverlay: root.querySelector('[data-lab-chart-overlay]'),
    chartFigure: root.querySelector('[data-lab-chart-figure]'),
    table: root.querySelector('[data-lab-table]'),
    sourceNote: root.querySelector('[data-lab-source-note]'),
    limitations: root.querySelector('[data-lab-limitations]'),
    controlsPanel: root.querySelector('[data-lab-controls]'),
  };

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const statusView = createStatusView({ statusElement: refs.status });
  const chart = createLineChartController({ canvas: refs.canvas, overlay: refs.chartOverlay });

  /* --- State tunggal (sumber kebenaran) --- */
  const state = {
    status: 'idle',
    manifest: null,
    regionId: null,
    year: null,
    locationId: null,
    metric: 'ispu',
    view: 'trend',
    locationTouched: false, /* false = orchestrator boleh auto-pilih lokasi yang ada di dataset */
  };

  /* --- Race protection --- */
  let requestSequence = 0;
  let datasetAbortController = null;
  let lastAction = null; /* 'manifest' | 'dataset' : untuk retry */

  /* --- Listener registry (cleanup deterministik) --- */
  const listenerController = new AbortController();
  const { signal: listenerSignal } = listenerController;
  reducedMotionQuery.addEventListener('change', () => {
    if (state.status === 'ready' || state.status === 'empty') scheduleChartRefresh();
  }, { signal: listenerSignal });

  const controls = createControls({
    root,
    handlers: {
    onRegionChange: (regionId) => {
      state.regionId = regionId;
      state.locationTouched = false; /* region baru → izinkan auto-pilih ulang */
      const region = findRegion();
      controls.renderYears(region ? region.years : [], state.year);
      applyDefaultYear(region);
      loadSelectedDataset();
    },
    onYearChange: (year) => {
      state.year = year;
      loadSelectedDataset();
    },
    onLocationChange: (locationId) => {
      state.locationId = locationId;
      state.locationTouched = true; /* pilihan eksplisit user, jangan diganti otomatis */
      scheduleChartRefresh();
    },
    onMetricChange: (metric) => {
      state.metric = metric;
      scheduleChartRefresh();
    },
    onViewChange: (view) => {
      state.view = view;
      scheduleChartRefresh();
    },
    },
  });

  if (refs.retry) {
    refs.retry.addEventListener('click', () => {
      if (lastAction === 'manifest') init();
      else if (lastAction === 'dataset') loadSelectedDataset();
    }, { signal: listenerSignal });
  }

  function findRegion() {
    return (state.manifest.regions || []).find((region) => region.id === state.regionId) || null;
  }

  function findLocationLabel() {
    const region = findRegion();
    const location = region && (region.locations || []).find((candidate) => candidate.id === state.locationId);
    return location ? location.name : state.locationId;
  }

  function setStatus(status) {
    state.status = status;
    statusView.set(status);
    controls.setBusy(status === 'loading-manifest' || status === 'loading-dataset');
    if (refs.retry) {
      refs.retry.hidden = !(status === 'error' || status === 'unavailable');
    }
  }

  function applyDefaultYear(region) {
    const loadableYears = (region.years || []).filter((yearEntry) => yearEntry.dataPath);
    if (loadableYears.length > 0) {
      /* Default: tahun terbaru yang benar-benar punya dataset. */
      state.year = loadableYears[loadableYears.length - 1].year;
    }
    controls.renderYears(region.years || [], state.year);
  }

  /* ==================================================================== */
  /* INIT: manifest → controls → dataset pertama                           */
  /* ==================================================================== */
  async function init() {
    lastAction = 'manifest';
    setStatus('loading-manifest');
    if (refs.retry) refs.retry.hidden = true;
    try {
      const manifest = await loadManifest();
      state.manifest = manifest;
      state.regionId = manifest.defaultRegionId;
      const region = findRegion();
      if (!region) throw new LabError('manifest-invalid', 'Region default tidak ditemukan.');

      controls.renderRegions(manifest, state.regionId);
      const locations = region.locations || [];
      state.locationId = locations.length > 0 ? locations[0].id : null;
      controls.renderLocations(locations, state.locationId);
      applyDefaultYear(region);
      await loadSelectedDataset();
    } catch (error) {
      handleLoadError(error, 'manifest');
    }
  }

  /* ==================================================================== */
  /* DATASET: fetch (race-protected) → render seluruh panel                */
  /* ==================================================================== */
  async function loadSelectedDataset() {
    lastAction = 'dataset';
    const token = ++requestSequence;
    if (datasetAbortController) datasetAbortController.abort();
    datasetAbortController = new AbortController();
    const { signal } = datasetAbortController;

    setStatus('loading-dataset');
    /* Nilai lama tidak boleh terlihat seperti milik selector baru
       (spec §13.2): kosongkan panel data saat transisi. */
    renderMetrics(refs.metrics, null);
    refs.context.textContent = '';
    renderTableEmptyMessage(refs.table, 'Memuat data…');
    chart.showEmpty('Dataset sedang dimuat…');

    try {
      const { dataset, region, yearEntry } = await loadDataset(state.manifest, state.regionId, state.year, { signal });
      if (token !== requestSequence) return; /* stale; buang tanpa render */
      state.status = Array.isArray(dataset.records) && dataset.records.length > 0 ? 'ready' : 'empty';
      renderAll({ dataset, region, yearEntry });
    } catch (error) {
      if (token !== requestSequence) return; /* request sudah usang */
      handleLoadError(error, 'dataset');
    }
  }

  function handleLoadError(error, action) {
    const isAbort = error instanceof LabError && error.code === 'aborted';
    if (isAbort) return; /* dibatalkan karena request lebih baru, bukan error nyata */
    if (error instanceof LabError && (error.code === 'dataset-fetch')) {
      setStatus('unavailable');
      statusView.announce(`Dataset tidak tersedia: ${error.message}`);
      renderTableEmptyMessage(refs.table, `Tidak ada data yang dapat ditampilkan: ${error.message}`);
      chart.showEmpty(error.message);
      return;
    }
    setStatus('error');
    const detail = error instanceof LabError && Array.isArray(error.details)
      ? `${error.message} (${error.details.slice(0, 3).join(' ')})`
      : (error && error.message) || 'Kesalahan tidak diketahui.';
    statusView.announce(`Kesalahan memuat data: ${detail}`);
    renderTableEmptyMessage(refs.table, `Data tidak dapat ditampilkan: ${detail}`);
    chart.showError(detail);
    void action; /* lastAction sudah mencatat konteks retry */
  }

  /* ==================================================================== */
  /* RENDER: konteks, metrik, tabel, chart : dari dataset yang sama        */
  /* ==================================================================== */
  function renderAll({ dataset, region, yearEntry }) {
    statusView.set(state.status === 'ready' ? 'ready' : 'empty');

    /* Auto-pilih lokasi: sebelum user memilih manual, pastikan lokasi aktif
       benar-benar terukur pada dataset tahun ini (menghindari landing pada
       kombinasi kosong yang membingungkan). Tetap jujur: bila user sudah
       memilih dan lokasinya tak ada, empty state yang ditampilkan. */
    if (!state.locationTouched) {
      const presentIds = [...new Set(dataset.records.map((record) => record.locationId))].sort((a, b) => a.localeCompare(b, 'id'));
      if (presentIds.length > 0 && !presentIds.includes(state.locationId)) {
        state.locationId = presentIds[0];
      }
    }
    controls.setValues({ year: state.year, locationId: state.locationId });

    renderContextStrip({ container: refs.context, region, yearEntry, dataset, manifest: state.manifest });
    renderSourceNote({ container: refs.sourceNote, dataset, manifest: state.manifest });
    renderDatasetLimitations({ container: refs.limitations, dataset });

    if (state.status === 'empty') {
      renderMetrics(refs.metrics, null);
      renderTableEmptyMessage(refs.table, 'Tidak ada record untuk dataset ini.');
      chart.showEmpty('Dataset tidak memuat record.');
      return;
    }

    renderMetrics(refs.metrics, computeMetrics(dataset));
    renderDataTable(refs.table, { dataset });
    scheduleChartRefresh({ dataset });
  }

  /**
   * Chart diperbarui terpisah dari panel lain (spec §16.3: hanya komponen
   * yang berubah). Bila dataset tidak di-pass, pakai cache terakhir.
   */
  let currentDataset = null;
  function scheduleChartRefresh({ dataset } = {}) {
    if (dataset) currentDataset = dataset;
    if (!currentDataset || !state.manifest) return;
    const region = findRegion();
    refreshChart({ regionYears: region ? region.years : [] });
  }

  /* ==================================================================== */
  /* DATA LINTAS TAHUN UNTUK VIEW TREND (lazy + cache + race token)         */
  /* Dataset tahunan hanya memuat record tahun itu; view tren memerlukan    */
  /* record satu lokasi di seluruh tahun. Dataset dimuat on-demand lewat    */
  /* dataset-loader yang sama (cache bounded; tidak pernah di-fetch di      */
  /* homepage; hanya ketika user berada di /lab dengan view trend).        */
  /* ==================================================================== */
  let trendToken = 0;
  /* C4: controller untuk membatalkan fetch trend in-flight saat destroy().
     Sengaja TIDAK dipakai untuk abort antar request trend (lihat komentar
     di collectRegionRecords: promise-cache bersama membuat abort antar
     request berbahaya; trendToken sudah menjamin keusangan hasil). */
  let trendAbortController = null;

  async function collectRegionRecords() {
    const region = findRegion();
    const loadableYears = ((region && region.years) || []).filter((yearEntry) => yearEntry.dataPath);
    const token = ++trendToken;
    trendAbortController = new AbortController();
    const { signal } = trendAbortController;
    try {
      const results = await Promise.all(loadableYears.map(async (yearEntry) => {
        const { dataset } = await loadDataset(state.manifest, state.regionId, yearEntry.year, { signal });
        return { year: yearEntry.year, dataset };
      }));
      if (token !== trendToken) return null; /* usang; dibuang tanpa render */
      const records = [];
      for (const { dataset } of results) records.push(...dataset.records);
      return records;
    } catch (error) {
    /* C4: abort adalah alur normal (destroy()/teardown navigasi), bukan
       error. Request lama saat request baru TIDAK di-abort di jalur trend:
       loader memakai promise-cache bersama per dataPath, sehingga mem-abort
       fetch lama juga mematikan fetch yang sedang dipakai ulang request
       baru; keusangan hasil sudah dijamin trendToken. Abort di destroy()
       aman karena seluruh instance sedang dibongkar. */
    if (error instanceof LabError && error.code === 'aborted') return null;
    throw error;
  }
  }

  async function refreshChart({ regionYears }) {
    const capturedToken = trendToken; /* C4: guard catch agar error request usang tidak menimpa render terbaru */
    try {
      let chartRecords;
      if (state.view === 'trend') {
        const collected = await collectRegionRecords();
        if (collected === null) return; /* request usang */
        chartRecords = collected;
      } else {
        chartRecords = currentDataset ? currentDataset.records : [];
      }
      const config = buildChartConfig({
        regionYears,
        records: chartRecords,
        state: { ...state, locationLabel: findLocationLabel() },
        reducedMotion: reducedMotionQuery.matches,
        compactAxis: window.matchMedia('(max-width: 760px)').matches,
      });
      const hasAnyPoint = config.data.datasets.some((datasetConfig) => datasetConfig.data.some((value) => value !== null));
      if (!hasAnyPoint) {
        chart.showEmpty('Tidak ada titik data untuk kombinasi lokasi/tahun/metric ini (gap bukan nol, spec §11.3).');
        return;
      }
      await chart.render(config);
    } catch (error) {
      /* C4: hasil/error request yang sudah usang tidak boleh menimpa render
         pilihan terbaru. */
      if (capturedToken !== trendToken) return;
      /* Chart.js gagal import/inisialisasi : tabel tetap tersedia
         (spec §13.5: chart failure tidak boleh menghilangkan data table). */
      chart.showError(`Pustaka chart gagal dimuat: ${(error && error.message) || error}. Nilai tetap tersedia pada tabel data di bawah.`);
    }
  }

  /* ==================================================================== */
  /* Kalkulasi metrik ringkasan (pure functions dari core)                 */
  /* ==================================================================== */
  function computeMetrics(dataset) {
    const records = dataset.records || [];
    const ispuValues = records.map((record) => (record.derived && record.derived.ispuStatus === 'valid' ? record.derived.ispu : null));
    const validCount = countValid(ispuValues);
    if (validCount === 0) {
      return { status: 'no-data' };
    }

    const meanValue = mean(ispuValues);
    let maxRecord = null;
    for (const record of records) {
      if (record.derived && record.derived.ispuStatus === 'valid') {
        if (!maxRecord || record.derived.ispu > maxRecord.derived.ispu) maxRecord = record;
      }
    }

    const dominantSummary = getDominantParameterSummary(records);
    const coveragePercent = validPercentage(ispuValues, { decimals: 1 });

    const meanCategory = getMeanCategory(meanValue);
    return {
      status: 'valid',
      meanIspu: {
        value: meanValue,
        recordCount: validCount,
        totalRecords: records.length,
        year: dataset.year,
        categoryToken: meanCategory,
      },
      maxIspu: {
        value: maxRecord ? maxRecord.derived.ispu : null,
        location: maxRecord ? maxRecord.location : '-',
        stage: maxRecord ? maxRecord.period.stage : '-',
        category: maxRecord ? maxRecord.derived.category : '-',
        categoryToken: maxRecord && maxRecord.derived.category ? categoryTokenOf(maxRecord.derived.ispu) : null,
      },
      dominant: {
        value: dominantSummary.status === 'valid' ? parameterLabel(dominantSummary.leader) : 'Tidak dapat ditentukan',
        detail: dominantSummary.status === 'valid'
          ? `Argmax sub-indeks pada ${dominantSummary.counts[dominantSummary.leader] || 0} dari ${dominantSummary.sampleSize} record valid (SO₂: ${dominantSummary.counts.so2 || 0}, NO₂: ${dominantSummary.counts.no2 || 0}). Hanya parameter tersedia yang dibandingkan.`
          : 'Tidak ada pasangan sub-indeks valid untuk dibandingkan.',
      },
      coverage: {
        value: formatPercent(coveragePercent),
        detail: `${validCount} dari ${records.length} record punya ISPU terderivasi valid (parameter hilang tidak dihitung 0).`,
      },
    };
  }

  function getMeanCategory(meanValue) {
    if (!Number.isFinite(meanValue)) return null;
    const result = getISPUCategory(meanValue);
    return result.status === 'valid' ? result.token : null;
  }
  function categoryTokenOf(value) {
    const result = getISPUCategory(value);
    return result.status === 'valid' ? result.token : null;
  }

  /* ==================================================================== */
  /* CLEANUP (spec §11.4, §12.1)                                           */
  /* ==================================================================== */
  function destroy() {
    requestSequence += 1; /* invalidasi semua result in-flight */
    trendToken += 1; /* invalidasi collect lintas tahun in-flight */
    if (datasetAbortController) datasetAbortController.abort();
    datasetAbortController = null;
    /* C4: batalkan fetch trend yang masih berjalan saat teardown (hasilnya
       tidak akan dipakai lagi). Loader menghapus promise gagal dari cache,
       sehingga abort di sini tidak meninggalkan rejected promise permanen. */
    if (trendAbortController) trendAbortController.abort();
    trendAbortController = null;
    listenerController.abort();
    chart.destroy();
    currentDataset = null;
  }

  return { init, destroy };
}
