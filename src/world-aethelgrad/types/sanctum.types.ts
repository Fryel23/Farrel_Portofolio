/**
 * src/world-aethelgrad/types/sanctum.types.ts
 * Domain contracts untuk The Logic Trials (24 Tantangan Algoritma & Buff Permanen).
 */

export type CodeSpellTier = 'TIER_1_NOVICE' | 'TIER_2_ADEPT' | 'TIER_3_MAGUS' | 'TIER_4_ARCHON';

export interface CodeSpellTestCase {
  readonly label: string;
  readonly inputPreview: string;
  readonly expectedOutput: string;
}

export interface CodeSpellOption {
  readonly id: string;
  readonly codeSnippet: string;
  readonly explanation: string;
}

export interface CodeSpellChallenge {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly tier: CodeSpellTier;
  readonly category: string;
  readonly lorePrompt: string;
  readonly problemStatement: string;
  readonly brokenCodeDisplay: string;
  readonly testCases: readonly CodeSpellTestCase[];
  readonly options: readonly CodeSpellOption[];
  readonly correctOptionId: string;
  readonly canonicalKeywords: readonly string[];
  readonly rewardGems: number;
  readonly rewardDust: number;
  readonly permanentBuffPct: {
    readonly atkPct: number;
    readonly hpPct: number;
    readonly defPct: number;
    readonly critPct: number;
  };
}

export interface CodeSpellVerificationResult {
  readonly ok: boolean;
  readonly spellId: string;
  readonly passed: boolean;
  readonly firstTimeClear: boolean;
  readonly testCasesPassed: number;
  readonly totalTestCases: number;
  readonly feedbackMessage: string;
  readonly gemsAwarded: number;
  readonly dustAwarded: number;
  readonly totalSolvedCount: number;
  readonly updatedCombatPower: number;
}
