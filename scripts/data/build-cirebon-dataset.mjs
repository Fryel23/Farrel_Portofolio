/*!
 * scripts/data/build-cirebon-dataset.mjs - Ingestion resmi Data Lab V12.0.
 *
 * Single responsibility: membaca CSV mentah DLH Kota Cirebon
 * (data/sources/data_kualitas_udara_2.csv), memvalidasi, mengagregasi baris
 * SO₂/NO₂ per (lokasi, tahun, tahap), menghitung sub-indeks & ISPU via modul
 * SHARED src/scripts/lab/core/aqi-calculator.js (satu sumber kebenaran;
 * logika ISPU yang sama dipakai build script dan tersedia untuk client),
 * lalu menulis:
 *   public/data/aqi/regions.json
 *   public/data/aqi/cirebon-<year>.json   (2021–2025)
 *   data/cirebon-ingest-audit.json        (audit + provenance)
 *
 * Prinsip anti-fabrication (spec §5.5, §6.4):
 *  - Tidak ada nilai dikarang; parameter tak dilaporkan → null + quality
 *    status 'missing'.
 *  - 0,0 adalah pengukuran valid bernilai nol → dipertahankan, TIDAK
 *    dianggap missing, TIDAK dianggap ISPU palsu (ISPU 0 = kategori Baik
 *    sesuai formula; pola 0,0 serentak didokumentasikan di limitations).
 *  - Tidak ada smoothing/interpolasi antar record.
 *  - Semua transformasi dicatat di audit (transformations[]).
 *
 * Pemakaian:
 *   node scripts/data/build-cirebon-dataset.mjs [--input <csv>] [--out <dir>]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, collapseWhitespace } from './csv-parser.mjs';
import {
  calculateSubIndex,
  getISPUFromSubIndices,
} from '../../src/scripts/lab/core/aqi-calculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

/* ---------------------------------------------------------------------- */
/* CLI args                                                                 */
/* ---------------------------------------------------------------------- */
function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const INPUT_PATH = resolve(PROJECT_ROOT, readArg('--input', 'data/sources/data_kualitas_udara_2.csv'));
const OUT_DIR = resolve(PROJECT_ROOT, readArg('--out', 'public/data/aqi'));
const AUDIT_PATH = resolve(PROJECT_ROOT, readArg('--audit', 'data/cirebon-ingest-audit.json'));

const todayIso = new Date().toISOString().slice(0, 10);

/* accessedAt = tanggal akses dataset melalui portal Open Data DLH Kota
 * Cirebon. Nilai '2026-11-01' adalah informasi provenance yang diberikan
 * pengguna untuk pekerjaan V12.0; tanggal ini BUKAN tanggal pembaruan
 * metadata sumber dan BUKAN tanggal build (tanggal build tetap memakai
 * `todayIso` pada field updatedAt, dan audit.generatedAt tetap timestamp
 * pembuatan artifact). Semantik ketiga tanggal ini sengaja dipisah. */
const SOURCE_ACCESSED_AT = '2026-11-01';

/* Path relatif terhadap project root (B3): portabel lintas OS, tanpa
 * string-replacement, dan menolak path yang keluar dari root. */
function toProjectRelative(absolutePath) {
  const rel = relative(PROJECT_ROOT, absolutePath);
  if (!rel || rel.startsWith('..')) {
    throw new Error(`Path berada di luar project root: ${absolutePath}`);
  }
  return rel.split(sep).join('/');
}

/* ---------------------------------------------------------------------- */
/* 1. Baca + hash sumber (provenance)                                       */
/* ---------------------------------------------------------------------- */
const rawCsv = readFileSync(INPUT_PATH, 'utf8');
const sourceSha256 = createHash('sha256').update(rawCsv).digest('hex');

/* ---------------------------------------------------------------------- */
/* 2. Parse + validasi header                                               */
/* ---------------------------------------------------------------------- */
const EXPECTED_HEADER = [
  'id', 'kode_provinsi', 'nama_provinsi', 'kode_kabupaten_kota', 'nama_kabupaten_kota',
  'lokasi', 'tahap', 'parameter', 'indeks_kualitas_udara', 'tahun',
];

