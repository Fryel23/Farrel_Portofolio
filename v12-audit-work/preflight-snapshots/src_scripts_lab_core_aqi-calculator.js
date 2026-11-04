/*!
 * lab/core/aqi-calculator.js — Sub-indeks & ISPU berdasarkan PermenLHK P.14/2020.
 *
 * Single responsibility: perhitungan MURNI (tanpa DOM, tanpa fetch, tanpa
 * state browser, deterministik) untuk mengonversi konsentrasi polutan menjadi
 * sub-indeks ISPU, menentukan polutan dominan, dan memetakan kategori.
 *
 * Sumber tabel breakpoint (verifikasi berlapis):
 *  - SO₂ & NO₂ : tabel resmi Permen LHK No. 14 Tahun 2020, diverifikasi dan
 *    disediakan eksplisit oleh pemilik data (2026), formula:
 *        I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib
 *    SO₂  (µg/m³): 0-52→0-50, 53-180→51-100, 181-400→101-200,
 *                  401-800→201-300, 801-1200→301-500
 *    NO₂  (µg/m³): 0-80→0-50, 81-200→51-100, 201-1130→101-200,
 *                  1131-2260→201-300, 2261-3000→301-500
 *  - PM2.5 : rantai breakpoint dari lampiran spek V12.0
 *    (0–15.5–55.4–150.4–250.4–350.4–500.4 µg/m³), dipetakan ke 6 pita
 *    (0-50, 51-100, 101-200, 201-300, 301-400, 401-500). Parameter ini
 *    TIDAK ada pada dataset Cirebon; implementasi untuk kelengkapan kalkulator.
 *  - PM10, O₃, CO, HC : tabel P.14/2020 BELUM terverifikasi dari sumber
 *    primer → sengaja TIDAK diimplementasikan (anti-fabrication). Panggilan
 *    dengan parameter tersebut mengembalikan status 'unsupported-parameter'.
 *
 * Tafsiran batas kontinu: tabel resmi menuliskan batas integer per pita
 * (mis. "0–52", "53–180"). Implementasi memakai semantik kontinu resmi
 * ">52 – 180" agar tidak ada celah nilai (spec §7.2: no overlap/gap):
 * pita berikutnya berlaku untuk X > batas atas pita sebelumnya (inklusif di
 * batas atas pita). Toleransi floating point EPS dipakai di semua perbandingan.
 *
 * Catatan basis waktu (averaging period): tabel P.14/2020 diturunkan untuk
 * konsentrasi berbasis waktu tertentu (SO₂/NO₂ 1 jam, PM2.5 24 jam). Dataset
 * DLH Cirebon adalah agregat per tahap pengukuran (basis waktu tidak
 * dilaporkan sumber). calculateSubIndex() menandai ketidakcocokan basis ini
 * sebagai status 'unsupported-averaging-period' KECUALI pemanggil secara
 * eksplisit mem-pass allowBasisMismatch: true — dan hasilnya selalu
 * ditandai basisMatched: false agar tidak bisa disamarkan sebagai ISPU resmi
 * berbasis 1-jam (spec aturan 11 + D10). Dataset Cirebon memakai jalur
 * eksplisit tersebut; label "terderivasi" dipertahankan di seluruh UI.
 */

/* Toleransi floating point untuk perbandingan batas. */
export const EPS = 1e-9;

/**
 * Tabel breakpoint P.14/2020 (hanya parameter yang terverifikasi).
 * Setiap interval: { low, high, iLow, iHigh } dengan semantik:
 *   low < X <= high  (kecuali interval pertama: 0 <= X <= high)
 * iLow/iHigh = rentang ISPU pita (Ib/Ia pada rumus interpolasi).
 */
