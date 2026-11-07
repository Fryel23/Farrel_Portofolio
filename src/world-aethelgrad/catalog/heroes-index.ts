/**
 * src/world-aethelgrad/catalog/heroes-index.ts
 * Indeks terpadu 24 Hero Original Aethelgrad (6 ★5, 6 ★4, 6 ★3, 6 ★1-★2).
 */

import type { HeroCatalogEntry, HeroRarityStars } from '../types/hero.types.ts';
import { HEROES_1TO2STAR_BASE } from './heroes-1to2star-base.ts';
import { HEROES_3STAR_RARE } from './heroes-3star-rare.ts';
import { HEROES_4STAR_EPIC } from './heroes-4star-epic.ts';
import { HEROES_5STAR_MYTHIC } from './heroes-5star-mythic.ts';

export const HEROES_CATALOG: readonly HeroCatalogEntry[] = Object.freeze([
  ...HEROES_5STAR_MYTHIC,
  ...HEROES_4STAR_EPIC,
  ...HEROES_3STAR_RARE,
  ...HEROES_1TO2STAR_BASE,
]);

const HERO_MAP = new Map<string, HeroCatalogEntry>(
  HEROES_CATALOG.map((h) => [h.id, h])
);

export function getHeroById(heroId: string): HeroCatalogEntry | undefined {
  return HERO_MAP.get(heroId);
}

export function getHeroesByBaseStars(stars: HeroRarityStars): readonly HeroCatalogEntry[] {
  return HEROES_CATALOG.filter((h) => h.baseStars === stars);
}

export {
  HEROES_5STAR_MYTHIC,
  HEROES_4STAR_EPIC,
  HEROES_3STAR_RARE,
  HEROES_1TO2STAR_BASE,
};
