/**
 * Mesin Forge Aethelgrad: Promosi Bintang Pahlawan (★1 -> ★5), Pelatihan Level,
 * Tempa Perlengkapan (+0 -> +15), dan Sintesis 3-ke-1 Perlengkapan.
 */

import { getHeroById } from '../../catalog/heroes-index.ts';
import { getEquipmentById, getEquipmentByRarity } from '../../catalog/items-index.ts';
import type { HunterProfileState } from '../../types/colosseum.types.ts';
import type { HeroRarityStars } from '../../types/hero.types.ts';
import { calculateHunterCombatStats } from './combat-power-calculator.ts';

export type ForgeActionType =
  | 'PROMOTE_HERO_STAR'
  | 'LEVEL_UP_HERO'
  | 'ENHANCE_EQUIPMENT'
  | 'SYNTHESIZE_3_TO_1';

export interface ForgeUpgradeResult {
  readonly ok: boolean;
  readonly action: ForgeActionType;
  readonly targetId: string;
  readonly message: string;
  readonly newStars?: HeroRarityStars;
  readonly newLevel?: number;
  readonly newEnhanceLevel?: number;
  readonly synthesizedItemId?: string;
  readonly synthesizedItemName?: string;
  readonly synthesizedRarityStars?: HeroRarityStars;
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
      throw new Error('Pahlawan belum dimiliki di barak Anda.');
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

    const logLine = `[TEMPA BINTANG] ${heroCatalog.name} bangkit menjadi ★${nextStars}!`;
    const updatedProfile: HunterProfileState = {
      ...profile,
      starlightDust: nextDust,
      ownedHeroes: updatedHeroes,
      recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
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
      throw new Error('Pahlawan belum dimiliki di barak Anda.');
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

    const logLine = `[LATIHAN] ${heroCatalog.name} meningkat ke Lv. ${nextLevel}!`;
    const updatedProfile: HunterProfileState = {
      ...profile,
      accountLevel: Math.max(profile.accountLevel, nextLevel),
      starlightDust: nextDust,
      ownedHeroes: updatedHeroes,
      recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
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

  if (input.action === 'SYNTHESIZE_3_TO_1') {
    const sourceCatalog = getEquipmentById(input.targetId);
    const ownedSource = profile.ownedEquipment[input.targetId];
    if (!sourceCatalog || !ownedSource) {
      throw new Error('Perlengkapan sumber belum dimiliki di inventaris Anda.');
    }
    if (sourceCatalog.rarityStars >= 5) {
      throw new Error('Perlengkapan ★5 sudah berada di tingkatan tertinggi.');
    }

    const nextRarity = (sourceCatalog.rarityStars + 1) as HeroRarityStars;
    const dustFallbackCost = sourceCatalog.rarityStars * 45;
    let nextDust = profile.starlightDust;
    const updatedEquipment = { ...profile.ownedEquipment };

    if (ownedSource.count >= 3) {
      updatedEquipment[input.targetId] = {
        ...ownedSource,
        count: ownedSource.count - 2,
      };
    } else if (nextDust >= dustFallbackCost) {
      nextDust -= dustFallbackCost;
    } else {
      throw new Error(
        `Membutuhkan minimal 3 duplikat ${sourceCatalog.name} atau ${dustFallbackCost} Starlight Dust untuk sintesis 3-ke-1.`
      );
    }

    const higherPool = getEquipmentByRarity(nextRarity);
    const sameSlotPool = higherPool.filter((it) => it.slot === sourceCatalog.slot);
    const targetPool = sameSlotPool.length > 0 ? sameSlotPool : higherPool;
    const forgedItem =
      targetPool[(profile.totalSummonsPerformed + Object.keys(updatedEquipment).length) % targetPool.length];

    const existingForged = updatedEquipment[forgedItem.id];
    if (existingForged) {
      updatedEquipment[forgedItem.id] = {
        ...existingForged,
        count: existingForged.count + 1,
        enhanceLevel: Math.min(15, existingForged.enhanceLevel + 1),
      };
    } else {
      updatedEquipment[forgedItem.id] = {
        itemId: forgedItem.id,
        enhanceLevel: 1,
        count: 1,
        firstObtainedIso: nowIso,
      };
    }

    const logLine = `[SINTESIS 3-KE-1] Berhasil menempa ${forgedItem.name} (★${nextRarity})!`;
    const updatedProfile: HunterProfileState = {
      ...profile,
      starlightDust: nextDust,
      ownedEquipment: updatedEquipment,
      recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
    };
    const cp = calculateHunterCombatStats(updatedProfile).totalCombatPower;

    return {
      result: {
        ok: true,
        action: 'SYNTHESIZE_3_TO_1',
        targetId: input.targetId,
        message: logLine,
        synthesizedItemId: forgedItem.id,
        synthesizedItemName: forgedItem.name,
        synthesizedRarityStars: nextRarity,
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
    throw new Error('Perlengkapan belum dimiliki di inventaris Anda.');
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

  const logLine = `[TEMPA] ${itemCatalog.name} berhasil ditempa ke +${nextEnhance}!`;
  const updatedProfile: HunterProfileState = {
    ...profile,
    starlightDust: nextDust,
    ownedEquipment: updatedEquipment,
    recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
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
