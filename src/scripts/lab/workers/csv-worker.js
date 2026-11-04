// @ts-check
/*!
 * lab/workers/csv-worker.js - Web Worker CSV Explorer (module worker).
 *
 * Single responsibility: seluruh pekerjaan berat CSV berjalan DI SINI -
 * membaca file, decoding UTF-8 (fatal: error encoding jelas), parsing,
 * validasi record, klasifikasi kolom, statistik deskriptif, dan persiapan
 * data chart (spec §7). Main thread HANYA memvalidasi file, mengirim File,
 * menerima payload terstruktur, dan merender UI.
 *
 * Tambahan amanat V12.3 (FASE 5): UI TIDAK PERNAH menerima data mentah.
 * Worker hanya mengirim: (1) metadata kolom, (2) maksimal 5 baris
 * pratinjau, (3) hasil statistik (Mean/Median/dll), (4) data chart
 * (maksimal 5.000 titik). Array ratusan ribu baris TIDAK PERNAH dikirim ke
 * Main Thread (anti-OOM) - dijamin oleh bentuk payload pure
 * buildAnalysisPayload/buildChartPayload yang diuji di test-csv-explorer.mjs.
 *
 * Inisialisasi (dari src/scripts/lab/csv.js, sintaks Vite yang diwajibkan
 * amanat FASE 4 - tanpa import statis file Worker):
 *   new Worker(new URL('./workers/csv-worker.js', import.meta.url), { type: 'module' })
 * (Segmen path relatif menyesuaikan lokasi file aktual: csv.js berada di
 * src/scripts/lab/, worker di src/scripts/lab/workers/ sesuai spec §2.1.)
 *
 * Kontrak pesan (spec §7.3):
 *   Request  { type: 'ANALYZE_FILE',   requestId, file }
 *   Request  { type: 'GET_CHART_DATA', requestId, xColumnId, yColumnId }
 *   Response { type: 'ANALYSIS_SUCCESS', requestId, payload }
 *   Response { type: 'CHART_SUCCESS',    requestId, payload }
 *   Response { type: 'WORKER_ERROR',     requestId, code, message }
 *   - requestId di-echo persis agar main thread dapat membuang hasil usang.
 *   - WORKER_ERROR: kode stabil + pesan aman; TIDAK ada stack trace dan
 *     TIDAK ada isi CSV (spec §7.3, §14).
 *
 * Pengelolaan file & memori (spec §7.4):
 *  - Worker memegang SATU referensi file aktif (activeFile) agar permintaan
 *    chart dapat membaca ulang file tanpa pengiriman ulang.
 *  - TIDAK ada salinan dataset mentah yang dipertahankan antar pesan:
 *    GET_CHART_DATA mem-parse ulang teks file (deterministik) dan hanya
 *    menyusun seri untuk dua kolom yang diminta.
 *  - Penggantian file = ANALYZE_FILE baru; main thread melakukan
 *    terminate() untuk pekerjaan lama yang masih berjalan (pembatalan yang
 *    dapat diandalkan, spec §7.5) lalu membuat Worker baru.
 */

import { LIMITS, buildAnalysisPayload, buildChartPayload, toSafeErrorPayload } from '../shared/csv-analysis.js';
import { CsvParseError } from '../shared/csv-parser.js';

/**
 * @typedef {import('../../../types/lab-csv.ts').CsvWorkerRequest} CsvWorkerRequest
 * @typedef {import('../../../types/lab-csv.ts').CsvWorkerResponse} CsvWorkerResponse
 * @typedef {import('../../../types/lab-csv.ts').CsvAnalysisPayload} CsvAnalysisPayload
 * @typedef {import('../../../types/lab-csv.ts').CsvChartPayload} CsvChartPayload
 */

/**
 * Kontrak minimal objek seperti File yang dapat dibaca di Worker maupun Node test.
 * @typedef {Object} ReadableFileLike
 * @property {string} [name]
 * @property {number} size
 * @property {() => Promise<ArrayBuffer>} arrayBuffer
 */

/**
 * Referensi file aktif tunggal (dipecah saat ANALYZE_FILE berikutnya).
 * @type {ReadableFileLike | null}
 */
let activeFile = null;

/**
 * Baca + dekode file sebagai teks UTF-8 dengan error yang jelas.
 * fatal:true → byte bukan UTF-8 valid melempar TypeError, dipetakan ke
 * error berkode CSV_ENCODING (bukan hasil decode diam-diam berisi U+FFFD).
 * @param {ReadableFileLike} file
 * @returns {Promise<string>}
 */
