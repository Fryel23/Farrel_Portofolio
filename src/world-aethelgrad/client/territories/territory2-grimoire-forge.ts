import type { HunterProfileState } from '../../types/colosseum.types';
import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index';
import { getEquipmentById, ITEMS_CATALOG } from '../../catalog/items-index';
import { GRIMOIRE_COLLECTIONS } from '../../catalog/grimoire-collections';
import { composeHeroPaperDollSvg } from '../../svg-paperdoll/paperdoll-composer';
import { isGrimoireBondUnlocked } from '../../server/engines/combat-power-calculator';
import type { ForgeActionType } from '../../server/engines/forge-synthesis-engine';
import { playForgeAnvilSfx } from '../audio/aethelgrad-sound-synth';

export interface Territory2Context {
  getProfile: () => HunterProfileState | null;
  onForgeUpgrade: (action: ForgeActionType, targetId: string) => Promise<void>;
}

export class Territory2GrimoireForgeController {
  private ctx: Territory2Context;

  constructor(ctx: Territory2Context) {
    this.ctx = ctx;
  }

  public syncWithProfile(): void {
    const profile = this.ctx.getProfile();
    if (!profile) return;

    this.renderHubDeckSummary(profile);
    this.renderGrimoireAndForgeModal(profile);
  }

  public renderHubDeckSummary(profile: HunterProfileState): void {
    const ownedHeroesCountEl = document.getElementById('hub-owned-heroes-count');
    const ownedItemsCountEl = document.getElementById('hub-owned-items-count');
    const activeBondsCountEl = document.getElementById('hub-active-bonds-count');

    const ownedHeroIds = new Set(Object.keys(profile.ownedHeroes));
    const ownedItemIds = new Set(Object.keys(profile.ownedEquipment));

    const unlockedBonds = GRIMOIRE_COLLECTIONS.filter((bond) =>
      isGrimoireBondUnlocked(bond.id, ownedHeroIds, ownedItemIds)
    );

    if (ownedHeroesCountEl) {
      ownedHeroesCountEl.textContent = `${ownedHeroIds.size} / ${HEROES_CATALOG.length} Heroes`;
    }
    if (ownedItemsCountEl) {
      ownedItemsCountEl.textContent = `${ownedItemIds.size} / ${ITEMS_CATALOG.length} Gear`;
    }
    if (activeBondsCountEl) {
      activeBondsCountEl.textContent = `${unlockedBonds.length} / ${GRIMOIRE_COLLECTIONS.length} Bonds`;
    }
  }

