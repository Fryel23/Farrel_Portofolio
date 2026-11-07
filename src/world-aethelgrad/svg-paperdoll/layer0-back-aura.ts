/**
 * Layer 0 (pd-layer-0-aura): Pedestal Rune 16-bit, Partikel Bintang, & Jubah/Sayap (.pd-cloak).
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry, HeroRarityStars } from '../types/hero.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer0BackAura(
  hero: HeroCatalogEntry,
  currentStars: HeroRarityStars,
  relicItem?: EquipmentCatalogEntry,
  showPedestal: boolean = true
): string {
  const pedestalParts: string[] = [];
  const cloakParts: string[] = [];
  const auraColor = relicItem?.visualSpec.glowColor || hero.visualDna.auraColor;

  if (showPedestal) {
    pedestalParts.push(
      // Outline & bayangan dasar pedestal rune 16-bit
      pxRect(11, 58, 42, 2, PIXEL_OUTLINE_DARK),
      pxRect(13, 56, 38, 2, '#1B2030'),
      pxRect(15, 54, 34, 2, PIXEL_OUTLINE_DARK),
      pxRect(16, 54, 32, 2, '#252C3F'),
      // Lingkar rune bercahaya bertingkat 2x1 & 1x1
      pxRect(18, 53, 28, 1, auraColor, 0.78),
      pxRect(22, 52, 20, 1, auraColor, 0.92),
      pxStep2(25, 52, PIXEL_SPECULAR_LIGHT, 0.95),
      pxStep2(37, 52, PIXEL_SPECULAR_LIGHT, 0.95),
      pxDot(31, 52, PIXEL_SPECULAR_LIGHT),
      pxDot(32, 52, PIXEL_SPECULAR_LIGHT),
      pxStep2(14, 57, '#D4AF6A', 0.75),
      pxStep2(48, 57, '#D4AF6A', 0.75)
    );
  }

  // Partikel mana halus di sekitar pahlawan bintang tinggi
  if (currentStars >= 4) {
    pedestalParts.push(
      pxDot(13, 15, auraColor, 0.85),
      pxDot(14, 15, PIXEL_SPECULAR_LIGHT, 0.9),
      pxDot(50, 15, auraColor, 0.85),
      pxDot(49, 15, PIXEL_SPECULAR_LIGHT, 0.9),
      pxDot(10, 29, auraColor, 0.75),
      pxDot(53, 29, auraColor, 0.75)
    );
  }
  if (currentStars === 5) {
    pedestalParts.push(
      pxStep2(31, 4, '#D4AF6A', 0.95),
      pxDot(31, 3, PIXEL_SPECULAR_LIGHT),
      pxDot(32, 3, PIXEL_SPECULAR_LIGHT),
      pxStep2(19, 7, auraColor, 0.65),
      pxStep2(43, 7, auraColor, 0.65),
      pxDot(9, 21, '#D4AF6A', 0.8),
      pxDot(54, 21, '#D4AF6A', 0.8)
    );
  }

  // Wujud RELIC_CAPE dengan 3-tone shading (#14161F outline + base + 1x1 highlight)
  if (relicItem) {
    const pCol = relicItem.visualSpec.primaryColor;
    const sCol = relicItem.visualSpec.secondaryColor;
    const arch = relicItem.visualSpec.archetype;

    if (arch === 'SERAPH_WINGS') {
      cloakParts.push(
        // Sayap kiri bertingkat piksel
        pxRect(9, 18, 12, 3, PIXEL_OUTLINE_DARK),
        pxRect(10, 19, 10, 2, pCol),
        pxStep2(11, 19, PIXEL_SPECULAR_LIGHT),
        pxRect(7, 22, 13, 3, PIXEL_OUTLINE_DARK),
        pxRect(8, 23, 11, 2, sCol),
        pxStep2(9, 23, PIXEL_SPECULAR_LIGHT),
        pxRect(10, 26, 10, 3, PIXEL_OUTLINE_DARK),
        pxRect(11, 27, 8, 2, pCol),
        pxDot(12, 27, PIXEL_SPECULAR_LIGHT),
        pxRect(13, 30, 7, 3, PIXEL_OUTLINE_DARK),
        pxRect(14, 31, 5, 2, sCol),
        // Sayap kanan bertingkat piksel
        pxRect(43, 18, 12, 3, PIXEL_OUTLINE_DARK),
        pxRect(44, 19, 10, 2, pCol),
        pxStep2(51, 19, PIXEL_SPECULAR_LIGHT),
        pxRect(44, 22, 13, 3, PIXEL_OUTLINE_DARK),
        pxRect(45, 23, 11, 2, sCol),
        pxStep2(53, 23, PIXEL_SPECULAR_LIGHT),
        pxRect(44, 26, 10, 3, PIXEL_OUTLINE_DARK),
        pxRect(45, 27, 8, 2, pCol),
        pxDot(51, 27, PIXEL_SPECULAR_LIGHT),
        pxRect(44, 30, 7, 3, PIXEL_OUTLINE_DARK),
        pxRect(45, 31, 5, 2, sCol)
      );
    } else if (arch === 'VOID_HALO') {
      cloakParts.push(
        pxRect(19, 6, 26, 3, PIXEL_OUTLINE_DARK),
        pxRect(20, 7, 24, 1, pCol),
        pxStep2(31, 6, PIXEL_SPECULAR_LIGHT),
        pxRect(16, 9, 3, 12, PIXEL_OUTLINE_DARK),
        pxRect(17, 10, 1, 10, sCol),
        pxDot(17, 11, PIXEL_SPECULAR_LIGHT),
        pxRect(45, 9, 3, 12, PIXEL_OUTLINE_DARK),
        pxRect(46, 10, 1, 10, sCol),
        pxDot(46, 11, PIXEL_SPECULAR_LIGHT)
      );
    } else if (arch === 'CRYSTAL_THRUSTERS') {
      cloakParts.push(
        pxRect(12, 22, 8, 12, PIXEL_OUTLINE_DARK),
        pxRect(13, 23, 6, 10, pCol),
        pxStep2(14, 24, PIXEL_SPECULAR_LIGHT),
        pxRect(14, 34, 4, 5, sCol),
        pxDot(15, 35, PIXEL_SPECULAR_LIGHT),
        pxRect(44, 22, 8, 12, PIXEL_OUTLINE_DARK),
        pxRect(45, 23, 6, 10, pCol),
        pxStep2(48, 24, PIXEL_SPECULAR_LIGHT),
        pxRect(46, 34, 4, 5, sCol),
        pxDot(48, 35, PIXEL_SPECULAR_LIGHT)
      );
    } else {
      // ROYAL_MANTLE / STARLIGHT_CLOAK dengan lipatan kain 16-bit
      cloakParts.push(
        pxRect(18, 26, 28, 22, PIXEL_OUTLINE_DARK),
        pxRect(19, 27, 26, 20, pCol),
        pxRect(21, 29, 3, 17, PIXEL_OUTLINE_DARK, 0.32),
        pxRect(40, 29, 3, 17, PIXEL_OUTLINE_DARK, 0.32),
        pxRect(19, 45, 26, 2, sCol),
        pxStep2(20, 45, PIXEL_SPECULAR_LIGHT),
        pxStep2(42, 45, PIXEL_SPECULAR_LIGHT)
      );
    }
  } else {
    // Jubah petualang tipis default agar siluet 16-bit tetap hidup
    cloakParts.push(
      pxRect(20, 28, 24, 18, PIXEL_OUTLINE_DARK),
      pxRect(21, 29, 22, 16, '#1B2030'),
      pxRect(21, 44, 22, 1, hero.visualDna.defaultArmorTrim)
    );
  }

  return `<g id="pd-layer-0-aura" data-layer="aura" data-item-id="${relicItem?.id || 'none'}">${pedestalParts.join('')}<g class="pd-cloak">${cloakParts.join('')}</g></g>`;
}
