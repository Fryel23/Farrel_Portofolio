#!/usr/bin/env node
/**
 * scripts/test-v14-ux-architecture.mjs
 * Automated verification suite for V14.0-UNIFIED ("The Living Archive:
 * Human-First UX Architecture, Bespoke Territory Layouts, and Zero-Debt
 * Consistency Hardening").
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function sha256File(relPath) {
  const buf = fs.readFileSync(path.join(ROOT, relPath));
  return crypto.createHash('sha256').update(buf).digest('hex');
}

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('=== V14.0-UNIFIED UX & ARCHITECTURE TEST SUITE ===');

// 1. Navigation & Progressive Disclosure Mega-Drawer Contract
check('Stage 2: Header 4-item primary nav + Two-Column Eksplorasi Mega-Drawer + Friendly Command Palette', () => {
  const header = read('src/components/layout/Header.astro');
  const headerCss = read('src/styles/global/header.css');

  // 4 primary NAV items inside Header.astro
  const navKeyMatches = [...header.matchAll(/navKey:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(navKeyMatches, ['home', 'work', 'about', 'connect'], 'Primary NAV must have exactly 4 navKey items');

  // Mega-drawer columns & destinations
  assert.ok(header.includes('id="menu-dots"'), 'Must preserve #menu-dots button');
  assert.ok(header.includes('Eksplorasi'), '#menu-dots must show human-friendly Eksplorasi label');
  assert.ok(header.includes('id="quick-menu"'), 'Must preserve #quick-menu');
  assert.ok(header.includes('id="quick-menu-panel"'), 'Must preserve #quick-menu-panel');
  assert.ok(header.includes('quick-menu-columns'), 'Mega-drawer must use 2-column progressive disclosure layout');
  for (const href of ['/lab', '/lab/csv', '/archive/play', '/archive/off-screen', '/atlas', '/lab/methodology', '/archive/credentials', '/archive']) {
    assert.ok(
      header.includes(`href="${href}"`) || header.includes(`href: '${href}'`),
      `Mega-drawer must include link to ${href}`
    );
  }
  assert.ok(header.includes('data-portal-dive="/aethelgrad"'), 'Mega-drawer must include Portal Dive CTA to /aethelgrad');
  assert.equal(header.includes('/archive/adr'), false, 'Mega-drawer must not expose /archive/adr');
  assert.equal(header.includes('/codex'), false, 'Mega-drawer must not expose /codex');

  // Friendly Command Palette button
  assert.ok(header.includes('id="world-workspace-status-btn"'), 'Must preserve #world-workspace-status-btn');
  assert.ok(header.includes('Cari / Pintasan'), 'Command Palette button must show Cari / Pintasan');
  assert.ok(header.includes('Ctrl+K'), 'Command Palette button must show Ctrl+K');

  // Mobile drawer close button
  assert.ok(header.includes('id="mobile-menu-drawer"'), 'Must preserve #mobile-menu-drawer');
  assert.ok(header.includes('id="mobile-menu-close"'), 'Must preserve #mobile-menu-close');
  assert.ok(headerCss.includes('.quick-menu-columns'), 'header.css must style .quick-menu-columns');
});

// 2. Homepage Hero Clarity, Swiss Grid, Quick Topic Navigator & Overlapping Split-Tone Bridge
check('Stage 3: Homepage Swiss Technical Grid, Quick Topic Navigator, and Overlapping Split-Tone Bridge', () => {
  const hero = read('src/components/home/Hero.astro');
  const home = read('src/pages/index.astro');
  const homeCss = read('src/styles/home.css');

  assert.ok(hero.includes('class="hero-swiss-grid"'), 'Hero must include .hero-swiss-grid');
  assert.ok(hero.includes('hero-reg-mark--tl') && hero.includes('hero-reg-mark--br'), 'Hero must include + registration marks');
  assert.ok(hero.includes('id="hero-cta" href="/work"'), 'Primary CTA #hero-cta must link to /work');
  assert.ok(hero.includes('id="hero-docs" href="/about"'), 'Secondary CTA #hero-docs must link to /about');
  assert.ok(hero.includes('class="archive-search-label"'), 'Quick Topic Navigator must have visible label');
  assert.ok(hero.includes('class="hero-quick-pills"'), 'Hero must include quick jump pills');
  for (const pillHref of ['/work/aqi-cirebon', '/lab', '/lab/csv', '/atlas']) {
    assert.ok(hero.includes(`href="${pillHref}"`), `Quick pill must link to ${pillHref}`);
  }
  assert.ok(hero.includes('data-portal-dive="/aethelgrad"'), 'Hero must include Portal Dive CTA to /aethelgrad');

  // Overlapping Split-Tone Bridge (#explore-bridge)
  assert.ok(home.includes('id="explore-bridge"'), 'Homepage must include #explore-bridge section');
  assert.ok(home.includes('explore-bridge-card--light'), 'Bridge must include light sandbox card');
  assert.ok(home.includes('explore-bridge-card--dark'), 'Bridge must include dark engineering archive card');
  assert.ok(home.includes('02 / STUDI KASUS UNGGULAN'), 'Homepage section 02 must be numbered 02');
  assert.ok(home.includes('03 / JEMBATAN EKSPLORASI'), 'Homepage section 03 must be numbered 03');
  assert.ok(home.includes('04 / PROFIL &amp; KONTAK SINGKAT'), 'Homepage section 04 must be numbered 04');
  assert.ok(homeCss.includes('#0B1220') && homeCss.includes('#8EC5FF'), 'home.css must style dark bridge card with #0B1220 and #8EC5FF');
});

// 3. Work Exhibition Frame, Blueprint Ledger, & Sticky Case Study
check('Stage 4: Flagship Exhibition Frame, Blueprint Ledger, Quick Digest Bar, & Sticky 2-Column Case Study', () => {
  const projectCard = read('src/components/work/ProjectCard.astro');
  const reservedCard = read('src/components/work/ReservedCard.astro');
  const workRenderers = read('src/scripts/work/renderers.js');
  const workSlug = read('src/pages/work/[slug].astro');
  const workCss = read('src/styles/work.css');

  assert.ok(projectCard.includes('project-card--flagship'), 'ProjectCard.astro must use .project-card--flagship');
  assert.ok(projectCard.includes('flagship-corner--tl'), 'ProjectCard.astro must include corner markers');
  assert.ok(projectCard.includes('flagship-summary-grid'), 'ProjectCard.astro must include 4-point executive summary');
  assert.ok(projectCard.includes('href="/lab"'), 'ProjectCard.astro must include direct CTA to /lab');
  assert.ok(workRenderers.includes('project-card--flagship'), 'work/renderers.js must match .project-card--flagship');

  assert.ok(reservedCard.includes('reserved-card--ledger'), 'ReservedCard.astro must use .reserved-card--ledger');
  assert.ok(reservedCard.includes('reserved-ledger-code'), 'ReservedCard.astro must display monospace ledger code');
  assert.ok(workRenderers.includes('reserved-card--ledger'), 'work/renderers.js must match .reserved-card--ledger');

  assert.ok(workSlug.includes('class="case-digest-bar"'), 'work/[slug].astro must include .case-digest-bar');
  assert.ok(workSlug.includes('class="case-study-columns"'), 'work/[slug].astro must use 2-column layout .case-study-columns');
  assert.ok(workSlug.includes('class="case-sticky-aside"'), 'work/[slug].astro must include .case-sticky-aside');
  assert.ok(workSlug.includes('class="case-reading-column"'), 'work/[slug].astro must include .case-reading-column');
  assert.ok(workCss.includes('.case-study-columns') && workCss.includes('position: sticky'), 'work.css must style sticky case study sidebar');
});

// 4. The Data Lab Air Aware Split Workbench, ISPU Threshold Bands, & Spatial Station Map
check('Stage 5: /lab Onboarding Strip, Segmented Pills, ISPU Threshold Bands Plugin, & Spatial Station Map', () => {
  const labPage = read('src/pages/lab/index.astro');
  const labControls = read('src/scripts/lab/ui/controls.js');
  const chartConfig = read('src/scripts/lab/charts/chart-config.js');
  const labCss = read('src/styles/lab.css');
  const regionsJson = JSON.parse(read('public/data/aqi/regions.json'));
  const validStationIds = new Set(regionsJson.regions[0].locations.map((l) => l.id));

  assert.ok(labPage.includes('class="lab-onboarding-strip"'), '/lab must include .lab-onboarding-strip');
  assert.ok(labPage.includes('data-lab-year-pills'), '/lab must include [data-lab-year-pills]');
  assert.ok(labPage.includes('data-lab-metric-pills'), '/lab must include [data-lab-metric-pills]');
  assert.ok(labPage.includes('class="lab-workbench-grid"'), '/lab must wrap chart and map in .lab-workbench-grid');
  assert.ok(labPage.includes('id="lab-station-map"'), '/lab must include #lab-station-map SVG');

  // Verify every station node on the map corresponds to a real locationId in regions.json
  const stationIds = [...labPage.matchAll(/data-station-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(stationIds.length >= 6, 'Station map must have at least 6 clickable station nodes');
  for (const id of stationIds) {
    assert.ok(validStationIds.has(id), `Station ID ${id} on #lab-station-map must exist in regions.json`);
  }

  assert.ok(labControls.includes('syncPills'), 'controls.js must synchronize pills and station map with native selects');
  assert.ok(chartConfig.includes('export const ispuThresholdBandsPlugin'), 'chart-config.js must export ispuThresholdBandsPlugin');
  assert.ok(chartConfig.includes('spanGaps: false'), 'chart-config.js must preserve spanGaps: false');
  assert.ok(labCss.includes('.lab-workbench-grid') && labCss.includes('#lab-station-map'), 'lab.css must style workbench grid and station map');
});

// 5. About 5-Act Human-First Narrative & 5-Domain Asymmetric Bento Grid
check('Stage 6: /about 5-Act Narrative, 5-Domain Asymmetric Bento Grid, & Preserved DOM Selectors', () => {
  const about = read('src/pages/about.astro');
  const aboutCss = read('src/styles/about.css');

  for (const actId of ['about-act-01', 'about-act-02', 'about-act-03', 'about-act-04', 'about-act-05']) {
    assert.ok(about.includes(`id="${actId}"`), `about.astro must include ${actId}`);
  }
  assert.ok(about.includes('01 / SIAPA SAYA'), 'Act 01 kicker must be present');
  assert.ok(about.includes('02 / MINAT &amp; BIDANG EKSPLORASI'), 'Act 02 kicker must be present');
  assert.ok(about.includes('03 / BAHASA &amp; TOOLS YANG DIPELAJARI'), 'Act 03 kicker must be present');
  assert.ok(about.includes('04 / PERJALANAN BELAJAR'), 'Act 04 kicker must be present');
  assert.ok(about.includes('05 / CARA SAYA BERPIKIR'), 'Act 05 kicker must be present');

  const bentoCount = (about.match(/class="interest-bento-card/g) || []).length;
  assert.equal(bentoCount, 5, 'about.astro must include 5 .interest-bento-card items');

  // Verify preserved IDs for client scripts
  for (const id of ['about-heading', 'about-lead', 'about-body', 'profile-image', 'curiosity', 'curiosity-nodes', 'curiosity-panel', 'software-list', 'skill-list', 'journey', 'journey-list', 'education-body', 'about-notes']) {
    assert.ok(about.includes(`id="${id}"`), `about.astro must preserve #${id} for client scripts`);
  }
  assert.ok(aboutCss.includes('.interest-bento-grid'), 'about.css must style .interest-bento-grid');
});

// 6. Data & Identity Reconciliation (2021-2025, Fryel23 & Fryel32, ARC-02..ARC-05, V15.0 Trunk & Branch)
check('Stage 1: Data & Identity Reconciliation across content, archive, connect, and README', () => {
  const aqiMd = read('src/content/work/aqi-cirebon.md');
  const contentJs = read('src/data/content.js');
  const githubJs = read('src/scripts/archive/github.js');
  const archiveIndex = read('src/pages/archive/index.astro');
  const connectPage = read('src/pages/connect.astro');
  const readme = read('README.md');

  assert.ok(aqiMd.includes('title: "Air Quality Index Trends · Cirebon (2021–2025)"'), 'aqi-cirebon.md title must state 2021–2025');
  assert.ok(contentJs.includes('Air Quality Index Trends · Cirebon (2021–2025)'), 'content.js must state 2021–2025');
  assert.ok(contentJs.includes('Fryel23') && contentJs.includes('Fryel32'), 'content.js must reconcile Fryel23 and Fryel32');
  assert.equal(contentJs.includes('Farrel_Portofolio'), false, 'content.js must not leak Farrel_Portofolio repo link');
  assert.ok(githubJs.includes('Fryel23'), 'github.js must reference Fryel23');
  assert.equal(githubJs.includes('Farrel_Portofolio'), false, 'github.js must not leak Farrel_Portofolio');
  for (const arcCode of ['ARC-02', 'ARC-03', 'ARC-04', 'ARC-05']) {
    assert.ok(archiveIndex.includes(arcCode), `archive/index.astro must include ${arcCode}`);
  }
  assert.ok(connectPage.includes('Fryel23') && connectPage.includes('Fryel32'), 'connect.astro must explain @Fryel23 and @Fryel32');
  assert.ok(readme.includes('V15.0-AETHELGRAD-OMEGA'), 'README.md must be updated to V15.0-AETHELGRAD-OMEGA');
});

// 7. Protected Systems Integrity & Zero Em-Dash Guard
check('Stage 0 & 7: Protected files untouched (SHA-256 verified) & Zero U+2014 em-dash in modified files', () => {
  const manifestLines = read('v14-work/snapshots/preflight-manifest.sha256').trim().split('\n');
  const preflightHashes = new Map();
  for (const line of manifestLines) {
    const [hash, rel] = line.trim().split(/\s+/);
    preflightHashes.set(rel, hash);
  }

  const protectedFiles = [
    'src/components/home/Curtain.astro',
    'src/styles/curtain.css',
    'src/scripts/home/curtain-controller.js',
    'src/components/home/HeroCanvas.astro',
    'src/styles/hero-webgl.css',
  ];
  for (const rel of protectedFiles) {
    const expected = preflightHashes.get(rel);
    if (expected) {
      assert.equal(sha256File(rel), expected, `Protected file ${rel} must not be modified`);
    }
  }

  const modifiedFiles = [
    'src/content/work/aqi-cirebon.md',
    'src/data/content.js',
    'src/scripts/global/identity.js',
    'src/scripts/archive/github.js',
    'src/pages/archive/index.astro',
    'src/pages/archive/play.astro',
    'src/pages/archive/credentials.astro',
    'src/pages/archive/off-screen.astro',
    'src/pages/connect.astro',
    'src/components/layout/Header.astro',
    'src/styles/global/header.css',
    'src/components/home/Hero.astro',
    'src/pages/index.astro',
    'src/styles/home.css',
    'src/components/work/ProjectCard.astro',
    'src/components/work/ReservedCard.astro',
    'src/pages/work/index.astro',
    'src/pages/work/[slug].astro',
    'src/scripts/work/renderers.js',
    'src/styles/work.css',
    'src/pages/lab/index.astro',
    'src/scripts/lab/ui/controls.js',
    'src/scripts/lab/charts/chart-config.js',
    'src/scripts/lab/charts/line-chart.js',
    'src/styles/lab.css',
    'src/pages/about.astro',
    'src/styles/about.css',
    'README.md',
  ];

  for (const rel of modifiedFiles) {
    const content = read(rel);
    assert.ok(!content.includes('\u2014'), `File ${rel} must not contain U+2014 (em-dash)`);
  }
});

console.log(`=== V14.0-UNIFIED SUITE COMPLETE: ${passed}/7 CHECKS PASSED ===`);
