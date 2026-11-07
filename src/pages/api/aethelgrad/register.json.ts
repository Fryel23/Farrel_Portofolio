/**
 * src/pages/api/aethelgrad/register.json.ts
 * Endpoint pendaftaran Hunter baru + penguncian permanen Satu-Perangkat-Satu-Akun.
 */

import type { APIRoute } from 'astro';
import { registerHunterAccount } from '../../../world-aethelgrad/server/persistence/vault-repository.ts';
import { checkRateLimit } from '../../../world-aethelgrad/server/security/rate-limiter.ts';
import {
  DEVICE_BIND_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      endpoint: '/api/aethelgrad/register.json',
      policy: '1_DEVICE_1_ACCOUNT_PBKDF2_SHA512',
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

  const rate = checkRateLimit('register-endpoint', 20, 60_000);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak percobaan pendaftaran. Silakan tunggu sebentar.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const outcome = registerHunterAccount({
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
