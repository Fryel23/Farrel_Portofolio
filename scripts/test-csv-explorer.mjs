/*!
 * scripts/test-csv-explorer.mjs - Unit test V12.3 (CSV Explorer & shared
 * primitives). Tanpa framework baru: node:assert + runner mini, pola yang
 * sama dengan scripts/test-lab-core.mjs (spec §12: gunakan test runner yang
 * tersedia; dependency baru dilarang).
 *
 * Dijalankan:  node scripts/test-csv-explorer.mjs
 *
 * Cakupan (spec §12.1–12.3, §4.3):
 *  - [1] csv-parser.js  : format valid RFC 4180, malformed CSV, konteks
 *                         error, kebijakan baris kosong, dan ekuivalensi
 *                         perilaku dengan parser Node pada fixture valid
 *                         yang sama (spec §5.4 - kompatibilitas dijaga
 *                         lewat test, bukan klaim).
 *  - [2] csv-analysis.js: klasifikasi kolom, statistik deskriptif, missing
 *                         value, normalisasi record, batas resource,
 *                         sampling chart (spec §6, §9.3).
 *  - [3] shared/stats.js: regresi ekstraksi V12.3 (zero, negatif, desimal,
 *                         skala kecil & besar) - fungsi dipindahkan dari
 *                         core/stats.js tanpa perubahan kontrak (§4.3).
 *  - [4] Worker contract: payload analisis & chart dibangun oleh fungsi
 *                         pure yang sama yang dipanggil Worker, sehingga
 *                         kontrak pesan teruji tanpa environment browser
 *                         (spec §12.3).
 */

import assert from 'node:assert/strict';
import { iterateCsvRecords, CsvParseError } from '../src/scripts/lab/shared/csv-parser.js';
import { parseCsv as parseCsvNode } from './data/csv-parser.mjs';

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

const recordsOf = (text) => [...iterateCsvRecords(text)];

/* ====================================================================== */
/* [1] CSV PARSER (browser)                                                */
/* ====================================================================== */
console.log('\n[1] csv-parser.js');

/* --- Valid input (spec §12.1) --- */

test('CSV sederhana: header + 2 record, tanpa trailing newline', () => {
  const rows = recordsOf('name,description,value\nA,x,1\nB,y,2');
  assert.deepEqual(rows, [['name', 'description', 'value'], ['A', 'x', '1'], ['B', 'y', '2']]);
});

test('Quoted field + koma di dalam quoted field', () => {
  const rows = recordsOf('name,description,value\nA,"Data dengan, koma",100');
  assert.deepEqual(rows[1], ['A', 'Data dengan, koma', '100']);
});

test('Escaped double quote ("") menjadi satu kutip literal', () => {
  const rows = recordsOf('name,description,value\nB,"Teks dengan ""kutip""",200');
  assert.deepEqual(rows[1], ['B', 'Teks dengan "kutip"', '200']);
});

test('Embedded newline di dalam quoted field bukan pemisah record', () => {
  const rows = recordsOf('name,description,value\nC,"Baris pertama\nbaris kedua",300');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], ['C', 'Baris pertama\nbaris kedua', '300']);
});

test('CRLF ditangani sebagai pemisah record tunggal (tanpa \\r tersisa)', () => {
  const rows = recordsOf('h1,h2\r\na,b\r\nc,d\r\n');
  assert.deepEqual(rows, [['h1', 'h2'], ['a', 'b'], ['c', 'd']]);
});

test('LF toleran: campuran CRLF dan LF', () => {
  const rows = recordsOf('h1,h2\r\na,b\nc,d');
  assert.deepEqual(rows, [['h1', 'h2'], ['a', 'b'], ['c', 'd']]);
});

test('UTF-8 BOM dilepas sekali di awal (field pertama bersih)', () => {
  const rows = recordsOf('\uFEFFh1,h2\na,b');
  assert.deepEqual(rows, [['h1', 'h2'], ['a', 'b']]);
});

