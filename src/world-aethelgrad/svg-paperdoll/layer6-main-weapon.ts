/**
 * Layer 6 (pd-layer-6-weapon / .pd-weapon-arm): Senjata Utama 16-Bit.
 *  - Digambar dengan pommel, grip, crossguard, dan bilah bertahap piksel (1x1 & 2x1).
 *  - Dibungkus dalam <g class="pd-weapon-arm"> dengan transform-origin di bahu (20px 29px)
 *    untuk animasi idle dan tebasan saat equip/duel.
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer6MainWeapon(
  hero: HeroCatalogEntry,
  weaponItem?: EquipmentCatalogEntry
): string {
  const pCol = weaponItem?.visualSpec.primaryColor || '#7DD3FC';
  const sCol = weaponItem?.visualSpec.secondaryColor || '#D4AF6A';
  const glow = weaponItem?.visualSpec.glowColor || hero.visualDna.auraColor;
  const arch = weaponItem?.visualSpec.archetype || 'LONGSWORD';

  const parts: string[] = [];

  if (arch === 'GREATSWORD') {
    // Pedang raksasa diagonal bertahap piksel dengan pommel, grip, crossguard, fuller, dan specular edge
    parts.push(
      // Pommel & Grip
      pxRect(18, 39, 4, 4, PIXEL_OUTLINE_DARK),
      pxStep2(19, 40, sCol),
      pxDot(19, 40, PIXEL_SPECULAR_LIGHT),
      pxRect(17, 36, 4, 4, PIXEL_OUTLINE_DARK),
      pxRect(18, 37, 2, 3, '#3B2F2F'),
      // Crossguard lebar berukir
      pxRect(12, 33, 12, 4, PIXEL_OUTLINE_DARK),
      pxRect(13, 34, 10, 2, sCol),
      pxStep2(14, 34, PIXEL_SPECULAR_LIGHT),
      pxStep2(17, 34, glow),
      // Bilah greatsword bertingkat diagonal (y = 8..33)
      pxRect(13, 26, 7, 8, PIXEL_OUTLINE_DARK),
      pxRect(14, 26, 5, 7, pCol),
      pxRect(15, 26, 2, 7, glow),
      pxDot(14, 27, PIXEL_SPECULAR_LIGHT),
      pxDot(14, 29, PIXEL_SPECULAR_LIGHT),

      pxRect(11, 18, 7, 9, PIXEL_OUTLINE_DARK),
      pxRect(12, 18, 5, 8, pCol),
      pxRect(13, 18, 2, 8, glow),
      pxDot(12, 19, PIXEL_SPECULAR_LIGHT),
      pxDot(12, 22, PIXEL_SPECULAR_LIGHT),

      pxRect(9, 11, 7, 8, PIXEL_OUTLINE_DARK),
      pxRect(10, 11, 5, 7, pCol),
      pxRect(11, 11, 2, 7, glow),
      pxDot(10, 12, PIXEL_SPECULAR_LIGHT),
      pxDot(10, 15, PIXEL_SPECULAR_LIGHT),

      // Ujung runcing bertahap 1x1 & 2x1
      pxRect(8, 7, 5, 5, PIXEL_OUTLINE_DARK),
      pxRect(9, 8, 3, 3, glow),
      pxStep2(9, 8, PIXEL_SPECULAR_LIGHT),
      pxDot(8, 7, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'ARCANE_STAFF') {
    parts.push(
      // Pommel bawah & batang tongkat berulir
      pxRect(13, 15, 5, 36, PIXEL_OUTLINE_DARK),
      pxRect(14, 16, 3, 34, sCol),
      pxDot(15, 22, PIXEL_SPECULAR_LIGHT),
      pxDot(15, 30, PIXEL_SPECULAR_LIGHT),
      pxDot(15, 49, glow),
      // Cincin astrolabe kepala tongkat
      pxRect(9, 8, 13, 10, PIXEL_OUTLINE_DARK),
      pxRect(10, 9, 11, 8, sCol),
      pxRect(12, 11, 7, 4, PIXEL_OUTLINE_DARK),
      // Inti permata mana melayang
      pxRect(13, 11, 5, 4, pCol),
      pxRect(14, 12, 3, 2, glow),
      pxDot(14, 12, PIXEL_SPECULAR_LIGHT),
      // Puncak mahkota tongkat
      pxRect(13, 5, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(14, 6, 3, 2, glow),
      pxDot(15, 5, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'HALBERD_SPEAR') {
    parts.push(
      // Batang tombak panjang
      pxRect(14, 10, 4, 41, PIXEL_OUTLINE_DARK),
      pxRect(15, 11, 2, 39, sCol),
      pxDot(15, 20, PIXEL_SPECULAR_LIGHT),
      // Bilah kapak bulan sabit di sisi kiri
      pxRect(8, 12, 7, 10, PIXEL_OUTLINE_DARK),
      pxRect(9, 13, 5, 8, pCol),
      pxRect(9, 14, 2, 6, glow),
      pxDot(9, 14, PIXEL_SPECULAR_LIGHT),
      pxDot(9, 18, PIXEL_SPECULAR_LIGHT),
      // Ujung tombak vertikal tajam
      pxRect(13, 4, 6, 8, PIXEL_OUTLINE_DARK),
      pxRect(14, 5, 4, 6, glow),
      pxStep2(15, 5, PIXEL_SPECULAR_LIGHT),
      pxDot(15, 3, PIXEL_SPECULAR_LIGHT)
    );
  } else if (arch === 'ASTRAL_BOW') {
    parts.push(
      // Lengkung busur atas, tengah, bawah
      pxRect(9, 15, 6, 26, PIXEL_OUTLINE_DARK),
      pxRect(10, 16, 4, 24, pCol),
      pxRect(12, 14, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(13, 15, 3, 2, sCol),
      pxDot(13, 15, PIXEL_SPECULAR_LIGHT),
      pxRect(12, 39, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(13, 40, 3, 2, sCol),
      // Tali busur cahaya & anak panah siap lepas
      pxRect(16, 17, 1, 22, glow),
      pxRect(6, 27, 13, 3, PIXEL_OUTLINE_DARK),
      pxRect(7, 28, 11, 1, PIXEL_SPECULAR_LIGHT),
      pxStep2(6, 28, glow)
    );
  } else if (arch === 'TWIN_DAGGERS') {
    parts.push(
      // Belati/Katana tangan utama diagonal tajam
      pxRect(17, 36, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(18, 37, 3, 2, sCol),
      pxRect(13, 31, 6, 6, PIXEL_OUTLINE_DARK),
      pxRect(14, 32, 4, 4, pCol),
      pxDot(14, 32, PIXEL_SPECULAR_LIGHT),
      pxRect(9, 26, 6, 6, PIXEL_OUTLINE_DARK),
      pxRect(10, 27, 4, 4, glow),
      pxDot(10, 27, PIXEL_SPECULAR_LIGHT),
      pxRect(6, 22, 5, 5, PIXEL_OUTLINE_DARK),
      pxRect(7, 23, 3, 3, PIXEL_SPECULAR_LIGHT),
      // Belati tangan kedua
      pxRect(42, 36, 11, 4, PIXEL_OUTLINE_DARK),
      pxRect(43, 37, 9, 2, pCol),
      pxStep2(49, 37, glow),
      pxDot(51, 37, PIXEL_SPECULAR_LIGHT)
    );
  } else {
    // LONGSWORD 16-bit (Pommel, Grip, Crossguard, dan Bilah bertahap piksel)
    parts.push(
      // Pommel emas
      pxRect(17, 39, 5, 3, PIXEL_OUTLINE_DARK),
      pxRect(18, 40, 3, 1, sCol),
      pxDot(19, 40, PIXEL_SPECULAR_LIGHT),
      // Grip berbalut kulit
      pxRect(17, 36, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(18, 37, 3, 2, '#3B2F2F'),
      // Crossguard ksatria
      pxRect(13, 34, 11, 3, PIXEL_OUTLINE_DARK),
      pxRect(14, 35, 9, 1, sCol),
      pxDot(14, 35, PIXEL_SPECULAR_LIGHT),
      pxDot(18, 35, glow),
      pxDot(22, 35, PIXEL_SPECULAR_LIGHT),
      // Bilah pedang bertingkat dengan tepi gelap, base tone, fuller cahaya, dan specular 1x1
      pxRect(15, 25, 5, 10, PIXEL_OUTLINE_DARK),
      pxRect(16, 25, 3, 9, pCol),
      pxRect(17, 25, 1, 9, glow),
      pxDot(16, 26, PIXEL_SPECULAR_LIGHT),
      pxDot(16, 30, PIXEL_SPECULAR_LIGHT),

      pxRect(14, 16, 5, 10, PIXEL_OUTLINE_DARK),
      pxRect(15, 16, 3, 9, pCol),
      pxRect(16, 16, 1, 9, glow),
      pxDot(15, 17, PIXEL_SPECULAR_LIGHT),
      pxDot(15, 21, PIXEL_SPECULAR_LIGHT),

      // Ujung bilah meruncing 2x1 -> 1x1
      pxRect(13, 10, 5, 7, PIXEL_OUTLINE_DARK),
      pxRect(14, 11, 3, 5, glow),
      pxStep2(14, 11, PIXEL_SPECULAR_LIGHT),
      pxDot(15, 9, PIXEL_SPECULAR_LIGHT)
    );
  }

  return `<g id="pd-layer-6-weapon" class="pd-weapon-arm" data-layer="weapon" data-item-id="${weaponItem?.id || 'default-blade'}">${parts.join('')}</g>`;
}
