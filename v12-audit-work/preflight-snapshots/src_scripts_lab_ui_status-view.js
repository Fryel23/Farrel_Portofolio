/*!
 * lab/ui/status-view.js — Status & pengumuman aksesibel (spec §13, §14.1).
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

  /* Umumkan perubahan penting tanpa mengganggu (polite). */
  function announce(message) {
    if (statusElement) statusElement.textContent = message;
  }

  return { set, get, announce, STATES: LAB_STATES };
}
