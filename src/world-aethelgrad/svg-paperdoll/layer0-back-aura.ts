/**
 * src/world-aethelgrad/svg-paperdoll/layer0-back-aura.ts
 * Layer 0 (pd-layer-0-aura): Pedestal Pemanggilan, Aura Bintang, & RELIC_CAPE (Sayap/Jubah/Halo).
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry, HeroRarityStars } from '../types/hero.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer0BackAura(
  hero: HeroCatalogEntry,
  currentStars: HeroRarityStars,
  relicItem?: EquipmentCatalogEntry,
  showPedestal: boolean = true
): string {
  const parts: string[] = [];
  const auraColor = relicItem?.visualSpec.glowColor || hero.visualDna.auraColor;

  // Pedestal kristal di bawah kaki (y = 52..61)
  if (showPedestal) {
    parts.push(
      pxRect(14, 55, 36, 4, '#0F172A'),
      pxRect(16, 53, 32, 3, '#1E293B'),
      pxRect(18, 52, 28, 2, auraColor, 0.85),
      pxRect(22, 51, 20, 1, '#FFFFFF', 0.9),
      pxRect(12, 58, 40, 2, '#334155')
    );
  }

  // Aura bintang (semakin tinggi bintang, semakin megah partikel latar)
  if (currentStars >= 4) {
    parts.push(
      pxRect(14, 14, 2, 2, auraColor, 0.75),
      pxRect(48, 14, 2, 2, auraColor, 0.75),
      pxRect(11, 28, 2, 2, auraColor, 0.65),
      pxRect(51, 28, 2, 2, auraColor, 0.65)
    );
  }
  if (currentStars === 5) {
    parts.push(
      pxRect(20, 7, 24, 1, auraColor, 0.55),
      pxRect(10, 20, 1, 18, auraColor, 0.45),
      pxRect(53, 20, 1, 18, auraColor, 0.45),
      pxRect(31, 4, 2, 2, '#FBBF24', 0.95)
    );
  }

  // Visual RELIC_CAPE jika terpasang
  if (relicItem) {
    const pCol = relicItem.visualSpec.primaryColor;
    const sCol = relicItem.visualSpec.secondaryColor;
    const arch = relicItem.visualSpec.archetype;

    if (arch === 'SERAPH_WINGS') {
      parts.push(
        // Sayap kiri 3 bilah
        pxRect(11, 20, 10, 4, pCol),
        pxRect(9, 25, 11, 4, sCol),
        pxRect(13, 30, 8, 4, pCol),
        // Sayap kanan 3 bilah
        pxRect(43, 20, 10, 4, pCol),
        pxRect(44, 25, 11, 4, sCol),
        pxRect(43, 30, 8, 4, pCol)
      );
    } else if (arch === 'VOID_HALO') {
      parts.push(
        pxRect(20, 8, 24, 2, pCol),
        pxRect(18, 10, 2, 12, sCol),
        pxRect(44, 10, 2, 12, sCol),
        pxRect(30, 6, 4, 2, '#FBBF24')
      );
    } else if (arch === 'CRYSTAL_THRUSTERS') {
      parts.push(
        pxRect(14, 24, 7, 10, pCol),
        pxRect(43, 24, 7, 10, pCol),
        pxRect(15, 34, 4, 6, sCol),
        pxRect(45, 34, 4, 6, sCol)
      );
    } else {
      // ROYAL_MANTLE / STARLIGHT_CLOAK
      parts.push(
        pxRect(19, 26, 26, 22, pCol),
        pxRect(18, 34, 28, 14, pCol),
        pxRect(20, 46, 24, 2, sCol)
      );
    }
  }

  return `<g id="pd-layer-0-aura" data-layer="aura" data-item-id="${relicItem?.id || 'none'}">${parts.join('')}</g>`;
}
