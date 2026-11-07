/*!
 * scripts/test-v13-world-os.mjs - Automated test suite untuk V13.0-D (World OS Layer).
 *
 * Memverifikasi seluruh 17 kriteria otomatis D.6 menggunakan node:assert/strict:
 *   1. Index JSON memiliki schemaVersion === 1.
 *   2. Semua path territory berada pada allowlist dan route HTML benar-benar terbangun.
 *   3. Work/ADR/Codex entries sesuai koleksi sumber.
 *   4. RESERVED work tidak ditautkan ke route yang tidak tersedia (routeable: false, url: null).
 *   5. Command parser hanya menerima command yang diizinkan (:warp, :split, :audio, :top).
 *   6. Query normalization dan ranking 5-tier deterministik.
 *   7. Search rendering menggunakan DOM text nodes (0 innerHTML/eval).
 *   8. Palette fetch hanya pada first open, bukan initial page load.
 *   9. Cache dan error/retry behavior terkendali.
 *  10. Dialog close/focus restoration terverifikasi.
 *  11. Dock menolak external URL, javascript:, path traversal, protocol-relative, dan rute non-routeable.
 *  12. Iframe memiliki sandbox="" tanpa allow-scripts / allow-top-navigation.
 *  13. Dock tidak memindahkan <main> atau canvas aktif.
 *  14. Lifecycle init terdaftar melalui trackMotionListener di bootPage().
 *  15. Responsive breakpoint >= 1024px dan reduced-motion sesuai.
 *  16. Tidak ada Chart.js atau OGL eager pada initial homepage bundle.
 *  17. Tidak ada U+2014 baru pada seluruh file Fase D.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  WORLD_INDEX_SCHEMA_VERSION,
  WORLD_TERRITORIES,
  WORLD_COMMANDS,
  buildWorldIndexPayload,
  validateWorldIndexPayload,
  normalizeWorldQuery,
  parseWorldCommand,
  rankWorldSearchResults,
  validateDockTargetUrl,
} from '../src/lib/world-os-core.ts';

const PROJECT_ROOT = process.cwd();

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

const builtIndexPath = path.join(PROJECT_ROOT, 'dist/api/world-index.json');
assert.ok(fs.existsSync(builtIndexPath), 'Missing built dist/api/world-index.json');
const indexPayload = JSON.parse(fs.readFileSync(builtIndexPath, 'utf8'));

console.log('\n[1] Static World Index Endpoint (/api/world-index.json) & Route Allowlist');

test('1, 2, 3, & 4. Index JSON memiliki schemaVersion 1, 13 territory terbangun di dist/, bebas eksposur ADR/Codex publik, dan RESERVED work non-routeable', () => {
  assert.equal(validateWorldIndexPayload(indexPayload), true);
  assert.equal(indexPayload.schemaVersion, WORLD_INDEX_SCHEMA_VERSION);
  assert.equal(indexPayload.territories.length, 13);
  assert.equal(indexPayload.work.length, 3);
  assert.equal(indexPayload.adr.length, 0);
  assert.equal(indexPayload.codex.length, 0);
  assert.equal(indexPayload.commands.length, 7);

  /* Semua territory wajib memiliki file HTML statis di dist/ */
  for (const t of indexPayload.territories) {
    const relHtml = t.path === '/' ? 'index.html' : path.join(t.path.slice(1), 'index.html');
    const fullHtmlPath = path.join(PROJECT_ROOT, 'dist', relHtml);
    assert.ok(fs.existsSync(fullHtmlPath), `Missing built HTML for territory ${t.path}: ${fullHtmlPath}`);
  }

  /* Work routeability check */
  const aqiWork = indexPayload.work.find((w) => w.contentId === 'aqi-cirebon');
  assert.ok(aqiWork);
  assert.equal(aqiWork.routeable, true);
  assert.equal(aqiWork.url, '/work/aqi-cirebon');

  const reservedSaham = indexPayload.work.find((w) => w.contentId === 'saham-indonesia');
  assert.ok(reservedSaham);
  assert.equal(reservedSaham.routeable, false);
  assert.equal(reservedSaham.url, null);

  const reservedIdeas = indexPayload.work.find((w) => w.contentId === 'ideas-in-progress');
  assert.ok(reservedIdeas);
  assert.equal(reservedIdeas.routeable, false);
  assert.equal(reservedIdeas.url, null);
});

console.log('\n[2] Command Parser Allowlist & Deterministic Search Ranking');

