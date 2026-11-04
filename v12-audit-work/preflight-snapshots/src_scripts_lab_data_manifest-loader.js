/*!
 * lab/data/manifest-loader.js — Loader manifest regions.json.
 *
 * Single responsibility: fetch + validasi struktur manifest (spec §8.1).
 * Tidak menyentuh UI. Error dilempar sebagai LabError bertipe sehingga
 * status-view bisa menampilkan pesan yang tepat (bukan catch kosong).
 *
 * Keamanan path: manifest adalah satu-satunya sumber dataPath; loader
 * menolak path yang tidak berawalan prefix data AQI proyek (spec §8.1).
 */

export const DATASET_PATH_PREFIX = '/data/aqi/';

export class LabError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'LabError';
    this.code = code; /* manifest-fetch | manifest-invalid | dataset-fetch | dataset-invalid | aborted */
    this.details = details;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Validasi minimal struktur manifest → daftar masalah (bukan throw). */
export function validateManifest(manifest) {
  const problems = [];
  if (!isPlainObject(manifest)) return ['Manifest bukan objek.'];
  if (manifest.schemaVersion !== 1) problems.push(`schemaVersion harus 1 (dapat ${JSON.stringify(manifest.schemaVersion)}).`);
  if (typeof manifest.defaultRegionId !== 'string' || manifest.defaultRegionId === '') problems.push('defaultRegionId wajib string.');
  if (!Array.isArray(manifest.regions) || manifest.regions.length === 0) problems.push('regions wajib array non-kosong.');
  if (!Array.isArray(manifest.sources)) problems.push('sources wajib array.');

  const regionIds = new Set();
  (manifest.regions || []).forEach((region, index) => {
    const at = `regions[${index}]`;
    if (!isPlainObject(region)) { problems.push(`${at} bukan objek.`); return; }
    if (typeof region.id !== 'string' || region.id === '') problems.push(`${at}.id wajib string.`);
    else if (regionIds.has(region.id)) problems.push(`${at}.id duplikat "${region.id}".`);
    else regionIds.add(region.id);
    if (typeof region.timezone !== 'string' || region.timezone === '') problems.push(`${at}.timezone wajib (spec §5.2).`);
    if (!Array.isArray(region.years)) problems.push(`${at}.years wajib array.`);
    (region.years || []).forEach((yearEntry, yearIndex) => {
      const yat = `${at}.years[${yearIndex}]`;
      if (!isPlainObject(yearEntry)) { problems.push(`${yat} bukan objek.`); return; }
      if (!Number.isInteger(yearEntry.year)) problems.push(`${yat}.year wajib integer.`);
      if (typeof yearEntry.status !== 'string') problems.push(`${yat}.status wajib string.`);
      if (yearEntry.dataPath !== null && typeof yearEntry.dataPath !== 'string') problems.push(`${yat}.dataPath wajib string atau null.`);
      if (typeof yearEntry.dataPath === 'string' && !yearEntry.dataPath.startsWith(DATASET_PATH_PREFIX)) {
        problems.push(`${yat}.dataPath di luar prefix ${DATASET_PATH_PREFIX}: "${yearEntry.dataPath}".`);
      }
    });
  });

  return problems;
}

/**
 * Fetch + validasi manifest.
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<object>} manifest tervalidasi
 */
export async function loadManifest({ signal } = {}) {
  let response;
  try {
    response = await fetch('/data/aqi/regions.json', { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal && signal.aborted) throw new LabError('aborted', 'Permintaan manifest dibatalkan.');
    throw new LabError('manifest-fetch', `Gagal memuat manifest dataset: ${error.message}`);
  }
  if (!response.ok) {
    throw new LabError('manifest-fetch', `Manifest dataset tidak dapat dimuat (HTTP ${response.status}).`);
  }
  let manifest;
  try {
    manifest = await response.json();
  } catch (error) {
    throw new LabError('manifest-invalid', `Manifest bukan JSON valid: ${error.message}`);
  }
  const problems = validateManifest(manifest);
  if (problems.length > 0) {
    throw new LabError('manifest-invalid', 'Struktur manifest tidak sesuai schema.', problems);
  }
  return manifest;
}
