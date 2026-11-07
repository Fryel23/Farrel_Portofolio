/**
 * src/world-aethelgrad/types/hero.types.ts
 * Domain contracts untuk 24 Hero Original Aethelgrad (★1 s.d. ★5) & Paper-Doll Appearance.
 */

export type HeroRarityStars = 1 | 2 | 3 | 4 | 5;

export type HeroElement =
  | 'SOLAR_LIGHT'
  | 'ABYSSAL_VOID'
  | 'CRYO_FROST'
  | 'PYRO_FLAME'
  | 'STORM_VOLT'
  | 'CHRONO_AETHER';

export type HeroClassRole =
  | 'VANGUARD_BLADE'
  | 'ASTRAL_ARCHMAGE'
  | 'SHADOW_REAPER'
  | 'AEGIS_PALADIN'
  | 'CHRONO_RANGER'
  | 'RUNIC_ARTIFICER';

export interface HeroVisualDNA {
  readonly skinTone: string;
  readonly skinShadow: string;
  readonly hairColor: string;
  readonly hairHighlight: string;
  readonly hairStyle: 'SPIKY_PROTAG' | 'ROYAL_LONG' | 'TWIN_VALKYRIE' | 'HOODED_MYSTIC' | 'SILVER_BOB' | 'FLAME_CREST';
  readonly eyeColor: string;
  readonly defaultArmorPrimary: string;
  readonly defaultArmorTrim: string;
  readonly auraColor: string;
}

export interface HeroCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly baseStars: HeroRarityStars;
  readonly maxStars: 5;
  readonly element: HeroElement;
  readonly role: HeroClassRole;
  readonly lore: string;
  readonly signatureQuote: string;
  readonly passiveSkillName: string;
  readonly passiveSkillDesc: string;
  readonly burstSkillName: string;
  readonly burstSkillDesc: string;
  readonly baseHp: number;
  readonly baseAtk: number;
  readonly baseDef: number;
  readonly baseSpd: number;
  readonly baseCritPct: number;
  readonly signatureWeaponId?: string;
  readonly visualDna: HeroVisualDNA;
}

export interface OwnedHeroState {
  readonly heroId: string;
  readonly currentStars: HeroRarityStars;
  readonly level: number;
  readonly soulShards: number;
  readonly dupesPulled: number;
  readonly unlockedAtIso: string;
}
