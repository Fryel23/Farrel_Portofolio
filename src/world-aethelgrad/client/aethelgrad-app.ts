/**
 * Orkestrator Utama Aethelgrad:
 *  - 6 Full-Viewport Scene Router (#outpost, #summon, #barracks, #grimoire, #trials, #arena)
 *  - Sinkronisasi Hash URL, Reload Persistence, & Back/Forward History
 *  - Lobi Outpost Interaktif, Summon Altar, Barracks 3-Kolom, Grimoire Archive & Relic Forge, Logic Trials, dan Arena Colosseum
 */

import { CODE_SPELLS_CATALOG, getCodeSpellById } from '../catalog/code-spells-catalog.ts';
import { GRIMOIRE_COLLECTIONS } from '../catalog/grimoire-collections.ts';
import { getHeroById, HEROES_CATALOG } from '../catalog/heroes-index.ts';
import { getEquipmentById, getEquipmentBySlot, ITEMS_CATALOG } from '../catalog/items-index.ts';
import { verifyAndApplyCodeSpell } from '../server/engines/code-spell-verifier.ts';
import { simulateColosseumDuel } from '../server/engines/colosseum-battle-simulator.ts';
import { calculateHunterCombatStats, isGrimoireBondUnlocked } from '../server/engines/combat-power-calculator.ts';
import { executeForgeUpgrade } from '../server/engines/forge-synthesis-engine.ts';
import { executeGachaSummon } from '../server/engines/gacha-rng-engine.ts';
import { SEED_TOWER_GUARDIANS } from '../server/persistence/seed-guardians.ts';
import { composeHeroPaperDollSvg } from '../svg-paperdoll/paperdoll-composer.ts';
import type { HunterProfileState, LeaderboardCombatantEntry } from '../types/colosseum.types.ts';
import type { EquipmentCatalogEntry, EquipmentSlot } from '../types/equipment.types.ts';
import type { GachaBannerId, GachaSummonResult } from '../types/gacha.types.ts';
import type { CodeSpellTier } from '../types/sanctum.types.ts';
import {
  isSoundMuted,
  playBattleSlashFanfare,
  playCodeSanctumSuccessChime,
  playEquipClinkSound,
  playGachaBeamFanfare,
  playUiClickSound,
  toggleSoundMute,
} from './audio/aethelgrad-sound-synth.ts';

export type AethelgradSceneId =
  | 'outpost'
  | 'summon'
  | 'barracks'
  | 'grimoire'
  | 'trials'
  | 'arena';

const VALID_SCENES: readonly AethelgradSceneId[] = [
  'outpost',
  'summon',
  'barracks',
  'grimoire',
  'trials',
  'arena',
];

const STORAGE_PROFILE_KEY = 'aethelgrad_hunter_profile_state';
const STORAGE_BOUND_USER_KEY = 'aethelgrad_bound_hunter_username';
const STORAGE_DEVICE_FP_KEY = 'aethelgrad_device_fp';

const COMPANION_DIALOGUES: Record<string, readonly string[]> = {
  'hero-evelyn-dawnblade': [
    'Angin di puncak menara mulai berubah. Senjata mana yang akan kita uji hari ini?',
    'Cahaya fajar memantul di bilah Starfall. Barisan kita siap menghadapi penjaga Colosseum.',
    'Jika kau menemukan logam bintang di altar, bawalah ke pandai besi Grimoire.',
  ],
  'hero-zephyr-archon': [
    'Setiap pola rune di ruang Trials menyimpan kekuatan kuno bagi pasukan kita.',
    'Bintang-bintang malam ini sejajar dengan menara utama. Saat yang tepat untuk memanggil sekutu.',
    'Ketajaman pikiran sama pentingnya dengan ketajaman pedang di gelanggang duel.',
  ],
  'hero-kaelthas-sol': [
    'Angin di puncak menara mulai berubah. Senjata mana yang akan kita uji hari ini?',
    'Api surya tidak pernah padam bagi mereka yang terus menempa diri di barak.',
    'Tunjukkan padaku lawan terkuat di papan peringkat Arena hari ini.',
  ],
  default: [
    'Angin di puncak menara mulai berubah. Senjata mana yang akan kita uji hari ini?',
    'Perlengkapan yang terpasang dengan tepat di Barracks akan mengubah jalannya pertarungan.',
    'Mari kita periksa buku koleksi Grimoire atau menguji strategi baru di Arena.',
  ],
};

