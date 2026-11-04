/*!
 * src/data/content-integrity.js - INTEGRITY GATE lintas-entri (V12.2).
 *
 * Validator deterministik & murni untuk content collection `work`:
 * input sama → hasil sama; tanpa timestamp; tanpa mutasi input; urutan
 * issue deterministik (sort by entry id, lalu field, lalu code).
 *
 * Pembagian tanggung jawab (spec V12.2 §9):
 *  - Validasi PER-ENTRI (format, enum, taxonomy membership, duplikat dalam
 *    satu array, self-reference) → schema Zod di src/content.config.ts.
 *  - Validasi LINTAS-ENTRI (duplikat contentId, target relasi, kebijakan
 *    visibilitas relasi, id ambigu) → modul ini.
 *
 * INTEGRASI BUILD (spec §11: validator harus berjalan pada production
 * validation/build path, bukan hanya di unit test): dipanggil dari
 * getStaticPaths() src/pages/work/[slug].astro dan dari src/pages/work/index.astro.
 * Kegagalan → throw dengan pesan actionable "[CONTENT INTEGRITY]" sehingga
 * `astro build` gagal (konten invalid tidak pernah ditayangkan).
 *
 * KEBIJAKAN VISIBILITAS RELASI (didefinisikan & diuji, V12.2 §10):
 *  - relatedIds hanya boleh menunjuk entri berstatus routeable
 *    (bukan 'RESERVED'), karena entri RESERVED tidak pernah punya rute
 *    publik (perilaku V8.1) — relasi ke sana pasti menghasilkan dead link.
 *  - relatedIds kosong bermakna "tidak ada proyek terkait" (bukan "belum
 *    ditinjau"): seluruh entri existing sudah direview saat migrasi V12.2.
 */

import {
  DISCIPLINE_IDS,
  TECHNOLOGY_IDS,
  STATUS_IDS,
  isValidContentId,
  normalizeContentId,
} from './taxonomy.js';
import {
  ADR_CATEGORY_IDS,
  ADR_RECORD_TYPES,
  ADR_RECORD_STATUSES,
  KNOWN_INTERNAL_ROUTES,
  isValidAdrId,
} from '../lib/adr-taxonomy.ts';
import {
  CODEX_DOMAIN_IDS,
  CODEX_MATURITY_IDS,
  CODEX_EVIDENCE_STATUS_IDS,
  isValidDecimalCodeForDomain,
} from '../lib/codex-taxonomy.ts';

/** Status yang TIDAK boleh dijadikan target relasi (tidak punya rute publik). */
const NON_ROUTEABLE_STATUSES = new Set(['RESERVED', 'ARCHIVED']);

/**
 * @typedef {Object} IntegrityIssue
 * @property {string} code   kode mesin-membaca (stabil, tidak berubah makna)
 * @property {string} entry  entry id (Astro entry id) atau '(collection)'
 * @property {string} field  field frontmatter bermasalah
 * @property {unknown} value nilai invalid saat itu
 * @property {string} reason alasan manusia-membaca
 * @property {string} fix    perbaikan yang diharapkan
 */

/**
 * @typedef {Object} IntegrityInputEntry
 * @property {string} id   Astro entry id (slug file)
 * @property {Object} data frontmatter hasil schema
 */

/**
 * Validasi koleksi `work` secara lintas-entri. Murni: tidak mengubah input.
 * @param {IntegrityInputEntry[]} entries
 * @returns {{ ok: boolean, issues: IntegrityIssue[] }}
 */
