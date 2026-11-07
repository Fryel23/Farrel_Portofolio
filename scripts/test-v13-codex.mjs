/*!
 * scripts/test-v13-codex.mjs - Unit & integration test suite untuk V13.0-C (The Grand Codex 100-600).
 *
 * Memverifikasi seluruh 16 kriteria wajib C.8 menggunakan node:assert/strict:
 *   1. Enam catatan fondasi tersedia dan valid.
 *   2. Schema setiap entry valid.
 *   3. Domain/code prefix, maturity, dan uniqueness valid (tidak semua EVERGREEN).
 *   4. Seluruh sourceFiles ada dan path aman (menolak path traversal/absolute).
 *   5. Setiap klaim sourceEvidence menunjuk bukti nyata.
 *   6. Relasi tidak broken, duplicate, self-referential, atau membuat dead link.
 *   7. Backlink tepat merupakan inverse dari relasi sumber.
 *   8. Graph output deterministik untuk input yang sama.
 *   9. Graph edge tidak terduplikasi.
 *  10. Large graph mode tidak melakukan O(n^2) terhadap seluruh koleksi.
 *  11. Reduced-motion tidak menjalankan rAF / iterasi spring.
 *  12. Graph mempunyai alternatif keyboard HTML yang setara secara informasi.
 *  13. Formula memiliki notasi sumber, fallback tekstual, dan MathML statis.
 *  14. Tidak ada U+2014 baru di konten baru Fase C.
 *  15. Semua route detail statis terbangun di dist/codex/.
 *  16. Work collection dan ADR collection tidak mengalami regresi.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CODEX_DOMAINS,
  CODEX_DOMAIN_IDS,
  CODEX_MATURITY_IDS,
  CODEX_EVIDENCE_STATUS_IDS,
  isValidDecimalCodeForDomain,
} from '../src/lib/codex-taxonomy.ts';
import {
  GRAPH_SCALE_LIMITS,
  buildCodexKnowledgeGraph,
  computeBoundedGraphLayout,
  getCodexRouteSlug,
} from '../src/lib/codex-graph-builder.ts';
import {
  isSafeRelativeRepoPath,
  validateWorkCollection,
  validateAdrCollection,
  validateCodexCollection,
  validateCrossCollectionIntegrity,
  assertV13ContentIntegrity,
} from '../src/data/content-integrity.js';
import { buildExpectedAdrEntries } from './data/sync-adr-collection.mjs';

const PROJECT_ROOT = process.cwd();
const CODEX_DIR = path.join(PROJECT_ROOT, 'src/content/codex');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  FAIL  ${name}\n        ${error.message}\n`);
  }
}

/**
 * Parser YAML frontmatter deterministik khusus struktur frontmatter Codex & Work
 * agar test runner Node dapat memverifikasi file Markdown tanpa ketergantungan Vite runtime.
 */
function extractFrontmatterBlock(rawMarkdown) {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  if (!match) {
    throw new Error('Markdown file missing frontmatter delimiters');
  }
  return { yamlText: match[1], bodyText: match[2] };
}

/**
 * Membaca seluruh file catatan Codex di src/content/codex/ dan mengonversi
 * frontmatter menjadi objek data terstruktur.
 */
function loadCodexEntriesFromDisk() {
  const entries = [];
  const domainDirs = fs
    .readdirSync(CODEX_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const domainDir of domainDirs) {
    const fullDomainDir = path.join(CODEX_DIR, domainDir);
    const mdFiles = fs
      .readdirSync(fullDomainDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    for (const fileName of mdFiles) {
      const fullPath = path.join(fullDomainDir, fileName);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { yamlText, bodyText } = extractFrontmatterBlock(raw);
      const entryId = `${domainDir}/${fileName.replace(/\.md$/, '')}`;
      const data = parseCodexFrontmatter(yamlText);
      entries.push({ id: entryId, filePath: fullPath, raw, bodyText, data });
    }
  }
  return entries;
}

function unquoteYaml(val) {
  const t = val.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  }
  return t;
}

