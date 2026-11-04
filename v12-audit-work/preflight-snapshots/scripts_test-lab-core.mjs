/*!
 * scripts/test-lab-core.mjs — Test harness unit untuk core Data Lab V12.0.
 *
 * Tanpa framework baru (spec §17: gunakan tooling tersedia; dependency baru
 * selain Chart.js dilarang). Memakai node:assert + runner mini. Dijalankan:
 *   node scripts/test-lab-core.mjs
 *
 * Cakupan (spec §17.2–17.4):
 *  - Kalkulator ISPU: contoh resmi, semua breakpoint boundary (tanpa
 *    overlap/gap), nol, negatif, null, NaN, Infinity, string numerik,
 *    averaging period salah, validPercent < 75%, parameter tak didukung,
 *    out-of-range, basis mismatch override.
 *  - Statistik: mean/median (ganjil & genap)/min/max/SD populasi & sampel,
 *    null diabaikan (bukan 0), array kosong → null, non-finite, non-mutasi.
 *  - Validator dataset: dataset valid + 12 kasus gagal.
 */

import assert from 'node:assert/strict';
import {
  calculateSubIndex,
  getISPUCategory,
  getISPUFromSubIndices,
  getDominantParameterSummary,
  P14_2020,
  SUPPORTED_PARAMETERS,
} from '../src/scripts/lab/core/aqi-calculator.js';
import {
  mean, median, min, max, standardDeviation,
  countValid, countMissing, validPercentage,
} from '../src/scripts/lab/core/stats.js';
import { validateDataset } from '../src/scripts/lab/core/validate-dataset.js';
import { formatNumber, formatIndex, formatPercent, safeExternalUrl } from '../src/scripts/lab/core/formatters.js';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    process.stdout.write(`  FAIL  ${name}\n        ${error.message}\n`);
  }
}

const APPROX = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ====================================================================== */
/* 1. KALKULATOR ISPU (P.14/2020)                                          */
/* ====================================================================== */
console.log('\n[1] aqi-calculator.js');

test('SUPPORTED_PARAMETERS hanya parameter terverifikasi', () => {
  assert.deepEqual([...SUPPORTED_PARAMETERS].sort(), ['no2', 'pm25', 'so2']);
});

test('SO₂ 13.61 µg/m³ (pita 1) → 13.0865 ≈ 13 (Baik)', () => {
  const result = calculateSubIndex({ parameter: 'so2', concentration: 13.61, unit: 'µg/m³', averagingPeriod: '1h' });
  assert.equal(result.status, 'valid');
  assert.ok(APPROX(result.value, 13.086538461538462), `value=${result.value}`);
  assert.equal(result.valueRounded, 13);
  assert.equal(result.category.label, 'Baik');
});

test('Contoh resmi PM2.5 31.4 µg/m³ → 70.5264 (pita 51–100, dibulatkan 71)', () => {
  /* Catatan terdokumentasi: spesifikasi menyebut "≈69.92 → 70" — angka itu
     muncul bila pita dipetakan kontinu 50–100 (Ib=50). Implementasi memakai
     pita tabel eksplisit yang sama dengan SO₂/NO₂ (51–100 pada 15.5–55.4)
     sehingga hasil aritmetika tabel: (100-51)/(55.4-15.5)×(31.4-15.5)+51
     = 70.5264 → 71. Selisih < 1 ISPU; didokumentasikan di methodology. */
  const result = calculateSubIndex({ parameter: 'pm25', concentration: 31.4, unit: 'µg/m³', averagingPeriod: '24h' });
  assert.equal(result.status, 'valid');
  assert.ok(APPROX(result.value, 70.52631578947368, 1e-9), `value=${result.value}`);
  assert.equal(result.category.label, 'Sedang');
});

