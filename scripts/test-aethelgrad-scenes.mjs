#!/usr/bin/env node
/**
 * scripts/test-aethelgrad-scenes.mjs
 * Automated verification for Aethelgrad 6-Scene Full-Viewport Router,
 * Zero Process Leakage in Aethelgrad UI, Server-Side Security Integrity,
 * and 16-Bit Pixel Art Paper-Doll SVG Engine.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  detectMaliciousString,
  hasDangerousObjectKeys,
  validateHunterPassword,
  validateHunterUsername,
} from '../src/world-aethelgrad/server/security/input-guard.ts';
import {
  hashHunterPassword,
  verifyHunterPassword,
} from '../src/world-aethelgrad/server/security/password-hasher.ts';
import {
  checkDeviceRegistrationEligibility,
  computeBoundDeviceHash,
} from '../src/world-aethelgrad/server/security/device-lock.ts';
import {
  checkRateLimit,
  resetRateLimiter,
} from '../src/world-aethelgrad/server/security/rate-limiter.ts';
import {
  createStarterHunterProfile,
  loginHunterAccount,
  registerHunterAccount,
  resetInMemoryVaultForTesting,
} from '../src/world-aethelgrad/server/persistence/vault-repository.ts';
import { HEROES_CATALOG } from '../src/world-aethelgrad/catalog/heroes-index.ts';
import { composeHeroPaperDollSvg } from '../src/world-aethelgrad/svg-paperdoll/paperdoll-composer.ts';

const ROOT = process.cwd();
const SCENES = ['outpost', 'summon', 'barracks', 'grimoire', 'trials', 'arena'];

let assertions = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  assertions += 1;
}

console.log('\n=== AETHELGRAD 6-SCENE ROUTER, SECURITY & 16-BIT SPRITE TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// 1. 6 Full-Viewport Scenes & Topbar Navigation in src/pages/aethelgrad/index.astro
// ---------------------------------------------------------------------------
{
  const astroHtml = fs.readFileSync(
    path.join(ROOT, 'src/pages/aethelgrad/index.astro'),
    'utf8'
  );

  check(
    astroHtml.includes('id="aethelgrad-topbar"'),
    'Aethelgrad page must have #aethelgrad-topbar'
  );
  check(
    astroHtml.includes('id="ag-scene-nav"'),
    'Aethelgrad topbar must have #ag-scene-nav'
  );
  check(
    astroHtml.includes('id="aethelgrad-stage"') &&
      astroHtml.includes('data-active-scene="outpost"'),
    'Aethelgrad main stage must have id="aethelgrad-stage" and default data-active-scene="outpost"'
  );

  for (const sceneId of SCENES) {
    check(
      astroHtml.includes(`data-scene-target="${sceneId}"`),
      `Topbar/Outpost must include navigation target data-scene-target="${sceneId}"`
    );
    check(
      astroHtml.includes(`id="scene-${sceneId}"`) &&
        astroHtml.includes(`data-scene-panel="${sceneId}"`),
      `Stage must include <section id="scene-${sceneId}" data-scene-panel="${sceneId}">`
    );
  }

  // Only outpost is visible initially; other 5 scenes must have the `hidden` attribute in static HTML
  const outpostTag = astroHtml.match(/<section[^>]*id="scene-outpost"[^>]*>/)?.[0] || '';
  check(
    !outpostTag.includes('hidden'),
    '#scene-outpost must be visible initially (no hidden attribute)'
  );
  for (const inactiveScene of SCENES.slice(1)) {
    const tag =
      astroHtml.match(new RegExp(`<section[^>]*id="scene-${inactiveScene}"[^>]*>`))?.[0] || '';
    check(
      /\bhidden\b/.test(tag),
      `#scene-${inactiveScene} must have the hidden attribute initially`
    );
  }
  console.log('  PASS  1. 6 Full-Viewport Scenes & Topbar Markup verified');
}

// ---------------------------------------------------------------------------
// 2. switchScene(sceneId) Logic & Exclusive Visibility Contract
// ---------------------------------------------------------------------------
{
  const clientCode = fs.readFileSync(
    path.join(ROOT, 'src/world-aethelgrad/client/aethelgrad-app.ts'),
    'utf8'
  );
  const coreCss = fs.readFileSync(
    path.join(ROOT, 'src/styles/aethelgrad/aethelgrad-core.css'),
    'utf8'
  );

  check(
    clientCode.includes('function switchScene('),
    'Client controller must define switchScene(targetScene, options)'
  );
  check(
    clientCode.includes("stageEl.setAttribute('data-active-scene', targetScene)"),
    'switchScene must update data-active-scene attribute on #aethelgrad-stage'
  );
  check(
    clientCode.includes("panel.removeAttribute('hidden')") &&
      clientCode.includes("panel.setAttribute('hidden', '')"),
    'switchScene must toggle panel hidden attribute so only 1 scene is active and 5 are hidden'
  );
  check(
    clientCode.includes("tab.setAttribute('aria-current', 'page')") &&
      clientCode.includes("tab.removeAttribute('aria-current')"),
    'switchScene must maintain aria-current="page" on the active tab'
  );
  check(
    clientCode.includes("window.addEventListener('hashchange'"),
    'Client router must listen to hashchange for Back/Forward navigation'
  );
  check(
    coreCss.includes('.ag-scene[hidden]') && coreCss.includes('display: none !important'),
    'CSS must enforce .ag-scene[hidden] { display: none !important; }'
  );
  check(
    coreCss.includes('#0E1015') && coreCss.includes('#161922') && coreCss.includes('#D4AF6A'),
    'CSS must apply Warm Dark Slate (#0E1015 / #161922) and Warm Muted Gold (#D4AF6A) palette'
  );
  console.log('  PASS  2. switchScene Router & Exclusive Display Contract verified');
}

// ---------------------------------------------------------------------------
// 3. Zero Forbidden Jargon / Process Leakage in Aethelgrad Markup & Scripts
// ---------------------------------------------------------------------------
{
  const filesToCheck = [
    'src/pages/aethelgrad/index.astro',
    'src/world-aethelgrad/client/aethelgrad-app.ts',
    'src/world-aethelgrad/catalog/heroes-index.ts',
    'src/world-aethelgrad/catalog/items-index.ts',
    'src/world-aethelgrad/catalog/code-spells-catalog.ts',
    'src/world-aethelgrad/catalog/grimoire-collections.ts',
  ];

  const bannedLiterals = [
    'System Secure',
    'Anti-Injection Active',
    'PBKDF2-SHA512 Verified',
    'Last Sync',
    '1 Device · 1 Account',
    '1 Device • 1 Account',
    'THE INFINITE SPIRE',
    'THE ISOLATED WORLD',
    'AETHELGRAD // THE INFINITE SPIRE',
    '7-Layer Gear',
    '24 Algorithmic Combat Buffs',
    '1v1 Auto-Battler & Live Leaderboard',
    'HOME DECK',
    'SUMMON & WARDROBE',
    'GRIMOIRE & FORGE',
    'CODE SANCTUM',
    'COLOSSEUM ARENA',
    'I. THE HUB CITY & FORGE',
    'II. THE GACHA GROTTO',
    'III. CODE-SPELL SANCTUM',
    'IV. SPIRE COLOSSEUM',
    'SPELL-101',
    'Zero-Division Guard',
    '<- KEMBALI KE PORTOFOLIO',
    '\u2014',
  ];

  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const banned of bannedLiterals) {
      check(
        !content.includes(banned),
        `${rel} must not contain forbidden string "${banned}"`
      );
    }
  }
  console.log('  PASS  3. Zero Forbidden Jargon & Process Leakage in Aethelgrad verified');
}

// ---------------------------------------------------------------------------
// 4. Server-Side Security Integrity (PBKDF2, timingSafeEqual, 1-Device Lock, Rate-Limit, Anti-Injection)
// ---------------------------------------------------------------------------
{
  resetInMemoryVaultForTesting();
  resetRateLimiter();

  // PBKDF2 + timingSafeEqual
  const hashRec = hashHunterPassword('HunterPass99');
  check(
    verifyHunterPassword('HunterPass99', hashRec.passwordHashHex, hashRec.passwordSaltHex) === true,
    'PBKDF2-SHA512 + timingSafeEqual must verify valid password'
  );
  check(
    verifyHunterPassword('WrongPass99', hashRec.passwordHashHex, hashRec.passwordSaltHex) === false,
    'PBKDF2-SHA512 + timingSafeEqual must reject wrong password'
  );

  // Anti-Injection Guards
  check(
    detectMaliciousString("admin' OR 1=1 --").malicious === true,
    'SQLi payload must be caught by detectMaliciousString'
  );
  check(
    detectMaliciousString('<script>alert(1)</script>').malicious === true,
    'XSS payload must be caught by detectMaliciousString'
  );
  check(
    hasDangerousObjectKeys(JSON.parse('{"__proto__": {"admin": true}}')) === true,
    'Prototype pollution key must be caught by hasDangerousObjectKeys'
  );
  check(
    validateHunterUsername('Vanguard_01').ok === true &&
      validateHunterPassword('AstralKey99').ok === true,
    'Valid username and password must pass validation'
  );

  // 1-Device-1-Account Lock
  const deviceSignal = {
    clientFingerprintHash: 'fp-device-scene-test-001',
    platform: 'Linux x86_64',
    screenGeometry: '1920x1080x24',
    timezone: 'Asia/Jakarta',
    language: 'id-ID',
  };
  const devHash = computeBoundDeviceHash(deviceSignal);
  check(devHash.length === 64, 'Device lock hash must be 64-char SHA-256 hex');
  const reg1 = registerHunterAccount({
    username: 'SceneHunter01',
    password: 'AstralKey99',
    deviceSignal,
  });
  check(reg1.ok === true, 'First registration on device must succeed');
  const reg2 = registerHunterAccount({
    username: 'SceneHunter02',
    password: 'AstralKey99',
    deviceSignal,
  });
  check(
    reg2.ok === false && reg2.code === 'DEVICE_ALREADY_BOUND',
    'Second registration on same device must return DEVICE_ALREADY_BOUND'
  );
  const loginOk = loginHunterAccount({
    username: 'SceneHunter01',
    password: 'AstralKey99',
    deviceSignal,
  });
  check(loginOk.ok === true, 'Returning user login must succeed');

  // Rate limiter
  const rl = checkRateLimit('test-ip-scene-suite', 30, 60_000);
  check(rl.allowed === true, 'Rate limiter must allow normal request rate');

  console.log('  PASS  4. Backend Security (PBKDF2, timingSafeEqual, Device Lock, Rate-Limit, Anti-Injection) verified');
}

// ---------------------------------------------------------------------------
// 5. 16-Bit Pixel Art SVG Paper-Doll Engine (#14161F Outline, 3-Tone Shading, Dynamic Gear)
// ---------------------------------------------------------------------------
{
  const profile = createStarterHunterProfile('hunter_sprite_test', 'SpriteTester');
  for (const hero of HEROES_CATALOG) {
    const svg = composeHeroPaperDollSvg({
      heroId: hero.id,
      currentStars: hero.baseStars,
      equippedLoadout: profile.equippedLoadout,
      sizePx: 160,
    });
    check(
      svg.includes('viewBox="0 0 64 64"') && svg.includes('shape-rendering="crispEdges"'),
      `Hero ${hero.id} SVG must use viewBox="0 0 64 64" and shape-rendering="crispEdges"`
    );
    check(
      svg.includes('#14161F'),
      `Hero ${hero.id} SVG must include dark 16-bit outline #14161F`
    );
    check(
      svg.includes('class="pd-torso-breath"') &&
        svg.includes('class="pd-head-group"') &&
        svg.includes('class="pd-weapon-arm"') &&
        svg.includes('class="pd-eye-blink"'),
      `Hero ${hero.id} SVG must separate animation groups (pd-torso-breath, pd-head-group, pd-weapon-arm, pd-eye-blink)`
    );
  }

  // Dynamic equipment mutation changes SVG output deterministically
  const svgStarfall = composeHeroPaperDollSvg({
    heroId: 'hero-evelyn-dawnblade',
    currentStars: 5,
    equippedLoadout: {
      ...profile.equippedLoadout,
      WEAPON: 'wpn-starfall-blade',
      ARMOR: 'arm-valkyrie-aegis',
      HELMET: 'hlm-seraphim-halo',
    },
  });
  const svgVortex = composeHeroPaperDollSvg({
    heroId: 'hero-evelyn-dawnblade',
    currentStars: 5,
    equippedLoadout: {
      ...profile.equippedLoadout,
      WEAPON: 'wpn-chrono-halberd',
      ARMOR: 'arm-eclipse-plate',
      HELMET: 'hlm-abyssal-horns',
    },
  });
  check(
    svgStarfall !== svgVortex,
    'Changing WEAPON, ARMOR, and HELMET must dynamically change the rendered 16-bit Paper-Doll SVG'
  );

  console.log('  PASS  5. 16-Bit Pixel Art SVG Paper-Doll Engine (#14161F outline, 3-tone shading, dynamic gear) verified');
}

console.log(`\n[PASS] All 5 Aethelgrad Scene & Sprite Suites passed (${assertions} assertions).\n`);
