/*!
 * lab/csv.js - Entry CSV Explorer (V12.3, spec §8, §10).
 *
 * Single responsibility: state UI, event, lifecycle Worker, dan Chart.js
 * untuk halaman /lab/csv. TIDAK memuat parsing/statistik (semua di
 * shared/ di dalam Worker) dan TIDAK menyentuh AQI Explorer: modul ini
 * hanya diimpor oleh src/pages/lab/csv.astro sehingga homepage tidak pernah
 * memuat chunk CSV/Chart.js (route isolation, spec §10.1).
 *
 * Arsitektur data (amanat tambahan FASE 5): UI TIDAK menerima data mentah.
 * Worker hanya mengirim metadata kolom, maksimal 5 baris pratinjau, hasil
 * statistik, dan data chart maksimal 5.000 titik.
 *
 * Worker dibuat dengan sintaks Vite yang diwajibkan (tanpa import statis):
 *   new Worker(new URL('./workers/csv-worker.js', import.meta.url), { type: 'module' })
 * Segmen path relatif mengikuti lokasi file aktual sesuai spec §2.1:
 * csv.js berada di src/scripts/lab/, worker di src/scripts/lab/workers/.
 *
 * Race protection (spec §7.5, §10.5): generation counter + requestId.
 * Penggantian file ME-TERMINATE Worker lama dan membuat instance baru
 * (pembatalan yang dapat diandalkan untuk pekerjaan sinkron di Worker),
 * sehingga hasil file lama tidak pernah menimpa file baru.
 *
 * Lifecycle (pola facade V11.1-M + teardown lab/index.js): bootPage
 * menjalankan init sekali per epoch navigasi; astro:before-swap
 * mem-terminate Worker, menghancurkan chart, dan membebaskan referensi
 * file. Semua listener terikat pada satu AbortController.
 */

import { bootPage } from '../core/page-lifecycle.js';
import { createLineChartController } from './charts/line-chart.js';
import { LIMITS } from './shared/csv-analysis.js';
import { formatNumber } from './core/formatters.js';

/* Token visual yang sama dengan chart-config.js (konsistensi design system). */
const FONT_MONO = "'DM Mono', 'SFMono-Regular', Consolas, monospace";
const COLOR_BLUE = '#2563EB';
const COLOR_INK = '#0F172A';
const COLOR_TEXT_2 = '#475569';
const COLOR_GRID = '#E2E8F0';

const TYPE_LABELS = { numeric: 'Numerik', date: 'Tanggal', categorical: 'Kategorikal' };

/* ====================================================================== */
/* Referensi instance aktif + lifecycle router (pola lab/index.js)         */
/* ====================================================================== */
let activeInstance = null;

document.addEventListener('astro:before-swap', () => {
  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }
});

function initCsvExplorer() {
  const root = document.querySelector('[data-csv-root]');
  if (!root) return; /* bukan halaman /lab/csv */
  if (activeInstance) activeInstance.destroy(); /* jaga-jaga re-init */
  activeInstance = createCsvExplorer(root);
}

bootPage({ interactions: [initCsvExplorer] });