test('Boundary SO₂: 0→0, 52→50, 52.000001→>51, 180→100, 400→200, 800→300, 1200→500', () => {
  const at = (c) => calculateSubIndex({ parameter: 'so2', concentration: c, unit: 'µg/m³', averagingPeriod: '1h' });
  assert.equal(at(0).valueRounded, 0);
  assert.equal(at(52).valueRounded, 50);
  const justAbove = at(52.000001);
  assert.equal(justAbove.status, 'valid');
  assert.ok(justAbove.value > 51 && justAbove.value < 51.01, `justAbove=${justAbove.value}`);
  assert.equal(at(180).valueRounded, 100);
  assert.equal(at(400).valueRounded, 200);
  assert.equal(at(800).valueRounded, 300);
  assert.equal(at(1200).valueRounded, 500);
});

test('Boundary NO₂: 80→50, 200→100, 1130→200, 2260→300, 3000→500', () => {
  const at = (c) => calculateSubIndex({ parameter: 'no2', concentration: c, unit: 'µg/m³', averagingPeriod: '1h' });
  assert.equal(at(80).valueRounded, 50);
  assert.equal(at(200).valueRounded, 100);
  assert.equal(at(1130).valueRounded, 200);
  assert.equal(at(2260).valueRounded, 300);
  assert.equal(at(3000).valueRounded, 500);
});

test('Tidak ada overlap/gap: 52.5 masuk pita 2, nilai antara 51–52', () => {
  const at = (c) => calculateSubIndex({ parameter: 'so2', concentration: c, unit: 'µg/m³', averagingPeriod: '1h' });
  const mid = at(52.5);
  assert.equal(mid.status, 'valid');
  assert.ok(APPROX(mid.value, 51 + (49 / 128) * 0.5, 1e-9), `52.5 → ${mid.value}`);
  assert.equal(at(53).status, 'valid');
  assert.ok(at(53).value > 51 && at(53).value < 52, `53 → ${at(53).value}`);
});

test('Nol = pengukuran valid → ISPU 0, kategori Baik (bukan missing)', () => {
  const result = calculateSubIndex({ parameter: 'no2', concentration: 0, unit: 'µg/m³', averagingPeriod: '1h' });
  assert.equal(result.status, 'valid');
  assert.equal(result.valueRounded, 0);
  assert.equal(result.category.label, 'Baik');
});

test('Negatif → invalid-input', () => {
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: -1, unit: 'µg/m³' }).status, 'invalid-input');
});

test('null/undefined → missing', () => {
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: null }).status, 'missing');
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: undefined }).status, 'missing');
});

test('NaN / Infinity → invalid-input', () => {
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: Number.NaN }).status, 'invalid-input');
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: Infinity }).status, 'invalid-input');
});

test('String numerik ditolak → invalid-input', () => {
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: '13.61' }).status, 'invalid-input');
});

test('Averaging period salah → unsupported-averaging-period; dengan override tetap ditandai basisMatched=false', () => {
  const strict = calculateSubIndex({ parameter: 'so2', concentration: 13.61, unit: 'µg/m³', averagingPeriod: '24h' });
  assert.equal(strict.status, 'unsupported-averaging-period');
  const override = calculateSubIndex({ parameter: 'so2', concentration: 13.61, unit: 'µg/m³', averagingPeriod: '24h', allowBasisMismatch: true });
  assert.equal(override.status, 'valid');
  assert.equal(override.basisMatched, false);
});

test('validPercent < 75 → insufficient-data', () => {
  const result = calculateSubIndex({ parameter: 'so2', concentration: 13.61, unit: 'µg/m³', averagingPeriod: '1h', validPercent: 60 });
  assert.equal(result.status, 'insufficient-data');
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: 13.61, unit: 'µg/m³', averagingPeriod: '1h', validPercent: 90 }).status, 'valid');
});

test('Parameter tak terverifikasi (pm10) → unsupported-parameter (bukan angka karangan)', () => {
  assert.equal(calculateSubIndex({ parameter: 'pm10', concentration: 50, unit: 'µg/m³', averagingPeriod: '24h' }).status, 'unsupported-parameter');
});

