/*!
 * global/now-playing.js: Now Playing header indicator (modularized
 * V11.1-M).
 *
 * Single responsibility: polling endpoint Spotify/Now Playing dengan
 * status jujur (playing / recent / hidden), satu interval yang hanya
 * hidup saat tab visible, terdaftar di registry untuk teardown.
 */
import {
  DATA, doc, qs, fetchWithTimeout, motionRegistry, trackMotionListener,
} from '../core.js';

function initNowPlaying() {
  const link = qs('#now-playing');
  const cfg = DATA && DATA.offscreen && DATA.offscreen.spotify;
  if (!link || !cfg || !cfg.nowPlayingEndpoint) return;

  const img = qs('#now-playing-img', link);
  const text = qs('#now-playing-text', link);
  const quickRow = qs('#quick-now-playing');
  const pollMs = cfg.nowPlayingPollMs || 30000;

  if (img) img.addEventListener('error', function () { this.hidden = true; }, { once: true });

  function hide() {
    link.hidden = true;
    link.classList.remove('is-playing', 'is-recent');
    if (quickRow) quickRow.hidden = true;
  }

  function render(data) {
    if (!data || typeof data !== 'object') return hide();
    const title = String(data.title || '').trim();
    const artist = String(data.artist || '').trim();
    if (!title && !artist) return hide();

    const playing = data.isPlaying === true;
    const url = String(data.songUrl || '').trim();
    if (img) {
      const art = String(data.albumImageUrl || '').trim();
      if (art) {
        img.src = art;
        img.hidden = false;
      } else {
        img.hidden = true;
      }
    }
    if (text) text.textContent = (playing ? '' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
    link.classList.toggle('is-playing', playing);
    link.classList.toggle('is-recent', !playing);
    link.hidden = false;
    link.setAttribute('aria-label', (playing ? 'Now playing: ' : 'Recently played: ') + title + (artist ? ' by ' + artist : ''));
    if (/^https?:\/\//i.test(url)) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    if (quickRow) {
      quickRow.textContent = (playing ? 'NOW PLAYING · ' : 'RECENT · ') + title + (artist ? ' · ' + artist : '');
      quickRow.hidden = false;
    }
  }

  async function poll() {
    if (doc.hidden) return;
    try {
      // V5 §3.6: timeout + abort handled inside fetchWithTimeout; an
      // endpoint that never answers now resolves to the honest hidden
      // state instead of hanging forever.
      render(await fetchWithTimeout(cfg.nowPlayingEndpoint));
    } catch (error) {
      hide();
    }
  }

  /* V6.3 §1.4: one interval id, started only while visible and stopped
     the moment the tab hides. The guard inside poll() stays as a safety
     net for a page that boots while already hidden.
     V7.4: interval didaftarkan di motionRegistry.intervals supaya
     teardown navigasi ClientRouter menghentikannya; visibilitychange
     dilacak lewat trackMotionListener (tidak menumpuk antar boot). */
  let pollIntervalId = null;

  function startPolling() {
    if (pollIntervalId !== null) return;
    if (doc.hidden) return;
    pollIntervalId = window.setInterval(poll, pollMs);
    motionRegistry.intervals.add(pollIntervalId);
  }

  function stopPolling() {
    if (pollIntervalId !== null) {
      window.clearInterval(pollIntervalId);
      motionRegistry.intervals.delete(pollIntervalId);
      pollIntervalId = null;
    }
  }

  trackMotionListener(doc, 'visibilitychange', () => {
    if (doc.hidden) {
      stopPolling();
    } else {
      poll(); // one honest refresh on return, then resume the cadence
      startPolling();
    }
  });
  poll();
  startPolling();
}

/* Modularization exports (public API of this feature module). */
export { initNowPlaying };
