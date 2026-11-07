/**
 * src/world-aethelgrad/types/equipment.types.ts
 * Domain contracts untuk 50 Equipment Items (5 Slot) & Visual Sprite Modifiers.
 */

import type { HeroElement, HeroRarityStars } from './hero.types.ts';

export type EquipmentSlot =
  | 'WEAPON'
  | 'ARMOR'
  | 'HELMET'
  | 'OFFHAND'
  | 'RELIC_CAPE';

export type WeaponArchetype =
  | 'LONGSWORD'
  | 'GREATSWORD'
  | 'ARCANE_STAFF'
  | 'TWIN_DAGGERS'
  | 'HALBERD_SPEAR'
  | 'ASTRAL_BOW';

export type ArmorArchetype =
  | 'PLATE_CUIRASS'
  | 'MYSTIC_ROBE'
  | 'SHADOW_TRENCH'
  | 'DRAGON_SCALE'
  | 'RUNIC_BRIGANDINE';

export type HelmetArchetype =
  | 'ROYAL_DIADEM'
  | 'KNIGHT_VISOR'
  | 'VALKYRIE_WINGS'
  | 'ARCANE_HOOD'
  | 'HORNED_CREST';

export type OffhandArchetype =
  | 'TOWER_SHIELD'
  | 'FLOATING_GRIMOIRE'
  | 'ASTRAL_ORB'
  | 'PARRY_BUCKLER'
  | 'RUNIC_LANTERN';

export type RelicCapeArchetype =
  | 'SERAPH_WINGS'
  | 'ROYAL_MANTLE'
  | 'VOID_HALO'
  | 'STARLIGHT_CLOAK'
  | 'CRYSTAL_THRUSTERS';

export interface EquipmentVisualSpec {
  readonly slot: EquipmentSlot;
  readonly archetype:
    | WeaponArchetype
    | ArmorArchetype
    | HelmetArchetype
    | OffhandArchetype
    | RelicCapeArchetype;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly glowColor: string;
  readonly particleStyle: 'NONE' | 'SPARKS' | 'RUNES' | 'STARFALL' | 'ABYSS_FLAME';
}

export interface EquipmentCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly rarityStars: HeroRarityStars;
  readonly element: HeroElement;
  readonly lore: string;
  readonly bonusHp: number;
  readonly bonusAtk: number;
  readonly bonusDef: number;
  readonly bonusSpd: number;
  readonly bonusCritPct: number;
  readonly exclusiveHeroId?: string;
  readonly exclusiveBonusDesc?: string;
  readonly visualSpec: EquipmentVisualSpec;
}

export interface OwnedEquipmentState {
  readonly itemId: string;
  readonly enhanceLevel: number;
  readonly count: number;
  readonly firstObtainedIso: string;
}

export interface EquippedLoadoutMap {
  readonly WEAPON: string | null;
  readonly ARMOR: string | null;
  readonly HELMET: string | null;
  readonly OFFHAND: string | null;
  readonly RELIC_CAPE: string | null;
}

export interface GrimoireCollectionBond {
  readonly id: string;
  readonly title: string;
  readonly lore: string;
  readonly requiredHeroIds: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly bonusStatType: 'ATK_PCT' | 'HP_PCT' | 'DEF_PCT' | 'CRIT_PCT' | 'ALL_STATS_PCT';
  readonly bonusValuePct: number;
}