test('Empty field, trailing empty field, dan empty field setelah delimiter di EOF', () => {
  assert.deepEqual(recordsOf('a,,c\n')[0], ['a', '', 'c']);
  assert.deepEqual(recordsOf('a,b,\n')[0], ['a', 'b', '']);
  assert.deepEqual(recordsOf('a,')[0], ['a', '']);
  assert.deepEqual(recordsOf(',\n')[0], ['', '']);
});

test('Record dengan quoted empty field ("") dipertahankan sebagai field kosong', () => {
  assert.deepEqual(recordsOf('a,"",c')[0], ['a', '', 'c']);
  assert.deepEqual(recordsOf('""')[0], ['']);
  assert.deepEqual(recordsOf('a,""\n')[0], ['a', '']);
  assert.deepEqual(recordsOf('""""')[0], ['"']);
});

test('Trailing newline tidak menghasilkan record kosong palsu', () => {
  assert.equal(recordsOf('a,b\n').length, 1);
  assert.equal(recordsOf('a,b\r\n\r\n').length, 2); /* satu baris kosong fisik nyata */
});

test('Baris kosong fisik di-yield sebagai record [""] (konsisten parser Node; kebijakan skip di lapisan analisis)', () => {
  const csv = ['h1,h2', '', 'a,b', '', '', 'c,"x', 'y"', 'd,e'].join('\n');
  const rows = recordsOf(csv);
  const blankRows = rows.filter((row) => row.length === 1 && row[0] === '');
  assert.equal(blankRows.length, 3);
  assert.equal(rows.length, 7);
  const multiline = rows.find((row) => row[0] === 'c');
  assert.deepEqual(multiline, ['c', 'x\ny']);
});

test('File kosong / BOM saja → nol record (bukan error di lapisan parser)', () => {
  assert.deepEqual(recordsOf(''), []);
  assert.deepEqual(recordsOf('\uFEFF'), []);
});

test('Generator bersifat lazy: iterasi parsial tidak mengeksekusi sisa file', () => {
  let maxSeen = 0;
  const iterator = iterateCsvRecords('a\nb\nc');
  for (const row of iterator) {
    maxSeen += 1;
    if (maxSeen === 1) break; /* berhenti setelah record pertama */
  }
  assert.equal(maxSeen, 1);
});

test('Konteks error membawa nomor record & kolom (1-based, header = record 1)', () => {
  /* Kutip tidak ditutup pada record ke-3. */
  let error = null;
  try {
    recordsOf('h1,h2\na,b\nc,"x');
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof CsvParseError);
  assert.equal(error.code, 'CSV_UNCLOSED_QUOTE');
  assert.equal(error.recordIndex, 3);
  assert.equal(error.columnIndex, 2);

  /* Kutip ilegal di unquoted field: `ab"c` — kutip berada DI DALAM field
     pertama yang belum selesai → kolom 1 (columnIndex = kolom yang sedang
     diparse, bukan kolom berikutnya). */
  let illegal = null;
  try {
    recordsOf('h1,h2\nab"c,d');
  } catch (caught) {
    illegal = caught;
  }
  assert.ok(illegal instanceof CsvParseError);
  assert.equal(illegal.code, 'CSV_ILLEGAL_QUOTE');
  assert.equal(illegal.recordIndex, 2);
  assert.equal(illegal.columnIndex, 1);

  /* Kutip ilegal pada field kedua → kolom 2. */
  let illegalSecond = null;
  try {
    recordsOf('h1,h2\nx,y"z');
  } catch (caught) {
    illegalSecond = caught;
  }
  assert.equal(illegalSecond.code, 'CSV_ILLEGAL_QUOTE');
  assert.equal(illegalSecond.columnIndex, 2);
});

test('Input non-string → TypeError (kontrak eksplisit)', () => {
  assert.throws(() => recordsOf(null), TypeError);
  assert.throws(() => recordsOf(123), TypeError);
});

