/**
 * src/world-aethelgrad/server/security/session-hmac.ts
 * Penerbit & Verifikator Token Sesi Kriptografis HMAC-SHA256.
 */

import crypto from 'node:crypto';
import type { AuthSessionPayload } from '../../types/auth.types.ts';

const SESSION_SECRET =
  process.env.AETHELGRAD_SESSION_SECRET ||
  'AETHELGRAD_INFINITE_SPIRE_HMAC_SECRET_KEY_V15_2026_SECURE';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 hari

export const SESSION_COOKIE_NAME = 'aethelgrad_hunter_session';
export const DEVICE_BIND_COOKIE_NAME = 'aethelgrad_bound_hunter';

export function signHunterSessionToken(input: {
  readonly hunterId: string;
  readonly username: string;
  readonly boundDeviceHash: string;
  readonly nowMs?: number;
}): string {
  const issuedAtMs = input.nowMs ?? Date.now();
  const payload: AuthSessionPayload = {
    hunterId: input.hunterId,
    username: input.username,
    boundDeviceHash: input.boundDeviceHash,
    issuedAtMs,
    expiresAtMs: issuedAtMs + SESSION_TTL_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureB64 = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64, 'utf8')
    .digest('base64url');

  return `${payloadB64}.${signatureB64}`;
}

export function verifyHunterSessionToken(
  token: string | null | undefined,
  nowMs: number = Date.now()
): AuthSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  const expectedSigB64 = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64, 'utf8')
    .digest('base64url');

  const sigBuf = Buffer.from(signatureB64, 'utf8');
  const expBuf = Buffer.from(expectedSigB64, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const rawJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawJson) as AuthSessionPayload;
    if (
      !parsed ||
      typeof parsed.hunterId !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.boundDeviceHash !== 'string' ||
      typeof parsed.expiresAtMs !== 'number'
    ) {
      return null;
    }
    if (nowMs > parsed.expiresAtMs) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}