export function validateWorkCollection(entries) {
  const issues = [];
  const list = Array.isArray(entries) ? entries : [];

  /* --- Pass 1: contentId per entri (format, duplikat, ambiguitas) ------- */
  const byContentId = new Map(); /* contentId → entry id (pertama) */
  const byNormalized = new Map(); /* normalized → contentId (pertama) */

  for (const entry of list) {
    const data = entry && entry.data ? entry.data : {};
    const contentId = data.contentId;

    if (typeof contentId !== 'string' || contentId.length === 0) {
      issues.push({
        code: 'CONTENT_ID_MISSING',
        entry: entry ? String(entry.id) : '(unknown)',
        field: 'contentId',
        value: contentId ?? null,
        reason: 'Setiap entri wajib punya contentId stabil untuk relasi antarkonten.',
        fix: 'Tambahkan frontmatter `contentId` (lowercase kebab-case, unik).',
      });
      continue;
    }

    /* Ambiguitas normalisasi dicek SEBELUM format: dua id yang hanya beda
       case/spasi adalah identitas yang sama (spec V12.2: ambiguous
       normalized IDs) — meski salah satunya juga pasti gagal aturan format. */
    const normalized = normalizeContentId(contentId);
    if (byNormalized.has(normalized) && byNormalized.get(normalized) !== contentId) {
      issues.push({
        code: 'CONTENT_ID_AMBIGUOUS',
        entry: String(entry.id),
        field: 'contentId',
        value: contentId,
        reason: `Normalisasi "${contentId}" bertabrakan dengan "${byNormalized.get(normalized)}" (case/spasi berbeda, identitas sama).`,
        fix: 'Pilih satu bentuk kanonis lowercase kebab-case.',
      });
    } else if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, contentId);
    }

    if (!isValidContentId(contentId)) {
      issues.push({
        code: 'CONTENT_ID_FORMAT',
        entry: String(entry.id),
        field: 'contentId',
        value: contentId,
        reason: 'contentId harus lowercase kebab-case (contoh: aqi-cirebon).',
        fix: 'Ubah nilai menjadi huruf kecil/angka dengan pemisah tanda hubung.',
      });
      continue; /* hindari issue berantai dari nilai yang sama */
    }

    if (byContentId.has(contentId)) {
      issues.push({
        code: 'CONTENT_ID_DUPLICATE',
        entry: String(entry.id),
        field: 'contentId',
        value: contentId,
        reason: `contentId "${contentId}" sudah dipakai entri "${byContentId.get(contentId)}".`,
        fix: 'Gunakan contentId unik; perubahan contentId = migrasi relasi.',
      });
    } else {
      byContentId.set(contentId, String(entry.id));
    }
  }

  /* --- Pass 2: taxonomy membership & status (defense in depth) ---------- */
  const disciplineSet = new Set(DISCIPLINE_IDS);
  const technologySet = new Set(TECHNOLOGY_IDS);
  const statusSet = new Set(STATUS_IDS);

  for (const entry of list) {
    const data = entry && entry.data ? entry.data : {};
    const entryId = String(entry && entry.id ? entry.id : '(unknown)');

    if (data.status !== undefined && !statusSet.has(data.status)) {
      issues.push({
        code: 'STATUS_INVALID',
        entry: entryId,
        field: 'status',
        value: data.status,
        reason: `status harus salah satu dari: ${STATUS_IDS.join(', ')}.`,
        fix: 'Pakai nilai kanonis dari src/data/taxonomy.js (STATUS_OPTIONS).',
      });
    }

    for (const [field, known] of [['disciplines', disciplineSet], ['technologies', technologySet]]) {
      const values = Array.isArray(data[field]) ? data[field] : [];
      for (const value of values) {
        if (!known.has(value)) {
          issues.push({
            code: 'TAXONOMY_INVALID',
            entry: entryId,
            field,
            value,
            reason: `Nilai bukan anggota taxonomy kanonis (${field}).`,
            fix: `Ganti dengan id dari src/data/taxonomy.js; label dirender dari definisi kanonis.`,
          });
        }
      }
    }
  }

  /* --- Pass 3: relasi lintas-entri -------------------------------------- */
  for (const entry of list) {
    const data = entry && entry.data ? entry.data : {};
    const entryId = String(entry && entry.id ? entry.id : '(unknown)');
    const related = Array.isArray(data.relatedIds) ? data.relatedIds : [];

    const seen = new Set();
    for (const target of related) {
      if (seen.has(target)) {
        issues.push({
          code: 'RELATION_DUPLICATE',
          entry: entryId,
          field: 'relatedIds',
          value: target,
          reason: 'Target relasi muncul lebih dari sekali dalam satu array.',
          fix: 'Hapus duplikat; urutan array = urutan tampil kartu.',
        });
        continue;
      }
      seen.add(target);

      if (data.contentId === target) {
        issues.push({
          code: 'RELATION_SELF',
          entry: entryId,
          field: 'relatedIds',
          value: target,
          reason: 'Entri tidak boleh berrelasi ke dirinya sendiri.',
          fix: 'Hapus self-reference dari relatedIds.',
        });
        continue;
      }

      if (!byContentId.has(target)) {
        issues.push({
          code: 'RELATION_UNKNOWN_TARGET',
          entry: entryId,
          field: 'relatedIds',
          value: target,
          reason: `Tidak ada entri work dengan contentId "${target}".`,
          fix: 'Perbaiki atau hapus target; relasi menunjuk contentId, bukan title/URL.',
        });
        continue;
      }

      const targetEntry = list.find((candidate) => candidate && candidate.data && candidate.data.contentId === target);
      const targetStatus = targetEntry && targetEntry.data ? targetEntry.data.status : undefined;
      if (NON_ROUTEABLE_STATUSES.has(targetStatus)) {
        issues.push({
          code: 'RELATION_TARGET_NOT_ROUTEABLE',
          entry: entryId,
          field: 'relatedIds',
          value: target,
          reason: `Target "${target}" berstatus ${targetStatus} sehingga tidak pernah punya rute publik; kartu relasi akan menjadi dead link.`,
          fix: 'Relasikan hanya ke entri routeable (PUBLISHED / IN PROGRESS), atau kosongkan.',
        });
      }
    }
  }

  /* Deterministik: urutan hasil tidak bergantung urutan objek input. */
  issues.sort((a, b) => (a.entry + '|' + a.field + '|' + a.code).localeCompare(b.entry + '|' + b.field + '|' + b.code));

  return { ok: issues.length === 0, issues };
}

/**
 * Format issues menjadi pesan error actionable (satu blok per issue).
 * @param {IntegrityIssue[]} issues
 * @returns {string}
 */
export function formatIntegrityIssues(issues) {
  const list = Array.isArray(issues) ? issues : [];
  if (list.length === 0) return '';
  const blocks = list.map((issue) => [
    '[CONTENT INTEGRITY]',
    `Entry: ${issue.entry}`,
    `Field: ${issue.field}`,
    `Invalid value: ${JSON.stringify(issue.value) ?? 'undefined'}`,
    `Code: ${issue.code}`,
    `Reason: ${issue.reason}`,
    `Fix: ${issue.fix}`,
  ].join('\n'));
  return blocks.join('\n\n');
}

/**
 * Gate siap-pakai untuk build path: validasi + throw actionable saat invalid.
 * @param {IntegrityInputEntry[]} entries
 * @param {string} source nama pemanggil (untuk konteks error)
 */
export function assertWorkIntegrity(entries, source = 'build') {
  const result = validateWorkCollection(entries);
  if (!result.ok) {
    throw new Error(`Work collection tidak valid (detected via ${source}):\n\n${formatIntegrityIssues(result.issues)}`);
  }
  return result;
}

