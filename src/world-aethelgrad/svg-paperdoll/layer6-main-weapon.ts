/**
 * src/world-aethelgrad/svg-paperdoll/layer6-main-weapon.ts
 * Layer 6 (pd-layer-6-weapon): Senjata Utama (Pedang, Greatsword, Tongkat, Katana, Tombak, Busur).
 * Berubah secara real-time mengikuti item slot WEAPON yang dipasang!
 */

import type { EquipmentCatalogEntry } from '../types/equipment.types.ts';
import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer6MainWeapon(
  hero: HeroCatalogEntry,
  weaponItem?: EquipmentCatalogEntry
): string {
  const pCol = weaponItem?.visualSpec.primaryColor || '#38BDF8';
  const sCol = weaponItem?.visualSpec.secondaryColor || '#FBBF24';
  const glow = weaponItem?.visualSpec.glowColor || hero.visualDna.auraColor;
  const arch = weaponItem?.visualSpec.archetype || 'LONGSWORD';

  const parts: string[] = [];

  if (arch === 'GREATSWORD') {
    // Pedang raksasa miring di sisi kiri-layar (x = 6..21, y = 10..44)
    parts.push(
      pxRect(18, 37, 4, 3, sCol), // gagang
      pxRect(14, 35, 9, 2, sCol), // crossguard lebar
      pxRect(11, 14, 6, 21, pCol), // bilah tebal
      pxRect(13, 12, 3, 23, glow), // inti cahaya
      pxRect(12, 10, 4, 3, '#FFFFFF') // ujung tajam
    );
  } else if (arch === 'ARCANE_STAFF') {
    // Tongkat sihir vertikal dengan kepala astrolabe bercahaya
    parts.push(
      pxRect(14, 16, 3, 34, sCol), // batang tongkat
      pxRect(11, 11, 9, 7, pCol), // cincin kepala tongkat
      pxRect(13, 13, 5, 3, glow), // inti kristal
      pxRect(14, 9, 3, 2, '#FFFFFF')
    );
  } else if (arch === 'HALBERD_SPEAR') {
    // Tombak halberd panjang
    parts.push(
      pxRect(15, 12, 2, 38, sCol),
      pxRect(10, 14, 5, 8, pCol), // mata kapak
      pxRect(14, 8, 4, 6, glow), // ujung tombak
      pxRect(15, 6, 2, 3, '#FFFFFF')
    );
  } else if (arch === 'ASTRAL_BOW') {
    // Busur lengkung bercahaya
    parts.push(
      pxRect(11, 18, 3, 22, pCol),
      pxRect(14, 16, 3, 3, sCol),
      pxRect(14, 39, 3, 3, sCol),
      pxRect(16, 18, 1, 21, glow), // tali busur cahaya
      pxRect(9, 28, 10, 2, '#FFFFFF') // anak panah terpasang
    );
  } else if (arch === 'TWIN_DAGGERS') {
    // Katana / belati kembar bercahaya
    parts.push(
      pxRect(17, 37, 4, 2, sCol),
      pxRect(9, 24, 9, 3, pCol),
      pxRect(7, 22, 10, 2, glow),
      pxRect(42, 38, 9, 2, pCol),
      pxRect(44, 37, 8, 2, glow)
    );
  } else {
    // LONGSWORD (Starfall Blade / Dawnblade)
    parts.push(
      pxRect(18, 37, 4, 3, sCol), // pommel & grip
      pxRect(15, 35, 8, 2, sCol), // guard emas
      pxRect(13, 15, 4, 20, pCol), // bilah utama
      pxRect(14, 13, 2, 22, glow), // tepi cahaya kristal
      pxRect(14, 11, 2, 2, '#FFFFFF') // ujung bintang
    );
  }

  return `<g id="pd-layer-6-weapon" data-layer="weapon" data-item-id="${weaponItem?.id || 'default-blade'}">${parts.join('')}</g>`;
}
