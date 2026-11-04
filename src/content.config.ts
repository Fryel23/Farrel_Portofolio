import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  DISCIPLINE_IDS,
  TECHNOLOGY_IDS,
  STATUS_IDS,
  isValidContentId,
} from './data/taxonomy.js';
import {
  ADR_CATEGORY_IDS,
  ADR_RECORD_TYPES,
  ADR_RECORD_STATUSES,
  KNOWN_INTERNAL_ROUTES,
  isValidAdrId,
} from './lib/adr-taxonomy.ts';
import {
  CODEX_DOMAINS,
  CODEX_MATURITY_LEVELS,
  CODEX_EVIDENCE_STATUSES,
  CODEX_MATHML_KINDS,
  isValidDecimalCodeForDomain,
} from './lib/codex-taxonomy.ts';

/*
 * Content Collection "work" (Fase 3, PROMPT_EKSEKUSI_V7.0).
 * Catatan migrasi: Astro 7 memakai Content Layer API (glob loader +
 * src/content.config.ts) pengganti type: 'content' pada Astro lama.
 * Skema field identik dengan spesifikasi prompt.
 * V10.0 FASE 1: field opsional `narrative` (3 scene scrollytelling:
 * Masalah -> Proses -> Temuan) untuk halaman case study. Maksimal 3
 * scene; `image` opsional (tanpa image -> placeholder arsip dirender);
 * `label` default 'SCENE' agar markup tetap bermakna tanpa konfigurasi.
 *
 * V12.2 - Content contracts (structured content, taxonomy, relations):
 *  - contentId: identifier SEMANTIK STABIL untuk relasi antarkonten
 *    (WAJIB, lowercase kebab-case). BUKAN pengganti Astro entry id:
 *    entry.id (nama file) tetap satu-satunya dasar URL /work/[slug].
 *  - status: enum kanonis dari src/data/taxonomy.js (STATUS_OPTIONS).
 *    Nilai existing dipertahankan: 'IN PROGRESS', 'RESERVED'.
 *  - context/objectives/methodology/findings/limitations: field editorial
 *    OPSIONAL berbasis bukti (requiredness tidak dipaksakan universal —
 *    slot RESERVED punya karakter konten berbeda dari case study).
 *  - disciplines/technologies: id kanonis dari taxonomy (bukan free-text);
 *    default [] bermakna "tidak ada yang diklaim" — bukan penutup migrasi.
 *  - relatedIds: daftar contentId target relasi; default [] bermakna
 *    "tidak ada proyek terkait" (seluruh entri existing sudah direview).
 *    Validasi lintas-entri (target ada, tidak self, tidak duplikat,
 *    kebijakan visibilitas) ada di src/data/content-integrity.js yang
 *    dijalankan pada production build path (getStaticPaths + /work index).
 *  - `stack` TETAP ADA sebagai legacy display data (kartu V6.7 & meta
 *    halaman) dan tidak diubah; `technologies` adalah lapisan semantik
 *    kanonis berbasis bukti implementasi. Keduanya tidak saling menimpa.
 */
const workCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z
    .object({
      title: z.string(),
      category: z.string(),
      tag: z.string(),
      status: z.enum(STATUS_IDS),
      description: z.string(),
      stack: z.array(z.string()),
      image: z.string(),
      link: z.string().url().optional(),
      linkLabel: z.string().optional(),
      kicker: z.string().optional(),
      // V12.2: identifier semantik stabil (relasi antarkonten)
      contentId: z
        .string()
        .refine(isValidContentId, {
          message: 'contentId harus lowercase kebab-case (contoh: aqi-cirebon).',
        }),
      // V12.2: field editorial opsional (hanya diisi bila didukung bukti)
      context: z.string().min(1).optional(),
      objectives: z.array(z.string().min(1)).optional(),
      methodology: z.array(z.string().min(1)).optional(),
      findings: z.array(z.string().min(1)).optional(),
      limitations: z.array(z.string().min(1)).optional(),
      // V12.2: taxonomy kanonis (id, bukan free-text; label dari taxonomy)
      disciplines: z.array(z.enum(DISCIPLINE_IDS)).default([]),
      technologies: z.array(z.enum(TECHNOLOGY_IDS)).default([]),
      // V12.2: relasi antarkonten (target = contentId entri lain)
      relatedIds: z.array(z.string().refine(isValidContentId, { message: 'Target relasi harus contentId lowercase kebab-case.' })).default([]),
      // V10.0: 3 Scene Naratif (Masalah, Proses, Temuan)
      // V10.2 C: `alt` opsional untuk gambar naratif. Tanpa alt -> fallback
      // ke title (perilaku lama). alt="" eksplisit = gambar dekoratif.
      narrative: z
        .array(
          z.object({
            title: z.string(),
            text: z.string(),
            image: z.string().optional(),
            alt: z.string().optional(), // TAMBAH: alt deskriptif opsional
            label: z.string().default('SCENE'),
          })
        )
        .max(3)
        .optional(),
    })
    /* Aturan PER-ENTRI yang butuh dua field sekaligus (lintas-entri ada di
       content-integrity.js, bukan di sini). */
    .superRefine((data, ctx) => {
      if (!Array.isArray(data.relatedIds)) return;
      const seen = new Set();
      data.relatedIds.forEach((target, index) => {
        if (seen.has(target)) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedIds', index],
            message: `Target relasi duplikat di dalam array: "${target}".`,
          });
        }
        seen.add(target);
        if (data.contentId === target) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedIds', index],
            message: 'Entri tidak boleh berrelasi ke dirinya sendiri (self-reference).',
          });
        }
      });
    }),
});

const adrCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/adr' }),
  schema: z
    .object({
      adrId: z.string().refine(isValidAdrId, {
        message: 'adrId harus lowercase kebab-case (contoh: v11-0-implementation-report).',
      }),
      versionTag: z.string().min(1),
      sequenceOrder: z.number().int().positive(),
      title: z.string().min(1),
      summary: z.string().min(1),
      category: z.enum(ADR_CATEGORY_IDS),
      recordType: z.enum(ADR_RECORD_TYPES),
      recordStatus: z.enum(ADR_RECORD_STATUSES),
      publishedAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'publishedAt harus berformat YYYY-MM-DD.')
        .optional(),
      targetRoutes: z
        .array(z.enum(KNOWN_INTERNAL_ROUTES))
        .default([]),
      relatedWorkIds: z
        .array(
          z.string().refine(isValidContentId, {
            message: 'relatedWorkIds harus contentId lowercase kebab-case.',
          })
        )
        .default([]),
      keyMetrics: z
        .array(
          z.object({
            label: z.string().min(1),
            value: z.string().min(1),
            unit: z.string().min(1).optional(),
            evidenceSection: z.string().min(1).optional(),
          })
        )
        .default([]),
      provenance: z.object({
        sourcePath: z.string().min(1),
        sourceFilename: z.string().min(1),
        sourceSha256: z.string().regex(/^[0-9a-f]{64}$/, 'sourceSha256 harus 64 hex lowercase.'),
        sourceBytes: z.number().int().nonnegative(),
        sourceWordCount: z.number().int().nonnegative(),
        sourceLineCount: z.number().int().nonnegative(),
        normalizedContentSha256: z
          .string()
          .regex(/^[0-9a-f]{64}$/, 'normalizedContentSha256 harus 64 hex lowercase.')
          .optional(),
        normalizationCount: z.number().int().nonnegative(),
      }),
    })
    .superRefine((data, ctx) => {
      const seenRoutes = new Set<string>();
      data.targetRoutes.forEach((route, index) => {
        if (seenRoutes.has(route)) {
          ctx.addIssue({
            code: 'custom',
            path: ['targetRoutes', index],
            message: `targetRoutes duplikat: "${route}".`,
          });
        }
        seenRoutes.add(route);
      });

      const seenWork = new Set<string>();
      data.relatedWorkIds.forEach((workId, index) => {
        if (seenWork.has(workId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedWorkIds', index],
            message: `relatedWorkIds duplikat: "${workId}".`,
          });
        }
        seenWork.add(workId);
      });
    }),
});

