/**
 * src/world-aethelgrad/types/gacha.types.ts
 * Domain contracts untuk Astral Summoning Altar (1x & 10x Gacha + Soft/Hard Pity).
 */

import type { HeroRarityStars } from './hero.types.ts';

export type GachaBannerId = 'STANDARD_ASTRAL_ALTAR' | 'HERO_SOVEREIGN_BANNER' | 'ARMS_RELIC_BANNER';

export type GachaPullKind = 'HERO' | 'EQUIPMENT';

export interface SingleGachaDrop {
  readonly pullIndex: number;
  readonly kind: GachaPullKind;
  readonly entryId: string;
  readonly name: string;
  readonly rarityStars: HeroRarityStars;
  readonly isNewUnlock: boolean;
  readonly convertedSoulShards: number;
  readonly convertedStarlightDust: number;
  readonly triggeredHardPity: boolean;
  readonly triggeredSoftPity: boolean;
}

export interface GachaSummonResult {
  readonly ok: boolean;
  readonly bannerId: GachaBannerId;
  readonly pullCount: 1 | 10;
  readonly gemsSpent: number;
  readonly ticketsSpent: number;
  readonly drops: readonly SingleGachaDrop[];
  readonly highestRarityStars: HeroRarityStars;
  readonly newPity5StarCounter: number;
  readonly newPity4StarCounter: number;
  readonly remainingAstralGems: number;
  readonly remainingSummonTickets: number;
  readonly updatedCombatPower: number;
}
