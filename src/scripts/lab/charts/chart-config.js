/*!
 * lab/charts/chart-config.js - Pembangun konfigurasi chart (murni, tanpa DOM).
 *
 * Single responsibility: menerjemahkan {manifest, dataset, state} menjadi
 * konfigurasi Chart.js (labels, datasets, options). Aturan wajib (spec §11.3):
 *  - missing = null, TANPA penggantian 0, TANPA interpolasi.
 *  - spanGaps: false (gap tidak pernah disambungkan).
 *  - Konsentrasi (µg/Nm³) dan ISPU tidak pernah dicampur dalam satu sumbu:
 *    metric selector menentukan satu satuan y pada satu waktu.
 *  - Animasi ≤ 300ms; 0ms saat prefers-reduced-motion (spec §11.5).
 *
 * Warna mengikuti token visual V11.x (biru identitas + slate) dan font
 * DM Mono untuk angka, konsisten dengan seluruh situs.
 */

const FONT_MONO = "'DM Mono', 'SFMono-Regular', Consolas, monospace";
const COLOR_BLUE = '#2563EB';
const COLOR_SLATE = '#64748B';
const COLOR_INK = '#0F172A';
const COLOR_TEXT_2 = '#475569';
const COLOR_GRID = '#E2E8F0';

export const METRIC_DEFINITIONS = {
  ispu: {
    id: 'ispu',
    label: 'ISPU (terderivasi)',
    unit: 'ISPU',
    axisTitle: 'ISPU · sub-indeks maksimum SO₂/NO₂ (terderivasi)',
    axisTitleCompact: 'ISPU (terderivasi)',
    getValue: (record) => (record.derived && record.derived.ispuStatus === 'valid' ? record.derived.ispu : null),
    suggestedMin: 0,
    suggestedMax: 100,
  },
  so2: {
    id: 'so2',
    label: 'SO₂',
    unit: 'µg/Nm³',
    axisTitle: 'SO₂ · konsentrasi (µg/Nm³, sebagaimana sumber)',
    axisTitleCompact: 'SO₂ (µg/Nm³)',
    getValue: (record) => (record.values.so2 === null ? null : record.values.so2),
    suggestedMin: 0,
    suggestedMax: null,
  },
  no2: {
    id: 'no2',
    label: 'NO₂',
    unit: 'µg/Nm³',
    axisTitle: 'NO₂ · konsentrasi (µg/Nm³, sebagaimana sumber)',
    axisTitleCompact: 'NO₂ (µg/Nm³)',
    getValue: (record) => (record.values.no2 === null ? null : record.values.no2),
    suggestedMin: 0,
    suggestedMax: null,
  },
};

export const VIEW_DEFINITIONS = {
  trend: { id: 'trend', label: 'Tren 2021–2025 (satu lokasi)' },
  year: { id: 'year', label: 'Per lokasi (tahun terpilih)' },
};

const STAGE_LABELS = { 'TAHAP I': 'TAHAP I', 'TAHAP II': 'TAHAP II' };
const STAGE_COLORS = { 'TAHAP I': COLOR_BLUE, 'TAHAP II': COLOR_SLATE };

/**
 * V14.0-UNIFIED: Plugin pita ambang ISPU PermenLHK P.14/2020
 * (0–50 Baik, 51–100 Sedang, 101–200 Tidak Sehat, >200 Sangat Tidak Sehat).
 * Aktif hanya ketika metric === 'ispu'. Tetap menjaga spanGaps: false.
 */
