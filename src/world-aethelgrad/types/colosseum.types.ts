/**
 * src/world-aethelgrad/types/colosseum.types.ts
 * Domain contracts untuk Arena Colosseum, Live Leaderboard, & Turn-Based Auto-Battle.
 */

import type { EquippedLoadoutMap, OwnedEquipmentState } from './equipment.types.ts';
import type { HeroRarityStars, OwnedHeroState } from './hero.types.ts';

export interface CombatStatBreakdown {
  readonly baseHp: number;
  readonly baseAtk: number;
  readonly baseDef: number;
  readonly baseSpd: number;
  readonly baseCritPct: number;
  readonly gearBonusHp: number;
  readonly gearBonusAtk: number;
  readonly gearBonusDef: number;
  readonly gearBonusSpd: number;
  readonly gearBonusCritPct: number;
  readonly signatureResonanceBonusPct: number;
  readonly grimoireBonusPct: number;
  readonly codeSanctumBonusPct: {
    readonly atkPct: number;
    readonly hpPct: number;
    readonly defPct: number;
    readonly critPct: number;
  };
  readonly finalHp: number;
  readonly finalAtk: number;
  readonly finalDef: number;
  readonly finalSpd: number;
  readonly finalCritPct: number;
  readonly totalCombatPower: number;
}

export interface LeaderboardCombatantEntry {
  readonly rank: number;
  readonly hunterId: string;
  readonly username: string;
  readonly isNpcGuardian: boolean;
  readonly titleBadge: string;
  readonly activeHeroId: string;
  readonly activeHeroName: string;
  readonly activeHeroStars: HeroRarityStars;
  readonly activeHeroLevel: number;
  readonly equippedLoadout: EquippedLoadoutMap;
  readonly combatPower: number;
  readonly solvedSpellsCount: number;
  readonly arenaWins: number;
  readonly arenaFloorCleared: number;
}

export interface BattleTurnLogEntry {
  readonly turnNumber: number;
  readonly actor: 'CHALLENGER' | 'DEFENDER';
  readonly actorName: string;
  readonly skillUsed: string;
  readonly isCrit: boolean;
  readonly damageDealt: number;
  readonly challengerRemainingHp: number;
  readonly defenderRemainingHp: number;
  readonly narrativeLine: string;
}

export interface ColosseumDuelResult {
  readonly ok: boolean;
  readonly duelId: string;
  readonly challengerUsername: string;
  readonly defenderUsername: string;
  readonly challengerCp: number;
  readonly defenderCp: number;
  readonly winner: 'CHALLENGER' | 'DEFENDER';
  readonly totalTurns: number;
  readonly challengerMaxHp: number;
  readonly defenderMaxHp: number;
  readonly turns: readonly BattleTurnLogEntry[];
  readonly rewardGems: number;
  readonly rewardDust: number;
  readonly updatedArenaWins: number;
}

export interface HunterProfileState {
  readonly hunterId: string;
  readonly username: string;
  readonly titleRank: string;
  readonly accountLevel: number;
  readonly accountExp: number;
  readonly astralGems: number;
  readonly summonTickets: number;
  readonly starlightDust: number;
  readonly pity5StarCounter: number;
  readonly pity4StarCounter: number;
  readonly totalSummonsPerformed: number;
  readonly activeHeroId: string;
  readonly equippedLoadout: EquippedLoadoutMap;
  readonly ownedHeroes: Record<string, OwnedHeroState>;
  readonly ownedEquipment: Record<string, OwnedEquipmentState>;
  readonly solvedSpellIds: readonly string[];
  readonly claimedGrimoireIds: readonly string[];
  readonly arenaWins: number;
  readonly arenaLosses: number;
  readonly highestSpireFloor: number;
  readonly recentActivityLog: readonly string[];
  readonly updatedAtIso: string;
}
