/*!
 * core/audio-runtime.js: Web Audio runtime owner (modularized
 * V11.1-M).
 *
 * Single responsibility: preferensi mute (localStorage fip-audio-
 * muted), SATU AudioContext lazily dibuat dalam gesture, dan dua suara
 * sintesis (click + hover). Tanpa Web Audio / saat mute / reduce:
 * semua no-op tanpa error.
 */
import { isReducedMotion } from './environment.js';

/* ======================================================================
 * V8.0 FASE 2: AUDIO FEEDBACK (WEB AUDIO API, TANPA FILE)
 * ======================================================================
 * Dua suara sintesis oscillator: playClickSound (frekuensi tinggi,
 * 0.05s) untuk CTA dan playHoverSound (frekuensi rendah, volume sangat
 * kecil) untuk kartu proyek. AudioContext dibuat lazily di dalam gesture
 * pengguna (kebijakan autoplay browser). Preferensi mute tersimpan di
 * localStorage (kunci fip-audio-muted). Progressive enhancement penuh:
 * tanpa Web Audio, atau saat mute, semua fungsi no-op tanpa error.
 * Keputusan dokumentasi: Batasan 3 membaca "semua efek baru", maka
 * suara juga dimatikan saat prefers-reduced-motion: reduce. */
const AUDIO_STORAGE_KEY = 'fip-audio-muted';
let audioCtx = null;
let audioMutedCache = null;

export function isAudioMuted() {
  if (audioMutedCache === null) {
    try {
      audioMutedCache = window.localStorage.getItem(AUDIO_STORAGE_KEY) === 'true';
    } catch (error) {
      audioMutedCache = false; // storage diblokir: default tidak mute
    }
  }
  return audioMutedCache;
}

export function setAudioMuted(value) {
  audioMutedCache = value === true;
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, String(audioMutedCache));
  } catch (error) { /* penyimpanan tidak tersedia: preferensi hanya sesi ini */ }
}

function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null; // Batasan 1: tanpa Web Audio situs tetap normal
  if (!audioCtx) {
    try { audioCtx = new AC(); } catch (error) { return null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try { audioCtx.resume(); } catch (error) { /* akan di-resume gesture lain */ }
  }
  return audioCtx;
}

export function playClickSound() {
  if (isAudioMuted() || isReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function playHoverSound() {
  if (isAudioMuted() || isReducedMotion()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.012, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