test('Out-of-range SO₂ 1500 → out-of-range + kategori Berbahaya tanpa angka', () => {
  const result = calculateSubIndex({ parameter: 'so2', concentration: 1500, unit: 'µg/m³', averagingPeriod: '1h' });
  assert.equal(result.status, 'out-of-range');
  assert.equal(result.value, null);
  assert.equal(result.category.label, 'Berbahaya');
});

test('Satuan salah → invalid-input; µg/Nm³ diterima setara µg/m³ sesuai pelaporan sumber', () => {
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: 10, unit: 'ppm', averagingPeriod: '1h' }).status, 'invalid-input');
  assert.equal(calculateSubIndex({ parameter: 'so2', concentration: 10, unit: 'µg/Nm³', averagingPeriod: '1h' }).status, 'valid');
});

test('Kategori: 0/50 Baik, 50.5/100 Sedang, 100.5/200 Tidak Sehat, 200.5/300 Sangat Tidak Sehat, 300.5/600 Berbahaya', () => {
  const at = (v) => getISPUCategory(v).label;
  assert.equal(at(0), 'Baik');
  assert.equal(at(50), 'Baik');
  assert.equal(at(50.5), 'Sedang');
  assert.equal(at(100), 'Sedang');
  assert.equal(at(100.5), 'Tidak Sehat');
  assert.equal(at(200), 'Tidak Sehat');
  assert.equal(at(200.5), 'Sangat Tidak Sehat');
  assert.equal(at(300), 'Sangat Tidak Sehat');
  assert.equal(at(300.5), 'Berbahaya');
  const beyond = getISPUCategory(600);
  assert.equal(beyond.label, 'Berbahaya');
  assert.equal(beyond.status, 'beyond-scale');
  assert.equal(getISPUCategory(null).status, 'missing');
  assert.equal(getISPUCategory(Number.NaN).status, 'invalid');
});

test('ISPU final = max sub-indeks valid; polutan dominan benar; missing bila tak ada yang valid', () => {
  const both = getISPUFromSubIndices({
    so2: { status: 'valid', value: 26.5 },
    no2: { status: 'valid', value: 32.475 },
  });
  assert.equal(both.status, 'valid');
  assert.ok(APPROX(both.value, 32.475));
  assert.equal(both.dominantParameter, 'no2');
  assert.equal(Math.round(both.value), 32);

  const one = getISPUFromSubIndices({ so2: { status: 'valid', value: 14 }, no2: { status: 'missing', value: null } });
  assert.equal(one.dominantParameter, 'so2');
  assert.deepEqual(one.availableParameters, ['so2']);

  const none = getISPUFromSubIndices({ so2: { status: 'missing', value: null }, no2: { status: 'missing', value: null } });
  assert.equal(none.status, 'missing');
  assert.equal(none.value, null);
});

test('Ringkasan polutan dominan: hanya sub-indeks valid yang dihitung', () => {
  const summary = getDominantParameterSummary([
    { derived: { subIndex: { so2: { status: 'valid', value: 60 }, no2: { status: 'valid', value: 30 } } } },
    { derived: { subIndex: { so2: { status: 'valid', value: 20 }, no2: { status: 'valid', value: 70 } } } },
    { derived: { subIndex: { so2: { status: 'missing', value: null }, no2: { status: 'missing', value: null } } } },
  ]);
  assert.equal(summary.status, 'valid');
  /* seri: iterasi urut kunci → 'so2' pertama (tie-break deterministik) */
  assert.equal(summary.leader, 'so2');
  assert.equal(summary.sampleSize, 2);
  assert.equal(summary.counts.no2, 1);
  assert.equal(summary.counts.so2, 1);
});