/* ======================================================================
 * V13.0-A: ADR COLLECTION INTEGRITY VALIDATOR
 * ==================================================================== */

/**
 * Memetakan relatedWorkIds pada suatu ADR menjadi objek referensi yang
 * memisahkan entri routeable (memiliki href publik) dan reference-only
 * (RESERVED/ARCHIVED -> href: null, tidak pernah menghasilkan anchor aktif).
 * @param {readonly string[]} relatedWorkIds
 * @param {IntegrityInputEntry[]} workEntries
 */
export function resolveAdrWorkReferences(relatedWorkIds, workEntries) {
  const ids = Array.isArray(relatedWorkIds) ? relatedWorkIds : [];
  const list = Array.isArray(workEntries) ? workEntries : [];
  const byContentId = new Map();
  for (const w of list) {
    if (w && w.data && typeof w.data.contentId === 'string') {
      byContentId.set(w.data.contentId, w);
    }
  }

  return ids
    .map((contentId) => {
      const target = byContentId.get(contentId);
      if (!target || !target.data) return null;
      const status = target.data.status;
      const routeable = !NON_ROUTEABLE_STATUSES.has(status);
      return {
        contentId,
        entryId: String(target.id),
        title: String(target.data.title || contentId),
        status: String(status || 'UNKNOWN'),
        routeable,
        href: routeable ? `/work/${target.id}` : null,
      };
    })
    .filter(Boolean);
}

/**
 * Validasi koleksi `adr` secara lintas-entri dan terhadap koleksi `work`.
 * Murni: tidak mengubah input, urutan issue deterministik.
 * @param {IntegrityInputEntry[]} adrEntries
 * @param {Object} [options]
 * @param {IntegrityInputEntry[]} [options.workEntries]
 * @param {readonly string[]} [options.allowedRoutes]
 * @param {Set<string>|readonly string[]} [options.existingSourcePaths]
 * @param {Map<string, string>|Record<string, string>} [options.sourceHashesByPath]
 * @param {boolean} [options.allowReferenceOnlyWork]
 * @returns {{ ok: boolean, issues: IntegrityIssue[] }}
 */