/* --- Ekuivalensi dengan parser Node pada fixture valid (spec §5.4) --- */

const VALID_FIXTURES = [
  'name,description,value\nA,x,1',
  'name,description,value\nA,"Data dengan, koma",100\nB,"Teks dengan ""kutip""",200',
  'name,description,value\nC,"Baris pertama\nbaris kedua",300',
  'h1,h2\r\na,b\r\nc,d\r\n',
  'h1,h2\n\na,b\n\n\nc,d\n',
  'a,,c\n,b,\n,,\n',
  '"a""x",y\n',
  'a,b\n',
];

test('Ekuivalensi parser Node vs browser pada seluruh fixture valid yang sama', () => {
  for (const fixture of VALID_FIXTURES) {
    const browserRows = recordsOf(fixture);
    const nodeRows = parseCsvNode(fixture);
    assert.deepEqual(browserRows, nodeRows, `fixture: ${JSON.stringify(fixture)}`);
  }
});

test('Perilaku BOM terdokumentasi berbeda: browser melepas BOM, Node membiarkannya', () => {
  const text = '\uFEFFh1,h2\na,b';
  const browserRows = recordsOf(text);
  const nodeRows = parseCsvNode(text);
  assert.equal(browserRows[0][0], 'h1');
  assert.equal(nodeRows[0][0], '\uFEFFh1'); /* divergence yang didokumentasikan */
});

/* --- Invalid input (spec §5.2, §12.1) --- */

test('Kutip tidak ditutup → CSV_UNCLOSED_QUOTE', () => {
  assert.throws(() => recordsOf('h1,h2\na,"b'), (error) => error instanceof CsvParseError && error.code === 'CSV_UNCLOSED_QUOTE');
  assert.throws(() => recordsOf('"abc'), (error) => error.code === 'CSV_UNCLOSED_QUOTE');
});

test('Kutip ilegal di unquoted field → CSV_ILLEGAL_QUOTE', () => {
  assert.throws(() => recordsOf('ab"c'), (error) => error.code === 'CSV_ILLEGAL_QUOTE');
  assert.throws(() => recordsOf('a,b"c\n'), (error) => error.code === 'CSV_ILLEGAL_QUOTE');
});

test('Karakter setelah closing quote (termasuk spasi) → CSV_TRAILING_CHARS (strict)', () => {
  assert.throws(() => recordsOf('"a"x,b'), (error) => error.code === 'CSV_TRAILING_CHARS');
  assert.throws(() => recordsOf('"a" ,b'), (error) => error.code === 'CSV_TRAILING_CHARS');
});

test('Escape kutip di tengah field: "a""x" → a"x (valid RFC 4180)', () => {
  assert.deepEqual(recordsOf('"a""x"'), [['a"x']]);
});

test('Pesan error TIDAK memuat isi field CSV (anti-kebocoran data)', () => {
  const secret = 'RAHASIA_EMAIL@contoh.id';
  let message = '';
  try {
    recordsOf(`h1,h2\n"${secret}`);
  } catch (error) {
    message = error.message;
  }
  assert.ok(!message.includes(secret), 'pesan tidak boleh memuat isi field');
});

/* --- Placeholder section berikutnya (diisi FASE 3) --- */

/* ====================================================================== */
/* [2] CSV ANALYSIS ENGINE                                                  */
/* ====================================================================== */
console.log('\n[2] csv-analysis.js');

import { buildAnalysisPayload, buildChartPayload, sampleChartIndices, toSafeErrorPayload, LIMITS, CsvAnalysisError, parseNumericValue, isIsoDateString } from '../src/scripts/lab/shared/csv-analysis.js';

