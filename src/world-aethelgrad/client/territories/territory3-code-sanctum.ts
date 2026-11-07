import type { HunterProfileState } from '../../types/colosseum.types';
import type { CodeSpellTier } from '../../types/sanctum.types';
import {
  CODE_SPELLS_CATALOG,
  getCodeSpellById,
} from '../../catalog/code-spells-catalog';
import { playSpellCastSfx, playTitleStartChime } from '../audio/aethelgrad-sound-synth';

export interface Territory3Context {
  getProfile: () => HunterProfileState | null;
  onSubmitSpell: (
    spellId: string,
    selectedOptionId?: string,
    customCodeAnswer?: string
  ) => Promise<any>;
  openModal: (modalId: string) => void;
}

export class Territory3CodeSanctumController {
  private ctx: Territory3Context;
  private activeSpellId: string = CODE_SPELLS_CATALOG[0]?.id || 'spell-01-exorcise-bug';
  private activeTierFilter: 'ALL' | CodeSpellTier = 'ALL';

  constructor(ctx: Territory3Context) {
    this.ctx = ctx;
  }

  public syncWithProfile(): void {
    const profile = this.ctx.getProfile();
    if (!profile) return;

    const solvedSet = new Set<string>(profile.solvedSpellIds || []);
    if (solvedSet.has(this.activeSpellId)) {
      const nextUnsolved = CODE_SPELLS_CATALOG.find((s) => !solvedSet.has(s.id));
      if (nextUnsolved) {
        this.activeSpellId = nextUnsolved.id;
      }
    }

    this.renderDeckTerminal(profile);
    this.renderSanctumModal(profile);
  }

  public renderDeckTerminal(profile: HunterProfileState): void {
    const solvedSet = new Set<string>(profile.solvedSpellIds || []);
    const spell = getCodeSpellById(this.activeSpellId) || CODE_SPELLS_CATALOG[0];
    if (!spell) return;

    const titleEl = document.getElementById('deck-spell-title');
    const codeSnippetEl = document.getElementById('deck-spell-code-snippet');
    const promptEl = document.getElementById('deck-spell-prompt');
    const inputEl = document.getElementById('deck-spell-answer-input') as HTMLInputElement | null;
    const rewardEl = document.getElementById('deck-spell-reward-preview');
    const masteryBadgeEl = document.getElementById('deck-spell-mastery-badge');
    const testCasesEl = document.getElementById('deck-spell-testcases');
    const questlogEl = document.getElementById('deck-sanctum-questlog');

    const isSolved = solvedSet.has(spell.id);
    const correctOption = spell.options.find((o) => o.id === spell.correctOptionId) || spell.options[0];

    if (titleEl) {
      titleEl.textContent = `${spell.code}: ${spell.title}`;
    }
    if (codeSnippetEl) {
      codeSnippetEl.textContent = spell.brokenCodeDisplay;
    }
    if (promptEl) {
      promptEl.textContent = spell.problemStatement;
    }
    if (inputEl && !inputEl.value) {
      inputEl.placeholder = `Ketik potongan kode solusi (misal: ${spell.canonicalKeywords[0]})`;
    }
    if (rewardEl) {
      rewardEl.innerHTML = `
        <strong>Arcane Code Buff (+${spell.rewardGems} 💎 & +${spell.rewardDust} ✨)</strong>
        <span>+${spell.permanentBuffPct.atkPct}% ATK · +${spell.permanentBuffPct.hpPct}% HP · +${spell.permanentBuffPct.critPct}% CRIT</span>
      `;
    }
    if (masteryBadgeEl) {
      masteryBadgeEl.textContent = `${solvedSet.size} / ${CODE_SPELLS_CATALOG.length} Spells Solved`;
    }
    if (testCasesEl) {
      testCasesEl.innerHTML = spell.testCases
        .map(
          (tc) => `
          <div class="tc-row ${isSolved ? 'is-pass' : ''}">
            <span>${tc.label}: <code>${tc.inputPreview}</code> -> <code>${tc.expectedOutput}</code></span>
            <strong>${isSolved ? 'PASS ✓' : 'READY'}</strong>
          </div>
        `
        )
        .join('');
    }
    if (questlogEl) {
      const recentSolved = CODE_SPELLS_CATALOG.filter((s) => solvedSet.has(s.id)).slice(-3);
      if (recentSolved.length === 0) {
        questlogEl.innerHTML = `
          <li>[SANCTUM] 24 Mantra Algoritma siap dipecahkan untuk memperkuat karakter.</li>
          <li>[HINT] Kata kunci solusi: <code>${correctOption?.codeSnippet.split('\n')[0] || spell.canonicalKeywords[0]}</code></li>
        `;
      } else {
        questlogEl.innerHTML = recentSolved
          .map(
            (s) =>
              `<li>[CLEARED] <strong>${s.code} ${s.title}</strong> -> +${s.rewardGems} 💎 & Buff Aktif!</li>`
          )
          .join('');
      }
    }
  }

