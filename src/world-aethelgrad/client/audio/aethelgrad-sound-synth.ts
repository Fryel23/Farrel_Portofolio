/**
 * src/world-aethelgrad/client/audio/aethelgrad-sound-synth.ts
 * Synthesizer Suara Prosedural Web Audio API (Zero External MP3/WAV Assets).
 * Menghormati status mute antarmuka global.
 */

import type { HeroRarityStars } from '../../types/hero.types.ts';

let sharedAudioCtx: AudioContext | null = null;
let sfxMuted = false;

export function setAethelgradAudioMuted(muted: boolean): void {
  sfxMuted = muted;
}

export function isAethelgradAudioMuted(): boolean {
  if (sfxMuted) return true;
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem('fip-audio-muted') === '1') return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || isAethelgradAudioMuted()) return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainPeak: number = 0.08,
  delaySec: number = 0
): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Abaikan jika autoplay dibatasi browser
  }
}

export function playDiveWarpSfx(): void {
  playTone(180, 880, 0.55, 'sawtooth', 0.06, 0);
  playTone(440, 1320, 0.65, 'sine', 0.07, 0.25);
}

export function playTitleStartChime(): void {
  playTone(523.25, 659.25, 0.18, 'triangle', 0.08, 0);
  playTone(659.25, 783.99, 0.22, 'triangle', 0.08, 0.12);
  playTone(1046.5, 1046.5, 0.38, 'sine', 0.09, 0.25);
}

export function playGachaBeamSfx(stars: HeroRarityStars): void {
  playTone(260, 520, 0.22, 'triangle', 0.07, 0);
  playTone(520, 780, 0.24, 'triangle', 0.08, 0.15);
  if (stars >= 5) {
    playTone(784, 1568, 0.45, 'sine', 0.1, 0.32);
    playTone(1046.5, 2093, 0.5, 'triangle', 0.09, 0.44);
  } else if (stars === 4) {
    playTone(659.25, 1174.66, 0.38, 'sine', 0.08, 0.32);
  } else {
    playTone(587.33, 880, 0.28, 'sine', 0.07, 0.3);
  }
}

export function playEquipClinkSfx(): void {
  playTone(920, 1380, 0.11, 'triangle', 0.07, 0);
  playTone(1380, 1840, 0.14, 'sine', 0.06, 0.07);
}

export function playForgeAnvilSfx(): void {
  playTone(440, 220, 0.14, 'square', 0.07, 0);
  playTone(880, 1760, 0.32, 'triangle', 0.08, 0.1);
}

export function playSpellCastSfx(passed: boolean): void {
  if (passed) {
    playTone(587.33, 880, 0.18, 'sine', 0.08, 0);
    playTone(880, 1174.66, 0.28, 'triangle', 0.09, 0.14);
  } else {
    playTone(320, 160, 0.28, 'sawtooth', 0.07, 0);
  }
}

export function playBattleSlashSfx(isCrit: boolean): void {
  playTone(isCrit ? 640 : 420, 120, 0.14, 'sawtooth', isCrit ? 0.09 : 0.06, 0);
}
