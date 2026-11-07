/**
 * Evaluasi Solusi Logic Trials (24 Tantangan Logika Aethelgrad).
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
    throw new Error(`Tantangan "${input.spellId}" tidak ditemukan di ruang Trials.`);
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
        feedbackMessage: `Solusi belum memenuhi seluruh kondisi batas pada ${spell.title}. Periksa kembali logika rune Anda.`,
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
    ? `[TRIALS] Menyelesaikan ${spell.title} (+${gemsAwarded} Gems & Berkat Rune Permanen!)`
    : `[TRIALS] Latihan ulang ${spell.title} selesai (+${gemsAwarded} Gems)`;

  const updatedProfile: HunterProfileState = {
    ...profile,
    astralGems: profile.astralGems + gemsAwarded,
    starlightDust: profile.starlightDust + dustAwarded,
    solvedSpellIds: nextSolved,
    recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
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
        ? `Seluruh ${totalTests}/${totalTests} Kasus Uji berhasil! Berkat Rune (+${spell.permanentBuffPct.atkPct}% ATK, +${spell.permanentBuffPct.critPct}% CRIT) diaktifkan permanen!`
        : `Seluruh ${totalTests}/${totalTests} Kasus Uji berhasil! Anda memperoleh bonus latihan +${gemsAwarded} Gems.`,
      gemsAwarded,
      dustAwarded,
      totalSolvedCount: nextSolved.length,
      updatedCombatPower: stats.totalCombatPower,
    },
    updatedProfile,
  };
}
