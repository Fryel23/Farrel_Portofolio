/**
 * src/world-aethelgrad/svg-paperdoll/layer5-offhand-gear.ts
 * Layer 5 (pd-layer-5-offhand): Perisai Menara, Kitab Grimoire Melayang, atau Bola Orb.
 * Berubah secara real-time mengikuti item slot OFFHAND yang dipasang!
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer5OffhandGear(offhandItem?: EquipmentCatalogEntry): string {
  if (!offhandItem) {
    return `<g id="pd-layer-5-offhand" data-layer="offhand" data-item-id="none"></g>`;
  }

  const pCol = offhandItem.visualSpec.primaryColor;
  const sCol = offhandItem.visualSpec.secondaryColor;
  const glow = offhandItem.visualSpec.glowColor;
  const arch = offhandItem.visualSpec.archetype;
  const parts: string[] = [];

  if (arch === 'TOWER_SHIELD') {
    // Perisai besar di sisi tangan kanan-layar (x = 42..53)
    parts.push(
      pxRect(42, 27, 11, 18, pCol),
      pxRect(43, 28, 9, 16, sCol),
      pxRect(45, 30, 5, 12, pCol),
      pxRect(46, 33, 3, 6, glow)
    );
  } else if (arch === 'FLOATING_GRIMOIRE') {
    // Kitab terbuka melayang di samping bahu (x = 45..56, y = 20..29)
    parts.push(
      pxRect(45, 22, 11, 8, pCol),
      pxRect(46, 23, 4, 6, '#F8FAFC'),
      pxRect(51, 23, 4, 6, '#F8FAFC'),
      pxRect(49, 20, 3, 2, glow),
      pxRect(47, 31, 7, 1, glow, 0.75)
    );
  } else if (arch === 'ASTRAL_ORB' || arch === 'RUNIC_LANTERN') {
    // Bola kristal / lentera bercahaya
    parts.push(
      pxRect(46, 23, 8, 8, pCol),
      pxRect(48, 25, 4, 4, glow),
      pxRect(49, 26, 2, 2, '#FFFFFF'),
      pxRect(45, 22, 10, 1, sCol)
    );
  } else {
    // PARRY_BUCKLER
    parts.push(
      pxRect(42, 31, 9, 9, pCol),
      pxRect(43, 32, 7, 7, sCol),
      pxRect(45, 34, 3, 3, glow)
    );
  }

  return `<g id="pd-layer-5-offhand" data-layer="offhand" data-item-id="${offhandItem.id}">${parts.join('')}</g>`;
}
