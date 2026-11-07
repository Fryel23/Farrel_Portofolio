import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildWorldIndexPayload } from '../../lib/world-os-core.ts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const workEntries = await getCollection('work');

  const payload = buildWorldIndexPayload({
    workEntries,
    adrEntries: [],
    codexEntries: [],
  });

  return new Response(JSON.stringify(payload, null, 2) + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
