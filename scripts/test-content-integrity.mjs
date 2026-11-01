/*!
 * scripts/test-content-integrity.mjs - Unit test validator integritas
 * konten V12.2 (spec §10 & §11).
 *
 * Tanpa framework baru (mengikuti pola scripts/test-lab-core.mjs:
 * node:assert + runner mini). Dijalankan:
 *   node scripts/test-content-integrity.mjs
 *
 * Cakupan (spec §10: test minimal):
 *  1. Koleksi valid              → ok
 *  2. Duplicate contentId        → ditolak
 *  3. Unknown relationship target→ ditolak
 *  4. Self-relation              → ditolak
 *  5. Duplicate relationship     → ditolak
 *  6. Invalid ID format          → ditolak
 *  7. Empty relatedIds           → valid
 *  8. Invalid taxonomy           → ditolak
 *  9. Invalid status             → ditolak
 * 10. Error output cukup informatif
 * Plus: relasi ke entri routeable valid; relasi ke RESERVED ditolak
 * (kebijakan visibilitas); id ambigu (normalisasi) ditolak; determinisme;
 * input tidak dimutasi; fixture valid mereplikasi bentuk entri nyata.
 *
 * CATATAN cakupan (spec §11.3): schema Zod per-entri (format id, enum,
 * membership) diuji lewat production build + negative build test yang
 * didokumentasikan di V12.2_IMPLEMENTATION_REPORT.md — file ini menguji
 * modul validator lintas-entri secara langsung dengan fixture in-memory.
 */

import assert from 'node:assert/strict';
import {
  validateWorkCollection,
  formatIntegrityIssues,
  assertWorkIntegrity,
} from '../src/data/content-integrity.js';
import { DISCIPLINE_IDS, TECHNOLOGY_IDS, STATUS_IDS, taxonomyLabel } from '../src/data/taxonomy.js';

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

/** Entri valid minimal (mencerminkan bentuk {id, data} hasil getCollection). */
function entry(id, overrides = {}, dataOverrides = {}) {
  return {
    id,
    data: {
      title: `Title ${id}`,
      status: 'IN PROGRESS',
      contentId: id,
      disciplines: [],
      technologies: [],
      relatedIds: [],
      ...dataOverrides,
    },
    ...overrides,
  };
}

/** Koleksi valid yang mencerminkan kondisi nyata V12.2 (3 entri, tanpa relasi). */
function validCollection() {
  return [
    entry('aqi-cirebon', {}, {
      status: 'IN PROGRESS',
      disciplines: ['data-analysis'],
      technologies: ['javascript', 'astro', 'chart-js', 'node-js'],
    }),
    entry('saham-indonesia', {}, { status: 'RESERVED' }),
    entry('ideas-in-progress', {}, { status: 'RESERVED' }),
  ];
}

const codes = (result) => result.issues.map((issue) => issue.code);

/* ====================================================================== */
console.log('\n[1] Koleksi valid');

test('1a. Koleksi valid (bentuk nyata V12.2) → ok tanpa issue', () => {
  const result = validateWorkCollection(validCollection());
  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.issues.length, 0);
});

test('1b. relatedIds kosong = valid (tidak ada proyek terkait)', () => {
  const result = validateWorkCollection(validCollection());
  assert.equal(result.ok, true);
});

test('1c. Relasi ke entri routeable (IN PROGRESS) → valid', () => {
  const entries = validCollection();
  entries[0].data.relatedIds = []; /* tetap valid; kasus relasi nyata: */
  const withRelation = [
    entry('project-a', {}, { status: 'PUBLISHED' }),
    entry('project-b', {}, { status: 'IN PROGRESS', relatedIds: ['project-a'] }),
  ];
  const result = validateWorkCollection(withRelation);
  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
});

test('1d. Validasi tidak mengubah input (murni)', () => {
  const entries = validCollection();
  const snapshot = JSON.stringify(entries);
  validateWorkCollection(entries);
  assert.equal(JSON.stringify(entries), snapshot);
});

test('1e. Deterministik: input sama → issue list identik (urutan stabil)', () => {
  const broken = [entry('b-x', {}, { relatedIds: ['ghost'] }), entry('a-x', {}, { relatedIds: ['ghost'] })];
  const r1 = validateWorkCollection(broken);
  const r2 = validateWorkCollection([broken[1], broken[0]]); /* urutan dibalik */
  assert.deepEqual(r1.issues, r2.issues);
});

/* ====================================================================== */
console.log('\n[2] contentId');

test('2a. Duplicate contentId → CONTENT_ID_DUPLICATE', () => {
  const entries = [entry('dupe'), entry('other', {}, { contentId: 'dupe' })];
  const result = validateWorkCollection(entries);
  assert.ok(codes(result).includes('CONTENT_ID_DUPLICATE'));
});

test('2b. contentId hilang → CONTENT_ID_MISSING', () => {
  const entries = [{ id: 'no-id', data: { status: 'IN PROGRESS', relatedIds: [] } }];
  const result = validateWorkCollection(entries);
  assert.ok(codes(result).includes('CONTENT_ID_MISSING'));
});

test('2c. Format invalid (spasi, uppercase, trailing dash) → CONTENT_ID_FORMAT', () => {
  for (const bad of ['AQI Cirebon', 'aqi cirebon', 'aqi-', '-aqi', 'aqi--cirebon', 'aqi_cirebon']) {
    const result = validateWorkCollection([entry('x', {}, { contentId: bad })]);
    assert.ok(codes(result).includes('CONTENT_ID_FORMAT'), `format "${bad}" harus ditolak`);
  }
});

