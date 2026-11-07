/**
 * src/pages/api/aethelgrad/colosseum-duel.json.ts
 * Endpoint pertarungan 1v1 Turn-Based Spire Colosseum & pembaruan Leaderboard.
 */

import type { APIRoute } from 'astro';
import { simulateColosseumDuel } from '../../../world-aethelgrad/server/engines/colosseum-battle-simulator.ts';
import {
  buildColosseumLeaderboard,
  createStarterHunterProfile,
  getHunterProfileById,
  updateHunterProfileInVault,
} from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import {
  parseCookieHeader,
  SESSION_COOKIE_NAME,
  verifyHunterSessionToken,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async () => {
  const leaderboard = buildColosseumLeaderboard();
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/colosseum-duel.json',
      totalCombatants: leaderboard.length,
      leaderboard,
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

  const leaderboard = buildColosseumLeaderboard(profile);
  const defenderId =
    typeof body.defenderHunterId === 'string'
      ? body.defenderHunterId
      : 'npc-guardian-cyberfox';

  const defender =
    leaderboard.find((c) => c.hunterId === defenderId) ||
    leaderboard.find((c) => c.hunterId !== profile.hunterId) ||
    leaderboard[0];

  const { duelResult, updatedProfile } = simulateColosseumDuel(profile, defender);
  if (session) {
    updateHunterProfileInVault(updatedProfile);
  }

  const updatedLeaderboard = buildColosseumLeaderboard(updatedProfile);

  return new Response(
    JSON.stringify(
      {
        ...duelResult,
        profile: updatedProfile,
        leaderboard: updatedLeaderboard,
      },
      null,
      2
    ),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
