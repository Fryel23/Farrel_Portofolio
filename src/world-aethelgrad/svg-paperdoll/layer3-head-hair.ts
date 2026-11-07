/**
 * Layer 3 (pd-layer-3-head / .pd-head-group): Wajah JRPG 16-Bit, Mata Berkedip, & Poni Bertingkat.
 *  - Sklera putih, iris 2x3, catchlight 1x1, dan kelopak berkedip (.pd-eye-blink).
 *  - Poni bertingkat dengan bayangan dahi (skinShadow) dan 3-tone shading rambut.
 */

import type { HeroCatalogEntry } from '../types/hero.types.ts';
import { PIXEL_OUTLINE_DARK, PIXEL_SPECULAR_LIGHT, pxDot, pxRect, pxStep2 } from './pixel-grid-builder.ts';

export function renderLayer3HeadHair(hero: HeroCatalogEntry): string {
  const { skinTone, skinShadow, hairColor, hairHighlight, hairStyle, eyeColor } = hero.visualDna;

  const backHairParts: string[] = [];
  if (hairStyle === 'ROYAL_LONG') {
    backHairParts.push(
      pxRect(19, 14, 26, 18, PIXEL_OUTLINE_DARK),
      pxRect(20, 15, 24, 16, hairColor),
      pxStep2(21, 18, hairHighlight),
      pxStep2(41, 18, hairHighlight),
      pxDot(21, 28, PIXEL_OUTLINE_DARK),
      pxDot(42, 28, PIXEL_OUTLINE_DARK)
    );
  } else if (hairStyle === 'TWIN_VALKYRIE') {
    backHairParts.push(
      // Twin-tail kiri bertingkat piksel
      pxRect(16, 14, 6, 19, PIXEL_OUTLINE_DARK),
      pxRect(17, 15, 4, 17, hairColor),
      pxDot(18, 17, hairHighlight),
      pxDot(18, 18, hairHighlight),
      pxDot(17, 29, hairHighlight),
      // Twin-tail kanan bertingkat piksel
      pxRect(42, 14, 6, 19, PIXEL_OUTLINE_DARK),
      pxRect(43, 15, 4, 17, hairColor),
      pxDot(45, 17, hairHighlight),
      pxDot(45, 18, hairHighlight),
      pxDot(46, 29, hairHighlight)
    );
  }

  const faceParts: string[] = [
    // Outline kepala & rahang 16-bit JRPG
    pxRect(22, 11, 20, 14, PIXEL_OUTLINE_DARK),
    pxRect(24, 24, 16, 2, PIXEL_OUTLINE_DARK),

    // Telinga kiri & kanan
    pxRect(21, 17, 2, 4, PIXEL_OUTLINE_DARK),
    pxRect(22, 18, 1, 2, skinShadow),
    pxRect(41, 17, 2, 4, PIXEL_OUTLINE_DARK),
    pxRect(41, 18, 1, 2, skinShadow),

    // Wajah utama & bayangan dahi / dagu (3-tone skin)
    pxRect(23, 12, 18, 12, skinTone),
    pxRect(25, 23, 14, 2, skinTone),
    // Bayangan dahi di bawah poni
    pxRect(23, 13, 18, 2, skinShadow),
    // Bayangan pipi & dagu halus
    pxRect(24, 23, 3, 1, skinShadow),
    pxRect(37, 23, 3, 1, skinShadow),
    pxRect(26, 24, 12, 1, skinShadow),
    // Hidung & bibir ekspresif 1x1 / 2x1
    pxDot(32, 20, skinShadow),
    pxStep2(31, 22, skinShadow),
  ];

  // Mata 16-bit JRPG: sklera putih, iris 2x3, pupil 1x1, catchlight 1x1
  const eyesOpenParts: string[] = [
    // Alis kiri & kanan
    pxRect(25, 16, 4, 1, PIXEL_OUTLINE_DARK),
    pxRect(35, 16, 4, 1, PIXEL_OUTLINE_DARK),

    // Bulu mata atas kiri
    pxRect(25, 17, 4, 1, PIXEL_OUTLINE_DARK),
    // Sklera putih kiri (1x3 di tepi luar)
    pxRect(25, 18, 1, 3, '#F8FAFC'),
    // Iris 2x3 kiri
    pxRect(26, 18, 2, 3, eyeColor),
    // Bayangan pupil & tepi dalam kiri
    pxRect(28, 18, 1, 3, PIXEL_OUTLINE_DARK),
    pxDot(27, 19, PIXEL_OUTLINE_DARK),
    // Catchlight 1x1 kiri
    pxDot(26, 18, PIXEL_SPECULAR_LIGHT),
    pxDot(27, 20, PIXEL_SPECULAR_LIGHT, 0.75),

    // Bulu mata atas kanan
    pxRect(35, 17, 4, 1, PIXEL_OUTLINE_DARK),
    // Sklera putih kanan (1x3 di tepi luar)
    pxRect(38, 18, 1, 3, '#F8FAFC'),
    // Iris 2x3 kanan
    pxRect(36, 18, 2, 3, eyeColor),
    // Bayangan pupil & tepi dalam kanan
    pxRect(35, 18, 1, 3, PIXEL_OUTLINE_DARK),
    pxDot(36, 19, PIXEL_OUTLINE_DARK),
    // Catchlight 1x1 kanan
    pxDot(37, 18, PIXEL_SPECULAR_LIGHT),
    pxDot(36, 20, PIXEL_SPECULAR_LIGHT, 0.75),
  ];

  // Kelopak mata berkedip (dianimasikan oleh CSS .pd-eye-blink)
  const eyesBlinkParts: string[] = [
    pxRect(25, 17, 4, 4, skinTone),
    pxRect(25, 19, 4, 1, PIXEL_OUTLINE_DARK),
    pxDot(24, 19, skinShadow),
    pxRect(35, 17, 4, 4, skinTone),
    pxRect(35, 19, 4, 1, PIXEL_OUTLINE_DARK),
    pxDot(39, 19, skinShadow),
  ];

  // Rambut atas & poni bertingkat dengan 3-tone shading (#14161F + hairColor + hairHighlight)
  const frontHairParts: string[] = [
    pxRect(21, 8, 22, 6, PIXEL_OUTLINE_DARK),
    pxRect(22, 9, 20, 5, hairColor),
    // Halo highlight specular 1x1 & 2x1 di mahkota rambut
    pxStep2(25, 10, hairHighlight),
    pxDot(27, 9, PIXEL_SPECULAR_LIGHT),
    pxStep2(29, 10, hairHighlight),
    pxStep2(34, 10, hairHighlight),
    pxDot(36, 9, PIXEL_SPECULAR_LIGHT),

    // Cambang / sisi rambut membingkai wajah
    pxRect(20, 12, 3, 11, PIXEL_OUTLINE_DARK),
    pxRect(21, 12, 2, 10, hairColor),
    pxDot(22, 14, hairHighlight),
    pxRect(41, 12, 3, 11, PIXEL_OUTLINE_DARK),
    pxRect(41, 12, 2, 10, hairColor),
    pxDot(41, 14, hairHighlight),

    // Helai poni bertingkat di atas dahi (1x1 & 2x1)
    pxRect(24, 13, 2, 3, hairColor),
    pxDot(25, 16, PIXEL_OUTLINE_DARK),
    pxRect(28, 13, 3, 3, hairColor),
    pxDot(29, 14, hairHighlight),
    pxDot(30, 16, hairColor),
    pxDot(30, 17, PIXEL_OUTLINE_DARK),
    pxRect(33, 13, 3, 2, hairColor),
    pxDot(34, 15, hairColor),
    pxDot(34, 16, PIXEL_OUTLINE_DARK),
    pxRect(38, 13, 2, 3, hairColor),
    pxDot(38, 16, PIXEL_OUTLINE_DARK),
  ];

  if (hairStyle === 'SPIKY_PROTAG' || hairStyle === 'FLAME_CREST') {
    frontHairParts.push(
      pxRect(23, 6, 4, 3, PIXEL_OUTLINE_DARK),
      pxRect(24, 7, 2, 2, hairColor),
      pxDot(25, 7, hairHighlight),
      pxRect(29, 5, 5, 4, PIXEL_OUTLINE_DARK),
      pxRect(30, 6, 3, 3, hairColor),
      pxDot(31, 6, PIXEL_SPECULAR_LIGHT),
      pxRect(36, 6, 4, 3, PIXEL_OUTLINE_DARK),
      pxRect(37, 7, 2, 2, hairColor),
      pxDot(38, 7, hairHighlight)
    );
  } else if (hairStyle === 'HOODED_MYSTIC') {
    frontHairParts.push(
      pxRect(20, 7, 24, 5, PIXEL_OUTLINE_DARK),
      pxRect(21, 8, 22, 4, hairColor),
      pxStep2(31, 8, hairHighlight),
      pxRect(19, 12, 3, 12, PIXEL_OUTLINE_DARK),
      pxRect(20, 12, 2, 11, hairColor),
      pxRect(42, 12, 3, 12, PIXEL_OUTLINE_DARK),
      pxRect(42, 12, 2, 11, hairColor)
    );
  }

  return [
    `<g id="pd-layer-3-head" class="pd-head-group" data-layer="head" data-hero-id="${hero.id}">`,
    backHairParts.join(''),
    faceParts.join(''),
    `<g class="pd-eyes-open">${eyesOpenParts.join('')}</g>`,
    `<g class="pd-eye-blink">${eyesBlinkParts.join('')}</g>`,
    frontHairParts.join(''),
    `</g>`,
  ].join('');
}
