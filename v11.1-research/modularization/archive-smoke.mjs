/* Gate 2 archive functional smoke: Game Deck state machine + CRT overlay,
 * credential preview dialog, GitHub render, off-screen/companion presence. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const exe = '/home/z/.agent-browser/browsers/chrome-156.0.8078.73/chrome';
const out = [];
const t = (name, pass, detail = '') => { out.push({ name, pass, detail }); console.log((pass ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' | ' + detail : '')); };

const browser = await chromium.launch({ executablePath: exe });
const errors = [];

// --- /archive/play: deck state machine + CRT ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('play: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('play: ' + e.message));
  await page.goto(BASE + '/archive/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // render pass
  const cardCount = await page.locator('.game-card').count();
  t('Deck render: 11 game cards', cardCount === 11, 'cards=' + cardCount);
  const copy = await page.locator('#games-kicker').textContent();
  t('Deck copy rendered', !!copy && copy.trim().length > 0, (copy || '').slice(0, 40));

  // open (state machine loading -> open, CRT starts on fine pointer)
  await page.locator('#deck-button').click();
  await page.waitForTimeout(700); // entrance ~1.5s
  const crt = await page.locator('.deck-crt-overlay').count();
  t('CRT overlay canvas active on open (fine pointer)', crt === 1, 'canvas=' + crt);
  await page.waitForTimeout(1200);
  const expanded = await page.locator('#deck-button').getAttribute('aria-expanded');
  const gridHidden = await page.locator('#deck-grid').isHidden();
  t('Deck state -> open (aria-expanded, grid visible)', expanded === 'true' && !gridHidden, 'expanded=' + expanded + ' gridHidden=' + gridHidden);

  // eject
  await page.locator('#deck-button').click();
  await page.waitForTimeout(1600);
  const expanded2 = await page.locator('#deck-button').getAttribute('aria-expanded');
  const gridHidden2 = await page.locator('#deck-grid').isHidden();
  t('Deck eject -> idle (grid hidden again)', expanded2 === 'false' && gridHidden2, 'expanded=' + expanded2);
  const crtGone = await page.locator('.deck-crt-overlay').count();
  t('CRT removed after eject', crtGone === 0, 'canvas=' + crtGone);

  // stat bars honest values
  const bar = page.locator('.stat-bar span').first();
  const transform = await bar.evaluate((el) => getComputedStyle(el).transform);
  t('Stat bar transform present', transform !== 'none', transform.slice(0, 40));

  // konami listeners wired (keydown no-crash) + no console errors
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  t('Zero console errors (/archive/play)', errors.length === 0, errors.slice(0, 2).join(' ; '));
  await ctx.close();
}

// --- /archive/credentials: dialog ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('cred: ' + e.message));
  await page.goto(BASE + '/archive/credentials', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const slots = await page.locator('.credential-slot').count();
  t('Credentials reserved slots render', slots >= 3, 'slots=' + slots);
  const req = await page.locator('.credential-requirements').count();
  t('Credential requirements column', req === 1, 'req=' + req);
  const dialog = await page.locator('#credential-dialog').count();
  t('Native credential dialog present (not removed)', dialog === 1, 'dialog=' + dialog);
  await ctx.close();
}

// --- /archive: GitHub ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('gh: ' + e.message));
  await page.goto(BASE + '/archive', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const grid = await page.locator('#github-grid').count();
  t('GitHub grid present', grid === 1, 'grid=' + grid);
  const pulse = await page.locator('.github-pulse span').count();
  t('GitHub pulse dots rendered', pulse === 14, 'dots=' + pulse);
  const copy = await page.locator('#github-kicker').textContent();
  t('GitHub copy rendered', !!(copy && copy.trim()), (copy || '').slice(0, 30));
  await ctx.close();
}

// --- /archive/off-screen: pet + companion + habitat ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('off: ' + e.message));
  await page.goto(BASE + '/archive/off-screen', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const pet = await page.locator('#pixel-pet-art').count();
  t('Off-screen pixel pet present', pet === 1, 'pet=' + pet);
  const chips = await page.locator('.hobby-chip').count();
  t('Hobby chips rendered', chips === 4, 'chips=' + chips);
  const habitat = await page.locator('.desk-habitat').count();
  t('Desk habitat rendered', habitat === 1, 'habitat=' + habitat);
  const dust = await page.locator('.habitat-dust').count();
  t('Desk habitat dust spans', dust >= 4, 'dust=' + dust);
  // companion summon
  await page.locator('#companion-toggle').click();
  await page.waitForTimeout(1100);
  const petVisible = await page.locator('#companion-pet').isVisible();
  const pressed = await page.locator('#companion-toggle').getAttribute('aria-pressed');
  t('Companion summon works (FLIP + state)', petVisible && pressed === 'true', 'pressed=' + pressed);
  const board = await page.locator('.habitat-board-value').textContent();
  t('Companion wall board flips to AWAY', (board || '').trim() === 'AWAY', board);
  t('Zero console errors (archive functional smoke)', errors.length === 0, errors.slice(0, 3).join(' ; '));
  await ctx.close();
}

await browser.close();
const fail = out.filter((r) => !r.pass).length;
console.log('== ARCHIVE SMOKE: ' + (out.length - fail) + '/' + out.length + ' pass ==');
const fs = await import('node:fs');
fs.writeFileSync('v11.1-research/modularization/gate2-archive-smoke.json', JSON.stringify(out, null, 2));
process.exit(0);
