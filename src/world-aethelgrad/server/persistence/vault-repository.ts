/**
 * src/world-aethelgrad/server/persistence/vault-repository.ts
 * Repository Persisten Otoritatif untuk Dunia Aethelgrad (`data/aethelgrad/world-vault.json`).
 *
 * Menangani:
 *  - Pendaftaran Hunter baru + Penguncian Satu-Perangkat-Satu-Akun (PBKDF2-SHA512 + Device Lock)
 *  - Smart Login Gate untuk Returning Hunter
 *  - Penyimpanan & pembacaan state profil Hunter, Gacha, Equipment Loadout, Forge,
 *    Logic Trials, dan Live Arena Colosseum Leaderboard.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getHeroById, HEROES_CATALOG } from '../../catalog/heroes-index.ts';
import { getEquipmentById } from '../../catalog/items-index.ts';
import type {
  AuthActionResult,
  AuthStatusResponse,
  DeviceSignalPayload,
  HunterCredentialsRecord,
} from '../../types/auth.types.ts';
import type {
  HunterProfileState,
  LeaderboardCombatantEntry,
} from '../../types/colosseum.types.ts';
import type { EquipmentSlot } from '../../types/equipment.types.ts';
import { calculateHunterCombatStats } from '../engines/combat-power-calculator.ts';
import {
  checkDeviceRegistrationEligibility,
  computeBoundDeviceHash,
  findAccountByDeviceHash,
} from '../security/device-lock.ts';
import {
  hasDangerousObjectKeys,
  validateHunterPassword,
  validateHunterUsername,
} from '../security/input-guard.ts';
import {
  hashHunterPassword,
  verifyHunterPassword,
} from '../security/password-hasher.ts';
import {
  signHunterSessionToken,
  verifyHunterSessionToken,
} from '../security/session-hmac.ts';
import { SEED_TOWER_GUARDIANS } from './seed-guardians.ts';

export interface WorldVaultDatabase {
  readonly schemaVersion: 1;
  readonly updatedAtIso: string;
  readonly credentialsByHunterId: Record<string, HunterCredentialsRecord>;
  readonly profilesByHunterId: Record<string, HunterProfileState>;
}

const DEFAULT_VAULT_PATH = path.resolve(
  process.cwd(),
  'data/aethelgrad/world-vault.json'
);

let inMemoryVault: WorldVaultDatabase | null = null;

function createEmptyVault(): WorldVaultDatabase {
  return {
    schemaVersion: 1,
    updatedAtIso: new Date().toISOString(),
    credentialsByHunterId: {},
    profilesByHunterId: {},
  };
}

export function loadWorldVault(customPath: string = DEFAULT_VAULT_PATH): WorldVaultDatabase {
  if (inMemoryVault && customPath === DEFAULT_VAULT_PATH) {
    return inMemoryVault;
  }
  try {
    if (fs.existsSync(customPath)) {
      const raw = fs.readFileSync(customPath, 'utf8');
      const parsed = JSON.parse(raw) as WorldVaultDatabase;
      if (
        parsed &&
        parsed.schemaVersion === 1 &&
        parsed.credentialsByHunterId &&
        parsed.profilesByHunterId
      ) {
        if (customPath === DEFAULT_VAULT_PATH) {
          inMemoryVault = parsed;
        }
        return parsed;
      }
    }
  } catch {
    // Fallback ke in-memory jika filesystem read-only
  }
  const fresh = createEmptyVault();
  if (customPath === DEFAULT_VAULT_PATH) {
    inMemoryVault = fresh;
  }
  return fresh;
}

export function saveWorldVault(
  vault: WorldVaultDatabase,
  customPath: string = DEFAULT_VAULT_PATH
): void {
  const nextVault: WorldVaultDatabase = {
    ...vault,
    updatedAtIso: new Date().toISOString(),
  };
  if (customPath === DEFAULT_VAULT_PATH) {
    inMemoryVault = nextVault;
  }
  try {
    const dir = path.dirname(customPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(customPath, JSON.stringify(nextVault, null, 2) + '\n', 'utf8');
  } catch {
    // Di lingkungan serverless read-only, inMemoryVault tetap menjaga state aktif
  }
}

export function resetInMemoryVaultForTesting(): void {
  inMemoryVault = createEmptyVault();
}

/**
 * Membuat profil awal Hunter baru dengan bekal yang kaya:
 *  - 1.800 Astral Gems (cukup untuk 2x Multi-Summon 10x!)
 *  - 5 Summon Tickets
 *  - 200 Starlight Dust
 *  - Starter Hero ★1 "Han Islat, Spire Squire" (dapat dipromosikan hingga ★5)
 *  - Vanguard Sovereign Hero ★5 "Evelyn, Dawn Blade"
 *  - 5 Starter Equipment di setiap slot agar Paper-Doll langsung dapat dikustomisasi!
 */
