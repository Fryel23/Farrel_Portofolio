// HIR-CTA protokol M3-style: sesi terpisah per titik waktu t (ms sejak
// commit). Pada t: klik sekali (timeout 3000). CTA ready = navigasi /work.
// HIR = titik t pertama yang berhasil. Plus HIR search fokus/typing/scroll.
import { chromium } from 'playwright';
const CHROME = '/home/z/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome';
const base = process.argv[2] || 'http://localhost:4321/';
const label = process.argv[3] || 'v11';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function ctaAt(ctx, delayMs) {
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'commit' });
  await page.waitForTimeout(delayMs);
  let ok = false;
  try {
    await page.click('#hero-cta', { timeout: 3000 });
    try { await page.waitForURL('**/work', { timeout: 3000 }); ok = true; } catch (e) {}
  } catch (e) {}
  await page.close();
  return ok;
}

async function measure(cfg) {
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: cfg.dpr || 1 });
  let ctaHir = -1;
  for (const t of [100, 200, 300, 400, 500, 700, 900, 1200, 1600, 2000]) {
    if (await ctaAt(ctx, t)) { ctaHir = t; break; }
  }
  // Search focus + typing pada satu sesi (elemen muncul bersamaan)
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'commit' });
  const focusTyping = await p.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const input = () => document.getElementById('search-input');
    const tick = () => {
      const el = input();
      if (el) {
        el.focus();
        if (document.activeElement === el) {
          el.value = 'z';
          if (el.value === 'z') { resolve({ focus: Math.round(performance.now()), typing: Math.round(performance.now()) }); return; }
        }
      }
      if (performance.now() - t0 > 6000) { resolve({ focus: -1, typing: -1 }); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await p.close();
  // Scroll
  const p2 = await ctx.newPage();
  await p2.goto(base, { waitUntil: 'commit' });
  const scroll = await p2.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      window.scrollTo(0, 200);
      if (window.scrollY > 50) { resolve(Math.round(performance.now())); return; }
      if (performance.now() - t0 > 6000) { resolve(-1); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await p2.close();
  await ctx.close();
  return { ctaClick: ctaHir, searchFocus: focusTyping.focus, searchTyping: focusTyping.typing, scroll };
}

const desktop = await measure({ w: 1440, h: 900 });
const mobile = await measure({ w: 390, h: 844, dpr: 2 });
console.log(JSON.stringify({ label, desktop, mobile }));
await browser.close();
