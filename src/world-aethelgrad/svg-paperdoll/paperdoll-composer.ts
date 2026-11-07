/**
 * Komposer 7-Layer 16-Bit Pixel SVG Paper-Doll Engine (64x64 Grid, crispEdges).
 */

import { getEquipmentById } from '../catalog/items-index.ts';
import { getHeroById, HEROES_CATALOG } from '../catalog/heroes-index.ts';
import type { EquippedLoadoutMap } from '../types/equipment.types.ts';
import type { HeroRarityStars } from '../types/hero.types.ts';
import { renderLayer0BackAura } from './layer0-back-aura.ts';
import { renderLayer1BaseBody } from './layer1-base-body.ts';
import { renderLayer2ChestArmor } from './layer2-chest-armor.ts';
import { renderLayer3HeadHair } from './layer3-head-hair.ts';
import { renderLayer4HelmetCrown } from './layer4-helmet-crown.ts';
import { renderLayer5OffhandGear } from './layer5-offhand-gear.ts';
import { renderLayer6MainWeapon } from './layer6-main-weapon.ts';

export interface PaperDollRenderOptions {
  readonly heroId: string;
  readonly currentStars?: HeroRarityStars;
  readonly equippedLoadout?: Partial<EquippedLoadoutMap>;
  readonly sizePx?: number;
  readonly showPedestal?: boolean;
  readonly className?: string;
}

export function composeHeroPaperDollSvg(options: PaperDollRenderOptions): string {
  const hero = getHeroById(options.heroId) || HEROES_CATALOG[0];
  const stars: HeroRarityStars = options.currentStars || hero.baseStars;
  const loadout = options.equippedLoadout || {};

  const weaponItem =
    loadout.WEAPON === null
      ? undefined
      : getEquipmentById(loadout.WEAPON) ||
        (hero.signatureWeaponId ? getEquipmentById(hero.signatureWeaponId) : undefined);
  const armorItem = loadout.ARMOR === null ? undefined : getEquipmentById(loadout.ARMOR);
  const helmetItem = loadout.HELMET === null ? undefined : getEquipmentById(loadout.HELMET);
  const offhandItem = loadout.OFFHAND === null ? undefined : getEquipmentById(loadout.OFFHAND);
  const relicItem = loadout.RELIC_CAPE === null ? undefined : getEquipmentById(loadout.RELIC_CAPE);

  const size = options.sizePx || 160;
  const cls = options.className ? ` class="ag-pixel-sprite ${options.className}"` : ' class="ag-pixel-sprite"';
  const showPedestal = options.showPedestal !== false;

  const l0 = renderLayer0BackAura(hero, stars, relicItem, showPedestal);
  const l1 = renderLayer1BaseBody(hero);
  const l2 = renderLayer2ChestArmor(hero, armorItem);
  const l3 = renderLayer3HeadHair(hero);
  const l4 = renderLayer4HelmetCrown(helmetItem);
  const l5 = renderLayer5OffhandGear(offhandItem);
  const l6 = renderLayer6MainWeapon(hero, weaponItem);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" shape-rendering="crispEdges"${cls} role="img" aria-label="${hero.name}">`,
    l0,
    l1,
    l2,
    l3,
    l4,
    l5,
    l6,
    `</svg>`,
  ].join('');
}
