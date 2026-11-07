/**
 * Layer 1 (pd-layer-1-body): Tubuh Dasar 16-Bit (Sepatu Sabaton, Pelindung Lutut, Lengan, & Leher).
 * Menggunakan outline #14161F, base tone, dan highlight specular 1x1/2x1.
 */

import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer1BaseBody(hero: HeroCatalogEntry): string {
  const skin = hero.visualDna.skinTone;
  const shadow = hero.visualDna.skinShadow;
  const trim = hero.visualDna.defaultArmorTrim;
  const armorBase = hero.visualDna.defaultArmorPrimary;

  const parts: string[] = [
    // Leher berbayang
    pxRect(28, 24, 8, 4, PIXEL_OUTLINE_DARK),
    pxRect(29, 25, 6, 3, shadow),
    pxStep2(30, 25, skin),

    // Siluet bahu & torso dalam
    pxRect(23, 27, 18, 14, PIXEL_OUTLINE_DARK),
    pxRect(24, 28, 16, 12, '#1E2436'),

    // Lengan kiri & gauntlet
    pxRect(19, 28, 5, 13, PIXEL_OUTLINE_DARK),
    pxRect(20, 29, 3, 7, '#2B334B'),
    pxStep2(20, 34, trim),
    pxRect(20, 36, 3, 4, skin),
    pxDot(20, 36, shadow),
    pxDot(22, 37, PIXEL_SPECULAR_LIGHT),

    // Lengan kanan & gauntlet
    pxRect(40, 28, 5, 13, PIXEL_OUTLINE_DARK),
    pxRect(41, 29, 3, 7, '#2B334B'),
    pxStep2(41, 34, trim),
    pxRect(41, 36, 3, 4, skin),
    pxDot(43, 36, shadow),
    pxDot(41, 37, PIXEL_SPECULAR_LIGHT),

    // Paha & pelindung lutut (Poleyn) kiri
    pxRect(24, 41, 7, 7, PIXEL_OUTLINE_DARK),
    pxRect(25, 41, 5, 6, '#1E2436'),
    pxRect(25, 44, 5, 2, armorBase),
    pxStep2(26, 44, trim),
    pxDot(26, 44, PIXEL_SPECULAR_LIGHT),

    // Paha & pelindung lutut (Poleyn) kanan
    pxRect(33, 41, 7, 7, PIXEL_OUTLINE_DARK),
    pxRect(34, 41, 5, 6, '#1E2436'),
    pxRect(34, 44, 5, 2, armorBase),
    pxStep2(36, 44, trim),
    pxDot(37, 44, PIXEL_SPECULAR_LIGHT),

    // Sepatu tempur (Sabaton / Greaves) kiri dengan 3-tone shading
    pxRect(23, 47, 8, 7, PIXEL_OUTLINE_DARK),
    pxRect(24, 48, 6, 5, armorBase),
    pxRect(24, 50, 6, 2, trim),
    pxStep2(25, 48, PIXEL_SPECULAR_LIGHT),
    pxRect(23, 52, 7, 1, '#272E42'),

    // Sepatu tempur (Sabaton / Greaves) kanan dengan 3-tone shading
    pxRect(33, 47, 8, 7, PIXEL_OUTLINE_DARK),
    pxRect(34, 48, 6, 5, armorBase),
    pxRect(34, 50, 6, 2, trim),
    pxStep2(37, 48, PIXEL_SPECULAR_LIGHT),
    pxRect(34, 52, 7, 1, '#272E42'),
  ];

  return `<g id="pd-layer-1-body" data-layer="body">${parts.join('')}</g>`;
}
