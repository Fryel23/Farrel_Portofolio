// @ts-check
/*!
 * lab/core/validate-dataset.js - Validator schema dataset AQI Data Lab.
 *
 * Single responsibility: memeriksa struktur & integritas objek dataset
 * (schemaVersion 1) dan mengembalikan DAFTAR ISSUE yang bisa ditampilkan -
 * bukan boolean telanjang (spec §7.6). Tidak mengubah data (read-only).
 *
 * Keputusan schema yang divalidasi (didokumentasikan di methodology):
 *  - Record tidak punya `date` sub-tahun karena sumber (DLH Kota Cirebon)
 *    hanya melaporkan tahun + tahap pengukuran; `date: null` sah, dan
 *    `period.year` wajib = dataset.year.
 *  - `date` opsional bila ada harus format YYYY-MM-DD kalender-valid
 *    (untuk dataset masa depan yang benar-benar harian).
 *  - `values` hanya boleh berisi parameter yang dideklarasikan di
 *    dataset.parameterDefinitions; konsentrasi numeric finite >= 0 atau null.
 *  - `derived.ispu` (bila valid) harus 0..500 dan kategorinya konsisten.
 */

import { getISPUCategory } from './aqi-calculator.js';

/**
 * @typedef {import('../../../types/lab-aqi.ts').AqiValidationIssue} AqiValidationIssue
 * @typedef {import('../../../types/lab-aqi.ts').AqiValidationIssueCode} AqiValidationIssueCode
 * @typedef {import('../../../types/lab-aqi.ts').AqiValidationResult} AqiValidationResult
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isHttpUrl(value) {
  if (typeof value !== 'string' || value === '') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validasi dataset tahunan.
 * @param {unknown} datasetObj  objek {schemaVersion, regionId, year, dataset, records}
 * @param {{knownSourceIds?: readonly string[]}} [options] daftar sourceId resmi (manifest)
 * @returns {AqiValidationResult}
 */
