/**
 * src/world-aethelgrad/server/engines/gacha-rng-engine.ts
 * Mesin Gacha Probabilistik Berbobot dengan Soft Pity (35) & Hard Pity (50).
 */

import { getHeroesByBaseStars } from '../../catalog/heroes-index.ts';
import { getEquipmentByRarity } from '../../catalog/items-index.ts';
import type { HunterProfileState } from '../../types/colosseum.types.ts';
import type {
  GachaBannerId,
  GachaPullKind,
  GachaSummonResult,
  SingleGachaDrop,
} from '../../types/gacha.types.ts';
import type { HeroRarityStars } from '../../types/hero.types.ts';
import { calculateHunterCombatStats } from './combat-power-calculator.ts';

export const COST_SINGLE_PULL_GEMS = 100;
export const COST_MULTI10_PULL_GEMS = 900; // Diskon 10% untuk 10x Summon!

export const SOFT_PITY_START = 35;
export const HARD_PITY_LIMIT = 50;

/**
 * Menghitung peluang efektif mendapatkan ★5 pada tarikan ke-n (1-indexed).
 */
export function getEffectiveFiveStarChance(pullNumber: number): number {
  if (pullNumber >= HARD_PITY_LIMIT) return 1.0;
  if (pullNumber < SOFT_PITY_START) return 0.04; // 4% base ★5 rate
  return Math.min(1.0, Number((0.04 + (pullNumber - (SOFT_PITY_START - 1)) * 0.05).toFixed(4)));
}

function randomFloat01(seedHint?: number): number {
  if (typeof seedHint === 'number' && Number.isFinite(seedHint)) {
    const x = Math.sin(seedHint * 9999.73 + 17.31) * 10000;
    return x - Math.floor(x);
  }
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] / 0xffffffff;
  }
  return Math.random();
}

function pickRandomElement<T>(arr: readonly T[], rngVal: number): T {
  const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(rngVal * arr.length)));
  return arr[idx];
}

