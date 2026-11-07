/**
 * src/pages/api/aethelgrad/code-sanctum.json.ts
 * Endpoint verifikasi tantangan algoritma The Logic Trials (24 Spells).
 */

import type { APIRoute } from 'astro';
import { verifyAndApplyCodeSpell } from '../../../world-aethelgrad/server/engines/code-spell-verifier.ts';
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

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/code-sanctum.json',
      totalSpells: 24,
      tiers: ['TIER_1_NOVICE', 'TIER_2_ADEPT', 'TIER_3_MAGUS', 'TIER_4_ARCHON'],
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

  const spellId = typeof body.spellId === 'string' ? body.spellId : 'spell-01-exorcise-bug';

  try {
    const { result, updatedProfile } = verifyAndApplyCodeSpell(profile, {
      spellId,
      selectedOptionId:
        typeof body.selectedOptionId === 'string' ? body.selectedOptionId : undefined,
      customCodeAnswer:
        typeof body.customCodeAnswer === 'string' ? body.customCodeAnswer : undefined,
    });
    if (session && result.passed) {
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
        message: err instanceof Error ? err.message : 'Code spell verification failed.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
