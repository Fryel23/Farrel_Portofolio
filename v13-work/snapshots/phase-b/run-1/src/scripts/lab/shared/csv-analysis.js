/*!
 * lab/shared/csv-analysis.js - Engine analisis CSV (murni, tanpa DOM,
 * tanpa Chart.js, tanpa Node.js API).
 *
 * Single responsibility: mengubah aliran record dari csv-parser.js menjadi
 * metadata kolom, klasifikasi tipe, pratinjau, statistik deskriptif, dan
 * seri data chart. Parser bertanggung jawab atas sintaks; modul ini
 * bertanggung jawab atas MAKNA data (spec §6).
 *
 * Kontrak penting:
 *  - Seluruh fungsi PURE terhadap teks input: hasil deterministik, tidak
 *    ada state global, tidak ada akses File/DOM (File dibaca Worker).
 *  - Statistik dihitung terhadap DATASET LENGKAP (bukan pratinjau/sampel).
 *  - Tidak ada pembulatan prematur; UI yang memformat tampilan.
 *  - Fungsi pure buildAnalysisPayload/buildChartPayload juga dipanggil
 *    langsung oleh csv-worker.js sehingga kontrak pesan Worker dapat
 *    diuji di Node tanpa environment browser (spec §12.3).
 *
 * Klasifikasi tipe (spec §6.3) - konservatif:
 *  - numeric : semua nilai non-missing memenuhi format angka eksplisit
 *              (integer, negatif, desimal titik, notasi ilmiah) DAN hasil
 *              konversinya finite. "1,000" BUKAN angka (locale di luar
 *              cakupan). NaN/Infinity/string kosong/whitespace bukan angka.
 *  - date    : semua nilai non-missing adalah ISO yang dapat diinterpretasi
 *              konsisten (YYYY-MM-DD atau ISO datetime T, divalidasi
 *              kalender). Tanggal ambigu → categorical. Date.parse() tidak
 *              dipakai tanpa validasi format.
 *  - categorical: selain dua di atas, termasuk kolom kosong semua dan
 *              kolom campuran.
 *  - Missing value: string kosong, string whitespace saja, atau field
 *              hasil normalisasi record pendek. Token "NA"/"N/A"/"null"/
 *              "undefined" diperlakukan STRING BIASA (bukan missing) -
 *              kebijakan eksplisit yang didokumentasikan.
 *
 * Kebijakan jumlah kolom (spec §6.2):
 *  - Record lebih pendek dari header → dinormalisasi (field kosong
 *    ditambahkan) dan DICATAT sebagai warning (normalizedRecordCount).
 *  - Record lebih panjang dari header → DITOLAK dengan error jelas
 *    (CSV_RECORD_TOO_LONG); tidak ada pembuangan kolom diam-diam.
 *  - Baris kosong fisik (satu field kosong pada file multi-kolom) adalah
 *    artefak newline, dilewati dan dicacah (blankLinesSkipped). Pada file
 *    satu kolom, baris kosong adalah DATA sah (nilai missing) karena
 *    tidak ada cara membedakannya dari nilai kosong.
 *
 * Batas resource (spec §6.5) - konstanta terpusat di LIMITS, divalidasi
 * secara inkremental SEBELUM struktur besar dialokasikan; pelanggaran
 * menghentikan pemrosesan (tidak ada hasil parsial).
 */

import { mean, median, min, max } from './stats.js';
import { iterateCsvRecords, CsvParseError } from './csv-parser.js';

/** Batas resource V12.3 - satu-satunya sumber kebenaran (spec §6.5). */
export const LIMITS = Object.freeze({
  MAX_FILE_BYTES: 10 * 1024 * 1024, /* 10 MiB */
  MAX_COLUMNS: 100,
  MAX_RECORDS: 100000,
  MAX_CELLS: 500000,
  MAX_CHART_POINTS: 5000,
  MAX_PREVIEW_ROWS: 5,
});