export const P14_2020 = {
  method: 'P14-2020',
  formula: 'I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib',
  regulation: 'Peraturan Menteri LHK RI No. P.14/MENLHK/SETJEN/KUM.1/7/2020',
  tables: {
    so2: {
      label: 'SO₂',
      unit: 'µg/m³',
      averagingPeriod: '1h',
      intervals: [
        { low: 0, high: 52, iLow: 0, iHigh: 50 },
        { low: 52, high: 180, iLow: 51, iHigh: 100 },
        { low: 180, high: 400, iLow: 101, iHigh: 200 },
        { low: 400, high: 800, iLow: 201, iHigh: 300 },
        { low: 800, high: 1200, iLow: 301, iHigh: 500 },
      ],
    },
    no2: {
      label: 'NO₂',
      unit: 'µg/m³',
      averagingPeriod: '1h',
      intervals: [
        { low: 0, high: 80, iLow: 0, iHigh: 50 },
        { low: 80, high: 200, iLow: 51, iHigh: 100 },
        { low: 200, high: 1130, iLow: 101, iHigh: 200 },
        { low: 1130, high: 2260, iLow: 201, iHigh: 300 },
        { low: 2260, high: 3000, iLow: 301, iHigh: 500 },
      ],
    },
    pm25: {
      label: 'PM2.5',
      unit: 'µg/m³',
      averagingPeriod: '24h',
      intervals: [
        { low: 0, high: 15.5, iLow: 0, iHigh: 50 },
        { low: 15.5, high: 55.4, iLow: 51, iHigh: 100 },
        { low: 55.4, high: 150.4, iLow: 101, iHigh: 200 },
        { low: 150.4, high: 250.4, iLow: 201, iHigh: 300 },
        { low: 250.4, high: 350.4, iLow: 301, iHigh: 400 },
        { low: 350.4, high: 500.4, iLow: 401, iHigh: 500 },
      ],
    },
  },
};

/** Parameter yang tabelnya benar-benar diimplementasikan. */
export const SUPPORTED_PARAMETERS = Object.keys(P14_2020.tables);

/** Kategori ISPU (P.14/2020). Batas: <=50 Baik, <=100 Sedang, <=200 Tidak
 *  Sehat, <=300 Sangat Tidak Sehat, >300 Berbahaya. token = kunci CSS. */
export const ISPU_CATEGORIES = [
  { token: 'baik', label: 'Baik', max: 50, range: '0–50', color: '#16A34A', description: 'Tidak ada dampak bagi kesehatan manusia dan hewan ataupun bangunan.' },
  { token: 'sedang', label: 'Sedang', max: 100, range: '51–100', color: '#D9A406', description: 'Tidak berpengaruh bagi kesehatan manusia atau hewan tetapi berpengaruh pada tumbuhan sensitif.' },
  { token: 'tidak-sehat', label: 'Tidak Sehat', max: 200, range: '101–200', color: '#DC2626', description: 'Merugikan manusia atau golongan sensitif, dapat merugikan tumbuhan atau nilai estetika.' },
  { token: 'sangat-tidak-sehat', label: 'Sangat Tidak Sehat', max: 300, range: '201–300', color: '#9333EA', description: 'Berpotensi merugikan kesehatan manusia pada sejumlah segmen populasi yang terpapar.' },
  { token: 'berbahaya', label: 'Berbahaya', max: Infinity, range: '> 300', color: '#0F172A', description: 'Berbahaya secara umum dan dapat merugikan kesehatan serius.' },
];

/** Normalisasi satuan untuk perbandingan: 'µg/Nm³' dan 'µg/m³' diperlakukan
 *  setara SESUAI PELAPORAN SUMBER (basis referensi volume tidak dikonversi —
 *  faktor konversi Nm³→m³ tidak tersedia dan tidak dikarang; dicatat pada
 *  limitations dataset). */
export function normalizeUnit(unit) {
  if (typeof unit !== 'string') return null;
  const compact = unit.replace(/\s+/g, '').replace(/[Nn]m³/g, 'm³');
  return compact.toLowerCase();
}

/** Cari interval breakpoint yang memuat konsentrasi c (c >= 0). */
export function findInterval(table, concentration) {
  for (const interval of table.intervals) {
    const aboveLow = concentration > interval.low + EPS || interval.low === 0;
    const belowHigh = concentration <= interval.high + EPS;
    if (aboveLow && belowHigh) return interval;
  }
  return null; /* di atas batas tertinggi tabel */
}

/* Interpolasi linear murni. Prasyarat: interval valid (high > low). */
export function interpolate(concentration, interval) {
  const { low, high, iLow, iHigh } = interval;
  return iLow + ((iHigh - iLow) / (high - low)) * (concentration - low);
}

/* Pembulatan ISPU akhir ke integer terdekat (praktik pelaporan ISPU). */
export function roundIndex(value) {
  return Math.round(value);
}

