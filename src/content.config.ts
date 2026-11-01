import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  DISCIPLINE_IDS,
  TECHNOLOGY_IDS,
  STATUS_IDS,
  isValidContentId,
} from './data/taxonomy.js';

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

export const collections = {
  work: workCollection,
};
