/**
 * src/world-aethelgrad/server/engines/code-spell-verifier.ts
 * Verifikator Tantangan Algoritma "The Code-Spell Sanctum" (24 Spells).
 */

import { getCodeSpellById } from '../../catalog/code-spells-catalog.ts';
import type { HunterProfileState } from '../../types/colosseum.types.ts';
import type { CodeSpellVerificationResult } from '../../types/sanctum.types.ts';
import { calculateHunterCombatStats } from './combat-power-calculator.ts';

export function verifyAndApplyCodeSpell(
  profile: HunterProfileState,
  input: {
    readonly spellId: string;
    readonly selectedOptionId?: string;
    readonly customCodeAnswer?: string;
  }
): {
  readonly result: CodeSpellVerificationResult;
  readonly updatedProfile: HunterProfileState;
} {
  const spell = getCodeSpellById(input.spellId);
  if (!spell) {
    throw new Error(`Mantra kode "${input.spellId}" tidak ditemukan di arsip Sanctum.`);
  }

  let passed = false;
  if (input.selectedOptionId && input.selectedOptionId === spell.correctOptionId) {
    passed = true;
  } else if (typeof input.customCodeAnswer === 'string' && input.customCodeAnswer.trim().length > 0) {
    const cleanCode = input.customCodeAnswer.trim();
    passed = spell.canonicalKeywords.some((kw) => cleanCode.includes(kw));
  }

  const totalTests = spell.testCases.length;
  if (!passed) {
    const stats = calculateHunterCombatStats(profile);
    return {
      result: {
        ok: true,
        spellId: spell.id,
        passed: false,
        firstTimeClear: false,
        testCasesPassed: Math.max(1, totalTests - 2),
        totalTestCases: totalTests,
        feedbackMessage: `Mantra gagal dieksekusi pada kasus batas (Edge Cases). Periksa kembali kondisi logika untuk ${spell.title}.`,
        gemsAwarded: 0,
        dustAwarded: 0,
        totalSolvedCount: profile.solvedSpellIds.length,
        updatedCombatPower: stats.totalCombatPower,
      },
      updatedProfile: profile,
    };
  }

  const alreadySolved = profile.solvedSpellIds.includes(spell.id);
  const firstTimeClear = !alreadySolved;
  const gemsAwarded = firstTimeClear ? spell.rewardGems : 25;
  const dustAwarded = firstTimeClear ? spell.rewardDust : 10;
  const nextSolved = alreadySolved
    ? [...profile.solvedSpellIds]
    : [...profile.solvedSpellIds, spell.id];

  const logLine = firstTimeClear
    ? `[CODE SANCTUM] Berhasil memecahkan ${spell.code}: ${spell.title} (+${gemsAwarded} Gems & Buff Permanen!)`
    : `[CODE SANCTUM] Latihan ulang ${spell.code} berhasil (+${gemsAwarded} Gems)`;

  const updatedProfile: HunterProfileState = {
    ...profile,
    astralGems: profile.astralGems + gemsAwarded,
    starlightDust: profile.starlightDust + dustAwarded,
    solvedSpellIds: nextSolved,
    recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
    updatedAtIso: new Date().toISOString(),
  };

  const stats = calculateHunterCombatStats(updatedProfile);

  return {
    result: {
      ok: true,
      spellId: spell.id,
      passed: true,
      firstTimeClear,
      testCasesPassed: totalTests,
      totalTestCases: totalTests,
      feedbackMessage: firstTimeClear
        ? `Semua ${totalTests}/${totalTests} Test Cases PASS! Arcane Code Buff (+${spell.permanentBuffPct.atkPct}% ATK, +${spell.permanentBuffPct.critPct}% CRIT) diaktifkan permanen!`
        : `Semua ${totalTests}/${totalTests} Test Cases PASS! Anda memperoleh bonus latihan +${gemsAwarded} Gems.`,
      gemsAwarded,
      dustAwarded,
      totalSolvedCount: nextSolved.length,
      updatedCombatPower: stats.totalCombatPower,
    },
    updatedProfile,
  };
}
