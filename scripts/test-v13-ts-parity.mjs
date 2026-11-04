/*!
 * scripts/test-v13-ts-parity.mjs - Parity & Domain Contract Test Suite (V13.0-B).
 *
 * Memverifikasi:
 *  1. Modul kontrak tipe (src/types/lab-aqi.ts, lab-csv.ts, core-lifecycle.ts)
 *     valid pada Node v24 native type-stripping dan murni type-only (0 runtime export).
 *  2. Paritas numerik, struktural, dan digest SHA-256 100% terhadap golden baseline
 *     pra-migrasi (v13-work/baseline/phase-b-golden-parity.json) untuk:
 *       - aqi-calculator.js (seluruh breakpoint SO2, NO2, PM2.5, basis mismatch, error status)
 *       - stats.js (mean, median, min, max, standardDeviation, countValid, countMissing, validPercentage)
 *       - validate-dataset.js (seluruh dataset Cirebon 2021-2025 + kode issue)
 *       - csv-parser.js (RFC 4180 + CsvParseError codes & posisi)
 *       - csv-analysis.js (buildAnalysisPayload, buildChartPayload, sampleChartIndices, LIMITS)
 *  3. Isolasi kontrak pesan Worker (processWorkerRequest di csv-worker.js) tanpa browser:
 *     ANALYZE_FILE, GET_CHART_DATA, CSV_NO_ACTIVE_FILE, CSV_MALFORMED_REQUEST,
 *     CSV_UNKNOWN_REQUEST, CSV_LIMIT_FILE_SIZE, CSV_EMPTY_FILE, CSV_ENCODING,
 *     serta jaminan structuredClone dan tidak bocornya isi CSV mentah.
 *  4. Zero U+2014 pada file baru Fase B.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import * as LabAqiTypes from '../src/types/lab-aqi.ts';
import * as LabCsvTypes from '../src/types/lab-csv.ts';
import * as CoreLifecycleTypes from '../src/types/core-lifecycle.ts';

import {
  calculateSubIndex,
  getISPUCategory,
  getISPUFromSubIndices,
  getDominantParameterSummary,
  P14_2020,
  SUPPORTED_PARAMETERS,
} from '../src/scripts/lab/core/aqi-calculator.js';
import {
  mean,
  median,
  min,
  max,
  standardDeviation,
  countValid,
  countMissing,
  validPercentage,
} from '../src/scripts/lab/shared/stats.js';
import { validateDataset } from '../src/scripts/lab/core/validate-dataset.js';
import { iterateCsvRecords, CsvParseError } from '../src/scripts/lab/shared/csv-parser.js';
import {
  LIMITS,
  buildAnalysisPayload,
  buildChartPayload,
  sampleChartIndices,
  toSafeErrorPayload,
} from '../src/scripts/lab/shared/csv-analysis.js';
import { processWorkerRequest } from '../src/scripts/lab/workers/csv-worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    process.stdout.write(`  FAIL  ${name}\n        ${error.message}\n`);
  }
}

function makeFakeFile(contentBytesOrString, name = 'fixture.csv') {
  const buf =
    typeof contentBytesOrString === 'string'
      ? Buffer.from(contentBytesOrString, 'utf8')
      : Buffer.from(contentBytesOrString);
  return {
    name,
    size: buf.byteLength,
    async arrayBuffer() {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
  };
}

async function run() {
  /* ====================================================================== */
  /* 1. TYPE-ONLY CONTRACT MODULES & RUNTIME VERIFICATION                   */
  /* ====================================================================== */
  console.log('\n[1] Type-Only Contract Modules & Runtime Stripping');

  await test('1a. File kontrak src/types/lab-aqi.ts, lab-csv.ts, dan core-lifecycle.ts ada dan murni type-only (0 runtime export)', () => {
    assert.deepEqual(Object.keys(LabAqiTypes), []);
    assert.deepEqual(Object.keys(LabCsvTypes), []);
    assert.deepEqual(Object.keys(CoreLifecycleTypes), []);
  });

  await test('1b. Kontrak tipe memiliki definisi domain yang diwajibkan spesifikasi B.2', () => {
    const aqiTs = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/lab-aqi.ts'), 'utf8');
    assert.ok(aqiTs.includes("export type SupportedPollutant = 'so2' | 'no2' | 'pm25';"));
    assert.ok(aqiTs.includes("export type TableReferencePeriod = '24h';"));
    assert.ok(aqiTs.includes('export type IspuStatus ='));

    const csvTs = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/lab-csv.ts'), 'utf8');
    assert.ok(
      csvTs.includes("export type CsvParserState = 'field-start' | 'quoted' | 'after-quote' | 'unquoted';")
    );
    assert.ok(csvTs.includes("export type CsvColumnType = 'numeric' | 'date' | 'categorical';"));
    assert.ok(csvTs.includes('export type CsvWorkerRequest ='));
    assert.ok(csvTs.includes('export type CsvWorkerResponse ='));

    const lifeTs = fs.readFileSync(path.join(PROJECT_ROOT, 'src/types/core-lifecycle.ts'), 'utf8');
    assert.ok(lifeTs.includes('export type DisposerFn ='));
    assert.ok(lifeTs.includes('export interface PageBootConfig'));
    assert.ok(lifeTs.includes('export interface MotionRegistryState'));
  });

  /* ====================================================================== */
  /* 2. GOLDEN OUTPUT & SHA-256 DIGEST PARITY                               */
  /* ====================================================================== */
  console.log('\n[2] Golden Output & SHA-256 Digest Parity');

  await test('2a. Seluruh hasil kalkulasi ISPU, statistik, validator dataset, parser CSV, dan analisis CSV identik 100% dengan golden baseline pra-migrasi', () => {
    const baselinePath = path.join(PROJECT_ROOT, 'v13-work/baseline/phase-b-golden-parity.json');
    assert.ok(fs.existsSync(baselinePath), 'Golden baseline harus tersedia');
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

    const aqiInputs = baseline.golden.aqiResults.map((r) => r.input);
    const aqiResults = aqiInputs.map((inp) => ({ input: inp, output: calculateSubIndex(inp) }));

    const statsInputs = [
      [],
      [null, undefined, NaN, Infinity, -Infinity],
      [0, 0, 0],
      [10, null, 20],
      [-10, 0, 10, 20],
      [1.1, 2.2, 3.3, 4.4],
      [7],
    ];
    const statsResults = statsInputs.map((arr) => ({
      mean: mean(arr),
      median: median(arr),
      min: min(arr),
      max: max(arr),
      sdPop: standardDeviation(arr, { type: 'population' }),
      sdSample: standardDeviation(arr, { type: 'sample' }),
      countValid: countValid(arr),
      countMissing: countMissing(arr),
      validPct: validPercentage(arr),
    }));

    const datasets = [2021, 2022, 2023, 2024, 2025].map((y) => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, `public/data/aqi/cirebon-${y}.json`), 'utf8')
      );
      return {
        year: y,
        validation: validateDataset(raw, { knownSourceIds: ['dlh-cirebon-2021-2025'] }),
        dominant: getDominantParameterSummary(raw.records),
      };
    });

    const csvValidFixtures = [
      'name,description,value\nA,x,1\nB,y,2',
      'name,description,value\nA,"Data dengan, koma",100',
      'name,description,value\nB,"Teks dengan ""kutip""",200',
      'name,description,value\nC,"Baris pertama\nbaris kedua",300',
      'h1,h2\r\na,b\r\nc,d\r\n',
      '\uFEFFh1,h2\na,b',
    ];
    const csvParsed = csvValidFixtures.map((txt) => [...iterateCsvRecords(txt)]);

    const csvMalformedFixtures = [
      'a,b\n1,"unclosed',
      'a,b\n1,illegal"quote',
      'a,b\n1,"quoted"trailing',
    ];
    const csvErrors = csvMalformedFixtures.map((txt) => {
      try {
        return [...iterateCsvRecords(txt)];
      } catch (err) {
        return {
          code: err.code,
          recordIndex: err.recordIndex,
          columnIndex: err.columnIndex,
          safe: toSafeErrorPayload(err, 'FALLBACK', 'msg'),
        };
      }
    });

    const sampleCsv =
      'tanggal,kota,nilai\n2024-01-01,Cirebon,12.5\n2024-01-02,Bandung,\n2024-01-03,Jakarta,-4.2\n2024-01-04,Surabaya,18.0\n';
    const analysisOut = buildAnalysisPayload(sampleCsv, {
      name: 'sample.csv',
      sizeBytes: sampleCsv.length,
    });
    const chartOut = buildChartPayload(sampleCsv, { xColumnId: 'column-0', yColumnId: 'column-2' });

    const currentGolden = {
      supportedParameters: SUPPORTED_PARAMETERS,
      limits: LIMITS,
      aqiResults,
      statsResults,
      datasets,
      csvParsed,
      csvErrors,
      analysisOut,
      chartOut,
    };

    const currentJson = JSON.stringify(currentGolden, null, 2);
    const currentDigest = crypto.createHash('sha256').update(currentJson).digest('hex');

    assert.deepEqual(currentGolden, baseline.golden, 'Struktur output harus identik dengan golden baseline');
    assert.equal(currentDigest, baseline.digest, 'SHA-256 digest harus identik dengan golden baseline');
  });

  await test('2b. Contoh aritmetika P.14/2020 SO2 83.9 ug/m3 menghasilkan 63.21171875 dan dibulatkan 63 tanpa drift presisi IEEE-754', () => {
    const res = calculateSubIndex({
      parameter: 'so2',
      concentration: 83.9,
      unit: 'µg/m³',
      averagingPeriod: '24h',
    });
    assert.equal(res.status, 'valid');
    assert.equal(res.value, 63.21171875);
    assert.equal(res.valueRounded, 63);
    assert.equal(res.basisMatched, true);
    assert.equal(res.category?.token, 'sedang');
  });

  /* ====================================================================== */
  /* 3. ISOLATED WORKER REQUEST/RESPONSE CONTRACT                           */
  /* ====================================================================== */
  console.log('\n[3] Isolated Worker Request/Response Contract (csv-worker.js)');

  await test('3a. processWorkerRequest: ANALYZE_FILE dan GET_CHART_DATA berkorelasi requestId dan structured-cloneable', async () => {
    const workerState = { activeFile: null };
    const csvText = 'tanggal,stasiun,so2\n2024-01-01,Stasiun A,14.2\n2024-01-02,Stasiun B,\n2024-01-03,Stasiun C,28.4\n';
    const file = makeFakeFile(csvText, 'cirebon-sample.csv');

    const analyzeRes = await processWorkerRequest(
      { type: 'ANALYZE_FILE', requestId: 'req-101', file },
      workerState
    );
    assert.equal(analyzeRes.type, 'ANALYSIS_SUCCESS');
    assert.equal(analyzeRes.requestId, 'req-101');
    const clonedAnalyze = structuredClone(analyzeRes);
    assert.equal(clonedAnalyze.payload.rowCount, 3);
    assert.equal(clonedAnalyze.payload.columnCount, 3);
    assert.equal(clonedAnalyze.payload.stats['column-2'].mean, (14.2 + 28.4) / 2);

    const chartRes = await processWorkerRequest(
      { type: 'GET_CHART_DATA', requestId: 'req-102', xColumnId: 'column-0', yColumnId: 'column-2' },
      workerState
    );
    assert.equal(chartRes.type, 'CHART_SUCCESS');
    assert.equal(chartRes.requestId, 'req-102');
    const clonedChart = structuredClone(chartRes);
    assert.deepEqual(clonedChart.payload.labels, ['2024-01-01', '2024-01-02', '2024-01-03']);
    assert.deepEqual(clonedChart.payload.values, [14.2, null, 28.4]);
  });

  await test('3b. processWorkerRequest: menolak GET_CHART_DATA tanpa file aktif, malformed request, unknown request, ukuran > 10 MiB, file 0 byte, dan encoding non-UTF8 tanpa membocorkan isi', async () => {
    const emptyState = { activeFile: null };

    const noActive = await processWorkerRequest(
      { type: 'GET_CHART_DATA', requestId: 'req-err-1', xColumnId: 'column-0', yColumnId: 'column-1' },
      emptyState
    );
    assert.equal(noActive.type, 'WORKER_ERROR');
    assert.equal(noActive.requestId, 'req-err-1');
    assert.equal(noActive.code, 'CSV_NO_ACTIVE_FILE');

    const malformed = await processWorkerRequest(null, emptyState);
    assert.equal(malformed.type, 'WORKER_ERROR');
    assert.equal(malformed.requestId, null);
    assert.equal(malformed.code, 'CSV_MALFORMED_REQUEST');

    const unknownReq = await processWorkerRequest(
      { type: 'EXEC_SHELL', requestId: 'req-err-2' },
      emptyState
    );
    assert.equal(unknownReq.type, 'WORKER_ERROR');
    assert.equal(unknownReq.requestId, 'req-err-2');
    assert.equal(unknownReq.code, 'CSV_UNKNOWN_REQUEST');

    const zeroFile = makeFakeFile('', 'empty.csv');
    const zeroRes = await processWorkerRequest(
      { type: 'ANALYZE_FILE', requestId: 'req-err-3', file: zeroFile },
      emptyState
    );
    assert.equal(zeroRes.type, 'WORKER_ERROR');
    assert.equal(zeroRes.code, 'CSV_EMPTY_FILE');

    const hugeFile = {
      name: 'huge.csv',
      size: LIMITS.MAX_FILE_BYTES + 1,
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    };
    const hugeRes = await processWorkerRequest(
      { type: 'ANALYZE_FILE', requestId: 'req-err-4', file: hugeFile },
      emptyState
    );
    assert.equal(hugeRes.type, 'WORKER_ERROR');
    assert.equal(hugeRes.code, 'CSV_LIMIT_FILE_SIZE');

    const invalidUtf8 = makeFakeFile(Uint8Array.from([0xff, 0xfe, 0xfd, 0x41]), 'bad.csv');
    const encRes = await processWorkerRequest(
      { type: 'ANALYZE_FILE', requestId: 'req-err-5', file: invalidUtf8 },
      emptyState
    );
    assert.equal(encRes.type, 'WORKER_ERROR');
    assert.equal(encRes.code, 'CSV_ENCODING');

    const secretCsv = 'col1,col2\n1,"RAHASIA_INTERNAL_999';
    const brokenFile = makeFakeFile(secretCsv, 'broken.csv');
    const parseErrRes = await processWorkerRequest(
      { type: 'ANALYZE_FILE', requestId: 'req-err-6', file: brokenFile },
      emptyState
    );
    assert.equal(parseErrRes.type, 'WORKER_ERROR');
    assert.equal(parseErrRes.code, 'CSV_UNCLOSED_QUOTE');
    assert.equal(parseErrRes.message.includes('RAHASIA_INTERNAL_999'), false);
  });

  /* ====================================================================== */
  /* 4. ZERO EM-DASH CHECK ON PHASE B FILES                                 */
  /* ====================================================================== */
  console.log('\n[4] Zero Em-Dash & JSDoc Hardening Verification');

  await test('4a. Seluruh file baru Fase B dan modul kalkulasi/parser yang diperkeras bebas karakter U+2014', () => {
    const filesToCheck = [
      'src/types/lab-aqi.ts',
      'src/types/lab-csv.ts',
      'src/types/core-lifecycle.ts',
      'src/scripts/lab/shared/stats.js',
      'src/scripts/lab/core/aqi-calculator.js',
      'src/scripts/lab/core/validate-dataset.js',
      'src/scripts/lab/shared/csv-parser.js',
      'src/scripts/lab/shared/csv-analysis.js',
      'src/scripts/lab/workers/csv-worker.js',
      'scripts/test-v13-ts-parity.mjs',
    ];
    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
      assert.equal(content.includes('\u2014'), false, `File ${rel} mengandung karakter U+2014`);
    }
  });

  console.log(`\nHASIL: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) {
    for (const failure of failures) {
      console.error(`\n--- ${failure.name} ---`);
      console.error(failure.error.stack || failure.error.message);
    }
    process.exit(1);
  }
}

run();
