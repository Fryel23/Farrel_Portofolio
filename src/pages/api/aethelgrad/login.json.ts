/**
 * src/pages/api/aethelgrad/login.json.ts
 * Endpoint Login untuk Returning Hunter (Terikat pada Perangkat).
 */

import type { APIRoute } from 'astro';
import { loginHunterAccount } from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import { checkRateLimit } from '../../../world-aethelgrad/server/security/rate-limiter.ts';
import {
  DEVICE_BIND_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/login.json',
      policy: 'RETURNING_HUNTER_SMART_LOGIN',
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
      JSON.stringify({ ok: false, code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const rate = checkRateLimit('login-endpoint', 30, 60_000);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak percobaan login. Silakan tunggu sebentar.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const outcome = loginHunterAccount({
    username: body.username,
    password: body.password,
    deviceSignal: body.deviceSignal as Record<string, string> | undefined,
  });

  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (outcome.ok && outcome.sessionToken && outcome.username) {
    headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(outcome.sessionToken)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1209600`
    );
    headers.append(
      'Set-Cookie',
      `${DEVICE_BIND_COOKIE_NAME}=${encodeURIComponent(outcome.username)}; Path=/; SameSite=Strict; Max-Age=31536000`
    );
  }

  return new Response(JSON.stringify(outcome, null, 2), {
    status: outcome.status,
    headers,
  });
};