test('Konsentrasi TIDAK dibulatkan sebelum interpolasi (31.4 ≠ dibulatkan)', () => {
  const exact = calculateSubIndex({ parameter: 'pm25', concentration: 55.4, unit: 'µg/m³', averagingPeriod: '24h' });
  assert.equal(exact.valueRounded, 100);
  const below = calculateSubIndex({ parameter: 'pm25', concentration: 55.39, unit: 'µg/m³', averagingPeriod: '24h' });
  assert.ok(below.value < 100 && below.value > 99.9, `below=${below.value}`);
});

test('Tabel P14_2020: pita tidak overlap & tidak bolong (so2/no2/pm25)', () => {
  for (const parameter of ['so2', 'no2', 'pm25']) {
    const intervals = P14_2020.tables[parameter].intervals;
    for (let i = 1; i < intervals.length; i += 1) {
      assert.ok(intervals[i].low === intervals[i - 1].high, `${parameter} gap/overlap di ${intervals[i].low}`);
      assert.ok(intervals[i].iLow > intervals[i - 1].iHigh - 2, `${parameter} index overlap`);
    }
  }
});

/* ====================================================================== */
/* 2. STATISTIK                                                            */
/* ====================================================================== */
console.log('\n[2] stats.js');

test('mean([10, null, 20]) === 15 (null diabaikan, bukan 0)', () => {
  assert.equal(mean([10, null, 20]), 15);
});

test('Median ganjil & genap (genap = rata-rata dua tengah)', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('min/max mengabaikan null', () => {
  assert.equal(min([null, 5, 2]), 2);
  assert.equal(max([null, 5, 2]), 5);
  assert.equal(min([null]), null);
  assert.equal(max([]), null);
});

test('SD populasi [2,4,4,4,5,5,7,9] = 2; sampel ≈ 2.13809', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.ok(APPROX(standardDeviation(values), 2), `pop=${standardDeviation(values)}`);
  assert.ok(APPROX(standardDeviation(values, { type: 'sample' }), 2.13809, 1e-4), `sample=${standardDeviation(values, { type: 'sample' })}`);
  assert.ok(APPROX(standardDeviation(values, {}), 2)); /* default population terdokumentasi */
});

test('Empty & all-null → null (bukan 0)', () => {
  assert.equal(mean([]), null);
  assert.equal(mean([null, undefined]), null);
  assert.equal(median([]), null);
  assert.equal(standardDeviation([]), null);
  assert.equal(validPercentage([]), null);
});

test('Non-finite diabaikan (NaN/Infinity)', () => {
  assert.equal(mean([10, Number.NaN, Infinity, 20]), 15);
  assert.equal(countMissing([10, Number.NaN, Infinity, null, undefined, 20]), 4);
  assert.equal(countValid([10, Number.NaN, Infinity, null, undefined, 20]), 2);
});

test('validPercentage: [10,null,20] → 66.7%', () => {
  assert.ok(APPROX(validPercentage([10, null, 20]), 66.7, 1e-9));
});

test('Input TIDAK dimutasi (median mengurutkan salinan)', () => {
  const input = [3, 1, 2];
  const snapshot = JSON.stringify(input);
  median(input);
  assert.equal(JSON.stringify(input), snapshot);
  standardDeviation(input);
  assert.equal(JSON.stringify(input), snapshot);
});

/* ====================================================================== */
/* 3. VALIDATOR DATASET                                                    */
/* ====================================================================== */
console.log('\n[3] validate-dataset.js');

function fixture(overrides = {}, recordOverrides = {}) {
  return {
    schemaVersion: 1,
    regionId: 'cirebon',
    year: 2021,
    dataset: {
      title: 'T',
      sourceId: 'src-a',
      sourceUrl: null,
      accessedAt: '2026-03-11',
      parameterDefinitions: {
        so2: { unit: 'µg/m³', averagingPeriod: '1h', aggregation: 'source-defined', measurementMethod: null },
        no2: { unit: 'µg/m³', averagingPeriod: '1h', aggregation: 'source-defined', measurementMethod: null },
      },
      limitations: [],
    },
    records: [{
      id: '2021-tahap-i-x',
      date: null,
      period: { year: 2021, stage: 'TAHAP I' },
      location: 'LOKASI X',
      values: { so2: 10, no2: null },
      quality: { so2: { status: 'valid' }, no2: { status: 'missing' } },
      derived: { ispu: 10, ispuStatus: 'valid', category: 'Baik', subIndex: {}, dominantParameter: 'so2', availableParameters: ['so2'] },
      reportedIndices: { ispu: null },
    }, ...recordOverrides.list || []],
    ...overrides,
  };
}

