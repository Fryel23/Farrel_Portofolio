/*!
 * src/data/taxonomy.js - TAXONOMY KANONIS (V12.2).
 *
 * Single source of truth untuk identifier + label terkontrol di content
 * collection `work`. DIIMPOR OLEH: src/content.config.ts (schema Zod),
 * src/pages/work/[slug].astro (render chips), scripts/test-content-integrity.mjs
 * (unit test validator). JANGAN mendefinisikan daftar ini di tempat lain —
 * schema, UI, dan test wajib memakai definisi kanonis yang sama.
 *
 * Konvensi:
 *  - `id`: lowercase kebab-case, stabil. Mengubah id = migrasi relasi.
 *  - `label`: teks tampilan yang dirender apa adanya (JANGAN mengubah label
 *    yang sudah dirender di situs tanpa keputusan eksplisit).
 *  - Daftar ini BUKAN izin mengklaim penggunaan teknologi: nilai yang
 *    ditulis di frontmatter harus terbukti dari implementasi aktual.
 */

/** @typedef {{ id: string, label: string }} TaxonomyOption */

/**
 * Disiplin kanonis (V12.2: kandidat dari spec, dipakai sesuai bukti).
 * @type {TaxonomyOption[]}
 */
export const DISCIPLINES = [
  { id: 'data-analysis', label: 'Data Analysis' },
  { id: 'software-engineering', label: 'Software Engineering' },
  { id: 'artificial-intelligence', label: 'Artificial Intelligence' },
  { id: 'database-systems', label: 'Database Systems' },
  { id: 'iot', label: 'IoT' },
];

/**
 * Teknologi kanonis (V12.2: kandidat dari spec + `node-js` karena pipeline
 * ingestion berjalan pada Node.js — terverifikasi package.json engines/scripts).
 * @type {TaxonomyOption[]}
 */
export const TECHNOLOGIES = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'astro', label: 'Astro' },
  { id: 'chart-js', label: 'Chart.js' },
  { id: 'node-js', label: 'Node.js' },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'sql', label: 'SQL' },
  { id: 'pandas', label: 'Pandas' },
];

/**
 * Status lifecycle kanonis. Arti (dokumentasi V12.2):
 *  - PUBLISHED   : pekerjaan selesai dengan halaman case study publik.
 *  - IN PROGRESS : pekerjaan aktif dengan halaman case study publik.
 *  - RESERVED    : slot placeholder jujur — TIDAK pernah menghasilkan rute
 *                  publik, tidak dihitung sebagai pekerjaan (perilaku V8.1,
 *                  dipertahankan).
 *  - ARCHIVED    : ditarik dari rute publik tanpa menghapus konten.
 * Nilai existing V12.1: 'IN PROGRESS' (aqi-cirebon), 'RESERVED' (dua slot).
 * Jangan me-remap status tanpa keputusan eksplisit.
 * @type {TaxonomyOption[]}
 */
export const STATUS_OPTIONS = [
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'IN PROGRESS', label: 'In Progress' },
  { id: 'RESERVED', label: 'Reserved' },
  { id: 'ARCHIVED', label: 'Archived' },
];

/** @type {string[]} daftar id disciplines (untuk z.enum & validator). */
export const DISCIPLINE_IDS = DISCIPLINES.map((option) => option.id);

/** @type {string[]} daftar id technologies (untuk z.enum & validator). */
export const TECHNOLOGY_IDS = TECHNOLOGIES.map((option) => option.id);

/** @type {string[]} daftar id status (untuk z.enum & validator). */
export const STATUS_IDS = STATUS_OPTIONS.map((option) => option.id);

/**
 * Cari label kanonis dari id. Mengembalikan undefined untuk id tak dikenal —
 * pemanggil WAJIB tidak merender id tak dikenal secara diam-diam.
 * @param {TaxonomyOption[]} options daftar kanonis
 * @param {string} id
 * @returns {string | undefined}
 */
export function taxonomyLabel(options, id) {
  return options.find((option) => option.id === id)?.label;
}

/**
 * Format kontenId yang valid: lowercase kebab-case. Dipakai schema (regex)
 * dan validator (format + ambiguitas normalisasi) dari SATU definisi ini.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidContentId(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Bentuk normalisasi untuk deteksi id ambigu (V12.2: "Ambiguous normalized
 * IDs"): trim + lowercase. Dua id berbeda yang normalisasinya sama dianggap
 * ambigu.
 * @param {string} value
 * @returns {string}
 */
export function normalizeContentId(value) {
  return value.trim().toLowerCase();
}