const rows = parseCsv(rawCsv);
const header = rows[0].map((cell) => collapseWhitespace(cell));
if (header.join('|') !== EXPECTED_HEADER.join('|')) {
  throw new Error(`Header CSV tidak sesuai harapan:\n  dapat : ${header.join('|')}\n  harap : ${EXPECTED_HEADER.join('|')}`);
}

/* Pemetaan parameter sumber → id internal. Whitelist eksplisit: string tak
   dikenal menggagalkan build (tidak ada pemetaan diam-diam). */
const PARAMETER_MAP = {
  'SO₂ (µg/Nm³)': { id: 'so2', unit: 'µg/Nm³' },
  'NO₂ (µg/Nm³)': { id: 'no2', unit: 'µg/Nm³' },
};
const STAGE_WHITELIST = new Set(['TAHAP I', 'TAHAP II']);

const transformations = [];
transformations.push('Kolom `indeks_kualitas_udara` dipakai sebagai KONSENTRASI µg/Nm³ (nama kolom sumber menyesatkan; dikonfirmasi pemilik data: nilai masih konsentrasi, ISPU dihitung dengan rumus P.14/2020).');
transformations.push('Nama lokasi dinormalisasi whitespace (newline/spasi beruntuk → satu spasi) tanpa mengubah karakter lain.');
transformations.push('Baris SO₂/NO₂ yang terpisah diagregasi per kombinasi (lokasi, tahun, tahap) menjadi satu record.');
transformations.push('Sub-indeks & ISPU dihitung build-time dengan modul bersama src/scripts/lab/core/aqi-calculator.js (P.14/2020; allowBasisMismatch eksplisit karena basis waktu tahap tidak dilaporkan sumber dan tidak cocok dengan periode referensi tabel SO₂/NO₂ yang 24 jam; hasil ditandai derived).');
transformations.push('Tidak ada penghapusan/outlier/smoothing/interpolasi. Nilai null dipertahankan.');
transformations.push('Anomali duplikat ditangani transparan: bila satu kombinasi (lokasi, tahun, tahap, parameter) memuat >1 baris, nilai kemunculan pertama (urutan sumber) dipakai dan SEMUA kemunculan disimpan pada record.duplicates; tidak ada yang dihapus diam-diam.');

/* ---------------------------------------------------------------------- */
/* 3. Normalisasi + agregasi per (lokasi, tahun, tahap)                     */
/* ---------------------------------------------------------------------- */
/** @type {Map<string, {locationId, location, year, stage, values:Map<string,{value:number|null,rowId:string}>, duplicates:Map<string,Array<{value:number,rowId:string}>>}>} */
const groups = new Map();
const duplicateGroups = [];
let dataRowCount = 0;
let skippedBlankLines = 0; /* B5: baris kosong fisik yang dilewati parser (tidak dianggap data) */

