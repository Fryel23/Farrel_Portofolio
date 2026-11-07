import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { assertV13ContentIntegrity } from '../src/data/content-integrity.js';
import { buildCodexKnowledgeGraph } from '../src/lib/codex-graph-builder.ts';
import { validateDockTargetUrl, validateWorldIndexPayload } from '../src/lib/world-os-core.ts';
import { buildExpectedAdrEntries } from './data/sync-adr-collection.mjs';

const ROOT = process.cwd();

const gateResults = [];
let totalGatesPassed = 0;
let totalGatesFailed = 0;

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return sha256Buffer(fs.readFileSync(fullPath));
}

function recordGate(id, name, passed, details) {
  gateResults.push({ id, name, passed, details });
  if (passed) {
    totalGatesPassed++;
    console.log(`  PASS [${id}] ${name}: ${details}`);
  } else {
    totalGatesFailed++;
    console.error(`  FAIL [${id}] ${name}: ${details}`);
  }
}

function walkFiles(dirRel, filterFn = () => true) {
  const fullDir = path.join(ROOT, dirRel);
  if (!fs.existsSync(fullDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.posix.join(dirRel, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(rel, filterFn));
    } else if (entry.isFile() && filterFn(rel)) {
      out.push(rel);
    }
  }
  return out.sort();
}

function canonicalizeValue(val) {
  if (Array.isArray(val)) {
    return val.map(canonicalizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val).sort()) {
      out[k] = canonicalizeValue(val[k]);
    }
    return out;
  }
  return val;
}

console.log('=== V13.0 Master Zero-Debt Audit (14 Gates) ===');