export function validateAdrCollection(adrEntries, options = {}) {
  const issues = [];
  const list = Array.isArray(adrEntries) ? adrEntries : [];
  const workList = Array.isArray(options.workEntries) ? options.workEntries : null;
  const allowedRouteSet = new Set(options.allowedRoutes || KNOWN_INTERNAL_ROUTES);
  const categorySet = new Set(ADR_CATEGORY_IDS);
  const recordTypeSet = new Set(ADR_RECORD_TYPES);
  const recordStatusSet = new Set(ADR_RECORD_STATUSES);

  const existingSourceSet = options.existingSourcePaths
    ? new Set(options.existingSourcePaths)
    : null;
  const sourceHashLookup = options.sourceHashesByPath || null;
  const allowRefOnlyWork = Boolean(options.allowReferenceOnlyWork);

  const workByContentId = new Map();
  if (workList) {
    for (const w of workList) {
      if (w && w.data && typeof w.data.contentId === 'string') {
        workByContentId.set(w.data.contentId, w);
      }
    }
  }

  const byAdrId = new Map();
  const byNormalizedAdrId = new Map();
  const bySequenceOrder = new Map();

  for (const entry of list) {
    const data = entry && entry.data ? entry.data : {};
    const entryId = String(entry && entry.id ? entry.id : '(unknown)');
    const adrId = data.adrId;

    /* 1. adrId */
    if (typeof adrId !== 'string' || adrId.length === 0) {
      issues.push({
        code: 'ADR_ID_MISSING',
        entry: entryId,
        field: 'adrId',
        value: adrId ?? null,
        reason: 'Setiap entri ADR wajib memiliki adrId stabil.',
        fix: 'Tambahkan adrId lowercase kebab-case yang unik.',
      });
    } else {
      const normalized = normalizeContentId(adrId);
      if (byNormalizedAdrId.has(normalized) && byNormalizedAdrId.get(normalized) !== adrId) {
        issues.push({
          code: 'ADR_ID_AMBIGUOUS',
          entry: entryId,
          field: 'adrId',
          value: adrId,
          reason: `Normalisasi "${adrId}" bertabrakan dengan "${byNormalizedAdrId.get(normalized)}".`,
          fix: 'Gunakan satu bentuk kanonis lowercase kebab-case.',
        });
      } else if (!byNormalizedAdrId.has(normalized)) {
        byNormalizedAdrId.set(normalized, adrId);
      }

      if (!isValidAdrId(adrId)) {
        issues.push({
          code: 'ADR_ID_FORMAT',
          entry: entryId,
          field: 'adrId',
          value: adrId,
          reason: 'adrId harus lowercase kebab-case.',
          fix: 'Gunakan huruf kecil dan angka yang dipisahkan tanda hubung.',
        });
      } else if (byAdrId.has(adrId)) {
        issues.push({
          code: 'ADR_ID_DUPLICATE',
          entry: entryId,
          field: 'adrId',
          value: adrId,
          reason: `adrId "${adrId}" sudah dipakai oleh entri "${byAdrId.get(adrId)}".`,
          fix: 'Berikan adrId unik untuk setiap dokumen.',
        });
      } else {
        byAdrId.set(adrId, entryId);
      }
    }

    /* 2. sequenceOrder */
    const seq = data.sequenceOrder;
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq <= 0) {
      issues.push({
        code: 'ADR_SEQUENCE_INVALID',
        entry: entryId,
        field: 'sequenceOrder',
        value: seq ?? null,
        reason: 'sequenceOrder wajib berupa bilangan bulat positif.',
        fix: 'Tetapkan sequenceOrder integer positif (>= 1).',
      });
    } else if (bySequenceOrder.has(seq)) {
      issues.push({
        code: 'ADR_SEQUENCE_DUPLICATE',
        entry: entryId,
        field: 'sequenceOrder',
        value: seq,
        reason: `sequenceOrder ${seq} sudah dipakai oleh entri "${bySequenceOrder.get(seq)}".`,
        fix: 'Pastikan setiap record memiliki sequenceOrder unik.',
      });
    } else {
      bySequenceOrder.set(seq, entryId);
    }

    /* 3. versionTag */
    const versionTag = data.versionTag;
    if (typeof versionTag !== 'string' || versionTag.trim().length === 0) {
      issues.push({
        code: 'ADR_VERSION_MISSING',
        entry: entryId,
        field: 'versionTag',
        value: versionTag ?? null,
        reason: 'versionTag tidak boleh kosong.',
        fix: 'Isi versionTag sesuai versi yang tercantum di dokumen sumber (contoh: V11.0).',
      });
    } else if (typeof seq === 'number' && versionTag.trim() === String(seq)) {
      issues.push({
        code: 'ADR_VERSION_FROM_SEQUENCE',
        entry: entryId,
        field: 'versionTag',
        value: versionTag,
        reason: 'versionTag tidak boleh diturunkan langsung dari nomor sequenceOrder.',
        fix: 'Gunakan label versi faktual dari dokumen sumber.',
      });
    }

    /* 4. Enums */
    if (!categorySet.has(data.category)) {
      issues.push({
        code: 'ADR_CATEGORY_INVALID',
        entry: entryId,
        field: 'category',
        value: data.category ?? null,
        reason: 'Kategori ADR tidak termasuk dalam ADR_CATEGORIES kanonis.',
        fix: 'Pilih kategori dari src/lib/adr-taxonomy.ts.',
      });
    }
    if (!recordTypeSet.has(data.recordType)) {
      issues.push({
        code: 'ADR_RECORD_TYPE_INVALID',
        entry: entryId,
        field: 'recordType',
        value: data.recordType ?? null,
        reason: 'recordType tidak termasuk dalam ADR_RECORD_TYPES kanonis.',
        fix: 'Pilih recordType dari src/lib/adr-taxonomy.ts.',
      });
    }
    if (!recordStatusSet.has(data.recordStatus)) {
      issues.push({
        code: 'ADR_RECORD_STATUS_INVALID',
        entry: entryId,
        field: 'recordStatus',
        value: data.recordStatus ?? null,
        reason: 'recordStatus tidak termasuk dalam ADR_RECORD_STATUSES kanonis.',
        fix: 'Pilih recordStatus dari src/lib/adr-taxonomy.ts.',
      });
    }

    /* 5. Provenance */
    const prov = data.provenance || {};
    const sourcePath = prov.sourcePath;
    if (
      typeof sourcePath !== 'string' ||
      sourcePath.trim() === '' ||
      sourcePath.startsWith('/') ||
      sourcePath.startsWith('\\') ||
      sourcePath.includes('..')
    ) {
      issues.push({
        code: 'ADR_SOURCE_PATH_INVALID',
        entry: entryId,
        field: 'provenance.sourcePath',
        value: sourcePath ?? null,
        reason: 'sourcePath harus path relatif yang aman di dalam root proyek dan bebas traversal.',
        fix: 'Gunakan path relatif dari root proyek (contoh: V11.0_IMPLEMENTATION_REPORT.md).',
      });
    } else if (existingSourceSet && !existingSourceSet.has(sourcePath)) {
      issues.push({
        code: 'ADR_SOURCE_NOT_FOUND',
        entry: entryId,
        field: 'provenance.sourcePath',
        value: sourcePath,
        reason: `File sumber "${sourcePath}" tidak ditemukan di workspace.`,
        fix: 'Pastikan file sumber historis tersedia di path tersebut.',
      });
    }

    if (typeof prov.sourceSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(prov.sourceSha256)) {
      issues.push({
        code: 'ADR_HASH_INVALID',
        entry: entryId,
        field: 'provenance.sourceSha256',
        value: prov.sourceSha256 ?? null,
        reason: 'sourceSha256 harus tepat 64 karakter hex lowercase.',
        fix: 'Hitung SHA-256 dari byte mentah file sumber.',
      });
    } else if (sourceHashLookup && typeof sourcePath === 'string') {
      const actualHash =
        sourceHashLookup instanceof Map
          ? sourceHashLookup.get(sourcePath)
          : sourceHashLookup[sourcePath];
      if (actualHash && actualHash !== prov.sourceSha256) {
        issues.push({
          code: 'ADR_HASH_MISMATCH',
          entry: entryId,
          field: 'provenance.sourceSha256',
          value: prov.sourceSha256,
          reason: `sourceSha256 tidak cocok dengan SHA-256 aktual file "${sourcePath}" (${actualHash}).`,
          fix: 'Jalankan ulang sync-adr-collection.mjs --write atau periksa integritas file sumber.',
        });
      }
    }

    for (const numField of ['sourceBytes', 'sourceWordCount', 'sourceLineCount', 'normalizationCount']) {
      const val = prov[numField];
      if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
        issues.push({
          code: 'ADR_PROVENANCE_METRIC_INVALID',
          entry: entryId,
          field: `provenance.${numField}`,
          value: val ?? null,
          reason: `${numField} harus bilangan bulat non-negatif.`,
          fix: 'Hitung metrik provenance secara deterministik dari sumber.',
        });
      }
    }

    /* 6. targetRoutes */
    const routes = Array.isArray(data.targetRoutes) ? data.targetRoutes : [];
    const seenRoutes = new Set();
    for (const route of routes) {
      if (seenRoutes.has(route)) {
        issues.push({
          code: 'ADR_ROUTE_DUPLICATE',
          entry: entryId,
          field: 'targetRoutes',
          value: route,
          reason: `Route "${route}" duplikat di dalam targetRoutes.`,
          fix: 'Hapus duplikat route pada targetRoutes.',
        });
        continue;
      }
      seenRoutes.add(route);

      if (typeof route !== 'string' || !allowedRouteSet.has(route)) {
        issues.push({
          code: 'ADR_ROUTE_INVALID',
          entry: entryId,
          field: 'targetRoutes',
          value: route,
          reason: `Route "${route}" tidak terdaftar dalam allowlist rute aplikasi.`,
          fix: 'Gunakan hanya rute internal yang benar-benar tersedia di KNOWN_INTERNAL_ROUTES.',
        });
      }
    }

    /* 7. relatedWorkIds */
    const relatedWork = Array.isArray(data.relatedWorkIds) ? data.relatedWorkIds : [];
    const seenWork = new Set();
    for (const workId of relatedWork) {
      if (seenWork.has(workId)) {
        issues.push({
          code: 'ADR_WORK_RELATION_DUPLICATE',
          entry: entryId,
          field: 'relatedWorkIds',
          value: workId,
          reason: `Target work "${workId}" duplikat di dalam relatedWorkIds.`,
          fix: 'Hapus duplikat workId dari relatedWorkIds.',
        });
        continue;
      }
      seenWork.add(workId);

      if (typeof workId !== 'string' || !isValidContentId(workId)) {
        issues.push({
          code: 'ADR_WORK_RELATION_FORMAT',
          entry: entryId,
          field: 'relatedWorkIds',
          value: workId,
          reason: 'relatedWorkIds harus berformat lowercase kebab-case.',
          fix: 'Gunakan contentId yang valid dari koleksi work.',
        });
        continue;
      }

      if (workList) {
        if (!workByContentId.has(workId)) {
          issues.push({
            code: 'ADR_WORK_UNKNOWN_TARGET',
            entry: entryId,
            field: 'relatedWorkIds',
            value: workId,
            reason: `Tidak ada entri work dengan contentId "${workId}".`,
            fix: 'Arahkan relatedWorkIds ke contentId yang ada di src/content/work/.',
          });
          continue;
        }
        const targetEntry = workByContentId.get(workId);
        const targetStatus = targetEntry && targetEntry.data ? targetEntry.data.status : undefined;
        if (!allowRefOnlyWork && NON_ROUTEABLE_STATUSES.has(targetStatus)) {
          issues.push({
            code: 'ADR_WORK_TARGET_NOT_ROUTEABLE',
            entry: entryId,
            field: 'relatedWorkIds',
            value: workId,
            reason: `Target work "${workId}" berstatus ${targetStatus} dan tidak memiliki rute publik.`,
            fix: 'Hapus dari relatedWorkIds publik atau aktifkan mode reference-only tanpa tautan.',
          });
        }
      }
    }

    /* 8. keyMetrics */
    const metrics = Array.isArray(data.keyMetrics) ? data.keyMetrics : [];
    for (const metric of metrics) {
      if (
        !metric ||
        typeof metric.label !== 'string' ||
        metric.label.trim() === '' ||
        typeof metric.value !== 'string' ||
        metric.value.trim() === '' ||
        (metric.unit !== undefined && (typeof metric.unit !== 'string' || metric.unit.trim() === ''))
      ) {
        issues.push({
          code: 'ADR_METRIC_INVALID',
          entry: entryId,
          field: 'keyMetrics',
          value: metric ?? null,
          reason: 'Setiap item keyMetrics wajib memiliki label dan value tidak kosong (serta unit valid bila diisi).',
          fix: 'Perbaiki struktur keyMetrics pada frontmatter ADR.',
        });
      }
    }
  }

  issues.sort((a, b) =>
    (a.entry + '|' + a.field + '|' + a.code).localeCompare(b.entry + '|' + b.field + '|' + b.code)
  );

  return { ok: issues.length === 0, issues };
}

