/**
 * src/pages/api/aethelgrad/gacha-summon.json.ts
 * Endpoint Astral Summoning Altar (1x & 10x Gacha + Soft/Hard Pity).
 */

import type { APIRoute } from 'astro';
import { executeGachaSummon } from '../../../world-aethelgrad/server/engines/gacha-rng-engine.ts';
import {
  createStarterHunterProfile,
  getHunterProfileById,
  updateHunterProfileInVault,
} from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import {
  parseCookieHeader,
  SESSION_COOKIE_NAME,
  verifyHunterSessionToken,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';
import type { GachaBannerId } from '../../../world-aethelgrad/types/gacha.types.ts';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/gacha-summon.json',
      banners: ['STANDARD_ASTRAL_ALTAR', 'HERO_SOVEREIGN_BANNER', 'ARMS_RELIC_BANNER'],
      softPity: 35,
      hardPity: 50,
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

  const bannerId = (body.bannerId as GachaBannerId) || 'STANDARD_ASTRAL_ALTAR';
  const pullCount = body.pullCount === 10 ? 10 : 1;

  try {
    const { result, updatedProfile } = executeGachaSummon(profile, {
      bannerId,
      pullCount,
      useTickets: Boolean(body.useTickets),
    });
    if (session) {
      updateHunterProfileInVault(updatedProfile);
    }
    return new Response(
      JSON.stringify({ ...result, profile: updatedProfile }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: err instanceof Error ? err.message : 'Gacha summon failed.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
