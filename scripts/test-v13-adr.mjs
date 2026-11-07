/*!
 * scripts/test-v13-adr.mjs - Unit & integration test suite untuk V13.0-A (Engineering Records Vault).
 *
 * Menggunakan node:assert/strict tanpa framework tambahan.
 * Dijalankan dengan:
 *   node scripts/test-v13-adr.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ADR_MANIFEST,
  ADR_EXCLUDED_CANDIDATES,
  countWordsUtf8,
  countPhysicalLines,
  normalizeAdrCopyContent,
} from '../src/lib/adr-taxonomy.ts';
import {
  DEFAULT_PROJECT_ROOT,
  DEFAULT_ADR_DIR,
  buildExpectedAdrEntries,
  writeAdrCollectionSync,
  checkAdrCollectionSync,
  extractAdrBodyFromMarkdown,
  resolveSafeSourcePath,
} from './data/sync-adr-collection.mjs';
import {
  validateWorkCollection,
  validateAdrCollection,
  assertAdrIntegrity,
  resolveAdrWorkReferences,
} from '../src/data/content-integrity.js';

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

const workMockEntries = [
  {
    id: 'aqi-cirebon',
    data: {
      contentId: 'aqi-cirebon',
      title: 'Air Quality Index Trends · Cirebon (2021–2024)',
      status: 'IN PROGRESS',
      disciplines: ['data-analysis'],
      technologies: ['javascript', 'astro', 'chart-js', 'node-js'],
      relatedIds: [],
    },
  },
  {
    id: 'ideas-in-progress',
    data: {
      contentId: 'ideas-in-progress',
      title: 'Reserved slot / 02',
      status: 'RESERVED',
      disciplines: [],
      technologies: [],
      relatedIds: [],
    },
  },
  {
    id: 'saham-indonesia',
    data: {
      contentId: 'saham-indonesia',
      title: 'Reserved slot / 03',
      status: 'RESERVED',
      disciplines: [],
      technologies: [],
      relatedIds: [],
    },
  },
];

console.log('\n[1] Manifest, Source Provenance & Historical Immutability');

test('1a. Semua sumber yang masuk ADR_MANIFEST benar-benar ada di disk', () => {
  assert.equal(ADR_MANIFEST.length, 13);
  for (const item of ADR_MANIFEST) {
    const fullPath = path.join(DEFAULT_PROJECT_ROOT, item.sourcePath);
    assert.ok(fs.existsSync(fullPath), `Missing source file: ${item.sourcePath}`);
    assert.ok(fs.statSync(fullPath).isFile(), `Not a file: ${item.sourcePath}`);
  }
});

test('1b. Setiap sumber di ADR_MANIFEST memiliki tepat satu record publik tanpa duplikasi adrId/slug/sequenceOrder', () => {
  const seenAdrIds = new Set();
  const seenSlugs = new Set();
  const seenSources = new Set();
  const seenOrders = new Set();

  for (const item of ADR_MANIFEST) {
    assert.ok(!seenAdrIds.has(item.adrId), `Duplicate adrId: ${item.adrId}`);
    assert.ok(!seenSlugs.has(item.slug), `Duplicate slug: ${item.slug}`);
    assert.ok(!seenSources.has(item.sourcePath), `Duplicate sourcePath: ${item.sourcePath}`);
    assert.ok(!seenOrders.has(item.sequenceOrder), `Duplicate sequenceOrder: ${item.sequenceOrder}`);
    seenAdrIds.add(item.adrId);
    seenSlugs.add(item.slug);
    seenSources.add(item.sourcePath);
    seenOrders.add(item.sequenceOrder);
  }
  assert.equal(ADR_EXCLUDED_CANDIDATES.every((c) => c.candidate === false && c.exclusionReason.length > 10), true);
});

test('1c. File sumber historis tidak berubah hash antara preflight snapshot dan post-implementation', () => {
  const snapshotManifestPath = path.join(
    DEFAULT_PROJECT_ROOT,
    'v13-work/snapshots/phase-a/run-1/manifest.json'
  );
  assert.ok(fs.existsSync(snapshotManifestPath), 'Snapshot manifest harus ada');
  const snapshotList = JSON.parse(fs.readFileSync(snapshotManifestPath, 'utf8'));
  const snapshotByPath = new Map(snapshotList.map((entry) => [entry.path, entry]));

  for (const item of ADR_MANIFEST) {
    const snap = snapshotByPath.get(item.sourcePath);
    assert.ok(snap, `Source ${item.sourcePath} harus tercatat di preflight snapshot`);
    const currentBuf = fs.readFileSync(path.join(DEFAULT_PROJECT_ROOT, item.sourcePath));
    const currentSha = crypto.createHash('sha256').update(currentBuf).digest('hex');
    assert.equal(currentSha, snap.sha256, `Hash berubah pada sumber historis ${item.sourcePath}`);
    assert.equal(currentBuf.byteLength, snap.bytes, `Ukuran byte berubah pada ${item.sourcePath}`);
  }
});

test('1d. sourceSha256, sourceBytes, sourceWordCount, dan sourceLineCount cocok 100% dengan byte sumber asli', () => {
  const expectedEntries = buildExpectedAdrEntries();
  for (const entry of expectedEntries) {
    const rawBuf = fs.readFileSync(path.join(DEFAULT_PROJECT_ROOT, entry.frontmatter.provenance.sourcePath));
    const rawSha = crypto.createHash('sha256').update(rawBuf).digest('hex');
    const rawText = rawBuf.toString('utf8');

    assert.equal(entry.frontmatter.provenance.sourceSha256, rawSha);
    assert.equal(entry.frontmatter.provenance.sourceBytes, rawBuf.byteLength);
    assert.equal(entry.frontmatter.provenance.sourceWordCount, countWordsUtf8(rawText));
    assert.equal(entry.frontmatter.provenance.sourceLineCount, countPhysicalLines(rawText));
  }
});

console.log('\n[2] Synchronization Engine (--check, --write, Idempotency & Normalization)');

test('2a. checkAdrCollectionSync lolos pada koleksi src/content/adr/ yang sudah disinkronkan', () => {
  const check = checkAdrCollectionSync(DEFAULT_PROJECT_ROOT, DEFAULT_ADR_DIR);
  assert.equal(check.ok, true, JSON.stringify(check.drifts));
  assert.equal(check.expectedCount, 13);
});

test('2b. --check mendeteksi drift pada salinan sementara tanpa menulis atau mengubah file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-drift-test-'));
  try {
    writeAdrCollectionSync(DEFAULT_PROJECT_ROOT, tmpDir);
    const targetFile = path.join(tmpDir, 'v11-0-implementation-report.md');
    const original = fs.readFileSync(targetFile, 'utf8');
    const drifted = original + '\n<!-- drift -->\n';
    fs.writeFileSync(targetFile, drifted, 'utf8');
    const hashBeforeCheck = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');

    const checkResult = checkAdrCollectionSync(DEFAULT_PROJECT_ROOT, tmpDir);
    assert.equal(checkResult.ok, false);
    assert.ok(checkResult.drifts.some((d) => d.includes('v11-0-implementation-report.md')));

    const hashAfterCheck = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');
    assert.equal(hashAfterCheck, hashBeforeCheck, '--check tidak boleh memodifikasi file');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('2c. --write bersifat idempoten: dua eksekusi berurutan menghasilkan hash output identik', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-idempotent-test-'));
  try {
    const run1 = writeAdrCollectionSync(DEFAULT_PROJECT_ROOT, tmpDir);
    const hashesRun1 = fs
      .readdirSync(tmpDir)
      .sort()
      .map((name) => ({
        name,
        sha: crypto.createHash('sha256').update(fs.readFileSync(path.join(tmpDir, name))).digest('hex'),
      }));

    const run2 = writeAdrCollectionSync(DEFAULT_PROJECT_ROOT, tmpDir);
    const hashesRun2 = fs
      .readdirSync(tmpDir)
      .sort()
      .map((name) => ({
        name,
        sha: crypto.createHash('sha256').update(fs.readFileSync(path.join(tmpDir, name))).digest('hex'),
      }));

    assert.deepEqual(hashesRun1, hashesRun2);
    assert.deepEqual(
      run1.map((e) => e.outputSha256),
      run2.map((e) => e.outputSha256)
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('2d. Normalisasi hanya mengubah U+2014 pada salinan tanpa mengubah angka, tabel, rumus, atau code fence', () => {
  const sample = [
    '# JUDUL \u2014 SUBJUDUL',
    '',
    '| Parameter | Rentang | Rumus |',
    '|---|---|---|',
    '| SO2 | 52\u2013180 \u00b5g/Nm\u00b3 | ((100 - 51) / (180 - 52)) \u00d7 (83,9 - 52) + 51 = 63,21171875 \u2014 valid |',
    '',
    '```js',
    'const x = 63.21171875; // \u2014 komentar',
    '```',
  ].join('\n');

  const { normalizedText, normalizationCount } = normalizeAdrCopyContent(sample);
  assert.equal(normalizationCount, 3);
  assert.equal(normalizedText.includes('\u2014'), false);
  /* En-dash (U+2013) pada rentang 52-180 dan angka/rumus tidak berubah */
  assert.equal(normalizedText.includes('52\u2013180 \u00b5g/Nm\u00b3'), true);
  assert.equal(normalizedText.includes('((100 - 51) / (180 - 52)) \u00d7 (83,9 - 52) + 51 = 63,21171875'), true);

  /* Verifikasi seluruh 13 file di src/content/adr/ bebas U+2014 dan body === raw.replace(/\u2014/g, '-') */
  for (const item of ADR_MANIFEST) {
    const rawText = fs.readFileSync(path.join(DEFAULT_PROJECT_ROOT, item.sourcePath), 'utf8');
    const generatedFile = fs.readFileSync(path.join(DEFAULT_ADR_DIR, `${item.slug}.md`), 'utf8');
    assert.equal(generatedFile.includes('\u2014'), false, `${item.slug}.md masih memuat U+2014`);
    const body = extractAdrBodyFromMarkdown(generatedFile);
    assert.equal(body, rawText.replace(/\u2014/g, '-'), `Body ${item.slug}.md mengalami perubahan selain U+2014`);
  }
});