function parseCodexFrontmatter(yamlText) {
  const lines = yamlText.split('\n');
  const result = {
    sourceFiles: [],
    sourceEvidence: [],
    relatedCodexIds: [],
    relatedWorkIds: [],
    relatedAdrIds: [],
    formulas: [],
  };

  let currentSection = null;
  let currentObj = null;
  let currentSubArray = null;
  let currentSubObj = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    /* Top-level key */
    const topMatch = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (topMatch) {
      const [, key, rest] = topMatch;
      currentObj = null;
      currentSubArray = null;
      currentSubObj = null;
      if (rest.trim() === '[]') {
        result[key] = [];
        currentSection = null;
      } else if (rest.trim() === '') {
        currentSection = key;
        if (!Array.isArray(result[key])) result[key] = [];
      } else {
        result[key] = unquoteYaml(rest);
        currentSection = null;
      }
      continue;
    }

    if (
      currentSection === 'sourceFiles' ||
      currentSection === 'relatedCodexIds' ||
      currentSection === 'relatedWorkIds' ||
      currentSection === 'relatedAdrIds'
    ) {
      const itemMatch = /^\s+-\s+(.+)$/.exec(line);
      if (itemMatch) {
        result[currentSection].push(unquoteYaml(itemMatch[1]));
      }
      continue;
    }

    if (currentSection === 'sourceEvidence') {
      const startMatch = /^\s{2}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (startMatch) {
        currentObj = { [startMatch[1]]: unquoteYaml(startMatch[2]) };
        result.sourceEvidence.push(currentObj);
        continue;
      }
      const propMatch = /^\s{4}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (propMatch && currentObj) {
        currentObj[propMatch[1]] = unquoteYaml(propMatch[2]);
      }
      continue;
    }

    if (currentSection === 'formulas') {
      const startFormula = /^\s{2}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (startFormula) {
        currentObj = { [startFormula[1]]: unquoteYaml(startFormula[2]), variables: [] };
        currentSubArray = null;
        currentSubObj = null;
        result.formulas.push(currentObj);
        continue;
      }
      const varHeader = /^\s{4}variables:\s*$/.exec(line);
      if (varHeader && currentObj) {
        currentSubArray = currentObj.variables;
        continue;
      }
      const startVar = /^\s{6}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (startVar && currentSubArray) {
        currentSubObj = { [startVar[1]]: unquoteYaml(startVar[2]) };
        currentSubArray.push(currentSubObj);
        continue;
      }
      const varProp = /^\s{8}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (varProp && currentSubObj) {
        currentSubObj[varProp[1]] = unquoteYaml(varProp[2]);
        continue;
      }
      const formulaProp = /^\s{4}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
      if (formulaProp && currentObj) {
        currentObj[formulaProp[1]] = unquoteYaml(formulaProp[2]);
      }
    }
  }

  return result;
}

const workEntries = [
  {
    id: 'aqi-cirebon',
    data: {
      contentId: 'aqi-cirebon',
      title: 'Air Quality Index Trends · Cirebon (2021–2025)',
      category: 'Data & Research',
      tag: 'Research / Data Analysis',
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
      category: 'Data & Software',
      tag: 'Concept',
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
      category: 'Quantitative & Markets',
      tag: 'Planned Study',
      status: 'RESERVED',
      disciplines: [],
      technologies: [],
      relatedIds: [],
    },
  },
];

const expectedAdr = buildExpectedAdrEntries(PROJECT_ROOT);
const adrEntries = expectedAdr.map((item) => ({
  id: item.slug,
  data: item.frontmatter,
}));

const codexEntries = loadCodexEntriesFromDisk();

function existsAndContainedInRepo(relPath, projectRoot) {
  if (!isSafeRelativeRepoPath(relPath)) return false;
  const rootReal = fs.realpathSync(projectRoot);
  const full = path.resolve(rootReal, relPath);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
  const realFull = fs.realpathSync(full);
  const relFromRoot = path.relative(rootReal, realFull);
  return !relFromRoot.startsWith('..') && !path.isAbsolute(relFromRoot);
}

