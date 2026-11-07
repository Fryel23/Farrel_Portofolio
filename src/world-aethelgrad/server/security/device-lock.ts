/**
 * src/world-aethelgrad/server/security/device-lock.ts
 * Sistem Anti-Multi-Account (Satu Perangkat Satu Akun Lock) untuk Aethelgrad.
 *
 * Menggabungkan sinyal perangkat keras klien (clientFingerprintHash, platform,
 * screenGeometry, timezone, language) ke dalam SHA-256 Device Lock Hash yang
 * deterministik dan memeriksa apakah perangkat sudah terikat pada sebuah akun Hunter.
 */

import crypto from 'node:crypto';
import type { DeviceSignalPayload, HunterCredentialsRecord } from '../../types/auth.types.ts';

const DEVICE_PEPPER = 'AETHELGRAD_OMEGA_V15_DEVICE_SHIELD_PEPPER_2026';

export function normalizeDeviceSignal(raw: Partial<DeviceSignalPayload> | undefined): DeviceSignalPayload {
  const clean = (val: unknown, fallback: string) =>
    typeof val === 'string' && val.trim().length > 0
      ? val.trim().slice(0, 180)
      : fallback;

  return {
    clientFingerprintHash: clean(raw?.clientFingerprintHash, 'default-fp-0000'),
    userAgent: clean(raw?.userAgent, 'unknown-ua'),
    platform: clean(raw?.platform, 'unknown-platform'),
    screenGeometry: clean(raw?.screenGeometry, '1920x1080x24'),
    timezone: clean(raw?.timezone, 'Asia/Jakarta'),
    language: clean(raw?.language, 'id-ID'),
  };
}

/**
 * Menghitung hash perangkat otoritatif (64 karakter hex SHA-256).
 */
export function computeBoundDeviceHash(signal: Partial<DeviceSignalPayload> | undefined): string {
  const norm = normalizeDeviceSignal(signal);
  const canonicalString = [
    norm.clientFingerprintHash.toLowerCase(),
    norm.platform.toLowerCase(),
    norm.screenGeometry.toLowerCase(),
    norm.timezone.toLowerCase(),
  ].join('|');

  return crypto
    .createHmac('sha256', DEVICE_PEPPER)
    .update(canonicalString, 'utf8')
    .digest('hex');
}

/**
 * Mencari apakah sebuah boundDeviceHash sudah memiliki akun Hunter terdaftar.
 */
export function findAccountByDeviceHash(
  credentialsMap: Record<string, HunterCredentialsRecord>,
  boundDeviceHash: string
): HunterCredentialsRecord | null {
  for (const record of Object.values(credentialsMap)) {
    if (record.boundDeviceHash === boundDeviceHash) {
      return record;
    }
  }
  return null;
}

/**
 * Memverifikasi apakah pendaftaran baru diizinkan pada perangkat ini.
 * Jika perangkat sudah terikat pada akun lain, mengembalikan allowed: false
 * beserta username yang terikat agar Smart Auth Gate mengarahkan ke LOGIN.
 */
export function checkDeviceRegistrationEligibility(
  credentialsMap: Record<string, HunterCredentialsRecord>,
  boundDeviceHash: string
): {
  readonly allowed: boolean;
  readonly existingUsername: string | null;
  readonly existingHunterId: string | null;
} {
  const existing = findAccountByDeviceHash(credentialsMap, boundDeviceHash);
  if (existing) {
    return {
      allowed: false,
      existingUsername: existing.username,
      existingHunterId: existing.hunterId,
    };
  }
  return {
    allowed: true,
    existingUsername: null,
    existingHunterId: null,
  };
}
