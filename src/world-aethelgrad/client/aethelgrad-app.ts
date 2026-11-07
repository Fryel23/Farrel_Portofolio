import type {
  ColosseumDuelResult,
  HunterProfileState,
  LeaderboardCombatantEntry,
} from '../types/colosseum.types';
import type { EquipmentSlot } from '../types/equipment.types';
import type { GachaBannerId } from '../types/gacha.types';
import { getHeroById, HEROES_CATALOG } from '../catalog/heroes-index';
import { getEquipmentById } from '../catalog/items-index';
import { getCodeSpellById } from '../catalog/code-spells-catalog';
import { composeHeroPaperDollSvg } from '../svg-paperdoll/paperdoll-composer';
import { executeGachaSummon } from '../server/engines/gacha-rng-engine';
import {
  executeForgeUpgrade,
  type ForgeActionType,
} from '../server/engines/forge-synthesis-engine';
import { verifyAndApplyCodeSpell } from '../server/engines/code-spell-verifier';
import { simulateColosseumDuel } from '../server/engines/colosseum-battle-simulator';
import { calculateHunterCombatStats } from '../server/engines/combat-power-calculator';
import { SEED_TOWER_GUARDIANS } from '../server/persistence/seed-guardians';
import {
  collectClientDeviceSignal,
  KNOWN_HUNTER_STORAGE_KEY,
} from './device/client-fingerprint';
import {
  isAethelgradAudioMuted,
  playDiveWarpSfx,
  playTitleStartChime,
  setAethelgradAudioMuted,
} from './audio/aethelgrad-sound-synth';
import { initWorldIntroTour } from './tour/world-intro-cinematic';
import { Territory1AltarBarracksController } from './territories/territory1-altar-barracks';
import { Territory2GrimoireForgeController } from './territories/territory2-grimoire-forge';
import { Territory3CodeSanctumController } from './territories/territory3-code-sanctum';
import { Territory4SpireColosseumController } from './territories/territory4-spire-colosseum';

const LOCAL_VAULT_KEY = 'aethelgrad_v15_client_vault';
const LOCAL_SESSION_KEY = 'aethelgrad_v15_active_hunter_id';

interface LocalClientAccountRecord {
  hunterId: string;
  username: string;
  usernameLower: string;
  passwordDigest: string;
  deviceHash: string;
  profile: HunterProfileState;
}

interface LocalClientVault {
  accounts: Record<string, LocalClientAccountRecord>;
  deviceBindings: Record<string, string>;
}

export class AethelgradWorldApp {
  private deviceHash = '';
  private currentProfile: HunterProfileState | null = null;
  private leaderboard: readonly LeaderboardCombatantEntry[] = [];
  private authMode: 'LOGIN' | 'REGISTER' = 'REGISTER';
  private tourController!: { readonly openTour: () => void };

  private t1!: Territory1AltarBarracksController;
  private t2!: Territory2GrimoireForgeController;
  private t3!: Territory3CodeSanctumController;
  private t4!: Territory4SpireColosseumController;

  public async init(): Promise<void> {
    const signal = collectClientDeviceSignal();
    this.deviceHash = signal.clientFingerprintHash;
    this.tourController = initWorldIntroTour();

    this.t1 = new Territory1AltarBarracksController({
      getProfile: () => this.currentProfile,
      onSummon: (bannerId, pullCount, useTickets) =>
        this.handleGachaSummon(bannerId, pullCount, useTickets),
      onEquip: (slot, itemId) => this.handleEquipItem(slot, itemId),
      onSelectActiveHero: (heroId) => this.handleSelectActiveHero(heroId),
      openModal: (id) => this.openModal(id),
    });

    this.t2 = new Territory2GrimoireForgeController({
      getProfile: () => this.currentProfile,
      onForgeUpgrade: (action, targetId) =>
        this.handleForgeUpgrade(action, targetId),
    });

    this.t3 = new Territory3CodeSanctumController({
      getProfile: () => this.currentProfile,
      onSubmitSpell: (spellId, selectedOptionId, customCodeAnswer) =>
        this.handleSubmitSpell(spellId, selectedOptionId, customCodeAnswer),
      openModal: (id) => this.openModal(id),
    });

    this.t4 = new Territory4SpireColosseumController({
      getProfile: () => this.currentProfile,
      getLeaderboard: () => this.leaderboard,
      onChallengeOpponent: (defenderHunterId) =>
        this.handleColosseumDuel(defenderHunterId),
      openModal: (id) => this.openModal(id),
    });

    this.bindGlobalUiEvents();
    await this.checkInitialAuthAndState();
  }

