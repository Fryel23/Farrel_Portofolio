/**
 * src/pages/api/aethelgrad/equip-item.json.ts
 * Endpoint pemasangan Equipment 5-Slot & penggantian Hero Aktif pada Paper-Doll.
 */

import type { APIRoute } from 'astro';
import { calculateHunterCombatStats } from '../../../world-aethelgrad/server/engines/combat-power-calculator.ts';
import {
  createStarterHunterProfile,
  equipHunterLoadout,
  getHunterProfileById,
} from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import {
  parseCookieHeader,
  SESSION_COOKIE_NAME,
  verifyHunterSessionToken,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';
import { composeHeroPaperDollSvg } from '../../../world-aethelgrad/svg-paperdoll/paperdoll-composer.ts';
import type { EquipmentSlot } from '../../../world-aethelgrad/types/equipment.types.ts';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/equip-item.json',
      slots: ['WEAPON', 'ARMOR', 'HELMET', 'OFFHAND', 'RELIC_CAPE'],
      ready: true,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, message: 'Invalid JSON payload.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const cookies = parseCookieHeader(request?.headers?.get('cookie'));
  const token =
    (typeof body.sessionToken === 'string' ? body.sessionToken : null) ||
    cookies[SESSION_COOKIE_NAME];
  const session = verifyHunterSessionToken(token);

  const profile =
    (session && getHunterProfileById(session.hunterId)) ||
    createStarterHunterProfile('hunter-preview-vanguard', 'Vanguard-702');

  try {
    const updatedProfile = equipHunterLoadout(profile, {
      activeHeroId: typeof body.activeHeroId === 'string' ? body.activeHeroId : undefined,
      slot: typeof body.slot === 'string' ? (body.slot as EquipmentSlot) : undefined,
      itemId:
        body.itemId === null
          ? null
          : typeof body.itemId === 'string'
            ? body.itemId
            : undefined,
    });

    const combatStats = calculateHunterCombatStats(updatedProfile);
    const ownedHero = updatedProfile.ownedHeroes[updatedProfile.activeHeroId];
    const paperDollSvg = composeHeroPaperDollSvg({
      heroId: updatedProfile.activeHeroId,
      currentStars: ownedHero?.currentStars,
      equippedLoadout: updatedProfile.equippedLoadout,
    });

    return new Response(
      JSON.stringify(
        {
          ok: true,
          profile: updatedProfile,
          combatStats,
          paperDollSvg,
        },
        null,
        2
      ),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: err instanceof Error ? err.message : 'Equip failed.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