for (let i = 1; i < rows.length; i += 1) {
  const cells = rows[i];
  if (cells.length === 1 && cells[0].trim() === '') { skippedBlankLines += 1; continue; } /* baris kosong */
  if (cells.length !== EXPECTED_HEADER.length) {
    throw new Error(`Baris ${i + 1} punya ${cells.length} kolom (harap ${EXPECTED_HEADER.length}).`);
  }
  const [idCell, , province, , kabKota, lokasiRaw, tahapRaw, parameterRaw, valueRaw, yearRaw] = cells;
  dataRowCount += 1;

  const location = collapseWhitespace(lokasiRaw);
  const stage = collapseWhitespace(tahapRaw).toUpperCase();
  const paramKey = collapseWhitespace(parameterRaw);
  const year = Number.parseInt(yearRaw, 10);

  if (!location) throw new Error(`Baris ${i + 1} (id ${idCell}): lokasi kosong.`);
  if (!STAGE_WHITELIST.has(stage)) throw new Error(`Baris ${i + 1} (id ${idCell}): tahap tak dikenal "${tahapRaw}".`);
  if (!PARAMETER_MAP[paramKey]) throw new Error(`Baris ${i + 1} (id ${idCell}): parameter tak dikenal "${parameterRaw}"; build digagalkan (anti pemetaan diam-diam).`);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error(`Baris ${i + 1} (id ${idCell}): tahun tidak valid "${yearRaw}".`);

  const provinceName = collapseWhitespace(province);
  const kabKotaName = collapseWhitespace(kabKota);
  if (provinceName !== 'JAWA BARAT' || kabKotaName !== 'KOTA CIREBON') {
    throw new Error(`Baris ${i + 1} (id ${idCell}): wilayah tak terduga "${provinceName}/${kabKotaName}".`);
  }

  /* Nilai: string kosong → null (missing); selain itu wajib numeric finite. */
  let value = null;
  const trimmedValue = valueRaw.trim();
  if (trimmedValue !== '') {
    value = Number(trimmedValue);
    if (!Number.isFinite(value)) throw new Error(`Baris ${i + 1} (id ${idCell}): nilai bukan angka "${valueRaw}".`);
    if (value < 0) throw new Error(`Baris ${i + 1} (id ${idCell}): konsentrasi negatif ${value} tidak valid.`);
  }

  const locationId = slugify(location);
  const key = `${locationId}|${year}|${stage}`;
  if (!groups.has(key)) {
    groups.set(key, { locationId, location, year, stage, values: new Map(), duplicates: new Map() });
  }
  const group = groups.get(key);
  const param = PARAMETER_MAP[paramKey];
  if (group.values.has(param.id)) {
    /* Duplikat sumber: JANGAN gagalkan build dan JANGAN menimpa diam-diam.
       Nilai pertama tetap dipakai; semua kemunculan dicatat. */
    if (!group.duplicates.has(param.id)) {
      const first = group.values.get(param.id);
      group.duplicates.set(param.id, [{ value: first.value, rowId: first.rowId, used: true }]);
      duplicateGroups.push({ location: group.location, year, stage, parameter: param.id });
    }
    group.duplicates.get(param.id).push({ value, rowId: idCell, used: false });
    continue;
  }
  group.values.set(param.id, { value, rowId: idCell });
}

/* B5: counter baris kosong masuk daftar transformasi (dari nilai parser
 * aktual, bukan hardcode). Pesan valid untuk 0, 1, atau N baris. */
transformations.push(`${skippedBlankLines} baris kosong dilewati parser (tidak dianggap data).`);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Daftar parameter yang diharapkan per record (urutan stabil). */
const PARAMETER_IDS = ['so2', 'no2'];

