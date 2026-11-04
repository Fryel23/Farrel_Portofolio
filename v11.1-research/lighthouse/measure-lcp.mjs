/* V11.1 LCP/FCP measurement via PerformanceObserver (3 run per config). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const runs = 3;

async function measure(config, label) {
  const browser = await chromium.launch({ executablePath: '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome' });
  const lcpArr = [], fcpArr = [], clsArr = [];
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext(config);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => new Promise((resolve) => {
      let lcp = 0, lcpEl = '';
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((e) => { if (e.startTime > lcp) { lcp = e.startTime; lcpEl = (e.element && (e.element.id || e.element.tagName)) || ''; } });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint') globalThis.__fcp = e.startTime; });
      }).observe({ type: 'paint', buffered: true });
      setTimeout(() => {
        // CLS
        let cls = 0;
        new PerformanceObserver((l2) => { l2.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve({ lcp, lcpEl, fcp: globalThis.__fcp || 0, cls }), 400);
      }, 2600);
    })).then((m) => { lcpArr.push(m.lcp); fcpArr.push(m.fcp); clsArr.push(m.cls); globalThis.__lastLcpEl = m.lcpEl; });
    await ctx.close();
  }
  await browser.close();
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const res = {
    label,
    lcpRuns: lcpArr.map((v) => Math.round(v)),
    lcpMedian: Math.round(median(lcpArr)),
    fcpRuns: fcpArr.map((v) => Math.round(v)),
    fcpMedian: Math.round(median(fcpArr)),
    clsRuns: clsArr.map((v) => Number(v.toFixed(4))),
    clsMedian: Number(median(clsArr).toFixed(4)),
    lcpElement: globalThis.__lastLcpEl || '',
  };
  console.log(JSON.stringify(res));
  return res;
}

const desktop = await measure({ viewport: { width: 1440, height: 900 } }, 'desktop-1440');
const mobile = await measure({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'mobile-390');
import fs from 'node:fs';
fs.writeFileSync('/home/z/my-project/v11-work/portfolio-astro/v11.1-research/lighthouse/lcp-results.json',
  JSON.stringify({ desktop, mobile, note: 'Playwright PerformanceObserver, local preview (no network throttling), 3 runs each; V11.0 baseline figures were Lighthouse lab runs - not directly comparable, absolute targets only.' }, null, 2));
console.log('saved');