/**
 * Hitung sub-indeks satu parameter.
 * @param {object} input
 * @param {string} input.parameter    'so2' | 'no2' | 'pm25'
 * @param {number|null} input.concentration  konsentrasi (null = tidak ada data)
 * @param {string} [input.unit]       satuan konsentrasi
 * @param {string} [input.averagingPeriod]  basis waktu data pemanggil
 * @param {string} [input.method]     hanya 'P14-2020' yang didukung
 * @param {boolean} [input.allowBasisMismatch]  override eksplisit basis waktu
 *        (hasil tetap ditandai basisMatched:false)
 * @returns {{status:string, value:number|null, valueRounded:number|null,
 *          category:object|null, basisMatched:boolean, detail:string}}
 *  status ∈ valid | missing | invalid-input | unsupported-parameter |
 *  unsupported-averaging-period | unsupported-method | out-of-range
 */
export function calculateSubIndex({
  parameter,
  concentration,
  unit,
  averagingPeriod,
  validPercent = null,
  method = 'P14-2020',
  allowBasisMismatch = false,
} = {}) {
  const fail = (status, detail) => ({
    status, value: null, valueRounded: null, category: null,
    basisMatched: false, detail,
  });

  if (typeof parameter !== 'string' || !P14_2020.tables[parameter]) {
    return fail('unsupported-parameter', `Parameter "${String(parameter)}" belum punya tabel breakpoint terverifikasi.`);
  }
  if (method !== P14_2020.method) {
    return fail('unsupported-method', `Metode "${String(method)}" tidak didukung; hanya ${P14_2020.method}.`);
  }
  if (concentration === null || concentration === undefined) {
    return fail('missing', 'Konsentrasi tidak tersedia (null).');
  }
  if (typeof concentration !== 'number' || !Number.isFinite(concentration)) {
    return fail('invalid-input', 'Konsentrasi bukan angka finite.');
  }
  if (concentration < 0) {
    return fail('invalid-input', 'Konsentrasi negatif tidak valid secara fisik untuk polutan udara ambien.');
  }
  if (validPercent !== null && validPercent !== undefined) {
    if (typeof validPercent !== 'number' || !Number.isFinite(validPercent) || validPercent < 0 || validPercent > 100) {
      return fail('invalid-input', 'validPercent harus angka 0–100 atau null.');
    }
    if (validPercent < 75) {
      return fail('insufficient-data', `Kelengkapan data ${validPercent}% di bawah ambang 75% — sub-indeks tidak dihitung.`);
    }
  }

  const table = P14_2020.tables[parameter];

  if (unit !== undefined && unit !== null) {
    const normalized = normalizeUnit(unit);
    if (normalized !== normalizeUnit(table.unit)) {
      return fail('invalid-input', `Satuan "${unit}" tidak cocok dengan satuan tabel (${table.unit}).`);
    }
  }

  let basisMatched = true;
  if (averagingPeriod !== undefined && averagingPeriod !== null && averagingPeriod !== table.averagingPeriod) {
    if (!allowBasisMismatch) {
      return fail('unsupported-averaging-period',
        `Basis waktu data ("${averagingPeriod}") ≠ basis tabel (${table.averagingPeriod}). ` +
        'ISPU resmi tidak dihitung tanpa basis yang sesuai.');
    }
    basisMatched = false; /* override eksplisit — tetap ditandai */
  }

  /* Nol adalah pengukuran valid (spec §5.5) → sub-indeks 0, kategori Baik. */
  const topInterval = table.intervals[table.intervals.length - 1];
  if (concentration > topInterval.high + EPS) {
    /* Di atas batas tertinggi tabel: tidak ada endpoint indeks resmi →
       tidak diinterpolasi (anti-ekstrapolasi). Kategori tetap dapat
       dinyatakan karena threshold Berbahaya terlampaui. */
    return {
      status: 'out-of-range',
      value: null,
      valueRounded: null,
      category: getISPUCategory(Infinity),
      basisMatched,
      detail: `Konsentrasi ${concentration} melebihi batas tabel ${table.unit} ${topInterval.high}; kategori Berbahaya tanpa nilai indeks numerik.`,
    };
  }

  const interval = findInterval(table, concentration);
  if (!interval) return fail('out-of-range', 'Konsentrasi di luar rentang tabel breakpoint.');

  const raw = interpolate(concentration, interval);
  return {
    status: 'valid',
    value: raw,
    valueRounded: roundIndex(raw),
    category: getISPUCategory(raw),
    basisMatched,
    detail: `Pita ${interval.low}–${interval.high} ${table.unit} → ISPU ${interval.iLow}–${interval.iHigh}.`,
  };
}

/**
 * Peta nilai indeks → kategori ISPU.
 * @returns {{status:'valid'|'missing'|'invalid'|'beyond-scale', token,
 *          label, range, color, description}}
 */
