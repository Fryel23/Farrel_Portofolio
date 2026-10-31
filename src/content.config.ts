import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/*
 * Content Collection "work" (Fase 3, PROMPT_EKSEKUSI_V7.0).
 * Catatan migrasi: Astro 7 memakai Content Layer API (glob loader +
 * src/content.config.ts) pengganti type: 'content' pada Astro lama.
 * Skema field identik dengan spesifikasi prompt.
 * V10.0 FASE 1: field opsional `narrative` (3 scene scrollytelling:
 * Masalah -> Proses -> Temuan) untuk halaman case study. Maksimal 3
 * scene; `image` opsional (tanpa image -> placeholder arsip dirender);
 * `label` default 'SCENE' agar markup tetap bermakna tanpa konfigurasi.
 */
const workCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    tag: z.string(),
    status: z.string(),
    description: z.string(),
    stack: z.array(z.string()),
    image: z.string(),
    link: z.string().url().optional(),
    linkLabel: z.string().optional(),
    kicker: z.string().optional(),
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
  }),
});

export const collections = {
  work: workCollection,
};
