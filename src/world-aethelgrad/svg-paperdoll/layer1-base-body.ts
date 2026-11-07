/**
 * src/world-aethelgrad/svg-paperdoll/layer1-base-body.ts
 * Layer 1 (pd-layer-1-body): Tubuh Dasar Pixel (Kaki, Sepatu, Lengan, & Leher).
 */

import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { pxRect } from './pixel-grid-builder.ts';

export function renderLayer1BaseBody(hero: HeroCatalogEntry): string {
  const skin = hero.visualDna.skinTone;
  const shadow = hero.visualDna.skinShadow;

  const parts: string[] = [
    // Leher
    pxRect(29, 25, 6, 3, shadow),
    // Torso dasar
    pxRect(24, 28, 16, 13, '#1E293B'),
    // Lengan kiri & tangan kiri
    pxRect(20, 28, 4, 10, '#334155'),
    pxRect(20, 38, 4, 3, skin),
    // Lengan kanan & tangan kanan
    pxRect(40, 28, 4, 10, '#334155'),
    pxRect(40, 38, 4, 3, skin),
    // Paha & lutut
    pxRect(25, 41, 5, 6, '#0F172A'),
    pxRect(34, 41, 5, 6, '#0F172A'),
    // Sepatu tempur (Boots)
    pxRect(24, 47, 6, 6, '#1E293B'),
    pxRect(34, 47, 6, 6, '#1E293B'),
    pxRect(24, 51, 6, 2, hero.visualDna.defaultArmorTrim),
    pxRect(34, 51, 6, 2, hero.visualDna.defaultArmorTrim),
  ];

  return `<g id="pd-layer-1-body" data-layer="body">${parts.join('')}</g>`;
}
