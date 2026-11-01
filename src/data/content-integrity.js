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
