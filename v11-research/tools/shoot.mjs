// V11.0 baseline & verification screenshots + checks
// Usage: node shoot.mjs <outdir> [mode]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const CHROME = '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome';
const BASE = 'http://localhost:4321';
const outdir = process.argv[2] || '/home/z/my-project/portfolio-astro/v11-research/baseline';
mkdirSync(outdir, { recursive: true });

const configs = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, dpr: 2 },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const mode = process.argv[3] || 'baseline';

for (const cfg of configs) {
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.dpr || 1,
  });

  if (mode === 'baseline') {
    // Fresh page per timestamp so each shot captures a true t-offset state
    for (const t of [400, 1000, 2000, 3000, 4200, 5200, 6500]) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(BASE + '/', { waitUntil: 'commit' });
      await page.waitForTimeout(t);
      await page.screenshot({ path: `${outdir}/${cfg.name}-${t}ms.png` });
      if (errors.length) console.log(`${cfg.name}@${t}ms errors:`, errors.slice(0, 3));
      await page.close();
    }
  } else {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    let elapsed = 0;
    for (const t of [200, 600, 1200, 2000, 3200]) {
      await page.waitForTimeout(t - elapsed);
      elapsed = t;
      await page.screenshot({ path: `${outdir}/${cfg.name}-${t}ms.png` });
    }
    const state = await page.evaluate(() => ({
      curtainActive: !!document.querySelector('.v11-curtain.is-active'),
      heroTitleVisible: (() => { const el = document.getElementById('hero-title'); if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; })(),
      ctaClickable: (() => { const el = document.getElementById('hero-cta'); if (!el) return null; const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit ? (el === hit || el.contains(hit) || hit.contains(el)) : false; })(),
    }));
    console.log(cfg.name, JSON.stringify(state));
    if (errors.length) console.log(`${cfg.name} console errors:`, errors.slice(0, 5));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log('DONE', mode);
