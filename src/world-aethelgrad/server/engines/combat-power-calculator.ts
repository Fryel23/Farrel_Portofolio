/**
 * src/world-aethelgrad/server/engines/combat-power-calculator.ts
 * Mesin Kalkulasi Combat Power (CP) & Sinergi Stat Multi-Faktor Aethelgrad.
 */

import { CODE_SPELLS_CATALOG } from '../../catalog/code-spells-catalog.ts';
import { GRIMOIRE_COLLECTIONS } from '../../catalog/grimoire-collections.ts';
import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index.ts';
import { getEquipmentById } from '../../catalog/items-index.ts';
import type { CombatStatBreakdown, HunterProfileState } from '../../types/colosseum.types.ts';
import type { EquipmentSlot } from '../../types/equipment.types.ts';

const SLOTS: readonly EquipmentSlot[] = [
  'WEAPON',
  'ARMOR',
  'HELMET',
  'OFFHAND',
  'RELIC_CAPE',
];

/**
 * Menghitung apakah sebuah ikatan koleksi Grimoire sudah terpenuhi oleh inventaris Hunter.
 */
export function isGrimoireBondUnlocked(
  bondId: string,
  ownedHeroIds: ReadonlySet<string>,
  ownedItemIds: ReadonlySet<string>
): boolean {
  const bond = GRIMOIRE_COLLECTIONS.find((b) => b.id === bondId);
  if (!bond) return false;
  for (const hId of bond.requiredHeroIds) {
    if (!ownedHeroIds.has(hId)) return false;
  }
  for (const iId of bond.requiredItemIds) {
    if (!ownedItemIds.has(iId)) return false;
  }
  return true;
}

/**
 * Menghitung rincian stat tempur dan Total Combat Power (CP) seorang Hunter.
 */
