import type { HunterProfileState } from '../../types/colosseum.types';
import type { EquipmentSlot } from '../../types/equipment.types';
import type { GachaBannerId, SingleGachaDrop } from '../../types/gacha.types';
import type { HeroRarityStars } from '../../types/hero.types';
import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index';
import { getEquipmentById, ITEMS_CATALOG } from '../../catalog/items-index';
import { composeHeroPaperDollSvg } from '../../svg-paperdoll/paperdoll-composer';
import { calculateHunterCombatStats } from '../../server/engines/combat-power-calculator';
import {
  playEquipClinkSfx,
  playGachaBeamSfx,
  playTitleStartChime,
} from '../audio/aethelgrad-sound-synth';

export interface Territory1Context {
  getProfile: () => HunterProfileState | null;
  onSummon: (bannerId: GachaBannerId, pullCount: 1 | 10, useTickets: boolean) => Promise<void>;
  onEquip: (slot: EquipmentSlot, itemId: string | null) => Promise<void>;
  onSelectActiveHero: (heroId: string) => Promise<void>;
  openModal: (modalId: string) => void;
}

const ALL_SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR', 'HELMET', 'OFFHAND', 'RELIC_CAPE'];

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: 'SENJATA UTAMA',
  ARMOR: 'ZIRAH TUBUH',
  HELMET: 'MAHKOTA / HELM',
  OFFHAND: 'PERISAI / OFF-HAND',
  RELIC_CAPE: 'SAYAP / JUBAH AURA',
};

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  WEAPON: '⚔',
  ARMOR: '🛡',
  HELMET: '👑',
  OFFHAND: '❖',
  RELIC_CAPE: '✦',
};

export class Territory1AltarBarracksController {
  private ctx: Territory1Context;
  private selectedSlotFilter: EquipmentSlot | 'ALL' = 'ALL';
  private activeBanner: GachaBannerId = 'HERO_SOVEREIGN_BANNER';

  constructor(ctx: Territory1Context) {
    this.ctx = ctx;
  }

  public syncWithProfile(): void {
    const profile = this.ctx.getProfile();
    if (!profile) return;

    this.renderDeckCard(profile);
    this.renderBarracksModal(profile);
  }