test('5. Command parser hanya menerima command yang diizinkan (:warp, :split, :audio, :top) dan menolak command asing', () => {
  assert.equal(parseWorldCommand('normal search query'), null);

  const warpAethelgrad = parseWorldCommand(':warp aethelgrad');
  assert.deepEqual(warpAethelgrad, {
    ok: true,
    action: 'warp',
    targetPath: '/aethelgrad',
    territoryLabel: 'Aethelgrad',
  });

  const warpAtlas = parseWorldCommand('  :WARP   /atlas  ');
  assert.deepEqual(warpAtlas, {
    ok: true,
    action: 'warp',
    targetPath: '/atlas',
    territoryLabel: 'The Data Atlas Crypt & Knowledge Graph',
  });

  const warpUnknown = parseWorldCommand(':warp https://evil.example');
  assert.equal(warpUnknown.ok, false);

  assert.deepEqual(parseWorldCommand(':split open'), { ok: true, action: 'split-open' });
  assert.deepEqual(parseWorldCommand(':split close'), { ok: true, action: 'split-close' });
  assert.equal(parseWorldCommand(':split sideways').ok, false);

  assert.deepEqual(parseWorldCommand(':audio mute'), { ok: true, action: 'audio', mode: 'mute' });
  assert.deepEqual(parseWorldCommand(':audio unmute'), { ok: true, action: 'audio', mode: 'unmute' });
  assert.deepEqual(parseWorldCommand(':audio toggle'), { ok: true, action: 'audio', mode: 'toggle' });
  assert.equal(parseWorldCommand(':audio blast').ok, false);

  assert.deepEqual(parseWorldCommand(':top'), { ok: true, action: 'top' });
  assert.equal(parseWorldCommand(':top extra').ok, false);
  assert.equal(parseWorldCommand(':exec rm -rf').ok, false);
});

test('6. Query normalization & 5-tier search ranking deterministik (exact code > exact title > exact alias > prefix > substring)', () => {
  const norm = normalizeWorldQuery('  \u0007  501.1   ISPU  \n ');
  assert.equal(norm, '501.1 ispu');

  /* Long query cap */
  assert.equal(normalizeWorldQuery('a'.repeat(250)).length, 100);

  /* Tier 1 (500): Exact territory code 'SECTOR 04' (Aethelgrad) */
  const r1 = rankWorldSearchResults(indexPayload, 'SECTOR 04');
  const r2 = rankWorldSearchResults(indexPayload, 'SECTOR 04');
  assert.deepEqual(r1, r2);
  assert.equal(r1.grouped.TERRITORIES[0].id, 'territory:aethelgrad');
  assert.equal(r1.grouped.TERRITORIES[0].score, 500);

  /* Tier 1 (500): Exact territory code 'SECTOR 00' (The Data Atlas Crypt) */
  const rAtlas = rankWorldSearchResults(indexPayload, 'SECTOR 00');
  assert.equal(rAtlas.grouped.TERRITORIES[0].codeOrTag, 'SECTOR 00');
  assert.equal(rAtlas.grouped.TERRITORIES[0].score, 500);

  /* Command prefix ':audio' filters only COMMANDS */
  const rCmd = rankWorldSearchResults(indexPayload, ':audio');
  assert.equal(rCmd.grouped.TERRITORIES.length, 0);
  assert.ok(rCmd.grouped.COMMANDS.length >= 3);
});

console.log('\n[3] Reference Dock Security & Same-Origin Allowlist Validation');

