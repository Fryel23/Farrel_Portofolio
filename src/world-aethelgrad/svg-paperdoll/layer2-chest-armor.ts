/**
 * src/world-aethelgrad/svg-paperdoll/layer2-chest-armor.ts
 * Layer 2 (pd-layer-2-armor): Zirah Dada, Pauldron Bahu, Sabuk, & Mantel Tempur.
 * Berubah secara real-time mengikuti item slot ARMOR yang dipasang!
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer2ChestArmor(
  hero: HeroCatalogEntry,
  armorItem?: EquipmentCatalogEntry
): string {
  const primary = armorItem?.visualSpec.primaryColor || hero.visualDna.defaultArmorPrimary;
  const trim = armorItem?.visualSpec.secondaryColor || hero.visualDna.defaultArmorTrim;
  const glow = armorItem?.visualSpec.glowColor || hero.visualDna.auraColor;
  const arch = armorItem?.visualSpec.archetype || 'PLATE_CUIRASS';

  const parts: string[] = [
    // Pelindung dada utama
    pxRect(24, 28, 16, 12, primary),
    // Kerah & ornamen dada tengah
    pxRect(26, 28, 12, 2, trim),
    pxRect(30, 30, 4, 6, trim),
    pxRect(31, 31, 2, 3, glow),
    // Pauldron bahu kiri & kanan
    pxRect(19, 27, 6, 5, primary),
    pxRect(19, 27, 6, 2, trim),
    pxRect(39, 27, 6, 5, primary),
    pxRect(39, 27, 6, 2, trim),
    // Sabuk pinggang
    pxRect(24, 39, 16, 2, trim),
    pxRect(30, 39, 4, 2, glow),
  ];

  if (arch === 'MYSTIC_ROBE' || arch === 'SHADOW_TRENCH') {
    // Rok jubah panjang / mantel belah samping
    parts.push(
      pxRect(23, 41, 6, 8, primary),
      pxRect(35, 41, 6, 8, primary),
      pxRect(23, 48, 6, 1, trim),
      pxRect(35, 48, 6, 1, trim)
    );
  } else if (arch === 'DRAGON_SCALE') {
    // Pelindung pinggul sisik naga bertingkat
    parts.push(
      pxRect(23, 41, 18, 4, primary),
      pxRect(25, 45, 14, 2, trim)
    );
  } else {
    // Tassets baja ksatria
    parts.push(
      pxRect(24, 41, 5, 4, primary),
      pxRect(35, 41, 5, 4, primary),
      pxRect(29, 41, 6, 5, trim)
    );
  }

  return `<g id="pd-layer-2-armor" data-layer="armor" data-item-id="${armorItem?.id || 'default'}">${parts.join('')}</g>`;
}
