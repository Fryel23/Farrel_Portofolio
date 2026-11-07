/**
 * src/world-aethelgrad/catalog/items-index.ts
 * Indeks terpadu 50 Equipment Items Aethelgrad (10 per slot x 5 slot).
 */

import type { EquipmentCatalogEntry, EquipmentSlot } from '../types/equipment.types.ts';
import type { HeroRarityStars } from '../types/hero.types.ts';
import { ITEMS_ARMORS } from './items-armors.ts';
import { ITEMS_HELMETS } from './items-helmets.ts';
import { ITEMS_OFFHANDS } from './items-offhands.ts';
import { ITEMS_RELICS_CAPES } from './items-relics-capes.ts';
import { ITEMS_WEAPONS } from './items-weapons.ts';

export const ITEMS_CATALOG: readonly EquipmentCatalogEntry[] = Object.freeze([
  ...ITEMS_WEAPONS,
  ...ITEMS_ARMORS,
  ...ITEMS_HELMETS,
  ...ITEMS_OFFHANDS,
  ...ITEMS_RELICS_CAPES,
]);

const ITEM_MAP = new Map<string, EquipmentCatalogEntry>(
  ITEMS_CATALOG.map((item) => [item.id, item])
);

export function getEquipmentById(itemId: string | null | undefined): EquipmentCatalogEntry | undefined {
  if (!itemId) return undefined;
  return ITEM_MAP.get(itemId);
}

export function getEquipmentBySlot(slot: EquipmentSlot): readonly EquipmentCatalogEntry[] {
  return ITEMS_CATALOG.filter((item) => item.slot === slot);
}

export function getEquipmentByRarity(stars: HeroRarityStars): readonly EquipmentCatalogEntry[] {
  return ITEMS_CATALOG.filter((item) => item.rarityStars === stars);
}

export {
  ITEMS_WEAPONS,
  ITEMS_ARMORS,
  ITEMS_HELMETS,
  ITEMS_OFFHANDS,
  ITEMS_RELICS_CAPES,
};