export const ispuThresholdBandsPlugin = {
  id: 'ispuThresholdBands',
  beforeDraw(chart) {
    const bandOptions = chart && chart.config && chart.config.options && chart.config.options.plugins && chart.config.options.plugins.ispuThresholdBands;
    if (!bandOptions || !bandOptions.enabled) return;
    const { ctx, chartArea, scales } = chart;
    const yScale = scales && scales.y;
    if (!ctx || !chartArea || !yScale) return;

    const bands = [
      { min: 0, max: 50, fill: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.34)', label: '0–50 BAIK' },
      { min: 50, max: 100, fill: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.34)', label: '51–100 SEDANG' },
      { min: 100, max: 200, fill: 'rgba(239, 68, 68, 0.07)', border: 'rgba(239, 68, 68, 0.32)', label: '101–200 TIDAK SEHAT' },
      { min: 200, max: 350, fill: 'rgba(126, 34, 206, 0.06)', border: 'rgba(126, 34, 206, 0.28)', label: '>200 SANGAT TIDAK SEHAT' },
    ];

    ctx.save();
    const minVal = typeof yScale.min === 'number' ? yScale.min : 0;
    const maxVal = typeof yScale.max === 'number' ? yScale.max : 100;

    for (const band of bands) {
      if (maxVal <= band.min || minVal >= band.max) continue;
      const clampedTop = Math.min(band.max, maxVal);
      const clampedBottom = Math.max(band.min, minVal);
      const yTop = yScale.getPixelForValue(clampedTop);
      const yBottom = yScale.getPixelForValue(clampedBottom);
      const height = yBottom - yTop;
      if (height <= 0) continue;

      ctx.fillStyle = band.fill;
      ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, height);

      if (band.max <= maxVal) {
        ctx.strokeStyle = band.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, yTop);
        ctx.lineTo(chartArea.right, yTop);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};

/**
 * Kumpulkan nilai per (labelX, stage) untuk view trend & per-tahun.
 * @returns {{labels: string[], datasets: object[], recordsByLabel: Map}}
 */
export function buildChartData({ regionYears, records, state }) {
  const metric = METRIC_DEFINITIONS[state.metric] || METRIC_DEFINITIONS.ispu;
  const allRecords = Array.isArray(records) ? records : [];

  let labels;
  if (state.view === 'trend') {
    labels = regionYears.map((yearEntry) => String(yearEntry.year));
  } else {
    /* Urut lokasi alfabetis (konsisten manifest.locations). */
    labels = [...new Set(allRecords.map((record) => record.location))].sort((a, b) => a.localeCompare(b, 'id'));
  }

  const stages = ['TAHAP I', 'TAHAP II'];
  const recordsByLabel = new Map(); /* label → stage → record */

  const seriesMap = new Map(); /* stage → number[] */
  for (const stage of stages) seriesMap.set(stage, []);

  for (const label of labels) {
    for (const stage of stages) {
      let record = null;
      if (state.view === 'trend') {
        const year = Number(label);
        record = allRecords.find((candidate) => candidate.period.year === year
          && candidate.period.stage === stage
          && candidate.locationId === state.locationId) || null;
      } else {
        record = allRecords.find((candidate) => candidate.location === label
          && candidate.period.stage === stage) || null;
      }
      if (!recordsByLabel.has(label)) recordsByLabel.set(label, {});
      recordsByLabel.get(label)[stage] = record;
      seriesMap.get(stage).push(record ? metric.getValue(record) : null);
    }
  }

  const datasets = stages.map((stage) => ({
    label: STAGE_LABELS[stage],
    data: seriesMap.get(stage),
    spanGaps: false,
    borderColor: STAGE_COLORS[stage],
    backgroundColor: STAGE_COLORS[stage],
    borderWidth: 2,
    pointRadius: labels.length > 16 ? 2 : 3.5,
    pointHoverRadius: 6,
    pointStyle: 'circle',
    tension: 0,
    /* titik tanpa nilai tetap tidak digambar; gap nyata terlihat */
  })).filter((datasetConfig, index) => {
    /* Sembunyikan series yang seluruh datanya null (mis. 2025 tanpa TAHAP II)
       agar legenda jujur; dataset tetap ada di stage list. */
    return seriesMap.get(stages[index]).some((value) => value !== null);
  });

  return { labels, datasets, recordsByLabel, metric };
}

/**
 * Bangun konfigurasi lengkap Chart.js (memanggil buildChartData sekali di
 * dalam; pemanggil tidak perlu menyiapkan recordsByLabel/metric).
 * @param {{reducedMotion: boolean}} options
 * @param {Array} records record gabungan (trend = lintas tahun; year = satu tahun)
 */
export function buildChartConfig({ regionYears, records, state, reducedMotion, compactAxis = false }) {
  const { labels, datasets, recordsByLabel, metric } = buildChartData({ regionYears, records, state });

  const describeRecord = (record) => {
    if (!record) return null;
    const parts = [];
    parts.push(`SO₂: ${record.values.so2 === null ? '-' : record.values.so2} µg/Nm³`);
    parts.push(`NO₂: ${record.values.no2 === null ? '-' : record.values.no2} µg/Nm³`);
    if (record.derived && record.derived.subIndex) {
      const so2Sub = record.derived.subIndex.so2;
      const no2Sub = record.derived.subIndex.no2;
      parts.push(`Sub-indeks SO₂: ${so2Sub && so2Sub.status === 'valid' ? so2Sub.value.toFixed(2) : '-'}`);
      parts.push(`Sub-indeks NO₂: ${no2Sub && no2Sub.status === 'valid' ? no2Sub.value.toFixed(2) : '-'}`);
      if (record.derived.ispuStatus === 'valid') {
        parts.push(`ISPU: ${record.derived.ispu} (${record.derived.category}) · polutan dominan: ${record.derived.dominantParameter === 'so2' ? 'SO₂' : 'NO₂'}`);
      } else {
        parts.push('ISPU: - (tidak ada sub-indeks valid)');
      }
    }
    return parts;
  };

  return {
    type: 'line',
    data: { labels, datasets },
    plugins: [ispuThresholdBandsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: reducedMotion ? 0 : 300 },
      /* Tooltip bukan satu-satunya cara memperoleh angka; data table
         menyediakan nilai yang setara (spec §14.4). */
      plugins: {
        ispuThresholdBands: {
          enabled: metric.id === 'ispu',
        },
        legend: {
          display: datasets.length > 1,
          labels: { color: COLOR_TEXT_2, font: { family: FONT_MONO, size: 11 }, boxWidth: 22, boxHeight: 2 },
        },
        tooltip: {
          backgroundColor: COLOR_INK,
          titleFont: { family: FONT_MONO, size: 12 },
          bodyFont: { family: FONT_MONO, size: 11 },
          padding: 10,
          callbacks: {
            title: (items) => {
              const label = items[0] && items[0].label;
              if (state.view === 'trend') return `${label} · ${state.locationLabel}`;
              return label;
            },
            label: (item) => {
              const stage = item.dataset.label;
              const value = item.parsed.y;
              const record = recordsByLabel.get(item.label) && recordsByLabel.get(item.label)[stage];
              if (value === null || Number.isNaN(value)) return `${stage}: tidak ada data`;
              const qualityParameter = metric.id === 'ispu' ? null : metric.id;
              const hasDuplicate = record && qualityParameter && record.quality[qualityParameter]
                && record.quality[qualityParameter].duplicateCount;
              return `${stage}: ${value} ${metric.unit}${hasDuplicate ? ' *' : ''}`;
            },
            afterBody: (items) => {
              const item = items[0];
              if (!item) return [];
              const stage = item.dataset.label;
              const record = recordsByLabel.get(item.label) && recordsByLabel.get(item.label)[stage];
              const parts = describeRecord(record);
              const footer = [];
              if (parts) footer.push(...parts);
              if (record && record.quality) {
                for (const parameter of ['so2', 'no2']) {
                  if (record.quality[parameter] && record.quality[parameter].duplicateCount) {
                    footer.push(`* ${parameter.toUpperCase()} memuat ${record.quality[parameter].duplicateCount} baris duplikat di sumber (lihat tabel & methodology).`);
                  }
                }
              }
              return footer;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: COLOR_GRID },
          border: { color: COLOR_GRID },
          ticks: { color: COLOR_TEXT_2, font: { family: FONT_MONO, size: 10 }, maxRotation: 40, autoSkip: false },
          title: {
            display: true,
            text: state.view === 'trend' ? 'Tahun pengukuran' : 'Lokasi pengukuran',
            color: COLOR_TEXT_2,
            font: { family: FONT_MONO, size: 10 },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMin: metric.suggestedMin ?? undefined,
          suggestedMax: metric.suggestedMax ?? undefined,
          grid: { color: COLOR_GRID },
          border: { color: COLOR_GRID },
          ticks: { color: COLOR_TEXT_2, font: { family: FONT_MONO, size: 10 } },
          title: {
            display: true,
            text: compactAxis ? (metric.axisTitleCompact || metric.axisTitle) : metric.axisTitle,
            color: COLOR_TEXT_2,
            font: { family: FONT_MONO, size: 10 },
          },
        },
      },
    },
  };
}
