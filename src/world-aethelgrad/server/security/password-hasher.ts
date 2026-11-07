/**
 * src/world-aethelgrad/server/security/password-hasher.ts
 * Hashing Password Kriptografis PBKDF2-HMAC-SHA512 (100.000 Iterasi + 32-Byte Salt).
 */

import crypto from 'node:crypto';

export const PBKDF2_ITERATIONS = 100_000;
export const PBKDF2_KEYLEN_BYTES = 64;
export const PBKDF2_DIGEST = 'sha512';
export const SALT_BYTES = 32;

export interface PasswordHashBundle {
  readonly passwordHashHex: string;
  readonly passwordSaltHex: string;
  readonly pbkdf2Iterations: number;
}

/**
 * Menghasilkan hash PBKDF2-HMAC-SHA512 dengan salt acak 32-byte.
 */
export function hashHunterPassword(plainPassword: string): PasswordHashBundle {
  const saltBuf = crypto.randomBytes(SALT_BYTES);
  const derivedKey = crypto.pbkdf2Sync(
    plainPassword,
    saltBuf,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN_BYTES,
    PBKDF2_DIGEST
  );
  return {
    passwordHashHex: derivedKey.toString('hex'),
    passwordSaltHex: saltBuf.toString('hex'),
    pbkdf2Iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Memverifikasi password terhadap hash tersimpan menggunakan perbandingan waktu konstan
 * (`crypto.timingSafeEqual`) untuk mencegah serangan timing side-channel.
 */
export function verifyHunterPassword(
  plainPassword: string,
  storedHashHex: string,
  storedSaltHex: string,
  iterations: number = PBKDF2_ITERATIONS
): boolean {
  try {
    const saltBuf = Buffer.from(storedSaltHex, 'hex');
    const expectedBuf = Buffer.from(storedHashHex, 'hex');
    if (saltBuf.length === 0 || expectedBuf.length !== PBKDF2_KEYLEN_BYTES) {
      return false;
    }
    const safeIterations = Math.max(10_000, Math.min(500_000, iterations));
    const candidateBuf = crypto.pbkdf2Sync(
      plainPassword,
      saltBuf,
      safeIterations,
      PBKDF2_KEYLEN_BYTES,
      PBKDF2_DIGEST
    );
    if (candidateBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuf, expectedBuf);
  } catch {
    return false;
  }
}