/** Error analisis dengan kode stabil; pesan aman untuk pengguna. */
export class CsvAnalysisError extends Error {
  /**
   * @param {string} code kode stabil (CSV_*, CSV_LIMIT_*)
   * @param {string} message pesan aman tanpa isi CSV
   * @param {{recordIndex?: number}} [context]
   */
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'CsvAnalysisError';
    this.code = code;
    this.recordIndex = typeof context.recordIndex === 'number' ? context.recordIndex : null;
  }
}

const NUMERIC_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const COLUMN_ID_RE = /^column-(\d+)$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return lengths[month - 1];
}

/** YYYY-MM-DD dengan validasi kalender (termasuk tahun kabisat). */
export function isIsoDateString(value) {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

/** ISO datetime (T, menit wajib; detik/ms dan zona opsional). */
function isIsoDateTimeString(value) {
  const match = ISO_DATETIME_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  return true;
}

/**
 * Uji format angka eksplisit SEBELUM Number() (spec §6.3). Whitespace
 * diproses pemanggil (trim tingkat analisis, bukan parser).
 */
export function parseNumericValue(raw) {
  const trimmed = raw.trim();
  if (trimmed === '') return { status: 'missing' };
  if (!NUMERIC_RE.test(trimmed)) return { status: 'non-numeric' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { status: 'non-numeric' }; /* 1e999 dst */
  return { status: 'numeric', value };
}

function classifyColumnState(state) {
  if (state.nonEmptyCount === 0) return 'categorical'; /* kolom kosong semua */
  if (state.allNumeric) return 'numeric';
  if (state.allDate) return 'date';
  return 'categorical';
}

function createHeaderMetadata(headerRecord) {
  const columnCount = headerRecord.length;
  if (columnCount > LIMITS.MAX_COLUMNS) {
    throw new CsvAnalysisError(
      'CSV_LIMIT_COLUMNS',
      `Jumlah kolom (${columnCount}) melebihi batas maksimum ${LIMITS.MAX_COLUMNS}.`,
    );
  }
  const seenTrimmed = new Map(); /* nama trimmed → jumlah kemunculan */
  const columns = headerRecord.map((rawName, index) => {
    const trimmed = rawName.trim();
    let displayName;
    if (trimmed === '') {
      displayName = `Kolom ${index + 1}`;
    } else {
      const seen = (seenTrimmed.get(trimmed) || 0) + 1;
      seenTrimmed.set(trimmed, seen);
      displayName = seen === 1 ? trimmed : `${trimmed} · ${seen}`;
    }
    return {
      id: `column-${index}`,
      index,
      name: rawName === '' ? null : rawName, /* nama asli dipertahankan */
      displayName,
      type: 'categorical', /* diperbarui setelah klasifikasi */
      validCount: 0,
      missingCount: 0,
    };
  });
  return columns;
}

/**
 * Analisis lengkap: header, klasifikasi kolom, pratinjau, statistik, warning.
 * Streaming: record diproses satu per satu; array numerik per kolom hanya
 * dipertahankan selama kolom masih kandidat numeric (dibebaskan begitu
 * kolom ternyata categorical/date) untuk menekan penggunaan memori (§6.6).
 *
 * @param {string} text isi CSV
 * @param {{name?: string|null, sizeBytes?: number|null}} [fileMeta] metadata
 *        file untuk tampilan (TIDAK diambil dari isi CSV)
 * @returns {object} payload ANALYSIS_SUCCESS (tanpa type/requestId)
 * @throws {CsvAnalysisError|CsvParseError} error dengan kode stabil
 */
export function buildAnalysisPayload(text, fileMeta = {}) {
  const iterator = iterateCsvRecords(text);
  const first = iterator.next();
  if (first.done) {
    throw new CsvAnalysisError('CSV_EMPTY', 'File kosong atau hanya berisi BOM. Tidak ada header yang dapat dibaca.');
  }

  const columns = createHeaderMetadata(first.value);
  const columnCount = columns.length;

  /* State klasifikasi + akumulasi per kolom. */
  const states = columns.map(() => ({
    allNumeric: true,
    allDate: true,
    nonEmptyCount: 0,
    numericValues: [], /* array angka valid; null-ized bila kolom ternoda */
    tainted: false,
  }));

  let rowCount = 0;
  let cells = 0;
  let normalizedRecordCount = 0;
  let blankLinesSkipped = 0;
  const previewRows = [];

  for (const record of iterator) {
    if (record.length === 1 && record[0] === '' && columnCount > 1) {
      blankLinesSkipped += 1; /* baris kosong fisik, bukan data */
      continue;
    }

    if (rowCount >= LIMITS.MAX_RECORDS) {
      throw new CsvAnalysisError(
        'CSV_LIMIT_RECORDS',
        `Jumlah baris data melebihi batas maksimum ${LIMITS.MAX_RECORDS.toLocaleString('id-ID')}.`,
      );
    }
    if (cells + record.length > LIMITS.MAX_CELLS) {
      throw new CsvAnalysisError(
        'CSV_LIMIT_CELLS',
        `Jumlah sel data melebihi batas maksimum ${LIMITS.MAX_CELLS.toLocaleString('id-ID')} sel.`,
      );
    }

    let recordFields = record;
    if (record.length > columnCount) {
      throw new CsvAnalysisError(
        'CSV_RECORD_TOO_LONG',
        `Record ke-${rowCount + 1} memiliki ${record.length} field, lebih banyak dari ${columnCount} kolom header. Perbaiki struktur CSV.`,
        { recordIndex: rowCount + 2 }, /* +header */
      );
    }
    if (record.length < columnCount) {
      recordFields = record.slice();
      recordFields.length = columnCount; /* pad dengan undefined → '' */
      for (let i = 0; i < columnCount; i += 1) {
        if (recordFields[i] === undefined) recordFields[i] = '';
      }
      normalizedRecordCount += 1;
    }

    rowCount += 1;
    cells += columnCount;

    if (previewRows.length < LIMITS.MAX_PREVIEW_ROWS) {
      previewRows.push(recordFields);
    }

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const state = states[columnIndex];
      const raw = recordFields[columnIndex];
      const trimmed = raw.trim();

      if (trimmed === '') continue; /* missing: tanpa konversi nol */

      state.nonEmptyCount += 1;

      if (state.allNumeric) {
        const parsed = parseNumericValue(trimmed);
        if (parsed.status === 'numeric') {
          if (!state.tainted) state.numericValues.push(parsed.value);
        } else {
          state.allNumeric = false;
          state.numericValues = null; /* bebaskan array (§6.6) */
          state.tainted = true;
        }
      }

      if (state.allDate && !isIsoDateString(trimmed) && !isIsoDateTimeString(trimmed)) {
        state.allDate = false;
      }
    }
  }

  if (rowCount === 0) {
    throw new CsvAnalysisError('CSV_NO_DATA', 'Header terbaca, tetapi file tidak memuat satu baris data pun.');
  }

  const statsByColumnId = {};
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const column = columns[columnIndex];
    const state = states[columnIndex];
    column.type = classifyColumnState(state);
    column.validCount = state.nonEmptyCount;
    column.missingCount = rowCount - state.nonEmptyCount;

    if (column.type === 'numeric') {
      const values = state.numericValues || [];
      statsByColumnId[column.id] = {
        mean: mean(values),
        median: median(values),
        min: min(values),
        max: max(values),
        validCount: values.length,
        missingCount: rowCount - values.length,
      };
    }
    state.numericValues = null; /* bebaskan sebelum payload dikirim */
  }

  return {
    file: {
      name: typeof fileMeta.name === 'string' ? fileMeta.name : null,
      sizeBytes: Number.isFinite(fileMeta.sizeBytes) ? fileMeta.sizeBytes : null,
    },
    columnCount,
    rowCount,
    columns,
    preview: {
      requestedRows: LIMITS.MAX_PREVIEW_ROWS,
      rows: previewRows,
    },
    stats: statsByColumnId,
    warnings: {
      normalizedRecordCount,
      blankLinesSkipped,
      hasWarnings: normalizedRecordCount > 0 || blankLinesSkipped > 0,
    },
  };
}