test('Kolom numerik: klasifikasi + statistik lengkap atas dataset penuh', () => {
  const csv = 'nilai\n10\n20\n30\n40\n';
  const payload = buildAnalysisPayload(csv, { name: 'uji.csv', sizeBytes: csv.length });
  const column = payload.columns[0];
  assert.equal(column.type, 'numeric');
  assert.equal(column.validCount, 4);
  assert.equal(column.missingCount, 0);
  const stats = payload.stats['column-0'];
  assert.equal(stats.mean, 25);
  assert.equal(stats.median, 25);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 40);
  assert.equal(stats.validCount, 4);
  assert.equal(stats.missingCount, 0);
});

test('Statistik dihitung dari SEMUA record, bukan 5 baris pratinjau', () => {
  const values = Array.from({ length: 10 }, (_, i) => i + 1); /* 1..10 */
  const csv = `n\n${values.join('\n')}\n`;
  const payload = buildAnalysisPayload(csv);
  assert.equal(payload.rowCount, 10);
  assert.equal(payload.preview.rows.length, 5); /* pratinjau tetap 5 */
  assert.equal(payload.stats['column-0'].mean, 5.5);
  assert.equal(payload.stats['column-0'].median, 5.5);
  assert.equal(payload.stats['column-0'].min, 1);
  assert.equal(payload.stats['column-0'].max, 10);
});

test('Kolom kategori & tanggal terklasifikasi sesuai (ISO konservatif)', () => {
  const csv = 'nama,tanggal,datetime\nA,2024-01-15,2024-01-15T08:30:00\nB,2024-02-29,2024-03-01T00:00Z\n';
  const payload = buildAnalysisPayload(csv);
  assert.equal(payload.columns[0].type, 'categorical');
  assert.equal(payload.columns[1].type, 'date');
  assert.equal(payload.columns[2].type, 'date');
});

test('Kolom campuran numeric+date+teks → categorical; kolom kosong semua → categorical 0 valid', () => {
  const csv = 'campuran,kosong\n1,\nabc,\n2024-01-01,\n';
  const payload = buildAnalysisPayload(csv);
  assert.equal(payload.columns[0].type, 'categorical');
  assert.equal(payload.columns[1].type, 'categorical');
  assert.equal(payload.columns[1].validCount, 0);
  assert.equal(payload.columns[1].missingCount, 3);
});

test('Nilai negatif, desimal, dan notasi ilmiah didukung pada kolom numerik', () => {
  const csv = 'v\n-2.5\n1.5\n1e2\n';
  const payload = buildAnalysisPayload(csv);
  assert.equal(payload.columns[0].type, 'numeric');
  const stats = payload.stats['column-0'];
  assert.equal(stats.mean, 33); /* (-2.5 + 1.5 + 100) / 3 */
  assert.equal(stats.min, -2.5);
  assert.equal(stats.max, 100);
});

test('Missing value: string kosong & whitespace dihitung missing, bukan nol', () => {
  const csv = 'v\n10\n\n   \n30\n';
  const payload = buildAnalysisPayload(csv);
  const stats = payload.stats['column-0'];
  assert.equal(stats.validCount, 2);
  assert.equal(stats.missingCount, 2);
  assert.equal(stats.mean, 20); /* null diabaikan, bukan dihitung 0 */
});

test('Token "NA"/"null" adalah string biasa (bukan missing) → kolom jadi categorical', () => {
  const payload = buildAnalysisPayload('v\n10\nNA\nnull\n');
  assert.equal(payload.columns[0].type, 'categorical');
  assert.equal(payload.columns[0].validCount, 3);
});

test('"1,000" bukan angka (locale di luar cakupan); "1e999" ditolak (tidak finite); "5." ditolak; ".5" & "+5" diterima', () => {
  assert.equal(parseNumericValue('1,000').status, 'non-numeric');
  assert.equal(parseNumericValue('1e999').status, 'non-numeric');
  assert.equal(parseNumericValue('5.').status, 'non-numeric');
  assert.equal(parseNumericValue('.5').status, 'numeric');
  assert.equal(parseNumericValue('+5').status, 'numeric');
  assert.equal(parseNumericValue('   ').status, 'missing');
});