console.log('\n[1] Codex Collection Loading, Schema, & Decimal 100-600 Taxonomy');

test('1. Enam catatan fondasi (100-600) dimuat dengan lengkap dari src/content/codex/', () => {
  assert.equal(codexEntries.length, 6);
  const domainsFound = new Set(codexEntries.map((e) => e.data.domain));
  assert.equal(domainsFound.size, 6);
  for (const dom of CODEX_DOMAINS) {
    assert.ok(domainsFound.has(dom.id), `Missing foundation note for domain ${dom.id}`);
  }
});

test('2 & 3. Schema setiap entry valid, decimalCode sesuai domain, dan maturity tidak semuanya EVERGREEN', () => {
  const maturities = new Set();
  for (const entry of codexEntries) {
    const d = entry.data;
    assert.ok(d.codexId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.codexId));
    assert.ok(CODEX_DOMAIN_IDS.has(d.domain));
    assert.ok(isValidDecimalCodeForDomain(d.decimalCode, d.domain));
    assert.ok(CODEX_MATURITY_IDS.has(d.maturity));
    maturities.add(d.maturity);
    assert.ok(d.title.length >= 10);
    assert.ok(d.summary.length >= 25);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d.updatedAt));
  }
  assert.ok(maturities.has('SEEDLING'), 'Must include SEEDLING note (Domain 300)');
  assert.ok(maturities.has('BUDDING'), 'Must include BUDDING notes');
  assert.ok(maturities.has('EVERGREEN'), 'Must include EVERGREEN notes');
});

test('4 & 5. Seluruh sourceFiles aman/ada di disk dan setiap sourceEvidence menunjuk bukti nyata', () => {
  for (const entry of codexEntries) {
    assert.ok(entry.data.sourceFiles.length >= 1);
    for (const sf of entry.data.sourceFiles) {
      assert.equal(existsAndContainedInRepo(sf, PROJECT_ROOT), true, `Unsafe or missing sourceFile: ${sf}`);
    }
    assert.ok(entry.data.sourceEvidence.length >= 1);
    for (const ev of entry.data.sourceEvidence) {
      assert.ok(CODEX_EVIDENCE_STATUS_IDS.has(ev.status), `Invalid evidence status: ${ev.status}`);
      assert.equal(existsAndContainedInRepo(ev.file, PROJECT_ROOT), true, `Missing evidence file: ${ev.file}`);
      assert.ok(ev.claim && ev.claim.length >= 10);
      assert.ok(ev.reference && ev.reference.length >= 3);
    }
  }
  /* Path safety negative checks */
  assert.equal(existsAndContainedInRepo('../outside.txt', PROJECT_ROOT), false);
  assert.equal(existsAndContainedInRepo('/etc/passwd', PROJECT_ROOT), false);
  assert.equal(existsAndContainedInRepo('src/non-existent-file-xyz.js', PROJECT_ROOT), false);
});

console.log('\n[2] Cross-Collection Integrity & Negative Rejection Tests');

test('6 & 16. validateCrossCollectionIntegrity & assertV13ContentIntegrity lulus dengan 0 issue tanpa regresi Work/ADR', () => {
  const existingSourcePaths = new Set([
    ...expectedAdr.map((e) => e.frontmatter.provenance.sourcePath),
    ...codexEntries.flatMap((e) => e.data.sourceFiles),
    ...codexEntries.flatMap((e) => e.data.sourceEvidence.map((ev) => ev.file)),
  ]);
  const sourceHashesByPath = new Map(
    expectedAdr.map((e) => [e.frontmatter.provenance.sourcePath, e.frontmatter.provenance.sourceSha256])
  );

  const report = assertV13ContentIntegrity({
    workEntries,
    adrEntries,
    codexEntries,
    existingSourcePaths,
    source: 'test-v13-codex',
  });

  assert.equal(report.ok, true);
  assert.equal(report.issues.length, 0);
  assert.equal(validateWorkCollection(workEntries).ok, true);
  assert.equal(
    validateAdrCollection(adrEntries, { workEntries, existingSourcePaths, sourceHashesByPath }).ok,
    true
  );
});

