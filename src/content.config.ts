import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/*
 * Content Collection "work" (Fase 3, PROMPT_EKSEKUSI_V7.0).
 * Catatan migrasi: Astro 7 memakai Content Layer API (glob loader +
 * src/content.config.ts) pengganti type: 'content' pada Astro lama.
 * Skema field identik dengan spesifikasi prompt.
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
  }),
});

export const collections = {
  work: workCollection,
};