/* ---------------------------------------------------------------------- */
/* 4. Hitung sub-indeks + ISPU per record (modul shared P.14/2020)          */
/* ---------------------------------------------------------------------- */
function buildRecord(group) {
  const values = {};
  const quality = {};
  const subIndex = {};
  const duplicatesOut = {};

  for (const parameter of PARAMETER_IDS) {
    const entry = group.values.get(parameter) || null;
    if (entry && entry.value === null) {
      /* Baris ada tapi nilai kosong → missing eksplisit */
      values[parameter] = null;
      quality[parameter] = { status: 'missing', reason: 'Baris sumber ada tetapi nilai tidak diisi (string kosong).', sourceRowId: entry.rowId };
      subIndex[parameter] = { status: 'missing', value: null };
      continue;
    }
    if (!entry) {
      values[parameter] = null;
      quality[parameter] = { status: 'missing', reason: 'Parameter tidak dilaporkan sumber untuk kombinasi lokasi/tahap ini.', sourceRowId: null };
      subIndex[parameter] = { status: 'missing', value: null };
      continue;
    }
    values[parameter] = entry.value;
    quality[parameter] = { status: 'valid', sourceRowId: entry.rowId };
    if (group.duplicates.has(parameter)) {
      const occurrences = group.duplicates.get(parameter);
      duplicatesOut[parameter] = occurrences.map((occurrence) => ({ value: occurrence.value, sourceRowId: occurrence.rowId, used: occurrence.used }));
      quality[parameter].duplicateCount = occurrences.length;
      quality[parameter].note = `Sumber memuat ${occurrences.length} baris ${parameter} untuk kombinasi ini; nilai kemunculan pertama (urutan sumber) dipakai, seluruhnya disimpan di duplicates.`;
    }
    /* Basis waktu data = agregat tahap (tidak dilaporkan sumber) dan tidak
       cocok dengan periode referensi tabel 24 jam P.14/2020 → override
       eksplisit yang selalu ditandai. */
    const unit = PARAMETER_MAP[parameter === 'so2' ? 'SO₂ (µg/Nm³)' : 'NO₂ (µg/Nm³)'].unit;
    const result = calculateSubIndex({
      parameter,
      concentration: entry.value,
      unit,
      averagingPeriod: 'stage-aggregate',
      allowBasisMismatch: true,
    });
    if (result.status !== 'valid') {
      throw new Error(`Sub-indeks ${parameter} untuk "${group.location}" ${group.year} ${group.stage}: status tak terduga ${result.status}; ${result.detail}`);
    }
    if (!result.basisMatched) {
      /* diharapkan selalu false untuk dataset ini; dicatat sekali di audit */
    }
    subIndex[parameter] = { status: 'valid', value: Number(result.value.toFixed(4)) };
  }

  const ispuResult = getISPUFromSubIndices(subIndex);
  const derived = {
    method: 'P14-2020 (terderivasi; basis waktu tahap, bukan 24-jam resmi)',
    subIndex,
    ispuStatus: ispuResult.status,
    ispu: ispuResult.status === 'valid' ? Math.round(ispuResult.value) : null,
    dominantParameter: ispuResult.dominantParameter,
    availableParameters: ispuResult.availableParameters,
    category: ispuResult.category.status === 'valid' || ispuResult.category.status === 'beyond-scale'
      ? ispuResult.category.label
      : null,
  };

  return {
    id: `${group.year}-${slugify(group.stage)}-${group.locationId}`,
    date: null, /* sumber tidak melaporkan tanggal sub-tahun; tidak dikarang */
    period: { year: group.year, stage: group.stage },
    locationId: group.locationId,
    location: group.location,
    values,
    quality,
    duplicates: duplicatesOut,
    derived,
    reportedIndices: { ispu: null, note: 'Sumber melaporkan konsentrasi, bukan ISPU. Nilai ISPU pada record ini dihitung (derived) dengan P.14/2020.' },
  };
}

const recordsByYear = new Map();
for (const group of groups.values()) {
  if (!recordsByYear.has(group.year)) recordsByYear.set(group.year, []);
  recordsByYear.get(group.year).push(buildRecord(group));
}

/* Urutan stabil: tahap (I dulu), lalu nama lokasi. */
const STAGE_ORDER = { 'TAHAP I': 0, 'TAHAP II': 1 };
for (const records of recordsByYear.values()) {
  records.sort((a, b) => (STAGE_ORDER[a.period.stage] - STAGE_ORDER[b.period.stage])
    || a.location.localeCompare(b.location, 'id'));
}

/* ---------------------------------------------------------------------- */
/* 5. Statistik ingest (audit)                                              */
/* ---------------------------------------------------------------------- */
const perYearAudit = {};
const zeroValueGroups = [];
for (const [year, records] of [...recordsByYear.entries()].sort((a, b) => a[0] - b[0])) {
  const missing = { so2: 0, no2: 0 };
  const valid = { so2: 0, no2: 0 };
  let zeroCells = 0;
  for (const record of records) {
    for (const parameter of PARAMETER_IDS) {
      if (record.values[parameter] === null) missing[parameter] += 1;
      else {
        valid[parameter] += 1;
        if (record.values[parameter] === 0) zeroCells += 1;
      }
    }
    if (record.values.so2 === 0 && record.values.no2 === 0) {
      zeroValueGroups.push({ year, stage: record.period.stage, location: record.location, recordId: record.id });
    }
  }
  perYearAudit[year] = {
    records: records.length,
    locations: new Set(records.map((r) => r.locationId)).size,
    stages: [...new Set(records.map((r) => r.period.stage))].sort(),
    valid,
    missing,
    zeroCells,
  };
}