  public renderGrimoireAndForgeModal(profile: HunterProfileState): void {
    const promoteListEl = document.getElementById('forge-promote-heroes-list');
    const enhanceGridEl = document.getElementById('forge-synthesis-fodder-grid');
    const bondsGrid = document.getElementById('grimoire-bonds-grid');
    const heroesEncyclopedia = document.getElementById('grimoire-heroes-encyclopedia');
    const itemsEncyclopedia = document.getElementById('grimoire-items-encyclopedia');

    const ownedHeroIds = new Set(Object.keys(profile.ownedHeroes));
    const ownedItemIds = new Set(Object.keys(profile.ownedEquipment));

    // 1. Hero Star Promotion & Level Up Forge
    if (promoteListEl) {
      promoteListEl.innerHTML = Object.values(profile.ownedHeroes)
        .map((oh) => {
          const def = getHeroById(oh.heroId);
          if (!def) return '';
          const isMaxStar = oh.currentStars >= 5;
          const shardCost = oh.currentStars * 20;
          const dustCost = oh.currentStars * 35;
          const lvDustCost = 15 + oh.level * 5;

          const miniSvg = composeHeroPaperDollSvg({
            heroId: def.id,
            currentStars: oh.currentStars,
            sizePx: 62,
            showPedestal: false,
          });

          return `
            <div class="forge-promote-card rarity-${oh.currentStars}">
              <div class="fp-avatar">${miniSvg}</div>
              <div class="fp-details">
                <strong>${def.name} <span class="fp-stars">${'★'.repeat(oh.currentStars)}</span></strong>
                <span class="fp-sub">Lv.${oh.level} · Shards: ${oh.soulShards} · ${def.passiveSkillName}</span>
              </div>
              <div class="fp-actions">
                ${
                  isMaxStar
                    ? `<span class="fp-max-badge" style="color: #fbbf24; font-size: 0.65rem;">✦ ★5 SOVEREIGN</span>`
                    : `
                      <button
                        type="button"
                        class="fp-btn"
                        data-forge-action="PROMOTE_HERO_STAR"
                        data-forge-target="${oh.heroId}"
                        ${oh.soulShards < shardCost && profile.starlightDust < dustCost ? 'disabled' : ''}
                      >
                        AWAKEN ★${oh.currentStars + 1} (${shardCost} Shards / ${dustCost} ✨)
                      </button>
                    `
                }
                <button
                  type="button"
                  class="fp-btn"
                  data-forge-action="LEVEL_UP_HERO"
                  data-forge-target="${oh.heroId}"
                  ${oh.level >= 60 || profile.starlightDust < lvDustCost ? 'disabled' : ''}
                >
                  TRAIN LV.+5 (${lvDustCost} ✨)
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      promoteListEl.querySelectorAll<HTMLButtonElement>('[data-forge-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const action = btn.getAttribute('data-forge-action') as ForgeActionType;
          const targetId = btn.getAttribute('data-forge-target')!;
          playForgeAnvilSfx();
          await this.ctx.onForgeUpgrade(action, targetId);
        });
      });
    }

    // 2. Equipment Forge Enhancement (+0 -> +15)
    if (enhanceGridEl) {
      enhanceGridEl.innerHTML = Object.values(profile.ownedEquipment)
        .map((oe) => {
          const def = getEquipmentById(oe.itemId);
          if (!def) return '';
          const dustCost = 20 + oe.enhanceLevel * 15;
          const canEnhance = oe.enhanceLevel < 15 && profile.starlightDust >= dustCost;

          return `
            <button
              type="button"
              class="forge-fodder-tile rarity-${def.rarityStars}"
              data-enhance-item="${def.id}"
              ${!canEnhance ? 'disabled' : ''}
            >
              <span class="ff-stars">${'★'.repeat(def.rarityStars)} · +${oe.enhanceLevel}</span>
              <strong>${def.name}</strong>
              <small>${oe.enhanceLevel >= 15 ? 'MAX +15' : `TEMPA +${oe.enhanceLevel + 1} (${dustCost} ✨)`}</small>
            </button>
          `;
        })
        .join('');

      enhanceGridEl.querySelectorAll<HTMLButtonElement>('[data-enhance-item]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const itemId = btn.getAttribute('data-enhance-item')!;
          playForgeAnvilSfx();
          await this.ctx.onForgeUpgrade('ENHANCE_EQUIPMENT', itemId);
        });
      });
    }

    // 3. 12 Grimoire Collection Bonds
    if (bondsGrid) {
      bondsGrid.innerHTML = GRIMOIRE_COLLECTIONS.map((bond) => {
        const isComplete = isGrimoireBondUnlocked(bond.id, ownedHeroIds, ownedItemIds);
        const reqPills = [
          ...bond.requiredHeroIds.map((hId) => {
            const h = getHeroById(hId);
            const has = ownedHeroIds.has(hId);
            return `<span class="bond-req-pill ${has ? 'owned' : 'missing'}">${has ? '✓' : '○'} ${h ? h.name : hId}</span>`;
          }),
          ...bond.requiredItemIds.map((iId) => {
            const item = getEquipmentById(iId);
            const has = ownedItemIds.has(iId);
            return `<span class="bond-req-pill ${has ? 'owned' : 'missing'}">${has ? '✓' : '○'} ${item ? item.name.split(',')[0] : iId}</span>`;
          }),
        ].join('');

        return `
          <div class="grimoire-bond-card ${isComplete ? 'is-complete' : 'is-locked'}">
            <div class="bond-card-top">
              <strong>${bond.title}</strong>
              <span class="bond-status-badge">${isComplete ? '✦ BOND ACTIVE' : 'LOCKED'}</span>
            </div>
            <p class="bond-lore">${bond.lore}</p>
            <div class="bond-req-list">${reqPills}</div>
            <div class="bond-bonus-footer">
              <span>PERMANENT ACCOUNT BUFF:</span>
              <strong>+${bond.bonusValuePct}% ${bond.bonusStatType.replace('_PCT', '')}</strong>
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. 24 Heroes Encyclopedia
    if (heroesEncyclopedia) {
      heroesEncyclopedia.innerHTML = HEROES_CATALOG.map((hero) => {
        const owned = profile.ownedHeroes[hero.id];
        const stars = owned ? owned.currentStars : hero.baseStars;
        const svg = composeHeroPaperDollSvg({
          heroId: hero.id,
          currentStars: stars,
          sizePx: 68,
          showPedestal: false,
        });

        return `
          <div class="grimoire-entry-card rarity-${stars} ${owned ? 'is-owned' : 'is-silhouette'}">
            <div class="ge-svg-wrap">${svg}</div>
            <div class="ge-info">
              <span class="ge-stars">${'★'.repeat(stars)}</span>
              <strong>${hero.name}</strong>
              <small>${hero.title}</small>
              <span class="ge-class">${hero.role} · ${hero.element}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 5. 50 Equipment Items Encyclopedia
    if (itemsEncyclopedia) {
      itemsEncyclopedia.innerHTML = ITEMS_CATALOG.map((item) => {
        const has = ownedItemIds.has(item.id);
        return `
          <div class="grimoire-item-tile rarity-${item.rarityStars} ${has ? 'is-owned' : 'is-unowned'}">
            <div class="git-top">
              <span class="git-slot">${item.slot}</span>
              <span class="git-stars">${'★'.repeat(item.rarityStars)}</span>
            </div>
            <strong>${item.name}</strong>
            <p style="margin: 0.25rem 0;">${item.lore}</p>
            <span class="git-status">${has ? '✓ Tercatat di Grimoire' : 'Belum Ditemukan'}</span>
          </div>
        `;
      }).join('');
    }
  }
}