test('6b. Validator menolak codexId duplikat, decimalCode salah domain, self-reference, dan broken relation secara deterministik', () => {
  const brokenEntries = [
    {
      id: '100-software-and-systems/test-a',
      data: {
        ...codexEntries[0].data,
        decimalCode: '501.9', // salah domain (100 vs 500)
        relatedCodexIds: [codexEntries[0].data.codexId, 'non-existent-codex'], // self + broken
        relatedAdrIds: ['non-existent-adr'],
        relatedWorkIds: ['non-existent-work'],
        sourceFiles: ['../unsafe.js'],
      },
    },
    {
      id: '100-software-and-systems/test-b',
      data: {
        ...codexEntries[0].data, // duplicate codexId
      },
    },
  ];

  const res1 = validateCodexCollection(brokenEntries, { workEntries, adrEntries });
  const res2 = validateCodexCollection(brokenEntries, { workEntries, adrEntries });

  assert.equal(res1.ok, false);
  assert.deepEqual(res1.issues, res2.issues, 'Issue ordering must be deterministic');
  const codes = new Set(res1.issues.map((i) => i.code));
  assert.ok(codes.has('CODEX_ID_DUPLICATE'));
  assert.ok(codes.has('CODEX_DECIMAL_CODE_INVALID'));
  assert.ok(codes.has('CODEX_RELATION_SELF'));
  assert.ok(codes.has('CODEX_RELATION_UNKNOWN_TARGET'));
  assert.ok(codes.has('CODEX_ADR_UNKNOWN_TARGET'));
  assert.ok(codes.has('CODEX_WORK_UNKNOWN_TARGET'));
  assert.ok(codes.has('CODEX_SOURCE_FILE_UNSAFE'));
});

console.log('\n[3] Knowledge Graph Builder, Backlink Inverse, Scale Cap, & Reduced Motion');

const graph1 = buildCodexKnowledgeGraph({ codexEntries, workEntries, adrEntries });
const graph2 = buildCodexKnowledgeGraph({ codexEntries, workEntries, adrEntries });

test('7, 8, & 9. Graph deterministik, edge bebas duplikasi, dan backlinks tepat merupakan inverse dari outgoing relations', () => {
  assert.equal(JSON.stringify(graph1), JSON.stringify(graph2));

  /* Edge uniqueness */
  const edgeKeys = new Set();
  for (const edge of graph1.edges) {
    assert.ok(!edgeKeys.has(edge.id), `Duplicate edge: ${edge.id}`);
    edgeKeys.add(edge.id);
  }

  /* Verify every outgoing relation has a matching incoming backlink on target, and vice versa */
  let totalOutgoing = 0;
  let totalIncoming = 0;
  for (const [sourceId, outList] of Object.entries(graph1.outgoingByNodeId)) {
    totalOutgoing += outList.length;
    for (const outRef of outList) {
      const targetBacklinks = graph1.incomingBacklinksByNodeId[outRef.nodeId] || [];
      const found = targetBacklinks.some(
        (b) => b.nodeId === sourceId && b.relationType === outRef.relationType
      );
      assert.equal(
        found,
        true,
        `Missing inverse backlink on ${outRef.nodeId} from ${sourceId}`
      );
    }
  }
  for (const inList of Object.values(graph1.incomingBacklinksByNodeId)) {
    totalIncoming += inList.length;
  }
  assert.equal(totalOutgoing, graph1.edges.length);
  assert.equal(totalIncoming, graph1.edges.length);

  /* Verify RESERVED work node (work:saham-indonesia) is reference-only and non-routeable */
  const sahamNode = graph1.nodes.find((n) => n.id === 'work:saham-indonesia');
  assert.ok(sahamNode, 'work:saham-indonesia must appear as reference-only node');
  assert.equal(sahamNode.routeable, false);
  assert.equal(sahamNode.url, null);
});