test('2d. ID ambigu via normalisasi (case/spasi berbeda, identitas sama) → CONTENT_ID_AMBIGUOUS', () => {
  const entries = [entry('a', {}, { contentId: 'aqi-cirebon' }), entry('b', {}, { contentId: 'AQI-Cirebon' })];
  const result = validateWorkCollection(entries);
  /* 'AQI-Cirebon' gagal format dan ambigu terhadap 'aqi-cirebon'; kedua
     sinyal boleh muncul, yang wajib adalah AMBIGUOUS. */
  assert.ok(codes(result).includes('CONTENT_ID_AMBIGUOUS'), JSON.stringify(result.issues));
});

/* ====================================================================== */
console.log('\n[3] Relasi');

test('3a. Unknown target → RELATION_UNKNOWN_TARGET dengan alasan actionable', () => {
  const result = validateWorkCollection([entry('a', {}, { relatedIds: ['missing-project'] })]);
  assert.ok(codes(result).includes('RELATION_UNKNOWN_TARGET'));
  const issue = result.issues.find((i) => i.code === 'RELATION_UNKNOWN_TARGET');
  assert.match(issue.reason, /missing-project/);
  assert.ok(issue.fix.length > 0);
});

test('3b. Self-relation → RELATION_SELF', () => {
  const result = validateWorkCollection([entry('a', {}, { relatedIds: ['a'] })]);
  assert.ok(codes(result).includes('RELATION_SELF'));
});

test('3c. Duplicate relasi dalam satu array → RELATION_DUPLICATE', () => {
  const entries = [entry('a', {}, { status: 'PUBLISHED' }), entry('b', {}, { relatedIds: ['a', 'a'] })];
  const result = validateWorkCollection(entries);
  assert.ok(codes(result).includes('RELATION_DUPLICATE'));
});

test('3d. Kebijakan visibilitas: target RESERVED → RELATION_TARGET_NOT_ROUTEABLE', () => {
  const entries = [entry('reserved-slot', {}, { status: 'RESERVED' }), entry('a', {}, { relatedIds: ['reserved-slot'] })];
  const result = validateWorkCollection(entries);
  assert.ok(codes(result).includes('RELATION_TARGET_NOT_ROUTEABLE'));
});

test('3e. Kebijakan visibilitas: target ARCHIVED → ditolak juga (tanpa rute publik)', () => {
  const entries = [entry('old', {}, { status: 'ARCHIVED' }), entry('a', {}, { relatedIds: ['old'] })];
  const result = validateWorkCollection(entries);
  assert.ok(codes(result).includes('RELATION_TARGET_NOT_ROUTEABLE'));
});

/* ====================================================================== */
console.log('\n[4] Taxonomy & status');

test('4a. Technology id tak dikenal → TAXONOMY_INVALID', () => {
  const result = validateWorkCollection([entry('a', {}, { technologies: ['react'] })]);
  assert.ok(codes(result).includes('TAXONOMY_INVALID'));
});

test('4b. Discipline id tak dikenal → TAXONOMY_INVALID', () => {
  const result = validateWorkCollection([entry('a', {}, { disciplines: ['Data Science'] })]);
  assert.ok(codes(result).includes('TAXONOMY_INVALID'));
});

test('4c. Semua id kanonis diterima (membership konsisten dengan taxonomy.js)', () => {
  const entries = [entry('a', {}, { disciplines: [...DISCIPLINE_IDS], technologies: [...TECHNOLOGY_IDS] })];
  const result = validateWorkCollection(entries);
  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
});

test('4d. Status tak dikenal → STATUS_INVALID; semua STATUS_IDS diterima', () => {
  const bad = validateWorkCollection([entry('a', {}, { status: 'published' })]); /* lowercase ≠ kanonis */
  assert.ok(codes(bad).includes('STATUS_INVALID'));
  for (const status of STATUS_IDS) {
    const ok = validateWorkCollection([entry('a', {}, { status })]);
    assert.equal(ok.ok, true, `status "${status}" harus valid`);
  }
});

test('4e. Label helper: id → label kanonis; id tak dikenal → undefined (tidak boleh dirender)', () => {
  assert.equal(taxonomyLabel([{ id: 'chart-js', label: 'Chart.js' }], 'chart-js'), 'Chart.js');
  assert.equal(taxonomyLabel([{ id: 'chart-js', label: 'Chart.js' }], 'unknown'), undefined);
});

/* ====================================================================== */
console.log('\n[5] Format error & gate build');

test('5a. formatIntegrityIssues memuat field yang wajib ada (informatif)', () => {
  const result = validateWorkCollection([entry('a', {}, { relatedIds: ['missing-project'] })]);
  const text = formatIntegrityIssues(result.issues);
  assert.match(text, /\[CONTENT INTEGRITY\]/);
  assert.match(text, /Entry: a/);
  assert.match(text, /Field: relatedIds/);
  assert.match(text, /missing-project/);
  assert.match(text, /Reason:/);
  assert.match(text, /Fix:/);
});

test('5b. assertWorkIntegrity melempar Error actionable saat invalid', () => {
  assert.throws(() => assertWorkIntegrity([entry('a', {}, { relatedIds: ['missing-project'] })], 'test'), (error) => {
    assert.match(error.message, /\[CONTENT INTEGRITY\]/);
    assert.match(error.message, /missing-project/);
    return true;
  });
});

test('5c. assertWorkIntegrity lolos tanpa lempar saat valid, mengembalikan hasil', () => {
  const result = assertWorkIntegrity(validCollection(), 'test');
  assert.equal(result.ok, true);
});

test('5d. Input non-array tidak membuat crash (hasil deterministik kosong)', () => {
  const result = validateWorkCollection(null);
  /* Validator lintas-entri: koleksi kosong tidak punya apa pun untuk
     ditolak → ok:true, tanpa issue, tanpa crash. */
  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
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