  private getLocalVault(): LocalClientVault {
    try {
      const raw = localStorage.getItem(LOCAL_VAULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.accounts && parsed.deviceBindings) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    const fresh: LocalClientVault = {
      accounts: {},
      deviceBindings: {},
    };
    this.saveLocalVault(fresh);
    return fresh;
  }

  private saveLocalVault(vault: LocalClientVault): void {
    try {
      localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(vault));
    } catch {
      // Ignore quota issues
    }
  }

  private createStarterProfile(hunterId: string, username: string): HunterProfileState {
    const nowIso = new Date().toISOString();
    return {
      hunterId,
      username,
      titleRank: 'Data Ranger · Spire Initiate',
      accountLevel: 12,
      accountExp: 720,
      astralGems: 3000,
      summonTickets: 10,
      starlightDust: 250,
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
          soulShards: 40,
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
        `[SYSTEM] Hunter ${username} memasuki Aethelgrad // The Infinite Spire.`,
        `[GIFT] Menerima 3.000 Astral Gems, 10 Summon Tickets, & Starfall Blade [★5].`,
      ],
      updatedAtIso: nowIso,
    };
  }

  private rebuildLeaderboard(vault: LocalClientVault): readonly LeaderboardCombatantEntry[] {
    const entriesById = new Map<string, LeaderboardCombatantEntry>();

    for (const g of SEED_TOWER_GUARDIANS) {
      entriesById.set(g.hunterId, { ...g });
    }

    for (const acc of Object.values(vault.accounts)) {
      const prof = acc.profile;
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
    return sorted.map((e, idx) => ({ ...e, rank: idx + 1 }));
  }

  private async checkInitialAuthAndState(): Promise<void> {
    const vault = this.getLocalVault();
    const activeHunterId = localStorage.getItem(LOCAL_SESSION_KEY);
    const knownUsername = localStorage.getItem(KNOWN_HUNTER_STORAGE_KEY) || '';
    const boundHunterId = vault.deviceBindings[this.deviceHash];
    const boundAccount = boundHunterId ? vault.accounts[boundHunterId] : null;

    if (activeHunterId && vault.accounts[activeHunterId]) {
      this.currentProfile = vault.accounts[activeHunterId].profile;
      this.leaderboard = this.rebuildLeaderboard(vault);
      this.hideTitleAndAuthOverlay();
      this.refreshEntireWorldHud();
      return;
    }

    // Returning Hunter Smart Gate: if device is already bound OR localStorage has KNOWN_HUNTER_STORAGE_KEY -> LOGIN mode!
    if (boundAccount || knownUsername) {
      const remembered = boundAccount?.username || knownUsername;
      this.setAuthGateMode('LOGIN', remembered);
    } else {
      this.setAuthGateMode('REGISTER', '');
    }

    this.leaderboard = this.rebuildLeaderboard(vault);
  }

  private setAuthGateMode(mode: 'LOGIN' | 'REGISTER', rememberedUsername = ''): void {
    this.authMode = mode;
    const gateTitleEl = document.getElementById('auth-gate-title');
    const gateSubtitleEl = document.getElementById('auth-gate-subtitle');
    const submitBtnEl = document.getElementById('auth-submit-btn');
    const switchModeBtnEl = document.getElementById('auth-switch-mode-btn');
    const usernameInput = document.getElementById('auth-username-input') as HTMLInputElement | null;
    const confirmWrap = document.getElementById('auth-confirm-password-wrap');
    const returningBadge = document.getElementById('auth-returning-hunter-badge');

    if (mode === 'LOGIN') {
      if (gateTitleEl) {
        gateTitleEl.textContent = rememberedUsername
          ? `WELCOME BACK, HUNTER ${rememberedUsername.toUpperCase()}`
          : 'HUNTER SOUL SYNCHRONIZATION (LOGIN)';
      }
      if (gateSubtitleEl) {
        gateSubtitleEl.textContent =
          'Perangkat Anda telah terikat dengan Menara Aethelgrad. Masukkan kata sandi untuk melanjutkan pendakian.';
      }
      if (submitBtnEl) {
        submitBtnEl.textContent = 'MASUK KE AETHELGRAD (LOGIN) ->';
      }
      if (switchModeBtnEl) {
        switchModeBtnEl.textContent = 'Belum punya akun di perangkat ini? Buat Akun Hunter';
      }
      if (confirmWrap) {
        confirmWrap.classList.add('hidden');
      }
      if (returningBadge) {
        returningBadge.classList.toggle('hidden', !rememberedUsername);
        returningBadge.textContent = rememberedUsername
          ? `✓ Device Bound: Hunter ${rememberedUsername} terdeteksi otomatis`
          : '';
      }
      if (usernameInput && rememberedUsername) {
        usernameInput.value = rememberedUsername;
      }
    } else {
      if (gateTitleEl) {
        gateTitleEl.textContent = 'AWAKEN NEW HUNTER SOUL (REGISTER)';
      }
      if (gateSubtitleEl) {
        gateSubtitleEl.textContent =
          'Kebijakan 1 Perangkat = 1 Akun. Akun baru langsung menerima +3.000 Astral Gems & 10 Summon Tickets!';
      }
      if (submitBtnEl) {
        submitBtnEl.textContent = 'BANGKITKAN AKUN & MULAI TUR DUNIA ->';
      }
      if (switchModeBtnEl) {
        switchModeBtnEl.textContent = 'Sudah punya akun Hunter? Masuk (Login) di sini';
      }
      if (confirmWrap) {
        confirmWrap.classList.remove('hidden');
      }
      if (returningBadge) {
        returningBadge.classList.add('hidden');
      }
    }
  }

  private hideTitleAndAuthOverlay(): void {
    document.getElementById('aethelgrad-title-screen')?.classList.add('is-dismissed');
    document.getElementById('aethelgrad-auth-gate')?.classList.add('is-dismissed');
  }

  private showAuthGateOverlay(): void {
    document.getElementById('aethelgrad-title-screen')?.classList.add('is-dismissed');
    document.getElementById('aethelgrad-auth-gate')?.classList.remove('is-dismissed');
  }

  private async sha256HexClient(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv_${(h >>> 0).toString(16)}`;
  }

  private detectUnsafeInputClient(val: string): string | null {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b\s+)/i,
      /(--|\/\*|\*\/|;\s*--)/,
      /('|\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
      /<\s*\/?\s*(script|iframe|object|embed|svg|on\w+)/i,
      /(__proto__|constructor|prototype)/i,
      /(\$where|\$ne|\$gt|\$lt|\$regex)/i,
    ];
    for (const pat of patterns) {
      if (pat.test(val)) {
        return 'Terdeteksi karakter atau pola injeksi berbahaya. Permintaan diblokir oleh Aethelgrad Security Shield.';
      }
    }
    return null;
  }

  private async handleAuthFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const usernameInput = document.getElementById('auth-username-input') as HTMLInputElement | null;
    const passwordInput = document.getElementById('auth-password-input') as HTMLInputElement | null;
    const confirmInput = document.getElementById('auth-confirm-input') as HTMLInputElement | null;
    const feedbackEl = document.getElementById('auth-feedback-box');

    const username = (usernameInput?.value || '').trim();
    const password = passwordInput?.value || '';
    const confirm = confirmInput?.value || '';

    const setFeedback = (msg: string, isError: boolean) => {
      if (!feedbackEl) return;
      feedbackEl.textContent = msg;
      feedbackEl.className = `auth-feedback-box ${isError ? 'is-error' : 'is-success'}`;
    };

    const injectionErr =
      this.detectUnsafeInputClient(username) || this.detectUnsafeInputClient(password);
    if (injectionErr) {
      setFeedback(injectionErr, true);
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      setFeedback('Username Hunter wajib 3-20 karakter (huruf, angka, _ atau -).', true);
      return;
    }
    if (password.length < 8) {
      setFeedback('Password wajib minimal 8 karakter.', true);
      return;
    }

    const vault = this.getLocalVault();
    const passwordDigest = await this.sha256HexClient(`aethelgrad_salt::${password}`);

    if (this.authMode === 'REGISTER') {
      if (confirm && confirm !== password) {
        setFeedback('Konfirmasi password tidak cocok.', true);
        return;
      }

      // 1-Device-1-Account Enforcement
      const existingBoundHunterId = vault.deviceBindings[this.deviceHash];
      if (existingBoundHunterId && vault.accounts[existingBoundHunterId]) {
        const boundAcc = vault.accounts[existingBoundHunterId];
        setFeedback(
          `[DEVICE_ALREADY_BOUND] Perangkat ini sudah terikat dengan akun "${boundAcc.username}". Mengalihkan ke mode Login...`,
          true
        );
        setTimeout(() => {
          this.setAuthGateMode('LOGIN', boundAcc.username);
        }, 850);
        return;
      }

      const duplicateUser = Object.values(vault.accounts).find(
        (a) => a.usernameLower === username.toLowerCase()
      );
      if (duplicateUser) {
        setFeedback('Username sudah terdaftar. Silakan gunakan mode Login.', true);
        return;
      }

      const hunterId = `hunter-${Date.now().toString(36)}`;
      const starterProfile = this.createStarterProfile(hunterId, username);

      vault.accounts[hunterId] = {
        hunterId,
        username,
        usernameLower: username.toLowerCase(),
        passwordDigest,
        deviceHash: this.deviceHash,
        profile: starterProfile,
      };
      vault.deviceBindings[this.deviceHash] = hunterId;
      this.saveLocalVault(vault);

      localStorage.setItem(LOCAL_SESSION_KEY, hunterId);
      localStorage.setItem(KNOWN_HUNTER_STORAGE_KEY, username);

      this.currentProfile = starterProfile;
      this.leaderboard = this.rebuildLeaderboard(vault);

      setFeedback('✦ Jiwa Hunter berhasil dibangkitkan! Memulai Tur Dunia Aethelgrad...', false);
      playDiveWarpSfx();
      this.hideTitleAndAuthOverlay();
      this.refreshEntireWorldHud();
      this.tourController.openTour();
    } else {
      const targetAcc = Object.values(vault.accounts).find(
        (a) => a.usernameLower === username.toLowerCase()
      );

      if (!targetAcc) {
        setFeedback(
          'Akun Hunter tidak ditemukan di perangkat ini. Klik tombol Buat Akun di bawah bila Anda pengunjung baru.',
          true
        );
        return;
      }

      if (targetAcc.passwordDigest !== passwordDigest) {
        setFeedback('Password tidak valid untuk akun Hunter tersebut.', true);
        return;
      }

      localStorage.setItem(LOCAL_SESSION_KEY, targetAcc.hunterId);
      localStorage.setItem(KNOWN_HUNTER_STORAGE_KEY, targetAcc.username);

      this.currentProfile = targetAcc.profile;
      this.leaderboard = this.rebuildLeaderboard(vault);

      setFeedback(`✦ Selamat datang kembali, Master ${targetAcc.username}!`, false);
      playDiveWarpSfx();
      this.hideTitleAndAuthOverlay();
      this.refreshEntireWorldHud();
    }
  }

  private handleLogout(): void {
    playTitleStartChime();
    const rememberedUsername =
      this.currentProfile?.username || localStorage.getItem(KNOWN_HUNTER_STORAGE_KEY) || '';
    if (rememberedUsername) {
      localStorage.setItem(KNOWN_HUNTER_STORAGE_KEY, rememberedUsername);
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    this.currentProfile = null;
    this.setAuthGateMode('LOGIN', rememberedUsername);
    this.showAuthGateOverlay();
  }

  private refreshEntireWorldHud(): void {
    const p = this.currentProfile;
    if (!p) return;

    const topCallsignEl = document.getElementById('hud-top-callsign');
    const topShardsEl = document.getElementById('hud-top-gems');
    const topAvatarEl = document.getElementById('hud-top-mini-avatar');

    const passCallsignEl = document.getElementById('passport-hunter-name');
    const passTitleEl = document.getElementById('passport-hunter-title');
    const passGemsEl = document.getElementById('passport-astral-gems');
    const passTicketsEl = document.getElementById('passport-summon-tickets');
    const passDustEl = document.getElementById('passport-starlight-dust');
    const passCpEl = document.getElementById('passport-combat-power');
    const passAvatarEl = document.getElementById('passport-main-avatar-svg');
    const passLoginTimeEl = document.getElementById('passport-login-timestamp');

    const heroDef = getHeroById(p.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = p.ownedHeroes[heroDef.id];
    const currentStars = ownedHero ? ownedHero.currentStars : heroDef.baseStars;
    const combatStats = calculateHunterCombatStats(p);

    const avatarSvg72 = composeHeroPaperDollSvg({
      heroId: heroDef.id,
      currentStars,
      equippedLoadout: p.equippedLoadout,
      sizePx: 72,
      showPedestal: false,
    });

    const avatarSvg36 = composeHeroPaperDollSvg({
      heroId: heroDef.id,
      currentStars,
      equippedLoadout: p.equippedLoadout,
      sizePx: 36,
      showPedestal: false,
    });

    if (topCallsignEl) topCallsignEl.textContent = `HUNTER: ${p.username}`;
    if (topShardsEl) topShardsEl.textContent = `${p.astralGems.toLocaleString('en-US')} 💎`;
    if (topAvatarEl) topAvatarEl.innerHTML = avatarSvg36;

    if (passCallsignEl) passCallsignEl.textContent = `HUNTER: ${p.username}`;
    if (passTitleEl) passTitleEl.textContent = p.titleRank || 'Data Ranger';
    if (passGemsEl) passGemsEl.textContent = p.astralGems.toLocaleString('en-US');
    if (passTicketsEl) passTicketsEl.textContent = String(p.summonTickets);
    if (passDustEl) passDustEl.textContent = p.starlightDust.toLocaleString('en-US');
    if (passCpEl) passCpEl.textContent = combatStats.totalCombatPower.toLocaleString('en-US');
    if (passAvatarEl) passAvatarEl.innerHTML = avatarSvg72;
    if (passLoginTimeEl) {
      const dt = new Date(p.updatedAtIso || Date.now());
      passLoginTimeEl.textContent = dt.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }

    this.t1.syncWithProfile();
    this.t2.syncWithProfile();
    this.t3.syncWithProfile();
    this.t4.syncWithState();
  }

  private persistProfileUpdate(nextProfile: HunterProfileState): void {
    this.currentProfile = nextProfile;
    const vault = this.getLocalVault();
    if (vault.accounts[nextProfile.hunterId]) {
      vault.accounts[nextProfile.hunterId].profile = nextProfile;
      this.saveLocalVault(vault);
    }
    this.leaderboard = this.rebuildLeaderboard(vault);
    this.refreshEntireWorldHud();
  }

  private async handleGachaSummon(
    bannerId: GachaBannerId,
    pullCount: 1 | 10,
    useTickets: boolean
  ): Promise<void> {
    if (!this.currentProfile) return;
    try {
      const { result, updatedProfile } = executeGachaSummon(this.currentProfile, {
        bannerId,
        pullCount,
        useTickets,
      });
      this.persistProfileUpdate(updatedProfile);
      this.t1.showSummonRevealModal(result.drops, result.highestRarityStars);
      this.announceTicker(
        `[GACHA GROTTO] Hunter ${this.currentProfile.username} menarik ${pullCount}x pada ${bannerId} (Highest: ★${result.highestRarityStars})!`
      );
    } catch (err: any) {
      this.announceTicker(`[PERINGATAN] ${err?.message || 'Astral Gems tidak mencukupi.'}`);
    }
  }

  private async handleEquipItem(slot: EquipmentSlot, itemId: string | null): Promise<void> {
    if (!this.currentProfile) return;
    const nextLoadout = {
      ...this.currentProfile.equippedLoadout,
      [slot]: itemId,
    };
    const updated: HunterProfileState = {
      ...this.currentProfile,
      equippedLoadout: nextLoadout,
      updatedAtIso: new Date().toISOString(),
    };
    this.persistProfileUpdate(updated);
  }

  private async handleSelectActiveHero(heroId: string): Promise<void> {
    if (!this.currentProfile) return;
    if (!this.currentProfile.ownedHeroes[heroId]) return;
    const updated: HunterProfileState = {
      ...this.currentProfile,
      activeHeroId: heroId,
      updatedAtIso: new Date().toISOString(),
    };
    this.persistProfileUpdate(updated);
  }

  private async handleForgeUpgrade(action: ForgeActionType, targetId: string): Promise<void> {
    if (!this.currentProfile) return;
    try {
      const { result, updatedProfile } = executeForgeUpgrade(this.currentProfile, {
        action,
        targetId,
      });
      this.persistProfileUpdate(updatedProfile);
      this.announceTicker(result.message);
    } catch (err: any) {
      this.announceTicker(`[FORGE] ${err?.message || 'Gagal melakukan tempa.'}`);
    }
  }

  private async handleSubmitSpell(
    spellId: string,
    selectedOptionId?: string,
    customCodeAnswer?: string
  ): Promise<any> {
    if (!this.currentProfile) return null;
    try {
      const { result, updatedProfile } = verifyAndApplyCodeSpell(this.currentProfile, {
        spellId,
        selectedOptionId,
        customCodeAnswer,
      });
      this.persistProfileUpdate(updatedProfile);
      if (result.passed) {
        this.announceTicker(
          `[CODE-SPELL SANCTUM] Hunter ${this.currentProfile.username} memecahkan mantra ${spellId} (+${result.gemsAwarded} 💎)!`
        );
      }
      return result;
    } catch (err: any) {
      return { passed: false, feedbackMessage: err?.message || 'Gagal memverifikasi solusi.' };
    }
  }

  private async handleColosseumDuel(
    defenderHunterId: string
  ): Promise<ColosseumDuelResult | null> {
    if (!this.currentProfile) return null;
    const defender =
      this.leaderboard.find((e) => e.hunterId === defenderHunterId) ||
      this.leaderboard[this.leaderboard.length - 1];
    if (!defender) return null;

    const { duelResult, updatedProfile } = simulateColosseumDuel(
      this.currentProfile,
      defender
    );
    this.persistProfileUpdate(updatedProfile);
    this.announceTicker(
      `[SPIRE COLOSSEUM] Duel ${duelResult.challengerUsername} vs ${duelResult.defenderUsername}: Pemenang ${
        duelResult.winner === 'CHALLENGER' ? duelResult.challengerUsername : duelResult.defenderUsername
      }!`
    );
    return duelResult;
  }

  public openModal(modalId: string): void {
    document.querySelectorAll('.aethelgrad-modal-overlay').forEach((el) => {
      el.classList.remove('is-open');
    });
    const target = document.getElementById(modalId);
    if (target) {
      target.classList.add('is-open');
    }
  }

  public closeAllModals(): void {
    document.querySelectorAll('.aethelgrad-modal-overlay').forEach((el) => {
      el.classList.remove('is-open');
    });
  }

  private announceTicker(text: string): void {
    const tickerEl = document.getElementById('aethelgrad-announcement-ticker');
    if (tickerEl) {
      tickerEl.textContent = text;
    }
  }

  private bindGlobalUiEvents(): void {
    document.getElementById('title-enter-spire-btn')?.addEventListener('click', () => {
      playDiveWarpSfx();
      if (this.currentProfile) {
        this.hideTitleAndAuthOverlay();
      } else {
        this.showAuthGateOverlay();
      }
    });

    document.getElementById('aethelgrad-auth-form')?.addEventListener('submit', (e) => {
      void this.handleAuthFormSubmit(e);
    });

    document.getElementById('auth-switch-mode-btn')?.addEventListener('click', () => {
      playTitleStartChime();
      const nextMode = this.authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN';
      const known = localStorage.getItem(KNOWN_HUNTER_STORAGE_KEY) || '';
      this.setAuthGateMode(nextMode, known);
    });

    document.querySelectorAll<HTMLButtonElement>('[data-world-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        playTitleStartChime();
        const target = btn.getAttribute('data-world-nav');
        document.querySelectorAll('[data-world-nav]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        if (target === 'HOME') {
          this.closeAllModals();
        } else if (target === 'SUMMON') {
          this.openModal('modal-barracks-wardrobe');
        } else if (target === 'GRIMOIRE') {
          this.openModal('modal-grimoire-forge');
        } else if (target === 'SANCTUM') {
          this.openModal('modal-code-sanctum');
        } else if (target === 'COLOSSEUM') {
          this.openModal('modal-colosseum-leaderboard');
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        playTitleStartChime();
        this.closeAllModals();
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-open-world-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        playTitleStartChime();
        const modalId = btn.getAttribute('data-open-world-modal');
        if (modalId) {
          this.openModal(modalId);
        }
      });
    });

    document.getElementById('grotto-toggle-banner-btn')?.addEventListener('click', () => {
      playTitleStartChime();
      this.t1.cycleBanner();
    });

    document.getElementById('grotto-summon-1x-btn')?.addEventListener('click', () => {
      const useTicket = (this.currentProfile?.summonTickets || 0) >= 1;
      void this.handleGachaSummon(this.t1.getActiveBanner(), 1, useTicket);
    });

    document.getElementById('grotto-summon-10x-btn')?.addEventListener('click', () => {
      const useTicket = (this.currentProfile?.summonTickets || 0) >= 10;
      void this.handleGachaSummon(this.t1.getActiveBanner(), 10, useTicket);
    });

    document.getElementById('deck-spell-submit-btn')?.addEventListener('click', () => {
      const input = document.getElementById('deck-spell-answer-input') as HTMLInputElement | null;
      void this.t3.handleSpellSubmission(
        this.t3.getActiveSpellId(),
        undefined,
        input?.value || ''
      );
    });

    document.getElementById('deck-spell-fill-btn')?.addEventListener('click', () => {
      const input = document.getElementById('deck-spell-answer-input') as HTMLInputElement | null;
      const spell = getCodeSpellById(this.t3.getActiveSpellId());
      const correctOption = spell?.options.find((o) => o.id === spell.correctOptionId);
      if (input && correctOption) {
        input.value = correctOption.codeSnippet.replace(/\n/g, ' ');
        playTitleStartChime();
      }
    });

    document.querySelectorAll<HTMLButtonElement>('[data-sanctum-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tier = btn.getAttribute('data-sanctum-tier') || 'ALL';
        document
          .querySelectorAll('[data-sanctum-tier]')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.t3.setTierFilter(tier);
      });
    });

    document.getElementById('hud-replay-tour-btn')?.addEventListener('click', () => {
      playTitleStartChime();
      this.tourController.openTour();
    });

    const muteBtn = document.getElementById('hud-mute-audio-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const nextMuted = !isAethelgradAudioMuted();
        setAethelgradAudioMuted(nextMuted);
        muteBtn.textContent = nextMuted ? '🔇 AUDIO OFF' : '🔊 AUDIO ON';
      });
      muteBtn.textContent = isAethelgradAudioMuted() ? '🔇 AUDIO OFF' : '🔊 AUDIO ON';
    }

    document.getElementById('hud-logout-btn')?.addEventListener('click', () => {
      this.handleLogout();
    });
  }
}

export function bootAethelgradWorld(): void {
  const app = new AethelgradWorldApp();
  void app.init();
}