test('2e. Path traversal dan file sumber hilang ditolak oleh resolveSafeSourcePath', () => {
  assert.throws(
    () => resolveSafeSourcePath(DEFAULT_PROJECT_ROOT, '../outside.md', 'bad-adr'),
    /traversal/i
  );
  assert.throws(
    () => resolveSafeSourcePath(DEFAULT_PROJECT_ROOT, '/etc/passwd', 'bad-adr'),
    /Absolute/i
  );
  assert.throws(
    () => resolveSafeSourcePath(DEFAULT_PROJECT_ROOT, 'NON_EXISTENT_REPORT.md', 'bad-adr'),
    /Missing source file/i
  );
});

console.log('\n[3] ADR & Work Integrity Validator');

function buildValidAdrEntriesForValidator() {
  return buildExpectedAdrEntries().map((e) => ({
    id: e.slug,
    data: e.frontmatter,
  }));
}

test('3a. Koleksi ADR aktual (13 record) lolos validateAdrCollection dan assertAdrIntegrity', () => {
  const adrEntries = buildValidAdrEntriesForValidator();
  const existingSourcePaths = new Set(ADR_MANIFEST.map((m) => m.sourcePath));
  const sourceHashesByPath = new Map(
    ADR_MANIFEST.map((m) => [
      m.sourcePath,
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(DEFAULT_PROJECT_ROOT, m.sourcePath)))
        .digest('hex'),
    ])
  );

  const res = assertAdrIntegrity(adrEntries, workMockEntries, 'test', {
    existingSourcePaths,
    sourceHashesByPath,
  });
  assert.equal(res.ok, true);
  assert.equal(res.issues.length, 0);
});

