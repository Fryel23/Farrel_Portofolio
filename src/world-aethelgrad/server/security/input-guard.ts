/**
 * src/world-aethelgrad/server/security/input-guard.ts
 * Pertahanan Input Berlapis (Anti-SQLi, Anti-NoSQLi, Anti-XSS, Anti-Prototype-Pollution).
 */

export interface InputValidationOutcome {
  readonly ok: boolean;
  readonly isMalicious: boolean;
  readonly sanitizedValue: string;
  readonly reason: string;
}

const SQLI_PATTERNS: readonly RegExp[] = [
  /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|DECLARE)\b\s+)/i,
  /('|\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /--\s*$/m,
  /;\s*(DROP|SELECT|INSERT|UPDATE|DELETE)/i,
  /\/\*[\s\S]*?\*\//,
  /\bWAITFOR\s+DELAY\b/i,
  /\bSLEEP\s*\(/i,
];

const XSS_AND_INJECTION_PATTERNS: readonly RegExp[] = [
  /<\s*\/?\s*(script|iframe|object|embed|svg|img|style|link|meta|body|onload|onerror)\b/i,
  /\bon[a-z]+\s*=/i,
  /\b(javascript|vbscript|data)\s*:/i,
  /\$\{(?:.*)\}/,
  /\{\{(?:.*)\}\}/,
  /\.\.\//,
  /\.\.\\/,
];

const FORBIDDEN_OBJECT_KEYS = new Set<string>([
  '__proto__',
  'constructor',
  'prototype',
  '$gt',
  '$lt',
  '$ne',
  '$eq',
  '$where',
  '$regex',
]);

/**
 * Memeriksa apakah sebuah objek JSON mengandung kunci berbahaya
 * (Prototype Pollution atau operator NoSQL injection).
 */
export function hasDangerousObjectKeys(input: unknown, depth = 0): boolean {
  if (depth > 8 || input === null || typeof input !== 'object') {
    return false;
  }
  const rawKeys = Object.getOwnPropertyNames(input);
  for (const key of rawKeys) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || key.startsWith('$')) {
      return true;
    }
    const val = (input as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && hasDangerousObjectKeys(val, depth + 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Memindai string mentah terhadap pola serangan SQLi, XSS, atau Command Injection.
 */
export function detectMaliciousString(raw: unknown): {
  readonly malicious: boolean;
  readonly threatType: string | null;
} {
  if (typeof raw !== 'string') {
    return { malicious: true, threatType: 'NON_STRING_PAYLOAD' };
  }
  const normalized = raw.normalize('NFKC');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
    return { malicious: true, threatType: 'CONTROL_CHAR_INJECTION' };
  }
  for (const rx of SQLI_PATTERNS) {
    if (rx.test(normalized)) {
      return { malicious: true, threatType: 'SQL_INJECTION_SIGNATURE' };
    }
  }
  for (const rx of XSS_AND_INJECTION_PATTERNS) {
    if (rx.test(normalized)) {
      return { malicious: true, threatType: 'XSS_OR_TEMPLATE_INJECTION_SIGNATURE' };
    }
  }
  if (
    normalized.includes('__proto__') ||
    normalized.includes('constructor.prototype')
  ) {
    return { malicious: true, threatType: 'PROTOTYPE_POLLUTION_SIGNATURE' };
  }
  return { malicious: false, threatType: null };
}

/**
 * Validasi ketat Callsign / Username Hunter Aethelgrad:
 *  - Hanya huruf, angka, garis bawah (_), atau tanda hubung (-)
 *  - Panjang 3 s.d. 20 karakter
 */
export function validateHunterUsername(rawUsername: unknown): InputValidationOutcome {
  if (typeof rawUsername !== 'string') {
    return {
      ok: false,
      isMalicious: true,
      sanitizedValue: '',
      reason: 'Username harus berupa teks.',
    };
  }
  const trimmed = rawUsername.normalize('NFKC').trim();
  const scan = detectMaliciousString(trimmed);
  if (scan.malicious) {
    return {
      ok: false,
      isMalicious: true,
      sanitizedValue: '',
      reason: `Input ditolak oleh Aethelgrad Security Shield (${scan.threatType}).`,
    };
  }
  if (trimmed.length < 3 || trimmed.length > 20) {
    return {
      ok: false,
      isMalicious: false,
      sanitizedValue: '',
      reason: 'Callsign Hunter wajib terdiri dari 3 hingga 20 karakter.',
    };
  }
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(trimmed)) {
    return {
      ok: false,
      isMalicious: false,
      sanitizedValue: '',
      reason: 'Callsign Hunter hanya boleh berisi huruf, angka, tanda hubung (-), atau garis bawah (_).',
    };
  }
  return {
    ok: true,
    isMalicious: false,
    sanitizedValue: trimmed,
    reason: 'VALID',
  };
}

/**
 * Validasi ketat Password Hunter Aethelgrad:
 *  - Panjang 8 s.d. 64 karakter
 *  - Mengandung minimal 1 huruf dan 1 angka
 *  - Bebas dari signature SQLi/XSS
 */
export function validateHunterPassword(rawPassword: unknown): InputValidationOutcome {
  if (typeof rawPassword !== 'string') {
    return {
      ok: false,
      isMalicious: true,
      sanitizedValue: '',
      reason: 'Password harus berupa teks.',
    };
  }
  const scan = detectMaliciousString(rawPassword);
  if (scan.malicious) {
    return {
      ok: false,
      isMalicious: true,
      sanitizedValue: '',
      reason: `Password ditolak oleh Aethelgrad Security Shield (${scan.threatType}).`,
    };
  }
  if (rawPassword.length < 8 || rawPassword.length > 64) {
    return {
      ok: false,
      isMalicious: false,
      sanitizedValue: '',
      reason: 'Password wajib memiliki panjang 8 hingga 64 karakter.',
    };
  }
  if (!/[A-Za-z]/.test(rawPassword) || !/[0-9]/.test(rawPassword)) {
    return {
      ok: false,
      isMalicious: false,
      sanitizedValue: '',
      reason: 'Password wajib mengandung minimal 1 huruf dan 1 angka.',
    };
  }
  return {
    ok: true,
    isMalicious: false,
    sanitizedValue: rawPassword,
    reason: 'VALID',
  };
}
