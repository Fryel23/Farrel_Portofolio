/**
 * src/world-aethelgrad/types/auth.types.ts
 * Domain contracts untuk autentikasi Hunter, sesi HMAC, dan penguncian 1-Device-1-Account.
 */

export type AuthGateMode = 'AUTHENTICATED' | 'LOGIN_BOUND_DEVICE' | 'REGISTER_NEW_DEVICE';

export interface DeviceSignalPayload {
  readonly clientFingerprintHash: string;
  readonly userAgent: string;
  readonly platform: string;
  readonly screenGeometry: string;
  readonly timezone: string;
  readonly language: string;
}

export interface HunterCredentialsRecord {
  readonly hunterId: string;
  readonly username: string;
  readonly usernameLower: string;
  readonly passwordHashHex: string;
  readonly passwordSaltHex: string;
  readonly pbkdf2Iterations: number;
  readonly boundDeviceHash: string;
  readonly createdAtIso: string;
  readonly lastLoginIso: string;
}

export interface AuthSessionPayload {
  readonly hunterId: string;
  readonly username: string;
  readonly boundDeviceHash: string;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
}

export interface AuthStatusResponse {
  readonly ok: boolean;
  readonly gateMode: AuthGateMode;
  readonly isAuthenticated: boolean;
  readonly isDeviceBound: boolean;
  readonly boundUsername: string | null;
  readonly sessionHunter: {
    readonly hunterId: string;
    readonly username: string;
  } | null;
}

export interface AuthActionResult {
  readonly ok: boolean;
  readonly status: number;
  readonly code:
    | 'AUTH_OK'
    | 'REGISTERED_AND_BOUND'
    | 'DEVICE_ALREADY_BOUND'
    | 'USERNAME_TAKEN'
    | 'INVALID_CREDENTIALS'
    | 'DEVICE_MISMATCH'
    | 'MALICIOUS_INPUT_BLOCKED'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMITED';
  readonly message: string;
  readonly sessionToken?: string;
  readonly hunterId?: string;
  readonly username?: string;
  readonly boundUsername?: string;
}