/* ---------------------------------------------------------------------- */
/* 6. Tulis dataset JSON per tahun + manifest                               */
/* ---------------------------------------------------------------------- */
/* Limitasi yang berlaku untuk SELURUH tahun (source-wide). Item tahun-
 * spesifik TIDAK diletakkan di sini; lihat yearSpecificLimitations(). */
const SHARED_LIMITATIONS = [
  'Sumber hanya melaporkan SO₂ dan NO₂. ISPU yang tampil adalah nilai TERDERIVASI dari sub-indeks maksimum dua parameter tersebut, bukan ISPU resmi tujuh parameter P.14/2020 (PM10, PM2.5, O₃, CO, HC tidak diukur sumber).',
  'Basis waktu pengukuran per tahap tidak dilaporkan sumber. Periode referensi tabel P.14/2020 untuk SO₂/NO₂ adalah 24 jam (bukan 1 jam), sehingga sub-indeks tetap bersifat estimasi terderivasi (basisMatched=false): periode tabel 24 jam tidak otomatis menjadikan observasi sumber sebagai rata-rata 24 jam, dan bukan ISPU resmi berbasis 24 jam.',
  'Satuan sumber "µg/Nm³" dipertahankan apa adanya; tidak ada konversi ke "µg/m³" karena kondisi referensi volume tidak disediakan sumber.',
  'Tidak semua lokasi diukur pada semua tahun/tahap; parameter yang tidak dilaporkan disimpan sebagai null (tanpa interpolasi atau pengisian).',
];

/* Limitasi tahun-spesifik (C9): dipisahkan dari source-wide agar tidak
 * bocor ke tahun lain. Hanya catatan yang terverifikasi terhadap data
 * aktual yang dimasukkan. */
function yearSpecificLimitations(year) {
  const items = [];
  if (year === 2023) {
    items.push('Enam kombinasi lokasi×tahap tahun 2023 melaporkan 0,0 µg/Nm³ untuk SO₂ dan NO₂ serentak (12 baris sumber). Nilai dipertahankan sebagai pengukuran valid bernilai nol sesuai sumber; kemungkinan makna "periode tanpa pengukuran" tidak dapat dikonfirmasi dari metadata yang tersedia dan diberi catatan eksplisit di UI.');
  }
  if (year === 2024) {
    items.push('Anomali duplikat sumber tahun 2024: kombinasi "DEPAN KANTOR DISUKCAPIL BIMA, JL. BRIGJEN DARSONO" TAHAP II memuat dua baris NO₂ (11,42 dan 9,73 µg/Nm³; baris id 10 dan 12). Nilai kemunculan pertama sesuai urutan sumber dipakai; keduanya disimpan pada field duplicates record terkait. Label tahap baris pertama diduga salah ketik (harusnya TAHAP I) namun TIDAK diubah karena tidak dapat diverifikasi.');
    items.push('Lokasi "DEPAN KANTOR DISUKCAPIL BIMA, JL. BRIGJEN DARSONO" TAHAP I 2024 hanya melaporkan SO₂; NO₂ tidak ada pada sumber (null).');
  }
  if (year === 2025) {
    items.push('Cakupan 2025 parsial: hanya 4 lokasi dengan TAHAP I pada sumber.');
  }
  return items;
}

