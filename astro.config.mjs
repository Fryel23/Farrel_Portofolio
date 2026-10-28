// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// V8.1 Fase 3.4: site di-set agar Astro.site tersedia untuk URL absolut
// (canonical, og:url, og:image) di BaseLayout.astro.
export default defineConfig({
  site: 'https://www.farrelislami.tech',
});