export function executeGachaSummon(
  profile: HunterProfileState,
  options: {
    readonly bannerId: GachaBannerId;
    readonly pullCount: 1 | 10;
    readonly useTickets?: boolean;
    readonly deterministicSeed?: number;
  }
): {
  readonly result: GachaSummonResult;
  readonly updatedProfile: HunterProfileState;
} {
  const pullCount = options.pullCount === 10 ? 10 : 1;
  const gemsRequired = pullCount === 10 ? COST_MULTI10_PULL_GEMS : COST_SINGLE_PULL_GEMS;

  let gemsSpent = 0;
  let ticketsSpent = 0;

  if (options.useTickets && profile.summonTickets >= pullCount) {
    ticketsSpent = pullCount;
  } else if (profile.astralGems >= gemsRequired) {
    gemsSpent = gemsRequired;
  } else if (profile.summonTickets >= pullCount) {
    ticketsSpent = pullCount;
  } else {
    throw new Error(
      `Astral Gems tidak mencukupi (Butuh ${gemsRequired} Gems atau ${pullCount} Summon Ticket). Selesaikan tantangan di Logic Trials atau Colosseum untuk mendapatkan Gems!`
    );
  }

  let pity5 = profile.pity5StarCounter;
  let pity4 = profile.pity4StarCounter;
  let starlightDust = profile.starlightDust;
  const ownedHeroes = { ...profile.ownedHeroes };
  const ownedEquipment = { ...profile.ownedEquipment };
  const drops: SingleGachaDrop[] = [];
  let highestRarityStars: HeroRarityStars = 1;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < pullCount; i++) {
    pity5 += 1;
    pity4 += 1;

    const r1 = randomFloat01(
      options.deterministicSeed !== undefined ? options.deterministicSeed + i * 3 + 1 : undefined
    );
    const r2 = randomFloat01(
      options.deterministicSeed !== undefined ? options.deterministicSeed + i * 3 + 2 : undefined
    );
    const r3 = randomFloat01(
      options.deterministicSeed !== undefined ? options.deterministicSeed + i * 3 + 3 : undefined
    );

    const fiveStarChance = getEffectiveFiveStarChance(pity5);
    const triggeredHardPity = pity5 >= HARD_PITY_LIMIT;
    const triggeredSoftPity = !triggeredHardPity && pity5 >= SOFT_PITY_START;

    let rarity: HeroRarityStars = 2;
    if (triggeredHardPity || r1 < fiveStarChance) {
      rarity = 5;
      pity5 = 0;
      pity4 = 0;
    } else if (pity4 >= 10 || r1 < fiveStarChance + 0.16) {
      rarity = 4;
      pity4 = 0;
    } else if (r1 < fiveStarChance + 0.52) {
      rarity = 3;
    } else if (r1 < 0.82) {
      rarity = 2;
    } else {
      rarity = 1;
    }

    if (rarity > highestRarityStars) {
      highestRarityStars = rarity;
    }

    // Tentukan apakah yang jatuh adalah HERO atau EQUIPMENT berdasarkan banner
    let kind: GachaPullKind = 'HERO';
    if (options.bannerId === 'HERO_SOVEREIGN_BANNER') {
      kind = r2 < 0.72 ? 'HERO' : 'EQUIPMENT';
    } else if (options.bannerId === 'ARMS_RELIC_BANNER') {
      kind = r2 < 0.28 ? 'HERO' : 'EQUIPMENT';
    } else {
      kind = r2 < 0.52 ? 'HERO' : 'EQUIPMENT';
    }

    if (kind === 'HERO') {
      const pool = getHeroesByBaseStars(rarity);
      const chosenHero = pickRandomElement(pool, r3);
      const existing = ownedHeroes[chosenHero.id];
      const isNewUnlock = !existing;
      let shardsAdded = 0;
      let dustAdded = 0;

      if (isNewUnlock) {
        ownedHeroes[chosenHero.id] = {
          heroId: chosenHero.id,
          currentStars: chosenHero.baseStars,
          level: 1,
          soulShards: 15,
          dupesPulled: 0,
          unlockedAtIso: nowIso,
        };
      } else {
        shardsAdded = rarity === 5 ? 80 : rarity === 4 ? 40 : rarity === 3 ? 20 : 12;
        dustAdded = rarity * 15;
        starlightDust += dustAdded;
        ownedHeroes[chosenHero.id] = {
          ...existing,
          soulShards: existing.soulShards + shardsAdded,
          dupesPulled: existing.dupesPulled + 1,
        };
      }

      drops.push({
        pullIndex: i + 1,
        kind: 'HERO',
        entryId: chosenHero.id,
        name: chosenHero.name,
        rarityStars: rarity,
        isNewUnlock,
        convertedSoulShards: shardsAdded,
        convertedStarlightDust: dustAdded,
        triggeredHardPity,
        triggeredSoftPity,
      });
    } else {
      const pool = getEquipmentByRarity(rarity);
      const chosenItem = pickRandomElement(pool, r3);
      const existing = ownedEquipment[chosenItem.id];
      const isNewUnlock = !existing;
      const dustAdded = isNewUnlock ? 5 : rarity * 12;
      starlightDust += dustAdded;

      if (isNewUnlock) {
        ownedEquipment[chosenItem.id] = {
          itemId: chosenItem.id,
          enhanceLevel: 0,
          count: 1,
          firstObtainedIso: nowIso,
        };
      } else {
        ownedEquipment[chosenItem.id] = {
          ...existing,
          count: existing.count + 1,
        };
      }

      drops.push({
        pullIndex: i + 1,
        kind: 'EQUIPMENT',
        entryId: chosenItem.id,
        name: chosenItem.name,
        rarityStars: rarity,
        isNewUnlock,
        convertedSoulShards: 0,
        convertedStarlightDust: dustAdded,
        triggeredHardPity,
        triggeredSoftPity,
      });
    }
  }

  const topDrop = drops.reduce((best, cur) =>
    cur.rarityStars >= best.rarityStars ? cur : best
  );
  const logEntry = `[SUMMON ${pullCount}x] Memperoleh ${topDrop.name} (★${topDrop.rarityStars})`;

  const updatedProfile: HunterProfileState = {
    ...profile,
    astralGems: profile.astralGems - gemsSpent,
    summonTickets: profile.summonTickets - ticketsSpent,
    starlightDust,
    pity5StarCounter: pity5,
    pity4StarCounter: pity4,
    totalSummonsPerformed: profile.totalSummonsPerformed + pullCount,
    ownedHeroes,
    ownedEquipment,
    recentActivityLog: [logEntry, ...profile.recentActivityLog].slice(0, 12),
    updatedAtIso: nowIso,
  };

  const stats = calculateHunterCombatStats(updatedProfile);

  return {
    result: {
      ok: true,
      bannerId: options.bannerId,
      pullCount,
      gemsSpent,
      ticketsSpent,
      drops,
      highestRarityStars,
      newPity5StarCounter: pity5,
      newPity4StarCounter: pity4,
      remainingAstralGems: updatedProfile.astralGems,
      remainingSummonTickets: updatedProfile.summonTickets,
      updatedCombatPower: stats.totalCombatPower,
    },
    updatedProfile,
  };
}
