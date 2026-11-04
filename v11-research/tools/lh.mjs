#!/usr/bin/env node
/**
 * V11.0 benchmark runner — flag identik riset V10.3/V10.4/V10.5 agar
 * angka sebanding lintas tahap (PERFORMANCE_BASELINE.md §5).
 * Usage: node lh.mjs <url> <label> <desktop|mobile|both> <runs>
 * Output: ../lighthouse/<label>-<config>-<n>.json
 */
import { execFileSync } from 'node:child_process';

const CHROME = '/home/z/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const LH = '/home/z/.npm-global/bin/lighthouse';

const url = process.argv[2] || 'http://localhost:4321/';
const label = process.argv[3] || 'v11';
const which = process.argv[4] || 'both';
const runs = Number(process.argv[5] || 3);

const DESKTOP = [
  '--only-categories=performance', '--form-factor=desktop',
  '--screenEmulation.disabled', '--throttling-method=provided',
  '--throttling.cpuSlowdownMultiplier=1',
  `--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=1440,900`,
];
const MOBILE = [
  '--only-categories=performance', '--form-factor=mobile',
  '--screenEmulation.mobile', '--screenEmulation.width=412', '--screenEmulation.height=823',
  '--screenEmulation.deviceScaleFactor=1.75', '--throttling-method=simulate',
  '--throttling.rttMs=150', '--throttling.throughputKbps=1638.4',
  '--throttling.requestLatencyMs=562.5', '--throttling.cpuSlowdownMultiplier=4',
  `--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage`,
];

const configs = which === 'desktop' ? ['desktop'] : which === 'mobile' ? ['mobile'] : ['desktop', 'mobile'];

for (const cfg of configs) {
  const flags = cfg === 'desktop' ? DESKTOP : MOBILE;
  for (let i = 1; i <= runs; i++) {
    const out = `../lighthouse/${label}-${cfg}-${i}.json`;
    console.log(`[lh] ${label} ${cfg} run ${i} -> ${out}`);
    execFileSync(LH, [...flags, '--output=json', `--output-path=${out}`, url], {
      env: { ...process.env, CHROME_PATH: CHROME },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
}
console.log('[lh] done');
