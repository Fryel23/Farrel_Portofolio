// V11.0 HIR + First-Readable Hero (input CDP nyata, polling rAF).
// Usage: node hir.mjs <base-url> <label>
import { chromium } from 'playwright';
const CHROME = '/home/z/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const base = process.argv[2] || 'http://localhost:4321/';
const label = process.argv[3] || 'v11';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function measure(cfg) {
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: cfg.dpr || 1 });
  const page = await ctx.newPage();
  const navStart = Date.now();
  await page.goto(base, { waitUntil: 'commit' });
  // First-readable: headline terlihat, tidak tertutup, karakter tampil
  const firstReadable = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const check = () => {
      const el = document.getElementById('hero-title');
      if (el) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const hit = document.elementFromPoint(r.left + r.width * 0.3, r.top + r.height / 2);
        const uncovered = !!hit && (hit === el || el.contains(hit));
        if (r.width > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && uncovered && el.textContent.includes('Curiosity')) {
          resolve(Math.round(performance.now())); return;
        }
      }
      if (performance.now() - t0 > 9000) { resolve(-1); return; }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }));
  // HIR: CTA click nyata (navigasi) - sesi terpisah per aksi
  const hir = {};
  // CTA click
  {
    const p2 = await ctx.newPage();
    const t0 = Date.now();
    await p2.goto(base, { waitUntil: 'commit' });
    let ok = false;
    for (let i = 0; i < 80 && !ok; i++) {
      try { await p2.click('#hero-cta', { timeout: 60, force: false }); ok = true; } catch (e) { await p2.waitForTimeout(45); }
    }
    let nav = false;
    try { await p2.waitForURL('**/work', { timeout: 2500 }); nav = true; } catch (e) {}
    hir.ctaClick = nav ? Date.now() - t0 : -1;
    await p2.close();
  }
  // Search focus + typing
  {
    const p3 = await ctx.newPage();
    const t0 = Date.now();
    await p3.goto(base, { waitUntil: 'commit' });
    let focused = false;
    for (let i = 0; i < 80 && !focused; i++) {
      try { await p3.focus('#search-input', { timeout: 60 }); focused = true; } catch (e) { await p3.waitForTimeout(45); }
    }
    hir.searchFocus = focused ? Date.now() - t0 : -1;
    if (focused) {
      await p3.keyboard.type('x', { delay: 10 });
      hir.searchTyping = (await p3.evaluate(() => document.getElementById('search-input').value)) === 'x' ? Date.now() - t0 : -1;
    }
    await p3.close();
  }
  // Scroll
  {
    const p4 = await ctx.newPage();
    const t0 = Date.now();
    await p4.goto(base, { waitUntil: 'commit' });
    let scrolled = false;
    for (let i = 0; i < 60 && !scrolled; i++) {
      await p4.mouse.wheel(0, 400).catch(() => {});
      await p4.waitForTimeout(60);
      scrolled = await p4.evaluate(() => window.scrollY > 50);
    }
    hir.scroll = scrolled ? Date.now() - t0 : -1;
    await p4.close();
  }
  await ctx.close();
  return { firstReadable, ...hir };
}

const desktop = await measure({ w: 1440, h: 900 });
const mobile = await measure({ w: 390, h: 844, dpr: 2 });
const result = { label, desktop, mobile };
console.log(JSON.stringify(result));
await browser.close();
