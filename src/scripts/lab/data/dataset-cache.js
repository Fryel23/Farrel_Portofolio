/*!
 * lab/data/dataset-cache.js - Cache in-memory terbatas untuk dataset statis.
 *
 * Single responsibility: deduplicate fetch berjalan (promise cache) dan
 * menyimpan hasil dataset yang sudah dimuat, dengan batas ukuran (spec §8.3).
 *  - Bounded: maxEntries; entri terlama diusir (insertion-order Map).
 *  - Promise yang GAGAL dihapus dari cache agar retry benar-benar
 *    mengeksekusi ulang (tidak ada rejected promise permanen).
 *  - Tidak memakai localStorage. Tidak menyimpan promise di storage.
 */

const DEFAULT_MAX_ENTRIES = 8;

export function createDatasetCache({ maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
  /** @type {Map<string, Promise<{value:unknown}>>} */
  const entries = new Map();

  function evictOldestIfFull() {
    while (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
    }
  }

  /**
   * Ambil dari cache, atau muat via loaderFactory(key) (dipanggil sekali).
   * Promise yang tersimpan menyelesaikan NILAI langsung (bukan wrapper).
   * @param {string} key
   * @param {(key:string)=>Promise<unknown>} load
   * @returns {Promise<unknown>}
   */
  function getOrLoad(key, load) {
    const cached = entries.get(key);
    if (cached) return cached;

    evictOldestIfFull();
    const promise = load(key).catch((error) => {
      /* Kegagalan tidak boleh tertahan permanen: hapus agar retry jalan. */
      entries.delete(key);
      throw error;
    });
    entries.set(key, promise);
    return promise;
  }

  function clear() {
    entries.clear();
  }

  function size() {
    return entries.size;
  }

  return { getOrLoad, clear, size };
}