/**
 * Gate integritas siap-pakai untuk build path ADR.
 * @param {IntegrityInputEntry[]} adrEntries
 * @param {IntegrityInputEntry[]} [workEntries]
 * @param {string} [source]
 * @param {Object} [options]
 */
export function assertAdrIntegrity(adrEntries, workEntries = [], source = 'build', options = {}) {
  const result = validateAdrCollection(adrEntries, { ...options, workEntries });
  if (!result.ok) {
    throw new Error(
      `ADR collection tidak valid (detected via ${source}):\n\n${formatIntegrityIssues(result.issues)}`
    );
  }
  return result;
}

/* ======================================================================
 * V13.0-C: CODEX & CROSS-COLLECTION INTEGRITY VALIDATOR (ADDITIVE)
 * ==================================================================== */

/**
 * Memeriksa apakah path sumber relatif aman (bukan absolute path, tidak mengandung '..').
 * @param {unknown} relPath
 * @returns {relPath is string}
 */
export function isSafeRelativeRepoPath(relPath) {
  if (typeof relPath !== 'string' || relPath.trim() === '') return false;
  if (relPath.startsWith('/') || relPath.startsWith('\\') || /^[a-zA-Z]:/.test(relPath)) {
    return false;
  }
  const normalized = relPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (segments.some((seg) => seg === '..' || seg === '')) {
    return false;
  }
  return true;
}