test('3b. adrId duplikat, sequenceOrder duplikat, hash tidak valid, targetRoute tidak valid, dan relatedWorkIds tidak valid ditolak', () => {
  const base = buildValidAdrEntriesForValidator();
  const mutated = structuredClone(base);

  /* Duplikat adrId & sequenceOrder pada entri ke-2 */
  mutated[1].data.adrId = mutated[0].data.adrId;
  mutated[1].data.sequenceOrder = mutated[0].data.sequenceOrder;
  /* Hash tidak valid pada entri ke-3 */
  mutated[2].data.provenance.sourceSha256 = 'INVALID_HASH';
  /* targetRoute tidak valid pada entri ke-4 */
  mutated[3].data.targetRoutes = ['/unknown-route'];
  /* relatedWorkIds tidak dikenal pada entri ke-5 */
  mutated[4].data.relatedWorkIds = ['non-existent-work'];

  const result = validateAdrCollection(mutated, { workEntries: workMockEntries });
  assert.equal(result.ok, false);
  const codes = new Set(result.issues.map((i) => i.code));
  assert.ok(codes.has('ADR_ID_DUPLICATE'));
  assert.ok(codes.has('ADR_SEQUENCE_DUPLICATE'));
  assert.ok(codes.has('ADR_HASH_INVALID'));
  assert.ok(codes.has('ADR_ROUTE_INVALID'));
  assert.ok(codes.has('ADR_WORK_UNKNOWN_TARGET'));
});

