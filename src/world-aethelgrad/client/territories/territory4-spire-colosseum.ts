import type {
  ColosseumDuelResult,
  HunterProfileState,
  LeaderboardCombatantEntry,
} from '../../types/colosseum.types';
import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index';
import { composeHeroPaperDollSvg } from '../../svg-paperdoll/paperdoll-composer';
import {
  playEquipClinkSfx,
  playForgeAnvilSfx,
  playGachaBeamSfx,
} from '../audio/aethelgrad-sound-synth';

export interface Territory4Context {
  getProfile: () => HunterProfileState | null;
  getLeaderboard: () => readonly LeaderboardCombatantEntry[];
  onChallengeOpponent: (defenderHunterId: string) => Promise<ColosseumDuelResult | null>;
  openModal: (modalId: string) => void;
}

export class Territory4SpireColosseumController {
  private ctx: Territory4Context;
  private playbackSpeed: 1 | 2 = 1;
  private skipRequested = false;
  private isPlayingBattle = false;

  constructor(ctx: Territory4Context) {
    this.ctx = ctx;
  }

  public syncWithState(): void {
    const profile = this.ctx.getProfile();
    const leaderboard = this.ctx.getLeaderboard() || [];
    if (!profile) return;

    this.renderDeckColosseum(profile, leaderboard);
    this.renderColosseumModalLeaderboard(profile, leaderboard);
  }

