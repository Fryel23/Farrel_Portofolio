/*!
 * lab/core/stats.js - Statistik deskriptif null-safe (murni, tanpa DOM).
 *
 * Aturan (spec §7.4):
 *  - null/undefined/non-finite DIABAIKAN untuk statistik numerik, tidak
 *    pernah dikonversi menjadi nol.
 *  - Array kosong → null (eksplisit no-data), bukan 0.
 *  - Tidak memutasi array input (salin sebelum sort).
 *  - Median array genap = rata-rata dua nilai tengah.
 *  - standardDeviation: default 'population'; 'sample' (n-1) tersedia lewat
 *    opsi. Null (bukan 0) ketika sampel < 2 untuk sample SD atau array
 *    kosong untuk keduanya.
 *  - Deterministik untuk input sama.
 *
 * Catatan pemakaian: pemanggil TIDAK boleh mencampur statistik konsentrasi
 * (µg/m³) dengan statistik indeks (tanpa satuan) dalam satu nilai tampilan.
 */

function isUsableNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/* Saring nilai numerik valid TANPA memutasi input. */
export function validValues(values) {
  if (!Array.isArray(values)) return [];
  return values.filter(isUsableNumber);
}

/**
 * Rata-rata. null ketika tidak ada nilai valid.
 * Contoh wajib (spec §17.3): [10, null, 20] → 15 (null diabaikan, bukan 0).
 */
export function mean(values) {
  const valid = validValues(values);
  if (valid.length === 0) return null;
  let sum = 0;
  for (const value of valid) sum += value;
  return sum / valid.length;
}

/** Median. Array genap: rata-rata dua nilai tengah. */
export function median(values) {
  const valid = validValues(values);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Minimum nilai valid; null bila kosong. */
export function min(values) {
  const valid = validValues(values);
  if (valid.length === 0) return null;
  let result = valid[0];
  for (const value of valid) if (value < result) result = value;
  return result;
}

/** Maksimum nilai valid; null bila kosong. */
export function max(values) {
  const valid = validValues(values);
  if (valid.length === 0) return null;
  let result = valid[0];
  for (const value of valid) if (value > result) result = value;
  return result;
}

/**
 * Simpangan baku.
 * @param {Array<number|null>} values
 * @param {{type?: 'population'|'sample'}} [options] default 'population'
 * @returns {number|null}
 */
export function standardDeviation(values, options = {}) {
  const type = options.type === 'sample' ? 'sample' : 'population';
  const valid = validValues(values);
  if (valid.length === 0) return null;
  if (type === 'sample' && valid.length < 2) return null;
  const avg = mean(valid);
  let sumSquares = 0;
  for (const value of valid) sumSquares += (value - avg) * (value - avg);
  const divisor = type === 'sample' ? valid.length - 1 : valid.length;
  return Math.sqrt(sumSquares / divisor);
}

/** Jumlah nilai valid (angka finite). Non-array → 0. */
export function countValid(values) {
  if (!Array.isArray(values)) return 0;
  return validValues(values).length;
}

/** Jumlah nilai missing: null, undefined, NaN, non-finite. */
export function countMissing(values) {
  if (!Array.isArray(values)) return 0;
  return values.length - validValues(values).length;
}

/**
 * Persentase valid (0–100). null bila array kosong (bukan 0%).
 * @param {{decimals?: number}} [options]
 */
export function validPercentage(values, options = {}) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const decimals = Number.isFinite(options.decimals) ? options.decimals : 1;
  const pct = (validValues(values).length / values.length) * 100;
  return Number(pct.toFixed(decimals));
}