/**
 * Sampel deterministik untuk chart (spec §9.3): mempertahankan urutan,
 * titik awal & akhir, dan upaya terbaik representasi gap missing-value
 * di bawah batas keras MAX_CHART_POINTS.
 *
 * @param {Array<number|null>} values seri Y (null = missing)
 * @returns {{indices: number[], sampled: boolean}}
 */
export function sampleChartIndices(values) {
  const total = values.length;
  if (total <= LIMITS.MAX_CHART_POINTS) {
    const indices = new Array(total);
    for (let i = 0; i < total; i += 1) indices[i] = i;
    return { indices, sampled: false };
  }

  const stride = Math.ceil(total / LIMITS.MAX_CHART_POINTS);
  const selected = new Set();
  for (let i = 0; i < total; i += stride) selected.add(i);
  selected.add(total - 1); /* titik akhir selalu dipertahankan */

  /* Gap pass (upaya terbaik): antara dua titik terpilih yang keduanya
     valid, sisipkan null pertama di antaranya agar spanGaps:false tetap
     menampilkan gap. Berhenti bila kuota titik penuh (batas keras). */
  const ordered = [...selected].sort((a, b) => a - b);
  for (let k = 1; k < ordered.length && selected.size < LIMITS.MAX_CHART_POINTS; k += 1) {
    const start = ordered[k - 1];
    const end = ordered[k];
    if (values[start] !== null || values[end] !== null) continue;
    for (let i = start + 1; i < end; i += 1) {
      if (values[i] === null) {
        selected.add(i);
        ordered.splice(k, 0, i);
        break;
      }
    }
  }

  return { indices: [...selected].sort((a, b) => a - b), sampled: true };
}

