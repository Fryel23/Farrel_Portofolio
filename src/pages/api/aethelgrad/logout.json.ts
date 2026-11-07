/**
 * src/pages/api/aethelgrad/logout.json.ts
 * Endpoint Logout Sesi Hunter (Mempertahankan Device Bind Marker agar kunjungan berikutnya langsung ke Login).
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME } from '../../../world-aethelgrad/server/security/session-hmac.ts';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Session logout endpoint ready.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
};

export const POST: APIRoute = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );

  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Sesi Hunter ditutup. Perangkat Anda tetap terikat pada akun Anda untuk Login berikutnya.',
    }),
    {
      status: 200,
      headers,
    }
  );
};