export function validateDataset(datasetObj, options = {}) {
  /** @type {AqiValidationIssue[]} */
  const issues = [];
  /**
   * @param {'error' | 'warning'} severity
   * @param {AqiValidationIssueCode} code
   * @param {string} message
   * @param {string} path
   */
  const add = (severity, code, message, path) => issues.push({ severity, code, message, path });

  if (!isPlainObject(datasetObj)) {
    add('error', 'ROOT_NOT_OBJECT', 'Dataset bukan objek.', '$');
    return { ok: false, issues };
  }

  /* --- Header --- */
  if (datasetObj.schemaVersion !== 1) {
    add('error', 'SCHEMA_VERSION', `schemaVersion harus 1, dapat ${JSON.stringify(datasetObj.schemaVersion)}.`, 'schemaVersion');
  }
  if (typeof datasetObj.regionId !== 'string' || datasetObj.regionId.trim() === '') {
    add('error', 'REGION_ID', 'regionId wajib string non-kosong.', 'regionId');
  }
  const year = datasetObj.year;
  if (typeof year !== 'number' || !Number.isInteger(year) || year < 2000 || year > 2100) {
    add('error', 'YEAR', `year harus integer 2000–2100, dapat ${JSON.stringify(year)}.`, 'year');
  }

  const meta = datasetObj.dataset;
  if (!isPlainObject(meta)) {
    add('error', 'META_MISSING', 'Blok metadata `dataset` wajib ada.', 'dataset');
  } else {
    if (typeof meta.title !== 'string' || meta.title.trim() === '') {
      add('error', 'TITLE', 'dataset.title wajib string non-kosong.', 'dataset.title');
    }
    if (typeof meta.sourceId !== 'string' || meta.sourceId.trim() === '') {
      add('error', 'SOURCE_ID', 'dataset.sourceId wajib string non-kosong.', 'dataset.sourceId');
    } else if (Array.isArray(options.knownSourceIds) && options.knownSourceIds.length > 0
      && !options.knownSourceIds.includes(meta.sourceId)) {
      add('error', 'SOURCE_UNKNOWN', `sourceId "${meta.sourceId}" tidak ada di manifest sources.`, 'dataset.sourceId');
    }
    if (meta.sourceUrl !== null && meta.sourceUrl !== undefined && !isHttpUrl(meta.sourceUrl)) {
      add('error', 'SOURCE_URL', 'sourceUrl harus null atau URL http(s) valid.', 'dataset.sourceUrl');
    }
    if (meta.accessedAt !== undefined && meta.accessedAt !== null && !isValidCalendarDate(meta.accessedAt)) {
      add('error', 'ACCESSED_AT', 'accessedAt harus tanggal YYYY-MM-DD valid.', 'dataset.accessedAt');
    }
    if (!isPlainObject(meta.parameterDefinitions)) {
      add('error', 'PARAM_DEFS', 'dataset.parameterDefinitions wajib objek.', 'dataset.parameterDefinitions');
    }
    if (!Array.isArray(meta.limitations)) {
      add('warning', 'LIMITATIONS', 'dataset.limitations sebaiknya array (bisa kosong).', 'dataset.limitations');
    }
  }

  const paramDefs = isPlainObject(meta) && isPlainObject(meta.parameterDefinitions) ? meta.parameterDefinitions : {};
  const declaredParams = Object.keys(paramDefs);

  /* --- Records --- */
  const records = datasetObj.records;
  if (!Array.isArray(records) || records.length === 0) {
    add('error', 'RECORDS_EMPTY', 'records wajib array non-kosong (jangan membuat dataset kosong untuk menyamarkan ketidaktersediaan).', 'records');
  } else {
    const seenIds = new Set();
    records.forEach((record, index) => {
      const path = `records[${index}]`;
      if (!isPlainObject(record)) {
        add('error', 'RECORD_NOT_OBJECT', 'Record bukan objek.', path);
        return;
      }
      const recordId = record.id;
      if (typeof recordId !== 'string' || recordId.trim() === '') {
        add('error', 'RECORD_ID', 'Record id wajib string non-kosong.', `${path}.id`);
      } else if (seenIds.has(recordId)) {
        add('error', 'RECORD_DUPLICATE', `Record id duplikat: "${recordId}".`, `${path}.id`);
      } else {
        seenIds.add(recordId);
      }

      /* Period/year konsistensi */
      if (!isPlainObject(record.period)) {
        add('error', 'RECORD_PERIOD', 'Record period wajib objek {year, stage}.', `${path}.period`);
      } else {
        if (record.period.year !== year) {
          add('error', 'RECORD_YEAR_MISMATCH', `period.year ${JSON.stringify(record.period.year)} ≠ dataset.year ${year}.`, `${path}.period.year`);
        }
        if (typeof record.period.stage !== 'string' || record.period.stage.trim() === '') {
          add('error', 'RECORD_STAGE', 'period.stage wajib string non-kosong.', `${path}.period.stage`);
        }
      }

      /* Tanggal: null sah (granularitas sumber tahunan); bila ada harus valid. */
      if (record.date !== null && record.date !== undefined) {
        if (typeof record.date !== 'string' || !isValidCalendarDate(record.date)) {
          add('error', 'RECORD_DATE', 'date harus null atau YYYY-MM-DD kalender-valid.', `${path}.date`);
        }
      }

      if (typeof record.location !== 'string' || record.location.trim() === '') {
        add('error', 'RECORD_LOCATION', 'location wajib string non-kosong.', `${path}.location`);
      }

      /* Values */
      if (!isPlainObject(record.values)) {
        add('error', 'RECORD_VALUES', 'values wajib objek.', `${path}.values`);
      } else {
        for (const [parameter, value] of Object.entries(record.values)) {
          if (!declaredParams.includes(parameter)) {
            add('error', 'PARAM_UNKNOWN', `Parameter "${parameter}" tidak dideklarasikan di parameterDefinitions.`, `${path}.values.${parameter}`);
            continue;
          }
          if (value === null) continue; /* missing disimpan apa adanya */
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            add('error', 'VALUE_NOT_NUMBER', `Konsentrasi ${parameter} harus number finite atau null; dapat ${JSON.stringify(value)}.`, `${path}.values.${parameter}`);
          } else if (value < 0) {
            add('error', 'VALUE_NEGATIVE', `Konsentrasi ${parameter} negatif tidak valid.`, `${path}.values.${parameter}`);
          }
        }
      }

      /* Quality */
      if (!isPlainObject(record.quality)) {
        add('warning', 'RECORD_QUALITY', 'quality sebaiknya objek per-parameter.', `${path}.quality`);
      } else {
        for (const [parameter, quality] of Object.entries(record.quality)) {
          if (!declaredParams.includes(parameter)) continue;
          if (!isPlainObject(quality) || typeof quality.status !== 'string') {
            add('error', 'QUALITY_STATUS', `quality.${parameter}.status wajib string.`, `${path}.quality.${parameter}.status`);
          }
        }
      }

      /* Derived */
      const derived = record.derived;
      if (!isPlainObject(derived)) {
        add('warning', 'RECORD_DERIVED', 'derived (hasil kalkulasi build-time) sebaiknya objek.', `${path}.derived`);
      } else {
        const ispu = derived.ispu;
        if (ispu !== null && (typeof ispu !== 'number' || !Number.isFinite(ispu) || ispu < 0 || ispu > 500)) {
          add('error', 'ISPU_RANGE', `derived.ispu harus null atau 0–500; dapat ${JSON.stringify(ispu)}.`, `${path}.derived.ispu`);
        }
        if (Number.isFinite(ispu)) {
          const expected = getISPUCategory(ispu);
          if (expected.status === 'valid' && derived.category !== expected.label) {
            add('error', 'ISPU_CATEGORY', `derived.category "${derived.category}" ≠ kategori ISPU ${ispu} ("${expected.label}").`, `${path}.derived.category`);
          }
        }
        if (derived.ispuStatus !== undefined && typeof derived.ispuStatus !== 'string') {
          add('error', 'ISPU_STATUS', 'derived.ispuStatus wajib string.', `${path}.derived.ispuStatus`);
        }
      }

      /* reportedIndices: null atau numeric - jangan string */
      if (record.reportedIndices !== undefined && record.reportedIndices !== null && !isPlainObject(record.reportedIndices)) {
        add('error', 'REPORTED_INDICES', 'reportedIndices wajib objek atau null.', `${path}.reportedIndices`);
      }
    });
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  return { ok: errors.length === 0, issues };
}