/**
 * Susun payload data chart dari teks CSV (murni; dipanggil Worker untuk
 * GET_CHART_DATA dan unit test). Teks diparse ulang per permintaan sehingga
 * Worker tidak pernah menyimpan dataset mentah (spec §7.4).
 *
 * X harus kolom date/categorical; Y harus kolom numeric. Nilai Y missing
 * menjadi null (bukan 0) agar spanGaps:false menampilkan gap (spec §9.2).
 *
 * @param {string} text isi CSV
 * @param {{xColumnId: string, yColumnId: string}} selection
 * @returns {object} payload CHART_SUCCESS (tanpa type/requestId)
 */
export function buildChartPayload(text, selection) {
  const xMatch = COLUMN_ID_RE.exec(String(selection.xColumnId || ''));
  const yMatch = COLUMN_ID_RE.exec(String(selection.yColumnId || ''));
  if (!xMatch) throw new CsvAnalysisError('CSV_COLUMN_UNKNOWN', 'Pilihan kolom X tidak dikenal.');
  if (!yMatch) throw new CsvAnalysisError('CSV_COLUMN_UNKNOWN', 'Pilihan kolom Y tidak dikenal.');
  const xIndex = Number(xMatch[1]);
  const yIndex = Number(yMatch[1]);

  const iterator = iterateCsvRecords(text);
  const first = iterator.next();
  if (first.done) {
    throw new CsvAnalysisError('CSV_EMPTY', 'File kosong atau hanya berisi BOM.');
  }
  const columnCount = first.value.length;
  if (xIndex >= columnCount || yIndex >= columnCount) {
    throw new CsvAnalysisError('CSV_COLUMN_UNKNOWN', 'Pilihan kolom berada di luar jumlah kolom file.');
  }

  const labels = [];
  const values = [];
  let xAllNumeric = true;
  let xAllDate = true;
  let xNonEmpty = 0;
  let totalRecords = 0;

  for (const rawRecord of iterator) {
    if (rawRecord.length === 1 && rawRecord[0] === '' && columnCount > 1) continue;

    if (totalRecords >= LIMITS.MAX_RECORDS) {
      throw new CsvAnalysisError(
        'CSV_LIMIT_RECORDS',
        `Jumlah baris data melebihi batas maksimum ${LIMITS.MAX_RECORDS.toLocaleString('id-ID')}.`,
      );
    }
    let fields = rawRecord;
    if (rawRecord.length < columnCount) {
      /* Normalisasi konsisten dengan analisis (pad belakang). */
      fields = rawRecord.slice();
      fields.length = columnCount;
      for (let i = 0; i < columnCount; i += 1) {
        if (fields[i] === undefined) fields[i] = '';
      }
    } else if (rawRecord.length > columnCount) {
      throw new CsvAnalysisError(
        'CSV_RECORD_TOO_LONG',
        `Record ke-${totalRecords + 1} memiliki field lebih banyak dari header. Perbaiki struktur CSV.`,
        { recordIndex: totalRecords + 2 },
      );
    }

    const xRaw = fields[xIndex];
    const xTrimmed = xRaw.trim();
    if (xTrimmed !== '') {
      xNonEmpty += 1;
      if (xAllNumeric && parseNumericValue(xTrimmed).status !== 'numeric') xAllNumeric = false;
      if (xAllDate && !isIsoDateString(xTrimmed) && !isIsoDateTimeString(xTrimmed)) xAllDate = false;
    }
    labels.push(xRaw);

    const yParsed = parseNumericValue(fields[yIndex]);
    if (yParsed.status === 'non-numeric') {
      throw new CsvAnalysisError(
        'CSV_Y_NOT_NUMERIC',
        `Kolom Y (record ke-${totalRecords + 1}) memuat nilai bukan angka. Pilih kolom numerik untuk sumbu Y.`,
        { recordIndex: totalRecords + 2 },
      );
    }
    values.push(yParsed.status === 'numeric' ? yParsed.value : null);
    totalRecords += 1;
  }

  if (xNonEmpty === 0) {
    throw new CsvAnalysisError('CSV_X_NOT_SUPPORTED', 'Kolom X tidak memiliki satu nilai pun.');
  }
  if (xAllNumeric) {
    throw new CsvAnalysisError('CSV_X_NOT_SUPPORTED', 'Sumbu X harus kolom kategori atau tanggal, bukan kolom numerik. Pilih kolom numerik sebagai sumbu Y.');
  }
  const xType = xAllDate ? 'date' : 'categorical';

  const { indices, sampled } = sampleChartIndices(values);
  const outLabels = new Array(indices.length);
  const outValues = new Array(indices.length);
  for (let k = 0; k < indices.length; k += 1) {
    outLabels[k] = labels[indices[k]];
    outValues[k] = values[indices[k]];
  }

  return {
    xColumnId: `column-${xIndex}`,
    yColumnId: `column-${yIndex}`,
    xType,
    labels: outLabels,
    values: outValues,
    totalRecords,
    pointsSent: indices.length,
    sampled,
    sampleStride: sampled ? Math.ceil(totalRecords / LIMITS.MAX_CHART_POINTS) : null,
  };
}

/**
 * Peta error → {code, message} aman untuk UI.
 *
 * Kontrak keamanan: error dengan kode berawalan "CSV_" (CsvParseError,
 * CsvAnalysisError, maupun error ad-hoc Worker seperti CSV_ENCODING) WAJIB
 * punya pesan yang dibangun tanpa isi CSV - itu yang menjadikannya aman
 * dikirim ke UI. Error lain (bug internal, TypeError, dsb.) jatuh ke
 * fallback generik agar detail internal tidak pernah bocor.
 */
export function toSafeErrorPayload(error, fallbackCode, fallbackMessage) {
  if (error instanceof CsvParseError || error instanceof CsvAnalysisError) {
    return { code: error.code, message: error.message };
  }
  if (
    error &&
    typeof error.code === 'string' &&
    error.code.startsWith('CSV_') &&
    typeof error.message === 'string' &&
    error.message.length > 0
  ) {
    return { code: error.code, message: error.message };
  }
  return { code: fallbackCode, message: fallbackMessage };
}
