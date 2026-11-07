/**
 * src/pages/api/aethelgrad/auth-status.json.ts
 * Endpoint pemeriksaan status Smart Auth Gate & 1-Device-1-Account Lock.
 */

import type { APIRoute } from 'astro';
import { resolveAuthGateStatus } from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import {
  DEVICE_BIND_COOKIE_NAME,
  parseCookieHeader,
  SESSION_COOKIE_NAME,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async ({ request }) => {
  const cookies = parseCookieHeader(request?.headers?.get('cookie'));
  const status = resolveAuthGateStatus({
    sessionToken: cookies[SESSION_COOKIE_NAME] || null,
    hintedUsername: cookies[DEVICE_BIND_COOKIE_NAME] || null,
  });

  return new Response(JSON.stringify(status, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const cookies = parseCookieHeader(request?.headers?.get('cookie'));
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const status = resolveAuthGateStatus({
    sessionToken:
      (typeof body.sessionToken === 'string' ? body.sessionToken : null) ||
      cookies[SESSION_COOKIE_NAME] ||
      null,
    deviceSignal: body.deviceSignal as Record<string, string> | undefined,
    hintedUsername:
      (typeof body.hintedUsername === 'string' ? body.hintedUsername : null) ||
      cookies[DEVICE_BIND_COOKIE_NAME] ||
      null,
  });

  return new Response(JSON.stringify(status, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