test('Validasi kalender ISO: 2021-02-29 ditolak, 2024-02-29 diterima, 2021-13-01 ditolak', () => {
  assert.equal(isIsoDateString('2021-02-29'), false);
  assert.equal(isIsoDateString('2024-02-29'), true);
  assert.equal(isIsoDateString('2021-13-01'), false);
  assert.equal(isIsoDateString('2021-04-31'), false);
});

test('Header duplikat: displayName dapat dibedakan, nama asli dipertahankan', () => {
  const payload = buildAnalysisPayload('harga,harga,Harga \n1,2,3\n');
  assert.equal(payload.columns[0].displayName, 'harga');
  assert.equal(payload.columns[1].displayName, 'harga · 2');
  assert.equal(payload.columns[2].displayName, 'Harga'); /* trim level analisis; unik setelah trim */
  assert.deepEqual(payload.columns.map((column) => column.id), ['column-0', 'column-1', 'column-2']);
});

test('Header kosong/whitespace: displayName "Kolom N" berbasis posisi; nama asli null', () => {
  const payload = buildAnalysisPayload(', x ,\n1,2,3\n');
  assert.equal(payload.columns[0].displayName, 'Kolom 1');
  assert.equal(payload.columns[0].name, null);
  assert.equal(payload.columns[1].displayName, 'x');
  assert.equal(payload.columns[1].name, ' x ');
  assert.equal(payload.columns[2].displayName, 'Kolom 3');
});

test('Record lebih pendek → dinormalisasi + warning tercatat (tidak dibuang diam-diam)', () => {
  const payload = buildAnalysisPayload('a,b,c\n1,2,3\n4,5\n6\n');
  assert.equal(payload.rowCount, 3);
  assert.equal(payload.warnings.normalizedRecordCount, 2);
  assert.equal(payload.warnings.hasWarnings, true);
  assert.equal(payload.preview.rows[1][2], '');
  assert.equal(payload.stats['column-0'].validCount, 3);
  assert.equal(payload.stats['column-2'].validCount, 1);
  assert.equal(payload.stats['column-2'].missingCount, 2);
});

test('Record lebih panjang → DITOLAK dengan error jelas (CSV_RECORD_TOO_LONG)', () => {
  assert.throws(
    () => buildAnalysisPayload('a,b,c\n1,2,3\n4,5,6,7\n'),
    (error) => error instanceof CsvAnalysisError && error.code === 'CSV_RECORD_TOO_LONG',
  );
});

test('Baris kosong fisik dilewati & dicacah pada file multi-kolom; sebagai data pada file satu kolom', () => {
  const multi = buildAnalysisPayload('a,b\n1,2\n\n3,4\n');
  assert.equal(multi.rowCount, 2);
  assert.equal(multi.warnings.blankLinesSkipped, 1);

  const single = buildAnalysisPayload('a\n1\n\n3\n');
  assert.equal(single.rowCount, 3);
  assert.equal(single.stats['column-0'].missingCount, 1);
  assert.equal(single.warnings.blankLinesSkipped, 0);
});

test('Batas kolom (>100) → CSV_LIMIT_COLUMNS', () => {
  const header = Array.from({ length: 101 }, (_, i) => `c${i}`).join(',');
  assert.throws(
    () => buildAnalysisPayload(`${header}\n1`),
    (error) => error.code === 'CSV_LIMIT_COLUMNS',
  );
});

test('Batas record (>100.000) → CSV_LIMIT_RECORDS', () => {
  const csv = `n\n${'1\n'.repeat(LIMITS.MAX_RECORDS + 1)}`;
  assert.throws(
    () => buildAnalysisPayload(csv),
    (error) => error.code === 'CSV_LIMIT_RECORDS',
  );
});