export function createStarterHunterProfile(
  hunterId: string,
  username: string
): HunterProfileState {
  const nowIso = new Date().toISOString();
  return {
    hunterId,
    username,
    titleRank: 'Data Ranger · Spire Initiate',
    accountLevel: 12,
    accountExp: 720,
    astralGems: 1800,
    summonTickets: 5,
    starlightDust: 200,
    pity5StarCounter: 0,
    pity4StarCounter: 0,
    totalSummonsPerformed: 0,
    activeHeroId: 'hero-evelyn-dawnblade',
    equippedLoadout: {
      WEAPON: 'wpn-starfall-blade',
      ARMOR: 'arm-valkyrie-aegis',
      HELMET: 'hlm-valkyrie-crown',
      OFFHAND: 'off-squire-buckler',
      RELIC_CAPE: 'rel-traveler-cloak',
    },
    ownedHeroes: {
      'hero-han-islat': {
        heroId: 'hero-han-islat',
        currentStars: 1,
        level: 10,
        soulShards: 25,
        dupesPulled: 0,
        unlockedAtIso: nowIso,
      },
      'hero-evelyn-dawnblade': {
        heroId: 'hero-evelyn-dawnblade',
        currentStars: 5,
        level: 15,
        soulShards: 20,
        dupesPulled: 0,
        unlockedAtIso: nowIso,
      },
      'hero-talia-rune': {
        heroId: 'hero-talia-rune',
        currentStars: 3,
        level: 10,
        soulShards: 15,
        dupesPulled: 0,
        unlockedAtIso: nowIso,
      },
    },
    ownedEquipment: {
      'wpn-starfall-blade': {
        itemId: 'wpn-starfall-blade',
        enhanceLevel: 2,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'wpn-squire-dawnblade': {
        itemId: 'wpn-squire-dawnblade',
        enhanceLevel: 1,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'arm-valkyrie-aegis': {
        itemId: 'arm-valkyrie-aegis',
        enhanceLevel: 1,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'arm-squire-tunic': {
        itemId: 'arm-squire-tunic',
        enhanceLevel: 0,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'hlm-valkyrie-crown': {
        itemId: 'hlm-valkyrie-crown',
        enhanceLevel: 1,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'off-squire-buckler': {
        itemId: 'off-squire-buckler',
        enhanceLevel: 0,
        count: 1,
        firstObtainedIso: nowIso,
      },
      'rel-traveler-cloak': {
        itemId: 'rel-traveler-cloak',
        enhanceLevel: 0,
        count: 1,
        firstObtainedIso: nowIso,
      },
    },
    solvedSpellIds: [],
    claimedGrimoireIds: ['grim-01-first-steps'],
    arenaWins: 0,
    arenaLosses: 0,
    highestSpireFloor: 1,
    recentActivityLog: [
      `[SYSTEM] Hunter ${username} memasuki Aethelgrad.`,
      `[GIFT] Menerima 1.800 Astral Gems, 5 Summon Tickets, & Starfall Blade [★5].`,
    ],
    updatedAtIso: nowIso,
  };
}

/**
 * Memeriksa status autentikasi & keterikatan perangkat (Returning User vs New Device).
 */
export function resolveAuthGateStatus(input: {
  readonly sessionToken?: string | null;
  readonly deviceSignal?: Partial<DeviceSignalPayload>;
  readonly hintedUsername?: string | null;
}): AuthStatusResponse {
  const vault = loadWorldVault();
  const boundDeviceHash = computeBoundDeviceHash(input.deviceSignal);

  // 1. Cek sesi aktif
  const session = verifyHunterSessionToken(input.sessionToken);
  if (session && vault.profilesByHunterId[session.hunterId]) {
    return {
      ok: true,
      gateMode: 'AUTHENTICATED',
      isAuthenticated: true,
      isDeviceBound: true,
      boundUsername: session.username,
      sessionHunter: {
        hunterId: session.hunterId,
        readonlyUsername: session.username,
        username: session.username,
      } as { readonly hunterId: string; readonly username: string },
    };
  }

  // 2. Cek apakah perangkat ini sudah terikat pada sebuah akun di Vault
  const boundRecord = findAccountByDeviceHash(
    vault.credentialsByHunterId,
    boundDeviceHash
  );
  if (boundRecord) {
    return {
      ok: true,
      gateMode: 'LOGIN_BOUND_DEVICE',
      isAuthenticated: false,
      isDeviceBound: true,
      boundUsername: boundRecord.username,
      sessionHunter: null,
    };
  }

  // 3. Cek apakah ada username yang di-hint dari cookie/localStorage perangkat
  if (input.hintedUsername) {
    const cleanHint = input.hintedUsername.trim().toLowerCase();
    const matched = Object.values(vault.credentialsByHunterId).find(
      (c) => c.usernameLower === cleanHint
    );
    if (matched) {
      return {
        ok: true,
        gateMode: 'LOGIN_BOUND_DEVICE',
        isAuthenticated: false,
        isDeviceBound: true,
        boundUsername: matched.username,
        sessionHunter: null,
      };
    }
  }

  // 4. Perangkat benar-benar baru -> tampilkan REGISTER
  return {
    ok: true,
    gateMode: 'REGISTER_NEW_DEVICE',
    isAuthenticated: false,
    isDeviceBound: false,
    boundUsername: null,
    sessionHunter: null,
  };
}

/**
 * Mendaftarkan akun Hunter baru dan mengikatkannya secara permanen ke perangkat ini
 * (Satu Perangkat Satu Akun Policy).
 */
export function registerHunterAccount(input: {
  readonly username: unknown;
  readonly password: unknown;
  readonly deviceSignal?: Partial<DeviceSignalPayload>;
}): AuthActionResult {
  if (hasDangerousObjectKeys(input)) {
    return {
      ok: false,
      status: 400,
      code: 'MALICIOUS_INPUT_BLOCKED',
      message: 'Payload ditolak karena mengandung kunci objek terlarang.',
    };
  }

  const userCheck = validateHunterUsername(input.username);
  if (!userCheck.ok) {
    return {
      ok: false,
      status: userCheck.isMalicious ? 403 : 400,
      code: userCheck.isMalicious ? 'MALICIOUS_INPUT_BLOCKED' : 'VALIDATION_ERROR',
      message: userCheck.reason,
    };
  }

  const passCheck = validateHunterPassword(input.password);
  if (!passCheck.ok) {
    return {
      ok: false,
      status: passCheck.isMalicious ? 403 : 400,
      code: passCheck.isMalicious ? 'MALICIOUS_INPUT_BLOCKED' : 'VALIDATION_ERROR',
      message: passCheck.reason,
    };
  }

  const vault = loadWorldVault();
  const boundDeviceHash = computeBoundDeviceHash(input.deviceSignal);

  // Kebijakan Keras: 1 Perangkat = 1 Akun!
  const eligibility = checkDeviceRegistrationEligibility(
    vault.credentialsByHunterId,
    boundDeviceHash
  );
  if (!eligibility.allowed) {
    return {
      ok: false,
      status: 403,
      code: 'DEVICE_ALREADY_BOUND',
      message: `Perangkat ini sudah terikat pada akun Hunter "${eligibility.existingUsername}". Kebijakan Aethelgrad hanya mengizinkan Satu Akun pada Perangkat Ini. Silakan masuk (Login) menggunakan akun Anda.`,
      boundUsername: eligibility.existingUsername || undefined,
    };
  }

  const usernameLower = userCheck.sanitizedValue.toLowerCase();
  const usernameTaken = Object.values(vault.credentialsByHunterId).some(
    (c) => c.usernameLower === usernameLower
  );
  if (usernameTaken) {
    return {
      ok: false,
      status: 409,
      code: 'USERNAME_TAKEN',
      message: `Callsign "${userCheck.sanitizedValue}" sudah digunakan oleh Hunter lain di Menara.`,
    };
  }

  const hunterId = `hunter-${Date.now().toString(36)}-${boundDeviceHash.slice(0, 8)}`;
  const hashBundle = hashHunterPassword(passCheck.sanitizedValue);
  const nowIso = new Date().toISOString();

  const credRecord: HunterCredentialsRecord = {
    hunterId,
    username: userCheck.sanitizedValue,
    usernameLower,
    passwordHashHex: hashBundle.passwordHashHex,
    passwordSaltHex: hashBundle.passwordSaltHex,
    pbkdf2Iterations: hashBundle.pbkdf2Iterations,
    boundDeviceHash,
    createdAtIso: nowIso,
    lastLoginIso: nowIso,
  };

  const starterProfile = createStarterHunterProfile(hunterId, userCheck.sanitizedValue);

  const nextVault: WorldVaultDatabase = {
    ...vault,
    updatedAtIso: nowIso,
    credentialsByHunterId: {
      ...vault.credentialsByHunterId,
      [hunterId]: credRecord,
    },
    profilesByHunterId: {
      ...vault.profilesByHunterId,
      [hunterId]: starterProfile,
    },
  };

  saveWorldVault(nextVault);

  const sessionToken = signHunterSessionToken({
    hunterId,
    username: credRecord.username,
    boundDeviceHash,
  });

  return {
    ok: true,
    status: 201,
    code: 'REGISTERED_AND_BOUND',
    message: `Selamat datang di Aethelgrad, Hunter ${credRecord.username}! Perangkat ini kini terikat secara aman pada akun Anda.`,
    sessionToken,
    hunterId,
    username: credRecord.username,
    boundUsername: credRecord.username,
  };
}

/**
 * Login untuk Returning Hunter.
 */
export function loginHunterAccount(input: {
  readonly username: unknown;
  readonly password: unknown;
  readonly deviceSignal?: Partial<DeviceSignalPayload>;
}): AuthActionResult {
  if (hasDangerousObjectKeys(input)) {
    return {
      ok: false,
      status: 400,
      code: 'MALICIOUS_INPUT_BLOCKED',
      message: 'Payload ditolak karena mengandung kunci objek terlarang.',
    };
  }

  const userCheck = validateHunterUsername(input.username);
  if (!userCheck.ok) {
    return {
      ok: false,
      status: userCheck.isMalicious ? 403 : 400,
      code: userCheck.isMalicious ? 'MALICIOUS_INPUT_BLOCKED' : 'VALIDATION_ERROR',
      message: userCheck.reason,
    };
  }

  if (typeof input.password !== 'string' || input.password.length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Password wajib diisi.',
    };
  }

  const vault = loadWorldVault();
  const usernameLower = userCheck.sanitizedValue.toLowerCase();
  const credRecord = Object.values(vault.credentialsByHunterId).find(
    (c) => c.usernameLower === usernameLower
  );

  if (!credRecord) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Callsign Hunter atau Password tidak cocok.',
    };
  }

  const passwordValid = verifyHunterPassword(
    input.password,
    credRecord.passwordHashHex,
    credRecord.passwordSaltHex,
    credRecord.pbkdf2Iterations
  );

  if (!passwordValid) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Callsign Hunter atau Password tidak cocok.',
    };
  }

  const boundDeviceHash = computeBoundDeviceHash(input.deviceSignal);
  const existingOnDevice = findAccountByDeviceHash(
    vault.credentialsByHunterId,
    boundDeviceHash
  );
  if (existingOnDevice && existingOnDevice.hunterId !== credRecord.hunterId) {
    return {
      ok: false,
      status: 403,
      code: 'DEVICE_MISMATCH',
      message: `Perangkat ini terikat pada Hunter "${existingOnDevice.username}". Tidak dapat masuk ke akun lain dari perangkat yang sama.`,
      boundUsername: existingOnDevice.username,
    };
  }

  const nowIso = new Date().toISOString();
  const updatedCred: HunterCredentialsRecord = {
    ...credRecord,
    lastLoginIso: nowIso,
  };

  saveWorldVault({
    ...vault,
    updatedAtIso: nowIso,
    credentialsByHunterId: {
      ...vault.credentialsByHunterId,
      [credRecord.hunterId]: updatedCred,
    },
  });

  const sessionToken = signHunterSessionToken({
    hunterId: credRecord.hunterId,
    username: credRecord.username,
    boundDeviceHash: credRecord.boundDeviceHash,
  });

  return {
    ok: true,
    status: 200,
    code: 'AUTH_OK',
    message: `Selamat datang kembali di Aethelgrad, Hunter ${credRecord.username}!`,
    sessionToken,
    hunterId: credRecord.hunterId,
    username: credRecord.username,
    boundUsername: credRecord.username,
  };
}