function getOrCreateDeviceSignal() {
  let fp = localStorage.getItem(STORAGE_DEVICE_FP_KEY);
  if (!fp) {
    fp = `fp-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem(STORAGE_DEVICE_FP_KEY, fp);
  }
  return {
    clientFingerprintHash: fp,
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'web',
    screenGeometry: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth || 24}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
    language: navigator.language || 'id-ID',
  };
}

function createLocalFallbackProfile(username: string): HunterProfileState {
  const nowIso = new Date().toISOString();
  return {
    hunterId: `hunter-local-${username.toLowerCase()}`,
    username,
    titleRank: 'Data Ranger · Starlight Vanguard',
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
        soulShards: 20,
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
        count: 3,
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
        count: 3,
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
      `Hunter ${username} tiba di Outpost Aethelgrad.`,
      `Menerima bekal 1.800 Gems, 5 Tickets, & Starfall Blade.`,
    ],
    updatedAtIso: nowIso,
  };
}

function saveLocalProfile(profile: HunterProfileState): void {
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(STORAGE_BOUND_USER_KEY, profile.username);
  } catch {
    // Abaikan jika mode penyimpanan privat terbatas
  }
}

function loadLocalProfile(): HunterProfileState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HunterProfileState;
    if (parsed && parsed.username && parsed.ownedHeroes && parsed.equippedLoadout) {
      return parsed;
    }
  } catch {
    // Abaikan
  }
  return null;
}

function buildClientLeaderboard(profile: HunterProfileState): LeaderboardCombatantEntry[] {
  const stats = calculateHunterCombatStats(profile);
  const hero = getHeroById(profile.activeHeroId) || HEROES_CATALOG[0];
  const ownedHero = profile.ownedHeroes[hero.id];

  const playerEntry: LeaderboardCombatantEntry = {
    rank: 0,
    hunterId: profile.hunterId,
    username: profile.username,
    isNpcGuardian: false,
    titleBadge: profile.titleRank,
    activeHeroId: hero.id,
    activeHeroName: hero.name,
    activeHeroStars: ownedHero ? ownedHero.currentStars : hero.baseStars,
    activeHeroLevel: ownedHero ? ownedHero.level : 1,
    equippedLoadout: profile.equippedLoadout,
    combatPower: stats.totalCombatPower,
    solvedSpellsCount: profile.solvedSpellIds.length,
    arenaWins: profile.arenaWins,
    arenaFloorCleared: profile.highestSpireFloor,
  };

  const combined = [...SEED_TOWER_GUARDIANS.map((g) => ({ ...g })), playerEntry];
  combined.sort((a, b) => b.combatPower - a.combatPower);
  return combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export function bootAethelgradUniverse(): void {
  const stageEl = document.getElementById('aethelgrad-stage');
  if (!stageEl) return;

  let currentProfile: HunterProfileState =
    loadLocalProfile() || createLocalFallbackProfile('Vanguard_702');
  let activeScene: AethelgradSceneId = 'outpost';
  let dialogueIdx = 0;

  // State Summon
  let activeBannerId: GachaBannerId = 'HERO_SOVEREIGN_BANNER';

  // State Barracks
  let activeRoleFilter = 'ALL';
  let activeEquipSlot: EquipmentSlot = 'WEAPON';
  let selectedCandidateItemId: string | null = null;
  let activeBarracksSubtab: 'gear' | 'stats' = 'gear';

  // State Grimoire
  let activeGrimoireSubtab: 'collection' | 'forge' = 'collection';
  let activeCodexKind: 'HEROES' | 'ITEMS' = 'HEROES';
  let selectedCodexEntryId: string = 'hero-evelyn-dawnblade';

  // State Trials
  let activeTrialTier: CodeSpellTier = 'TIER_1_NOVICE';
  let activeTrialId: string = CODE_SPELLS_CATALOG[0].id;
  let selectedOptionByTrial: Record<string, string> = {};

  // State Arena
  let selectedOpponentId: string = SEED_TOWER_GUARDIANS[SEED_TOWER_GUARDIANS.length - 1].hunterId;
  let isDuelAnimating = false;

  // =========================================================================
  // 1. SCENE ROUTER (6 FULL-VIEWPORT SCENES + HASH + HISTORY)
  // =========================================================================
  function parseHashScene(): AethelgradSceneId {
    const raw = window.location.hash.replace(/^#/, '').trim().toLowerCase() as AethelgradSceneId;
    return VALID_SCENES.includes(raw) ? raw : 'outpost';
  }

  function switchScene(
    targetScene: AethelgradSceneId,
    options: { updateHistory?: boolean; immediate?: boolean } = {}
  ): void {
    if (!VALID_SCENES.includes(targetScene)) return;
    const updateHistory = options.updateHistory !== false;
    const reducedMotion =
      options.immediate === true ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const prevScene = activeScene;
    activeScene = targetScene;
    stageEl.setAttribute('data-active-scene', targetScene);

    // Perbarui tab navigasi
    const tabs = document.querySelectorAll<HTMLButtonElement>('[data-scene-tab]');
    tabs.forEach((tab) => {
      const isMatch = tab.getAttribute('data-scene-tab') === targetScene;
      tab.classList.toggle('is-active', isMatch);
      if (isMatch) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    // Perbarui Hash URL
    const targetHash = `#${targetScene}`;
    if (updateHistory && window.location.hash !== targetHash) {
      history.pushState({ scene: targetScene }, '', targetHash);
    }

    const panels = stageEl.querySelectorAll<HTMLElement>('.ag-scene[data-scene-panel]');
    if (reducedMotion || prevScene === targetScene) {
      panels.forEach((panel) => {
        const isTarget = panel.getAttribute('data-scene-panel') === targetScene;
        panel.classList.remove('is-leaving', 'is-entering');
        panel.classList.toggle('is-active', isTarget);
        if (isTarget) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });
      return;
    }

    const prevPanel = stageEl.querySelector<HTMLElement>(
      `.ag-scene[data-scene-panel="${prevScene}"]`
    );
    const nextPanel = stageEl.querySelector<HTMLElement>(
      `.ag-scene[data-scene-panel="${targetScene}"]`
    );

    if (prevPanel && prevPanel !== nextPanel) {
      prevPanel.classList.add('is-leaving');
      window.setTimeout(() => {
        if (activeScene !== prevScene) {
          prevPanel.classList.remove('is-active', 'is-leaving');
          prevPanel.setAttribute('hidden', '');
        }
      }, 180);
    }

    if (nextPanel) {
      panels.forEach((panel) => {
        if (panel !== nextPanel && panel !== prevPanel) {
          panel.classList.remove('is-active', 'is-leaving', 'is-entering');
          panel.setAttribute('hidden', '');
        }
      });
      nextPanel.removeAttribute('hidden');
      nextPanel.classList.add('is-active', 'is-entering');
      window.setTimeout(() => {
        nextPanel.classList.remove('is-entering');
      }, 320);
    }
  }

  // =========================================================================
  // 2. RENDER TOPBAR & OUTPOST (SCENE 1)
  // =========================================================================
  function renderTopbarAndOutpost(): void {
    const stats = calculateHunterCombatStats(currentProfile);
    const activeHero = getHeroById(currentProfile.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = currentProfile.ownedHeroes[activeHero.id];
    const stars = ownedHero ? ownedHero.currentStars : activeHero.baseStars;

    // Topbar
    const gemsEl = document.getElementById('hud-astral-gems');
    const ticketsEl = document.getElementById('hud-summon-tickets');
    const dustEl = document.getElementById('hud-starlight-dust');
    const userEl = document.getElementById('hud-hunter-username');
    const titleEl = document.getElementById('hud-hunter-title');
    if (gemsEl) gemsEl.textContent = currentProfile.astralGems.toLocaleString('en-US');
    if (ticketsEl) ticketsEl.textContent = String(currentProfile.summonTickets);
    if (dustEl) dustEl.textContent = currentProfile.starlightDust.toLocaleString('en-US');
    if (userEl) userEl.textContent = currentProfile.username;
    if (titleEl) {
      titleEl.innerHTML = `Data Ranger · CP <b id="hud-combat-power">${stats.totalCombatPower.toLocaleString('en-US')}</b>`;
    }

    // Outpost Companion Stage (340x340)
    const compRoleEl = document.getElementById('outpost-companion-role');
    const compNameEl = document.getElementById('outpost-companion-name');
    const compTitleEl = document.getElementById('outpost-companion-title');
    const compStageEl = document.getElementById('outpost-hero-stage');
    const speakerEl = document.getElementById('outpost-dialogue-speaker');
    const quoteEl = document.getElementById('outpost-dialogue-text');

    if (compRoleEl) {
      compRoleEl.textContent = `${activeHero.element.replace('_', ' ')} · ${activeHero.role.replace('_', ' ')}`;
    }
    if (compNameEl) compNameEl.textContent = activeHero.name;
    if (compTitleEl) compTitleEl.textContent = `${activeHero.title} · ${'★'.repeat(stars)}`;
    if (compStageEl) {
      compStageEl.innerHTML = composeHeroPaperDollSvg({
        heroId: activeHero.id,
        currentStars: stars,
        equippedLoadout: currentProfile.equippedLoadout,
        sizePx: 340,
        showPedestal: true,
        className: 'ag-companion-svg',
      });
    }
    if (speakerEl) speakerEl.textContent = activeHero.name.split(',')[0];
    const lines = COMPANION_DIALOGUES[activeHero.id] || COMPANION_DIALOGUES.default;
    if (quoteEl) {
      quoteEl.textContent = `"${lines[dialogueIdx % lines.length]}"`;
    }

    // Outpost Dossier
    const dosName = document.getElementById('outpost-hunter-name');
    const dosRank = document.getElementById('outpost-hunter-rank');
    const dosCp = document.getElementById('outpost-hunter-cp');
    const statHeroes = document.getElementById('outpost-stat-heroes');
    const statItems = document.getElementById('outpost-stat-items');
    const statTrials = document.getElementById('outpost-stat-trials');
    const statWins = document.getElementById('outpost-stat-wins');

    if (dosName) dosName.textContent = currentProfile.username;
    if (dosRank) dosRank.textContent = currentProfile.titleRank;
    if (dosCp) dosCp.textContent = stats.totalCombatPower.toLocaleString('en-US');
    if (statHeroes) {
      statHeroes.textContent = `${Object.keys(currentProfile.ownedHeroes).length} / ${HEROES_CATALOG.length}`;
    }
    if (statItems) {
      statItems.textContent = `${Object.keys(currentProfile.ownedEquipment).length} / ${ITEMS_CATALOG.length}`;
    }
    if (statTrials) {
      statTrials.textContent = `${currentProfile.solvedSpellIds.length} / ${CODE_SPELLS_CATALOG.length}`;
    }
    if (statWins) {
      statWins.textContent = `${currentProfile.arenaWins} Duel`;
    }
  }

  // =========================================================================
  // 3. RENDER SUMMON (SCENE 2)
  // =========================================================================
  function renderSummonScene(): void {
    const pityText = document.getElementById('summon-pity-text');
    const pityBar = document.getElementById('summon-pity-bar');
    const bannerTag = document.getElementById('summon-banner-tag');
    const bannerTitle = document.getElementById('summon-banner-title');
    const bannerLore = document.getElementById('summon-banner-lore');
    const bannerSkill = document.getElementById('summon-featured-skill');
    const bannerQuote = document.getElementById('summon-featured-quote');
    const stageEl = document.getElementById('summon-featured-stage');

    const pityVal = Math.min(50, currentProfile.pity5StarCounter);
    if (pityText) pityText.textContent = `${pityVal} / 50`;
    if (pityBar) pityBar.style.width = `${Math.round((pityVal / 50) * 100)}%`;

    document.querySelectorAll<HTMLButtonElement>('[data-banner-id]').forEach((btn) => {
      const isAct = btn.getAttribute('data-banner-id') === activeBannerId;
      btn.classList.toggle('is-active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    if (activeBannerId === 'HERO_SOVEREIGN_BANNER') {
      if (bannerTag) bannerTag.textContent = 'SOVEREIGN HERO INVOCATION';
      if (bannerTitle) bannerTitle.textContent = 'Evelyn, Dawn Blade & Kaelthas, Solar Sovereign';
      if (bannerLore) {
        bannerLore.textContent =
          'Cahaya fajar dan api surya berpadu di puncak altar. Panggil para ksatria bintang lima untuk memimpin ekspedisi menara.';
      }
      if (bannerSkill) bannerSkill.textContent = 'Starfall Horizon Cleave · 320% Solar DMG';
      if (bannerQuote) {
        bannerQuote.textContent =
          '"Selama pedang ini menyala, malam tidak akan menelan puncak menara."';
      }
      if (stageEl) {
        stageEl.innerHTML = composeHeroPaperDollSvg({
          heroId: 'hero-evelyn-dawnblade',
          currentStars: 5,
          equippedLoadout: {
            WEAPON: 'wpn-starfall-blade',
            ARMOR: 'arm-valkyrie-aegis',
            HELMET: 'hlm-valkyrie-crown',
            OFFHAND: 'off-aegis-bastion',
            RELIC_CAPE: 'rel-seraphim-wings',
          },
          sizePx: 270,
          showPedestal: true,
        });
      }
    } else {
      if (bannerTag) bannerTag.textContent = 'DIVINE ARSENAL INVOCATION';
      if (bannerTitle) bannerTitle.textContent = 'Starfall Blade & Seraphim Six-Wing Halo';
      if (bannerLore) {
        bannerLore.textContent =
          'Persenjataan pusaka yang ditempa dari meteorit bintang. Setiap perlengkapan langsung mengubah wujud 16-bit karaktermu di Barracks.';
      }
      if (bannerSkill) bannerSkill.textContent = 'Signature Weapon Resonance · +18% Total ATK';
      if (bannerQuote) {
        bannerQuote.textContent =
          '"Bilah sejati mengenali keteguhan hati pemiliknya sejak ayunan pertama."';
      }
      if (stageEl) {
        stageEl.innerHTML = composeHeroPaperDollSvg({
          heroId: 'hero-kaelthas-sol',
          currentStars: 5,
          equippedLoadout: {
            WEAPON: 'wpn-helios-greatsword',
            ARMOR: 'arm-dragonlord-mail',
            HELMET: 'hlm-dragonlord-horns',
            OFFHAND: 'off-aegis-bastion',
            RELIC_CAPE: 'rel-seraphim-wings',
          },
          sizePx: 270,
          showPedestal: true,
        });
      }
    }
  }

  function showGachaRevealOverlay(res: GachaSummonResult): void {
    const overlay = document.getElementById('gacha-cinematic-overlay');
    const beam = document.getElementById('gacha-beam-core');
    const headline = document.getElementById('gacha-reveal-headline');
    const grid = document.getElementById('gacha-drop-cards-grid');
    if (!overlay || !grid) return;

    playGachaBeamFanfare(res.highestRarityStars);
    if (beam) beam.setAttribute('data-rarity', String(res.highestRarityStars));
    if (headline) {
      headline.textContent =
        res.highestRarityStars === 5
          ? '✦ SOVEREIGN ★5 TERPANGGIL! ✦'
          : res.highestRarityStars === 4
            ? '✦ PUSAKA GRAND EPIC ★4 ✦'
            : 'Hasil Pemanggilan Altar';
    }

    grid.innerHTML = res.drops
      .map((drop, i) => {
        const previewSvg =
          drop.kind === 'HERO'
            ? composeHeroPaperDollSvg({
                heroId: drop.entryId,
                currentStars: drop.rarityStars,
                sizePx: 88,
                showPedestal: false,
              })
            : composeHeroPaperDollSvg({
                heroId: currentProfile.activeHeroId,
                currentStars: drop.rarityStars,
                equippedLoadout: {
                  ...currentProfile.equippedLoadout,
                  [getEquipmentById(drop.entryId)?.slot || 'WEAPON']: drop.entryId,
                },
                sizePx: 88,
                showPedestal: false,
              });

        return `
          <article class="gacha-drop-card gacha-drop-card--r${drop.rarityStars}" style="animation-delay: ${i * 55}ms">
            <div class="gacha-card-top">
              <span class="gacha-card-stars">${'★'.repeat(drop.rarityStars)}</span>
              <span class="gacha-card-badge">${drop.isNewUnlock ? 'BARU' : `+${drop.convertedSoulShards || drop.convertedStarlightDust} Shards`}</span>
            </div>
            <div class="gacha-card-sprite">${previewSvg}</div>
            <strong class="gacha-card-name">${drop.name}</strong>
            <small class="gacha-card-kind">${drop.kind === 'HERO' ? 'Pahlawan' : 'Perlengkapan'}</small>
          </article>
        `;
      })
      .join('');

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  // =========================================================================
  // 4. RENDER BARRACKS (SCENE 3)
  // =========================================================================
  function renderBarracksScene(triggerEquipSwing = false): void {
    const activeHero = getHeroById(currentProfile.activeHeroId) || HEROES_CATALOG[0];
    const ownedHero = currentProfile.ownedHeroes[activeHero.id];
    const stars = ownedHero ? ownedHero.currentStars : activeHero.baseStars;
    const stats = calculateHunterCombatStats(currentProfile);

    // Left: Roster Grid
    const heroGrid = document.getElementById('barracks-hero-grid');
    if (heroGrid) {
      const filteredHeroes =
        activeRoleFilter === 'ALL'
          ? HEROES_CATALOG
          : HEROES_CATALOG.filter((h) => h.role === activeRoleFilter);

      heroGrid.innerHTML = filteredHeroes
        .map((h) => {
          const owned = currentProfile.ownedHeroes[h.id];
          const isSelected = h.id === activeHero.id;
          const hStars = owned ? owned.currentStars : h.baseStars;
          const miniSvg = composeHeroPaperDollSvg({
            heroId: h.id,
            currentStars: hStars,
            sizePx: 58,
            showPedestal: false,
          });
          return `
            <button
              type="button"
              class="ag-roster-card ${isSelected ? 'is-selected' : ''} ${owned ? 'is-owned' : 'is-locked'}"
              data-select-hero="${h.id}"
            >
              <div class="ag-roster-thumb">${miniSvg}</div>
              <div class="ag-roster-info">
                <strong>${h.name.split(',')[0]}</strong>
                <span>${'★'.repeat(hStars)} ${owned ? `Lv.${owned.level}` : 'Terkunci'}</span>
              </div>
            </button>
          `;
        })
        .join('');
    }

    // Center: 300x300 Character Stage & 5 Slots
    const elBadge = document.getElementById('barracks-hero-element');
    const nameEl = document.getElementById('barracks-hero-name');
    const titleEl = document.getElementById('barracks-hero-title');
    const starsEl = document.getElementById('barracks-hero-stars');
    const cpEl = document.getElementById('barracks-hero-cp');
    const stageMount = document.getElementById('barracks-paperdoll-stage');

    if (elBadge) {
      elBadge.textContent = `${activeHero.element.replace('_', ' ')} · ${activeHero.role.replace('_', ' ')}`;
    }
    if (nameEl) nameEl.textContent = activeHero.name;
    if (titleEl) titleEl.textContent = activeHero.title;
    if (starsEl) starsEl.textContent = '★'.repeat(stars);
    if (cpEl) cpEl.textContent = `CP ${stats.totalCombatPower.toLocaleString('en-US')}`;

    if (stageMount) {
      stageMount.innerHTML = composeHeroPaperDollSvg({
        heroId: activeHero.id,
        currentStars: stars,
        equippedLoadout: currentProfile.equippedLoadout,
        sizePx: 300,
        showPedestal: true,
        className: triggerEquipSwing ? 'is-equipping-swing' : '',
      });
    }

    const slots: readonly EquipmentSlot[] = [
      'WEAPON',
      'OFFHAND',
      'HELMET',
      'ARMOR',
      'RELIC_CAPE',
    ];
    for (const s of slots) {
      const lbl = document.getElementById(`slot-label-${s}`);
      const equippedId = currentProfile.equippedLoadout[s];
      const itemObj = getEquipmentById(equippedId);
      if (lbl) {
        lbl.textContent = itemObj ? `${itemObj.name} (★${itemObj.rarityStars})` : 'Kosong';
      }
    }

    document.querySelectorAll<HTMLButtonElement>('[data-equip-slot]').forEach((btn) => {
      const slotKey = btn.getAttribute('data-equip-slot') as EquipmentSlot;
      btn.classList.toggle('is-selected', slotKey === activeEquipSlot);
    });

    // Right: Gear Inventory & Stat Comparison
    const slotTitle = document.getElementById('barracks-active-slot-title');
    if (slotTitle) slotTitle.textContent = `Pilihan Slot: ${activeEquipSlot.replace('_', ' ')}`;

    const gearList = document.getElementById('barracks-gear-list');
    const slotItems = getEquipmentBySlot(activeEquipSlot);
    if (!selectedCandidateItemId || getEquipmentById(selectedCandidateItemId)?.slot !== activeEquipSlot) {
      selectedCandidateItemId = currentProfile.equippedLoadout[activeEquipSlot] || slotItems[0]?.id || null;
    }

    if (gearList) {
      gearList.innerHTML = slotItems
        .map((item) => {
          const owned = currentProfile.ownedEquipment[item.id];
          const isEquipped = currentProfile.equippedLoadout[activeEquipSlot] === item.id;
          const isPicked = selectedCandidateItemId === item.id;
          return `
            <button
              type="button"
              class="ag-gear-row ${isPicked ? 'is-picked' : ''} ${owned ? 'is-owned' : 'is-unowned'}"
              data-pick-gear="${item.id}"
            >
              <div class="ag-gear-row-main">
                <strong>${item.name}</strong>
                <span>${'★'.repeat(item.rarityStars)} · +${item.bonusAtk} ATK · +${item.bonusHp} HP</span>
              </div>
              <div class="ag-gear-row-badges">
                ${isEquipped ? '<span class="ag-badge-equipped">Terpasang</span>' : ''}
                ${owned ? `<span class="ag-badge-owned">+${owned.enhanceLevel}</span>` : '<span class="ag-badge-locked">Arsip</span>'}
              </div>
            </button>
          `;
        })
        .join('');
    }

    // Stat Comparison Box
    const compBox = document.getElementById('barracks-item-comparison');
    if (compBox && selectedCandidateItemId) {
      const candidate = getEquipmentById(selectedCandidateItemId);
      const currentEquipped = getEquipmentById(currentProfile.equippedLoadout[activeEquipSlot]);
      const isOwned = Boolean(currentProfile.ownedEquipment[selectedCandidateItemId]);
      const isAlreadyEquipped =
        currentProfile.equippedLoadout[activeEquipSlot] === selectedCandidateItemId;

      if (candidate) {
        const diffAtk = candidate.bonusAtk - (currentEquipped?.bonusAtk || 0);
        const diffHp = candidate.bonusHp - (currentEquipped?.bonusHp || 0);
        const diffDef = candidate.bonusDef - (currentEquipped?.bonusDef || 0);
        const fmtDiff = (n: number) =>
          n > 0 ? `<b class="stat-up">+${n}</b>` : n < 0 ? `<b class="stat-down">${n}</b>` : `<span>0</span>`;

        compBox.innerHTML = `
          <div class="ag-comp-head">
            <strong>${candidate.name} (${'★'.repeat(candidate.rarityStars)})</strong>
            <p>${candidate.lore}</p>
          </div>
          <div class="ag-comp-deltas">
            <div><span>ATK</span><strong>${candidate.bonusAtk} (${fmtDiff(diffAtk)})</strong></div>
            <div><span>HP</span><strong>${candidate.bonusHp} (${fmtDiff(diffHp)})</strong></div>
            <div><span>DEF</span><strong>${candidate.bonusDef} (${fmtDiff(diffDef)})</strong></div>
          </div>
          <div class="ag-comp-actions">
            ${
              isAlreadyEquipped
                ? `<button type="button" class="ag-secondary-btn ag-full-btn" data-action-unequip="${activeEquipSlot}">Lepas Perlengkapan</button>`
                : `<button type="button" class="ag-primary-gold-btn ag-full-btn" data-action-equip="${candidate.id}">${isOwned ? 'Pasang ke Karakter' : 'Pasang & Uji Wujud'}</button>`
            }
          </div>
        `;
      }
    }

    // Stats & Skill Breakdown
    const statsBreakdown = document.getElementById('barracks-stats-breakdown');
    if (statsBreakdown) {
      statsBreakdown.innerHTML = `
        <div class="ag-stat-grid">
          <div><span>Total HP</span><strong>${stats.finalHp.toLocaleString('en-US')}</strong></div>
          <div><span>Total ATK</span><strong>${stats.finalAtk.toLocaleString('en-US')}</strong></div>
          <div><span>Total DEF</span><strong>${stats.finalDef.toLocaleString('en-US')}</strong></div>
          <div><span>Speed / CRIT</span><strong>${stats.finalSpd} / ${stats.finalCritPct}%</strong></div>
          <div><span>Bonus Grimoire</span><strong>+${stats.grimoireBonusPct}%</strong></div>
          <div><span>Bonus Trials</span><strong>+${stats.codeSanctumBonusPct.atkPct}% ATK</strong></div>
        </div>
        <div class="ag-skill-card">
          <span class="ag-kicker">PASSIVE SKILL</span>
          <strong>${activeHero.passiveSkillName}</strong>
          <p>${activeHero.passiveSkillDesc}</p>
        </div>
        <div class="ag-skill-card">
          <span class="ag-kicker">BURST ULTIMATE</span>
          <strong>${activeHero.burstSkillName}</strong>
          <p>${activeHero.burstSkillDesc}</p>
        </div>
      `;
    }
  }

  // =========================================================================
  // 5. RENDER GRIMOIRE ARCHIVE & RELIC FORGE (SCENE 4)
  // =========================================================================
  function renderGrimoireScene(): void {
    const ownedHeroSet = new Set(Object.keys(currentProfile.ownedHeroes));
    const ownedItemSet = new Set(Object.keys(currentProfile.ownedEquipment));
    const totalUnlocked = ownedHeroSet.size + ownedItemSet.size;
    const totalCatalog = HEROES_CATALOG.length + ITEMS_CATALOG.length;

    const progLabel = document.getElementById('grimoire-progress-label');
    const progBar = document.getElementById('grimoire-progress-bar');
    if (progLabel) {
      progLabel.textContent = `${totalUnlocked} / ${totalCatalog} Entri Koleksi Terbuka`;
    }
    if (progBar) {
      progBar.style.width = `${Math.round((totalUnlocked / totalCatalog) * 100)}%`;
    }

    // 12 Collection Bonds
    const bondsGrid = document.getElementById('grimoire-bonds-grid');
    if (bondsGrid) {
      bondsGrid.innerHTML = GRIMOIRE_COLLECTIONS.map((bond) => {
        const unlocked = isGrimoireBondUnlocked(bond.id, ownedHeroSet, ownedItemSet);
        return `
          <article class="ag-bond-card ${unlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="ag-bond-head">
              <strong>${bond.title}</strong>
              <span class="ag-bond-bonus">+${bond.bonusValuePct}% ${bond.bonusStatType.replace('_PCT', '')}</span>
            </div>
            <p>${bond.lore}</p>
            <small>${unlocked ? '✦ Ikatan Aktif' : 'Belum Lengkap'}</small>
          </article>
        `;
      }).join('');
    }

    // Galeri 24 Pahlawan / 50 Perlengkapan (Unowned -> Silhouette)
    const galleryGrid = document.getElementById('grimoire-gallery-grid');
    const showcasePane = document.getElementById('grimoire-showcase-pane');

    if (galleryGrid) {
      if (activeCodexKind === 'HEROES') {
        galleryGrid.innerHTML = HEROES_CATALOG.map((h) => {
          const isOwned = ownedHeroSet.has(h.id);
          const isSelected = selectedCodexEntryId === h.id;
          const svg = composeHeroPaperDollSvg({
            heroId: h.id,
            currentStars: h.baseStars,
            sizePx: 64,
            showPedestal: false,
          });
          return `
            <button
              type="button"
              class="ag-codex-cell ${isSelected ? 'is-selected' : ''} ${isOwned ? 'is-owned' : 'is-unowned-silhouette'}"
              data-codex-entry="${h.id}"
            >
              <div class="ag-codex-sprite">${svg}</div>
              <span>${h.name.split(',')[0]}</span>
            </button>
          `;
        }).join('');
      } else {
        galleryGrid.innerHTML = ITEMS_CATALOG.map((item) => {
          const isOwned = ownedItemSet.has(item.id);
          const isSelected = selectedCodexEntryId === item.id;
          return `
            <button
              type="button"
              class="ag-codex-cell ${isSelected ? 'is-selected' : ''} ${isOwned ? 'is-owned' : 'is-unowned-silhouette'}"
              data-codex-entry="${item.id}"
            >
              <div class="ag-codex-item-icon">${'★'.repeat(item.rarityStars)}</div>
              <span>${item.name.split(' ').slice(0, 2).join(' ')}</span>
            </button>
          `;
        }).join('');
      }
    }

    if (showcasePane) {
      const heroEntry = getHeroById(selectedCodexEntryId);
      const itemEntry: EquipmentCatalogEntry | undefined = getEquipmentById(selectedCodexEntryId);
      if (heroEntry) {
        const isOwned = ownedHeroSet.has(heroEntry.id);
        const svg = composeHeroPaperDollSvg({
          heroId: heroEntry.id,
          currentStars: heroEntry.baseStars,
          sizePx: 140,
          showPedestal: true,
        });
        showcasePane.innerHTML = `
          <div class="ag-showcase-card ${isOwned ? '' : 'is-unowned-silhouette'}">
            <div class="ag-showcase-sprite">${svg}</div>
            <div class="ag-showcase-copy">
              <span class="ag-kicker">${'★'.repeat(heroEntry.baseStars)} · ${heroEntry.role.replace('_', ' ')}</span>
              <h4>${heroEntry.name}</h4>
              <p>${heroEntry.lore}</p>
              <small>${isOwned ? 'Status: Dimiliki di Barak' : 'Status: Siluet (Panggil di Summon Altar)'}</small>
            </div>
          </div>
        `;
      } else if (itemEntry) {
        const isOwned = ownedItemSet.has(itemEntry.id);
        const svg = composeHeroPaperDollSvg({
          heroId: currentProfile.activeHeroId,
          currentStars: itemEntry.rarityStars,
          equippedLoadout: {
            ...currentProfile.equippedLoadout,
            [itemEntry.slot]: itemEntry.id,
          },
          sizePx: 140,
          showPedestal: true,
        });
        showcasePane.innerHTML = `
          <div class="ag-showcase-card ${isOwned ? '' : 'is-unowned-silhouette'}">
            <div class="ag-showcase-sprite">${svg}</div>
            <div class="ag-showcase-copy">
              <span class="ag-kicker">${'★'.repeat(itemEntry.rarityStars)} · Slot ${itemEntry.slot}</span>
              <h4>${itemEntry.name}</h4>
              <p>${itemEntry.lore}</p>
              <small>+${itemEntry.bonusAtk} ATK · +${itemEntry.bonusHp} HP · +${itemEntry.bonusDef} DEF</small>
            </div>
          </div>
        `;
      }
    }

    // Sub-tab 2: Synthesis & Awakening Forge
    const forgeHeroList = document.getElementById('forge-hero-list');
    if (forgeHeroList) {
      forgeHeroList.innerHTML = Object.values(currentProfile.ownedHeroes)
        .map((owned) => {
          const h = getHeroById(owned.heroId);
          if (!h) return '';
          const canPromote = owned.currentStars < 5;
          return `
            <div class="ag-forge-row">
              <div>
                <strong>${h.name} (${'★'.repeat(owned.currentStars)})</strong>
                <span>Lv. ${owned.level} · ${owned.soulShards} Soul Shards</span>
              </div>
              <div class="ag-forge-row-btns">
                ${
                  canPromote
                    ? `<button type="button" class="ag-primary-gold-btn" data-forge-promote="${h.id}">Promosi ★${owned.currentStars + 1}</button>`
                    : `<span class="ag-badge-equipped">★5 Maks</span>`
                }
                <button type="button" class="ag-secondary-btn" data-forge-levelup="${h.id}">Latih Lv.+5</button>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const forgeItemList = document.getElementById('forge-item-list');
    if (forgeItemList) {
      forgeItemList.innerHTML = Object.values(currentProfile.ownedEquipment)
        .map((owned) => {
          const item = getEquipmentById(owned.itemId);
          if (!item) return '';
          const canSynth = item.rarityStars < 5;
          return `
            <div class="ag-forge-row">
              <div>
                <strong>${item.name} (${'★'.repeat(item.rarityStars)} +${owned.enhanceLevel})</strong>
                <span>Jumlah: ${owned.count}x · Slot ${item.slot}</span>
              </div>
              <div class="ag-forge-row-btns">
                ${
                  canSynth
                    ? `<button type="button" class="ag-primary-gold-btn" data-forge-synth="${item.id}">Sintesis 3-ke-1 (★${item.rarityStars + 1})</button>`
                    : ''
                }
                <button type="button" class="ag-secondary-btn" data-forge-enhance="${item.id}">Tempa +${owned.enhanceLevel + 1}</button>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  // =========================================================================
  // 6. RENDER TRIALS (SCENE 5)
  // =========================================================================
  function renderTrialsScene(): void {
    const tierSpells = CODE_SPELLS_CATALOG.filter((s) => s.tier === activeTrialTier);
    if (!tierSpells.some((s) => s.id === activeTrialId)) {
      activeTrialId = tierSpells[0]?.id || CODE_SPELLS_CATALOG[0].id;
    }
    const activeSpell = getCodeSpellById(activeTrialId) || CODE_SPELLS_CATALOG[0];

    document.querySelectorAll<HTMLButtonElement>('[data-trial-tier]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-trial-tier') === activeTrialTier);
    });

    const trialsListEl = document.getElementById('trials-list');
    if (trialsListEl) {
      trialsListEl.innerHTML = tierSpells
        .map((spell) => {
          const isSolved = currentProfile.solvedSpellIds.includes(spell.id);
          const isCurrent = spell.id === activeSpell.id;
          return `
            <button
              type="button"
              class="ag-trial-item ${isCurrent ? 'is-active' : ''} ${isSolved ? 'is-solved' : ''}"
              data-select-trial="${spell.id}"
            >
              <div>
                <strong>${spell.title}</strong>
                <small>${spell.category}</small>
              </div>
              <span class="ag-trial-status">${isSolved ? '✓ Selesai' : `+${spell.rewardGems} Gems`}</span>
            </button>
          `;
        })
        .join('');
    }

    const codeEl = document.getElementById('trial-active-code');
    const rewardEl = document.getElementById('trial-reward-badge');
    const titleEl = document.getElementById('trial-active-title');
    const descEl = document.getElementById('trial-problem-desc');
    const exEl = document.getElementById('trial-example-cases');
    const fileEl = document.getElementById('trial-editor-filename');
    const solvedCounter = document.getElementById('trial-solved-counter');
    const preEl = document.getElementById('trial-code-display');
    const lineNumsEl = document.getElementById('trial-line-numbers');
    const optionsEl = document.getElementById('trial-options-list');

    if (codeEl) codeEl.textContent = activeSpell.code;
    if (rewardEl) {
      rewardEl.textContent = `+${activeSpell.rewardGems} Gems · +${activeSpell.permanentBuffPct.atkPct}% ATK`;
    }
    if (titleEl) titleEl.textContent = activeSpell.title;
    if (descEl) descEl.textContent = `${activeSpell.lorePrompt} ${activeSpell.problemStatement}`;
    if (exEl) {
      exEl.innerHTML = activeSpell.testCases
        .map(
          (tc) =>
            `<div class="ag-example-row"><span>${tc.label}:</span><code>${tc.inputPreview} → ${tc.expectedOutput}</code></div>`
        )
        .join('');
    }
    if (fileEl) fileEl.textContent = `${activeSpell.code.toLowerCase().replace(/\s+/g, '_')}.ts`;
    if (solvedCounter) {
      solvedCounter.textContent = `${currentProfile.solvedSpellIds.length} / ${CODE_SPELLS_CATALOG.length} Trials Selesai`;
    }

    const codeLines = activeSpell.brokenCodeDisplay.split('\n');
    if (lineNumsEl) {
      lineNumsEl.innerHTML = codeLines.map((_, idx) => `<li>${idx + 1}</li>`).join('');
    }
    if (preEl) {
      preEl.textContent = activeSpell.brokenCodeDisplay;
    }

    const pickedOpt =
      selectedOptionByTrial[activeSpell.id] || activeSpell.options[0]?.id || 'opt-a';
    selectedOptionByTrial[activeSpell.id] = pickedOpt;

    if (optionsEl) {
      optionsEl.innerHTML = activeSpell.options
        .map((opt) => {
          const isPicked = opt.id === pickedOpt;
          return `
            <button
              type="button"
              class="ag-trial-option-card ${isPicked ? 'is-selected' : ''}"
              data-pick-option="${opt.id}"
            >
              <span class="ag-opt-radio">${isPicked ? '●' : '○'} Formula ${opt.id.replace('opt-', '').toUpperCase()}</span>
              <code>${opt.codeSnippet}</code>
            </button>
          `;
        })
        .join('');
    }

    const consoleOut = document.getElementById('trial-console-output');
    if (consoleOut && !consoleOut.innerHTML.trim()) {
      consoleOut.innerHTML = activeSpell.testCases
        .map(
          (tc) =>
            `<div class="ag-console-line"><span>${tc.label}</span><code>${tc.inputPreview}</code><em>Siap diuji</em></div>`
        )
        .join('');
    }
  }

  // =========================================================================
  // 7. RENDER ARENA (SCENE 6)
  // =========================================================================
  function renderArenaScene(): void {
    const leaderboard = buildClientLeaderboard(currentProfile);
    const playerStats = calculateHunterCombatStats(currentProfile);
    const playerHero = getHeroById(currentProfile.activeHeroId) || HEROES_CATALOG[0];
    const ownedPlayerHero = currentProfile.ownedHeroes[playerHero.id];
    const playerStars = ownedPlayerHero ? ownedPlayerHero.currentStars : playerHero.baseStars;

    const opponent =
      leaderboard.find((e) => e.hunterId === selectedOpponentId && e.hunterId !== currentProfile.hunterId) ||
      SEED_TOWER_GUARDIANS[SEED_TOWER_GUARDIANS.length - 1];
    selectedOpponentId = opponent.hunterId;

    // Top Battle Stage
    const oppLabel = document.getElementById('arena-selected-opponent-label');
    const leftName = document.getElementById('arena-left-name');
    const leftCp = document.getElementById('arena-left-cp');
    const leftSprite = document.getElementById('arena-left-sprite');
    const rightName = document.getElementById('arena-right-name');
    const rightCp = document.getElementById('arena-right-cp');
    const rightSprite = document.getElementById('arena-right-sprite');

    if (oppLabel) oppLabel.textContent = `Lawan: ${opponent.username}`;
    if (leftName) leftName.textContent = `${currentProfile.username} (${playerHero.name.split(',')[0]})`;
    if (leftCp) leftCp.textContent = `CP ${playerStats.totalCombatPower.toLocaleString('en-US')}`;
    if (leftSprite) {
      leftSprite.innerHTML = composeHeroPaperDollSvg({
        heroId: playerHero.id,
        currentStars: playerStars,
        equippedLoadout: currentProfile.equippedLoadout,
        sizePx: 170,
        showPedestal: true,
      });
    }

    if (rightName) rightName.textContent = `${opponent.username} (${opponent.activeHeroName.split(',')[0]})`;
    if (rightCp) rightCp.textContent = `CP ${opponent.combatPower.toLocaleString('en-US')}`;
    if (rightSprite) {
      rightSprite.innerHTML = composeHeroPaperDollSvg({
        heroId: opponent.activeHeroId,
        currentStars: opponent.activeHeroStars,
        equippedLoadout: opponent.equippedLoadout,
        sizePx: 170,
        showPedestal: true,
      });
    }

    // Leaderboard Table
    const playerRankEntry = leaderboard.find((e) => e.hunterId === currentProfile.hunterId);
    const standingEl = document.getElementById('arena-player-standing');
    if (standingEl && playerRankEntry) {
      standingEl.textContent = `Peringkat Anda: #${playerRankEntry.rank} dari ${leaderboard.length} Combatants`;
    }

    const tbody = document.getElementById('arena-leaderboard-tbody');
    if (tbody) {
      tbody.innerHTML = leaderboard
        .map((entry) => {
          const isSelf = entry.hunterId === currentProfile.hunterId;
          const isTarget = entry.hunterId === selectedOpponentId;
          const weaponName = getEquipmentById(entry.equippedLoadout.WEAPON)?.name || 'Starfall Blade';
          const avatarSvg = composeHeroPaperDollSvg({
            heroId: entry.activeHeroId,
            currentStars: entry.activeHeroStars,
            equippedLoadout: entry.equippedLoadout,
            sizePx: 44,
            showPedestal: false,
          });
          const arenaScore = 1000 + entry.arenaWins * 25 + entry.arenaFloorCleared * 12;

          return `
            <tr class="${isSelf ? 'is-player-row' : ''} ${isTarget ? 'is-selected-opponent' : ''}">
              <th scope="row">#${entry.rank} ${isSelf ? '(Anda)' : ''}</th>
              <td>
                <div class="ag-lb-hunter-cell">
                  <div class="ag-lb-avatar">${avatarSvg}</div>
                  <div>
                    <strong>${entry.username}</strong>
                    <small>${entry.activeHeroName} (${'★'.repeat(entry.activeHeroStars)})</small>
                  </div>
                </div>
              </td>
              <td>${entry.titleBadge}</td>
              <td>${weaponName}</td>
              <td>${entry.solvedSpellsCount} / 24</td>
              <td><strong>${entry.combatPower.toLocaleString('en-US')}</strong></td>
              <td>${arenaScore.toLocaleString('en-US')} pts</td>
              <td>
                ${
                  isSelf
                    ? '<span class="ag-badge-equipped">Aktif</span>'
                    : `<button type="button" class="ag-secondary-btn" data-challenge-hunter="${entry.hunterId}">Tantang Duel</button>`
                }
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  function renderAllScenes(): void {
    saveLocalProfile(currentProfile);
    renderTopbarAndOutpost();
    renderSummonScene();
    renderBarracksScene(false);
    renderGrimoireScene();
    renderTrialsScene();
    renderArenaScene();
  }

  // =========================================================================
  // 8. EVENT LISTENERS & INTERACTIVE FLOWS
  // =========================================================================

  // Title screen & Smart Auth Gate
  const titleScreen = document.getElementById('aethelgrad-title-screen');
  const authGate = document.getElementById('aethelgrad-auth-gate');
  const enterBtn = document.getElementById('title-enter-spire-btn');

  // Jika URL sudah memiliki hash scene (#outpost..#arena), langsung buka scene tersebut
  if (window.location.hash && VALID_SCENES.includes(parseHashScene())) {
    titleScreen?.classList.add('is-dismissed');
    authGate?.classList.add('is-dismissed');
  }

  enterBtn?.addEventListener('click', () => {
    playUiClickSound();
    titleScreen?.classList.add('is-dismissed');
    const existingSaved = loadLocalProfile();
    if (existingSaved) {
      currentProfile = existingSaved;
      authGate?.classList.add('is-dismissed');
      renderAllScenes();
    } else {
      authGate?.classList.remove('is-dismissed');
    }
  });

  // Auth Gate Form
  let authMode: 'REGISTER' | 'LOGIN' = localStorage.getItem(STORAGE_BOUND_USER_KEY)
    ? 'LOGIN'
    : 'REGISTER';
  const authForm = document.getElementById('aethelgrad-auth-form') as HTMLFormElement | null;
  const authSwitchBtn = document.getElementById('auth-switch-mode-btn');
  const authTitle = document.getElementById('auth-gate-title');
  const authConfirmWrap = document.getElementById('auth-confirm-password-wrap');
  const authFeedback = document.getElementById('auth-feedback-box');
  const authUserInp = document.getElementById('auth-username-input') as HTMLInputElement | null;

  function syncAuthUi(): void {
    const boundName = localStorage.getItem(STORAGE_BOUND_USER_KEY);
    if (boundName && authUserInp && !authUserInp.value) {
      authUserInp.value = boundName;
    }
    if (authMode === 'LOGIN') {
      if (authTitle) authTitle.textContent = 'Masuk Kembali ke Aethelgrad';
      if (authConfirmWrap) authConfirmWrap.style.display = 'none';
      if (authSwitchBtn) authSwitchBtn.textContent = 'Ingin mendaftarkan identitas baru? Klik di sini';
    } else {
      if (authTitle) authTitle.textContent = 'Daftarkan Identitas Hunter';
      if (authConfirmWrap) authConfirmWrap.style.display = 'flex';
      if (authSwitchBtn) authSwitchBtn.textContent = 'Sudah memiliki identitas Hunter? Masuk di sini';
    }
  }
  syncAuthUi();

  authSwitchBtn?.addEventListener('click', () => {
    authMode = authMode === 'REGISTER' ? 'LOGIN' : 'REGISTER';
    syncAuthUi();
  });

  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUser = authUserInp?.value.trim() || 'Vanguard_702';
    const passInp = document.getElementById('auth-password-input') as HTMLInputElement | null;
    const rawPass = passInp?.value || '';

    if (!/^[A-Za-z0-9_-]{3,20}$/.test(rawUser)) {
      if (authFeedback) {
        authFeedback.textContent =
          'Nama panggilan hanya boleh berisi huruf, angka, tanda hubung (-), atau garis bawah (_).';
      }
      return;
    }
    if (rawPass.length < 8) {
      if (authFeedback) authFeedback.textContent = 'Kata sandi minimal 8 karakter.';
      return;
    }

    try {
      const endpoint =
        authMode === 'REGISTER' ? '/api/aethelgrad/register.json' : '/api/aethelgrad/login.json';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: rawUser,
          password: rawPass,
          deviceSignal: getOrCreateDeviceSignal(),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.profile) {
          currentProfile = data.profile;
        } else {
          currentProfile = createLocalFallbackProfile(rawUser);
        }
      } else {
        currentProfile = createLocalFallbackProfile(rawUser);
      }
    } catch {
      currentProfile = createLocalFallbackProfile(rawUser);
    }

    authGate?.classList.add('is-dismissed');
    renderAllScenes();
  });

  // Topbar Scene Tabs & Outpost Scene Jump Buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tabBtn = target.closest<HTMLElement>('[data-scene-tab]');
    if (tabBtn) {
      const sc = tabBtn.getAttribute('data-scene-tab') as AethelgradSceneId;
      playUiClickSound();
      switchScene(sc);
      return;
    }

    const jumpBtn = target.closest<HTMLElement>('[data-scene-jump]');
    if (jumpBtn) {
      const sc = jumpBtn.getAttribute('data-scene-jump') as AethelgradSceneId;
      playUiClickSound();
      switchScene(sc);
      return;
    }
  });

  window.addEventListener('hashchange', () => {
    switchScene(parseHashScene(), { updateHistory: false });
  });

  window.addEventListener('popstate', () => {
    switchScene(parseHashScene(), { updateHistory: false });
  });

  // Outpost Interactive Companion Hitbox & Cycle Button
  document.getElementById('outpost-hero-hitbox')?.addEventListener('click', () => {
    playUiClickSound();
    dialogueIdx += 1;
    renderTopbarAndOutpost();
    const svg = document.querySelector('#outpost-hero-stage .ag-pixel-sprite');
    if (svg) {
      svg.classList.remove('is-equipping-swing');
      void (svg as HTMLElement).offsetWidth;
      svg.classList.add('is-equipping-swing');
    }
  });

  document.getElementById('outpost-cycle-companion-btn')?.addEventListener('click', () => {
    playEquipClinkSound();
    const ownedIds = Object.keys(currentProfile.ownedHeroes);
    const curIdx = ownedIds.indexOf(currentProfile.activeHeroId);
    const nextHeroId = ownedIds[(curIdx + 1) % ownedIds.length] || HEROES_CATALOG[0].id;
    currentProfile = {
      ...currentProfile,
      activeHeroId: nextHeroId,
    };
    dialogueIdx = 0;
    renderAllScenes();
  });

  // Sound & Logout
  document.getElementById('hud-sound-toggle-btn')?.addEventListener('click', (e) => {
    const muted = toggleSoundMute();
    (e.currentTarget as HTMLElement).textContent = muted ? '🔇' : '🔊';
  });

  document.getElementById('hud-logout-btn')?.addEventListener('click', () => {
    playUiClickSound();
    authMode = 'LOGIN';
    syncAuthUi();
    authGate?.classList.remove('is-dismissed');
  });

  // Summon Scene Events & Native <dialog>
  const ratesDialog = document.getElementById('ag-rates-dialog') as HTMLDialogElement | null;
  document.getElementById('summon-open-rates-btn')?.addEventListener('click', () => {
    playUiClickSound();
    if (ratesDialog && typeof ratesDialog.showModal === 'function') {
      ratesDialog.showModal();
    }
  });

  if (ratesDialog) {
    ratesDialog.addEventListener('close', () => {
      ratesDialog.returnValue = '';
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (ev: PointerEvent, dialog: HTMLDialogElement) => {
        const r = dialog.getBoundingClientRect();
        return (
          ev.clientX < r.left ||
          ev.clientX > r.right ||
          ev.clientY < r.top ||
          ev.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      ratesDialog.addEventListener('pointerdown', (ev) => {
        pressedOutside = outside(ev, ratesDialog);
      });
      ratesDialog.addEventListener('pointerup', (ev) => {
        if (pressedOutside && outside(ev, ratesDialog)) {
          ratesDialog.close();
        }
      });
    }
  }

  document.getElementById('scene-summon')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const bannerBtn = target.closest<HTMLElement>('[data-banner-id]');
    if (bannerBtn) {
      activeBannerId = bannerBtn.getAttribute('data-banner-id') as GachaBannerId;
      playUiClickSound();
      renderSummonScene();
      return;
    }

    const pull1 = target.closest('#btn-gacha-pull-1');
    const pull10 = target.closest('#btn-gacha-pull-10');
    if (pull1 || pull10) {
      const count: 1 | 10 = pull10 ? 10 : 1;
      try {
        // Jika Gems tidak mencukupi saat uji coba, berikan suntikan Gems darurat agar tetap dapat diuji
        if (currentProfile.astralGems < (count === 10 ? 900 : 100) && currentProfile.summonTickets < count) {
          currentProfile = {
            ...currentProfile,
            astralGems: currentProfile.astralGems + 1000,
          };
        }
        const outcome = executeGachaSummon(currentProfile, {
          bannerId: activeBannerId,
          pullCount: count,
        });
        currentProfile = outcome.updatedProfile;
        renderAllScenes();
        showGachaRevealOverlay(outcome.result);
      } catch (err) {
        const msgEl = document.getElementById('summon-recent-summary');
        if (msgEl) msgEl.textContent = (err as Error).message;
      }
    }
  });

  document.getElementById('gacha-close-overlay-btn')?.addEventListener('click', () => {
    playUiClickSound();
    const overlay = document.getElementById('gacha-cinematic-overlay');
    overlay?.classList.remove('is-open');
    overlay?.setAttribute('aria-hidden', 'true');
  });

  // Barracks Scene Events
  document.getElementById('scene-barracks')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const roleBtn = target.closest<HTMLElement>('[data-role-filter]');
    if (roleBtn) {
      activeRoleFilter = roleBtn.getAttribute('data-role-filter') || 'ALL';
      document.querySelectorAll('[data-role-filter]').forEach((b) => {
        b.classList.toggle('is-active', b === roleBtn);
      });
      playUiClickSound();
      renderBarracksScene(false);
      return;
    }

    const heroCard = target.closest<HTMLElement>('[data-select-hero]');
    if (heroCard) {
      const hId = heroCard.getAttribute('data-select-hero');
      if (hId) {
        if (!currentProfile.ownedHeroes[hId]) {
          const cat = getHeroById(hId);
          if (cat) {
            currentProfile = {
              ...currentProfile,
              ownedHeroes: {
                ...currentProfile.ownedHeroes,
                [hId]: {
                  heroId: hId,
                  currentStars: cat.baseStars,
                  level: 10,
                  soulShards: 15,
                  dupesPulled: 0,
                  unlockedAtIso: new Date().toISOString(),
                },
              },
            };
          }
        }
        currentProfile = {
          ...currentProfile,
          activeHeroId: hId,
        };
        playEquipClinkSound();
        renderAllScenes();
        renderBarracksScene(true);
      }
      return;
    }

    const slotBtn = target.closest<HTMLElement>('[data-equip-slot]');
    if (slotBtn) {
      activeEquipSlot = (slotBtn.getAttribute('data-equip-slot') as EquipmentSlot) || 'WEAPON';
      selectedCandidateItemId = currentProfile.equippedLoadout[activeEquipSlot];
      playUiClickSound();
      renderBarracksScene(false);
      return;
    }

    const subtabBtn = target.closest<HTMLElement>('[data-barracks-tab]');
    if (subtabBtn) {
      activeBarracksSubtab =
        (subtabBtn.getAttribute('data-barracks-tab') as 'gear' | 'stats') || 'gear';
      document.querySelectorAll('[data-barracks-tab]').forEach((b) => {
        const act = b === subtabBtn;
        b.classList.toggle('is-active', act);
        b.setAttribute('aria-selected', act ? 'true' : 'false');
      });
      const gearPanel = document.getElementById('barracks-panel-gear');
      const statsPanel = document.getElementById('barracks-panel-stats');
      if (gearPanel && statsPanel) {
        if (activeBarracksSubtab === 'gear') {
          gearPanel.removeAttribute('hidden');
          statsPanel.setAttribute('hidden', '');
        } else {
          statsPanel.removeAttribute('hidden');
          gearPanel.setAttribute('hidden', '');
        }
      }
      return;
    }

    const gearRow = target.closest<HTMLElement>('[data-pick-gear]');
    if (gearRow) {
      selectedCandidateItemId = gearRow.getAttribute('data-pick-gear');
      playUiClickSound();
      renderBarracksScene(false);
      return;
    }

    const equipBtn = target.closest<HTMLElement>('[data-action-equip]');
    if (equipBtn) {
      const itemId = equipBtn.getAttribute('data-action-equip');
      const itemCat = getEquipmentById(itemId);
      if (itemId && itemCat) {
        const nextOwnedEq = { ...currentProfile.ownedEquipment };
        if (!nextOwnedEq[itemId]) {
          nextOwnedEq[itemId] = {
            itemId,
            enhanceLevel: 0,
            count: 1,
            firstObtainedIso: new Date().toISOString(),
          };
        }
        currentProfile = {
          ...currentProfile,
          ownedEquipment: nextOwnedEq,
          equippedLoadout: {
            ...currentProfile.equippedLoadout,
            [itemCat.slot]: itemId,
          },
        };
        playEquipClinkSound();
        renderAllScenes();
        renderBarracksScene(true);

        const activeSlotEl = document.querySelector(
          `[data-equip-slot="${itemCat.slot}"]`
        );
        activeSlotEl?.classList.add('is-slot-flashing');
        window.setTimeout(() => activeSlotEl?.classList.remove('is-slot-flashing'), 500);
      }
      return;
    }

    const unequipBtn =
      target.closest<HTMLElement>('[data-action-unequip]') ||
      target.closest('#barracks-unequip-btn');
    if (unequipBtn) {
      currentProfile = {
        ...currentProfile,
        equippedLoadout: {
          ...currentProfile.equippedLoadout,
          [activeEquipSlot]: null,
        },
      };
      playUiClickSound();
      renderAllScenes();
      renderBarracksScene(true);
    }
  });

  // Grimoire Archive & Relic Forge Scene Events
  document.getElementById('scene-grimoire')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const subtab = target.closest<HTMLElement>('[data-grimoire-subtab]');
    if (subtab) {
      activeGrimoireSubtab =
        (subtab.getAttribute('data-grimoire-subtab') as 'collection' | 'forge') || 'collection';
      document.querySelectorAll('[data-grimoire-subtab]').forEach((b) => {
        const act = b === subtab;
        b.classList.toggle('is-active', act);
        b.setAttribute('aria-selected', act ? 'true' : 'false');
      });
      const colView = document.getElementById('grimoire-view-collection');
      const forgeView = document.getElementById('grimoire-view-forge');
      if (colView && forgeView) {
        if (activeGrimoireSubtab === 'collection') {
          colView.removeAttribute('hidden');
          forgeView.setAttribute('hidden', '');
        } else {
          forgeView.removeAttribute('hidden');
          colView.setAttribute('hidden', '');
        }
      }
      playUiClickSound();
      return;
    }

    const kindBtn = target.closest<HTMLElement>('[data-codex-kind]');
    if (kindBtn) {
      activeCodexKind = (kindBtn.getAttribute('data-codex-kind') as 'HEROES' | 'ITEMS') || 'HEROES';
      selectedCodexEntryId =
        activeCodexKind === 'HEROES' ? HEROES_CATALOG[0].id : ITEMS_CATALOG[0].id;
      document.querySelectorAll('[data-codex-kind]').forEach((b) => {
        b.classList.toggle('is-active', b === kindBtn);
      });
      playUiClickSound();
      renderGrimoireScene();
      return;
    }

    const codexCell = target.closest<HTMLElement>('[data-codex-entry]');
    if (codexCell) {
      selectedCodexEntryId = codexCell.getAttribute('data-codex-entry') || selectedCodexEntryId;
      playUiClickSound();
      renderGrimoireScene();
      return;
    }

    const promoBtn = target.closest<HTMLElement>('[data-forge-promote]');
    const levelBtn = target.closest<HTMLElement>('[data-forge-levelup]');
    const synthBtn = target.closest<HTMLElement>('[data-forge-synth]');
    const enhanceBtn = target.closest<HTMLElement>('[data-forge-enhance]');

    if (promoBtn || levelBtn || synthBtn || enhanceBtn) {
      const feedbackEl = document.getElementById('forge-anvil-feedback');
      try {
        if (currentProfile.starlightDust < 200) {
          currentProfile = {
            ...currentProfile,
            starlightDust: currentProfile.starlightDust + 250,
          };
        }
        const action = promoBtn
          ? 'PROMOTE_HERO_STAR'
          : levelBtn
            ? 'LEVEL_UP_HERO'
            : synthBtn
              ? 'SYNTHESIZE_3_TO_1'
              : 'ENHANCE_EQUIPMENT';
        const targetId =
          promoBtn?.getAttribute('data-forge-promote') ||
          levelBtn?.getAttribute('data-forge-levelup') ||
          synthBtn?.getAttribute('data-forge-synth') ||
          enhanceBtn?.getAttribute('data-forge-enhance') ||
          '';

        const out = executeForgeUpgrade(currentProfile, { action, targetId });
        currentProfile = out.updatedProfile;
        playEquipClinkSound();
        renderAllScenes();
        if (feedbackEl) {
          feedbackEl.textContent = out.result.message;
          feedbackEl.classList.add('is-sparking');
          window.setTimeout(() => feedbackEl.classList.remove('is-sparking'), 600);
        }
      } catch (err) {
        if (feedbackEl) feedbackEl.textContent = (err as Error).message;
      }
    }
  });

  // Trials Scene Events
  document.getElementById('scene-trials')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tierBtn = target.closest<HTMLElement>('[data-trial-tier]');
    if (tierBtn) {
      activeTrialTier =
        (tierBtn.getAttribute('data-trial-tier') as CodeSpellTier) || 'TIER_1_NOVICE';
      playUiClickSound();
      renderTrialsScene();
      return;
    }

    const trialBtn = target.closest<HTMLElement>('[data-select-trial]');
    if (trialBtn) {
      activeTrialId = trialBtn.getAttribute('data-select-trial') || activeTrialId;
      playUiClickSound();
      renderTrialsScene();
      return;
    }

    const optBtn = target.closest<HTMLElement>('[data-pick-option]');
    if (optBtn) {
      const optId = optBtn.getAttribute('data-pick-option') || 'opt-a';
      selectedOptionByTrial[activeTrialId] = optId;
      playUiClickSound();
      renderTrialsScene();
      return;
    }

    if (target.closest('#btn-reset-trial')) {
      const customInp = document.getElementById('trial-custom-code') as HTMLTextAreaElement | null;
      if (customInp) customInp.value = '';
      const activeSpell = getCodeSpellById(activeTrialId) || CODE_SPELLS_CATALOG[0];
      selectedOptionByTrial[activeTrialId] = activeSpell.options[0]?.id || 'opt-a';
      const statusEl = document.getElementById('trial-console-status');
      if (statusEl) statusEl.textContent = 'Kode Direset';
      playUiClickSound();
      renderTrialsScene();
      return;
    }

    if (target.closest('#btn-submit-spell')) {
      const activeSpell = getCodeSpellById(activeTrialId) || CODE_SPELLS_CATALOG[0];
      const customInp = document.getElementById('trial-custom-code') as HTMLTextAreaElement | null;
      const customCode = customInp?.value.trim() || '';
      const chosenOption = selectedOptionByTrial[activeSpell.id] || activeSpell.correctOptionId;

      const out = verifyAndApplyCodeSpell(currentProfile, {
        spellId: activeSpell.id,
        selectedOptionId: customCode ? undefined : chosenOption,
        customCodeAnswer: customCode || undefined,
      });

      currentProfile = out.updatedProfile;
      const statusEl = document.getElementById('trial-console-status');
      const consoleOut = document.getElementById('trial-console-output');
      const consoleBox = document.getElementById('trial-console-box');

      if (out.result.passed) {
        playCodeSanctumSuccessChime();
        if (statusEl) statusEl.textContent = 'Seluruh Kasus Uji Berhasil!';
        consoleBox?.classList.add('is-celebrating');
        window.setTimeout(() => consoleBox?.classList.remove('is-celebrating'), 900);
      } else {
        playUiClickSound();
        if (statusEl) statusEl.textContent = 'Perlu Perbaikan Logika';
      }

      if (consoleOut) {
        const casesHtml = activeSpell.testCases
          .map((tc, idx) => {
            const ok = idx < out.result.testCasesPassed;
            return `<div class="ag-console-line ${ok ? 'is-ok' : 'is-fail'}"><span>${tc.label}</span><code>${tc.inputPreview} → ${tc.expectedOutput}</code><strong>${ok ? 'BERHASIL' : 'GAGAL'}</strong></div>`;
          })
          .join('');
        consoleOut.innerHTML = `<p class="ag-console-summary">${out.result.feedbackMessage}</p>${casesHtml}`;
      }

      renderAllScenes();
    }
  });

  // Arena Scene Events
  document.getElementById('scene-arena')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const challengeBtn = target.closest<HTMLElement>('[data-challenge-hunter]');
    if (challengeBtn) {
      selectedOpponentId =
        challengeBtn.getAttribute('data-challenge-hunter') || selectedOpponentId;
      playUiClickSound();
      renderArenaScene();
      return;
    }

    if (target.closest('#btn-start-auto-duel') && !isDuelAnimating) {
      const leaderboard = buildClientLeaderboard(currentProfile);
      const opponent =
        leaderboard.find((x) => x.hunterId === selectedOpponentId) ||
        SEED_TOWER_GUARDIANS[SEED_TOWER_GUARDIANS.length - 1];

      const sim = simulateColosseumDuel(currentProfile, opponent);
      currentProfile = sim.updatedProfile;

      const stageCard = document.getElementById('arena-battle-stage');
      const leftCard = document.getElementById('arena-left-card');
      const rightCard = document.getElementById('arena-right-card');
      const leftHpBar = document.getElementById('arena-left-hp-bar');
      const rightHpBar = document.getElementById('arena-right-hp-bar');
      const leftDmg = document.getElementById('arena-left-dmg');
      const rightDmg = document.getElementById('arena-right-dmg');
      const logBox = document.getElementById('arena-battle-log');

      isDuelAnimating = true;
      playBattleSlashFanfare();

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        if (leftHpBar) leftHpBar.style.width = sim.duelResult.winner === 'CHALLENGER' ? '68%' : '0%';
        if (rightHpBar) rightHpBar.style.width = sim.duelResult.winner === 'CHALLENGER' ? '0%' : '45%';
        if (logBox) {
          logBox.innerHTML = sim.duelResult.turns
            .slice(-4)
            .map((t) => `<div class="ag-battle-line">${t.narrativeLine}</div>`)
            .join('');
        }
        isDuelAnimating = false;
        renderAllScenes();
        return;
      }

      const turnsToPlay = sim.duelResult.turns.slice(0, 6);
      turnsToPlay.forEach((turn, idx) => {
        window.setTimeout(() => {
          playBattleSlashFanfare();
          stageCard?.classList.add('is-screen-shaking');
          window.setTimeout(() => stageCard?.classList.remove('is-screen-shaking'), 160);

          if (turn.actor === 'CHALLENGER') {
            leftCard?.classList.add('is-lunging');
            rightCard?.classList.add('is-hit-shaking');
            if (rightDmg) {
              rightDmg.textContent = `-${turn.damageDealt}`;
              rightDmg.removeAttribute('hidden');
            }
          } else {
            rightCard?.classList.add('is-lunging');
            leftCard?.classList.add('is-hit-shaking');
            if (leftDmg) {
              leftDmg.textContent = `-${turn.damageDealt}`;
              leftDmg.removeAttribute('hidden');
            }
          }

          const cPct = Math.max(
            0,
            Math.round((turn.challengerRemainingHp / sim.duelResult.challengerMaxHp) * 100)
          );
          const dPct = Math.max(
            0,
            Math.round((turn.defenderRemainingHp / sim.duelResult.defenderMaxHp) * 100)
          );
          if (leftHpBar) leftHpBar.style.width = `${cPct}%`;
          if (rightHpBar) rightHpBar.style.width = `${dPct}%`;
          if (logBox) {
            logBox.innerHTML = `<div class="ag-battle-line">Giliran ${turn.turnNumber}: ${turn.narrativeLine}</div>`;
          }

          window.setTimeout(() => {
            leftCard?.classList.remove('is-lunging', 'is-hit-shaking');
            rightCard?.classList.remove('is-lunging', 'is-hit-shaking');
            leftDmg?.setAttribute('hidden', '');
            rightDmg?.setAttribute('hidden', '');
          }, 220);

          if (idx === turnsToPlay.length - 1) {
            window.setTimeout(() => {
              if (logBox) {
                logBox.innerHTML = `<div class="ag-battle-line is-victory">✦ Duel Selesai: ${
                  sim.duelResult.winner === 'CHALLENGER'
                    ? `${currentProfile.username} Menang (+${sim.duelResult.rewardGems} Gems)!`
                    : `${opponent.username} Bertahan (+${sim.duelResult.rewardGems} Gems)`
                }</div>`;
              }
              isDuelAnimating = false;
              renderAllScenes();
            }, 260);
          }
        }, idx * 280);
      });
    }
  });

  // Initial render & initial hash route
  renderAllScenes();
  const initialScene = parseHashScene();
  switchScene(initialScene, { updateHistory: false, immediate: true });
}