function datasetJson(year, records) {
  const yearLimitations = yearSpecificLimitations(year);
  return {
    schemaVersion: 1,
    regionId: 'cirebon',
    year,
    dataset: {
      title: `Kualitas Udara Ambien Kota Cirebon ${year} · SO₂ & NO₂ (DLH Kota Cirebon)`,
      sourceId: 'dlh-cirebon-2021-2025',
      sourceUrl: null,
      sourceNote: 'Dataset resmi Dinas Lingkungan Hidup Kota Cirebon, diterima pemilik situs sebagai lampiran CSV + PDF metadata (portal data terbuka DLH Kota Cirebon). Kontak produsen: (0231) 202223 · dlh@cirebonkota.go.id.',
      accessedAt: SOURCE_ACCESSED_AT,
      license: 'unverified · dataset resmi pemerintah daerah tanpa pernyataan lisensi eksplisit pada metadata sumber',
      station: {
        id: null,
        name: null,
        latitude: null,
        longitude: null,
        classification: 'Jaringan pemantauan multi-lokasi (lokasi tepat tidak diberi koordinat oleh sumber)',
      },
      measurement: {
        method: null,
        qualityControl: null,
        timezone: 'Asia/Jakarta',
        frequency: 'Tahunan, 2 tahap pengukuran per tahun (basis waktu per tahap tidak dilaporkan sumber)',
      },
      parameterDefinitions: {
        so2: {
          unit: 'µg/Nm³ (sebagaimana dilaporkan sumber)',
          averagingPeriod: 'agregat tahap pengukuran (basis waktu tidak dilaporkan sumber)',
          aggregation: 'source-defined',
          measurementMethod: null,
        },
        no2: {
          unit: 'µg/Nm³ (sebagaimana dilaporkan sumber)',
          averagingPeriod: 'agregat tahap pengukuran (basis waktu tidak dilaporkan sumber)',
          aggregation: 'source-defined',
          measurementMethod: null,
        },
      },
      limitations: [...SHARED_LIMITATIONS, ...yearLimitations],
    },
    records,
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const written = [];
const years = [...recordsByYear.keys()].sort((a, b) => a - b);

for (const year of years) {
  const records = recordsByYear.get(year);
  const filePath = join(OUT_DIR, `cirebon-${year}.json`);
  writeFileSync(filePath, `${JSON.stringify(datasetJson(year, records), null, 2)}\n`, 'utf8');
  written.push(filePath);
}

/* Lokasi union (untuk selector, tanpa harus memuat semua dataset). */
const locationMap = new Map();
for (const group of groups.values()) {
  if (!locationMap.has(group.locationId)) locationMap.set(group.locationId, { id: group.locationId, name: group.location });
}
const locations = [...locationMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));

const manifest = {
  schemaVersion: 1,
  datasetVersion: '1.0.0',
  updatedAt: todayIso,
  defaultRegionId: 'cirebon',
  regions: [
    {
      id: 'cirebon',
      name: 'Kota Cirebon',
      province: 'Jawa Barat',
      country: 'Indonesia',
      timezone: 'Asia/Jakarta',
      coordinates: null,
      status: 'available',
      sourceIds: ['dlh-cirebon-2021-2025'],
      locations,
      years: years.map((year) => {
        const audit = perYearAudit[year];
        const partial = year === 2025;
        return {
          year,
          status: partial ? 'partial' : 'available',
          dataPath: `/data/aqi/cirebon-${year}.json`,
          coverageStart: String(year),
          coverageEnd: String(year),
          parameters: PARAMETER_IDS,
          recordCount: audit.records,
          locationCount: audit.locations,
          stages: audit.stages,
          missing: audit.missing,
          coverageNote: partial
            ? 'Parsial: 4 lokasi, TAHAP I saja (sumber belum melaporkan TAHAP II/lokasi lain).'
            : (audit.missing.so2 + audit.missing.no2 > 0
              ? 'Sebagian kecil kombinasi lokasi/tahap tidak melaporkan salah satu parameter (null).'
              : 'Kampanye 12 lokasi × 2 tahap (kecuali lokasi yang tidak diukur).'),
        };
      }),
    },
  ],
  sources: [
    {
      id: 'dlh-cirebon-2021-2025',
      name: 'Data Kualitas Udara Kota Cirebon 2021–2025',
      publisher: 'Dinas Lingkungan Hidup (DLH) Kota Cirebon',
      url: null,
      urlNote: 'Diterima sebagai lampiran resmi (CSV + PDF metadata) dari pemilik situs; dataset juga tersedia pada portal data terbuka DLH Kota Cirebon.',
      contact: '(0231) 202223 · dlh@cirebonkota.go.id',
      accessedAt: SOURCE_ACCESSED_AT,
      license: 'unverified',
      providedVia: 'Lampiran pemilik situs (data_kualitas_udara_2.csv + data_kualitas_udara_2_metadata.pdf)',
      sourceSha256,
      ispuMethod: 'PermenLHK P.14/2020 · tabel SO₂/NO₂ diverifikasi pemilik data dengan periode referensi tabel 24 jam; PM2.5 dari lampiran spek V12.0; parameter lain sengaja belum diimplementasikan.',
    },
  ],
};

const manifestPath = join(OUT_DIR, 'regions.json');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
written.push(manifestPath);

/* ---------------------------------------------------------------------- */
/* 7. Audit ingest (spec §6.5)                                              */
/* ---------------------------------------------------------------------- */
const audit = {
  generatedAt: new Date().toISOString(),
  input: {
    path: toProjectRelative(INPUT_PATH),
    sha256: sourceSha256,
    bytes: rawCsv.length,
  },
  parsed: {
    dataRows: dataRowCount,
    skippedBlankLines,
    parameters: { 'SO₂ (µg/Nm³)': 'so2', 'NO₂ (µg/Nm³)': 'no2' },
    uniqueLocations: locations.length,
    groups: groups.size,
  },
  perYear: perYearAudit,
  missingByParameter: {
    so2: Object.values(perYearAudit).reduce((sum, y) => sum + y.missing.so2, 0),
    no2: Object.values(perYearAudit).reduce((sum, y) => sum + y.missing.no2, 0),
  },
  zeroValueGroups,
  duplicateGroups,
  transformations,
  outputs: written.map(toProjectRelative),
  ispuMethodology: {
    formula: 'I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib',
    so2Table: '0-52→0-50; >52-180→51-100; >180-400→101-200; >400-800→201-300; >800-1200→301-500 (µg/m³)',
    no2Table: '0-80→0-50; >80-200→51-100; >200-1130→101-200; >1130-2260→201-300; >2260-3000→301-500 (µg/m³)',
    finalIndex: 'ISPU = round(max(subIndex so2, subIndex no2)); hanya parameter valid yang dibandingkan',
    basisNote: 'allowBasisMismatch=true (basis waktu tahap pengukuran tidak dilaporkan sumber; periode referensi tabel SO₂/NO₂ = 24 jam); seluruh nilai ditandai derived.',
  },
};
writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

/* ---------------------------------------------------------------------- */
/* 8. Ringkasan konsol                                                      */
/* ---------------------------------------------------------------------- */
console.log('=== BUILD DATASET CIREBON (DLH) SELESAI ===');
console.log(`Sumber       : ${toProjectRelative(INPUT_PATH)}`);
console.log(`sha256       : ${sourceSha256.slice(0, 16)}…`);
console.log(`Baris data   : ${dataRowCount} (baris kosong dilewati: ${skippedBlankLines}) → grup (lokasi×tahun×tahap): ${groups.size}`);
console.log(`Lokasi unik  : ${locations.length}`);
for (const [year, info] of Object.entries(perYearAudit)) {
  console.log(`  ${year}: ${info.records} record, ${info.locations} lokasi, tahap [${info.stages.join(', ')}], valid so2=${info.valid.so2} no2=${info.valid.no2}, missing so2=${info.missing.so2} no2=${info.missing.no2}, sel 0,0=${info.zeroCells}`);
}
console.log(`Keluaran     :\n  ${written.join('\n  ')}\n  ${AUDIT_PATH}`);
