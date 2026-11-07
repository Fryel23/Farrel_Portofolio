/**
 * Layer 2 (pd-layer-2-armor): Zirah Dada 16-Bit, Pauldron Bahu Bertingkat, Sabuk, & Tassets.
 * Berubah mengikuti item slot ARMOR yang dipasang.
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer2ChestArmor(
  hero: HeroCatalogEntry,
  armorItem?: EquipmentCatalogEntry
): string {
  const primary = armorItem?.visualSpec.primaryColor || hero.visualDna.defaultArmorPrimary;
  const trim = armorItem?.visualSpec.secondaryColor || hero.visualDna.defaultArmorTrim;
  const glow = armorItem?.visualSpec.glowColor || hero.visualDna.auraColor;
  const arch = armorItem?.visualSpec.archetype || 'PLATE_CUIRASS';

  const parts: string[] = [
    // Outline pelindung dada & kerah
    pxRect(23, 27, 18, 14, PIXEL_OUTLINE_DARK),
    pxRect(24, 28, 16, 12, primary),

    // Shading 3-tone sisi dada & pelat tengah
    pxRect(24, 29, 2, 10, PIXEL_OUTLINE_DARK, 0.28),
    pxRect(38, 29, 2, 10, PIXEL_OUTLINE_DARK, 0.28),
    pxRect(26, 28, 12, 2, trim),
    pxStep2(27, 28, PIXEL_SPECULAR_LIGHT),
    pxStep2(35, 28, PIXEL_SPECULAR_LIGHT),

    // Lambang kristal di tengah dada
    pxRect(29, 30, 6, 7, PIXEL_OUTLINE_DARK),
    pxRect(30, 31, 4, 5, trim),
    pxRect(31, 32, 2, 3, glow),
    pxDot(31, 32, PIXEL_SPECULAR_LIGHT),

    // Pauldron bahu kiri bertingkat piksel dengan highlight 1x1
    pxRect(17, 26, 8, 7, PIXEL_OUTLINE_DARK),
    pxRect(18, 27, 6, 5, primary),
    pxRect(18, 27, 6, 2, trim),
    pxStep2(19, 27, PIXEL_SPECULAR_LIGHT),
    pxDot(18, 28, PIXEL_SPECULAR_LIGHT),
    pxDot(19, 30, glow),

    // Pauldron bahu kanan bertingkat piksel dengan highlight 1x1
    pxRect(39, 26, 8, 7, PIXEL_OUTLINE_DARK),
    pxRect(40, 27, 6, 5, primary),
    pxRect(40, 27, 6, 2, trim),
    pxStep2(43, 27, PIXEL_SPECULAR_LIGHT),
    pxDot(45, 28, PIXEL_SPECULAR_LIGHT),
    pxDot(44, 30, glow),

    // Sabuk gesper kerajaan
    pxRect(23, 38, 18, 3, PIXEL_OUTLINE_DARK),
    pxRect(24, 39, 16, 2, trim),
    pxRect(29, 38, 6, 3, PIXEL_OUTLINE_DARK),
    pxRect(30, 39, 4, 2, glow),
    pxDot(31, 39, PIXEL_SPECULAR_LIGHT),
  ];

  if (arch === 'MYSTIC_ROBE' || arch === 'SHADOW_TRENCH') {
    parts.push(
      pxRect(22, 41, 8, 9, PIXEL_OUTLINE_DARK),
      pxRect(23, 41, 6, 8, primary),
      pxRect(23, 47, 6, 2, trim),
      pxStep2(24, 47, PIXEL_SPECULAR_LIGHT),

      pxRect(34, 41, 8, 9, PIXEL_OUTLINE_DARK),
      pxRect(35, 41, 6, 8, primary),
      pxRect(35, 47, 6, 2, trim),
      pxStep2(38, 47, PIXEL_SPECULAR_LIGHT),

      pxRect(29, 41, 6, 7, PIXEL_OUTLINE_DARK),
      pxRect(30, 41, 4, 6, glow),
      pxDot(31, 42, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'DRAGON_SCALE') {
    parts.push(
      pxRect(22, 41, 20, 6, PIXEL_OUTLINE_DARK),
      pxRect(23, 41, 18, 4, primary),
      pxRect(24, 43, 16, 2, trim),
      pxStep2(25, 42, PIXEL_SPECULAR_LIGHT),
      pxStep2(31, 42, glow),
      pxStep2(37, 42, PIXEL_SPECULAR_LIGHT),
      pxRect(26, 45, 12, 2, glow)
    );
  } else {
    // PLATE_CUIRASS / VALKYRIE_AEGIS / ROYAL_HARNESS
    parts.push(
      pxRect(23, 41, 7, 5, PIXEL_OUTLINE_DARK),
      pxRect(24, 41, 5, 4, primary),
      pxStep2(25, 42, trim),
      pxDot(25, 41, PIXEL_SPECULAR_LIGHT),

      pxRect(34, 41, 7, 5, PIXEL_OUTLINE_DARK),
      pxRect(35, 41, 5, 4, primary),
      pxStep2(37, 42, trim),
      pxDot(38, 41, PIXEL_SPECULAR_LIGHT),

      pxRect(29, 41, 6, 6, PIXEL_OUTLINE_DARK),
      pxRect(30, 41, 4, 5, trim),
      pxStep2(31, 43, glow)
    );
  }

  return `<g id="pd-layer-2-armor" class="pd-torso-breath" data-layer="armor" data-item-id="${armorItem?.id || 'default'}">${parts.join('')}</g>`;
}