test('3c. Relasi menuju work RESERVED/ARCHIVED ditolak untuk link publik dan resolveAdrWorkReferences tidak menghasilkan href', () => {
  const base = buildValidAdrEntriesForValidator();
  const mutated = structuredClone(base);
  mutated[0].data.relatedWorkIds = ['saham-indonesia'];

  const strictResult = validateAdrCollection(mutated, { workEntries: workMockEntries });
  assert.equal(strictResult.ok, false);
  assert.ok(strictResult.issues.some((i) => i.code === 'ADR_WORK_TARGET_NOT_ROUTEABLE'));

  const resolved = resolveAdrWorkReferences(['aqi-cirebon', 'saham-indonesia'], workMockEntries);
  assert.equal(resolved.length, 2);
  const aqiRef = resolved.find((r) => r.contentId === 'aqi-cirebon');
  const sahamRef = resolved.find((r) => r.contentId === 'saham-indonesia');
  assert.equal(aqiRef.routeable, true);
  assert.equal(aqiRef.href, '/work/aqi-cirebon');
  assert.equal(sahamRef.routeable, false);
  assert.equal(sahamRef.href, null);
});

test('3d. Validator tidak memutasi input dan urutan issue deterministik', () => {
  const base = buildValidAdrEntriesForValidator();
  const mutated = structuredClone(base);
  mutated[0].data.provenance.sourceSha256 = 'bad';
  mutated[2].data.targetRoutes = ['/bad'];

  const snapshot = JSON.stringify(mutated);
  const res1 = validateAdrCollection(mutated, { workEntries: workMockEntries });
  const res2 = validateAdrCollection([...mutated].reverse(), { workEntries: workMockEntries });

  assert.equal(JSON.stringify(mutated), snapshot);
  assert.deepEqual(res1.issues, res2.issues);
});

test('3e. Koleksi work existing tetap lolos validateWorkCollection tanpa regresi', () => {
  const res = validateWorkCollection(workMockEntries);
  assert.equal(res.ok, true);
  assert.equal(res.issues.length, 0);
});

console.log('\n[4] Zero Em-Dash & Static Build Output Verification');

test('4a. Tidak ada U+2014 baru pada seluruh file yang dibuat pada Fase A', () => {
  const phaseAFiles = [
    'src/lib/adr-taxonomy.ts',
    'scripts/data/sync-adr-collection.mjs',
    'scripts/test-v13-adr.mjs',
    'src/scripts/archive/adr.js',
    'src/styles/archive/adr.css',
    ...ADR_MANIFEST.map((m) => `src/content/adr/${m.slug}.md`),
  ];

  for (const rel of phaseAFiles) {
    const full = path.join(DEFAULT_PROJECT_ROOT, rel);
    assert.ok(fs.existsSync(full), `File ${rel} harus ada`);
    const content = fs.readFileSync(full, 'utf8');
    assert.equal(content.includes('\u2014'), false, `File ${rel} mengandung karakter U+2014`);
  }
});

test('4b. Sesuai kontrak V15.0, dokumen ADR tidak lagi diekspos sebagai halaman publik di src/pages/archive/adr atau dist/archive/adr', () => {
  assert.equal(
    fs.existsSync(path.join(DEFAULT_PROJECT_ROOT, 'src/pages/archive/adr/index.astro')),
    false,
    'src/pages/archive/adr/index.astro harus dihapus dari halaman publik'
  );
  assert.equal(
    fs.existsSync(path.join(DEFAULT_PROJECT_ROOT, 'src/pages/archive/adr/[slug].astro')),
    false,
    'src/pages/archive/adr/[slug].astro harus dihapus dari halaman publik'
  );
  assert.equal(
    fs.existsSync(path.join(DEFAULT_PROJECT_ROOT, 'dist/archive/adr/index.html')),
    false,
    'dist/archive/adr/index.html tidak boleh diekspos sebagai rute publik'
  );
});

console.log(`\nHASIL: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) {
  for (const failure of failures) {
    console.error(`\n--- ${failure.name} ---`);
    console.error(failure.error.stack || failure.error.message);
  }
  process.exit(1);
}