test('Batas cell (>500.000) → CSV_LIMIT_CELLS', () => {
  const columns = LIMITS.MAX_COLUMNS;
  const header = Array.from({ length: columns }, (_, i) => `c${i}`).join(',');
  const rows = Array.from({ length: 5001 }, () => Array.from({ length: columns }, () => '1').join(','));
  const csv = `${header}\n${rows.join('\n')}`;
  assert.throws(
    () => buildAnalysisPayload(csv),
    (error) => error.code === 'CSV_LIMIT_CELLS',
  );
});

test('File kosong & header-tanpa-data → CSV_EMPTY / CSV_NO_DATA', () => {
  assert.throws(() => buildAnalysisPayload(''), (error) => error.code === 'CSV_EMPTY');
  assert.throws(() => buildAnalysisPayload('a,b,c\n'), (error) => error.code === 'CSV_NO_DATA');
});

test('Payload analisis berisi pratinjau ≤5 dan TIDAK memuat dataset mentah', () => {
  const csv = `n\n${Array.from({ length: 50 }, (_, i) => i).join('\n')}\n`;
  const payload = buildAnalysisPayload(csv);
  assert.equal(payload.preview.rows.length, 5);
  assert.equal(payload.preview.requestedRows, 5);
  /* Tidak ada properti yang membawa seluruh record. */
  assert.ok(!('records' in payload));
  assert.ok(!('rows' in payload));
  const serializedKeys = Object.keys(payload);
  assert.deepEqual(serializedKeys.sort(), ['columnCount', 'columns', 'file', 'preview', 'rowCount', 'stats', 'warnings']);
});

test('Pratinjau mempertahankan nilai mentah tanpa trim (parser tidak memodifikasi)', () => {
  const payload = buildAnalysisPayload('a,b\n x ,y\n');
  assert.deepEqual(payload.preview.rows[0], [' x ', 'y']);
});

/* --- Sampling chart (spec §9.3) --- */

test('Sampling: ≤5000 titik tidak tersampling, urutan utuh', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const { indices, sampled } = sampleChartIndices(values);
  assert.equal(sampled, false);
  assert.equal(indices.length, 100);
  assert.equal(indices[0], 0);
  assert.equal(indices[99], 99);
});

test('Sampling >5000: deterministik, titik awal & akhir dipertahankan, ≤5000 titik', () => {
  const values = Array.from({ length: 12345 }, (_, i) => i);
  const first = sampleChartIndices(values);
  const second = sampleChartIndices(values);
  assert.equal(first.sampled, true);
  assert.deepEqual(first.indices, second.indices); /* deterministik */
  assert.ok(first.indices.length <= LIMITS.MAX_CHART_POINTS);
  assert.equal(first.indices[0], 0);
  assert.equal(first.indices[first.indices.length - 1], 12344);
  for (let k = 1; k < first.indices.length; k += 1) {
    assert.ok(first.indices[k] > first.indices[k - 1], 'urutan asli dipertahankan');
  }
});

test('Sampling mempertahankan representasi gap (null disisipkan, kuota keras dihormati)', () => {
  /* 12.000 titik, null pada rentang 5000–5999; stride = ceil(12000/5000)=3
     — gap pass wajib menyisipkan setidaknya satu null dari rentang itu. */
  const values = Array.from({ length: 12000 }, (_, i) => (i >= 5000 && i < 6000 ? null : i));
  const { indices, sampled } = sampleChartIndices(values);
  assert.equal(sampled, true);
  assert.ok(indices.length <= LIMITS.MAX_CHART_POINTS);
  const hasNullInGap = indices.some((index) => index >= 5000 && index < 6000);
  assert.ok(hasNullInGap, 'gap missing-value harus terwakili');
});

/* --- Payload chart (spec §9) --- */