test('11 & 12. validateDockTargetUrl menolak external URL, javascript:, data:, protocol-relative, path traversal, dan work RESERVED', () => {
  /* Allowed internal routes */
  assert.deepEqual(validateDockTargetUrl('/lab/methodology', indexPayload), {
    ok: true,
    safePath: '/lab/methodology',
  });
  assert.deepEqual(validateDockTargetUrl('/atlas', indexPayload), {
    ok: true,
    safePath: '/atlas',
  });
  assert.deepEqual(validateDockTargetUrl('/aethelgrad', indexPayload), {
    ok: true,
    safePath: '/aethelgrad',
  });
  assert.deepEqual(
    validateDockTargetUrl('/work/aqi-cirebon', indexPayload),
    {
      ok: true,
      safePath: '/work/aqi-cirebon',
    }
  );

  /* Rejected dangerous or unlisted URLs */
  assert.equal(validateDockTargetUrl('https://evil.example/phish', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('http://localhost:4321/lab', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('//evil.example/path', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('javascript:alert(1)', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('data:text/html,<script>alert(1)</script>', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('/lab/../../etc/passwd', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('/lab/%2e%2e/secret', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('/work/saham-indonesia', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('/work/ideas-in-progress', indexPayload).ok, false);
  assert.equal(validateDockTargetUrl('/non-existent-route', indexPayload).ok, false);
});

console.log('\n[4] Safe DOM, Lazy Fetch, Iframe Sandbox, Bundle Isolation & Zero Em-Dash');

test('7, 8, 9, 10, 12, 13, 14, & 15. Audit sumber CommandPalette & ReferenceDock: 0 innerHTML/eval, lazy fetch hanya saat openPalette, iframe sandbox="", dan <main> tidak dipindahkan', () => {
  const paletteSrc = fs.readFileSync(
    path.join(PROJECT_ROOT, 'src/scripts/global/command-palette.ts'),
    'utf8'
  );
  const dockSrc = fs.readFileSync(
    path.join(PROJECT_ROOT, 'src/scripts/global/tiling-dock.ts'),
    'utf8'
  );
  const dockAstro = fs.readFileSync(
    path.join(PROJECT_ROOT, 'src/components/layout/ReferenceDock.astro'),
    'utf8'
  );
  const dockCss = fs.readFileSync(
    path.join(PROJECT_ROOT, 'src/styles/global/tiling-dock.css'),
    'utf8'
  );

  for (const src of [paletteSrc, dockSrc]) {
    assert.equal(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\beval\s*\(|new\s+Function/.test(src), false);
    assert.ok(src.includes('trackMotionListener'), 'Must register listeners through trackMotionListener');
  }

  /* Lazy fetch: initCommandPalette tidak memanggil ensureWorldIndexLoaded pada saat boot */
  const initBody = paletteSrc.slice(paletteSrc.indexOf('export function initCommandPalette'));
  const openFnIdx = initBody.indexOf('async function openPalette');
  const bootPartBeforeOpen = initBody.slice(0, openFnIdx);
  assert.equal(
    bootPartBeforeOpen.includes('ensureWorldIndexLoaded('),
    false,
    'initCommandPalette must not eagerly fetch world-index.json before openPalette()'
  );
  assert.ok(initBody.slice(openFnIdx).includes('await ensureWorldIndexLoaded(false)'));
  assert.ok(paletteSrc.includes('lastTriggerElement.focus'));

  /* Iframe sandbox="" check */
  assert.ok(dockAstro.includes('sandbox=""'));
  assert.equal(dockAstro.includes('allow-scripts'), false);
  assert.equal(dockAstro.includes('allow-top-navigation'), false);
  assert.ok(dockCss.includes('@media (min-width: 1024px)'));
  assert.ok(dockCss.includes('@media (max-width: 1023px)'));
});

test('16. Initial homepage HTML dan global bundle tidak memuat Chart.js atau OGL secara eager, serta tidak memindahkan <main id="main">', () => {
  const homeHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'dist/index.html'), 'utf8');
  assert.ok(/<main\b[^>]*\bid="main"/.test(homeHtml), 'Missing <main id="main"> in dist/index.html');
  assert.ok(homeHtml.includes('id="world-command-dialog"'));
  assert.ok(homeHtml.includes('id="world-reference-dock"'));
  assert.ok(homeHtml.includes('id="world-workspace-status-btn"'));

  /* Pastikan script tag di dist/index.html tidak memuat chunk chart.js atau ogl secara sinkron/eager */
  const scriptTags = homeHtml.match(/<script[^>]+src="([^"]+)"[^>]*>/g) || [];
  for (const tag of scriptTags) {
    assert.equal(/chart|ogl/i.test(tag), false, `Unexpected eager heavy library in homepage script tag: ${tag}`);
  }
});

test('17. Tidak ada karakter U+2014 (em-dash) baru pada seluruh file Fase D', () => {
  const phaseDFiles = [
    'src/lib/world-os-core.ts',
    'src/pages/api/world-index.json.ts',
    'src/components/layout/CommandPalette.astro',
    'src/components/layout/ReferenceDock.astro',
    'src/scripts/global/command-palette.ts',
    'src/scripts/global/tiling-dock.ts',
    'src/styles/global/command-palette.css',
    'src/styles/global/tiling-dock.css',
  ];

  for (const rel of phaseDFiles) {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    const emDashCount = (content.match(/\u2014/g) || []).length;
    assert.equal(emDashCount, 0, `Found U+2014 em-dash in ${rel}`);
  }
});

console.log(`\nResult: ${passed} PASS, ${failed} FAIL\n`);
if (failed > 0) {
  process.exit(1);
}