/**
 * Validator deterministik dan murni untuk koleksi `codex` (V13.0-C).
 * Tidak memutasi input.
 *
 * @param {IntegrityInputEntry[]} codexEntries
 * @param {Object} [options]
 * @param {IntegrityInputEntry[]} [options.workEntries]
 * @param {IntegrityInputEntry[]} [options.adrEntries]
 * @param {Set<string>|string[]} [options.existingSourcePaths]
 * @param {boolean} [options.allowReferenceOnlyWork] default true untuk Codex (301 merujuk saham-indonesia sbg reference-only)
 * @returns {{ ok: boolean, issues: IntegrityIssue[] }}
 */
export function validateCodexCollection(codexEntries, options = {}) {
  /** @type {IntegrityIssue[]} */
  const issues = [];

  if (!Array.isArray(codexEntries)) {
    issues.push({
      code: 'CODEX_COLLECTION_NOT_ARRAY',
      entry: '(codex-collection)',
      field: 'codexEntries',
      value: typeof codexEntries,
      reason: 'validateCodexCollection menerima input bukan array.',
      fix: 'Kirim array entri hasil getCollection("codex").',
    });
    return { ok: false, issues };
  }

  const workList = Array.isArray(options.workEntries) ? options.workEntries : null;
  const adrList = Array.isArray(options.adrEntries) ? options.adrEntries : null;
  const existingSourceSet = options.existingSourcePaths
    ? new Set(options.existingSourcePaths)
    : null;
  const allowRefOnlyWork = options.allowReferenceOnlyWork !== false;

  /** @type {Map<string, IntegrityInputEntry>} */
  const workByContentId = new Map();
  if (workList) {
    for (const w of workList) {
      if (w && w.data && typeof w.data.contentId === 'string') {
        workByContentId.set(w.data.contentId, w);
      }
    }
  }

  /** @type {Set<string>} */
  const knownAdrIds = new Set();
  if (adrList) {
    for (const a of adrList) {
      if (a && a.data && typeof a.data.adrId === 'string') {
        knownAdrIds.add(a.data.adrId);
      }
    }
  }

  const sorted = [...codexEntries].sort((a, b) =>
    String((a && a.id) || '').localeCompare(String((b && b.id) || ''))
  );

  /** @type {Map<string, string>} codexId -> entry.id */
  const byCodexId = new Map();
  /** @type {Map<string, string>} decimalCode -> entry.id */
  const byDecimalCode = new Map();

  for (const entry of sorted) {
    const entryId = (entry && typeof entry.id === 'string' && entry.id) || '(unknown-codex)';
    const data = (entry && entry.data) || {};

    /* 1. codexId unik dan format valid */
    const codexId = data.codexId;
    if (typeof codexId !== 'string' || codexId.trim() === '') {
      issues.push({
        code: 'CODEX_ID_MISSING',
        entry: entryId,
        field: 'codexId',
        value: codexId ?? null,
        reason: 'Field wajib `codexId` kosong atau tidak bertipe string.',
        fix: 'Tambahkan `codexId` unik lowercase kebab-case.',
      });
    } else if (!isValidContentId(codexId)) {
      issues.push({
        code: 'CODEX_ID_FORMAT',
        entry: entryId,
        field: 'codexId',
        value: codexId,
        reason: 'Format `codexId` tidak valid.',
        fix: 'Gunakan lowercase kebab-case ([a-z0-9]+(-[a-z0-9]+)*).',
      });
    } else if (byCodexId.has(codexId)) {
      issues.push({
        code: 'CODEX_ID_DUPLICATE',
        entry: entryId,
        field: 'codexId',
        value: codexId,
        reason: `codexId "${codexId}" sudah dipakai oleh entri "${byCodexId.get(codexId)}".`,
        fix: 'Gunakan codexId unik untuk setiap catatan Codex.',
      });
    } else {
      byCodexId.set(codexId, entryId);
    }

    /* 2. domain & maturity valid */
    if (!CODEX_DOMAIN_IDS.has(data.domain)) {
      issues.push({
        code: 'CODEX_DOMAIN_INVALID',
        entry: entryId,
        field: 'domain',
        value: data.domain ?? null,
        reason: 'Domain tidak termasuk dalam CODEX_DOMAINS kanonis (100-600).',
        fix: 'Pilih domain dari src/lib/codex-taxonomy.ts.',
      });
    }

    if (!CODEX_MATURITY_IDS.has(data.maturity)) {
      issues.push({
        code: 'CODEX_MATURITY_INVALID',
        entry: entryId,
        field: 'maturity',
        value: data.maturity ?? null,
        reason: 'Maturity harus salah satu dari SEEDLING, BUDDING, atau EVERGREEN.',
        fix: 'Gunakan enum maturity kanonis.',
      });
    }

    /* 3. decimalCode unik dan sesuai domain */
    const decimalCode = data.decimalCode;
    if (typeof decimalCode !== 'string' || !isValidDecimalCodeForDomain(decimalCode, data.domain)) {
      issues.push({
        code: 'CODEX_DECIMAL_CODE_INVALID',
        entry: entryId,
        field: 'decimalCode',
        value: decimalCode ?? null,
        reason: `decimalCode "${decimalCode}" tidak valid atau tidak sesuai dengan domain "${data.domain}".`,
        fix: 'Pastikan digit ratusan decimalCode cocok dengan kode domain (mis. 101.1 untuk 100-software-and-systems).',
      });
    } else if (byDecimalCode.has(decimalCode)) {
      issues.push({
        code: 'CODEX_DECIMAL_CODE_DUPLICATE',
        entry: entryId,
        field: 'decimalCode',
        value: decimalCode,
        reason: `decimalCode "${decimalCode}" sudah dipakai oleh entri "${byDecimalCode.get(decimalCode)}".`,
        fix: 'Berikan decimalCode unik untuk setiap catatan.',
      });
    } else {
      byDecimalCode.set(decimalCode, entryId);
    }

    /* 4. sourceFiles aman & tersedia */
    const sourceFiles = Array.isArray(data.sourceFiles) ? data.sourceFiles : [];
    if (sourceFiles.length === 0) {
      issues.push({
        code: 'CODEX_SOURCE_FILES_EMPTY',
        entry: entryId,
        field: 'sourceFiles',
        value: sourceFiles,
        reason: 'Catatan Codex wajib mencantumkan minimal satu sourceFiles di repositori.',
        fix: 'Tambahkan path file sumber aktual ke sourceFiles.',
      });
    }
    const seenSources = new Set();
    for (const srcPath of sourceFiles) {
      if (seenSources.has(srcPath)) {
        issues.push({
          code: 'CODEX_SOURCE_FILE_DUPLICATE',
          entry: entryId,
          field: 'sourceFiles',
          value: srcPath,
          reason: `sourceFiles memuat duplikat path "${srcPath}".`,
          fix: 'Hapus duplikat path pada sourceFiles.',
        });
        continue;
      }
      seenSources.add(srcPath);

      if (!isSafeRelativeRepoPath(srcPath)) {
        issues.push({
          code: 'CODEX_SOURCE_FILE_UNSAFE',
          entry: entryId,
          field: 'sourceFiles',
          value: srcPath,
          reason: `Path "${srcPath}" tidak aman (mengandung traversal '..' atau path absolut).`,
          fix: 'Gunakan path relatif di dalam root repositori.',
        });
      } else if (existingSourceSet && !existingSourceSet.has(srcPath)) {
        issues.push({
          code: 'CODEX_SOURCE_FILE_NOT_FOUND',
          entry: entryId,
          field: 'sourceFiles',
          value: srcPath,
          reason: `File sumber "${srcPath}" tidak ditemukan di workspace.`,
          fix: 'Pastikan seluruh sourceFiles merujuk pada file yang benar-benar ada.',
        });
      }
    }

    /* 5. sourceEvidence valid */
    const evidenceList = Array.isArray(data.sourceEvidence) ? data.sourceEvidence : [];
    if (evidenceList.length === 0) {
      issues.push({
        code: 'CODEX_EVIDENCE_EMPTY',
        entry: entryId,
        field: 'sourceEvidence',
        value: evidenceList,
        reason: 'Catatan Codex wajib memiliki minimal satu butir sourceEvidence.',
        fix: 'Tambahkan klaim bukti beserta file dan status ke sourceEvidence.',
      });
    }
    for (const ev of evidenceList) {
      if (
        !ev ||
        typeof ev.claim !== 'string' ||
        ev.claim.trim() === '' ||
        !CODEX_EVIDENCE_STATUS_IDS.has(ev.status) ||
        !isSafeRelativeRepoPath(ev.file) ||
        typeof ev.reference !== 'string' ||
        ev.reference.trim() === ''
      ) {
        issues.push({
          code: 'CODEX_EVIDENCE_INVALID',
          entry: entryId,
          field: 'sourceEvidence',
          value: ev ?? null,
          reason: 'Butir sourceEvidence tidak lengkap atau status/file tidak valid.',
          fix: 'Pastikan setiap sourceEvidence memiliki claim, status kanonis, file relatif aman, dan reference.',
        });
      } else if (existingSourceSet && !existingSourceSet.has(ev.file)) {
        issues.push({
          code: 'CODEX_EVIDENCE_FILE_NOT_FOUND',
          entry: entryId,
          field: 'sourceEvidence',
          value: ev.file,
          reason: `File bukti "${ev.file}" pada sourceEvidence tidak ditemukan di workspace.`,
          fix: 'Gunakan path file yang benar-benar ada di repositori.',
        });
      }
    }
  }

  /* Pass 2: Validasi relasi lintas-entri (relatedCodexIds, relatedWorkIds, relatedAdrIds) */
  for (const entry of sorted) {
    const entryId = (entry && typeof entry.id === 'string' && entry.id) || '(unknown-codex)';
    const data = (entry && entry.data) || {};
    const ownId = typeof data.codexId === 'string' ? data.codexId : null;

    /* relatedCodexIds */
    const relCodex = Array.isArray(data.relatedCodexIds) ? data.relatedCodexIds : [];
    const seenCodex = new Set();
    for (const targetCodexId of relCodex) {
      if (seenCodex.has(targetCodexId)) {
        issues.push({
          code: 'CODEX_RELATION_DUPLICATE',
          entry: entryId,
          field: 'relatedCodexIds',
          value: targetCodexId,
          reason: `Target "${targetCodexId}" disebut lebih dari sekali pada relatedCodexIds.`,
          fix: 'Hapus duplikat pada relatedCodexIds.',
        });
        continue;
      }
      seenCodex.add(targetCodexId);

      if (ownId && targetCodexId === ownId) {
        issues.push({
          code: 'CODEX_RELATION_SELF',
          entry: entryId,
          field: 'relatedCodexIds',
          value: targetCodexId,
          reason: `Catatan "${ownId}" tidak boleh merujuk dirinya sendiri.`,
          fix: 'Hapus codexId sendiri dari relatedCodexIds.',
        });
        continue;
      }

      if (!byCodexId.has(targetCodexId)) {
        issues.push({
          code: 'CODEX_RELATION_UNKNOWN_TARGET',
          entry: entryId,
          field: 'relatedCodexIds',
          value: targetCodexId,
          reason: `Tidak ada catatan Codex dengan codexId "${targetCodexId}".`,
          fix: 'Pastikan target relatedCodexIds terdaftar di koleksi codex.',
        });
      }
    }

    /* relatedWorkIds */
    const relWork = Array.isArray(data.relatedWorkIds) ? data.relatedWorkIds : [];
    const seenWork = new Set();
    for (const workId of relWork) {
      if (seenWork.has(workId)) {
        issues.push({
          code: 'CODEX_WORK_RELATION_DUPLICATE',
          entry: entryId,
          field: 'relatedWorkIds',
          value: workId,
          reason: `Target work "${workId}" duplikat pada relatedWorkIds.`,
          fix: 'Hapus duplikat workId dari relatedWorkIds.',
        });
        continue;
      }
      seenWork.add(workId);

      if (workList) {
        if (!workByContentId.has(workId)) {
          issues.push({
            code: 'CODEX_WORK_UNKNOWN_TARGET',
            entry: entryId,
            field: 'relatedWorkIds',
            value: workId,
            reason: `Tidak ada entri work dengan contentId "${workId}".`,
            fix: 'Gunakan contentId yang benar-benar ada di src/content/work/.',
          });
          continue;
        }
        const targetWork = workByContentId.get(workId);
        const status = targetWork && targetWork.data ? targetWork.data.status : undefined;
        if (!allowRefOnlyWork && NON_ROUTEABLE_STATUSES.has(status)) {
          issues.push({
            code: 'CODEX_WORK_TARGET_NOT_ROUTEABLE',
            entry: entryId,
            field: 'relatedWorkIds',
            value: workId,
            reason: `Target work "${workId}" berstatus ${status} (non-routeable).`,
            fix: 'Tampilkan sebagai reference-only tanpa tautan publik.',
          });
        }
      }
    }

    /* relatedAdrIds */
    const relAdr = Array.isArray(data.relatedAdrIds) ? data.relatedAdrIds : [];
    const seenAdr = new Set();
    for (const adrId of relAdr) {
      if (seenAdr.has(adrId)) {
        issues.push({
          code: 'CODEX_ADR_RELATION_DUPLICATE',
          entry: entryId,
          field: 'relatedAdrIds',
          value: adrId,
          reason: `Target ADR "${adrId}" duplikat pada relatedAdrIds.`,
          fix: 'Hapus duplikat adrId dari relatedAdrIds.',
        });
        continue;
      }
      seenAdr.add(adrId);

      if (adrList && !knownAdrIds.has(adrId)) {
        issues.push({
          code: 'CODEX_ADR_UNKNOWN_TARGET',
          entry: entryId,
          field: 'relatedAdrIds',
          value: adrId,
          reason: `Tidak ada record ADR dengan adrId "${adrId}".`,
          fix: 'Gunakan adrId yang benar-benar ada di koleksi adr.',
        });
      }
    }
  }

  issues.sort((a, b) =>
    (a.entry + '|' + a.field + '|' + a.code).localeCompare(b.entry + '|' + b.field + '|' + b.code)
  );

  return { ok: issues.length === 0, issues };
}