async function readFileText(file) {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    return decoder.decode(buffer);
  } catch {
    /** @type {Error & { code?: string }} */
    const error = new Error(
      'File bukan UTF-8 yang valid. Simpan ulang file sebagai UTF-8, lalu coba lagi.',
    );
    error.code = 'CSV_ENCODING';
    throw error;
  }
}

/**
 * @param {string | null | undefined} requestId
 * @param {{ activeFile: ReadableFileLike | null }} state
 * @returns {ReadableFileLike}
 */
function requireActiveFile(requestId, state) {
  if (!state.activeFile) {
    /** @type {Error & { code?: string; requestId?: string | null }} */
    const error = new Error('Tidak ada file aktif. Unggah file CSV terlebih dahulu.');
    error.code = 'CSV_NO_ACTIVE_FILE';
    error.requestId = requestId ?? null;
    throw error;
  }
  return state.activeFile;
}

/**
 * Memproses satu pesan request Worker secara deterministik dan mengembalikan
 * objek response terstruktur sesuai kontrak CsvWorkerResponse.
 * Dapat diuji langsung di Node tanpa environment browser (V13.0-B).
 *
 * @param {unknown} request
 * @param {{ activeFile: ReadableFileLike | null }} [state]
 * @returns {Promise<CsvWorkerResponse>}
 */
export async function processWorkerRequest(
  request,
  state = {
    get activeFile() {
      return activeFile;
    },
    set activeFile(val) {
      activeFile = val;
    },
  }
) {
  if (!request || typeof request !== 'object') {
    const safe = toSafeErrorPayload(null, 'CSV_MALFORMED_REQUEST', 'Permintaan tidak valid.');
    return {
      type: 'WORKER_ERROR',
      requestId: null,
      code: safe.code,
      message: safe.message,
    };
  }

  const reqObj = /** @type {Record<string, unknown>} */ (request);
  const requestId = typeof reqObj.requestId === 'string' ? reqObj.requestId : null;

  try {
    if (reqObj.type === 'ANALYZE_FILE') {
      const file = /** @type {ReadableFileLike | undefined} */ (reqObj.file);
      if (!file || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') {
        /** @type {Error & { code?: string }} */
        const error = new Error('File tidak dapat dibaca. Pilih file CSV dan coba lagi.');
        error.code = 'CSV_FILE_UNREADABLE';
        throw error;
      }
      if (file.size > LIMITS.MAX_FILE_BYTES) {
        const limitMb = Math.round(LIMITS.MAX_FILE_BYTES / (1024 * 1024));
        /** @type {Error & { code?: string }} */
        const error = new Error(`Ukuran file melebihi batas ${limitMb} MiB.`);
        error.code = 'CSV_LIMIT_FILE_SIZE';
        throw error;
      }
      if (file.size === 0) {
        /** @type {Error & { code?: string }} */
        const error = new Error('File kosong (0 byte).');
        error.code = 'CSV_EMPTY_FILE';
        throw error;
      }

      state.activeFile = file; /* satu file aktif; referensi lama dilepas */
      const text = await readFileText(file);
      const payload = buildAnalysisPayload(text, { name: file.name ?? null, sizeBytes: file.size });
      return {
        type: 'ANALYSIS_SUCCESS',
        requestId: requestId ?? '',
        payload,
      };
    }

    if (reqObj.type === 'GET_CHART_DATA') {
      const file = requireActiveFile(requestId, state);
      const text = await readFileText(file); /* baca ulang; tanpa cache raw */
      const payload = buildChartPayload(text, {
        xColumnId: String(reqObj.xColumnId ?? ''),
        yColumnId: String(reqObj.yColumnId ?? ''),
      });
      return {
        type: 'CHART_SUCCESS',
        requestId: requestId ?? '',
        payload,
      };
    }

    /** @type {Error & { code?: string; requestId?: string | null }} */
    const error = new Error('Jenis permintaan tidak dikenal.');
    error.code = 'CSV_UNKNOWN_REQUEST';
    error.requestId = requestId;
    throw error;
  } catch (error) {
    const safe = toSafeErrorPayload(error, 'ANALYSIS_FAILED', 'Gagal memproses file CSV.');
    return {
      type: 'WORKER_ERROR',
      requestId,
      code: safe.code,
      message: safe.message,
    };
  }
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', async (event) => {
    const response = await processWorkerRequest(event.data);
    self.postMessage(response);
  });
}

/* Catatan: error fatal worker (mis. bug implementasi) juga dilaporkan
   agar UI tidak menunggu selamanya. self.onerror ada di main thread
   (worker.onerror) - di sini cukup jaga setiap handler async dengan
   try/catch (sudah: seluruh jalur di dalam handler di atas). */
