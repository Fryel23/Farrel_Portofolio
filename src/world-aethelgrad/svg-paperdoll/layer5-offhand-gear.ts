/**
 * Layer 5 (pd-layer-5-offhand): Perisai Menara, Kitab Grimoire Melayang, atau Bola Orb 16-Bit.
 * Berubah mengikuti item slot OFFHAND yang dipasang.
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

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
    parts.push(
      pxRect(41, 26, 13, 19, PIXEL_OUTLINE_DARK),
      pxRect(42, 27, 11, 17, sCol),
      pxRect(43, 28, 9, 15, pCol),
      pxStep2(43, 28, PIXEL_SPECULAR_LIGHT),
      pxDot(43, 29, PIXEL_SPECULAR_LIGHT),
      // Salib & permata tengah perisai
      pxRect(46, 30, 3, 11, sCol),
      pxRect(44, 34, 7, 3, sCol),
      pxRect(46, 34, 3, 3, glow),
      pxDot(46, 34, PIXEL_SPECULAR_LIGHT),
      // Ujung bawah perisai meruncing
      pxRect(43, 45, 9, 2, PIXEL_OUTLINE_DARK),
      pxRect(45, 45, 5, 1, sCol)
    );
  } else if (arch === 'FLOATING_GRIMOIRE') {
    parts.push(
      pxRect(44, 21, 13, 10, PIXEL_OUTLINE_DARK),
      pxRect(45, 22, 11, 8, pCol),
      // Halaman terbuka kiri & kanan
      pxRect(46, 23, 4, 6, '#F8FAFC'),
      pxRect(51, 23, 4, 6, '#F8FAFC'),
      // Tulisan rune mikro 1x1 di halaman
      pxStep2(47, 25, PIXEL_OUTLINE_DARK),
      pxStep2(47, 27, sCol),
      pxStep2(52, 25, PIXEL_OUTLINE_DARK),
      pxStep2(52, 27, glow),
      // Kristal melayang di atas kitab
      pxRect(49, 18, 3, 3, PIXEL_OUTLINE_DARK),
      pxRect(50, 19, 1, 2, glow),
      pxDot(50, 19, PIXEL_SPECULAR_LIGHT),
      pxStep2(48, 32, glow, 0.85)
    );
  } else if (arch === 'ASTRAL_ORB' || arch === 'RUNIC_LANTERN') {
    parts.push(
      pxRect(45, 21, 10, 10, PIXEL_OUTLINE_DARK),
      pxRect(46, 22, 8, 8, pCol),
      pxRect(47, 23, 6, 6, glow),
      pxStep2(48, 24, PIXEL_SPECULAR_LIGHT),
      pxDot(48, 25, PIXEL_SPECULAR_LIGHT),
      pxRect(44, 20, 12, 2, PIXEL_OUTLINE_DARK),
      pxRect(45, 21, 10, 1, sCol)
    );
  } else {
    // PARRY_BUCKLER bulat dengan paku tengah
    parts.push(
      pxRect(41, 30, 11, 11, PIXEL_OUTLINE_DARK),
      pxRect(42, 31, 9, 9, sCol),
      pxRect(43, 32, 7, 7, pCol),
      pxStep2(44, 32, PIXEL_SPECULAR_LIGHT),
      pxRect(45, 34, 3, 3, glow),
      pxDot(45, 34, PIXEL_SPECULAR_LIGHT)
    );
  }

  return `<g id="pd-layer-5-offhand" data-layer="offhand" data-item-id="${offhandItem.id}">${parts.join('')}</g>`;
}