  public renderSanctumModal(profile: HunterProfileState): void {
    const solvedSet = new Set<string>(profile.solvedSpellIds || []);
    const listEl = document.getElementById('sanctum-modal-spell-list');
    const detailEl = document.getElementById('sanctum-modal-spell-detail');
    const buffSummaryEl = document.getElementById('sanctum-modal-total-buffs');

    const spell = getCodeSpellById(this.activeSpellId) || CODE_SPELLS_CATALOG[0];

    if (buffSummaryEl) {
      let atkPct = 0;
      let hpPct = 0;
      let defPct = 0;
      let critPct = 0;
      for (const sId of solvedSet) {
        const sp = getCodeSpellById(sId);
        if (sp) {
          atkPct += sp.permanentBuffPct.atkPct;
          hpPct += sp.permanentBuffPct.hpPct;
          defPct += sp.permanentBuffPct.defPct;
          critPct += sp.permanentBuffPct.critPct;
        }
      }
      buffSummaryEl.innerHTML = `
        <span>TOTAL ARCANE CODE BUFF (${solvedSet.size}/24):</span>
        <strong>+${atkPct}% ATK</strong> ·
        <strong>+${hpPct}% HP</strong> ·
        <strong>+${defPct}% DEF</strong> ·
        <strong>+${critPct}% CRIT</strong>
      `;
    }

    if (listEl) {
      const filtered = CODE_SPELLS_CATALOG.filter(
        (s) => this.activeTierFilter === 'ALL' || s.tier === this.activeTierFilter
      );
      listEl.innerHTML = filtered
        .map((s) => {
          const solved = solvedSet.has(s.id);
          const isSelected = s.id === spell.id;
          return `
            <button
              type="button"
              class="sanctum-spell-item ${solved ? 'is-solved' : ''} ${isSelected ? 'is-selected' : ''}"
              data-select-spell="${s.id}"
            >
              <div class="ssi-top">
                <span class="ssi-tier">${s.code} · ${s.category}</span>
                <span class="ssi-status">${solved ? '✓ CLEARED' : `+${s.rewardGems} 💎`}</span>
              </div>
              <strong>${s.title}</strong>
            </button>
          `;
        })
        .join('');

      listEl.querySelectorAll<HTMLButtonElement>('[data-select-spell]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-select-spell');
          if (sId) {
            this.activeSpellId = sId;
            playTitleStartChime();
            this.syncWithProfile();
          }
        });
      });
    }

    if (detailEl && spell) {
      const isSolved = solvedSet.has(spell.id);
      const correctOption = spell.options.find((o) => o.id === spell.correctOptionId) || spell.options[0];

      detailEl.innerHTML = `
        <div class="sanctum-detail-head" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="sd-tier-badge" style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #38bdf8;">
              ${spell.code} · ${spell.tier} · REWARD: +${spell.rewardGems} 💎 & +${spell.rewardDust} ✨
            </span>
            <h3 style="margin: 0.2rem 0;">${spell.title}</h3>
          </div>
          <span class="sd-status-pill" style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: ${isSolved ? '#34d399' : '#fbbf24'};">
            ${isSolved ? '✦ MANTRA TERPECAHKAN' : 'MENUNGGU SOLUSI'}
          </span>
        </div>
        <p style="font-size: 0.8rem; color: #94a3b8;">${spell.lorePrompt}</p>
        <div style="margin: 0.5rem 0; font-size: 0.82rem;">
          <strong>Deskripsi Tantangan:</strong>
          <p style="margin: 0.25rem 0;">${spell.problemStatement}</p>
        </div>
        <pre class="sd-code-block"><code>${spell.brokenCodeDisplay}</code></pre>
        <div class="sd-testcases-grid">
          ${spell.testCases
            .map(
              (tc) => `
              <div class="sd-tc-card ${isSolved ? 'pass' : ''}">
                <span>${tc.label}</span>
                <code>Input: ${tc.inputPreview}</code>
                <code>Expected: ${tc.expectedOutput}</code>
              </div>
            `
            )
            .join('')}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.45rem; margin: 0.65rem 0;">
          <strong style="font-size: 0.76rem; color: #93c5fd;">Pilih Opsi Solusi Algoritma atau Ketik Ekspresi:</strong>
          ${spell.options
            .map(
              (opt) => `
              <button
                type="button"
                class="sanctum-spell-item"
                data-pick-option="${opt.id}"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem;"
              >
                <code>${opt.codeSnippet}</code>
              </button>
            `
            )
            .join('')}
        </div>
        <div class="sd-answer-bar">
          <input
            type="text"
            id="sanctum-modal-answer-input"
            class="sd-answer-input"
            value="${isSolved ? correctOption.codeSnippet.replace(/\n/g, ' ') : ''}"
            placeholder="Ketik ekspresi kode (${spell.canonicalKeywords[0]})"
          />
          <button type="button" id="sanctum-modal-fill-hint-btn" class="sd-hint-btn">
            ISI SOLUSI BENAR
          </button>
          <button type="button" id="sanctum-modal-submit-btn" class="sd-submit-btn">
            EKSEKUSI MANTRA KODE ->
          </button>
        </div>
        <div id="sanctum-modal-feedback" class="sd-feedback-msg"></div>
      `;

      detailEl.querySelectorAll<HTMLButtonElement>('[data-pick-option]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const optId = btn.getAttribute('data-pick-option')!;
          await this.handleSpellSubmission(spell.id, optId, undefined);
        });
      });

      const modalInput = document.getElementById('sanctum-modal-answer-input') as HTMLInputElement | null;
      const hintBtn = document.getElementById('sanctum-modal-fill-hint-btn');
      const submitBtn = document.getElementById('sanctum-modal-submit-btn');

      if (hintBtn && modalInput) {
        hintBtn.addEventListener('click', () => {
          modalInput.value = correctOption.codeSnippet.replace(/\n/g, ' ');
        });
      }

      if (submitBtn && modalInput) {
        submitBtn.addEventListener('click', async () => {
          await this.handleSpellSubmission(spell.id, undefined, modalInput.value);
        });
      }
    }
  }

  public async handleSpellSubmission(
    spellId: string,
    selectedOptionId?: string,
    customCodeAnswer?: string
  ): Promise<void> {
    const spell = getCodeSpellById(spellId);
    const effectiveOption =
      selectedOptionId ||
      (!customCodeAnswer || !customCodeAnswer.trim() ? spell?.correctOptionId : undefined);

    const res = await this.ctx.onSubmitSpell(spellId, effectiveOption, customCodeAnswer);
    const feedbackEl = document.getElementById('sanctum-modal-feedback');
    const deckFeedbackEl = document.getElementById('deck-spell-feedback');

    if (res && res.passed) {
      playSpellCastSfx(true);
      const msg = res.feedbackMessage || `✦ Mantra berhasil dieksekusi (+${res.gemsAwarded} 💎)!`;
      if (feedbackEl) {
        feedbackEl.className = 'sd-feedback-msg is-success';
        feedbackEl.textContent = msg;
      }
      if (deckFeedbackEl) {
        deckFeedbackEl.className = 'deck-spell-feedback is-success';
        deckFeedbackEl.textContent = msg;
      }
    } else {
      playSpellCastSfx(false);
      const errMsg = res?.feedbackMessage || 'Solusi belum tepat. Klik tombol HINT atau pilih opsi yang benar.';
      if (feedbackEl) {
        feedbackEl.className = 'sd-feedback-msg is-error';
        feedbackEl.textContent = errMsg;
      }
      if (deckFeedbackEl) {
        deckFeedbackEl.className = 'deck-spell-feedback is-error';
        deckFeedbackEl.textContent = errMsg;
      }
    }
  }

  public getActiveSpellId(): string {
    return this.activeSpellId;
  }

  public setTierFilter(tier: string): void {
    const map: Record<string, 'ALL' | CodeSpellTier> = {
      ALL: 'ALL',
      TIER_1: 'TIER_1_NOVICE',
      TIER_2: 'TIER_2_ADEPT',
      TIER_3: 'TIER_3_ARCHMAGE',
      TIER_4: 'TIER_4_SOVEREIGN',
    };
    this.activeTierFilter = map[tier] || 'ALL';
    this.syncWithProfile();
  }
}
