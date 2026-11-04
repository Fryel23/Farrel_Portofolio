/* Fair A/B LCP: alternate pristine (BASE=4599) vs refactored (NEW=4321),
 * 3 runs each, interleaved, same browser/viewport/cache conditions. */
import { chromium } from 'playwright';

const exe = '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome';
const BASE = 'http://localhost:4599';
const NEW = 'http://localhost:4321';

async function measure(browser, base, config) {
  const ctx = await browser.newContext(config);
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const m = await page.evaluate(() => new Promise((resolve) => {
    let lcp = 0, lcpEl = '';
    new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => { if (e.startTime > lcp) { lcp = e.startTime; lcpEl = (e.element && (e.element.id || e.element.tagName)) || ''; } });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint') globalThis.__fcp = e.startTime; });
    }).observe({ type: 'paint', buffered: true });
    setTimeout(() => resolve({ lcp, lcpEl, fcp: globalThis.__fcp || 0 }), 2600);
  }));
  await ctx.close();
  return m;
}

const desktopCfg = { viewport: { width: 1440, height: 900 } };
const mobileCfg = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ executablePath: exe });
const out = { desktop: { base: [], new: [] }, mobile: { base: [], new: [] }, lcpElements: new Set() };
for (const [name, cfg] of [['desktop', desktopCfg], ['mobile', mobileCfg]]) {
  for (let i = 0; i < 3; i++) {
    const b = await measure(browser, BASE, cfg); out[name].base.push(Math.round(b.lcp)); out.lcpElements.add(b.lcpEl);
    const n = await measure(browser, NEW, cfg); out[name].new.push(Math.round(n.lcp)); out.lcpElements.add(n.lcpEl);
  }
}
await browser.close();
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const name of ['desktop', 'mobile']) {
  console.log(name, '| pristine runs', JSON.stringify(out[name].base), 'median', median(out[name].base),
    '| refactored runs', JSON.stringify(out[name].new), 'median', median(out[name].new));
}
console.log('LCP elements seen:', [...out.lcpElements].join(', '));
