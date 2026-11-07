/**
 * src/world-aethelgrad/client/tour/world-intro-cinematic.ts
 * Tur Sinematik Pasca-Login 4 Langkah untuk memperkenalkan Wilayah Aethelgrad.
 */

export interface TourStepSpec {
  readonly stepIndex: number;
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
  readonly highlightColumnId: string;
}

export const AETHELGRAD_TOUR_STEPS: readonly TourStepSpec[] = Object.freeze([
  {
    stepIndex: 1,
    kicker: 'TOUR 01 / 04 · THE HUB CITY & GRIMOIRE FORGE',
    title: 'I. The Hub City & Explorer Pass',
    description:
      'Kartu Explorer Pass Anda mencatat status keamanan 1-Device-1-Account, koleksi Grimoire (bonus stat permanen ala Guardian Tales), dan tungku Grimoire Forge untuk mempromosikan Hero ★1 hingga ★5!',
    highlightColumnId: 'col-1-hub-city',
  },
  {
    stepIndex: 2,
    kicker: 'TOUR 02 / 04 · THE GACHA GROTTO & 7-LAYER PAPER-DOLL',
    title: 'II. Summoning Pedestal & Live Paper-Doll',
    description:
      'Panggil 24 Hero Original dan 50 Equipment di Astral Altar (Soft Pity 35, Hard Pity 50). Setiap senjata, zirah, mahkota, perisai, atau sayap yang Anda pasang langsung mengubah tampilan karakter Pixel SVG 7-Layer secara real-time!',
    highlightColumnId: 'col-2-gacha-grotto',
  },
  {
    stepIndex: 3,
    kicker: 'TOUR 03 / 04 · THE CODE-SPELL SANCTUM',
    title: 'III. Pecahkan Algoritma -> Raih Arcane Code Buff',
    description:
      'Selesaikan 24 tantangan logika pemrograman lintas 4 Tier untuk mendapatkan Astral Gems gratis sekaligus mengaktifkan Permanent Arcane Code Buff (+ATK% & +CRIT%) bagi seluruh Hero Anda!',
    highlightColumnId: 'col-3-code-sanctum',
  },
  {
    stepIndex: 4,
    kicker: 'TOUR 04 / 04 · SPIRE COLOSSEUM & LIVE LEADERBOARD',
    title: 'IV. Tantang Para Penjaga Menara di Colosseum',
    description:
      'Adu kekuatan tim Anda dalam duel Auto-Battle 1v1 melawan 12 NPC Tower Guardians dan Hunter lain. Setiap karakter di Leaderboard dirender lengkap dengan wujud Pixel SVG dan senjata mereka!',
    highlightColumnId: 'col-4-spire-colosseum',
  },
]);

const TOUR_SEEN_KEY = 'aethelgrad_intro_tour_completed_v15';

export function initWorldIntroTour(): {
  readonly openTour: () => void;
} {
  const modal = document.getElementById('aethelgrad-tour-modal');
  const kickerEl = document.getElementById('tour-step-kicker');
  const titleEl = document.getElementById('tour-step-title');
  const descEl = document.getElementById('tour-step-desc');
  const nextBtn = document.getElementById('tour-next-btn');
  const skipBtn = document.getElementById('tour-skip-btn');

  let currentIdx = 0;

  function clearHighlights(): void {
    document
      .querySelectorAll('.aethel-deck-column.is-tour-highlighted')
      .forEach((el) => el.classList.remove('is-tour-highlighted'));
  }

  function renderStep(): void {
    const step = AETHELGRAD_TOUR_STEPS[currentIdx];
    if (!step) return;
    if (kickerEl) kickerEl.textContent = step.kicker;
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.description;
    if (nextBtn) {
      nextBtn.textContent =
        currentIdx === AETHELGRAD_TOUR_STEPS.length - 1
          ? 'MULAI PETUALANGAN ✦'
          : 'LANJUTKAN TUR →';
    }

    clearHighlights();
    const targetCol = document.getElementById(step.highlightColumnId);
    if (targetCol) {
      targetCol.classList.add('is-tour-highlighted');
    }
  }

  function closeTour(): void {
    clearHighlights();
    if (modal) modal.hidden = true;
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, '1');
    } catch {
      // ignore
    }
  }

  function openTour(): void {
    if (!modal) return;
    currentIdx = 0;
    modal.hidden = false;
    renderStep();
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentIdx < AETHELGRAD_TOUR_STEPS.length - 1) {
        currentIdx += 1;
        renderStep();
      } else {
        closeTour();
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      closeTour();
    });
  }

  return { openTour };
}
