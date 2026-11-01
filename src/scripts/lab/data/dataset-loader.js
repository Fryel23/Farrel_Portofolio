/*!
 * lab/data/dataset-loader.js - Loader dataset tahunan (spec §8.1–8.3).
 *
 * Single responsibility: mengambil dataset region/tahun dari path yang
 * TER-ALLOWLIST dari manifest (tidak pernah dari raw user input), memvalidasi
 * dengan validate-dataset, dan meng-cache hasilnya (bounded, promise-safe).
 * Race protection ditangani pemanggil (orchestrator) lewat AbortController +
 * request token; loader meneruskan signal dan menerjemahkan abort.
 */

import { validateDataset } from '../core/validate-dataset.js';
import { LabError } from './manifest-loader.js';
import { createDatasetCache } from './dataset-cache.js';

const cache = createDatasetCache({ maxEntries: 8 });

/**
 * Cari entri tahun di manifest (allowlist sumber kebenaran).
 * @returns {{region: object, yearEntry: object}}
 */
export function resolveYearEntry(manifest, regionId, year) {
  const region = (manifest.regions || []).find((candidate) => candidate.id === regionId);
  if (!region) {
    throw new LabError('manifest-invalid', `Region "${regionId}" tidak ada di manifest.`);
  }
  const yearEntry = (region.years || []).find((candidate) => candidate.year === year);
  if (!yearEntry) {
    throw new LabError('manifest-invalid', `Tahun ${year} tidak terdaftar untuk region "${regionId}".`);
  }
  if (typeof yearEntry.dataPath !== 'string' || yearEntry.dataPath === '') {
    /* Tahun terdaftar tapi tanpa dataset resmi → honest unavailable. */
    throw new LabError('dataset-fetch', `Tidak ada dataset resmi untuk ${regionId} ${year} (status: ${yearEntry.status || 'unknown'}).`, { yearEntry });
  }
  return { region, yearEntry };
}

async function fetchDataset(dataPath, knownSourceIds, signal) {
  let response;
  try {
    response = await fetch(dataPath, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal && signal.aborted) throw new LabError('aborted', 'Permintaan dataset dibatalkan.');
    throw new LabError('dataset-fetch', `Gagal memuat dataset: ${error.message}`);
  }
  if (!response.ok) {
    throw new LabError('dataset-fetch', `Dataset tidak dapat dimuat (HTTP ${response.status}).`);
  }
  let dataset;
  try {
    dataset = await response.json();
  } catch (error) {
    throw new LabError('dataset-invalid', `Dataset bukan JSON valid: ${error.message}`);
  }
  const validation = validateDataset(dataset, { knownSourceIds });
  if (!validation.ok) {
    throw new LabError('dataset-invalid', 'Dataset gagal validasi schema.', validation.issues);
  }
  return dataset;
}

/**
 * Muat dataset tahunan (cache dedup per dataPath).
 * @param {object} manifest manifest tervalidasi
 * @param {string} regionId
 * @param {number} year
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<{dataset: object, region: object, yearEntry: object}>}
 */
export async function loadDataset(manifest, regionId, year, { signal } = {}) {
  const { region, yearEntry } = resolveYearEntry(manifest, regionId, year);
  const knownSourceIds = (manifest.sources || []).map((source) => source.id);
  const dataset = await cache.getOrLoad(yearEntry.dataPath, async () => {
    /* Guard prefix kedua kali (defense in depth, spec §8.1). */
    if (!yearEntry.dataPath.startsWith('/data/aqi/')) {
      throw new LabError('dataset-fetch', `Path dataset tidak diizinkan: ${yearEntry.dataPath}`);
    }
    return fetchDataset(yearEntry.dataPath, knownSourceIds, signal);
  });
  return { dataset, region, yearEntry };
}

/** Hanya untuk test / teardown navigasi. */
export function clearDatasetCache() {
  cache.clear();
}