/**
 * Mengambil atau memperbarui profil Hunter di Vault.
 */
export function getHunterProfileById(hunterId: string): HunterProfileState | null {
  const vault = loadWorldVault();
  return vault.profilesByHunterId[hunterId] || null;
}

export function updateHunterProfileInVault(profile: HunterProfileState): HunterProfileState {
  const vault = loadWorldVault();
  const nextVault: WorldVaultDatabase = {
    ...vault,
    updatedAtIso: new Date().toISOString(),
    profilesByHunterId: {
      ...vault.profilesByHunterId,
      [profile.hunterId]: profile,
    },
  };
  saveWorldVault(nextVault);
  return profile;
}

/**
 * Mengganti Hero aktif atau memasang Equipment ke slot Paper-Doll.
 */
export function equipHunterLoadout(
  profile: HunterProfileState,
  input: {
    readonly activeHeroId?: string;
    readonly slot?: EquipmentSlot;
    readonly itemId?: string | null;
  }
): HunterProfileState {
  let nextHeroId = profile.activeHeroId;
  if (input.activeHeroId) {
    if (!profile.ownedHeroes[input.activeHeroId] || !getHeroById(input.activeHeroId)) {
      throw new Error('Hero belum dimiliki di barak Anda.');
    }
    nextHeroId = input.activeHeroId;
  }

  const nextLoadout = { ...profile.equippedLoadout };
  if (input.slot) {
    if (input.itemId === null || input.itemId === '') {
      nextLoadout[input.slot] = null;
    } else if (input.itemId) {
      const itemCat = getEquipmentById(input.itemId);
      if (!itemCat || itemCat.slot !== input.slot) {
        throw new Error(`Item tidak cocok untuk slot ${input.slot}.`);
      }
      if (!profile.ownedEquipment[input.itemId]) {
        throw new Error(`Anda belum memiliki ${itemCat.name}.`);
      }
      nextLoadout[input.slot] = input.itemId;
    }
  }

  const heroObj = getHeroById(nextHeroId) || HEROES_CATALOG[0];
  const logLine = `[LOADOUT] ${heroObj.name} memperbarui konfigurasi Paper-Doll.`;
  const updated: HunterProfileState = {
    ...profile,
    activeHeroId: nextHeroId,
    equippedLoadout: nextLoadout,
    recentActivityLog: [logLine, ...profile.recentActivityLog].slice(0, 12),
    updatedAtIso: new Date().toISOString(),
  };

  return updateHunterProfileInVault(updated);
}