test('Dataset valid → ok tanpa error', () => {
  const result = validateDataset(fixture(), { knownSourceIds: ['src-a'] });
  assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0, JSON.stringify(result.issues));
  assert.equal(result.ok, true);
});

test('schemaVersion salah → error', () => {
  const dataset = fixture(); dataset.schemaVersion = 2;
  assert.ok(validateDataset(dataset).issues.some((i) => i.code === 'SCHEMA_VERSION'));
});

test('Tahun record ≠ dataset.year → error', () => {
  const dataset = fixture();
  dataset.records[0].period.year = 2022;
  assert.ok(validateDataset(dataset).issues.some((i) => i.code === 'RECORD_YEAR_MISMATCH'));
});

test('Record id duplikat → error', () => {
  const dataset = fixture({}, { list: [{ ...fixture().records[0], id: '2021-tahap-i-x' }] });
  const result = validateDataset(dataset);
  assert.ok(result.issues.some((i) => i.code === 'RECORD_DUPLICATE'));
});

test('Parameter tak dideklarasikan → error', () => {
  const dataset = fixture();
  dataset.records[0].values.pm10 = 5;
  assert.ok(validateDataset(dataset).issues.some((i) => i.code === 'PARAM_UNKNOWN'));
});

test('Konsentrasi negatif → error; NaN → error; string numerik → error', () => {
  const a = fixture(); a.records[0].values.so2 = -3;
  assert.ok(validateDataset(a).issues.some((i) => i.code === 'VALUE_NEGATIVE'));
  const b = fixture(); b.records[0].values.so2 = Number.NaN;
  assert.ok(validateDataset(b).issues.some((i) => i.code === 'VALUE_NOT_NUMBER'));
  const c = fixture(); c.records[0].values.so2 = '10';
  assert.ok(validateDataset(c).issues.some((i) => i.code === 'VALUE_NOT_NUMBER'));
});

test('sourceId tidak dikenal → error; sourceUrl jelek → error', () => {
  const a = fixture(); a.dataset.sourceId = 'nope';
  assert.ok(validateDataset(a, { knownSourceIds: ['src-a'] }).issues.some((i) => i.code === 'SOURCE_UNKNOWN'));
  const b = fixture(); b.dataset.sourceUrl = 'javascript:alert(1)';
  assert.ok(validateDataset(b).issues.some((i) => i.code === 'SOURCE_URL'));
});

test('derived.ispu di luar 0–500 → error; kategori tak konsisten → error', () => {
  const a = fixture(); a.records[0].derived.ispu = 900;
  assert.ok(validateDataset(a).issues.some((i) => i.code === 'ISPU_RANGE'));
  const b = fixture(); b.records[0].derived.category = 'Sedang';
  assert.ok(validateDataset(b).issues.some((i) => i.code === 'ISPU_CATEGORY'));
});

test('date invalid → error; date null sah (granularitas tahunan sumber)', () => {
  const a = fixture(); a.records[0].date = '2021-13-40';
  assert.ok(validateDataset(a).issues.some((i) => i.code === 'RECORD_DATE'));
  assert.equal(validateDataset(fixture()).issues.filter((i) => i.code === 'RECORD_DATE').length, 0);
});

test('records kosong → error (jangan samarkan ketidaktersediaan)', () => {
  const a = fixture(); a.records = [];
  assert.ok(validateDataset(a).issues.some((i) => i.code === 'RECORDS_EMPTY'));
});