/* ====================================================================== */
function createCsvExplorer(root) {
  const refs = {
    status: root.querySelector('[data-csv-status]'),
    error: root.querySelector('[data-csv-error]'),
    dropzone: root.querySelector('[data-csv-dropzone]'),
    input: root.querySelector('[data-csv-input]'),
    browse: root.querySelector('[data-csv-browse]'),
    reset: root.querySelector('[data-csv-reset]'),
    results: root.querySelector('[data-csv-results]'),
    fileSummary: root.querySelector('[data-csv-file-summary]'),
    preview: root.querySelector('[data-csv-preview]'),
    columns: root.querySelector('[data-csv-columns]'),
    stats: root.querySelector('[data-csv-stats]'),
    statsEmpty: root.querySelector('[data-csv-stats-empty]'),
    chartPanel: root.querySelector('[data-csv-chart-panel]'),
    chartUnavailable: root.querySelector('[data-csv-chart-unavailable]'),
    xSelect: root.querySelector('[data-csv-x]'),
    ySelect: root.querySelector('[data-csv-y]'),
    canvas: root.querySelector('[data-csv-canvas]'),
    overlay: root.querySelector('[data-csv-chart-overlay]'),
    chartCaption: root.querySelector('[data-csv-chart-caption]'),
  };

  const chart = createLineChartController({ canvas: refs.canvas, overlay: refs.overlay });

  /* --- State tunggal --- */
  const state = {
    phase: 'idle', /* idle | processing | ready */
    generation: 0, /* naik saat ganti file / reset / destroy */
    analysis: null, /* payload ANALYSIS_SUCCESS (tanpa data mentah) */
    worker: null,
    requestSequence: 0,
    latestAnalysisRequestId: null,
    latestChartRequestId: null,
    latestChartGeneration: -1,
  };

  /* --- Listener registry (cleanup deterministik) --- */
  const listenerController = new AbortController();
  const { signal: listenerSignal } = listenerController;

  /* ==================================================================== */
  /* WORKER (dibuat lazy; di-terminate saat ganti file/reset/destroy)      */
  /* ==================================================================== */
  function ensureWorker() {
    if (state.worker) return state.worker;
    const worker = new Worker(new URL('./workers/csv-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => handleWorkerMessage(event.data);
    worker.onerror = () => {
      /* Error fatal Worker: kembalikan UI ke state konsisten. */
      handleWorkerFailure('Worker gagal berjalan. Coba unggah ulang file.');
    };
    state.worker = worker;
    return worker;
  }

  function replaceWorker() {
    if (state.worker) {
      state.worker.terminate(); /* pembatalan pekerjaan aktif (spec §7.5) */
      state.worker = null;
    }
    activeFileReleased = null; /* referensi file dilepas */
  }

  let activeFileReleased = null; /* jejak referensi file aktif (untuk reset) */

  function handleWorkerMessage(message) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'ANALYSIS_SUCCESS') {
      if (message.requestId !== state.latestAnalysisRequestId) return; /* usang */
      handleAnalysisSuccess(message.payload);
      return;
    }

    if (message.type === 'CHART_SUCCESS') {
      if (message.requestId !== state.latestChartRequestId) return; /* usang */
      if (state.latestChartGeneration !== state.generation) return;
      handleChartSuccess(message.payload);
      return;
    }

    if (message.type === 'WORKER_ERROR') {
      if (message.requestId === state.latestAnalysisRequestId || message.requestId === state.latestChartRequestId) {
        handleWorkerFailure(message.message || 'Gagal memproses file CSV.');
      }
    }
  }

  function handleWorkerFailure(message) {
    if (state.phase === 'processing') {
      showError(message);
      setPhase('idle');
    } else if (state.phase === 'ready') {
      /* Kegagalan saat mengganti konfigurasi chart: pertahankan hasil
         analisis, cukup laporkan pada area grafik. */
      chart.showError(message);
    }
  }

  /* ==================================================================== */
  /* FLOW: pilih file → validasi → ANALYZE_FILE                            */
  /* ==================================================================== */
  function handleFiles(fileList) {
    clearError();
    if (state.phase === 'processing') return; /* cegah double submission */

    if (!fileList || fileList.length === 0) {
      showError('File belum dipilih. Pilih satu file CSV.');
      return;
    }
    if (fileList.length > 1) {
      showError('Hanya satu file yang didukung. Pilih satu file CSV.');
      return;
    }
    const file = fileList[0];
    if (!/\.csv$/i.test(file.name)) {
      showError(`Format file tidak didukung ("${file.name}" bukan berekstensi .csv). Simpan data sebagai CSV.`);
      return;
    }
    if (file.size === 0) {
      showError('File kosong (0 byte). Pilih file CSV berisi data.');
      return;
    }
    if (file.size > LIMITS.MAX_FILE_BYTES) {
      showError(`Ukuran file ${formatBytes(file.size)} melebihi batas ${Math.round(LIMITS.MAX_FILE_BYTES / (1024 * 1024))} MiB.`);
      return;
    }
    startAnalysis(file);
  }

  function startAnalysis(file) {
    state.generation += 1;
    replaceWorker(); /* terminate lama + buat baru: tidak ada hasil basi */
    clearResults();

    setPhase('processing');
    setStatus(`Memproses ${file.name}…`);

    const worker = ensureWorker();
    const requestId = ++state.requestSequence;
    state.latestAnalysisRequestId = requestId;
    activeFileReleased = file; /* hanya referensi; isi tidak dibaca di main thread */
    worker.postMessage({ type: 'ANALYZE_FILE', requestId, file });
  }

  function handleAnalysisSuccess(payload) {
    state.analysis = payload;
    setPhase('ready');
    setStatus('File selesai dianalisis.');
    renderFileSummary(payload);
    renderPreview(payload);
    renderColumns(payload.columns);
    renderStats(payload);
    setupChartControls(payload);
  }

  /* ==================================================================== */
  /* FLOW: reset & destroy                                                 */
  /* ==================================================================== */
  function resetExplorer() {
    state.generation += 1;
    replaceWorker(); /* terminate + lepaskan referensi file (spec §8.7) */
    chart.destroy();
    state.analysis = null;
    state.latestAnalysisRequestId = null;
    state.latestChartRequestId = null;
    clearResults();
    clearError();
    if (refs.input) refs.input.value = ''; /* file sama boleh dipilih ulang */
    setPhase('idle');
    setStatus('Menunggu file CSV…');
  }

  function destroy() {
    state.generation += 1;
    replaceWorker(); /* terminate Worker + lepaskan file (spec §10.4) */
    chart.destroy();
    listenerController.abort();
    state.analysis = null;
    state.latestAnalysisRequestId = null;
    state.latestChartRequestId = null;
  }

  /* ==================================================================== */
  /* RENDER: ringkasan file, pratinjau, kolom, statistik                   */
  /* ==================================================================== */
  function renderFileSummary(payload) {
    const container = refs.fileSummary;
    container.textContent = '';

    const nameRow = document.createElement('p');
    nameRow.className = 'csv-file-name';
    nameRow.textContent = payload.file.name || 'File CSV';

    const metaRow = document.createElement('p');
    metaRow.className = 'csv-file-meta';
    const parts = [];
    if (payload.file.sizeBytes !== null) parts.push(formatBytes(payload.file.sizeBytes));
    parts.push(`${formatNumber(payload.rowCount)} baris data`);
    parts.push(`${formatNumber(payload.columnCount)} kolom`);
    metaRow.textContent = parts.join(' · ');

    container.appendChild(nameRow);

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'lab-retry csv-reset-inline';
    resetButton.textContent = 'Hapus file';
    resetButton.addEventListener('click', () => resetExplorer(), { signal: listenerSignal });
    container.appendChild(resetButton);
    container.appendChild(metaRow);

    if (payload.warnings.hasWarnings) {
      const warning = document.createElement('p');
      warning.className = 'csv-warning-note';
      const bits = [];
      if (payload.warnings.normalizedRecordCount > 0) {
        bits.push(`${formatNumber(payload.warnings.normalizedRecordCount)} baris lebih pendek dari header dan dilengkapi nilai kosong`);
      }
      if (payload.warnings.blankLinesSkipped > 0) {
        bits.push(`${formatNumber(payload.warnings.blankLinesSkipped)} baris kosong dilewati`);
      }
      warning.textContent = `Catatan: ${bits.join('; ')}.`;
      container.appendChild(warning);
    }
  }

  function renderPreview(payload) {
    const container = refs.preview;
    container.textContent = '';

    const table = document.createElement('table');
    table.className = 'lab-table csv-table';

    const caption = document.createElement('caption');
    const shown = payload.preview.rows.length;
    caption.textContent = shown < payload.rowCount
      ? `Pratinjau ${shown} baris pertama dari ${formatNumber(payload.rowCount)} baris.`
      : `Pratinjau seluruh ${formatNumber(payload.rowCount)} baris.`;
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const column of payload.columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = column.displayName;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const record of payload.preview.rows) {
      const tr = document.createElement('tr');
      for (const cell of record) {
        const td = document.createElement('td');
        td.textContent = cell; /* textContent saja - tidak ada innerHTML */
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const wrap = document.createElement('div');
    wrap.className = 'lab-table-wrap csv-table-wrap';
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderColumns(columns) {
    const container = refs.columns;
    container.textContent = '';

    const table = document.createElement('table');
    table.className = 'lab-table csv-table';

    const caption = document.createElement('caption');
    caption.textContent = 'Tipe setiap kolom dan kelengkapan nilainya (dihitung dari seluruh baris).';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Kolom', 'Tipe', 'Nilai valid', 'Missing']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const column of columns) {
      const tr = document.createElement('tr');

      const nameCell = document.createElement('th');
      nameCell.scope = 'row';
      nameCell.textContent = column.displayName;
      if (column.name && column.name.trim() !== column.displayName) {
        nameCell.title = `Nama asli: ${column.name}`;
      }
      tr.appendChild(nameCell);

      const typeCell = document.createElement('td');
      typeCell.textContent = TYPE_LABELS[column.type] || column.type;
      tr.appendChild(typeCell);

      const validCell = document.createElement('td');
      validCell.className = 'lab-number';
      validCell.textContent = formatNumber(column.validCount);
      tr.appendChild(validCell);

      const missingCell = document.createElement('td');
      missingCell.className = 'lab-number';
      missingCell.textContent = formatNumber(column.missingCount);
      tr.appendChild(missingCell);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const wrap = document.createElement('div');
    wrap.className = 'lab-table-wrap csv-table-wrap';
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderStats(payload) {
    const container = refs.stats;
    const emptyState = refs.statsEmpty;
    container.textContent = '';
    if (emptyState) emptyState.hidden = true;

    const numericColumns = payload.columns.filter((column) => column.type === 'numeric');
    if (numericColumns.length === 0) {
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'Tidak ada kolom numerik pada file ini, sehingga tabel statistik tidak tersedia. Statistik deskriptif (Mean, Median, Min, Max) hanya dihitung untuk kolom numerik.';
      }
      return;
    }

    const table = document.createElement('table');
    table.className = 'lab-table csv-table';

    const caption = document.createElement('caption');
    caption.textContent = 'Statistik dihitung di Worker dari seluruh baris data (bukan pratinjau atau sampel).';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Kolom', 'Mean', 'Median', 'Min', 'Max', 'Missing']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const column of numericColumns) {
      const stats = payload.stats[column.id];
      if (!stats) continue;
      const tr = document.createElement('tr');

      const nameCell = document.createElement('th');
      nameCell.scope = 'row';
      nameCell.textContent = column.displayName;
      tr.appendChild(nameCell);

      for (const key of ['mean', 'median', 'min', 'max']) {
        const cell = document.createElement('td');
        cell.className = 'lab-number';
        cell.textContent = formatNumber(stats[key], { maxFractionDigits: 4 });
        tr.appendChild(cell);
      }

      const missingCell = document.createElement('td');
      missingCell.className = 'lab-number';
      missingCell.textContent = formatNumber(stats.missingCount);
      tr.appendChild(missingCell);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const wrap = document.createElement('div');
    wrap.className = 'lab-table-wrap csv-table-wrap';
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  /* ==================================================================== */
  /* CHART: kontrol X/Y + permintaan data + render (spec §9)               */
  /* ==================================================================== */
  function setupChartControls(payload) {
    const categoryColumns = payload.columns.filter((column) => column.type === 'date' || column.type === 'categorical');
    const numericColumns = payload.columns.filter((column) => column.type === 'numeric');

    fillSelect(refs.xSelect, categoryColumns, 'Sumbu X (kategori/tanggal)');
    fillSelect(refs.ySelect, numericColumns, 'Sumbu Y (numerik)');

    const canChart = categoryColumns.length > 0 && numericColumns.length > 0;
    if (!canChart) {
      refs.chartPanel.hidden = true;
      if (refs.chartUnavailable) {
        refs.chartUnavailable.hidden = false;
        refs.chartUnavailable.textContent = !categoryColumns.length && !numericColumns.length
          ? 'Grafik tidak tersedia: file tidak memiliki kolom kategori/tanggal maupun kolom numerik.'
          : !categoryColumns.length
            ? 'Grafik tidak tersedia: tidak ada kolom kategori atau tanggal untuk sumbu X.'
            : 'Grafik tidak tersedia: tidak ada kolom numerik untuk sumbu Y.';
      }
      return;
    }

    refs.chartPanel.hidden = false;
    if (refs.chartUnavailable) refs.chartUnavailable.hidden = true;

    /* Default: pilihan pertama yang tersedia (deterministik). */
    refs.xSelect.value = categoryColumns[0].id;
    refs.ySelect.value = numericColumns[0].id;
    requestChart();
  }

  function fillSelect(select, columns, emptyLabel) {
    select.textContent = '';
    if (columns.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = `${emptyLabel} — tidak tersedia`;
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    for (const column of columns) {
      const option = document.createElement('option');
      option.value = column.id;
      option.textContent = column.displayName;
      select.appendChild(option);
    }
  }

  function requestChart() {
    const xColumnId = refs.xSelect ? refs.xSelect.value : '';
    const yColumnId = refs.ySelect ? refs.ySelect.value : '';
    if (!xColumnId || !yColumnId || state.phase !== 'ready') return;

    /* Overlay loading: pesan progres jujur (bukan progress bar palsu). */
    if (refs.overlay) {
      refs.overlay.hidden = false;
      refs.overlay.dataset.kind = 'loading';
      const title = refs.overlay.querySelector('[data-overlay-title]');
      const description = refs.overlay.querySelector('[data-overlay-description]');
      if (title) title.textContent = 'Menyiapkan data grafik…';
      if (description) description.textContent = 'File dibaca ulang dan diparse di Worker.';
    }

    const worker = ensureWorker();
    const requestId = ++state.requestSequence;
    state.latestChartRequestId = requestId;
    state.latestChartGeneration = state.generation;
    worker.postMessage({ type: 'GET_CHART_DATA', requestId, xColumnId, yColumnId });
  }

  function handleChartSuccess(chartPayload) {
    const hasAnyPoint = chartPayload.values.some((value) => value !== null);
    if (!hasAnyPoint) {
      chart.showEmpty('Tidak ada titik data valid pada kombinasi kolom ini (nilai kosong tetap kosong, bukan nol).');
      updateChartCaption(chartPayload);
      return;
    }

    const config = buildCsvChartConfig(chartPayload);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    config.options.animation = { duration: reducedMotion ? 0 : 300 };

    chart.render(config).catch(() => {
      chart.showError('Pustaka chart gagal dimuat. Nilai tetap tersedia pada tabel pratinjau dan statistik.');
    });
    updateChartCaption(chartPayload);
  }

  function buildCsvChartConfig(chartPayload) {
    const analysis = state.analysis || { columns: [] };
    const xColumn = analysis.columns.find((column) => column.id === chartPayload.xColumnId);
    const yColumn = analysis.columns.find((column) => column.id === chartPayload.yColumnId);
    const xLabel = xColumn ? xColumn.displayName : 'Sumbu X';
    const yLabel = yColumn ? yColumn.displayName : 'Sumbu Y';

    return {
      type: 'line',
      data: {
        labels: chartPayload.labels,
        datasets: [{
          label: yLabel,
          data: chartPayload.values, /* null untuk missing - spanGaps:false */
          spanGaps: false,
          borderColor: COLOR_BLUE,
          backgroundColor: COLOR_BLUE,
          pointRadius: chartPayload.pointsSent > 200 ? 0 : 2.5,
          pointHitRadius: 6,
          borderWidth: 2,
          tension: 0,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLOR_INK,
            titleFont: { family: FONT_MONO, size: 12 },
            bodyFont: { family: FONT_MONO, size: 11 },
            padding: 10,
            callbacks: {
              label: (item) => {
                const value = item.parsed.y;
                if (value === null || Number.isNaN(value)) return `${yLabel}: tidak ada data`;
                return `${yLabel}: ${formatNumber(value, { maxFractionDigits: 4 })}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'category', /* tanggal & kategori sama-sama kategori (tanpa date adapter) */
            grid: { color: COLOR_GRID },
            border: { color: COLOR_GRID },
            ticks: {
              color: COLOR_TEXT_2,
              font: { family: FONT_MONO, size: 10 },
              maxRotation: 40,
              autoSkip: true,
              maxTicksLimit: 24,
            },
            title: {
              display: true,
              text: xLabel,
              color: COLOR_TEXT_2,
              font: { family: FONT_MONO, size: 10 },
            },
          },
          y: {
            type: 'linear',
            grid: { color: COLOR_GRID },
            border: { color: COLOR_GRID },
            ticks: { color: COLOR_TEXT_2, font: { family: FONT_MONO, size: 10 } },
            title: {
              display: true,
              text: yLabel,
              color: COLOR_TEXT_2,
              font: { family: FONT_MONO, size: 10 },
            },
          },
        },
      },
    };
  }

  function updateChartCaption(chartPayload) {
    if (!refs.chartCaption) return;
    refs.chartCaption.textContent = chartPayload.sampled
      ? `Grafik menampilkan sampel ${formatNumber(chartPayload.pointsSent)} titik dari ${formatNumber(chartPayload.totalRecords)} record (langkah tetap ${chartPayload.sampleStride}, titik awal & akhir dipertahankan). Statistik di atas tetap dihitung dari seluruh data.`
      : `Grafik menampilkan seluruh ${formatNumber(chartPayload.pointsSent)} record. Nilai kosong dirender sebagai gap (tidak pernah dihubungkan atau diubah menjadi nol).`;
  }

  /* ==================================================================== */
  /* UI STATE: status, error, fase                                         */
  /* ==================================================================== */
  function setStatus(text) {
    if (refs.status) refs.status.textContent = text;
  }

  function showError(message) {
    if (refs.error) {
      refs.error.textContent = message;
      refs.error.hidden = false;
    }
    if (refs.status) refs.status.textContent = 'Terjadi kesalahan.';
  }

  function clearError() {
    if (refs.error) {
      refs.error.textContent = '';
      refs.error.hidden = true;
    }
  }

  function setPhase(phase) {
    state.phase = phase;
    const processing = phase === 'processing';
    root.dataset.busy = processing ? 'true' : 'false';
    if (refs.dropzone) refs.dropzone.classList.toggle('is-busy', processing);
    if (refs.input) refs.input.disabled = processing;
    if (refs.browse) refs.browse.disabled = processing;
    if (refs.reset) refs.reset.disabled = processing;
    /* Select X/Y: hanya dinonaktifkan saat processing; state enabled
       dikelola fillSelect/clearResults (placeholder-only tetap disabled). */
    if (processing) {
      if (refs.xSelect) refs.xSelect.disabled = true;
      if (refs.ySelect) refs.ySelect.disabled = true;
    }

    const showResults = phase === 'ready';
    if (refs.results) refs.results.hidden = !showResults;
    if (phase === 'idle') {
      clearResults();
    }
  }

  function clearResults() {
    chart.destroy();
    if (refs.fileSummary) refs.fileSummary.textContent = '';
    if (refs.preview) refs.preview.textContent = '';
    if (refs.columns) refs.columns.textContent = '';
    if (refs.stats) refs.stats.textContent = '';
    if (refs.statsEmpty) refs.statsEmpty.hidden = true;
    if (refs.chartPanel) refs.chartPanel.hidden = true;
    if (refs.chartUnavailable) refs.chartUnavailable.hidden = true;
    if (refs.chartCaption) refs.chartCaption.textContent = '';
    if (refs.xSelect) {
      refs.xSelect.textContent = '';
      refs.xSelect.disabled = true;
    }
    if (refs.ySelect) {
      refs.ySelect.textContent = '';
      refs.ySelect.disabled = true;
    }
  }

  /* ==================================================================== */
  /* Event binding (semua lewat AbortController signal)                    */
  /* ==================================================================== */
  if (refs.input) {
    refs.input.addEventListener('change', () => {
      const files = refs.input.files;
      handleFiles(files);
      /* Bersihkan nilai agar file yang sama dapat dipilih ulang setelah
         error/reset (spec §8.1) dan change tetap terpicu. */
      refs.input.value = '';
    }, { signal: listenerSignal });
  }
  if (refs.browse && refs.input) {
    refs.browse.addEventListener('click', () => {
      if (state.phase !== 'processing') refs.input.click();
    }, { signal: listenerSignal });
  }
  if (refs.dropzone) {
    refs.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (state.phase !== 'processing') refs.dropzone.classList.add('is-dragover');
    }, { signal: listenerSignal });
    refs.dropzone.addEventListener('dragleave', () => {
      refs.dropzone.classList.remove('is-dragover');
    }, { signal: listenerSignal });
    refs.dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      refs.dropzone.classList.remove('is-dragover');
      if (state.phase === 'processing') return;
      handleFiles(event.dataTransfer ? event.dataTransfer.files : null);
    }, { signal: listenerSignal });
  }
  /* Cegah browser membuka file saat drop di luar dropzone (spec §8.1). */
  window.addEventListener('dragover', (event) => event.preventDefault(), { signal: listenerSignal });
  window.addEventListener('drop', (event) => event.preventDefault(), { signal: listenerSignal });
  if (refs.reset) {
    refs.reset.addEventListener('click', () => resetExplorer(), { signal: listenerSignal });
  }
  if (refs.xSelect) {
    refs.xSelect.addEventListener('change', () => requestChart(), { signal: listenerSignal });
  }
  if (refs.ySelect) {
    refs.ySelect.addEventListener('change', () => requestChart(), { signal: listenerSignal });
  }

  return { destroy };
}

/* ====================================================================== */
/* Helper tampilan                                                        */
/* ====================================================================== */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, { maxFractionDigits: 1 })} KiB`;
  return `${formatNumber(bytes / (1024 * 1024), { maxFractionDigits: 2 })} MiB`;
}