/**
 * Membangun daftar Papan Peringkat (Leaderboard) Arena Colosseum yang menggabungkan
 * seluruh 12 NPC Tower Guardians dan seluruh akun Hunter asli yang terdaftar,
 * diurutkan secara menurun berdasarkan Combat Power (CP).
 */
export function buildColosseumLeaderboard(
  extraProfile?: HunterProfileState | null
): readonly LeaderboardCombatantEntry[] {
  const vault = loadWorldVault();
  const entriesById = new Map<string, LeaderboardCombatantEntry>();

  for (const guardian of SEED_TOWER_GUARDIANS) {
    entriesById.set(guardian.hunterId, { ...guardian });
  }

  const allProfiles = Object.values(vault.profilesByHunterId);
  if (extraProfile && !vault.profilesByHunterId[extraProfile.hunterId]) {
    allProfiles.push(extraProfile);
  }

  for (const prof of allProfiles) {
    const hero = getHeroById(prof.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = prof.ownedHeroes[hero.id];
    const stats = calculateHunterCombatStats(prof);

    entriesById.set(prof.hunterId, {
      rank: 0,
      hunterId: prof.hunterId,
      username: prof.username,
      isNpcGuardian: false,
      titleBadge: prof.titleRank,
      activeHeroId: hero.id,
      activeHeroName: hero.name,
      activeHeroStars: ownedHero ? ownedHero.currentStars : hero.baseStars,
      activeHeroLevel: ownedHero ? ownedHero.level : 1,
      equippedLoadout: prof.equippedLoadout,
      combatPower: stats.totalCombatPower,
      solvedSpellsCount: prof.solvedSpellIds.length,
      arenaWins: prof.arenaWins,
      arenaFloorCleared: prof.highestSpireFloor,
    });
  }

  const sorted = Array.from(entriesById.values()).sort(
    (a, b) => b.combatPower - a.combatPower
  );

  return sorted.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
