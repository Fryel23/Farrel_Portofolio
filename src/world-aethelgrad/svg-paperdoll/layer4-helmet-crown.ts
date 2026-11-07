/**
 * Layer 4 (pd-layer-4-helmet): Mahkota, Siger Valkyrie, Visor Ksatria, atau Tanduk Naga 16-Bit.
 * Berubah mengikuti item slot HELMET yang dipasang.
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer4HelmetCrown(helmetItem?: EquipmentCatalogEntry): string {
  if (!helmetItem) {
    return `<g id="pd-layer-4-helmet" data-layer="helmet" data-item-id="none"></g>`;
  }

  const pCol = helmetItem.visualSpec.primaryColor;
  const sCol = helmetItem.visualSpec.secondaryColor;
  const glow = helmetItem.visualSpec.glowColor;
  const arch = helmetItem.visualSpec.archetype;
  const parts: string[] = [];

  if (arch === 'VALKYRIE_WINGS') {
    parts.push(
      // Circlet tengah dengan permata 1x1
      pxRect(24, 8, 16, 4, PIXEL_OUTLINE_DARK),
      pxRect(25, 9, 14, 2, sCol),
      pxRect(30, 7, 4, 4, PIXEL_OUTLINE_DARK),
      pxRect(31, 8, 2, 3, glow),
      pxDot(31, 8, PIXEL_SPECULAR_LIGHT),
      // Sayap valkyrie kiri bertingkat piksel
      pxRect(17, 7, 7, 4, PIXEL_OUTLINE_DARK),
      pxRect(18, 8, 5, 2, pCol),
      pxStep2(19, 8, PIXEL_SPECULAR_LIGHT),
      pxRect(15, 5, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(16, 6, 3, 2, pCol),
      pxDot(16, 6, PIXEL_SPECULAR_LIGHT),
      // Sayap valkyrie kanan bertingkat piksel
      pxRect(40, 7, 7, 4, PIXEL_OUTLINE_DARK),
      pxRect(41, 8, 5, 2, pCol),
      pxStep2(43, 8, PIXEL_SPECULAR_LIGHT),
      pxRect(44, 5, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(45, 6, 3, 2, pCol),
      pxDot(47, 6, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'HORNED_CREST') {
    parts.push(
      pxRect(23, 8, 18, 5, PIXEL_OUTLINE_DARK),
      pxRect(24, 9, 16, 3, pCol),
      pxStep2(26, 9, PIXEL_SPECULAR_LIGHT),
      // Tanduk kiri bertingkat
      pxRect(19, 5, 5, 6, PIXEL_OUTLINE_DARK),
      pxRect(20, 6, 3, 4, sCol),
      pxRect(17, 3, 4, 4, PIXEL_OUTLINE_DARK),
      pxRect(18, 4, 2, 2, glow),
      pxDot(18, 4, PIXEL_SPECULAR_LIGHT),
      // Tanduk kanan bertingkat
      pxRect(40, 5, 5, 6, PIXEL_OUTLINE_DARK),
      pxRect(41, 6, 3, 4, sCol),
      pxRect(43, 3, 4, 4, PIXEL_OUTLINE_DARK),
      pxRect(44, 4, 2, 2, glow),
      pxDot(45, 4, PIXEL_SPECULAR_LIGHT),
      // Jambul tengah
      pxRect(30, 6, 4, 5, sCol),
      pxDot(31, 6, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'KNIGHT_VISOR') {
    parts.push(
      pxRect(22, 8, 20, 6, PIXEL_OUTLINE_DARK),
      pxRect(23, 9, 18, 4, pCol),
      pxStep2(25, 9, PIXEL_SPECULAR_LIGHT),
      pxRect(23, 16, 18, 4, PIXEL_OUTLINE_DARK),
      pxRect(24, 17, 16, 2, glow, 0.9),
      pxStep2(26, 17, PIXEL_SPECULAR_LIGHT),
      pxRect(30, 7, 4, 4, sCol),
      pxDot(31, 7, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'ARCANE_HOOD') {
    parts.push(
      pxRect(20, 7, 24, 6, PIXEL_OUTLINE_DARK),
      pxRect(21, 8, 22, 4, pCol),
      pxRect(23, 11, 18, 2, sCol),
      pxStep2(25, 8, PIXEL_SPECULAR_LIGHT),
      pxRect(30, 8, 4, 4, PIXEL_OUTLINE_DARK),
      pxRect(31, 9, 2, 2, glow),
      pxDot(31, 9, PIXEL_SPECULAR_LIGHT)
    );
  } else {
    // ROYAL_DIADEM
    parts.push(
      pxRect(24, 9, 16, 4, PIXEL_OUTLINE_DARK),
      pxRect(25, 10, 14, 2, pCol),
      pxRect(27, 7, 10, 4, PIXEL_OUTLINE_DARK),
      pxRect(28, 8, 8, 2, sCol),
      pxStep2(29, 8, PIXEL_SPECULAR_LIGHT),
      pxRect(31, 7, 2, 3, glow),
      pxDot(31, 7, PIXEL_SPECULAR_LIGHT)
    );
  }

  return `<g id="pd-layer-4-helmet" data-layer="helmet" data-item-id="${helmetItem.id}">${parts.join('')}</g>`;
}
