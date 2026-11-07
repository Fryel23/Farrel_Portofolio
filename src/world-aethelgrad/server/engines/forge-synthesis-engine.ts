/**
 * src/world-aethelgrad/server/engines/forge-synthesis-engine.ts
 * Mesin Grimoire Forge: Promosi Bintang Hero (★1 -> ★5), Level Up, & Tempa Equipment (+0 -> +15).
 */

import { getHeroById } from '../../catalog/heroes-index.ts';
import { getEquipmentById } from '../../catalog/items-index.ts';
import type { HunterProfileState } from '../../types/colosseum.types.ts';
import type { HeroRarityStars } from '../../types/hero.types.ts';
import { calculateHunterCombatStats } from './combat-power-calculator.ts';

export type ForgeActionType =
  | 'PROMOTE_HERO_STAR'
  | 'LEVEL_UP_HERO'
  | 'ENHANCE_EQUIPMENT';

export interface ForgeUpgradeResult {
  readonly ok: boolean;
  readonly action: ForgeActionType;
  readonly targetId: string;
  readonly message: string;
  readonly newStars?: HeroRarityStars;
  readonly newLevel?: number;
  readonly newEnhanceLevel?: number;
  readonly remainingStarlightDust: number;
  readonly updatedCombatPower: number;
}

export function executeForgeUpgrade(
  profile: HunterProfileState,
  input: {
    readonly action: ForgeActionType;
    readonly targetId: string;
  }
): {
  readonly result: ForgeUpgradeResult;
  readonly updatedProfile: HunterProfileState;
} {
  const nowIso = new Date().toISOString();

  if (input.action === 'PROMOTE_HERO_STAR') {
    const heroCatalog = getHeroById(input.targetId);
    const owned = profile.ownedHeroes[input.targetId];
    if (!heroCatalog || !owned) {
      throw new Error('Hero belum dimiliki di barak Anda.');
    }
    if (owned.currentStars >= 5) {
      throw new Error(`${heroCatalog.name} sudah mencapai batas tertinggi ★5 Sovereign!`);
    }

    const nextStars = (owned.currentStars + 1) as HeroRarityStars;
    const shardCost = owned.currentStars * 20;
    const dustCost = owned.currentStars * 35;

    let nextShards = owned.soulShards;
    let nextDust = profile.starlightDust;

    if (nextShards >= shardCost) {
      nextShards -= shardCost;
    } else if (nextDust >= dustCost) {
      nextDust -= dustCost;
    } else {
      throw new Error(
        `Membutuhkan ${shardCost} Soul Shards atau ${dustCost} Starlight Dust untuk promosi ke ★${nextStars}.`
      );
    }

    const updatedHeroes = {
      ...profile.ownedHeroes,
      [input.targetId]: {
        ...owned,
        currentStars: nextStars,
        soulShards: nextShards,
      },
    };

    const logLine = `[FORGE PROMOTION] ${heroCatalog.name} naik pangkat menjadi ★${nextStars}!`;
    const updatedProfile: HunterProfileState = {
      ...profile,
      starlightDust: nextDust,
      ownedHeroes: updatedHeroes,
      recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
      updatedAtIso: nowIso,
    };
    const cp = calculateHunterCombatStats(updatedProfile).totalCombatPower;

    return {
      result: {
        ok: true,
        action: 'PROMOTE_HERO_STAR',
        targetId: input.targetId,
        message: logLine,
        newStars: nextStars,
        newLevel: owned.level,
        remainingStarlightDust: nextDust,
        updatedCombatPower: cp,
      },
      updatedProfile,
    };
  }

  if (input.action === 'LEVEL_UP_HERO') {
    const heroCatalog = getHeroById(input.targetId);
    const owned = profile.ownedHeroes[input.targetId];
    if (!heroCatalog || !owned) {
      throw new Error('Hero belum dimiliki di barak Anda.');
    }
    if (owned.level >= 60) {
      throw new Error(`${heroCatalog.name} sudah mencapai Level Maksimum (Lv. 60).`);
    }

    const dustCost = 15 + owned.level * 5;
    if (profile.starlightDust < dustCost) {
      throw new Error(`Membutuhkan ${dustCost} Starlight Dust untuk menaikkan level.`);
    }

    const nextLevel = Math.min(60, owned.level + 5);
    const nextDust = profile.starlightDust - dustCost;
    const updatedHeroes = {
      ...profile.ownedHeroes,
      [input.targetId]: {
        ...owned,
        level: nextLevel,
      },
    };

    const logLine = `[HERO TRAINING] ${heroCatalog.name} meningkat ke Lv. ${nextLevel}!`;
    const updatedProfile: HunterProfileState = {
      ...profile,
      accountLevel: Math.max(profile.accountLevel, nextLevel),
      starlightDust: nextDust,
      ownedHeroes: updatedHeroes,
      recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
      updatedAtIso: nowIso,
    };
    const cp = calculateHunterCombatStats(updatedProfile).totalCombatPower;

    return {
      result: {
        ok: true,
        action: 'LEVEL_UP_HERO',
        targetId: input.targetId,
        message: logLine,
        newStars: owned.currentStars,
        newLevel: nextLevel,
        remainingStarlightDust: nextDust,
        updatedCombatPower: cp,
      },
      updatedProfile,
    };
  }

  // ENHANCE_EQUIPMENT
  const itemCatalog = getEquipmentById(input.targetId);
  const ownedItem = profile.ownedEquipment[input.targetId];
  if (!itemCatalog || !ownedItem) {
    throw new Error('Equipment belum dimiliki di inventaris Anda.');
  }
  if (ownedItem.enhanceLevel >= 15) {
    throw new Error(`${itemCatalog.name} sudah mencapai batas tempa tertinggi +15!`);
  }

  const dustCost = 20 + ownedItem.enhanceLevel * 12;
  if (profile.starlightDust < dustCost) {
    throw new Error(`Membutuhkan ${dustCost} Starlight Dust untuk menempa ${itemCatalog.name}.`);
  }

  const nextEnhance = ownedItem.enhanceLevel + 1;
  const nextDust = profile.starlightDust - dustCost;
  const updatedEquipment = {
    ...profile.ownedEquipment,
    [input.targetId]: {
      ...ownedItem,
      enhanceLevel: nextEnhance,
    },
  };

  const logLine = `[FORGE ENHANCE] ${itemCatalog.name} berhasil ditempa ke +${nextEnhance}!`;
  const updatedProfile: HunterProfileState = {
    ...profile,
    starlightDust: nextDust,
    ownedEquipment: updatedEquipment,
    recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
    updatedAtIso: nowIso,
  };
  const cp = calculateHunterCombatStats(updatedProfile).totalCombatPower;

  return {
    result: {
      ok: true,
      action: 'ENHANCE_EQUIPMENT',
      targetId: input.targetId,
      message: logLine,
      newEnhanceLevel: nextEnhance,
      remainingStarlightDust: nextDust,
      updatedCombatPower: cp,
    },
    updatedProfile,
  };
}