export function calculateHunterCombatStats(profile: HunterProfileState): CombatStatBreakdown {
  const hero = getHeroById(profile.activeHeroId) || HEROES_CATALOG[0];
  const ownedHero = profile.ownedHeroes[hero.id] || {
    heroId: hero.id,
    currentStars: hero.baseStars,
    level: 1,
    soulShards: 0,
    dupesPulled: 0,
    unlockedAtIso: '',
  };

  // Multiplier promosi bintang: Hero bintang rendah yang dipromosikan hingga ★5
  // mendapatkan lonjakan kurva pertumbuhan ekstra ("Indomitable Growth")
  const promotionsDone = Math.max(0, ownedHero.currentStars - hero.baseStars);
  const starScale =
    1 +
    (ownedHero.currentStars - 1) * 0.24 +
    promotionsDone * (hero.baseStars <= 2 ? 0.14 : 0.08);
  const levelScale = 1 + (Math.max(1, ownedHero.level) - 1) * 0.035;

  const baseHp = Math.round(hero.baseHp * starScale * levelScale);
  const baseAtk = Math.round(hero.baseAtk * starScale * levelScale);
  const baseDef = Math.round(hero.baseDef * starScale * levelScale);
  const baseSpd = Math.round(hero.baseSpd + promotionsDone * 4 + Math.floor(ownedHero.level / 5));
  const baseCritPct = Math.min(75, hero.baseCritPct + promotionsDone * 2);

  let gearBonusHp = 0;
  let gearBonusAtk = 0;
  let gearBonusDef = 0;
  let gearBonusSpd = 0;
  let gearBonusCritPct = 0;
  let signatureResonanceBonusPct = 0;

  for (const slot of SLOTS) {
    const itemId = profile.equippedLoadout[slot];
    const item = getEquipmentById(itemId);
    if (!item) continue;

    const ownedItem = profile.ownedEquipment[item.id];
    const enhanceLv = ownedItem ? Math.max(0, ownedItem.enhanceLevel) : 0;
    const enhanceMultiplier = 1 + enhanceLv * 0.08;

    gearBonusHp += Math.round(item.bonusHp * enhanceMultiplier);
    gearBonusAtk += Math.round(item.bonusAtk * enhanceMultiplier);
    gearBonusDef += Math.round(item.bonusDef * enhanceMultiplier);
    gearBonusSpd += Math.round(item.bonusSpd * (1 + enhanceLv * 0.03));
    gearBonusCritPct += item.bonusCritPct;

    if (
      item.exclusiveHeroId === hero.id ||
      hero.signatureWeaponId === item.id
    ) {
      signatureResonanceBonusPct += 18;
    }
  }

  // Bonus Grimoire Collections
  const ownedHeroSet = new Set(Object.keys(profile.ownedHeroes));
  const ownedItemSet = new Set(Object.keys(profile.ownedEquipment));
  let grimoireAtkPct = 0;
  let grimoireHpPct = 0;
  let grimoireDefPct = 0;
  let grimoireCritPct = 0;

  for (const bond of GRIMOIRE_COLLECTIONS) {
    if (isGrimoireBondUnlocked(bond.id, ownedHeroSet, ownedItemSet)) {
      if (bond.bonusStatType === 'ATK_PCT') grimoireAtkPct += bond.bonusValuePct;
      else if (bond.bonusStatType === 'HP_PCT') grimoireHpPct += bond.bonusValuePct;
      else if (bond.bonusStatType === 'DEF_PCT') grimoireDefPct += bond.bonusValuePct;
      else if (bond.bonusStatType === 'CRIT_PCT') grimoireCritPct += bond.bonusValuePct;
      else if (bond.bonusStatType === 'ALL_STATS_PCT') {
        grimoireAtkPct += bond.bonusValuePct;
        grimoireHpPct += bond.bonusValuePct;
        grimoireDefPct += bond.bonusValuePct;
      }
    }
  }
  const grimoireBonusPct = grimoireAtkPct + grimoireHpPct + grimoireDefPct + grimoireCritPct;

  // Bonus permanen dari Code-Spell Sanctum
  const solvedSet = new Set(profile.solvedSpellIds);
  let codeAtkPct = 0;
  let codeHpPct = 0;
  let codeDefPct = 0;
  let codeCritPct = 0;

  for (const spell of CODE_SPELLS_CATALOG) {
    if (solvedSet.has(spell.id)) {
      codeAtkPct += spell.permanentBuffPct.atkPct;
      codeHpPct += spell.permanentBuffPct.hpPct;
      codeDefPct += spell.permanentBuffPct.defPct;
      codeCritPct += spell.permanentBuffPct.critPct;
    }
  }

  const totalHpMult = 1 + (grimoireHpPct + codeHpPct + signatureResonanceBonusPct * 0.5) / 100;
  const totalAtkMult = 1 + (grimoireAtkPct + codeAtkPct + signatureResonanceBonusPct) / 100;
  const totalDefMult = 1 + (grimoireDefPct + codeDefPct + signatureResonanceBonusPct * 0.5) / 100;

  const finalHp = Math.round((baseHp + gearBonusHp) * totalHpMult);
  const finalAtk = Math.round((baseAtk + gearBonusAtk) * totalAtkMult);
  const finalDef = Math.round((baseDef + gearBonusDef) * totalDefMult);
  const finalSpd = baseSpd + gearBonusSpd;
  const finalCritPct = Math.min(95, baseCritPct + gearBonusCritPct + grimoireCritPct + codeCritPct);

  // Rumus otoritatif Combat Power (CP)
  const rawCp =
    finalHp * 0.55 +
    finalAtk * 4.4 +
    finalDef * 2.8 +
    finalSpd * 14 +
    finalCritPct * 32 +
    ownedHero.currentStars * 450;

  const totalCombatPower = Math.round(rawCp);

  return {
    baseHp,
    baseAtk,
    baseDef,
    baseSpd,
    baseCritPct,
    gearBonusHp,
    gearBonusAtk,
    gearBonusDef,
    gearBonusSpd,
    gearBonusCritPct,
    signatureResonanceBonusPct,
    grimoireBonusPct,
    codeSanctumBonusPct: {
      atkPct: codeAtkPct,
      hpPct: codeHpPct,
      defPct: codeDefPct,
      critPct: codeCritPct,
    },
    finalHp,
    finalAtk,
    finalDef,
    finalSpd,
    finalCritPct,
    totalCombatPower,
  };
}