test('Validator tidak mengubah data', () => {
  const a = fixture();
  const snapshot = JSON.stringify(a);
  validateDataset(a);
  assert.equal(JSON.stringify(a), snapshot);
});

/* ====================================================================== */
/* 4. FORMATTER                                                            */
/* ====================================================================== */
console.log('\n[4] formatters.js');

test('formatNumber/formatIndex: null & NaN → — (bukan 0)', () => {
  assert.equal(formatNumber(null), '—');
  assert.equal(formatIndex(undefined), '—');
  assert.equal(formatPercent(Number.NaN), '—');
  assert.equal(formatIndex(32.475), '32');
});

test('safeExternalUrl: hanya http(s)', () => {
  assert.equal(safeExternalUrl('https://example.gov/a'), 'https://example.gov/a');
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl(null), null);
  assert.equal(safeExternalUrl('/relative/path'), null);
});

/* ====================================================================== */
/* 5. VALIDASI DATASET HASIL BUILD (integrasi)                             */
/* ====================================================================== */
console.log('\n[5] Dataset build Cirebon (integrasi)');

import { readFileSync } from 'node:fs';
for (const year of [2021, 2022, 2023, 2024, 2025]) {
  test(`cirebon-${year}.json lolos validator`, () => {
    const dataset = JSON.parse(readFileSync(new URL(`../public/data/aqi/cirebon-${year}.json`, import.meta.url), 'utf8'));
    const result = validateDataset(dataset, { knownSourceIds: ['dlh-cirebon-2021-2025'] });
    const errors = result.issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, JSON.stringify(errors, null, 2));
  });
}

test('regions.json konsisten: path & record count', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/data/aqi/regions.json', import.meta.url), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.defaultRegionId, 'cirebon');
  for (const yearEntry of manifest.regions[0].years) {
    const dataset = JSON.parse(readFileSync(new URL(`../public${yearEntry.dataPath}`, import.meta.url), 'utf8'));
    assert.equal(dataset.records.length, yearEntry.recordCount, yearEntry.dataPath);
    assert.equal(dataset.year, yearEntry.year);
  }
});

test('Null tetap null di JSON hasil build (missing NO₂ DISUKCAPIL 2024 TAHAP I)', () => {
  const dataset = JSON.parse(readFileSync(new URL('../public/data/aqi/cirebon-2024.json', import.meta.url), 'utf8'));
  const record = dataset.records.find((r) => r.locationId.includes('depan-kantor-disukcapil') && r.period.stage === 'TAHAP I');
  assert.ok(record, 'record DISUKCAPIL TAHAP I 2024 harus ada');
  assert.equal(record.values.no2, null);
  assert.equal(record.quality.no2.status, 'missing');
  assert.equal(record.derived.subIndex.no2.status, 'missing');
  assert.deepEqual(record.derived.availableParameters, ['so2']);
});

test('Nol tetap nol (2023, bukan missing): 6 grup 0,0 → ISPU 0 kategori Baik dengan catatan limitation', () => {
  const dataset = JSON.parse(readFileSync(new URL('../public/data/aqi/cirebon-2023.json', import.meta.url), 'utf8'));
  const zeroRecords = dataset.records.filter((r) => r.values.so2 === 0 && r.values.no2 === 0);
  assert.equal(zeroRecords.length, 6);
  for (const record of zeroRecords) {
    assert.equal(record.derived.ispu, 0);
    assert.equal(record.derived.category, 'Baik');
    assert.equal(record.quality.so2.status, 'valid');
  }
  assert.ok(dataset.dataset.limitations.some((l) => l.includes('0,0')));
});

/* ====================================================================== */
console.log(`\nHASIL: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) {
  for (const failure of failures) {
    console.error(`\n--- ${failure.name} ---`);
    console.error(failure.error.stack || failure.error.message);
  }
  process.exit(1);
}
