/*!
 * lab/ui/status-view.js - Status & pengumuman aksesibel (spec §13, §14.1).
 *
 * Single responsibility: satu sumber kebenaran untuk status Data Lab
 * (idle | loading-manifest | loading-dataset | ready | empty | unavailable
 * | error) + region status yang diumumkan aria-live. Layout tidak melompat:
 * area status punya min-height tetap.
 */

export const LAB_STATES = ['idle', 'loading-manifest', 'loading-dataset', 'ready', 'empty', 'unavailable', 'error'];

const STATE_MESSAGES = {
  'idle': 'Menyiapkan Data Lab…',
  'loading-manifest': 'Memuat daftar dataset…',
  'loading-dataset': 'Memuat dataset…',
  'ready': 'Dataset siap.',
  'empty': 'Tidak ada data untuk kombinasi yang dipilih.',
  'unavailable': 'Dataset tidak tersedia.',
  'error': 'Terjadi kesalahan saat memuat data.',
};

export function createStatusView({ statusElement }) {
  let current = 'idle';

  function set(state, detail = '') {
    current = state;
    if (statusElement) {
      statusElement.dataset.state = state;
      statusElement.textContent = detail ? `${STATE_MESSAGES[state] || state} ${detail}` : (STATE_MESSAGES[state] || state);
    }
  }

  function get() {
    return current;
  }

  /* Umumkan perubahan penting tanpa mengganggu (polite).
   * C2 kontrak pemanggil: announce() HANYA dipanggil SETELAH set() dengan
   * status yang sama sudah diterapkan (pola orchestrator: setStatus(x) →
   * announce(detail)). announce() sengaja tidak mengubah `current` maupun
   * data-state; ia hanya mengganti teks detail dari status terakhir, agar
   * state internal dan data-state tidak pernah sinkron terbalik dengan DOM.
   * Memanggil announce() tanpa set() sebelumnya adalah pelanggaran kontrak. */
  function announce(message) {
    if (statusElement) statusElement.textContent = message;
  }

  return { set, get, announce, STATES: LAB_STATES };
}