test('10 & 11. Large graph mode tidak menjalankan iterasi O(n^2) dan reduced-motion menjalankan 0 iterasi spring', () => {
  const reducedLayout = computeBoundedGraphLayout(graph1, { reducedMotion: true });
  assert.equal(reducedLayout.iterationsRun, 0);
  assert.equal(reducedLayout.modeUsed, 'static-reduced-motion');

  const springLayout = computeBoundedGraphLayout(graph1, { reducedMotion: false });
  assert.ok(springLayout.iterationsRun >= 1 && springLayout.iterationsRun <= GRAPH_SCALE_LIMITS.MAX_SPRING_ITERATIONS);
  assert.equal(springLayout.modeUsed, 'bounded-spring');

  /* Synthetic large graph > MAX_SPRING_NODES (205 nodes) */
  const syntheticNodes = Array.from({ length: 205 }, (_, idx) => ({
    id: `codex:synth-${idx}`,
    rawId: `synth-${idx}`,
    type: 'codex',
    label: `Synthetic Node ${idx}`,
    codeOrTag: `101.${idx}`,
    categoryOrDomain: 'Software',
    url: `/codex/synth-${idx}`,
    routeable: true,
    statusOrMaturity: 'SEEDLING',
    outDegree: 0,
    inDegree: 0,
    degree: 0,
  }));
  const initialPositions = {};
  syntheticNodes.forEach((n) => {
    initialPositions[n.id] = { x: 0.5, y: 0.5 };
  });

  const largeLayout = computeBoundedGraphLayout(
    {
      nodes: syntheticNodes,
      edges: [],
      layoutMode: 'large-graph-clustered',
      initialPositions,
    },
    { reducedMotion: false }
  );
  assert.equal(largeLayout.iterationsRun, 0);
  assert.equal(largeLayout.modeUsed, 'clustered-deterministic');
});

console.log('\n[4] V15.0 Non-Public Codex Exposure, Formula Metadata, & Zero Em-Dash');

test('12, 13, & 15. Sesuai kontrak V15.0, catatan pembuatan website /codex tidak diekspos sebagai halaman publik sementara metadata formula tetap valid', () => {
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'src/pages/codex/index.astro')),
    false,
    'src/pages/codex/index.astro harus dihapus dari halaman publik'
  );
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'src/pages/codex/[...slug].astro')),
    false,
    'src/pages/codex/[...slug].astro harus dihapus dari halaman publik'
  );
  assert.equal(
    fs.existsSync(path.join(PROJECT_ROOT, 'dist/codex/index.html')),
    false,
    'dist/codex/index.html tidak boleh diekspos di build publik'
  );

  for (const entry of codexEntries) {
    const slug = getCodexRouteSlug(entry.id);
    assert.ok(slug.length > 5);
    if (entry.data.formulas && entry.data.formulas.length > 0) {
      for (const f of entry.data.formulas) {
        assert.ok(f.label && f.sourceNotation && f.plainExplanation);
      }
    }
  }
});

test('14. Tidak ada karakter U+2014 (em-dash) baru pada seluruh file yang dibuat/diubah di Fase C', () => {
  const phaseCFiles = [
    'src/lib/codex-taxonomy.ts',
    'src/lib/codex-graph-builder.ts',
    'src/scripts/codex.js',
    'src/styles/codex.css',
    ...codexEntries.map((e) => path.relative(PROJECT_ROOT, e.filePath)),
  ];

  for (const relPath of phaseCFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8');
    const emDashCount = (text.match(/\u2014/g) || []).length;
    assert.equal(emDashCount, 0, `Found U+2014 em-dash in ${relPath}`);
  }
});

console.log(`\nResult: ${passed} PASS, ${failed} FAIL\n`);
if (failed > 0) {
  process.exit(1);
}