export function getISPUCategory(indexValue) {
  if (indexValue === null || indexValue === undefined) {
    return { status: 'missing', token: null, label: null, range: null, color: null, description: null };
  }
  if (indexValue === Infinity) {
    /* Dipakai internally untuk "melebihi skala tabel" — kategori
       threshold-based tanpa klaim angka. */
    const top = ISPU_CATEGORIES[ISPU_CATEGORIES.length - 1];
    return { status: 'beyond-scale', token: top.token, label: top.label, range: top.range, color: top.color, description: top.description };
  }
  if (typeof indexValue !== 'number' || !Number.isFinite(indexValue) || indexValue < -EPS) {
    return { status: 'invalid', token: null, label: null, range: null, color: null, description: null };
  }
  if (indexValue > 500 + EPS) {
    /* Melebihi skala tabel: kategori Berbahaya (threshold-based) tanpa
       klaim angka indeks. */
    const top = ISPU_CATEGORIES[ISPU_CATEGORIES.length - 1];
    return { status: 'beyond-scale', token: top.token, label: top.label, range: top.range, color: top.color, description: top.description };
  }
  for (const category of ISPU_CATEGORIES) {
    if (indexValue <= category.max + EPS) {
      return {
        status: 'valid',
        token: category.token,
        label: category.label,
        range: category.range,
        color: category.color,
        description: category.description,
      };
    }
  }
  return { status: 'invalid', token: null, label: null, range: null, color: null, description: null };
}

/**
 * ISPU final = sub-indeks maksimum di antara parameter yang valid
 * (polutan dominan). Hanya membandingkan sub-indeks yang statusnya 'valid'
 * (metodologi setara, P.14/2020) — bukan konsentrasi mentah (spec §7.5).
 * @param {Object<string,{status:string,value:number|null}>} subIndexResults
 * @returns {{status:'valid'|'missing'|'invalid', value:number|null,
 *          dominantParameter:string|null, availableParameters:string[],
 *          category:object}}
 */
export function getISPUFromSubIndices(subIndexResults) {
  if (!subIndexResults || typeof subIndexResults !== 'object') {
    return { status: 'invalid', value: null, dominantParameter: null, availableParameters: [], category: getISPUCategory(null) };
  }
  const availableParameters = [];
  let best = null;
  for (const [parameter, result] of Object.entries(subIndexResults)) {
    if (result && result.status === 'valid' && Number.isFinite(result.value)) {
      availableParameters.push(parameter);
      if (!best || result.value > best.value + EPS) best = { parameter, value: result.value };
    }
  }
  if (!best) {
    return { status: 'missing', value: null, dominantParameter: null, availableParameters, category: getISPUCategory(null) };
  }
  return {
    status: 'valid',
    value: best.value,
    dominantParameter: best.parameter,
    availableParameters,
    category: getISPUCategory(best.value),
  };
}

/**
 * Polutan dominan dari sekumpulan record (mode ringkasan tahun):
 * parameter yang paling sering menjadi argmax sub-indeks. Hanya parameter
 * tersedia yang dipertimbangkan; bila tidak ada sub-indeks valid sama
 * sekali → null dengan status eksplisit (spec §7.5 poin 5).
 * @param {Array<{derived: {subIndex: Object<string,{status,value}>}}>} records
 */
export function getDominantParameterSummary(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { status: 'no-data', counts: {}, leader: null, sampleSize: 0 };
  }
  const counts = { so2: 0, no2: 0, pm25: 0 };
  let considered = 0;
  for (const record of records) {
    const subIndex = record && record.derived && record.derived.subIndex;
    if (!subIndex) continue;
    let localBest = null;
    for (const [parameter, result] of Object.entries(subIndex)) {
      if (result && result.status === 'valid' && Number.isFinite(result.value)) {
        if (!localBest || result.value > localBest.value + EPS) localBest = { parameter, value: result.value };
      }
    }
    if (localBest) {
      counts[localBest.parameter] = (counts[localBest.parameter] || 0) + 1;
      considered += 1;
    }
  }
  if (considered === 0) return { status: 'no-data', counts, leader: null, sampleSize: 0 };
  let leader = null;
  for (const parameter of Object.keys(counts)) {
    if (counts[parameter] > 0 && (!leader || counts[parameter] > counts[leader])) leader = parameter;
  }
  return { status: 'valid', counts, leader, sampleSize: considered };
}
