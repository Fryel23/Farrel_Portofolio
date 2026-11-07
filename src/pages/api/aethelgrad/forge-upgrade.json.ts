/**
 * src/pages/api/aethelgrad/forge-upgrade.json.ts
 * Endpoint Grimoire Forge: Promosi Bintang Hero (★1 -> ★5), Level Up, & Enhance Equipment (+0 -> +15).
 */

import type { APIRoute } from 'astro';
import {
  executeForgeUpgrade,
  type ForgeActionType,
} from '../../../world-aethelgrad/server/engines/forge-synthesis-engine.ts';
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
      endpoint: '/api/aethelgrad/forge-upgrade.json',
      actions: ['PROMOTE_HERO_STAR', 'LEVEL_UP_HERO', 'ENHANCE_EQUIPMENT'],
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

  const action = (body.action as ForgeActionType) || 'PROMOTE_HERO_STAR';
  const targetId = typeof body.targetId === 'string' ? body.targetId : '';

  try {
    const { result, updatedProfile } = executeForgeUpgrade(profile, {
      action,
      targetId,
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
        message: err instanceof Error ? err.message : 'Forge upgrade failed.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