/**
 * Orchestrator validasi lintas-koleksi V13.0 (work + adr + codex).
 * @param {Object} params
 * @param {IntegrityInputEntry[]} [params.workEntries]
 * @param {IntegrityInputEntry[]} [params.adrEntries]
 * @param {IntegrityInputEntry[]} [params.codexEntries]
 * @param {Set<string>|string[]|null} [params.existingSourcePaths]
 * @param {boolean} [params.allowReferenceOnlyWork]
 */
export function validateCrossCollectionIntegrity({
  workEntries = [],
  adrEntries = [],
  codexEntries = [],
  existingSourcePaths = null,
  allowReferenceOnlyWork = true,
} = {}) {
  const workResult = validateWorkCollection(workEntries);
  const adrResult = validateAdrCollection(adrEntries, {
    workEntries,
    existingSourcePaths: existingSourcePaths || undefined,
    allowReferenceOnlyWork: false,
  });
  const codexResult = validateCodexCollection(codexEntries, {
    workEntries,
    adrEntries,
    existingSourcePaths: existingSourcePaths || undefined,
    allowReferenceOnlyWork,
  });

  const allIssues = [...workResult.issues, ...adrResult.issues, ...codexResult.issues].sort(
    (a, b) =>
      (a.entry + '|' + a.field + '|' + a.code).localeCompare(b.entry + '|' + b.field + '|' + b.code)
  );

  return {
    ok: allIssues.length === 0,
    issues: allIssues,
    workResult,
    adrResult,
    codexResult,
  };
}

/**
 * Gate integritas siap-pakai untuk build path Codex & lintas-koleksi V13.0.
 */
export function assertV13ContentIntegrity({
  workEntries = [],
  adrEntries = [],
  codexEntries = [],
  existingSourcePaths = null,
  source = 'build',
} = {}) {
  const result = validateCrossCollectionIntegrity({
    workEntries,
    adrEntries,
    codexEntries,
    existingSourcePaths,
    allowReferenceOnlyWork: true,
  });
  if (!result.ok) {
    throw new Error(
      `V13 cross-collection content integrity gagal (detected via ${source}):\n\n${formatIntegrityIssues(result.issues)}`
    );
  }
  return result;
}
