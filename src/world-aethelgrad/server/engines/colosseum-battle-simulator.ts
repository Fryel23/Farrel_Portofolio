/**
 * src/world-aethelgrad/server/engines/colosseum-battle-simulator.ts
 * Simulator Pertarungan 1v1 Turn-Based "Arena Colosseum" dengan Log Giliran & Burst Skills.
 */

import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index.ts';
import type {
  BattleTurnLogEntry,
  ColosseumDuelResult,
  HunterProfileState,
  LeaderboardCombatantEntry,
} from '../../types/colosseum.types.ts';
import { calculateHunterCombatStats } from './combat-power-calculator.ts';

export function simulateColosseumDuel(
  challengerProfile: HunterProfileState,
  defenderEntry: LeaderboardCombatantEntry
): {
  readonly duelResult: ColosseumDuelResult;
  readonly updatedProfile: HunterProfileState;
} {
  const challengerStats = calculateHunterCombatStats(challengerProfile);
  const challengerHero = getHeroById(challengerProfile.activeHeroId) || HEROES_CATALOG[0];
  const defenderHero = getHeroById(defenderEntry.activeHeroId) || HEROES_CATALOG[0];

  const challengerMaxHp = Math.max(1200, challengerStats.finalHp);
  const defenderScale = Math.max(0.55, defenderEntry.combatPower / Math.max(1000, challengerStats.totalCombatPower));
  const defenderMaxHp = Math.max(1100, Math.round(challengerMaxHp * Math.min(1.45, Math.max(0.65, defenderScale))));
  const defenderAtk = Math.max(180, Math.round(challengerStats.finalAtk * Math.min(1.38, Math.max(0.6, defenderScale))));
  const defenderDef = Math.max(100, Math.round(challengerStats.finalDef * Math.min(1.35, Math.max(0.6, defenderScale))));

  let cHp = challengerMaxHp;
  let dHp = defenderMaxHp;
  const turns: BattleTurnLogEntry[] = [];

  for (let turn = 1; turn <= 12 && cHp > 0 && dHp > 0; turn++) {
    // Giliran Challenger
    const isBurstC = turn % 3 === 0;
    const isCritC = ((turn * 37 + challengerStats.finalCritPct) % 100) < challengerStats.finalCritPct;
    const rawDmgC = Math.max(
      140,
      challengerStats.finalAtk * (isBurstC ? 1.85 : 1.15) - defenderDef * 0.42
    );
    const dmgC = Math.round(rawDmgC * (isCritC ? 1.55 : 1.0));
    dHp = Math.max(0, dHp - dmgC);

    const skillC = isBurstC ? challengerHero.burstSkillName : 'Astral Strike';
    turns.push({
      turnNumber: turns.length + 1,
      actor: 'CHALLENGER',
      actorName: `${challengerProfile.username} (${challengerHero.name})`,
      skillUsed: skillC,
      isCrit: isCritC,
      damageDealt: dmgC,
      challengerRemainingHp: cHp,
      defenderRemainingHp: dHp,
      narrativeLine: `${challengerProfile.username} melancarkan ${skillC}${isCritC ? ' [CRITICAL!]' : ''} sebesar ${dmgC} DMG!`,
    });

    if (dHp <= 0) break;

    // Giliran Defender
    const isBurstD = turn % 4 === 0;
    const isCritD = ((turn * 29 + 18) % 100) < 22;
    const rawDmgD = Math.max(
      110,
      defenderAtk * (isBurstD ? 1.65 : 1.05) - challengerStats.finalDef * 0.45
    );
    const dmgD = Math.round(rawDmgD * (isCritD ? 1.45 : 1.0));
    cHp = Math.max(0, cHp - dmgD);

    const skillD = isBurstD ? defenderHero.burstSkillName : 'Spire Counter-Slash';
    turns.push({
      turnNumber: turns.length + 1,
      actor: 'DEFENDER',
      actorName: `${defenderEntry.username} (${defenderHero.name})`,
      skillUsed: skillD,
      isCrit: isCritD,
      damageDealt: dmgD,
      challengerRemainingHp: cHp,
      defenderRemainingHp: dHp,
      narrativeLine: `${defenderEntry.username} membalas dengan ${skillD}${isCritD ? ' [CRIT]' : ''} sebesar ${dmgD} DMG!`,
    });
  }

  const winner: 'CHALLENGER' | 'DEFENDER' =
    dHp <= 0 || cHp >= dHp ? 'CHALLENGER' : 'DEFENDER';
  const rewardGems = winner === 'CHALLENGER' ? 120 : 30;
  const rewardDust = winner === 'CHALLENGER' ? 45 : 15;
  const nextWins = challengerProfile.arenaWins + (winner === 'CHALLENGER' ? 1 : 0);
  const nextLosses = challengerProfile.arenaLosses + (winner === 'DEFENDER' ? 1 : 0);
  const nextFloor =
    winner === 'CHALLENGER'
      ? Math.max(challengerProfile.highestSpireFloor, defenderEntry.arenaFloorCleared + 1)
      : challengerProfile.highestSpireFloor;

  const logLine =
    winner === 'CHALLENGER'
      ? `[COLOSSEUM VICTORY] Mengalahkan ${defenderEntry.username} (+${rewardGems} Gems)`
      : `[COLOSSEUM DUEL] Bertarung sengit melawan ${defenderEntry.username} (+${rewardGems} Gems)`;

  const updatedProfile: HunterProfileState = {
    ...challengerProfile,
    astralGems: challengerProfile.astralGems + rewardGems,
    starlightDust: challengerProfile.starlightDust + rewardDust,
    arenaWins: nextWins,
    arenaLosses: nextLosses,
    highestSpireFloor: nextFloor,
    recentActivityLog: [logLine, ...challengerProfile.recentActivityLog].slice(0, 12),
    updatedAtIso: new Date().toISOString(),
  };

  return {
    duelResult: {
      ok: true,
      duelId: `duel-${Date.now()}`,
      challengerUsername: challengerProfile.username,
      defenderUsername: defenderEntry.username,
      challengerCp: challengerStats.totalCombatPower,
      defenderCp: defenderEntry.combatPower,
      winner,
      totalTurns: turns.length,
      challengerMaxHp,
      defenderMaxHp,
      turns,
      rewardGems,
      rewardDust,
      updatedArenaWins: nextWins,
    },
    updatedProfile,
  };
}
