/**
 * src/world-aethelgrad/svg-paperdoll/layer3-head-hair.ts
 * Layer 3 (pd-layer-3-head): Wajah Anime-Pixel, Mata Bercahaya, & Gaya Rambut Hero.
 */

import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer3HeadHair(hero: HeroCatalogEntry): string {
  const { skinTone, skinShadow, hairColor, hairHighlight, hairStyle, eyeColor } = hero.visualDna;

  const parts: string[] = [
    // Rambut belakang (untuk rambut panjang / twin-tails)
    ...(hairStyle === 'ROYAL_LONG'
      ? [pxRect(21, 16, 22, 16, hairColor)]
      : hairStyle === 'TWIN_VALKYRIE'
        ? [pxRect(18, 16, 4, 18, hairColor), pxRect(42, 16, 4, 18, hairColor)]
        : []),

    // Kepala & dagu pixel
    pxRect(24, 13, 16, 12, skinTone),
    pxRect(25, 24, 14, 1, skinShadow),

    // Mata kiri & kanan (gaya RPG pixel ekspresif)
    pxRect(26, 18, 3, 3, '#0F172A'),
    pxRect(26, 18, 2, 2, eyeColor),
    pxRect(26, 18, 1, 1, '#FFFFFF'),

    pxRect(35, 18, 3, 3, '#0F172A'),
    pxRect(36, 18, 2, 2, eyeColor),
    pxRect(36, 18, 1, 1, '#FFFFFF'),

    // Alis tegas
    pxRect(26, 16, 3, 1, hairColor),
    pxRect(35, 16, 3, 1, hairColor),

    // Rambut atas & poni depan
    pxRect(23, 10, 18, 5, hairColor),
    pxRect(25, 11, 12, 2, hairHighlight),
    pxRect(22, 13, 3, 8, hairColor),
    pxRect(39, 13, 3, 8, hairColor),
    pxRect(28, 14, 3, 3, hairColor),
    pxRect(33, 14, 3, 2, hairColor),
  ];

  if (hairStyle === 'SPIKY_PROTAG' || hairStyle === 'FLAME_CREST') {
    parts.push(
      pxRect(24, 8, 4, 2, hairColor),
      pxRect(30, 7, 4, 3, hairColor),
      pxRect(36, 8, 4, 2, hairColor)
    );
  } else if (hairStyle === 'HOODED_MYSTIC') {
    parts.push(
      pxRect(22, 9, 20, 4, hairColor),
      pxRect(21, 13, 2, 11, hairColor),
      pxRect(41, 13, 2, 11, hairColor)
    );
  }

  return `<g id="pd-layer-3-head" data-layer="head" data-hero-id="${hero.id}">${parts.join('')}</g>`;
}
