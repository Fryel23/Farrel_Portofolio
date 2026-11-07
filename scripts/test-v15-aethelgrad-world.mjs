#!/usr/bin/env node
/**
 * scripts/test-v15-aethelgrad-world.mjs
 * Comprehensive automated test suite (95+ assertions) for V15.0-AETHELGRAD-OMEGA:
 * - Suite 1: Surface Portfolio Purification, Zero Meta-Doc Leak, & The Data Atlas Crypt
 * - Suite 2: Backend Security, Anti-Injection, PBKDF2-SHA512, 1-Device-1-Account Lock, & Returning User Login Gate
 * - Suite 3: 7-Layer Pixel SVG Paper-Doll Engine, 24 Original Heroes, & 50 Equipment Items
 * - Suite 4: Gacha Soft/Hard Pity, 12 Guardian Grimoire Bonds, & Pick Me Up! Synthesis Forge (★1 -> ★5)
 * - Suite 5: The Code-Spell Sanctum (24 Spells) & Spire Colosseum 1v1 Auto-Battler
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ATLAS_CLUSTERS,
  ATLAS_EDGES,
  ATLAS_NODES,
} from '../src/scripts/atlas/knowledge-nodes-data.ts';
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
  findAccountByDeviceHash,
} from '../src/world-aethelgrad/server/security/device-lock.ts';
import {
  signHunterSessionToken,
  verifyHunterSessionToken,
} from '../src/world-aethelgrad/server/security/session-hmac.ts';
import {
  buildColosseumLeaderboard,
  createStarterHunterProfile,
  loginHunterAccount,
  registerHunterAccount,
  resetInMemoryVaultForTesting,
  resolveAuthGateStatus,
} from '../src/world-aethelgrad/server/persistence/vault-repository.ts';
import {
  getHeroById,
  getHeroesByBaseStars,
  HEROES_CATALOG,
} from '../src/world-aethelgrad/catalog/heroes-index.ts';
import {
  getEquipmentById,
  getEquipmentBySlot,
  ITEMS_CATALOG,
} from '../src/world-aethelgrad/catalog/items-index.ts';
import { GRIMOIRE_COLLECTIONS } from '../src/world-aethelgrad/catalog/grimoire-collections.ts';
import {
  CODE_SPELLS_CATALOG,
  getCodeSpellById,
  getCodeSpellsByTier,
} from '../src/world-aethelgrad/catalog/code-spells-catalog.ts';
import { composeHeroPaperDollSvg } from '../src/world-aethelgrad/svg-paperdoll/paperdoll-composer.ts';
import { executeGachaSummon } from '../src/world-aethelgrad/server/engines/gacha-rng-engine.ts';
import { executeForgeUpgrade } from '../src/world-aethelgrad/server/engines/forge-synthesis-engine.ts';
import { verifyAndApplyCodeSpell } from '../src/world-aethelgrad/server/engines/code-spell-verifier.ts';
import { simulateColosseumDuel } from '../src/world-aethelgrad/server/engines/colosseum-battle-simulator.ts';
import { calculateHunterCombatStats } from '../src/world-aethelgrad/server/engines/combat-power-calculator.ts';
import { SEED_TOWER_GUARDIANS } from '../src/world-aethelgrad/server/persistence/seed-guardians.ts';

const ROOT = process.cwd();

let assertionsCount = 0;
let passedSuites = 0;
let failedSuites = 0;

function check(val, message) {
  assert.ok(val, message);
  assertionsCount += 1;
}

function checkEqual(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertionsCount += 1;
}

function runSuite(title, fn) {
  try {
    fn();
    passedSuites += 1;
    console.log(`  PASS  ${title}`);
  } catch (err) {
    failedSuites += 1;
    console.error(`  FAIL  ${title}`);
    console.error(`        ${err.message}`);
  }
}

console.log('\n=== V15.0-AETHELGRAD-OMEGA MASTER TEST SUITE ===\n');

// ============================================================================
// SUITE 1: Isolation, Surface Purification, & The Data Atlas Crypt Contract
// ============================================================================
runSuite(
  'Suite 1: Surface Portfolio Purification, Zero Meta-Doc Leak, & The Data Atlas Crypt (36 Nodes / 52 Synapses)',
  () => {
    const surfaceFiles = [
      'src/components/layout/Header.astro',
      'src/components/layout/Footer.astro',
      'src/components/home/Hero.astro',
      'src/pages/index.astro',
      'src/pages/work/[slug].astro',
      'src/pages/archive/index.astro',
      'src/pages/connect.astro',
      'src/data/content.js',
      'src/scripts/archive/github.js',
    ];

    for (const rel of surfaceFiles) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      check(!content.includes('/archive/adr'), `${rel} must not contain /archive/adr`);
      check(!content.includes('href="/codex"'), `${rel} must not link to /codex`);
      check(!content.includes('Farrel_Portofolio'), `${rel} must not leak Farrel_Portofolio repo URL`);
      check(!content.includes('\u2014'), `${rel} must not contain U+2014 em-dash`);
    }

    // Deleted public ADR & Codex route pages
    checkEqual(
      fs.existsSync(path.join(ROOT, 'src/pages/archive/adr/index.astro')),
      false,
      'Public route src/pages/archive/adr/index.astro must be deleted'
    );
    checkEqual(
      fs.existsSync(path.join(ROOT, 'src/pages/codex/index.astro')),
      false,
      'Public route src/pages/codex/index.astro must be deleted'
    );

    // Header 4-item primary nav + 2-column Mega-Drawer + Portal Dive Button
    const header = fs.readFileSync(path.join(ROOT, 'src/components/layout/Header.astro'), 'utf8');
    check(header.includes('EKSPLORASI INTERAKTIF &amp; ARSIP PERSONAL'), 'Header Column 1 heading');
    check(header.includes('PETA PENGETAHUAN &amp; GERBANG DUNIA VIRTUAL'), 'Header Column 2 heading');
    check(header.includes('id="header-portal-dive-card"'), 'Header must include #header-portal-dive-card');
    check(header.includes('data-portal-dive="/aethelgrad"'), 'Header must include portal dive button to /aethelgrad');

    // The Data Atlas Crypt (36 nodes, 52 synapses, 4 clusters, Telemetry HUD)
    checkEqual(ATLAS_CLUSTERS.length, 4, 'Atlas must have 4 clusters');
    checkEqual(ATLAS_NODES.length, 36, 'Atlas must have 36 knowledge nodes');
    checkEqual(ATLAS_EDGES.length, 52, 'Atlas must have 52 synapses');

    const nodeIds = new Set(ATLAS_NODES.map((n) => n.id));
    checkEqual(nodeIds.size, 36, 'All 36 Atlas node IDs must be unique');
    for (const edge of ATLAS_EDGES) {
      check(
        nodeIds.has(edge.source) && nodeIds.has(edge.target),
        `Atlas edge ${edge.source} -> ${edge.target} must reference valid nodes`
      );
    }

    const atlasAstro = fs.readFileSync(path.join(ROOT, 'src/pages/atlas/index.astro'), 'utf8');
    check(atlasAstro.includes('id="atlas-network-canvas"'), '/atlas must include #atlas-network-canvas');
    check(atlasAstro.includes('id="atlas-telemetry-hud"'), '/atlas must include #atlas-telemetry-hud');
    check(atlasAstro.includes('id="atlas-inspector-panel"'), '/atlas must include #atlas-inspector-panel');

    // Verify zero portfolio project leak into Aethelgrad catalogs
    const catalogFiles = fs.readdirSync(path.join(ROOT, 'src/world-aethelgrad/catalog'));
    for (const file of catalogFiles) {
      const text = fs.readFileSync(path.join(ROOT, 'src/world-aethelgrad/catalog', file), 'utf8');
      check(!text.includes('aqi-cirebon'), `Catalog ${file} must not leak aqi-cirebon`);
      check(!text.includes('saham-indonesia'), `Catalog ${file} must not leak saham-indonesia`);
      check(!text.includes('\u2014'), `Catalog ${file} must not contain U+2014 em-dash`);
    }
  }
);

// ============================================================================
// SUITE 2: Backend Security, Anti-Injection, PBKDF2, & 1-Device-1-Account Lock
// ============================================================================
runSuite(
  'Suite 2: Anti-SQLi/XSS/NoSQLi Guard, PBKDF2-SHA512 Hashing, 1-Device-1-Account Lock, & Returning User Login Gate',
  () => {
    // 1. Input guard tests
    checkEqual(
      detectMaliciousString("' OR 1=1 --").malicious,
      true,
      'Must block SQL injection OR 1=1'
    );
    checkEqual(
      detectMaliciousString('UNION SELECT password FROM users').malicious,
      true,
      'Must block SQL UNION SELECT'
    );
    checkEqual(
      detectMaliciousString('<script>alert(1)</script>').malicious,
      true,
      'Must block XSS <script>'
    );
    checkEqual(
      hasDangerousObjectKeys({ $ne: null }),
      true,
      'Must block NoSQL injection $ne'
    );
    checkEqual(
      hasDangerousObjectKeys(JSON.parse('{"__proto__": {"admin": true}}')),
      true,
      'Must block Prototype Pollution __proto__'
    );
    checkEqual(
      detectMaliciousString('Vanguard_702').malicious,
      false,
      'Must allow safe hunter username'
    );

    checkEqual(validateHunterUsername('Vanguard_702').ok, true, 'Valid username accepted');
    checkEqual(validateHunterUsername('ab').ok, false, 'Too short username rejected');
    checkEqual(validateHunterPassword('StrongPass123').ok, true, 'Valid password accepted');
    checkEqual(validateHunterPassword('short').ok, false, 'Short password rejected');

    // 2. PBKDF2-HMAC-SHA512 tests
    const hashed1 = hashHunterPassword('HunterSecret#2026');
    const hashed2 = hashHunterPassword('HunterSecret#2026');
    check(
      hashed1.passwordHashHex !== hashed2.passwordHashHex,
      'Unique salts must produce distinct PBKDF2 hashes'
    );
    checkEqual(
      verifyHunterPassword('HunterSecret#2026', hashed1.passwordHashHex, hashed1.passwordSaltHex),
      true,
      'Correct password must verify true'
    );
    checkEqual(
      verifyHunterPassword('WrongPassword#999', hashed1.passwordHashHex, hashed1.passwordSaltHex),
      false,
      'Wrong password must verify false'
    );

    // 3. Session HMAC tests
    const token = signHunterSessionToken({
      hunterId: 'hunter_test_01',
      username: 'Vanguard_702',
      boundDeviceHash: 'dev_abc_1234567890',
    });
    const verifiedSession = verifyHunterSessionToken(token);
    check(verifiedSession !== null, 'Signed session token must verify');
    checkEqual(verifiedSession.username, 'Vanguard_702', 'Session payload username matches');
    checkEqual(verifyHunterSessionToken(token + 'tampered'), null, 'Tampered token must return null');

    // 4. 1-Device-1-Account Lock & Returning User Login Gate
    resetInMemoryVaultForTesting();
    const deviceSignalA = {
      clientFingerprintHash: 'fp_device_alpha_999',
      platform: 'Linux x86_64',
      screenGeometry: '1920x1080x24',
      timezone: 'Asia/Jakarta',
      language: 'id-ID',
    };

    const devHashA = computeBoundDeviceHash(deviceSignalA);
    checkEqual(devHashA.length, 64, 'Device lock hash must be 64-char SHA-256 hex');

    // Before registration, device should be routed to REGISTER_NEW_DEVICE
    const statusBefore = resolveAuthGateStatus({ deviceSignal: deviceSignalA });
    checkEqual(
      statusBefore.gateMode,
      'REGISTER_NEW_DEVICE',
      'New device must be routed to REGISTER_NEW_DEVICE'
    );

    // First registration on deviceSignalA succeeds
    const reg1 = registerHunterAccount({
      username: 'Vanguard_702',
      password: 'HunterPassword123',
      deviceSignal: deviceSignalA,
    });
    checkEqual(reg1.ok, true, 'First registration on device must succeed');
    checkEqual(reg1.code, 'REGISTERED_AND_BOUND', 'First registration code must be REGISTERED_AND_BOUND');

    // Second registration on the exact same deviceSignalA MUST BE BLOCKED (1 Device = 1 Account!)
    const reg2 = registerHunterAccount({
      username: 'SecondSmurfAccount',
      password: 'SmurfPassword123',
      deviceSignal: deviceSignalA,
    });
    checkEqual(reg2.ok, false, 'Second account registration on same device must be blocked');
    checkEqual(
      reg2.code,
      'DEVICE_ALREADY_BOUND',
      'Must return DEVICE_ALREADY_BOUND when attempting 2nd account on same device'
    );
    checkEqual(
      reg2.boundUsername,
      'Vanguard_702',
      'Must report boundUsername so Smart Auth Gate routes to Login'
    );

    // Returning user check on deviceSignalA without active session -> automatically LOGIN_BOUND_DEVICE
    const statusReturning = resolveAuthGateStatus({ deviceSignal: deviceSignalA });
    checkEqual(
      statusReturning.gateMode,
      'LOGIN_BOUND_DEVICE',
      'Returning user on bound device must be routed to LOGIN_BOUND_DEVICE'
    );
    checkEqual(
      statusReturning.boundUsername,
      'Vanguard_702',
      'Returning user status must prefill boundUsername'
    );

    // Login with correct credentials succeeds
    const loginRes = loginHunterAccount({
      username: 'Vanguard_702',
      password: 'HunterPassword123',
      deviceSignal: deviceSignalA,
    });
    checkEqual(loginRes.ok, true, 'Returning user login with correct password must succeed');
    checkEqual(loginRes.code, 'AUTH_OK', 'Login response code must be AUTH_OK');
  }
);

// ============================================================================
// SUITE 3: 7-Layer Pixel SVG Paper-Doll Engine & Complete Catalogs
// ============================================================================
runSuite(
  'Suite 3: 7-Layer Pixel SVG Paper-Doll Engine (64x64 crispEdges), 24 Original Heroes, & 50 Equipment Items',
  () => {
    // 24 Original Heroes check
    checkEqual(HEROES_CATALOG.length, 24, 'Must have exactly 24 Original Heroes');
    checkEqual(getHeroesByBaseStars(5).length, 6, 'Must have 6 ★5 Mythic heroes');
    checkEqual(getHeroesByBaseStars(4).length, 6, 'Must have 6 ★4 Epic heroes');
    checkEqual(getHeroesByBaseStars(3).length, 6, 'Must have 6 ★3 Rare heroes');
    checkEqual(
      getHeroesByBaseStars(2).length + getHeroesByBaseStars(1).length,
      6,
      'Must have 6 ★1-★2 base heroes'
    );
    check(getHeroById('hero-kaelthas-sol') !== undefined, 'Must include Kaelthas ★5');
    check(getHeroById('hero-evelyn-dawnblade') !== undefined, 'Must include Evelyn ★5');
    check(getHeroById('hero-han-islat') !== undefined, 'Must include Han Islat ★1');

    // 50 Equipment Items check across 5 slots (10 per slot)
    checkEqual(ITEMS_CATALOG.length, 50, 'Must have exactly 50 Equipment Items');
    checkEqual(getEquipmentBySlot('WEAPON').length, 10, 'Must have 10 WEAPON items');
    checkEqual(getEquipmentBySlot('ARMOR').length, 10, 'Must have 10 ARMOR items');
    checkEqual(getEquipmentBySlot('HELMET').length, 10, 'Must have 10 HELMET items');
    checkEqual(getEquipmentBySlot('OFFHAND').length, 10, 'Must have 10 OFFHAND items');
    checkEqual(getEquipmentBySlot('RELIC_CAPE').length, 10, 'Must have 10 RELIC_CAPE items');

    // 7-Layer Pixel SVG Paper-Doll Composer verification
    const bareSvg = composeHeroPaperDollSvg({
      heroId: 'hero-evelyn-dawnblade',
      currentStars: 5,
      equippedLoadout: {
        WEAPON: null,
        ARMOR: null,
        HELMET: null,
        OFFHAND: null,
        RELIC_CAPE: null,
      },
      sizePx: 200,
    });
    check(bareSvg.includes('viewBox="0 0 64 64"'), 'SVG must use 64x64 pixel grid viewBox');
    check(bareSvg.includes('shape-rendering="crispEdges"'), 'SVG must enforce crispEdges');

    for (const layerId of [
      'pd-layer-0-aura',
      'pd-layer-1-body',
      'pd-layer-2-armor',
      'pd-layer-3-head',
      'pd-layer-4-helmet',
      'pd-layer-5-offhand',
      'pd-layer-6-weapon',
    ]) {
      check(bareSvg.includes(layerId), `SVG must contain layer group ${layerId}`);
    }

    // Equip Mythic gear and verify SVG output changes dynamically
    const equippedSvg = composeHeroPaperDollSvg({
      heroId: 'hero-evelyn-dawnblade',
      currentStars: 5,
      equippedLoadout: {
        WEAPON: getEquipmentBySlot('WEAPON')[0].id,
        ARMOR: getEquipmentBySlot('ARMOR')[0].id,
        HELMET: getEquipmentBySlot('HELMET')[0].id,
        OFFHAND: getEquipmentBySlot('OFFHAND')[0].id,
        RELIC_CAPE: getEquipmentBySlot('RELIC_CAPE')[0].id,
      },
      sizePx: 200,
    });
    check(
      equippedSvg !== bareSvg,
      'Equipping weapon/armor/helmet/offhand/wings must dynamically alter the rendered 7-Layer Pixel SVG'
    );
    check(
      equippedSvg.length > bareSvg.length,
      'Full Mythic equipped Paper-Doll SVG must contain additional pixel rects and particles'
    );
  }
);

// ============================================================================
// SUITE 4: Gacha Soft/Hard Pity, Grimoire Bonds, & Pick Me Up! Synthesis Forge
// ============================================================================
runSuite(
  'Suite 4: Gacha Hard Pity (50th Pull ★5), 10x Multi-Pull, 12 Grimoire Bonds, & Han Islat ★1 -> ★5 Promotion',
  () => {
    const starter = createStarterHunterProfile('hunter_test_gacha', 'TestVanguard');
    const mockPlayer = {
      ...starter,
      astralGems: 25000,
      starlightDust: 5000,
      pity5StarCounter: 49, // Next pull is 50th (Hard Pity!)
    };

    // 1. Hard Pity 50th pull test
    const pityOutcome = executeGachaSummon(mockPlayer, {
      bannerId: 'HERO_SOVEREIGN_BANNER',
      pullCount: 1,
    });
    checkEqual(pityOutcome.result.drops.length, 1, '1x pull returns 1 drop');
    checkEqual(
      pityOutcome.result.drops[0].rarityStars,
      5,
      '50th pull (Hard Pity) must guarantee ★5 Mythic'
    );
    checkEqual(
      pityOutcome.result.newPity5StarCounter,
      0,
      'Pity counter must reset to 0 after ★5 pull'
    );

    // 2. 10x Multi-Pull guaranteed ★4+ test
    const multiOutcome = executeGachaSummon(pityOutcome.updatedProfile, {
      bannerId: 'ARMS_RELIC_BANNER',
      pullCount: 10,
    });
    checkEqual(multiOutcome.result.drops.length, 10, '10x pull returns 10 drops');
    check(
      multiOutcome.result.highestRarityStars >= 4,
      '10x multi-pull must guarantee at least ★4 or ★5'
    );

    // 3. 12 Grimoire Collection Bonds check
    checkEqual(GRIMOIRE_COLLECTIONS.length, 12, 'Must have 12 Guardian Grimoire Collection Bonds');

    // 4. Pick Me Up! Hero Star Promotion (Han Islat ★1 -> ★5 Mythic)
    let prof = {
      ...multiOutcome.updatedProfile,
      activeHeroId: 'hero-han-islat',
      starlightDust: 5000,
    };
    const cpBeforePromote = calculateHunterCombatStats(prof).totalCombatPower;
    for (let targetStar = 2; targetStar <= 5; targetStar++) {
      const promoRes = executeForgeUpgrade(prof, {
        action: 'PROMOTE_HERO_STAR',
        targetId: 'hero-han-islat',
      });
      checkEqual(promoRes.result.newStars, targetStar, `Han Islat promoted to ★${targetStar}`);
      prof = promoRes.updatedProfile;
    }
    const cpAfterMythicHan = calculateHunterCombatStats(prof).totalCombatPower;
    check(
      cpAfterMythicHan > cpBeforePromote + 1500,
      'Han Islat ★5 Infinite Adaptation passive must grant a massive Mythic-tier Combat Power surge'
    );

    // 5. Equipment Forge Enhancement (+2 -> +3)
    const enhanceRes = executeForgeUpgrade(prof, {
      action: 'ENHANCE_EQUIPMENT',
      targetId: 'wpn-starfall-blade',
    });
    checkEqual(
      enhanceRes.result.newEnhanceLevel,
      3,
      'Starfall Blade enhanced from +2 to +3'
    );
  }
);

// ============================================================================
// SUITE 5: Code-Spell Sanctum (24 Spells) & Spire Colosseum Auto-Battler
// ============================================================================
runSuite(
  'Suite 5: Code-Spell Sanctum (24 Spells across 4 Tiers) & Spire Colosseum 1v1 Turn-Based Battle Simulator',
  () => {
    checkEqual(CODE_SPELLS_CATALOG.length, 24, 'Must have exactly 24 Code Spells');
    checkEqual(getCodeSpellsByTier('TIER_1_NOVICE').length, 6, 'Tier I must have 6 spells');
    checkEqual(getCodeSpellsByTier('TIER_2_ADEPT').length, 6, 'Tier II must have 6 spells');
    checkEqual(getCodeSpellsByTier('TIER_3_MAGUS').length, 6, 'Tier III must have 6 spells');
    checkEqual(getCodeSpellsByTier('TIER_4_ARCHON').length, 6, 'Tier IV must have 6 spells');

    const player = createStarterHunterProfile('hunter_coder', 'CodeArchmage');
    const cpBeforeSpell = calculateHunterCombatStats(player).totalCombatPower;
    const spell1 = getCodeSpellById('spell-01-exorcise-bug');

    const wrongAttempt = verifyAndApplyCodeSpell(player, {
      spellId: 'spell-01-exorcise-bug',
      selectedOptionId: 'WRONG_OPTION',
    });
    checkEqual(wrongAttempt.result.passed, false, 'Incorrect spell answer must return passed: false');

    const rightAttempt = verifyAndApplyCodeSpell(player, {
      spellId: 'spell-01-exorcise-bug',
      selectedOptionId: spell1.correctOptionId,
    });
    checkEqual(rightAttempt.result.passed, true, 'Correct spell answer must return passed: true');
    check(rightAttempt.result.gemsAwarded > 0, 'Solving spell must award Astral Gems');
    check(
      rightAttempt.result.updatedCombatPower > cpBeforeSpell,
      'Solving a Code Spell must increase player Combat Power via Arcane Code Buff'
    );

    // Pre-seeded Tower Guardians & Leaderboard check
    checkEqual(SEED_TOWER_GUARDIANS.length, 12, 'Must have 12 pre-seeded NPC Tower Guardians');
    const leaderboard = buildColosseumLeaderboard(rightAttempt.updatedProfile);
    check(leaderboard.length >= 13, 'Leaderboard must include 12 NPC Guardians + registered Hunter');

    // Simulate 1v1 Colosseum Duel against a Tower Guardian
    const guardian = SEED_TOWER_GUARDIANS[SEED_TOWER_GUARDIANS.length - 1];
    const battle = simulateColosseumDuel(rightAttempt.updatedProfile, guardian);
    check(
      Array.isArray(battle.duelResult.turns) && battle.duelResult.turns.length >= 1,
      'Battle must produce turn logs'
    );
    check(battle.duelResult.turns.length <= 24, 'Battle turn logs must be bounded');
    check(
      battle.duelResult.winner === 'CHALLENGER' || battle.duelResult.winner === 'DEFENDER',
      'Battle must declare a deterministic winner'
    );
  }
);

console.log(
  `\nHASIL V15.0: ${passedSuites} SUITES PASS (${assertionsCount} ASSERTIONS VERIFIED), ${failedSuites} FAIL\n`
);

if (failedSuites > 0 || assertionsCount < 80) {
  process.exit(1);
}
