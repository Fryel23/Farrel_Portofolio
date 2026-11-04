/* Baseline/after screenshots for visual regression comparison. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const OUT = 'v11.1-research/modularization';
const routes = [
  ['home', '/'],
  ['work', '/work'],
  ['about', '/about'],
  ['archive', '/archive'],
  ['archive-play', '/archive/play'],
  ['archive-credentials', '/archive/credentials'],
  ['archive-off-screen', '/archive/off-screen'],
  ['connect', '/connect'],
];

const browser = await chromium.launch({ executablePath: '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome' });
const label = process.argv[2] || 'baseline';
for (const [name, path] of routes) {
  // Desktop
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${label}-${name}-1440.png` });
  await ctx.close();
  // Mobile
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${label}-${name}-390.png` });
  await ctx.close();
}
await browser.close();
console.log('screenshots saved with label:', label);