  public renderDeckCard(profile: HunterProfileState): void {
    const stageEl = document.getElementById('grotto-pedestal-svg-stage');
    const heroNameEl = document.getElementById('grotto-active-hero-name');
    const heroStarsEl = document.getElementById('grotto-active-hero-stars');
    const heroCpEl = document.getElementById('grotto-active-hero-cp');
    const slotsContainer = document.getElementById('grotto-quick-slots');
    const pityCountEl = document.getElementById('grotto-pity-counter');
    const bannerBadgeEl = document.getElementById('grotto-banner-badge');

    const heroDef = getHeroById(profile.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = profile.ownedHeroes[heroDef.id];
    const currentStars = ownedHero ? ownedHero.currentStars : heroDef.baseStars;
    const combatStats = calculateHunterCombatStats(profile);

    const svg = composeHeroPaperDollSvg({
      heroId: heroDef.id,
      currentStars,
      equippedLoadout: profile.equippedLoadout,
      sizePx: 195,
      showPedestal: true,
      className: 'aethelgrad-paperdoll-svg',
    });

    if (stageEl) {
      stageEl.innerHTML = svg;
    }
    if (heroNameEl) {
      heroNameEl.textContent = `${heroDef.name} (${heroDef.title})`;
    }
    if (heroStarsEl) {
      heroStarsEl.textContent = '★'.repeat(currentStars);
    }
    if (heroCpEl) {
      heroCpEl.textContent = `CP ${combatStats.totalCombatPower.toLocaleString('en-US')}`;
    }
    if (pityCountEl) {
      pityCountEl.textContent = `Pity ★5: ${profile.pity5StarCounter}/50 (Hard Pity)`;
    }
    if (bannerBadgeEl) {
      bannerBadgeEl.textContent =
        this.activeBanner === 'HERO_SOVEREIGN_BANNER'
          ? 'BANNER: HERO SOVEREIGN ALTAR'
          : this.activeBanner === 'ARMS_RELIC_BANNER'
          ? 'BANNER: DIVINE ARMS & RELIC ALTAR'
          : 'BANNER: STANDARD ASTRAL ALTAR';
    }

    if (slotsContainer) {
      slotsContainer.innerHTML = ALL_SLOTS.map((slot) => {
        const eqId = profile.equippedLoadout[slot];
        const item = getEquipmentById(eqId);
        const rarityStars = item ? '★'.repeat(item.rarityStars) : '';
        return `
          <button
            type="button"
            class="grotto-slot-chip ${item ? `is-equipped rarity-${item.rarityStars}` : 'is-empty'}"
            data-open-slot="${slot}"
            title="${item ? `${item.name} (${rarityStars})` : `Slot ${SLOT_LABELS[slot]} Kosong`}"
          >
            <span class="slot-chip-icon">${SLOT_ICONS[slot]}</span>
            <span class="slot-chip-info">
              <span class="slot-chip-label">${slot}</span>
              <span class="slot-chip-value">${item ? item.name.split(',')[0] : 'Kosong +'}</span>
            </span>
            ${item ? `<span class="slot-chip-stars">${rarityStars}</span>` : ''}
          </button>
        `;
      }).join('');

      slotsContainer.querySelectorAll<HTMLButtonElement>('[data-open-slot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const slot = btn.getAttribute('data-open-slot') as EquipmentSlot;
          this.selectedSlotFilter = slot;
          playTitleStartChime();
          const p = this.ctx.getProfile();
          if (p) this.renderBarracksModal(p);
          this.ctx.openModal('modal-barracks-wardrobe');
        });
      });
    }
  }

  public renderBarracksModal(profile: HunterProfileState): void {
    const stageEl = document.getElementById('barracks-main-paperdoll-stage');
    const heroListEl = document.getElementById('barracks-owned-heroes-list');
    const equipSlotsEl = document.getElementById('barracks-5-slots-strip');
    const invListEl = document.getElementById('barracks-inventory-grid');
    const heroStatsEl = document.getElementById('barracks-hero-live-stats');
    const primaryToggleBtn = document.getElementById('barracks-set-primary-btn') as HTMLButtonElement | null;

    const heroDef = getHeroById(profile.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = profile.ownedHeroes[heroDef.id];
    const currentStars = ownedHero ? ownedHero.currentStars : heroDef.baseStars;
    const combatStats = calculateHunterCombatStats(profile);

    if (stageEl) {
      stageEl.innerHTML = composeHeroPaperDollSvg({
        heroId: heroDef.id,
        currentStars,
        equippedLoadout: profile.equippedLoadout,
        sizePx: 250,
        showPedestal: true,
        className: 'aethelgrad-paperdoll-svg',
      });
    }

    if (primaryToggleBtn) {
      primaryToggleBtn.textContent = `✦ KARAKTER AKTIF: ${heroDef.name.toUpperCase()}`;
      primaryToggleBtn.disabled = true;
    }

    if (heroStatsEl) {
      heroStatsEl.innerHTML = `
        <div class="barracks-hero-header">
          <div>
            <span class="barracks-class-pill">${heroDef.role} · ${heroDef.element}</span>
            <h4 class="barracks-hero-title">${heroDef.name} · ${heroDef.title}</h4>
          </div>
          <div class="grotto-stars-display">
            ${'★'.repeat(currentStars)}
          </div>
        </div>
        <p class="barracks-hero-lore">${heroDef.lore}</p>
        <div class="barracks-stat-bars">
          <div class="b-stat-item"><span>HP</span><strong>${combatStats.finalHp}</strong><small>(+${combatStats.gearBonusHp})</small></div>
          <div class="b-stat-item"><span>ATK</span><strong>${combatStats.finalAtk}</strong><small>(+${combatStats.gearBonusAtk})</small></div>
          <div class="b-stat-item"><span>DEF</span><strong>${combatStats.finalDef}</strong><small>(+${combatStats.gearBonusDef})</small></div>
          <div class="b-stat-item"><span>SPD</span><strong>${combatStats.finalSpd}</strong><small>(+${combatStats.gearBonusSpd})</small></div>
          <div class="b-stat-item"><span>CRIT</span><strong>${combatStats.finalCritPct}%</strong><small>(+${combatStats.gearBonusCritPct}%)</small></div>
          <div class="b-stat-item"><span>SHARDS</span><strong>${ownedHero ? ownedHero.soulShards : 0}</strong><small>Lv.${ownedHero ? ownedHero.level : 1}</small></div>
        </div>
        <div class="barracks-ult-box">
          <span class="ult-tag">BURST SKILL</span>
          <strong>${heroDef.burstSkillName}</strong>
          <p style="margin: 0.2rem 0 0;">${heroDef.burstSkillDesc}</p>
        </div>
      `;
    }

    if (equipSlotsEl) {
      equipSlotsEl.innerHTML = ALL_SLOTS.map((slot) => {
        const item = getEquipmentById(profile.equippedLoadout[slot]);
        const isSelected = this.selectedSlotFilter === slot;
        return `
          <div class="barracks-slot-box ${item ? `rarity-${item.rarityStars}` : 'empty'} ${isSelected ? 'is-selected' : ''}" data-filter-slot="${slot}">
            <div class="slot-box-top">
              <span class="slot-box-icon">${SLOT_ICONS[slot]}</span>
              <span class="slot-box-name">${SLOT_LABELS[slot]}</span>
            </div>
            <div class="slot-box-item">
              ${
                item
                  ? `<strong>${item.name}</strong><span class="slot-stars">${'★'.repeat(item.rarityStars)}</span>`
                  : `<em>Belum Dipasang</em>`
              }
            </div>
          </div>
        `;
      }).join('');

      equipSlotsEl.querySelectorAll<HTMLElement>('[data-filter-slot]').forEach((el) => {
        el.addEventListener('click', () => {
          const slot = el.getAttribute('data-filter-slot') as EquipmentSlot;
          this.selectedSlotFilter = this.selectedSlotFilter === slot ? 'ALL' : slot;
          const p = this.ctx.getProfile();
          if (p) this.renderBarracksModal(p);
        });
      });
    }

    if (heroListEl) {
      const ownedList = Object.values(profile.ownedHeroes);
      heroListEl.innerHTML = ownedList
        .map((oh) => {
          const def = getHeroById(oh.heroId);
          if (!def) return '';
          const miniSvg = composeHeroPaperDollSvg({
            heroId: def.id,
            currentStars: oh.currentStars,
            equippedLoadout: oh.heroId === profile.activeHeroId ? profile.equippedLoadout : {},
            sizePx: 54,
            showPedestal: false,
          });
          const isSelected = oh.heroId === profile.activeHeroId;
          return `
            <button type="button" class="barracks-hero-card ${isSelected ? 'is-selected' : ''}" data-select-hero="${oh.heroId}">
              <div class="bh-mini-svg">${miniSvg}</div>
              <div class="bh-meta">
                <div class="bh-name-row">
                  <strong>${def.name}</strong>
                  ${isSelected ? '<span class="bh-main-tag">AKTIF</span>' : ''}
                </div>
                <span class="bh-stars">${'★'.repeat(oh.currentStars)} · Lv.${oh.level}</span>
                <span class="bh-class">${def.role}</span>
              </div>
            </button>
          `;
        })
        .join('');

      heroListEl.querySelectorAll<HTMLButtonElement>('[data-select-hero]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const hId = btn.getAttribute('data-select-hero');
          if (hId) {
            playEquipClinkSfx();
            await this.ctx.onSelectActiveHero(hId);
          }
        });
      });
    }

    if (invListEl) {
      const ownedEqList = Object.values(profile.ownedEquipment)
        .map((oe) => ({ state: oe, def: getEquipmentById(oe.itemId) }))
        .filter((x) => {
          if (!x.def) return false;
          if (this.selectedSlotFilter === 'ALL') return true;
          return x.def.slot === this.selectedSlotFilter;
        });

      if (ownedEqList.length === 0) {
        invListEl.innerHTML = `<div class="inv-empty-state">Tidak ada perlengkapan pada filter slot ini. Tarik Gacha di Altar!</div>`;
      } else {
        invListEl.innerHTML = ownedEqList
          .map(({ state, def }) => {
            if (!def) return '';
            const isEquippedHere = profile.equippedLoadout[def.slot] === def.id;
            const statSummary = [
              def.bonusAtk ? `+${def.bonusAtk} ATK` : '',
              def.bonusHp ? `+${def.bonusHp} HP` : '',
              def.bonusDef ? `+${def.bonusDef} DEF` : '',
              def.bonusSpd ? `+${def.bonusSpd} SPD` : '',
              def.bonusCritPct ? `+${def.bonusCritPct}% CRIT` : '',
            ]
              .filter(Boolean)
              .join(' · ');

            return `
              <div class="inv-item-card rarity-${def.rarityStars} ${isEquippedHere ? 'is-equipped-here' : ''}">
                <div class="inv-item-header">
                  <span class="inv-slot-tag">${SLOT_ICONS[def.slot]} ${def.slot} (+${state.enhanceLevel})</span>
                  <span class="inv-rarity-stars">${'★'.repeat(def.rarityStars)}</span>
                </div>
                <strong class="inv-item-name">${def.name}</strong>
                <span class="inv-item-stats">${statSummary}</span>
                <div class="inv-item-actions">
                  <button
                    type="button"
                    class="inv-equip-btn ${isEquippedHere ? 'unequip' : 'equip'}"
                    data-equip-item-id="${def.id}"
                    data-equip-slot="${def.slot}"
                    data-currently-equipped="${isEquippedHere ? '1' : '0'}"
                  >
                    ${isEquippedHere ? 'LEPAS [UNEQUIP]' : 'PASANG [EQUIP]'}
                  </button>
                </div>
              </div>
            `;
          })
          .join('');

        invListEl.querySelectorAll<HTMLButtonElement>('[data-equip-item-id]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const itemId = btn.getAttribute('data-equip-item-id')!;
            const slot = btn.getAttribute('data-equip-slot') as EquipmentSlot;
            const currentlyEquipped = btn.getAttribute('data-currently-equipped') === '1';

            const beforeProf = this.ctx.getProfile();
            const oldCp = beforeProf ? calculateHunterCombatStats(beforeProf).totalCombatPower : 0;

            playEquipClinkSfx();
            await this.ctx.onEquip(slot, currentlyEquipped ? null : itemId);

            const afterProf = this.ctx.getProfile();
            const newCp = afterProf ? calculateHunterCombatStats(afterProf).totalCombatPower : 0;
            this.triggerPowerUpEffect(slot, oldCp, newCp);
          });
        });
      }
    }
  }

  public triggerPowerUpEffect(slot: EquipmentSlot, oldCp: number, newCp: number): void {
    const stageEl = document.getElementById('barracks-main-paperdoll-stage');
    const floatContainer = document.getElementById('barracks-floating-combat-text');
    if (stageEl) {
      stageEl.classList.remove('paperdoll-powerup-stance');
      void stageEl.offsetWidth;
      stageEl.classList.add('paperdoll-powerup-stance');
    }

    if (floatContainer) {
      const diff = newCp - oldCp;
      const sign = diff >= 0 ? '+' : '';
      const badge = document.createElement('div');
      badge.className = `floating-cp-toast`;
      badge.textContent = `${SLOT_LABELS[slot]} UPDATED · CP ${oldCp.toLocaleString('en-US')} -> ${newCp.toLocaleString('en-US')} (${sign}${diff})`;
      floatContainer.innerHTML = '';
      floatContainer.appendChild(badge);
    }
  }

  public showSummonRevealModal(
    drops: readonly SingleGachaDrop[],
    highestRarity: HeroRarityStars
  ): void {
    playGachaBeamSfx(highestRarity);
    const modalGrid = document.getElementById('gacha-reveal-cards-grid');
    const portalHeader = document.getElementById('gacha-reveal-rarity-banner');

    if (portalHeader) {
      portalHeader.className = `gacha-reveal-header rarity-${highestRarity}`;
      portalHeader.textContent =
        highestRarity === 5
          ? '✦ MYTHIC ★5 ASTRAL MANIFESTATION! ✦'
          : highestRarity === 4
          ? '★4 EPIC CONSTELLATION RESONANCE!'
          : 'SUMMONING PORTAL MANIFESTATION';
    }

    if (modalGrid) {
      modalGrid.innerHTML = drops
        .map((drop, idx) => {
          let previewSvg = '';
          let subLabel = '';
          if (drop.kind === 'HERO') {
            previewSvg = composeHeroPaperDollSvg({
              heroId: drop.entryId,
              currentStars: drop.rarityStars,
              sizePx: 108,
              showPedestal: true,
            });
            subLabel = drop.isNewUnlock
              ? 'NEW HERO UNLOCKED!'
              : `DUPLICATE -> +${drop.convertedSoulShards} Soul Shards`;
          } else {
            const itemDef = getEquipmentById(drop.entryId);
            const slot = itemDef ? itemDef.slot : 'WEAPON';
            previewSvg = composeHeroPaperDollSvg({
              heroId: 'hero-han-islat',
              currentStars: drop.rarityStars,
              equippedLoadout: { [slot]: drop.entryId },
              sizePx: 108,
              showPedestal: false,
            });
            subLabel = `${slot} GEAR ACQUIRED`;
          }

          return `
            <div class="gacha-flip-card rarity-${drop.rarityStars}" style="animation-delay: ${idx * 70}ms">
              <div class="gacha-card-stars">${'★'.repeat(drop.rarityStars)}</div>
              <div class="gacha-card-svg">${previewSvg}</div>
              <strong class="gacha-card-name">${drop.name}</strong>
              <span class="gacha-card-sub ${drop.isNewUnlock ? 'is-new' : ''}">${subLabel}</span>
            </div>
          `;
        })
        .join('');
    }

    this.ctx.openModal('modal-gacha-reveal');
  }

  public cycleBanner(): void {
    if (this.activeBanner === 'HERO_SOVEREIGN_BANNER') {
      this.activeBanner = 'ARMS_RELIC_BANNER';
    } else if (this.activeBanner === 'ARMS_RELIC_BANNER') {
      this.activeBanner = 'STANDARD_ASTRAL_ALTAR';
    } else {
      this.activeBanner = 'HERO_SOVEREIGN_BANNER';
    }
    this.syncWithProfile();
  }

  public getActiveBanner(): GachaBannerId {
    return this.activeBanner;
  }
}
