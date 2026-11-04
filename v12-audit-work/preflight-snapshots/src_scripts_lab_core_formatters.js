/*!
 * lab/core/formatters.js — Format tampilan (murni, tanpa DOM).
 *
 * Single responsibility: menyatukan aturan tampilan angka/persen/URL agar
 * UI tidak punya logika format tersebar. Missing SELALU jadi em-dash "—"
 * (bukan 0, bukan "null") sesuai spec §9.2-D dan §9.2-F.
 */

const LOCALE = 'id-ID';

/**
 * Format angka desimal. null/undefined/NaN → '—'.
 * @param {number|null|undefined} value
 * @param {{maxFractionDigits?: number, minFractionDigits?: number}} [options]
 */
export function formatNumber(value, options = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const maxFractionDigits = Number.isInteger(options.maxFractionDigits) ? options.maxFractionDigits : 2;
  const minFractionDigits = Number.isInteger(options.minFractionDigits) ? options.minFractionDigits : 0;
  return new Intl.NumberFormat(LOCALE, { maxFractionDigits, minFractionDigits }).format(value);
}

/** Format indeks ISPU (integer). null/invalid → '—'. */
export function formatIndex(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value);
}

/** Format persentase dari angka 0–100. null → '—'. */
export function formatPercent(value, options = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const maxFractionDigits = Number.isInteger(options.maxFractionDigits) ? options.maxFractionDigits : 1;
  return `${new Intl.NumberFormat(LOCALE, { maxFractionDigits }).format(value)}%`;
}

/** Label satuan untuk parameter (dari id → label tampilan). */
export const PARAMETER_LABELS = {
  so2: 'SO₂',
  no2: 'NO₂',
  pm25: 'PM2.5',
  ispu: 'ISPU',
};

export function parameterLabel(parameter) {
  return PARAMETER_LABELS[parameter] || parameter;
}

/**
 * Validasi URL eksternal untuk href anchor: hanya http(s) absolut.
 * URL tidak valid → null (pemanggil wajib menangani null, bukan me-render
 * href kosong) — spec §13.7.
 * @param {string|null} url
 * @returns {string|null}
 */
export function safeExternalUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
    return null;
  } catch {
    return null;
  }
}

/** Teks "Tidak tersedia" konsisten untuk metadata yang sumber tidak beri. */
export const NOT_PROVIDED = 'Tidak disediakan sumber';