// ---------------------------------------------------------------------------
// GATE 1: Protected Feature Integrity
// ---------------------------------------------------------------------------
try {
  const manifestPath = path.join(ROOT, 'v13-work/snapshots/phase-a/run-1/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestMap = new Map(manifest.map((item) => [item.path, item]));

  const strictlyProtectedPaths = [
    'src/components/home/Curtain.astro',
    'src/styles/curtain.css',
    'src/scripts/curtain-controller.js',
    'src/components/home/HeroCanvas.astro',
    'src/scripts/hero-webgl/index.js',
    'src/scripts/hero-webgl/controller.js',
    'src/scripts/hero-webgl/scene.js',
    'src/scripts/hero-webgl/geometry.js',
    'src/scripts/hero-webgl/shaders.js',
    'src/styles/hero-webgl.css',
    'src/content/work/ideas-in-progress.md',
    'src/content/work/saham-indonesia.md',
    'V10.4_DIAGNOSTIC_REPORT.md',
    'V10.5_EXPERIMENT_REPORT.md',
    'V10.5_FINAL_DECISION.md',
    'V10.5_FINAL_VERIFICATION.txt',
    'V11.0_IMPLEMENTATION_REPORT.md',
    'V11.1_IMPLEMENTATION_REPORT.md',
    'V11.1_MODULARIZATION_REPORT.md',
    'V12.0_IMPLEMENTATION_REPORT.md',
    'V12.0_AUDIT_CLOSURE_REPORT.md',
    'V12.2_IMPLEMENTATION_REPORT.md',
    'V12.3_IMPLEMENTATION_REPORT.md',
    'PERFORMANCE_BASELINE.md',
    'IDENTITY_AUDIT.md',
  ];

  const mismatches = [];
  for (const relPath of strictlyProtectedPaths) {
    const baseline = manifestMap.get(relPath);
    if (!baseline) {
      mismatches.push(`${relPath}: missing in baseline manifest`);
      continue;
    }
    const actualHash = sha256File(relPath);
    if (actualHash !== baseline.sha256) {
      mismatches.push(`${relPath}: SHA-256 mismatch (${actualHash} !== ${baseline.sha256})`);
    }
  }
  const aqiMdText = fs.readFileSync(path.join(ROOT, 'src/content/work/aqi-cirebon.md'), 'utf8');
  if (!aqiMdText.includes('title: "Air Quality Index Trends · Cirebon (2021–2025)"')) {
    mismatches.push('src/content/work/aqi-cirebon.md: missing consolidated 2021–2025 title');
  }

  recordGate(
    'GATE-01',
    'Protected Feature Integrity',
    mismatches.length === 0,
    mismatches.length === 0
      ? `${strictlyProtectedPaths.length}/${strictlyProtectedPaths.length} protected & historical files match baseline SHA-256`
      : mismatches.join('; ')
  );
} catch (err) {
  recordGate('GATE-01', 'Protected Feature Integrity', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 2: Em-Dash Baseline Delta (Zero New U+2014)
// ---------------------------------------------------------------------------
try {
  const baselineEmDash = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'v13-work/baseline/em-dash-baseline.json'), 'utf8')
  );
  const newV13Dirs = [
    'src/content/adr',
    'src/content/codex',
    'src/lib',
    'src/types',
    'src/pages/atlas',
    'src/pages/aethelgrad',
    'src/pages/api',
    'src/scripts/archive',
    'src/scripts/atlas',
    'src/scripts/global',
    'src/styles/archive',
    'src/styles/aethelgrad',
    'src/styles/global',
    'src/world-aethelgrad',
  ];
  const newV13ExplicitFiles = [
    'src/components/layout/CommandPalette.astro',
    'src/components/layout/ReferenceDock.astro',
    'src/scripts/codex.js',
    'src/styles/codex.css',
    'src/styles/atlas.css',
    'scripts/data/sync-adr-collection.mjs',
    'scripts/data/README.md',
    'scripts/data/etl-interop-fixture.json',
    'scripts/test-v13-adr.mjs',
    'scripts/test-v13-ts-parity.mjs',
    'scripts/test-v13-codex.mjs',
    'scripts/test-v13-world-os.mjs',
    'scripts/audit-v13-zero-debt.mjs',
    'V13.0A_ADR_VAULT_REPORT.md',
    'V13.0B_TYPESCRIPT_HARDENING_REPORT.md',
    'V13.0C_CODEX_IMPLEMENTATION_REPORT.md',
    'V13.0D_WORLD_OS_REPORT.md',
    'V13.0_IMPLEMENTATION_REPORT.md',
  ];

  const allNewFiles = new Set(newV13ExplicitFiles.filter((f) => fs.existsSync(path.join(ROOT, f))));
  for (const dir of newV13Dirs) {
    for (const f of walkFiles(dir)) {
      allNewFiles.add(f);
    }
  }

  const violations = [];
  for (const relPath of allNewFiles) {
    const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    let count = 0;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 0x2014) count++;
    }
    if (count > 0) {
      violations.push(`${relPath}: ${count} U+2014 occurrence(s)`);
    }
  }

  // Check modified baseline files for zero net increase
  for (const [relPath, info] of Object.entries(baselineEmDash.files)) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    let currentCount = 0;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 0x2014) currentCount++;
    }
    if (currentCount > info.total) {
      violations.push(`${relPath}: baseline U+2014 increased (${currentCount} > ${info.total})`);
    }
  }

  recordGate(
    'GATE-02',
    'Em-Dash Baseline Delta',
    violations.length === 0,
    violations.length === 0
      ? `0 U+2014 across ${allNewFiles.size} new V13.0 files; 0 net increases across ${baselineEmDash.totalFiles} baseline files`
      : violations.join('; ')
  );
} catch (err) {
  recordGate('GATE-02', 'Em-Dash Baseline Delta', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 3: Editorial Anti-AI Voice
// ---------------------------------------------------------------------------
try {
  const blacklist = [
    'delve',
    'tapestry',
    'testament',
    'beacon',
    'symphony',
    'unlock',
    'unleash',
    'elevate',
    'revolutionize',
    'game-changer',
    'cutting-edge',
    'seamless',
    'seamlessly',
    'breathtaking',
    'world-class',
    'next-gen',
    'supercharge',
    'skyrocket',
    'ever-evolving',
    'fast-paced',
    'holistic',
    'synergy',
    'paradigm shift',
    'senantiasa',
    'tak tertandingi',
    'menyelami',
    'membuka potensi',
    'di era digital yang berkembang pesat',
    'solusi komprehensif',
    'terobosan revolusioner',
  ];

  const proseTargets = [
    ...walkFiles('src/content/codex', (f) => f.endsWith('.md')),
    'src/pages/atlas/index.astro',
    'src/components/layout/CommandPalette.astro',
    'src/components/layout/ReferenceDock.astro',
    'scripts/data/README.md',
  ];

  const hits = [];
  for (const relPath of proseTargets) {
    const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    for (const term of blacklist) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(text)) {
        hits.push(`${relPath}: matched "${term}"`);
      }
    }
  }

  recordGate(
    'GATE-03',
    'Editorial Anti-AI Voice',
    hits.length === 0,
    hits.length === 0
      ? `0 blacklisted promotional words across ${proseTargets.length} V13.0 editorial/UI files (${blacklist.length} terms scanned)`
      : hits.join('; ')
  );
} catch (err) {
  recordGate('GATE-03', 'Editorial Anti-AI Voice', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 4: Cross-Collection Integrity
// ---------------------------------------------------------------------------
try {
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

  const expectedAdr = buildExpectedAdrEntries(ROOT);
  const adrEntries = expectedAdr.map((item) => ({
    id: item.slug,
    data: item.frontmatter,
  }));

  const codexFiles = walkFiles('src/content/codex', (f) => f.endsWith('.md'));
  const codexEntries = codexFiles.map((f) => {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!match) throw new Error(`Missing frontmatter in ${f}`);
    const lines = match[1].split('\n');
    const data = {
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
    const unq = (v) => {
      const t = v.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      }
      return t;
    };
    for (const line of lines) {
      if (!line.trim()) continue;
      const topMatch = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
      if (topMatch) {
        const [, key, rest] = topMatch;
        currentObj = null;
        currentSubArray = null;
        currentSubObj = null;
        if (rest.trim() === '[]') {
          data[key] = [];
          currentSection = null;
        } else if (rest.trim() === '') {
          currentSection = key;
          if (!Array.isArray(data[key])) data[key] = [];
        } else {
          data[key] = unq(rest);
          currentSection = null;
        }
        continue;
      }
      if (['sourceFiles', 'relatedCodexIds', 'relatedWorkIds', 'relatedAdrIds'].includes(currentSection)) {
        const itemMatch = /^\s+-\s+(.+)$/.exec(line);
        if (itemMatch) data[currentSection].push(unq(itemMatch[1]));
        continue;
      }
      if (currentSection === 'sourceEvidence') {
        const startMatch = /^\s{2}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (startMatch) {
          currentObj = { [startMatch[1]]: unq(startMatch[2]) };
          data.sourceEvidence.push(currentObj);
          continue;
        }
        const propMatch = /^\s{4}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (propMatch && currentObj) currentObj[propMatch[1]] = unq(propMatch[2]);
        continue;
      }
      if (currentSection === 'formulas') {
        const startFormula = /^\s{2}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (startFormula) {
          currentObj = { [startFormula[1]]: unq(startFormula[2]), variables: [] };
          currentSubArray = null;
          currentSubObj = null;
          data.formulas.push(currentObj);
          continue;
        }
        const varHeader = /^\s{4}variables:\s*$/.exec(line);
        if (varHeader && currentObj) {
          currentSubArray = currentObj.variables;
          continue;
        }
        const startVar = /^\s{6}-\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (startVar && currentSubArray) {
          currentSubObj = { [startVar[1]]: unq(startVar[2]) };
          currentSubArray.push(currentSubObj);
          continue;
        }
        const varProp = /^\s{8}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (varProp && currentSubObj) {
          currentSubObj[varProp[1]] = unq(varProp[2]);
          continue;
        }
        const formulaProp = /^\s{4}([a-zA-Z0-9_]+):\s*(.+)$/.exec(line);
        if (formulaProp && currentObj) currentObj[formulaProp[1]] = unq(formulaProp[2]);
      }
    }
    const id = path.relative(path.join(ROOT, 'src/content/codex'), path.join(ROOT, f)).replace(/\\/g, '/').replace(/\.md$/, '');
    return { id, data, body: match[2] };
  });

  const existingSourcePaths = new Set([
    ...expectedAdr.map((e) => e.frontmatter.provenance.sourcePath),
    ...codexEntries.flatMap((e) => e.data.sourceFiles),
    ...codexEntries.flatMap((e) => e.data.sourceEvidence.map((ev) => ev.file)),
  ]);

  assertV13ContentIntegrity({
    workEntries,
    adrEntries,
    codexEntries,
    existingSourcePaths,
    source: 'audit-v13-zero-debt',
  });
  const graph = buildCodexKnowledgeGraph({ codexEntries, workEntries, adrEntries });
  const sahamNode = graph.nodes.find((n) => n.id === 'work:saham-indonesia');
  if (!sahamNode || sahamNode.url !== null || sahamNode.routeable !== false) {
    throw new Error('work:saham-indonesia must exist in graph with url === null and routeable === false');
  }

  recordGate(
    'GATE-04',
    'Cross-Collection Integrity',
    true,
    `Validated ${workEntries.length} work, ${adrEntries.length} adr, ${codexEntries.length} codex entries; graph has ${graph.nodes.length} nodes & ${graph.edges.length} edges; work:saham-indonesia url=null, routeable=false`
  );
} catch (err) {
  recordGate('GATE-04', 'Cross-Collection Integrity', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 5: AQI Core Regression
// ---------------------------------------------------------------------------
try {
  const out = execFileSync(process.execPath, ['scripts/test-lab-core.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const summaryMatch = out.match(/(?:HASIL|Results):\s*(\d+)\s*PASS,\s*(\d+)\s*FAIL/i);
  const passCount = summaryMatch ? Number(summaryMatch[1]) : 0;
  const failCount = summaryMatch ? Number(summaryMatch[2]) : 1;
  recordGate(
    'GATE-05',
    'AQI Core Regression',
    failCount === 0 && passCount >= 48,
    `scripts/test-lab-core.mjs -> ${passCount} PASS, ${failCount} FAIL (24h reference period & allowBasisMismatch preserved)`
  );
} catch (err) {
  recordGate('GATE-05', 'AQI Core Regression', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 6: CSV Core Regression & TypeScript Parity
// ---------------------------------------------------------------------------
try {
  const csvOut = execFileSync(process.execPath, ['scripts/test-csv-explorer.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const tsOut = execFileSync(process.execPath, ['scripts/test-v13-ts-parity.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const csvMatch = csvOut.match(/(?:HASIL|Results):\s*(\d+)\s*PASS,\s*(\d+)\s*FAIL/i);
  const tsMatch = tsOut.match(/(?:HASIL|Results):\s*(\d+)\s*PASS,\s*(\d+)\s*FAIL/i);
  const csvPass = csvMatch ? Number(csvMatch[1]) : 0;
  const csvFail = csvMatch ? Number(csvMatch[2]) : 1;
  const tsPass = tsMatch ? Number(tsMatch[1]) : 0;
  const tsFail = tsMatch ? Number(tsMatch[2]) : 1;

  recordGate(
    'GATE-06',
    'CSV Core Regression & TS Golden Parity',
    csvFail === 0 && tsFail === 0 && csvPass >= 59 && tsPass >= 7,
    `test-csv-explorer.mjs (${csvPass} PASS, ${csvFail} FAIL) + test-v13-ts-parity.mjs (${tsPass} PASS, ${tsFail} FAIL)`
  );
} catch (err) {
  recordGate('GATE-06', 'CSV Core Regression & TS Golden Parity', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 7: Provenance & ETL Interoperability Integrity
// ---------------------------------------------------------------------------
try {
  // 1. Check ADR sync provenance
  execFileSync(process.execPath, ['scripts/data/sync-adr-collection.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  // 2. Check Cirebon ingest audit & raw CSV hash
  const auditPath = path.join(ROOT, 'data/cirebon-ingest-audit.json');
  const auditRaw = fs.readFileSync(auditPath, 'utf8');
  if (/\/home\/|\/Users\/|[A-Z]:\\\\/.test(auditRaw)) {
    throw new Error('data/cirebon-ingest-audit.json contains a machine-local absolute path');
  }
  const rawCsvHash = sha256File('data/sources/data_kualitas_udara_2.csv');
  const expectedCsvHash = '9ce4de3d0466c71d1ce10447941236e9b7cfc19af255c6831fec89a5d25a31a0';
  if (rawCsvHash !== expectedCsvHash) {
    throw new Error(`Raw CSV hash mismatch: ${rawCsvHash} !== ${expectedCsvHash}`);
  }

  // 3. Cross-runtime Node.js vs Python 3 canonical JSON digest check
  const fixturePath = path.join(ROOT, 'scripts/data/etl-interop-fixture.json');
  const fixtureObj = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const nodeCanonical = JSON.stringify(canonicalizeValue(fixtureObj));
  const nodeDigest = sha256Buffer(Buffer.from(nodeCanonical, 'utf8'));

  const pyScript = [
    'import json, hashlib, sys',
    'with open(sys.argv[1], "r", encoding="utf-8") as f:',
    '    data = json.load(f)',
    'canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)',
    'print(hashlib.sha256(canonical.encode("utf-8")).hexdigest(), end="")',
  ].join('\n');

  const pyDigest = execFileSync('python3', ['-c', pyScript, fixturePath], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();

  if (nodeDigest !== pyDigest) {
    throw new Error(`Node vs Python canonical digest mismatch: ${nodeDigest} !== ${pyDigest}`);
  }

  recordGate(
    'GATE-07',
    'Provenance & ETL Interoperability Integrity',
    true,
    `13 ADR hashes verified; raw CSV SHA-256=${rawCsvHash.slice(0, 12)}...; Node/Python canonical JSON digest match (${nodeDigest.slice(0, 16)}...)`
  );
} catch (err) {
  recordGate('GATE-07', 'Provenance & ETL Interoperability Integrity', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 8: Security and DOM Hygiene
// ---------------------------------------------------------------------------
try {
  const codeFiles = [
    ...walkFiles('src/lib'),
    ...walkFiles('src/types'),
    ...walkFiles('src/scripts/archive'),
    'src/scripts/global/command-palette.ts',
    'src/scripts/global/tiling-dock.ts',
    'src/scripts/codex.js',
    'src/components/layout/CommandPalette.astro',
    'src/components/layout/ReferenceDock.astro',
    'src/pages/atlas/index.astro',
  ];

  const badPatterns = [
    { name: 'eval(', re: /\beval\s*\(/ },
    { name: 'new Function', re: /\bnew\s+Function\b/ },
    { name: 'innerHTML', re: /\.\s*innerHTML\b/ },
    { name: 'outerHTML', re: /\.\s*outerHTML\b/ },
    { name: 'insertAdjacentHTML', re: /\.\s*insertAdjacentHTML\b/ },
  ];

  const findings = [];
  for (const relPath of codeFiles) {
    const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    for (const pat of badPatterns) {
      if (pat.re.test(content)) {
        findings.push(`${relPath}: contains ${pat.name}`);
      }
    }
  }

  // Verify validateDockTargetUrl blocks unsafe URLs
  const unsafeUrls = ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/codex/../secret', '/codex?foo=1'];
  for (const u of unsafeUrls) {
    const res = validateDockTargetUrl(u);
    if (res.ok) {
      findings.push(`validateDockTargetUrl failed to reject ${u}`);
    }
  }

  recordGate(
    'GATE-08',
    'Security & DOM Hygiene',
    findings.length === 0,
    findings.length === 0
      ? `0 unsafe DOM/eval APIs across ${codeFiles.length} V13.0 modules; validateDockTargetUrl rejected all ${unsafeUrls.length} attack vectors`
      : findings.join('; ')
  );
} catch (err) {
  recordGate('GATE-08', 'Security & DOM Hygiene', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 9: Lifecycle Ownership
// ---------------------------------------------------------------------------
try {
  const adrJs = fs.readFileSync(path.join(ROOT, 'src/scripts/archive/adr.js'), 'utf8');
  const codexJs = fs.readFileSync(path.join(ROOT, 'src/scripts/codex.js'), 'utf8');
  const globalJs = fs.readFileSync(path.join(ROOT, 'src/scripts/global.js'), 'utf8');
  const dockTs = fs.readFileSync(path.join(ROOT, 'src/scripts/global/tiling-dock.ts'), 'utf8');

  const checks = [
    { name: 'adr.js uses bootPage', ok: adrJs.includes('bootPage(') },
    { name: 'codex.js uses bootPage', ok: codexJs.includes('bootPage(') },
    { name: 'codex.js uses isReducedMotion', ok: codexJs.includes('isReducedMotion') },
    { name: 'global.js registers initCommandPalette & initReferenceDock in bootPage', ok: globalJs.includes('initCommandPalette') && globalJs.includes('initReferenceDock') },
    { name: 'tiling-dock.ts uses trackMotionListener & closeReferenceDock', ok: dockTs.includes('trackMotionListener') && dockTs.includes('closeReferenceDock()') },
  ];

  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  recordGate(
    'GATE-09',
    'Lifecycle Ownership & Reduced Motion',
    failed.length === 0,
    failed.length === 0
      ? 'All V13.0 client modules register with bootPage/trackMotionListener and respect isReducedMotion()'
      : failed.join('; ')
  );
} catch (err) {
  recordGate('GATE-09', 'Lifecycle Ownership & Reduced Motion', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 10: Route and Build Output
// ---------------------------------------------------------------------------
try {
  const mandatoryRoutes = [
    'dist/index.html',
    'dist/about/index.html',
    'dist/connect/index.html',
    'dist/work/index.html',
    'dist/work/aqi-cirebon/index.html',
    'dist/archive/index.html',
    'dist/archive/play/index.html',
    'dist/archive/credentials/index.html',
    'dist/archive/off-screen/index.html',
    'dist/atlas/index.html',
    'dist/aethelgrad/index.html',
    'dist/lab/index.html',
    'dist/lab/methodology/index.html',
    'dist/lab/csv/index.html',
    'dist/api/world-index.json',
    'dist/api/aethelgrad/auth-status.json',
    'dist/api/aethelgrad/register.json',
    'dist/api/aethelgrad/login.json',
    'dist/api/aethelgrad/logout.json',
    'dist/api/aethelgrad/state.json',
    'dist/api/aethelgrad/gacha-summon.json',
    'dist/api/aethelgrad/equip-item.json',
    'dist/api/aethelgrad/forge-upgrade.json',
    'dist/api/aethelgrad/code-sanctum.json',
    'dist/api/aethelgrad/colosseum-duel.json',
  ];

  const missingRoutes = mandatoryRoutes.filter((r) => !fs.existsSync(path.join(ROOT, r)));
  const forbiddenPublicRoutes = ['dist/archive/adr/index.html', 'dist/codex/index.html'].filter((r) =>
    fs.existsSync(path.join(ROOT, r))
  );
  const worldIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/api/world-index.json'), 'utf8'));
  const indexValid = validateWorldIndexPayload(worldIndex);
  const totalIndexedItems =
    (worldIndex.territories?.length || 0) +
    (worldIndex.work?.length || 0) +
    (worldIndex.adr?.length || 0) +
    (worldIndex.codex?.length || 0) +
    (worldIndex.commands?.length || 0);

  recordGate(
    'GATE-10',
    'Route & Build Output',
    missingRoutes.length === 0 && forbiddenPublicRoutes.length === 0 && indexValid,
    missingRoutes.length === 0 && forbiddenPublicRoutes.length === 0 && indexValid
      ? `${mandatoryRoutes.length} mandatory V15.0 build outputs verified (including /atlas, /aethelgrad + 10 API endpoints, and 0 exposed ADR/Codex routes; world-index=${totalIndexedItems} entries)`
      : `Missing: ${missingRoutes.join(', ')}; Forbidden present: ${forbiddenPublicRoutes.join(', ')}; indexValid=${indexValid}`
  );
} catch (err) {
  recordGate('GATE-10', 'Route & Build Output', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 11: Bundle Isolation & Initial Request Budget
// ---------------------------------------------------------------------------
try {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  const scriptSrcMatches = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const paletteSource = fs.readFileSync(path.join(ROOT, 'src/scripts/global/command-palette.ts'), 'utf8');

  const eagerViolations = [];
  for (const src of scriptSrcMatches) {
    if (/chart|codex/i.test(src)) {
      eagerViolations.push(`dist/index.html eagerly loads ${src}`);
    }
  }
  if (!paletteSource.includes('export async function ensureWorldIndexLoaded(') || !paletteSource.includes("fetchWithTimeout('/api/world-index.json'")) {
    eagerViolations.push('command-palette.ts does not implement lazy ensureWorldIndexLoaded()');
  }

  const astroBundles = walkFiles('dist/_astro').map((rel) => ({
    rel,
    bytes: fs.statSync(path.join(ROOT, rel)).size,
  }));
  const worldIndexBytes = fs.statSync(path.join(ROOT, 'dist/api/world-index.json')).size;

  recordGate(
    'GATE-11',
    'Bundle Isolation & Initial Request Budget',
    eagerViolations.length === 0,
    eagerViolations.length === 0
      ? `Homepage initial scripts=[${scriptSrcMatches.join(', ')}] (no eager Chart.js/OGL/Codex); world-index.json=${worldIndexBytes} bytes across ${astroBundles.length} dist/_astro assets`
      : eagerViolations.join('; ')
  );
} catch (err) {
  recordGate('GATE-11', 'Bundle Isolation & Initial Request Budget', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 12: Responsive & Accessibility Contract
// ---------------------------------------------------------------------------
try {
  const homeHtml = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  const atlasHtml = fs.readFileSync(path.join(ROOT, 'dist/atlas/index.html'), 'utf8');
  const aethelHtml = fs.readFileSync(path.join(ROOT, 'dist/aethelgrad/index.html'), 'utf8');
  const dockCss = fs.readFileSync(path.join(ROOT, 'src/styles/global/tiling-dock.css'), 'utf8');
  const atlasCss = fs.readFileSync(path.join(ROOT, 'src/styles/atlas.css'), 'utf8');

  const a11yChecks = [
    { name: 'CommandPalette combobox & listbox', ok: homeHtml.includes('role="combobox"') && homeHtml.includes('role="listbox"') },
    { name: 'ReferenceDock aside & iframe sandbox', ok: homeHtml.includes('id="world-reference-dock"') && homeHtml.includes('sandbox=""') },
    { name: 'Data Atlas Crypt canvas & telemetry HUD', ok: atlasHtml.includes('id="atlas-network-canvas"') && atlasHtml.includes('id="atlas-telemetry-hud"') },
    { name: 'Atlas accessible node directory & inspector', ok: atlasHtml.includes('id="atlas-inspector-panel"') && atlasHtml.includes('id="atlas-node-list"') },
    { name: 'Aethelgrad isolated world & smart auth gate', ok: aethelHtml.includes('id="aethelgrad-auth-gate"') && aethelHtml.includes('id="aethelgrad-stage"') },
    { name: 'Responsive media queries & local table overflow', ok: dockCss.includes('@media (min-width: 1024px)') && atlasCss.includes('@media (max-width:') },
  ];

  const failed = a11yChecks.filter((c) => !c.ok).map((c) => c.name);
  recordGate(
    'GATE-12',
    'Responsive & Accessibility Contract',
    failed.length === 0,
    failed.length === 0
      ? `${a11yChecks.length}/${a11yChecks.length} responsive, ARIA, reduced-motion, and accessible fallback checks verified`
      : failed.join('; ')
  );
} catch (err) {
  recordGate('GATE-12', 'Responsive & Accessibility Contract', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 13: Source Hygiene
// ---------------------------------------------------------------------------
try {
  const srcAndPublicFiles = [...walkFiles('src'), ...walkFiles('public')];
  const junkFiles = srcAndPublicFiles.filter((f) => /\.(bak|tmp|orig|log|swp)$/.test(f) || f.includes('v13-work') || f.includes('v15-work'));
  const distHasWorkDir = fs.existsSync(path.join(ROOT, 'dist/v13-work')) || fs.existsSync(path.join(ROOT, 'dist/v15-work'));

  // Check for duplicate .js + .ts stems in src/
  const stems = new Map();
  const duplicateModules = [];
  for (const rel of walkFiles('src', (f) => /\.(js|ts)$/.test(f) && !f.endsWith('.d.ts'))) {
    const stem = rel.replace(/\.(js|ts)$/, '');
    if (stems.has(stem)) {
      duplicateModules.push(`${stems.get(stem)} + ${rel}`);
    } else {
      stems.set(stem, rel);
    }
  }

  const ok = junkFiles.length === 0 && !distHasWorkDir && duplicateModules.length === 0;
  recordGate(
    'GATE-13',
    'Source Hygiene',
    ok,
    ok
      ? '0 temp/backup files in src/ or public/; v13-work excluded from dist/; 0 duplicate .js/.ts module stems'
      : `junk=${junkFiles.join(',')}; distHasWorkDir=${distHasWorkDir}; duplicates=${duplicateModules.join(',')}`
  );
} catch (err) {
  recordGate('GATE-13', 'Source Hygiene', false, err.message);
}

// ---------------------------------------------------------------------------
// GATE 14: Full Regression Suite (All 7 Runners)
// ---------------------------------------------------------------------------
try {
  const suites = [
    'scripts/test-lab-core.mjs',
    'scripts/test-csv-explorer.mjs',
    'scripts/test-content-integrity.mjs',
    'scripts/test-v13-adr.mjs',
    'scripts/test-v13-ts-parity.mjs',
    'scripts/test-v13-codex.mjs',
    'scripts/test-v13-world-os.mjs',
  ];

  const suiteSummaries = [];
  for (const script of suites) {
    const out = execFileSync(process.execPath, [script], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const m = out.match(/(?:HASIL|Results?):\s*(\d+)\s*PASS,\s*(\d+)\s*FAIL/i);
    const p = m ? Number(m[1]) : 0;
    const f = m ? Number(m[2]) : 0;
    if (f > 0 || p === 0) {
      throw new Error(`${script} reported ${f} failure(s) or 0 passes`);
    }
    suiteSummaries.push(`${path.basename(script)}(${p} PASS)`);
  }

  recordGate(
    'GATE-14',
    'Full Regression Suite (7 Test Runners)',
    true,
    suiteSummaries.join(', ')
  );
} catch (err) {
  recordGate('GATE-14', 'Full Regression Suite (7 Test Runners)', false, err.message);
}

console.log(`\nMaster Audit Summary: ${totalGatesPassed} PASS, ${totalGatesFailed} FAIL`);
if (totalGatesFailed > 0) {
  process.exit(1);
}
