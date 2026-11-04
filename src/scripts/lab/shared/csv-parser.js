// @ts-check
/*!
 * lab/shared/csv-parser.js - Parser CSV RFC 4180 untuk browser (murni, tanpa
 * DOM, tanpa Node.js API, tanpa dependency).
 *
 * Single responsibility: mengubah TEKS CSV menjadi aliran record (array field
 * string) satu per satu lewat generator, sehingga konsumen (Worker) dapat
 * memproses bertahap tanpa menyimpan seluruh array baris sekaligus (spec
 * §5.3). Parser bertanggung jawab ATAS SINTAKS CSV saja; normalisasi data,
 * klasifikasi kolom, dan statistik ada di csv-analysis.js.
 *
 * Format didukung (spec §5.1):
 *  1. Field biasa dipisah koma.
 *  2. Field diapit tanda kutip.
 *  3. Koma di dalam quoted field.
 *  4. Double quote ter-escape ("").
 *  5. Newline di dalam quoted field.
 *  6. CRLF; 7. LF (toleran).
 *  8. Empty field; 9. Empty field di akhir baris.
 *  10. UTF-8 BOM (dilepas sekali di awal teks).
 *  11. Baris terakhir tanpa newline; 12. Trailing newline tanpa record
 *      kosong palsu.
 *
 * Deteksi error (spec §5.2) - parser Node (scripts/data/csv-parser.mjs)
 * sengaja toleran karena berjalan pada pipeline build terkontrol; parser
 * browser ini KETAT karena menerima input publik:
 *  - CSV_UNCLOSED_QUOTE : quoted field tidak ditutup sampai akhir teks.
 *  - CSV_ILLEGAL_QUOTE  : tanda kutip di dalam unquoted field.
 *  - CSV_TRAILING_CHARS : karakter lain setelah closing quote sebelum
 *                         delimiter/akhir record (strict, termasuk spasi).
 * Error membawa konteks posisi (recordIndex & columnIndex, 1-based, header
 * = record 1) tetapi TIDAK PERNAH memuat isi field (isi CSV tidak boleh
 * bocor ke pesan/console - spec §1.3, §14).
 *
 * Keputusan perilaku yang didokumentasikan (berbeda dari parser Node):
 *  - BOM dilepas; parser Node membiarkannya di field pertama.
 *  - CR tunggal (bukan pasangan CRLF) diperlakukan sebagai konten field;
 *    parser Node menghapus semua CR di luar kutip.
 *  - Baris kosong fisik tetap di-YIELD sebagai record [''] (konsisten dengan
 *    parser Node); kebijakan melewatkannya ada di csv-analysis.js sehingga
 *    tidak ada data yang dibuang diam-diam di lapisan parser.
 *  - Kutip yang tidak legal pada input valid tidak pernah muncul, sehingga
 *    untuk seluruh CSV valid kedua parser menghasilkan field yang sama
 *    (dijaga lewat fixture test yang sama, spec §5.4).
 *
 * Delimiter: koma (tidak ada auto-deteksi). Encoding: UTF-8 (decoding ada di
 * Worker; parser menerima string). Tidak ada trimming nilai (spec §5.1);
 * whitespace diproses pada tahap analisis bila relevan.
 */

/**
 * @typedef {import('../../../types/lab-csv.ts').CsvParserState} CsvParserState
 * @typedef {import('../../../types/lab-csv.ts').CsvParseErrorCode} CsvParseErrorCode
 * @typedef {import('../../../types/lab-csv.ts').CsvErrorPositionContext} CsvErrorPositionContext
 */

/** Error parsing dengan konteks posisi; pesan aman untuk ditampilkan. */
export class CsvParseError extends Error {
  /**
   * @param {CsvParseErrorCode} code kode stabil (CSV_UNCLOSED_QUOTE | CSV_ILLEGAL_QUOTE | CSV_TRAILING_CHARS)
   * @param {string} message pesan aman (tanpa isi CSV)
   * @param {CsvErrorPositionContext} [context]
   */
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'CsvParseError';
    /** @type {CsvParseErrorCode} */
    this.code = code;
    /** @type {number | null} */
    this.recordIndex = typeof context.recordIndex === 'number' ? context.recordIndex : null;
    /** @type {number | null} */
    this.columnIndex = typeof context.columnIndex === 'number' ? context.columnIndex : null;
  }
}

const CHAR_COMMA = 44;   /* , */
const CHAR_CR = 13;      /* \r */
const CHAR_LF = 10;      /* \n */
const CHAR_QUOTE = 34;   /* " */
const CHAR_BOM = 0xFEFF;

/**
 * Iterasi record CSV satu per satu (lazy; tanpa menampung seluruh file).
 *
 * @param {string} text isi CSV (sudah didekode UTF-8; BOM boleh ada)
 * @yields {string[]} satu record (array field; panjang bervariasi antar
 *          record - validasi jumlah kolom adalah tanggung jawab analisis)
 * @returns {Generator<string[], void, unknown>}
 * @throws {CsvParseError} saat struktur CSV tidak valid
 */
