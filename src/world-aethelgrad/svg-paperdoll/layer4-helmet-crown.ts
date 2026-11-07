/**
 * src/world-aethelgrad/svg-paperdoll/layer4-helmet-crown.ts
 * Layer 4 (pd-layer-4-helmet): Mahkota, Siger Valkyrie, Visor Ksatria, atau Tanduk Naga.
 * Berubah secara real-time mengikuti item slot HELMET yang dipasang!
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

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
      pxRect(25, 9, 14, 3, sCol),
      pxRect(31, 8, 2, 3, glow),
      // Sayap mahkota kiri & kanan
      pxRect(19, 8, 5, 3, pCol),
      pxRect(17, 6, 4, 3, pCol),
      pxRect(40, 8, 5, 3, pCol),
      pxRect(43, 6, 4, 3, pCol)
    );
  } else if (arch === 'HORNED_CREST') {
    parts.push(
      pxRect(24, 9, 16, 4, pCol),
      pxRect(20, 6, 4, 5, sCol),
      pxRect(18, 4, 3, 3, glow),
      pxRect(40, 6, 4, 5, sCol),
      pxRect(43, 4, 3, 3, glow),
      pxRect(30, 7, 4, 5, sCol)
    );
  } else if (arch === 'KNIGHT_VISOR') {
    parts.push(
      pxRect(23, 9, 18, 4, pCol),
      pxRect(24, 17, 16, 3, glow, 0.85),
      pxRect(30, 8, 4, 3, sCol)
    );
  } else if (arch === 'ARCANE_HOOD') {
    parts.push(
      pxRect(21, 8, 22, 5, pCol),
      pxRect(23, 12, 18, 2, sCol),
      pxRect(31, 9, 2, 3, glow)
    );
  } else {
    // ROYAL_DIADEM
    parts.push(
      pxRect(25, 10, 14, 2, pCol),
      pxRect(28, 8, 8, 2, sCol),
      pxRect(31, 7, 2, 3, glow)
    );
  }

  return `<g id="pd-layer-4-helmet" data-layer="helmet" data-item-id="${helmetItem.id}">${parts.join('')}</g>`;
}