test('buildChartPayload: X kategori, Y numerik, label & nilai terpetakan, missing Y → null', () => {
  const csv = 'tanggal,temperatur,kota\n2024-01-01,10.5,A\n2024-01-02,,B\n2024-01-03,-3,C\n';
  const payload = buildChartPayload(csv, { xColumnId: 'column-0', yColumnId: 'column-1' });
  assert.equal(payload.xType, 'date');
  assert.deepEqual(payload.labels, ['2024-01-01', '2024-01-02', '2024-01-03']);
  assert.deepEqual(payload.values, [10.5, null, -3]);
  assert.equal(payload.totalRecords, 3);
  assert.equal(payload.pointsSent, 3);
  assert.equal(payload.sampled, false);
});

test('buildChartPayload: X numerik ditolak (CSV_X_NOT_SUPPORTED); Y kategorikal ditolak (CSV_Y_NOT_NUMERIC)', () => {
  /* X numerik + Y numerik valid → cek tipe X setelah pass penuh. */
  const numericPair = 'id,skor\n1,10\n2,20\n';
  assert.throws(
    () => buildChartPayload(numericPair, { xColumnId: 'column-0', yColumnId: 'column-1' }),
    (error) => error.code === 'CSV_X_NOT_SUPPORTED',
  );
  /* Y kategorikal gagal cepat saat iterasi (fail-fast). */
  const mixedPair = 'id,kota\n1,A\n2,B\n';
  assert.throws(
    () => buildChartPayload(mixedPair, { xColumnId: 'column-0', yColumnId: 'column-1' }),
    (error) => error.code === 'CSV_Y_NOT_NUMERIC',
  );
});

test('buildChartPayload: columnId tidak dikenal / di luar jangkauan → CSV_COLUMN_UNKNOWN', () => {
  const csv = 'a,b\n1,2\n';
  assert.throws(() => buildChartPayload(csv, { xColumnId: 'column-9', yColumnId: 'column-0' }), (error) => error.code === 'CSV_COLUMN_UNKNOWN');
  assert.throws(() => buildChartPayload(csv, { xColumnId: 'nakal', yColumnId: 'column-0' }), (error) => error.code === 'CSV_COLUMN_UNKNOWN');
});

test('buildChartPayload: dataset besar tetap mengirim ≤5000 titik + metadata sampling jujur', () => {
  const rows = Array.from({ length: 9000 }, (_, i) => `t${i},${i}`);
  const csv = `waktu,nilai\n${rows.join('\n')}`;
  const payload = buildChartPayload(csv, { xColumnId: 'column-0', yColumnId: 'column-1' });
  assert.equal(payload.totalRecords, 9000);
  assert.ok(payload.pointsSent <= LIMITS.MAX_CHART_POINTS);
  assert.equal(payload.sampled, true);
  assert.equal(payload.sampleStride, Math.ceil(9000 / LIMITS.MAX_CHART_POINTS));
  assert.equal(payload.labels.length, payload.pointsSent);
  assert.equal(payload.values.length, payload.pointsSent);
});

/* ====================================================================== */
/* [3] REGRESI EKSTRAKSI shared/stats.js (spec §4.3)                        */
/* ====================================================================== */
console.log('\n[3] shared/stats.js (regresi ekstraksi)');

import { mean, median, min, max, standardDeviation, countValid, countMissing, validPercentage } from '../src/scripts/lab/shared/stats.js';

test('Zero adalah nilai sah: mean([0,0,0]) = 0 (bukan null)', () => {
  assert.equal(mean([0, 0, 0]), 0);
  assert.equal(median([0, 0]), 0);
  assert.equal(min([0, null]), 0);
  assert.equal(max([0, null]), 0);
});

test('Negatif: mean([-10, 10]) = 0; min([-5, 3]) = -5', () => {
  assert.equal(mean([-10, 10]), 0);
  assert.equal(min([-5, 3]), -5);
  assert.equal(max([-5, 3]), 3);
});

test('Desimal: mean([1.5, 2.5]) = 2; median([1.1, 2.2, 3.3]) = 2.2', () => {
  assert.equal(mean([1.5, 2.5]), 2);
  assert.ok(Math.abs(median([1.1, 2.2, 3.3]) - 2.2) < 1e-9);
});