export function* iterateCsvRecords(text) {
  if (typeof text !== 'string') {
    throw new TypeError('iterateCsvRecords: input harus string.');
  }

  const n = text.length;
  let i = n > 0 && text.charCodeAt(0) === CHAR_BOM ? 1 : 0;

  /* State machine: 'field-start' | 'unquoted' | 'quoted' | 'after-quote'.
     Field dibangun via slice (cepat); bila mengandung escaped quote ("" ),
     segmen sebelum escape dikumpulkan di `parts` lalu digabung - hanya
     field ber-escape yang membayar biaya alokasi tambahan. */
  /** @type {string[]} */
  let record = [];
  let fieldStart = i;
  /** @type {string[] | null} */
  let parts = null; /* Array<string>|null : segmen field ber-escape */
  /** @type {CsvParserState} */
  let state = 'field-start';
  let recordIndex = 1; /* header = record 1 */
  let columnIndex = 1; /* 1-based kolom saat ini */

  /** @param {number} endIndex */
  const finishField = (endIndex) => {
    /** @type {string} */
    let value;
    if (parts !== null) {
      if (endIndex > fieldStart) parts.push(text.slice(fieldStart, endIndex));
      value = parts.join('');
      parts = null;
    } else {
      value = endIndex > fieldStart ? text.slice(fieldStart, endIndex) : '';
    }
    record.push(value);
    columnIndex += 1;
  };

  const finishRecord = () => {
    const finished = record;
    record = [];
    recordIndex += 1;
    columnIndex = 1;
    return finished;
  };

  while (i < n) {
    const char = text.charCodeAt(i);

    if (state === 'quoted') {
      if (char === CHAR_QUOTE) {
        if (text.charCodeAt(i + 1) === CHAR_QUOTE) {
          /* Escaped quote: simpan segmen sebelum escape + satu kutip. */
          if (parts === null) parts = [];
          parts.push(text.slice(fieldStart, i), '"');
          i += 2;
          fieldStart = i;
        } else {
          state = 'after-quote';
          i += 1;
        }
      } else {
        i += 1;
      }
      continue;
    }

    if (state === 'after-quote') {
      if (char === CHAR_COMMA) {
        finishField(i - 1); /* buang closing quote */
        i += 1;
        fieldStart = i;
        state = 'field-start';
      } else if (char === CHAR_LF) {
        finishField(i - 1);
        yield finishRecord();
        i += 1;
        fieldStart = i;
        state = 'field-start';
      } else if (char === CHAR_CR && text.charCodeAt(i + 1) === CHAR_LF) {
        finishField(i - 1);
        yield finishRecord();
        i += 2;
        fieldStart = i;
        state = 'field-start';
      } else {
        throw new CsvParseError(
          'CSV_TRAILING_CHARS',
          `Karakter tidak diizinkan setelah tanda kutip penutup (record ${recordIndex}, kolom ${columnIndex}). Perbaiki format kutip pada CSV.`,
          { recordIndex, columnIndex },
        );
      }
      continue;
    }

    if (state === 'field-start') {
      if (char === CHAR_QUOTE) {
        state = 'quoted';
        i += 1;
        fieldStart = i;
      } else if (char === CHAR_COMMA) {
        finishField(i);
        i += 1;
        fieldStart = i;
      } else if (char === CHAR_LF) {
        finishField(i);
        yield finishRecord();
        i += 1;
        fieldStart = i;
      } else if (char === CHAR_CR && text.charCodeAt(i + 1) === CHAR_LF) {
        finishField(i);
        yield finishRecord();
        i += 2;
        fieldStart = i;
      } else {
        state = 'unquoted';
        i += 1;
      }
      continue;
    }

    /* state === 'unquoted' */
    if (char === CHAR_QUOTE) {
      throw new CsvParseError(
        'CSV_ILLEGAL_QUOTE',
        `Tanda kutip ilegal di dalam field tanpa kutip (record ${recordIndex}, kolom ${columnIndex}). Bungkus field dengan kutip atau hapus kutipnya.`,
        { recordIndex, columnIndex },
      );
    }
    if (char === CHAR_COMMA) {
      finishField(i);
      i += 1;
      fieldStart = i;
      state = 'field-start';
    } else if (char === CHAR_LF) {
      /* CR tepat sebelum LF adalah bagian CRLF, bukan konten. */
      const end = i > fieldStart && text.charCodeAt(i - 1) === CHAR_CR ? i - 1 : i;
      finishField(end);
      yield finishRecord();
      i += 1;
      fieldStart = i;
      state = 'field-start';
    } else {
      i += 1;
    }
  }

  /* EOF: akhiri record terakhir sesuai state (baris terakhir tanpa
     newline, atau empty field terakhir setelah delimiter). */
  if (state === 'quoted') {
    throw new CsvParseError(
      'CSV_UNCLOSED_QUOTE',
      `Tanda kutip tidak ditutup sampai akhir file (record ${recordIndex}, kolom ${columnIndex}).`,
      { recordIndex, columnIndex },
    );
  }
  if (state === 'after-quote') {
    finishField(n - 1); /* buang closing quote */
    yield finishRecord();
    return;
  }
  if (state === 'unquoted') {
    finishField(n);
    yield finishRecord();
    return;
  }
  /* state === 'field-start': empty field setelah delimiter terakhir
     hanya relevan bila record sudah berisi field (konsisten parser Node:
     "a," → [['a','']], tetapi "" / BOM saja → tidak ada record). */
  if (record.length > 0) {
    finishField(n);
    yield finishRecord();
  }
}
