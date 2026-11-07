/**
 * src/pages/api/aethelgrad/state.json.ts
 * Endpoint pembacaan state dunia Aethelgrad, katalog ringkas, & Live Leaderboard.
 */

import type { APIRoute } from 'astro';
import { calculateHunterCombatStats } from '../../../world-aethelgrad/server/engines/combat-power-calculator.ts';
import {
  buildColosseumLeaderboard,
  createStarterHunterProfile,
  getHunterProfileById,
} from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import {
  parseCookieHeader,
  SESSION_COOKIE_NAME,
  verifyHunterSessionToken,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async ({ request }) => {
  const cookies = parseCookieHeader(request?.headers?.get('cookie'));
  const session = verifyHunterSessionToken(cookies[SESSION_COOKIE_NAME]);
  const profile =
    (session && getHunterProfileById(session.hunterId)) ||
    createStarterHunterProfile('hunter-outpost-vanguard', 'Vanguard-702');

  const combatStats = calculateHunterCombatStats(profile);
  const leaderboard = buildColosseumLeaderboard(profile);

  return new Response(
    JSON.stringify(
      {
        ok: true,
        authenticated: Boolean(session),
        profile,
        combatStats,
        leaderboard,
      },
      null,
      2
    ),
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
    body = {};
  }

  const cookies = parseCookieHeader(request?.headers?.get('cookie'));
  const token =
    (typeof body.sessionToken === 'string' ? body.sessionToken : null) ||
    cookies[SESSION_COOKIE_NAME];
  const session = verifyHunterSessionToken(token);
  const profile =
    (session && getHunterProfileById(session.hunterId)) ||
    createStarterHunterProfile('hunter-outpost-vanguard', 'Vanguard-702');

  const combatStats = calculateHunterCombatStats(profile);
  const leaderboard = buildColosseumLeaderboard(profile);

  return new Response(
    JSON.stringify(
      {
        ok: true,
        authenticated: Boolean(session),
        profile,
        combatStats,
        leaderboard,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
};