const CODEX_DOMAIN_IDS_TUPLE = CODEX_DOMAINS.map((d) => d.id) as [string, ...string[]];
const CODEX_MATURITY_TUPLE = [...CODEX_MATURITY_LEVELS] as [string, ...string[]];
const CODEX_EVIDENCE_STATUS_TUPLE = [...CODEX_EVIDENCE_STATUSES] as [string, ...string[]];
const CODEX_MATHML_KIND_TUPLE = [...CODEX_MATHML_KINDS] as [string, ...string[]];

const codexCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/codex' }),
  schema: z
    .object({
      codexId: z
        .string()
        .refine(isValidContentId, {
          message: 'codexId harus lowercase kebab-case ([a-z0-9]+(-[a-z0-9]+)*).',
        }),
      decimalCode: z
        .string()
        .regex(/^[1-6]\d{2}\.\d+$/, 'decimalCode harus berformat [1-6]XX.Y (mis. 101.1, 501.1).'),
      title: z.string().min(1),
      domain: z.enum(CODEX_DOMAIN_IDS_TUPLE),
      maturity: z.enum(CODEX_MATURITY_TUPLE),
      summary: z.string().min(1),
      sourceFiles: z.array(z.string().min(1)).min(1),
      sourceEvidence: z
        .array(
          z.object({
            claim: z.string().min(1),
            status: z.enum(CODEX_EVIDENCE_STATUS_TUPLE),
            file: z.string().min(1),
            reference: z.string().min(1),
            verifiedBy: z.string().min(1).optional(),
          })
        )
        .min(1),
      relatedCodexIds: z.array(z.string().refine(isValidContentId)).default([]),
      relatedWorkIds: z.array(z.string().refine(isValidContentId)).default([]),
      relatedAdrIds: z.array(z.string().refine(isValidAdrId)).default([]),
      formulas: z
        .array(
          z.object({
            id: z.string().refine(isValidContentId),
            label: z.string().min(1),
            sourceNotation: z.string().min(1),
            plainExplanation: z.string().min(1),
            mathmlKind: z.enum(CODEX_MATHML_KIND_TUPLE).default('none'),
            variables: z
              .array(
                z.object({
                  symbol: z.string().min(1),
                  meaning: z.string().min(1),
                  unit: z.string().min(1).optional(),
                })
              )
              .default([]),
          })
        )
        .default([]),
      updatedAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'updatedAt harus format YYYY-MM-DD.'),
    })
    .superRefine((data, ctx) => {
      if (!isValidDecimalCodeForDomain(data.decimalCode, data.domain)) {
        ctx.addIssue({
          code: 'custom',
          path: ['decimalCode'],
          message: `decimalCode "${data.decimalCode}" tidak sesuai dengan domain "${data.domain}".`,
        });
      }

      const seenCodex = new Set<string>();
      data.relatedCodexIds.forEach((targetId, index) => {
        if (targetId === data.codexId) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedCodexIds', index],
            message: `Self-reference tidak diizinkan pada relatedCodexIds: "${targetId}".`,
          });
        }
        if (seenCodex.has(targetId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedCodexIds', index],
            message: `relatedCodexIds duplikat: "${targetId}".`,
          });
        }
        seenCodex.add(targetId);
      });

      const seenWork = new Set<string>();
      data.relatedWorkIds.forEach((workId, index) => {
        if (seenWork.has(workId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedWorkIds', index],
            message: `relatedWorkIds duplikat: "${workId}".`,
          });
        }
        seenWork.add(workId);
      });

      const seenAdr = new Set<string>();
      data.relatedAdrIds.forEach((adrId, index) => {
        if (seenAdr.has(adrId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['relatedAdrIds', index],
            message: `relatedAdrIds duplikat: "${adrId}".`,
          });
        }
        seenAdr.add(adrId);
      });
    }),
});

export const collections = {
  work: workCollection,
  adr: adrCollection,
  codex: codexCollection,
};
