/**
 * src/world-aethelgrad/client/device/client-fingerprint.ts
 * Pengumpul Sinyal Perangkat Keras & Kriptografis Klien untuk Kebijakan 1-Device-1-Account.
 */

import type { DeviceSignalPayload } from '../../types/auth.types.ts';

const LOCAL_DEVICE_SEED_KEY = 'aethelgrad_device_hardware_seed_v15';
export const KNOWN_HUNTER_STORAGE_KEY = 'aethelgrad_bound_hunter_username_v15';

function simpleHashHex(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}${hex1}${hex2}`;
}

export function collectClientDeviceSignal(): DeviceSignalPayload {
  if (typeof window === 'undefined') {
    return {
      clientFingerprintHash: 'ssr-node-device-0000',
      userAgent: 'node-ssr',
      platform: 'linux',
      screenGeometry: '1920x1080x24',
      timezone: 'Asia/Jakarta',
      language: 'id-ID',
    };
  }

  let persistentSeed = '';
  try {
    persistentSeed = window.localStorage.getItem(LOCAL_DEVICE_SEED_KEY) || '';
    if (!persistentSeed) {
      const hwConcurrency = String(navigator.hardwareConcurrency || 4);
      const maxTouch = String(navigator.maxTouchPoints || 0);
      const screenSpec = `${window.screen?.width || 1920}x${window.screen?.height || 1080}x${window.screen?.colorDepth || 24}`;
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      persistentSeed = simpleHashHex(
        `${navigator.platform}|${hwConcurrency}|${maxTouch}|${screenSpec}|${tz}`
      );
      window.localStorage.setItem(LOCAL_DEVICE_SEED_KEY, persistentSeed);
    }
  } catch {
    persistentSeed = 'fallback-browser-seed';
  }

  const screenGeometry = `${window.screen?.width || 1920}x${window.screen?.height || 1080}x${window.screen?.colorDepth || 24}`;
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const platform = navigator.platform || 'web-platform';
  const language = navigator.language || 'id-ID';
  const userAgent = navigator.userAgent || 'browser';

  const clientFingerprintHash = simpleHashHex(
    `${persistentSeed}|${platform}|${screenGeometry}|${timezone}`
  );

  return {
    clientFingerprintHash,
    userAgent,
    platform,
    screenGeometry,
    timezone,
    language,
  };
}