  public renderDeckColosseum(
    profile: HunterProfileState,
    leaderboard: readonly LeaderboardCombatantEntry[]
  ): void {
    const previewStageEl = document.getElementById('colosseum-deck-vs-stage');
    const deckTableEl = document.getElementById('colosseum-deck-leaderboard-list');

    const rival =
      leaderboard.find((entry) => entry.hunterId !== profile.hunterId) ||
      leaderboard[leaderboard.length - 1];

    if (previewStageEl && rival) {
      const ownedActive = profile.ownedHeroes[profile.activeHeroId];
      const playerSvg = composeHeroPaperDollSvg({
        heroId: profile.activeHeroId,
        currentStars: ownedActive ? ownedActive.currentStars : 5,
        equippedLoadout: profile.equippedLoadout,
        sizePx: 74,
        showPedestal: false,
      });

      const rivalSvg = composeHeroPaperDollSvg({
        heroId: rival.activeHeroId,
        currentStars: rival.activeHeroStars,
        equippedLoadout: rival.equippedLoadout,
        sizePx: 74,
        showPedestal: false,
      });

      previewStageEl.innerHTML = `
        <div class="deck-vs-combatant left">
          <div class="dvc-sprite">${playerSvg}</div>
          <span class="dvc-name">${profile.username}</span>
        </div>
        <div class="deck-vs-center">
          <span class="vs-emblem">VS</span>
          <button
            type="button"
            class="deck-duel-now-btn"
            data-duel-target="${rival.hunterId}"
          >
            ⚔ DUEL NOW
          </button>
        </div>
        <div class="deck-vs-combatant right">
          <div class="dvc-sprite mirrored">${rivalSvg}</div>
          <span class="dvc-name">${rival.username}</span>
        </div>
      `;

      previewStageEl
        .querySelector<HTMLButtonElement>('[data-duel-target]')
        ?.addEventListener('click', async (e) => {
          const targetId = (e.currentTarget as HTMLElement).getAttribute('data-duel-target')!;
          await this.startDuelWith(targetId);
        });
    }

    if (deckTableEl) {
      const topEntries = leaderboard.slice(0, 7);
      deckTableEl.innerHTML = topEntries
        .map((entry, idx) => {
          const rank = entry.rank || idx + 1;
          const isSelf = entry.hunterId === profile.hunterId;
          const miniSvg = composeHeroPaperDollSvg({
            heroId: entry.activeHeroId,
            currentStars: entry.activeHeroStars,
            equippedLoadout: entry.equippedLoadout,
            sizePx: 40,
            showPedestal: false,
          });

          return `
            <div class="deck-lb-row ${isSelf ? 'is-self' : ''} rank-${rank}">
              <span class="dlb-rank">#${rank}</span>
              <div class="dlb-avatar">${miniSvg}</div>
              <div class="dlb-info">
                <strong>${entry.username} ${isSelf ? '(ANDA)' : ''}</strong>
                <small>${entry.titleBadge} · ★${entry.activeHeroStars}</small>
              </div>
              <div class="dlb-cp">
                <span>CP ${entry.combatPower.toLocaleString('en-US')}</span>
                ${
                  isSelf
                    ? '<span class="dlb-self-tag">HUNTER</span>'
                    : `<button type="button" class="dlb-duel-btn" data-duel-target="${entry.hunterId}">⚔ DUEL</button>`
                }
              </div>
            </div>
          `;
        })
        .join('');

      deckTableEl.querySelectorAll<HTMLButtonElement>('[data-duel-target]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const targetId = btn.getAttribute('data-duel-target')!;
          await this.startDuelWith(targetId);
        });
      });
    }
  }

  public renderColosseumModalLeaderboard(
    profile: HunterProfileState,
    leaderboard: readonly LeaderboardCombatantEntry[]
  ): void {
    const tbodyEl = document.getElementById('colosseum-full-leaderboard-tbody');
    if (!tbodyEl) return;

    tbodyEl.innerHTML = leaderboard
      .map((entry, idx) => {
        const rank = entry.rank || idx + 1;
        const isSelf = entry.hunterId === profile.hunterId;
        const heroDef = getHeroById(entry.activeHeroId) || HEROES_CATALOG[0];
        const miniSvg = composeHeroPaperDollSvg({
          heroId: entry.activeHeroId,
          currentStars: entry.activeHeroStars,
          equippedLoadout: entry.equippedLoadout,
          sizePx: 48,
          showPedestal: false,
        });

        return `
          <tr class="colosseum-lb-tr ${isSelf ? 'is-self' : ''}">
            <td class="col-rank">
              <span class="rank-pill rank-${rank}">#${rank}</span>
            </td>
            <td class="col-hunter">
              <div class="lb-hunter-cell">
                <div class="lb-paperdoll-48">${miniSvg}</div>
                <div>
                  <strong>${entry.username} ${isSelf ? '✦' : ''}</strong>
                  <span class="lb-title-badge">${entry.titleBadge}</span>
                </div>
              </div>
            </td>
            <td class="col-hero">
              <strong>${heroDef.name}</strong>
              <span class="lb-stars">${'★'.repeat(entry.activeHeroStars)} · Lv.${entry.activeHeroLevel}</span>
            </td>
            <td class="col-code">
              <span class="lb-code-pill">Code Mastery: ${entry.solvedSpellsCount}/24 Spells</span>
            </td>
            <td class="col-cp">
              <strong>${entry.combatPower.toLocaleString('en-US')} CP</strong>
              <small style="display: block; color: #94a3b8;">Floor ${entry.arenaFloorCleared} · ${entry.arenaWins}W</small>
            </td>
            <td class="col-action">
              ${
                isSelf
                  ? `<span class="self-indicator">POSISI ANDA</span>`
                  : `<button type="button" class="challenge-duel-cta" data-duel-target="${entry.hunterId}">⚔ TANTANG DUEL</button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');

    tbodyEl.querySelectorAll<HTMLButtonElement>('[data-duel-target]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-duel-target')!;
        await this.startDuelWith(targetId);
      });
    });
  }

  public async startDuelWith(defenderHunterId: string): Promise<void> {
    if (this.isPlayingBattle) return;
    const profile = this.ctx.getProfile();
    const defender =
      this.ctx.getLeaderboard().find((e) => e.hunterId === defenderHunterId) ||
      this.ctx.getLeaderboard()[0];
    if (!profile || !defender) return;

    this.ctx.openModal('modal-colosseum-arena');
    const duelResult = await this.ctx.onChallengeOpponent(defenderHunterId);
    if (!duelResult) return;

    await this.playBattleSequence(profile, defender, duelResult);
  }

  private async playBattleSequence(
    challengerProfile: HunterProfileState,
    defenderEntry: LeaderboardCombatantEntry,
    duelResult: ColosseumDuelResult
  ): Promise<void> {
    this.isPlayingBattle = true;
    this.skipRequested = false;

    const leftStage = document.getElementById('arena-left-fighter-svg');
    const rightStage = document.getElementById('arena-right-fighter-svg');
    const leftNameEl = document.getElementById('arena-left-name');
    const rightNameEl = document.getElementById('arena-right-name');
    const leftHpFill = document.getElementById('arena-left-hp-fill');
    const rightHpFill = document.getElementById('arena-right-hp-fill');
    const leftHpText = document.getElementById('arena-left-hp-text');
    const rightHpText = document.getElementById('arena-right-hp-text');
    const leftManaFill = document.getElementById('arena-left-mana-fill');
    const rightManaFill = document.getElementById('arena-right-mana-fill');
    const logListEl = document.getElementById('arena-turn-combat-log');
    const bannerOutcomeEl = document.getElementById('arena-victory-banner');
    const floatLeftEl = document.getElementById('arena-left-floating-dmg');
    const floatRightEl = document.getElementById('arena-right-floating-dmg');

    const ownedCh = challengerProfile.ownedHeroes[challengerProfile.activeHeroId];
    if (leftStage) {
      leftStage.innerHTML = composeHeroPaperDollSvg({
        heroId: challengerProfile.activeHeroId,
        currentStars: ownedCh ? ownedCh.currentStars : 5,
        equippedLoadout: challengerProfile.equippedLoadout,
        sizePx: 175,
        showPedestal: true,
      });
    }
    if (rightStage) {
      rightStage.innerHTML = composeHeroPaperDollSvg({
        heroId: defenderEntry.activeHeroId,
        currentStars: defenderEntry.activeHeroStars,
        equippedLoadout: defenderEntry.equippedLoadout,
        sizePx: 175,
        showPedestal: true,
      });
    }

    if (leftNameEl) leftNameEl.textContent = `${challengerProfile.username} (CP ${duelResult.challengerCp.toLocaleString('en-US')})`;
    if (rightNameEl) rightNameEl.textContent = `${defenderEntry.username} (CP ${duelResult.defenderCp.toLocaleString('en-US')})`;
    if (leftHpFill) leftHpFill.style.width = '100%';
    if (rightHpFill) rightHpFill.style.width = '100%';
    if (leftManaFill) leftManaFill.style.width = '20%';
    if (rightManaFill) rightManaFill.style.width = '20%';
    if (leftHpText) leftHpText.textContent = `${duelResult.challengerMaxHp} / ${duelResult.challengerMaxHp} HP`;
    if (rightHpText) rightHpText.textContent = `${duelResult.defenderMaxHp} / ${duelResult.defenderMaxHp} HP`;
    if (logListEl) logListEl.innerHTML = '';
    if (bannerOutcomeEl) {
      bannerOutcomeEl.className = 'arena-victory-banner hidden';
      bannerOutcomeEl.innerHTML = '';
    }

    const btn1x = document.getElementById('arena-speed-1x-btn');
    const btn2x = document.getElementById('arena-speed-2x-btn');
    const btnSkip = document.getElementById('arena-skip-btn');

    if (btn1x) {
      btn1x.onclick = () => {
        this.playbackSpeed = 1;
        btn1x.classList.add('is-active');
        btn2x?.classList.remove('is-active');
      };
    }
    if (btn2x) {
      btn2x.onclick = () => {
        this.playbackSpeed = 2;
        btn2x.classList.add('is-active');
        btn1x?.classList.remove('is-active');
      };
    }
    if (btnSkip) {
      btnSkip.onclick = () => {
        this.skipRequested = true;
      };
    }

    for (const log of duelResult.turns) {
      const attackerIsLeft = log.actor === 'CHALLENGER';
      const attackerStage = attackerIsLeft ? leftStage : rightStage;
      const defenderStage = attackerIsLeft ? rightStage : leftStage;
      const defenderFloat = attackerIsLeft ? floatRightEl : floatLeftEl;

      if (!this.skipRequested) {
        if (log.isCrit) {
          playForgeAnvilSfx();
        } else {
          playEquipClinkSfx();
        }

        if (attackerStage) {
          attackerStage.classList.remove('fighter-dash-attack');
          void attackerStage.offsetWidth;
          attackerStage.classList.add('fighter-dash-attack');
        }
        if (defenderStage) {
          defenderStage.classList.remove('fighter-hit-shake');
          void defenderStage.offsetWidth;
          defenderStage.classList.add('fighter-hit-shake');
        }
        if (defenderFloat) {
          defenderFloat.innerHTML = `<span class="dmg-popup ${log.isCrit ? 'crit' : ''}">${log.isCrit ? 'CRITICAL! ' : ''}-${log.damageDealt}</span>`;
        }
      }

      const chHpPct = Math.max(0, Math.min(100, (log.challengerRemainingHp / duelResult.challengerMaxHp) * 100));
      const dfHpPct = Math.max(0, Math.min(100, (log.defenderRemainingHp / duelResult.defenderMaxHp) * 100));
      if (leftHpFill) leftHpFill.style.width = `${chHpPct}%`;
      if (rightHpFill) rightHpFill.style.width = `${dfHpPct}%`;
      if (leftHpText) leftHpText.textContent = `${log.challengerRemainingHp} / ${duelResult.challengerMaxHp} HP`;
      if (rightHpText) rightHpText.textContent = `${log.defenderRemainingHp} / ${duelResult.defenderMaxHp} HP`;
      if (leftManaFill) leftManaFill.style.width = `${(log.turnNumber * 33) % 100}%`;
      if (rightManaFill) rightManaFill.style.width = `${(log.turnNumber * 28) % 100}%`;

      if (logListEl) {
        const li = document.createElement('li');
        li.className = `turn-log-item ${log.isCrit ? 'is-crit' : ''}`;
        li.textContent = `[Turn ${log.turnNumber}] ${log.narrativeLine}`;
        logListEl.prepend(li);
      }

      if (!this.skipRequested) {
        const delayMs = this.playbackSpeed === 2 ? 200 : 380;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    const won = duelResult.winner === 'CHALLENGER';
    playGachaBeamSfx(won ? 5 : 3);
    if (bannerOutcomeEl) {
      bannerOutcomeEl.className = `arena-victory-banner ${won ? 'is-victory' : 'is-defeat'}`;
      bannerOutcomeEl.innerHTML = won
        ? `<strong>✦ [ VICTORY // RANK ASCENDED! ] ✦</strong><span>Hadiah Kemenangan: +${duelResult.rewardGems} 💎 Astral Gems & +${duelResult.rewardDust} ✨ Starlight Dust</span>`
        : `<strong>[ DEFEAT // TINGKATKAN GEAR & MANTRA KODE ANDA ]</strong><span>Hadiah Partisipasi: +${duelResult.rewardGems} 💎 Astral Gems & +${duelResult.rewardDust} ✨</span>`;
    }

    this.isPlayingBattle = false;
  }
}
