/* Gate 6 cascade verification: compare computed styles of key components
 * between pristine baseline (SMOKE_BASE, default :4599) and refactored
 * build (SMOKE_NEW, default :4321). Same method per spec §15.4. */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:4599';
const NEW = process.env.SMOKE_NEW || 'http://localhost:4321';
const exe = '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome';

const routes = [
  ['/', ['.hero', '.hero-title', '#hero-subtitle', '.profile-card, .pixel-card', '.display-heading', '#progress-bar', '.site-header', '.hero-sticker']],
  ['/work', ['.project-card', '.filter-button', '.gallery-ruler', '.project-cover']],
  ['/about', ['.about-lead', '.journey-item', '.software-chip', '.curiosity-node']],
  ['/archive', ['.github-card', '.github-pulse']],
  ['/archive/play', ['.game-card', '.deck-console', '.stat-bar']],
  ['/archive/credentials', ['.credential-slot', '.credential-requirements', '.vault-frame']],
  ['/archive/off-screen', ['.hobby-chip', '.pixel-stage', '#pixel-pet-art', '.companion-inner']],
  ['/connect', ['.social-card', '.contact-card', '#closing-name']],
];

const browser = await chromium.launch({ executablePath: exe });
const props = ['display', 'position', 'font-size', 'font-family', 'color', 'background-color', 'letter-spacing', 'line-height', 'margin-top', 'padding-left', 'grid-template-columns', 'border-radius', 'opacity', 'z-index', 'transform', 'clip-path', 'width', 'height', 'text-transform'];

let mismatches = 0, checked = 0;
for (const [path, selectors] of routes) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const results = [];
    for (const base of [BASE, NEW]) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(2200);
      const styles = await page.evaluate(({ selectors, props }) => {
        const out = [];
        for (const sel of selectors) {
          const node = document.querySelector(sel);
          if (!node) { out.push({ sel, missing: true }); continue; }
          const cs = getComputedStyle(node);
          const rec = { sel };
          for (const p of props) rec[p] = cs.getPropertyValue(p);
          out.push(rec);
        }
        return out;
      }, { selectors, props });
      results.push(styles);
      await ctx.close();
    }
    for (let i = 0; i < selectors.length; i++) {
      const a = results[0][i], b = results[1][i];
      checked++;
      if (a.missing || b.missing) {
        if (a.missing !== b.missing) { mismatches++; console.log('MISMATCH presence', path, selectors[i], a.missing, b.missing); }
        continue;
      }
      const diffs = props.filter((p) => a[p] !== b[p]);
      if (diffs.length) {
        mismatches++;
        console.log('MISMATCH', path, vp.width, selectors[i], JSON.stringify(diffs.map((d) => [d, a[d], b[d]])));
      }
    }
  }
}
await browser.close();
console.log(`== COMPUTED STYLE PARITY: ${checked - mismatches}/${checked} identical ==`);