test('Data kecil (satu elemen) & besar (1..1000): mean 500.5, median 500.5', () => {
  assert.equal(mean([7]), 7);
  assert.equal(median([7]), 7);
  const large = Array.from({ length: 1000 }, (_, i) => i + 1);
  assert.equal(mean(large), 500.5);
  assert.equal(median(large), 500.5);
});

test('Kontrak invalid-input tetap: non-array → []/0/null', () => {
  assert.deepEqual(mean(null), null);
  assert.equal(countValid('bukan-array'), 0);
  assert.equal(countMissing(undefined), 0);
  assert.deepEqual(validPercentage('x'), null);
  assert.equal(standardDeviation([1], { type: 'sample' }), null);
});

test('Median tidak memutasi input (salinan sebelum sort)', () => {
  const input = [3, 1, 2];
  median(input);
  assert.deepEqual(input, [3, 1, 2]);
});

/* ====================================================================== */
/* [4] KONTRAK WORKER (payload pure yang dipanggil csv-worker.js, §12.3)    */
/* ====================================================================== */
console.log('\n[4] Kontrak Worker');

test('Pesan error parser yang lewat buildAnalysisPayload dipetakan aman (tanpa isi CSV)', () => {
  let payload = null;
  try {
    buildAnalysisPayload('a,b\n1,"x');
  } catch (error) {
    payload = toSafeErrorPayload(error, 'ANALYSIS_FAILED', 'Gagal menganalisis file.');
  }
  assert.equal(payload.code, 'CSV_UNCLOSED_QUOTE');
  assert.ok(payload.message.includes('kutip'));
  assert.ok(!payload.message.includes('x'));
});

test('Error tak dikenal → fallback generik tanpa detail internal', () => {
  const payload = toSafeErrorPayload(new TypeError('internal secret detail'), 'ANALYSIS_FAILED', 'Gagal menganalisis file.');
  assert.equal(payload.code, 'ANALYSIS_FAILED');
  assert.equal(payload.message, 'Gagal menganalisis file.');
});

test('Error ad-hoc Worker berkode CSV_ (mis. CSV_ENCODING) dilewarkan: pesan aman by-contract', () => {
  const encodingError = new Error('File bukan UTF-8 yang valid. Simpan ulang file sebagai UTF-8, lalu coba lagi.');
  encodingError.code = 'CSV_ENCODING';
  const payload = toSafeErrorPayload(encodingError, 'ANALYSIS_FAILED', 'Gagal memproses file CSV.');
  assert.equal(payload.code, 'CSV_ENCODING');
  assert.ok(payload.message.includes('UTF-8'));
});

test('Payload analisis siap structured-clone (tanpa fungsi/simbol) - prasyarat postMessage', () => {
  const csv = 'a,b\n1,x\n2,y\n';
  const payload = buildAnalysisPayload(csv, { name: 'f.csv', sizeBytes: 12 });
  const cloned = JSON.parse(JSON.stringify(payload)); /* proksi klona terstruktur */
  assert.equal(cloned.file.name, 'f.csv');
  assert.equal(cloned.columnCount, 2);
  assert.equal(cloned.rowCount, 2);
});

test('LIMITS terpusat & beku (satu sumber kebenaran, spec §6.5)', () => {
  assert.equal(LIMITS.MAX_FILE_BYTES, 10 * 1024 * 1024);
  assert.equal(LIMITS.MAX_COLUMNS, 100);
  assert.equal(LIMITS.MAX_RECORDS, 100000);
  assert.equal(LIMITS.MAX_CELLS, 500000);
  assert.equal(LIMITS.MAX_CHART_POINTS, 5000);
  assert.equal(LIMITS.MAX_PREVIEW_ROWS, 5);
  assert.equal(Object.isFrozen(LIMITS), true);
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
