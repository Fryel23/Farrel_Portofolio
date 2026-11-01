/*!
 * global/audio-feedback.js: sitewide audio feedback (modularized
 * V11.1-M).
 *
 * Single responsibility: sinkronisasi tombol mute header, suara klik
 * via delegasi .magnetic-button, dan suara hover kartu proyek
 * (throttle 90ms). Fungsi suara dimiliki core audio runtime - modul
 * ini TIDAK membuat AudioContext kedua.
 */
import {
  doc, qs, isAudioMuted, setAudioMuted, playClickSound, playHoverSound,
  trackMotionListener,
} from '../core.js';

/* ======================================================================
 * V8.0 FASE 2: AUDIO FEEDBACK INIT (sitewide)
 * ==================================================================== */
/* Tiga tugas: (1) sinkron + wiring tombol mute Header (preferensi
 * localStorage fip-audio-muted), (2) suara klik CTA lewat delegasi
 * document pada .magnetic-button sehingga tetap bekerja untuk DOM yang
 * dirender ulang, (3) suara hover kartu proyek lewat delegasi mouseover
 * (sekali per kartu + throttle 90ms). Fungsi suara sendiri sudah no-op
 * saat mute / reduced motion / tanpa Web Audio (Batasan 1 + 3). */
function initAudioFeedback() {
  const toggle = qs('#audio-toggle');
  const syncToggle = (button) => {
    if (!button) return;
    const muted = isAudioMuted();
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? 'Unmute interface sounds' : 'Mute interface sounds');
    button.classList.toggle('is-muted', muted);
    const iconOn = button.querySelector('.audio-icon-on');
    const iconOff = button.querySelector('.audio-icon-off');
    if (iconOn) iconOn.hidden = muted;
    if (iconOff) iconOff.hidden = !muted;
  };
  if (toggle && toggle.dataset.audioBound !== 'true') {
    toggle.dataset.audioBound = 'true';
    syncToggle(toggle);
    trackMotionListener(toggle, 'click', () => {
      const next = !isAudioMuted();
      setAudioMuted(next);
      syncToggle(toggle);
      if (!next) playClickSound(); // umpan balik saat di-unmute
    });
  } else if (toggle) {
    syncToggle(toggle);
  }

  trackMotionListener(doc, 'click', (event) => {
    if (event.target && event.target.closest && event.target.closest('.magnetic-button')) {
      playClickSound();
    }
  });

  let lastHoverCard = null;
  let lastHoverAt = 0;
  trackMotionListener(doc, 'mouseover', (event) => {
    const card = event.target && event.target.closest ? event.target.closest('.project-card') : null;
    if (!card) {
      lastHoverCard = null;
      return;
    }
    if (card === lastHoverCard) return;
    lastHoverCard = card;
    const now = Date.now();
    if (now - lastHoverAt < 90) return;
    lastHoverAt = now;
    playHoverSound();
  });
}

/* Modularization exports (public API of this feature module). */
export { initAudioFeedback };
